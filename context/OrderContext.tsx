
import React, { createContext, useContext, useEffect, useState, useReducer, useCallback } from 'react';
import { Table, Order, ServiceCall, OrderStatus, ProductType } from '../types';
import { supabase } from '../lib/supabase';
import { useRestaurant } from './RestaurantContext';
import { useMenu } from './MenuContext';

interface OrderState {
  tables: Table[];
  orders: Order[];
  serviceCalls: ServiceCall[];
  audioUnlocked: boolean;
}

type OrderAction = 
  | { type: 'SET_TABLES'; tables: Table[] }
  | { type: 'SET_ORDERS'; orders: Order[] }
  | { type: 'SET_CALLS'; calls: ServiceCall[] }
  | { type: 'UNLOCK_AUDIO' };

const orderReducer = (state: OrderState, action: OrderAction): OrderState => {
    switch (action.type) {
        case 'SET_TABLES': return { ...state, tables: action.tables };
        case 'SET_ORDERS': return { ...state, orders: action.orders };
        case 'SET_CALLS': return { ...state, serviceCalls: action.calls };
        case 'UNLOCK_AUDIO': return { ...state, audioUnlocked: true };
        default: return state;
    }
};

interface OrderContextType {
  state: OrderState;
  dispatch: (action: any) => void; // Mantemos dispatch genérico para compatibilidade com o padrão antigo por enquanto
  // Helper methods
  placeOrder: (tableId: string, items: { productId: string; quantity: number; notes: string }[]) => Promise<void>;
  processPosSale: (data: any) => Promise<void>;
  processPayment: (tableId: string, amount: number, method: string) => Promise<void>;
  updateItemStatus: (orderId: string, itemId: string, status: OrderStatus) => Promise<void>;
  addTable: () => Promise<void>;
  deleteTable: (tableId: string) => Promise<void>;
  openTable: (tableId: string, customerName: string, accessCode: string) => Promise<void>;
  closeTable: (tableId: string) => Promise<void>;
  callWaiter: (tableId: string) => Promise<void>;
  resolveCall: (callId: string) => Promise<void>;
  unlockAudio: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state: restState } = useRestaurant();
  const { tenantId } = restState;
  const { state: menuState } = useMenu(); // Acesso aos produtos para enriquecer pedidos

  const [state, localDispatch] = useReducer(orderReducer, {
      tables: [], orders: [], serviceCalls: [], audioUnlocked: false
  });

  const fetchData = useCallback(async () => {
      if (!tenantId) return;
      const yesterday = new Date(); yesterday.setHours(yesterday.getHours() - 24);

      const [tablesRes, ordersRes, callsRes] = await Promise.all([
          supabase.from('restaurant_tables').select('*').eq('tenant_id', tenantId).order('number'),
          supabase.from('orders').select(`*, items:order_items (*)`).eq('tenant_id', tenantId).gte('created_at', yesterday.toISOString()),
          supabase.from('service_calls').select('*').eq('tenant_id', tenantId).eq('status', 'PENDING'),
      ]);

      if (tablesRes.data) localDispatch({ type: 'SET_TABLES', tables: tablesRes.data.map(t => ({ id: t.id, number: t.number, status: t.status, customerName: t.customer_name, accessCode: t.access_code })) });
      
      if (ordersRes.data) {
          const mappedOrders = ordersRes.data.map(o => ({
              id: o.id, tableId: o.table_id, timestamp: new Date(o.created_at), isPaid: o.is_paid,
              items: (o.items || []).map((i: any) => ({ id: i.id, productId: i.product_id, quantity: i.quantity, notes: i.notes, status: i.status, productName: i.product_name, productType: i.product_type, productPrice: i.product_price, productCostPrice: Number(i.product_cost_price) || 0 }))
          }));
          localDispatch({ type: 'SET_ORDERS', orders: mappedOrders });
      }

      if (callsRes.data) localDispatch({ type: 'SET_CALLS', calls: callsRes.data.map(c => ({ id: c.id, tableId: c.table_id, status: c.status, timestamp: new Date(c.created_at) })) });

  }, [tenantId]);

  useEffect(() => {
      if (tenantId) {
          fetchData();
          const channel = supabase.channel(`orders:${tenantId}`)
              .on('postgres_changes', { event: '*', schema: 'public', filter: `tenant_id=eq.${tenantId}` }, (payload) => {
                  // Otimização: Recarregar tudo é mais seguro para consistência, 
                  // mas idealmente processariamos o payload. Para MVP, reload.
                  if (['orders', 'order_items', 'restaurant_tables', 'service_calls'].includes(payload.table)) {
                      fetchData();
                  }
              })
              .subscribe();
          return () => { supabase.removeChannel(channel); };
      }
  }, [tenantId, fetchData]);

  // --- ACTIONS ---

  const placeOrder = async (tableId: string, items: { productId: string; quantity: number; notes: string }[]) => {
      if(!tenantId) return;
      // Cria pedido
      const { data: order } = await supabase.from('orders').insert({ tenant_id: tenantId, table_id: tableId, status: 'PENDING', is_paid: false }).select().single();
      if (order) {
          const dbItems = items.map(i => {
              const product = menuState.products.find(p => p.id === i.productId);
              return {
                  tenant_id: tenantId, order_id: order.id, product_id: i.productId, quantity: i.quantity, notes: i.notes || '', status: 'PENDING',
                  product_name: product?.name || 'Item', product_type: product?.type || 'KITCHEN',
                  product_price: Number(product?.price) || 0, product_cost_price: Number(product?.costPrice) || 0
              };
          });
          await supabase.from('order_items').insert(dbItems);
          fetchData();
      }
  };

  const processPosSale = async (data: any) => {
      if(!tenantId) return;
      const enrichedItems = data.items.map((i: any) => {
          const prod = menuState.products.find(p => p.id === i.productId);
          return { ...i, costPrice: prod?.costPrice || 0 };
      });
      await supabase.rpc('process_pos_sale', { 
          p_tenant_id: tenantId, p_customer_name: data.customerName, 
          p_total_amount: data.totalAmount, p_method: data.method, p_items: enrichedItems 
      });
      fetchData();
  };

  const processPayment = async (tableId: string, amount: number, method: string) => {
      if(!tenantId) return;
      await supabase.from('orders').update({ is_paid: true, status: 'DELIVERED' }).eq('table_id', tableId).eq('is_paid', false);
      await supabase.from('restaurant_tables').update({ status: 'AVAILABLE', customer_name: null, access_code: null }).eq('id', tableId);
      await supabase.from('transactions').insert({ tenant_id: tenantId, table_id: tableId, amount, method, items_summary: `Mesa`, cashier_name: 'Caixa' });
      fetchData();
  };

  const updateItemStatus = async (orderId: string, itemId: string, status: OrderStatus) => {
      await supabase.from('order_items').update({ status }).eq('id', itemId);
      fetchData();
  };

  // --- ACTIONS DISPATCHER (Compatibility Layer) ---
  const dispatch = async (action: any) => {
      switch (action.type) {
          case 'PLACE_ORDER': await placeOrder(action.tableId, action.items); break;
          case 'PROCESS_POS_SALE': await processPosSale(action.sale); break;
          case 'PROCESS_PAYMENT': await processPayment(action.tableId, action.amount, action.method); break;
          case 'UPDATE_ITEM_STATUS': await updateItemStatus(action.orderId, action.itemId, action.status); break;
          case 'ADD_TABLE': await supabase.from('restaurant_tables').insert({ tenant_id: tenantId, number: state.tables.length + 1, status: 'AVAILABLE' }); fetchData(); break;
          case 'DELETE_TABLE': await supabase.from('restaurant_tables').delete().eq('id', action.tableId); fetchData(); break;
          case 'OPEN_TABLE': await supabase.from('restaurant_tables').update({ status: 'OCCUPIED', customer_name: action.customerName, access_code: action.accessCode }).eq('id', action.tableId); fetchData(); break;
          case 'CLOSE_TABLE': await supabase.from('restaurant_tables').update({ status: 'AVAILABLE', customer_name: null, access_code: null }).eq('id', action.tableId); fetchData(); break;
          case 'CALL_WAITER': await supabase.from('service_calls').insert({ tenant_id: tenantId, table_id: action.tableId, status: 'PENDING' }); fetchData(); break;
          case 'RESOLVE_WAITER_CALL': await supabase.from('service_calls').update({ status: 'RESOLVED' }).eq('id', action.callId); fetchData(); break;
          case 'UNLOCK_AUDIO': localDispatch({ type: 'UNLOCK_AUDIO' }); break;
      }
  };

  return (
    <OrderContext.Provider value={{ 
        state, dispatch,
        placeOrder, processPosSale, processPayment, updateItemStatus,
        addTable: async () => dispatch({type: 'ADD_TABLE'}),
        deleteTable: async (id) => dispatch({type: 'DELETE_TABLE', tableId: id}),
        openTable: async (id, name, code) => dispatch({type: 'OPEN_TABLE', tableId: id, customerName: name, accessCode: code}),
        closeTable: async (id) => dispatch({type: 'CLOSE_TABLE', tableId: id}),
        callWaiter: async (id) => dispatch({type: 'CALL_WAITER', tableId: id}),
        resolveCall: async (id) => dispatch({type: 'RESOLVE_WAITER_CALL', callId: id}),
        unlockAudio: () => localDispatch({ type: 'UNLOCK_AUDIO' })
    }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrder must be used within an OrderProvider');
  return context;
};
