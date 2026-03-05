
import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { Table, Order, ServiceCall, OrderStatus, OrderType, DeliveryInfo } from '../types';
import { supabase } from '../lib/supabase';
import { useRestaurant } from './RestaurantContext';
import { useUI } from './UIContext';
import { useAuth } from './AuthProvider';
import { sanitizeObject } from '../utils/security'; // Importando segurança

interface OrderState {
  tables: Table[];
  orders: Order[];
  serviceCalls: ServiceCall[];
  audioUnlocked: boolean;
  isLoading: boolean;
}

type OrderAction = 
  | { type: 'SET_TABLES'; tables: Table[] }
  | { type: 'SET_ORDERS'; orders: Order[] }
  | { type: 'SET_CALLS'; calls: ServiceCall[] }
  | { type: 'UNLOCK_AUDIO' }
  | { type: 'SET_LOADING'; isLoading: boolean };

const orderReducer = (state: OrderState, action: OrderAction): OrderState => {
    switch (action.type) {
        case 'SET_TABLES': return { ...state, tables: action.tables };
        case 'SET_ORDERS': return { ...state, orders: action.orders };
        case 'SET_CALLS': return { ...state, serviceCalls: action.calls };
        case 'UNLOCK_AUDIO': return { ...state, audioUnlocked: true };
        case 'SET_LOADING': return { ...state, isLoading: action.isLoading };
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
  assignTable: (tableId: string, waiterId: string | null) => Promise<void>;
  unlockAudio: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state: restState } = useRestaurant();
  const { tenantId, planLimits } = restState;
  const { state: authState } = useAuth();
  const { showAlert } = useUI();

  const [state, localDispatch] = useReducer(orderReducer, {
      tables: [], orders: [], serviceCalls: [], audioUnlocked: false, isLoading: true
  });

  const fetchData = useCallback(async () => {
      if (!tenantId) return;
      localDispatch({ type: 'SET_LOADING', isLoading: true });
      const yesterday = new Date(); yesterday.setHours(yesterday.getHours() - 24);

      try {
          const [tablesRes, ordersRes, callsRes, staffRes] = await Promise.all([
              supabase.from('restaurant_tables').select('*').eq('tenant_id', tenantId).order('number'),
              supabase.from('orders').select(`*, items:order_items (*)`).eq('tenant_id', tenantId).gte('created_at', yesterday.toISOString()),
              supabase.from('service_calls').select('*').eq('tenant_id', tenantId).eq('status', 'PENDING'),
              supabase.from('staff').select('id, name, allowed_routes').eq('tenant_id', tenantId)
          ]);
          
          const staffMap: Record<string, {id: string, name: string}> = {};
          const openerMap: Record<string, string> = {};
          
          if (staffRes.data) {
              staffRes.data.forEach((user: any) => {
                  if (user.allowed_routes) {
                      user.allowed_routes.forEach((route: string) => {
                          if (route.startsWith('TABLE:')) {
                              const tableId = route.split(':')[1];
                              staffMap[tableId] = { id: user.id, name: user.name };
                          }
                          if (route.startsWith('OPENER:')) {
                              const tableId = route.split(':')[1];
                              openerMap[tableId] = user.id;
                          }
                      });
                  }
              });
          }

          if (tablesRes.data) localDispatch({ type: 'SET_TABLES', tables: tablesRes.data.map((t: any) => ({ 
              id: t.id, 
              number: t.number, 
              status: t.status, 
              customerName: t.customer_name, 
              accessCode: t.access_code, 
              openedBy: openerMap[t.id] || null, 
              assignedWaiterId: staffMap[t.id]?.id || null,
              assignedWaiterName: staffMap[t.id]?.name || null
          })) });
          
          if (ordersRes.data) {
              const mappedOrders = ordersRes.data.map((o: any) => ({
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

          if (callsRes.data) localDispatch({ type: 'SET_CALLS', calls: callsRes.data.map((c: any) => ({ id: c.id, tableId: c.table_id, status: c.status, timestamp: new Date(c.created_at), reason: c.reason })) });
      } catch (e) {
          console.error("Erro ao buscar dados:", e);
      } finally {
          localDispatch({ type: 'SET_LOADING', isLoading: false });
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
          .on('postgres_changes', { event: '*', schema: 'public', table: 'staff', filter: `tenant_id=eq.${tenantId}` }, handleRealtimeUpdate)
          .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, [tenantId, fetchData]);

  // --- ACTIONS COM SEGURANÇA ---

  const placeOrder = async (params: PlaceOrderParams) => {
      if(!tenantId) return;

      // Sanitização de Entrada
      const safeDeliveryInfo = params.deliveryInfo ? sanitizeObject(params.deliveryInfo) : null;
      const safeItems = params.items.map(i => ({
          productId: i.productId,
          inventoryItemId: i.inventoryItemId,
          quantity: i.quantity,
          notes: sanitizeObject(i.notes)
      }));

      const { tableId, orderType } = params;
      let finalOrderType = orderType;
      if (!finalOrderType) {
          finalOrderType = tableId ? 'DINE_IN' : 'PDV'; 
      }

      // Chamada RPC para garantir integridade de preços e estoque no servidor
      const { error } = await supabase.rpc('place_order', {
          p_tenant_id: tenantId,
          p_table_id: tableId || null,
          p_order_type: finalOrderType,
          p_delivery_info: safeDeliveryInfo,
          p_items: safeItems
      });

      if (error) {
          console.error("Erro ao enviar pedido:", error);
          showAlert({ title: "Erro", message: "Não foi possível enviar o pedido.", type: "ERROR" });
      } else {
          fetchData();
      }
  };

  const cancelOrder = async (orderId: string) => {
      if (!tenantId) return;
      await supabase.rpc('cancel_order', { p_order_id: orderId });
      fetchData();
  };

  const processPosSale = async (data: any) => {
      if(!tenantId) return;
      
      // Sanitização
      const safeData = sanitizeObject(data);

      const enrichedItems = safeData.items.map((i: any) => ({
          inventoryItemId: i.inventoryItemId,
          productId: i.productId, 
          quantity: i.quantity,
          notes: i.notes
      }));
      
      // Chamada RPC
      const { data: result, error } = await supabase.rpc('process_pos_sale', { 
          p_tenant_id: tenantId, 
          p_customer_name: safeData.customerName, 
          p_method: safeData.method, 
          p_items: enrichedItems,
          p_cashier_name: safeData.cashierName || 'Sistema'
      });

      if (error) {
          console.error("Erro RPC:", error);
          throw new Error(error.message);
      }

      if (result && result.success === false) {
          console.error("Erro na lógica da venda:", result.error);
          throw new Error(result.error || "Erro desconhecido na venda.");
      }

      fetchData();
  };

  const dispatchOrder = async (orderId: string, courierInfo: { id: string, name: string }) => {
      if(!tenantId) return;
      
      const { error } = await supabase.rpc('dispatch_order', {
          p_tenant_id: tenantId,
          p_order_id: orderId,
          p_courier_info: courierInfo
      });

      if (error) throw error;
      fetchData();
  };

  const processPayment = async (tableId: string | undefined, amount: number, method: string, cashierName: string = 'Caixa', orderId?: string, specificOrderIds?: string[], courierInfo?: { id: string, name: string }) => {
      if(!tenantId) return;
      
      const { error } = await supabase.rpc('process_payment', {
          p_tenant_id: tenantId,
          p_table_id: tableId || null,
          p_amount: amount,
          p_method: method,
          p_cashier_name: cashierName,
          p_order_id: orderId || null,
          p_specific_order_ids: specificOrderIds || null,
          p_courier_info: courierInfo || null
      });

      if (error) {
          console.error("Erro ao processar pagamento:", error);
          showAlert({ title: "Erro", message: "Não foi possível processar o pagamento.", type: "ERROR" });
          throw error;
      }

      fetchData();
  };

  const updateItemStatus = async (_orderId: string, itemId: string, status: OrderStatus) => {
      await supabase.from('order_items').update({ status }).eq('id', itemId);
      fetchData();
  };

  const addTable = async () => {
      if (!tenantId) return;
      const { error } = await supabase.rpc('add_table', {
          p_tenant_id: tenantId,
          p_max_tables: planLimits.maxTables
      });

      if (error) {
          showAlert({ title: "Erro", message: error.message || "Erro ao adicionar mesa.", type: 'ERROR' });
      } else {
          fetchData();
      }
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
          case 'DELETE_TABLE': await supabase.from('restaurant_tables').delete().eq('id', action.tableId).eq('tenant_id', tenantId); fetchData(); break;
           case 'OPEN_TABLE': 
              const userId = Array.isArray(authState.currentUser?.id) 
                  ? authState.currentUser.id[0] 
                  : authState.currentUser?.id;

              console.log("DEBUG: RPC open_table parameters:", JSON.stringify({
                  p_tenant_id: tenantId,
                  p_table_id: action.tableId,
                  p_customer_name: sanitizeObject(action.customerName),
                  p_access_code: action.accessCode,
                  p_user_id: userId || null
              }));
              const { error: openTableError } = await supabase.rpc('open_table', {
                  p_tenant_id: tenantId,
                  p_table_id: action.tableId,
                  p_customer_name: sanitizeObject(action.customerName),
                  p_access_code: action.accessCode,
                  p_user_id: userId || null
              });
              if (openTableError) {
                  console.error("Erro RPC open_table:", openTableError);
                  throw openTableError;
              }
              fetchData(); 
              break;
          case 'CLOSE_TABLE': 
              await supabase.rpc('close_table', { p_tenant_id: tenantId, p_table_id: action.tableId });
              fetchData(); 
              break;
          case 'CALL_WAITER': 
              await supabase.from('service_calls').insert({ tenant_id: tenantId, table_id: action.tableId, status: 'PENDING', reason: sanitizeObject(action.reason) }); 
              fetchData(); 
              break;
          case 'RESOLVE_WAITER_CALL': await supabase.from('service_calls').update({ status: 'RESOLVED' }).eq('id', action.callId).eq('tenant_id', tenantId); fetchData(); break;
          case 'ASSIGN_TABLE': 
              await supabase.rpc('assign_table', {
                  p_tenant_id: tenantId,
                  p_table_id: action.tableId,
                  p_waiter_id: action.waiterId || null
              });
              fetchData(); 
              break;
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
        assignTable: async (id, waiterId) => dispatch({type: 'ASSIGN_TABLE', tableId: id, waiterId}),
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
