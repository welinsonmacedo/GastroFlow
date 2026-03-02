
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { InventoryItem, InventoryRecipeItem, InventoryLog, Supplier, PurchaseEntry, InventoryType, ProductType } from '../types';
import { supabase, logAudit } from '../lib/supabase';
import { useRestaurant } from './RestaurantContext'; 
import { useAuth } from './AuthProvider';

interface InventoryState {
  inventory: InventoryItem[];
  inventoryLogs: InventoryLog[];
  suppliers: Supplier[];
}

interface InventoryContextType {
  state: InventoryState;
  addInventoryItem: (item: InventoryItem) => Promise<string | null>; 
  updateInventoryItem: (item: InventoryItem) => Promise<void>;
  deleteInventoryItem: (itemId: string) => Promise<void>;
  updateStock: (itemId: string, quantity: number, operation: 'IN' | 'OUT', reason: string, userName?: string) => Promise<void>;
  processInventoryAdjustment: (adjustments: { itemId: string; realQty: number }[]) => Promise<void>;
  addSupplier: (supplier: Supplier) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  updateSupplier: (supplier: Supplier) => Promise<void>;
  processPurchase: (purchase: PurchaseEntry) => Promise<void>;
  fetchData: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state: restaurantState } = useRestaurant();
  const { state: authState } = useAuth();
  const { tenantId } = restaurantState;

  const currentUser = authState.currentUser;

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
                    barcode: i.barcode || '', 
                    unit: i.unit, 
                    quantity: Number(i.quantity) || 0, 
                    minQuantity: Number(i.min_quantity) || 0, 
                    costPrice: Number(i.cost_price) || 0, 
                    salePrice: Number(i.sale_price) || 0, 
                    type: (i.type || 'INGREDIENT').toUpperCase() as InventoryType, 
                    category: i.category, 
                    description: i.description || '', // Mapeia descrição
                    image: i.image, 
                    recipe: recipeItems,
                    isExtra: i.is_extra || false,
                    targetCategories: i.target_categories || []
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

  const syncExtraToProducts = async (item: InventoryItem, inventoryId: string) => {
      if (!tenantId) return;

      if (item.isExtra) {
          const { data: existingProd } = await supabase.from('products').select('id').eq('linked_inventory_item_id', inventoryId).eq('is_extra', true).maybeSingle();
          
          const productPayload = {
              tenant_id: tenantId,
              name: item.name,
              price: item.salePrice || 0,
              cost_price: item.costPrice || 0,
              linked_inventory_item_id: inventoryId,
              description: item.description || '', // Sincroniza descrição
              is_extra: true,
              target_categories: item.targetCategories || [],
              category: 'Adicionais',
              type: item.type === 'RESALE' ? ProductType.BAR : ProductType.KITCHEN,
              image: item.image,
              is_visible: true
          };

          if (existingProd) {
              await supabase.from('products').update(productPayload).eq('id', existingProd.id);
          } else {
              await supabase.from('products').insert(productPayload);
          }
      } else {
          await supabase.from('products').delete().eq('linked_inventory_item_id', inventoryId).eq('is_extra', true);
      }
  };

  const addInventoryItem = async (item: InventoryItem): Promise<string | null> => {
      if(!tenantId) return null;
      
      const payload = {
          tenant_id: tenantId, 
          name: item.name, 
          barcode: item.barcode, 
          unit: item.unit, 
          quantity: item.quantity || 0,
          min_quantity: item.minQuantity || 0, 
          cost_price: item.costPrice || 0, 
          sale_price: item.salePrice || 0, 
          type: item.type, 
          category: item.category,
          description: item.description, // Salva descrição
          image: item.image,
          is_extra: item.isExtra,
          target_categories: item.targetCategories
      };

      const { data: newItem, error } = await supabase.from('inventory_items').insert(payload).select().single();

      if (error) {
          console.error("Erro ao adicionar item:", error);
          throw new Error(`Erro ao salvar item: ${error.message}`);
      }

      if (newItem && item.type === 'COMPOSITE' && item.recipe && item.recipe.length > 0) {
          const recipes = item.recipe.map(r => ({
              tenant_id: tenantId, 
              parent_item_id: newItem.id, 
              ingredient_item_id: r.ingredientId, 
              quantity: r.quantity 
          }));
          const { error: recipeError } = await supabase.from('inventory_recipes').insert(recipes);
          if (recipeError) console.error("Erro ao salvar receita:", recipeError);
      }

      if (newItem) {
          await syncExtraToProducts(item, newItem.id);
          if (currentUser) {
              await logAudit(tenantId, currentUser.id, currentUser.name, 'INVENTORY', 'Criação de Item', { itemName: item.name, type: item.type });
          }
      }
      
      return newItem ? newItem.id : null;
  };

  const updateInventoryItem = async (item: InventoryItem) => {
      if(!tenantId) return;
      
      const payload = {
          name: item.name, 
          barcode: item.barcode, 
          unit: item.unit, 
          min_quantity: item.minQuantity || 0,
          cost_price: item.costPrice || 0, 
          sale_price: item.salePrice || 0,
          image: item.image, 
          type: item.type,
          category: item.category, 
          description: item.description, // Atualiza descrição
          is_extra: item.isExtra,
          target_categories: item.targetCategories
      };

      const { error } = await supabase.from('inventory_items').update(payload).eq('id', item.id);

      if (error) {
          console.error("Erro ao atualizar item:", error);
          throw new Error(`Erro ao atualizar item: ${error.message}`);
      }

      if (item.type === 'COMPOSITE') {
          await supabase.from('inventory_recipes').delete().eq('parent_item_id', item.id);
          
          if (item.recipe && item.recipe.length > 0) {
              const recipes = item.recipe.map(r => ({
                  tenant_id: tenantId, 
                  parent_item_id: item.id, 
                  ingredient_item_id: r.ingredientId, 
                  quantity: r.quantity
              }));
              const { error: recError } = await supabase.from('inventory_recipes').insert(recipes);
              if (recError) console.error("Erro ao atualizar receita:", recError);
          }
      }

      await syncExtraToProducts(item, item.id);
      if (currentUser) {
          await logAudit(tenantId, currentUser.id, currentUser.name, 'INVENTORY', 'Atualização de Item', { itemName: item.name });
      }
  };

  const deleteInventoryItem = async (itemId: string) => {
      const { error } = await supabase.from('inventory_items').delete().eq('id', itemId);
      if (error) {
          if (error.code === '23503') {
              throw new Error("Não é possível excluir este item pois ele está vinculado a produtos, receitas ou histórico de vendas.");
          }
          throw error;
      }
      await supabase.from('products').delete().eq('linked_inventory_item_id', itemId).eq('is_extra', true);
      if (currentUser && tenantId) {
          await logAudit(tenantId, currentUser.id, currentUser.name, 'INVENTORY', 'Exclusão de Item', { itemId });
      }
  };

  const updateStock = async (itemId: string, quantity: number, operation: 'IN' | 'OUT', reason: string, userName: string = 'Sistema') => {
      if(!tenantId) return;
      const { error } = await supabase.rpc('adjust_inventory', {
          p_tenant_id: tenantId,
          p_item_id: itemId,
          p_operation: operation,
          p_quantity: quantity,
          p_reason: reason,
          p_user_name: userName
      });

      if (error) throw error;
      fetchData();
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

  const updateSupplier = async (supplier: Supplier) => {
      if(!tenantId) return;
      const payload = {
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
      const { error } = await supabase.from('suppliers').update(payload).eq('id', supplier.id);
      if (error) throw error;
  };

  const processPurchase = async (purchase: PurchaseEntry) => {
      if(!tenantId) return;
      const { error } = await supabase.rpc('process_inventory_purchase', {
          p_tenant_id: tenantId,
          p_purchase_data: purchase
      });

      if (error) throw error;
      fetchData();
  };

  return (
    <InventoryContext.Provider value={{ state, addInventoryItem, updateInventoryItem, deleteInventoryItem, updateStock, processInventoryAdjustment, addSupplier, deleteSupplier, updateSupplier, processPurchase, fetchData }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within an InventoryProvider');
  return context;
};
