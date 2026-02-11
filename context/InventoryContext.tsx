
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { InventoryItem, InventoryRecipeItem, InventoryLog, Supplier, PurchaseEntry } from '../types';
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
  updateStock: (itemId: string, quantity: number, operation: 'IN' | 'OUT', reason: string, userName?: string) => Promise<void>;
  processInventoryAdjustment: (adjustments: { itemId: string; realQty: number }[]) => Promise<void>;
  addSupplier: (supplier: Supplier) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  processPurchase: (purchase: PurchaseEntry) => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state: restaurantState } = useRestaurant();
  const { tenantId } = restaurantState;
  const { showAlert } = useUI();

  const [state, setState] = useState<InventoryState>({
    inventory: [], inventoryLogs: [], suppliers: [],
  });

  const fetchData = useCallback(async () => {
        if (!tenantId) return;
        const [invRes, recipesRes, logsRes, suppRes] = await Promise.all([
            supabase.from('inventory_items').select('*').eq('tenant_id', tenantId),
            supabase.from('inventory_recipes').select('*').eq('tenant_id', tenantId),
            supabase.from('inventory_logs').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(50),
            supabase.from('suppliers').select('*').eq('tenant_id', tenantId)
        ]);

        if (invRes.data) {
            const mappedInventory = invRes.data.map((i: any) => {
                const myRecipes = (recipesRes.data || []).filter((r: any) => r.parent_item_id === i.id);
                const recipeItems: InventoryRecipeItem[] = myRecipes.map((r: any) => {
                    const ing = invRes.data.find((raw: any) => raw.id === r.ingredient_item_id);
                    return {
                        ingredientId: r.ingredient_item_id,
                        ingredientName: ing?.name || '?',
                        quantity: r.quantity,
                        unit: ing?.unit,
                        cost: ing?.cost_price
                    };
                });
                return {
                    id: i.id, name: i.name, unit: i.unit, quantity: i.quantity, minQuantity: i.min_quantity, 
                    costPrice: i.cost_price, type: i.type || 'INGREDIENT', image: i.image, recipe: recipeItems,
                    isExtra: i.is_extra || false
                };
            });
            setState({ 
                inventory: mappedInventory, 
                inventoryLogs: (logsRes.data || []).map((l: any) => ({ id: l.id, item_id: l.item_id, type: l.type, quantity: l.quantity, reason: l.reason, user_name: l.user_name, created_at: new Date(l.created_at) })),
                suppliers: (suppRes.data || []).map((s: any) => ({ ...s })) 
            });
        }
    }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    fetchData();
    const channel = supabase.channel(`inv:${tenantId}`).on('postgres_changes', { event: '*', schema: 'public', filter: `tenant_id=eq.${tenantId}` }, fetchData).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, fetchData]);

  const addInventoryItem = async (item: InventoryItem) => {
      if(!tenantId) return;
      const { data: newItem } = await supabase.from('inventory_items').insert({
          tenant_id: tenantId, name: item.name, unit: item.unit, quantity: item.quantity,
          min_quantity: item.minQuantity, cost_price: item.costPrice, type: item.type, image: item.image,
          is_extra: item.isExtra 
      }).select().single();
      if (newItem && item.type === 'COMPOSITE' && item.recipe) {
          const rs = item.recipe.map(r => ({ tenant_id: tenantId, parent_item_id: newItem.id, ingredient_item_id: r.ingredientId, quantity: r.quantity }));
          await supabase.from('inventory_recipes').insert(rs);
      }
      fetchData();
  };

  const updateInventoryItem = async (item: InventoryItem) => {
      if(!tenantId) return;
      await supabase.from('inventory_items').update({
          name: item.name, unit: item.unit, min_quantity: item.minQuantity, cost_price: item.costPrice, image: item.image, type: item.type, is_extra: item.isExtra
      }).eq('id', item.id);
      if (item.type === 'COMPOSITE' && item.recipe) {
          await supabase.from('inventory_recipes').delete().eq('parent_item_id', item.id);
          const rs = item.recipe.map(r => ({ tenant_id: tenantId, parent_item_id: item.id, ingredient_item_id: r.ingredientId, quantity: r.quantity }));
          await supabase.from('inventory_recipes').insert(rs);
      }
      fetchData();
  };

  const updateStock = async (itemId: string, quantity: number, operation: 'IN' | 'OUT', reason: string, userName: string = 'Sistema') => {
      if(!tenantId) return;
      const item = state.inventory.find(i => i.id === itemId);
      if (!item) return;
      const newQty = operation === 'IN' ? item.quantity + quantity : item.quantity - quantity;
      await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', itemId);
      await supabase.from('inventory_logs').insert({ tenant_id: tenantId, item_id: itemId, type: operation, quantity, reason, user_name: userName });
      fetchData();
  };

  const processInventoryAdjustment = async (adjustments: { itemId: string; realQty: number }[]) => {
      for (const adj of adjustments) {
          const item = state.inventory.find(i => i.id === adj.itemId);
          if (item) {
              const diff = adj.realQty - item.quantity;
              if (Math.abs(diff) > 0.001) await updateStock(adj.itemId, Math.abs(diff), diff > 0 ? 'IN' : 'OUT', 'Ajuste de Balanço');
          }
      }
  };

  const addSupplier = async (supplier: Supplier) => {
      const { id, ...data } = supplier;
      await supabase.from('suppliers').insert({ tenant_id: tenantId, ...data });
      fetchData();
  };

  const deleteSupplier = async (id: string) => {
      await supabase.from('suppliers').delete().eq('id', id);
      fetchData();
  };

  const processPurchase = async (purchase: PurchaseEntry) => {
      for (const item of purchase.items) {
          await updateStock(item.inventoryItemId, item.quantity, 'IN', `Compra Nota ${purchase.invoiceNumber}`);
          await supabase.from('inventory_items').update({ cost_price: item.unitPrice }).eq('id', item.inventoryItemId);
      }
      fetchData();
  };

  return <InventoryContext.Provider value={{ state, addInventoryItem, updateInventoryItem, updateStock, processInventoryAdjustment, addSupplier, deleteSupplier, processPurchase }}>{children}</InventoryContext.Provider>;
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within an InventoryProvider');
  return context;
};
