
import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { Table, Order, ServiceCall, OrderStatus, OrderType, DeliveryInfo } from '../types';
import { supabase } from '../lib/supabase';
import { useRestaurant } from './RestaurantContext';
import { useMenu } from './MenuContext';
import { useUI } from './UIContext';
import { checkRateLimit, sanitizeObject } from '../utils/security'; // Importando segurança

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
  placeOrder: (params: PlaceOrderParams) => Promise<void>;
  processPosSale: (data: any) => Promise<void>;
  dispatchOrder: (orderId: string, courierInfo: { id: string, name: string }) => Promise<void>;
  processPayment: (tableId: string | undefined, amount: number, method: string, cashierName?: string, orderId?: string, specificOrderIds?: string[], courierInfo?: { id: string, name: string }) => Promise<void>;
  updateItemStatus: (orderId: string, itemId: string, status: OrderStatus) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>; 
  addTable: () => Promise<void>;
  deleteTable: (tableId: string) => Promise<void>;
  openTable: (tableId: string, customerName: string, accessCode: string) => Promise<void>;
  closeTable: (tableId: string) => Promise<void>;
  callWaiter: (tableId: string, reason?: string) => Promise<void>;
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

          if (callsRes.data) localDispatch({ type: 'SET_CALLS', calls: callsRes.data.map(c => ({ id: c.id, tableId: c.table_id, status: c.status, timestamp: new Date(c.created_at), reason: c.reason })) });
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

  // --- ACTIONS COM SEGURANÇA ---

  const placeOrder = async (params: PlaceOrderParams) => {
      if(!tenantId) return;

      // Rate Limit: Máximo de 1 pedido a cada 5 segundos por sessão/cliente
      if (!checkRateLimit('place_order', 1, 5000)) {
          showAlert({ title: "Aguarde", message: "Aguarde alguns segundos antes de enviar outro pedido.", type: "WARNING" });
          return;
      }
      
      // Sanitização de Entrada
      const safeDeliveryInfo = params.deliveryInfo ? sanitizeObject(params.deliveryInfo) : null;
      const safeItems = params.items.map(i => ({
          ...i,
          notes: sanitizeObject(i.notes)
      }));

      const { tableId, orderType } = params;
      let finalOrderType = orderType;
      if (!finalOrderType) {
          finalOrderType = tableId ? 'DINE_IN' : 'PDV'; 
      }

      const { data: order } = await supabase.from('orders').insert({ 
          tenant_id: tenantId, 
          table_id: tableId || null, 
          status: 'PENDING', 
          is_paid: false,
          order_type: finalOrderType,
          delivery_info: safeDeliveryInfo,
          customer_name: safeDeliveryInfo?.customerName || (tableId ? undefined : 'Balcão')
      }).select().single();

      if (order) {
          const dbItems = safeItems.map((i: any) => {
              const product = menuState.products.find(p => p.id === i.productId);
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
      
      // Sanitização e Rate Limit
      if (!checkRateLimit('pos_sale', 1, 2000)) return;
      const safeData = sanitizeObject(data);

      const enrichedItems = safeData.items.map((i: any) => ({
          inventoryItemId: i.inventoryItemId,
          productId: i.productId, 
          quantity: i.quantity,
          notes: i.notes
      }));
      
      await supabase.rpc('process_pos_sale', { 
          p_tenant_id: tenantId, p_customer_name: safeData.customerName, 
          p_total_amount: safeData.totalAmount, p_method: safeData.method, p_items: enrichedItems 
      });
      fetchData();
  };

  const dispatchOrder = async (orderId: string, courierInfo: { id: string, name: string }) => {
      if(!tenantId) return;
      
      const updatePayload: any = { status: 'DISPATCHED' };
      const { data: currentOrder } = await supabase.from('orders').select('delivery_info').eq('id', orderId).single();
      
      if (currentOrder && currentOrder.delivery_info) {
          updatePayload.delivery_info = {
              ...currentOrder.delivery_info,
              courierId: courierInfo.id,
              courierName: courierInfo.name
          };
      }

      await supabase.from('orders').update(updatePayload).eq('id', orderId);
      await supabase.from('order_items').update({ status: 'DISPATCHED' }).eq('order_id', orderId);
      fetchData();
  };

  const processPayment = async (tableId: string | undefined, amount: number, method: string, cashierName: string = 'Caixa', orderId?: string, specificOrderIds?: string[], courierInfo?: { id: string, name: string }) => {
      if(!tenantId) return;
      
      // Se for pagamento de delivery com ID específico
      if (orderId) {
          const { data: currentOrder } = await supabase.from('orders').select('delivery_info').eq('id', orderId).single();
          
          const updatePayload: any = { 
              status: 'DELIVERED', // Finalizado
              is_paid: true,
              payment_method: method
          };

          if (currentOrder && currentOrder.delivery_info) {
              updatePayload.delivery_info = {
                  ...currentOrder.delivery_info,
                  paymentMethod: method,
                  paymentStatus: 'PAID',
                  courierId: courierInfo?.id || currentOrder.delivery_info.courierId,
                  courierName: courierInfo?.name || currentOrder.delivery_info.courierName
              };
          }

          await supabase.from('orders').update(updatePayload).eq('id', orderId);
          await supabase.from('order_items').update({ status: 'DELIVERED' }).eq('order_id', orderId);
      }
      // Se for pagamento de mesa
      else if (tableId) {
          if (specificOrderIds && specificOrderIds.length > 0) {
              // Pagamento parcial de mesa (selecionando pedidos)
              await supabase.from('orders').update({ is_paid: true, payment_method: method }).in('id', specificOrderIds);
              
              // Verificar se todos os pedidos da mesa foram pagos
              const { data: pendingOrders } = await supabase.from('orders')
                  .select('id')
                  .eq('table_id', tableId)
                  .eq('is_paid', false)
                  .neq('status', 'CANCELLED');
              
              if (!pendingOrders || pendingOrders.length === 0) {
                  await supabase.from('restaurant_tables').update({ status: 'AVAILABLE', customer_name: null }).eq('id', tableId);
              }
          } else {
              // Pagamento total da mesa
              await supabase.from('orders').update({ is_paid: true, payment_method: method }).eq('table_id', tableId).eq('is_paid', false);
              await supabase.from('restaurant_tables').update({ status: 'AVAILABLE', customer_name: null }).eq('id', tableId);
          }
      }

      // Registrar transação financeira
      await supabase.from('transactions').insert({
          tenant_id: tenantId,
          description: orderId ? `Venda Delivery #${orderId.slice(0,4)}` : `Venda Mesa ${tableId ? 'Balcão/Mesa' : 'Avulsa'}`,
          amount: amount,
          type: 'INCOME',
          category: 'Vendas',
          payment_method: method,
          date: new Date().toISOString(),
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
          showAlert({ title: "Limite Atingido", message: `Seu plano permite no máximo ${planLimits.maxTables} mesas.`, type: 'WARNING' });
          return;
      }
      await supabase.from('restaurant_tables').insert({ tenant_id: tenantId, number: state.tables.length + 1, status: 'AVAILABLE' });
      fetchData();
  };

  const dispatch = async (action: any) => {
      switch (action.type) {
          case 'PLACE_ORDER': await placeOrder(action); break;
          case 'CANCEL_ORDER': await cancelOrder(action.orderId); break;
          case 'PROCESS_POS_SALE': await processPosSale(action.sale); break;
          case 'DISPATCH_ORDER': await dispatchOrder(action.orderId, action.courierInfo); break;
          case 'PROCESS_PAYMENT': await processPayment(action.tableId, action.amount, action.method, action.cashierName, action.orderId, action.specificOrderIds, action.courierInfo); break;
          case 'UPDATE_ITEM_STATUS': await updateItemStatus(action.orderId, action.itemId, action.status); break;
          case 'ADD_TABLE': await addTable(); break;
          case 'DELETE_TABLE': await supabase.from('restaurant_tables').delete().eq('id', action.tableId); fetchData(); break;
          case 'OPEN_TABLE': await supabase.from('restaurant_tables').update({ status: 'OCCUPIED', customer_name: sanitizeObject(action.customerName), access_code: action.accessCode }).eq('id', action.tableId); fetchData(); break;
          case 'CLOSE_TABLE': await supabase.from('restaurant_tables').update({ status: 'AVAILABLE', customer_name: null, access_code: null }).eq('id', action.tableId); fetchData(); break;
          case 'CALL_WAITER': 
              if(!checkRateLimit(`call_waiter_${action.tableId}`, 1, 30000)) { // 1 chamado a cada 30s
                  showAlert({title: "Já Chamado", message: "Garçom já notificado.", type: "INFO"});
                  return;
              }
              await supabase.from('service_calls').insert({ tenant_id: tenantId, table_id: action.tableId, status: 'PENDING', reason: sanitizeObject(action.reason) }); 
              fetchData(); 
              break;
          case 'RESOLVE_WAITER_CALL': await supabase.from('service_calls').update({ status: 'RESOLVED' }).eq('id', action.callId); fetchData(); break;
          case 'UNLOCK_AUDIO': localDispatch({ type: 'UNLOCK_AUDIO' }); break;
      }
  };

  return (
    <OrderContext.Provider value={{ 
        state, dispatch,
        placeOrder, cancelOrder, processPosSale, processPayment, updateItemStatus, dispatchOrder,
        addTable: async () => dispatch({type: 'ADD_TABLE'}),
        deleteTable: async (id) => dispatch({type: 'DELETE_TABLE', tableId: id}),
        openTable: async (id, name, code) => dispatch({type: 'OPEN_TABLE', tableId: id, customerName: name, accessCode: code}),
        closeTable: async (id) => dispatch({type: 'CLOSE_TABLE', tableId: id}),
        callWaiter: async (id, reason) => dispatch({type: 'CALL_WAITER', tableId: id, reason}),
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
