
import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { Table, Order, ServiceCall, OrderStatus, OrderType, DeliveryInfo } from '../types';
import { supabase } from '../lib/supabase';
import { useRestaurant } from './RestaurantContext';
import { useMenu } from './MenuContext';
import { useUI } from './UIContext';

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

// Nova interface flexível para suportar todos os cenários (Mesa, Delivery, Balcão)
interface PlaceOrderParams {
    tableId?: string; 
    items: { 
        productId?: string; 
        inventoryItemId?: string; 
        quantity: number; 
        notes: string; 
        salePrice?: number; 
        name?: string; 
        type?: string 
    }[];
    orderType?: OrderType; 
    deliveryInfo?: DeliveryInfo;
}

interface OrderContextType {
  state: OrderState;
  dispatch: (action: any) => void;
  // Assinatura atualizada para aceitar objeto de parametros
  placeOrder: (params: PlaceOrderParams) => Promise<void>;
  processPosSale: (data: any) => Promise<void>;
  processPayment: (tableId: string | undefined, amount: number, method: string, cashierName?: string, orderId?: string, specificOrderIds?: string[]) => Promise<void>;
  updateItemStatus: (orderId: string, itemId: string, status: OrderStatus) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>; 
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
  const { tenantId, planLimits } = restState;
  const { state: menuState } = useMenu();
  const { showAlert } = useUI();

  const [state, localDispatch] = useReducer(orderReducer, {
      tables: [], orders: [], serviceCalls: [], audioUnlocked: false
  });

  const fetchData = useCallback(async () => {
      if (!tenantId) return;
      const yesterday = new Date(); yesterday.setHours(yesterday.getHours() - 24);

      try {
          const [tablesRes, ordersRes, callsRes] = await Promise.all([
              supabase.from('restaurant_tables').select('*').eq('tenant_id', tenantId).order('number'),
              // Traz o order_type e delivery_info do banco
              supabase.from('orders').select(`*, items:order_items (*)`).eq('tenant_id', tenantId).gte('created_at', yesterday.toISOString()),
              supabase.from('service_calls').select('*').eq('tenant_id', tenantId).eq('status', 'PENDING'),
          ]);

          if (tablesRes.data) localDispatch({ type: 'SET_TABLES', tables: tablesRes.data.map(t => ({ id: t.id, number: t.number, status: t.status, customerName: t.customer_name, accessCode: t.access_code })) });
          
          if (ordersRes.data) {
              const mappedOrders = ordersRes.data.map(o => ({
                  id: o.id, 
                  tableId: o.table_id, 
                  timestamp: new Date(o.created_at), 
                  isPaid: o.is_paid, 
                  status: o.status,
                  // Mapeamento crucial para o Dashboard funcionar
                  type: o.order_type || 'DINE_IN',
                  deliveryInfo: o.delivery_info,
                  items: (o.items || []).map((i: any) => ({ 
                      id: i.id, 
                      productId: i.product_id, 
                      quantity: Number(i.quantity) || 0, 
                      notes: i.notes, 
                      status: i.status, 
                      productName: i.product_name, 
                      productType: i.product_type, 
                      productPrice: Number(i.product_price) || 0, 
                      productCostPrice: Number(i.product_cost_price) || 0
                  }))
              }));
              localDispatch({ type: 'SET_ORDERS', orders: mappedOrders });
          }

          if (callsRes.data) localDispatch({ type: 'SET_CALLS', calls: callsRes.data.map(c => ({ id: c.id, tableId: c.table_id, status: c.status, timestamp: new Date(c.created_at) })) });
      } catch (e) {
          console.error("Erro ao buscar dados:", e);
      }

  }, [tenantId]);

  useEffect(() => {
      if (!tenantId) return;
      fetchData();
      
      const handleRealtimeUpdate = () => fetchData();

      const channel = supabase.channel(`restaurant_room:${tenantId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenantId}` }, handleRealtimeUpdate)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `tenant_id=eq.${tenantId}` }, handleRealtimeUpdate)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'service_calls', filter: `tenant_id=eq.${tenantId}` }, handleRealtimeUpdate)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables', filter: `tenant_id=eq.${tenantId}` }, handleRealtimeUpdate)
          .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, [tenantId, fetchData]);

  // --- ACTIONS ---

  const placeOrder = async (params: PlaceOrderParams) => {
      if(!tenantId) return;
      
      const { tableId, items, deliveryInfo } = params;
      
      // Lógica de fallback: Se tiver mesa, é DINE_IN, senão é o que vier (DELIVERY/PDV) ou PDV por padrão
      let finalOrderType = params.orderType;
      if (!finalOrderType) {
          finalOrderType = tableId ? 'DINE_IN' : 'PDV'; 
      }

      const { data: order } = await supabase.from('orders').insert({ 
          tenant_id: tenantId, 
          table_id: tableId || null, 
          status: 'PENDING', 
          is_paid: false,
          order_type: finalOrderType,
          delivery_info: deliveryInfo || null,
          customer_name: deliveryInfo?.customerName || (tableId ? undefined : 'Balcão')
      }).select().single();

      if (order) {
          const dbItems = items.map((i: any) => {
              // Tenta achar o produto no menu para pegar custo/preço atualizado
              let product = i.productId ? menuState.products.find(p => p.id === i.productId) : null;
              
              return {
                  tenant_id: tenantId, 
                  order_id: order.id, 
                  product_id: i.productId || null, 
                  inventory_item_id: i.inventoryItemId || null,
                  quantity: i.quantity, 
                  notes: i.notes || '', 
                  status: 'PENDING',
                  product_name: product?.name || i.name || 'Item', 
                  product_type: product?.type || i.type || 'KITCHEN',
                  product_price: Number(product?.price ?? i.salePrice ?? 0), 
                  product_cost_price: Number(product?.costPrice ?? 0)
              };
          });
          await supabase.from('order_items').insert(dbItems);
          fetchData();
      }
  };

  const cancelOrder = async (orderId: string) => {
      if (!tenantId) return;
      await supabase.from('orders').update({ status: 'CANCELLED' }).eq('id', orderId);
      await supabase.from('order_items').update({ status: 'CANCELLED' }).eq('order_id', orderId);
      fetchData();
  };

  const processPosSale = async (data: any) => {
      if(!tenantId) return;
      const enrichedItems = data.items.map((i: any) => ({
          inventoryItemId: i.inventoryItemId,
          productId: i.productId, 
          quantity: i.quantity,
          notes: i.notes
      }));
      
      await supabase.rpc('process_pos_sale', { 
          p_tenant_id: tenantId, p_customer_name: data.customerName, 
          p_total_amount: data.totalAmount, p_method: data.method, p_items: enrichedItems 
      });
      fetchData();
  };

  // ATUALIZAÇÃO: Suporte a partial payments (specificOrderIds)
  const processPayment = async (tableId: string | undefined, amount: number, method: string, cashierName: string = 'Caixa', orderId?: string, specificOrderIds?: string[]) => {
      if(!tenantId) return;
      
      if (tableId) {
          // Se tiver IDs específicos, paga só eles. Senão paga tudo da mesa.
          let query = supabase.from('orders').update({ is_paid: true, status: 'DELIVERED' }).eq('table_id', tableId).eq('is_paid', false).neq('status', 'CANCELLED');
          
          if (specificOrderIds && specificOrderIds.length > 0) {
              query = query.in('id', specificOrderIds);
          }
          
          await query;
      } else if (orderId) {
          // Para Delivery/PDV que não tem mesa (Pagamento de pedido único)
          await supabase.from('orders').update({ is_paid: true, status: 'DELIVERED' }).eq('id', orderId);
          await supabase.from('order_items').update({ status: 'DELIVERED' }).eq('order_id', orderId);
      }

      await supabase.from('transactions').insert({ 
          tenant_id: tenantId, 
          table_id: tableId || null, 
          order_id: orderId || (specificOrderIds && specificOrderIds.length === 1 ? specificOrderIds[0] : null),
          amount, 
          method, 
          items_summary: specificOrderIds && specificOrderIds.length > 0 ? `Parcial Mesa (x${specificOrderIds.length})` : (tableId ? `Mesa Completa` : `Delivery/Pedido #${orderId?.slice(0,4)}`), 
          cashier_name: cashierName 
      });
      fetchData();
  };

  const updateItemStatus = async (orderId: string, itemId: string, status: OrderStatus) => {
      await supabase.from('order_items').update({ status }).eq('id', itemId);
      fetchData();
  };

  const addTable = async () => {
      if (!tenantId) return;

      if (planLimits.maxTables !== -1 && state.tables.length >= planLimits.maxTables) {
          showAlert({ title: "Limite Atingido", message: `Seu plano permite no máximo ${planLimits.maxTables} mesas. Atualize seu plano para adicionar mais.`, type: 'WARNING' });
          return;
      }

      await supabase.from('restaurant_tables').insert({ tenant_id: tenantId, number: state.tables.length + 1, status: 'AVAILABLE' });
      fetchData();
  };

  const dispatch = async (action: any) => {
      switch (action.type) {
          case 'PLACE_ORDER': 
              await placeOrder(action); 
              break;
          case 'CANCEL_ORDER': await cancelOrder(action.orderId); break;
          case 'PROCESS_POS_SALE': await processPosSale(action.sale); break;
          // Passa os specificOrderIds se existirem
          case 'PROCESS_PAYMENT': await processPayment(action.tableId, action.amount, action.method, action.cashierName, action.orderId, action.specificOrderIds); break;
          case 'UPDATE_ITEM_STATUS': await updateItemStatus(action.orderId, action.itemId, action.status); break;
          case 'ADD_TABLE': await addTable(); break;
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
        placeOrder, cancelOrder, processPosSale, processPayment, updateItemStatus,
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
