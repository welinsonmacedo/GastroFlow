
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { InventoryItem, InventoryRecipeItem, InventoryLog, Supplier, PurchaseEntry, InventoryType } from '../types';
import { supabase } from '../lib/supabase';
import { useRestaurant } from './RestaurantContext'; 
import { useUI } from './UIContext';

interface InventoryState {
  inventory: InventoryItem[];
  inventoryLogs: InventoryLog[];
  suppliers: Supplier[];
}

interface InventoryContextType {
  state: InventoryState;
  addInventoryItem: (item: InventoryItem) => Promise<void>;
  updateInventoryItem: (item: InventoryItem) => Promise<void>;
  deleteInventoryItem: (itemId: string) => Promise<void>;
  updateStock: (itemId: string, quantity: number, operation: 'IN' | 'OUT', reason: string, userName?: string) => Promise<void>;
  processInventoryAdjustment: (adjustments: { itemId: string; realQty: number }[]) => Promise<void>;
  addSupplier: (supplier: Supplier) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  processPurchase: (purchase: PurchaseEntry) => Promise<void>;
  fetchData: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state: restaurantState } = useRestaurant();
  const { tenantId } = restaurantState;
  const { showAlert } = useUI();

  const [state, setState] = useState<InventoryState>({
    inventory: [],
    inventoryLogs: [],
    suppliers: [],
  });

  const fetchData = useCallback(async () => {
        if (!tenantId) return;

        const [invRes, recipesRes, logsRes, suppRes] = await Promise.all([
            supabase.from('inventory_items').select('*').eq('tenant_id', tenantId).order('name'),
            supabase.from('inventory_recipes').select('*').eq('tenant_id', tenantId),
            supabase.from('inventory_logs').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(100),
            supabase.from('suppliers').select('*').eq('tenant_id', tenantId).order('name')
        ]);

        if (invRes.data) {
            const mappedInventory = invRes.data.map((i: any) => {
                const myRecipes = (recipesRes.data || []).filter((r: any) => r.parent_item_id === i.id);
                const recipeItems: InventoryRecipeItem[] = myRecipes.map((r: any) => {
                    const ing = invRes.data.find((raw: any) => raw.id === r.ingredient_item_id);
                    return {
                        ingredientId: r.ingredient_item_id,
                        ingredientName: ing?.name || '?',
                        quantity: Number(r.quantity) || 0,
                        unit: ing?.unit,
                        cost: Number(ing?.cost_price) || 0
                    };
                });

                return {
                    id: i.id, 
                    name: i.name, 
                    unit: i.unit, 
                    // Proteção contra NULL: Converte para Number e usa 0 como fallback
                    quantity: Number(i.quantity) || 0, 
                    minQuantity: Number(i.min_quantity) || 0, 
                    costPrice: Number(i.cost_price) || 0, 
                    type: (i.type || 'INGREDIENT').toUpperCase() as InventoryType, 
                    image: i.image, 
                    recipe: recipeItems,
                    isExtra: i.is_extra || false
                };
            });
            
            const mappedLogs = (logsRes.data || []).map((l: any) => ({
                id: l.id, item_id: l.item_id, type: l.type, quantity: Number(l.quantity) || 0, reason: l.reason, user_name: l.user_name, created_at: new Date(l.created_at)
            }));

            const mappedSuppliers = (suppRes.data || []).map((s: any) => ({
                id: s.id,
                name: s.name,
                contactName: s.contact_name,
                phone: s.phone,
                email: s.email,
                cnpj: s.cnpj,
                ie: s.ie,
                cep: s.cep,
                address: s.address,
                number: s.number,
                complement: s.complement,
                city: s.city,
                state: s.state
            }));

            setState({ inventory: mappedInventory, inventoryLogs: mappedLogs, suppliers: mappedSuppliers });
        }
    }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    
    fetchData();

    const channel = supabase.channel(`inventory_updates:${tenantId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items', filter: `tenant_id=eq.${tenantId}` }, fetchData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_logs', filter: `tenant_id=eq.${tenantId}` }, fetchData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_recipes', filter: `tenant_id=eq.${tenantId}` }, fetchData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers', filter: `tenant_id=eq.${tenantId}` }, fetchData)
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId, fetchData]);

  const addInventoryItem = async (item: InventoryItem) => {
      if(!tenantId) return;
      
      const payload = {
          tenant_id: tenantId, 
          name: item.name, 
          unit: item.unit, 
          quantity: item.quantity || 0,
          min_quantity: item.minQuantity || 0, 
          cost_price: item.costPrice || 0, 
          type: item.type, 
          image: item.image,
          is_extra: item.isExtra 
      };

      const { data: newItem, error } = await supabase.from('inventory_items').insert(payload).select().single();

      if (error) {
          console.error("Erro ao adicionar item:", error);
          throw new Error(`Erro ao salvar item: ${error.message}`);
      }

      if (newItem && item.type === 'COMPOSITE' && item.recipe && item.recipe.length > 0) {
          const recipes = item.recipe.map(r => ({
              tenant_id: tenantId, parent_item_id: newItem.id, ingredient_item_id: r.ingredientId, quantity: r.quantity
          }));
          const { error: recipeError } = await supabase.from('inventory_recipes').insert(recipes);
          if (recipeError) console.error("Erro ao salvar receita:", recipeError);
      }
  };

  const updateInventoryItem = async (item: InventoryItem) => {
      if(!tenantId) return;
      
      const payload = {
          name: item.name, 
          unit: item.unit, 
          min_quantity: item.minQuantity || 0,
          cost_price: item.costPrice || 0, 
          image: item.image, 
          type: item.type,
          is_extra: item.isExtra
      };

      const { error } = await supabase.from('inventory_items').update(payload).eq('id', item.id);

      if (error) {
          console.error("Erro ao atualizar item:", error);
          throw new Error(`Erro ao atualizar item: ${error.message}`);
      }

      if (item.type === 'COMPOSITE' && item.recipe) {
          await supabase.from('inventory_recipes').delete().eq('parent_item_id', item.id);
          if (item.recipe.length > 0) {
              const recipes = item.recipe.map(r => ({
                  tenant_id: tenantId, parent_item_id: item.id, ingredient_item_id: r.ingredientId, quantity: r.quantity
              }));
              await supabase.from('inventory_recipes').insert(recipes);
          }
      }
  };

  const deleteInventoryItem = async (itemId: string) => {
      const { error } = await supabase.from('inventory_items').delete().eq('id', itemId);
      if (error) {
          if (error.code === '23503') { // Foreign Key Violation
              throw new Error("Não é possível excluir este item pois ele está vinculado a produtos, receitas ou histórico de vendas.");
          }
          throw error;
      }
  };

  const updateStock = async (itemId: string, quantity: number, operation: 'IN' | 'OUT', reason: string, userName: string = 'Sistema') => {
      if(!tenantId) return;
      const item = state.inventory.find(i => i.id === itemId);
      if (!item) return;
      
      const currentQty = Number(item.quantity) || 0;
      const newQty = operation === 'IN' ? currentQty + quantity : currentQty - quantity;
      
      await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', itemId);
      
      await supabase.from('inventory_logs').insert({
          tenant_id: tenantId, item_id: itemId, type: operation, quantity, reason, user_name: userName
      });
  };

  const processInventoryAdjustment = async (adjustments: { itemId: string; realQty: number }[]) => {
      if(!tenantId) return;
      for (const adj of adjustments) {
          const item = state.inventory.find(i => i.id === adj.itemId);
          if (item) {
              const currentQty = Number(item.quantity) || 0;
              const diff = adj.realQty - currentQty;
              if (Math.abs(diff) > 0.0001) {
                  const type = diff > 0 ? 'IN' : 'OUT';
                  await updateStock(adj.itemId, Math.abs(diff), type, 'Ajuste de Balanço');
              }
          }
      }
  };

  const addSupplier = async (supplier: Supplier) => {
      if(!tenantId) return;
      const payload = {
          tenant_id: tenantId,
          name: supplier.name,
          contact_name: supplier.contactName,
          phone: supplier.phone,
          email: supplier.email,
          cnpj: supplier.cnpj,
          ie: supplier.ie,
          cep: supplier.cep,
          address: supplier.address,
          number: supplier.number,
          complement: supplier.complement,
          city: supplier.city,
          state: supplier.state
      };
      const { error } = await supabase.from('suppliers').insert(payload);
      if (error) throw error;
  };

  const deleteSupplier = async (id: string) => {
      await supabase.from('suppliers').delete().eq('id', id);
  };

  const processPurchase = async (purchase: PurchaseEntry) => {
      if(!tenantId) return;
      try {
          const itemsTotal = purchase.items.reduce((acc, i) => acc + i.totalPrice, 0);
          
          for (const item of purchase.items) {
              let effectiveUnitCost = item.unitPrice;
              if (purchase.distributeTax && purchase.taxAmount > 0 && itemsTotal > 0) {
                  const taxShare = (item.totalPrice / itemsTotal) * purchase.taxAmount;
                  effectiveUnitCost = (item.totalPrice + taxShare) / item.quantity;
              }

              const invItem = state.inventory.find(i => i.id === item.inventoryItemId);
              const newQty = (Number(invItem?.quantity) || 0) + item.quantity;
              
              await supabase.from('inventory_items').update({ 
                  quantity: newQty,
                  cost_price: effectiveUnitCost 
              }).eq('id', item.inventoryItemId);

              await supabase.from('inventory_logs').insert({
                  tenant_id: tenantId, item_id: item.inventoryItemId, type: 'IN', quantity: item.quantity, 
                  reason: `Compra Nota ${purchase.invoiceNumber}`, user_name: 'Admin'
              });
          }

          const supplierName = state.suppliers.find(s => s.id === purchase.supplierId)?.name || 'Fornecedor';
          await supabase.from('expenses').insert({
              tenant_id: tenantId,
              description: `Compra Nota ${purchase.invoiceNumber} (${supplierName})`,
              amount: purchase.totalAmount,
              category: 'Fornecedor',
              due_date: purchase.date,
              is_paid: false,
              payment_method: 'BANK',
              supplier_id: purchase.supplierId
          });
          
      } catch (error) {
          console.error("Erro ao processar compra:", error);
          throw error;
      }
  };

  return (
    <InventoryContext.Provider value={{ state, addInventoryItem, updateInventoryItem, deleteInventoryItem, updateStock, processInventoryAdjustment, addSupplier, deleteSupplier, processPurchase, fetchData }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within an InventoryProvider');
  return context;
};
