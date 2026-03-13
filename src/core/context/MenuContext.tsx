
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Product } from '@/types';
import { supabase } from '@/core/api/supabaseClient';
import { useRestaurant } from './RestaurantContext';
import { useUI } from './UIContext';

interface MenuState {
  products: Product[];
  isLoading: boolean;
}

interface MenuContextType {
  state: MenuState;
  addProduct: (product: Partial<Product>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  refreshProducts: () => Promise<void>;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state: restState } = useRestaurant();
  const { tenantId, planLimits } = restState;
  const { showAlert } = useUI();
  
  const [state, setState] = useState<MenuState>({ products: [], isLoading: true });

  const mapProducts = (data: any[]): Product[] => {
      return data.map(p => ({
        id: p.id, 
        linkedInventoryItemId: p.linked_inventory_item_id, 
        name: p.name, 
        description: p.description, 
        price: Number(p.price) || 0, 
        costPrice: Number(p.cost_price) || 0, 
        category: p.category, 
        type: p.type, 
        image: p.image, 
        isVisible: p.is_visible, 
        sortOrder: p.sort_order, 
        isExtra: p.is_extra || false, 
        stockQuantity: p.stock_quantity,
        linkedExtraIds: p.linked_extra_ids || [],
        targetCategories: p.target_categories || [] 
      }));
  };

  const fetchProducts = useCallback(async () => {
      if (!tenantId) return;
      try {
          const { data, error } = await supabase.from('products').select('*').eq('tenant_id', tenantId);
          if (error) {
              console.error('MenuContext: Error fetching products:', error);
          }
          setState({ products: data ? mapProducts(data) : [], isLoading: false });
      } catch (err) {
          console.error('MenuContext: Unexpected error fetching products:', err);
          setState(s => ({ ...s, isLoading: false }));
      }
  }, [tenantId]);

  useEffect(() => {
      if (tenantId) {
          fetchProducts();
          const channel = supabase.channel(`menu:${tenantId}`)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `tenant_id=eq.${tenantId}` }, fetchProducts)
              .subscribe();
          return () => { supabase.removeChannel(channel); };
      }
  }, [tenantId, fetchProducts]);

  const addProduct = async (product: Partial<Product>) => {
      if(!tenantId) return;

      // Check limits
      if (planLimits.maxProducts !== -1) {
          const { count, error: countError } = await supabase
              .from('products')
              .select('*', { count: 'exact', head: true })
              .eq('tenant_id', tenantId);
          
          if (countError) {
              showAlert({ title: "Erro", message: "Erro ao verificar limite de produtos.", type: 'ERROR' });
              throw countError;
          }

          if (count !== null && count >= planLimits.maxProducts) {
              const error = new Error("Limite de produtos atingido para o seu plano.");
              showAlert({ title: "Erro", message: error.message, type: 'ERROR' });
              throw error;
          }
      }

      const { error } = await supabase.from('products').insert({
          tenant_id: tenantId,
          name: product.name,
          price: product.price,
          cost_price: product.costPrice,
          category: product.category,
          type: product.type,
          image: product.image,
          description: product.description,
          is_visible: product.isVisible ?? true,
          sort_order: product.sortOrder,
          linked_inventory_item_id: product.linkedInventoryItemId,
          is_extra: product.isExtra ?? false,
          linked_extra_ids: (product.linkedExtraIds && product.linkedExtraIds.length > 0) ? `{${product.linkedExtraIds.join(',')}}` : '{}',
          target_categories: product.targetCategories || []
      });

      if (error) {
          showAlert({ title: "Erro", message: error.message || "Erro ao adicionar produto.", type: 'ERROR' });
          throw error;
      }
      
      await fetchProducts();
  };

  const updateProduct = async (product: Product) => {
      const { error } = await supabase.from('products').update({
          name: product.name, 
          price: product.price, 
          cost_price: product.costPrice,
          category: product.category, 
          description: product.description, 
          image: product.image, 
          is_visible: product.isVisible, 
          sort_order: product.sortOrder,
          is_extra: product.isExtra, 
          linked_extra_ids: (product.linkedExtraIds && product.linkedExtraIds.length > 0) ? `{${product.linkedExtraIds.join(',')}}` : '{}',
          target_categories: product.targetCategories || []
      }).eq('id', product.id);
      if (error) throw error;
      await fetchProducts();
  };

  const deleteProduct = async (productId: string) => {
      await supabase.from('products').delete().eq('id', productId);
      await fetchProducts();
  };

  return (
    <MenuContext.Provider value={{ state, addProduct, updateProduct, deleteProduct, refreshProducts: fetchProducts }}>
      {children}
    </MenuContext.Provider>
  );
};

export const useMenu = () => {
  const context = useContext(MenuContext);
  if (!context) throw new Error('useMenu must be used within a MenuProvider');
  return context;
};
