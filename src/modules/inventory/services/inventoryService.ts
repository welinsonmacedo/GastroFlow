import { supabase } from '../../../core/api/supabaseClient';

export interface InventoryItem {
  id: string;
  tenant_id: string;
  name: string;
  quantity: number;
  min_quantity: number;
}

export const InventoryService = {
  async getInventory(tenantId: string): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('tenant_id', tenantId);
      
    if (error) throw new Error(error.message);
    return data as InventoryItem[];
  },
  
  async updateStock(itemId: string, quantityDelta: number) {
    const { error } = await supabase.rpc('adjust_inventory', {
      p_item_id: itemId,
      p_delta: quantityDelta
    });
    
    if (error) throw new Error(error.message);
  }
};
