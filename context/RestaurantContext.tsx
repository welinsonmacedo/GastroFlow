
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Table, Order, Product, TableStatus, OrderStatus, RestaurantTheme, ServiceCall, PlanLimits, User, Role, POSSaleData, ProductType } from '../types';
import { getTenantSlug } from '../utils/tenant';
import { supabase } from '../lib/supabase';
import { useUI } from './UIContext';

// --- State Definition ---
interface RestaurantState {
  isLoading: boolean;
  tenantSlug: string | null;
  tenantId: string | null;
  isValidTenant: boolean;
  isInactiveTenant: boolean;
  planLimits: PlanLimits;
  tables: Table[];
  products: Product[];
  orders: Order[];
  theme: RestaurantTheme;
  serviceCalls: ServiceCall[];
  users: User[]; // Needed for PIN checks
  audioUnlocked: boolean;
}

type Action =
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'INIT_DATA'; payload: Partial<RestaurantState> }
  | { type: 'TENANT_NOT_FOUND' }
  | { type: 'TENANT_INACTIVE' } 
  | { type: 'REALTIME_UPDATE_TABLES'; tables: Table[] }
  | { type: 'REALTIME_UPDATE_ORDERS'; orders: Order[] }
  | { type: 'REALTIME_UPDATE_PRODUCTS'; products: Product[] }
  | { type: 'REALTIME_UPDATE_SERVICE_CALLS'; calls: ServiceCall[] }
  | { type: 'UPDATE_THEME'; theme: RestaurantTheme }
  | { type: 'UNLOCK_AUDIO' }
  // Actions that trigger DB changes
  | { type: 'ADD_TABLE' }
  | { type: 'DELETE_TABLE'; tableId: string }
  | { type: 'OPEN_TABLE'; tableId: string; customerName: string; accessCode: string }
  | { type: 'CLOSE_TABLE'; tableId: string }
  | { type: 'PLACE_ORDER'; tableId: string; items: { productId: string; quantity: number; notes: string }[] }
  | { type: 'UPDATE_ITEM_STATUS'; orderId: string; itemId: string; status: OrderStatus }
  | { type: 'ADD_PRODUCT_TO_MENU'; product: Product } 
  | { type: 'UPDATE_PRODUCT'; product: Product }
  | { type: 'DELETE_PRODUCT'; productId: string }
  | { type: 'PROCESS_PAYMENT'; tableId: string; amount: number; method: string }
  | { type: 'PROCESS_POS_SALE'; sale: POSSaleData }
  | { type: 'CALL_WAITER'; tableId: string }
  | { type: 'RESOLVE_WAITER_CALL'; callId: string }
  | { type: 'ADD_USER'; user: User }
  | { type: 'UPDATE_USER'; user: User }
  | { type: 'DELETE_USER'; userId: string };

const initialState: RestaurantState = {
  isLoading: true,
  tenantSlug: null,
  tenantId: null,
  isValidTenant: false,
  isInactiveTenant: false,
  planLimits: { maxTables: -1, maxProducts: -1, maxStaff: -1, allowKds: true, allowCashier: true, allowReports: true, allowInventory: true, allowPurchases: true, allowExpenses: true, allowStaff: true, allowTableMgmt: true, allowCustomization: true },
  tables: [], products: [], orders: [],
  theme: { primaryColor: '#000', backgroundColor: '#fff', fontColor: '#000', logoUrl: '', restaurantName: 'Carregando...' },
  serviceCalls: [], users: [],
  audioUnlocked: true // Alterado para true para pular tela de bloqueio
};

const RestaurantContext = createContext<{
  state: RestaurantState;
  dispatch: (action: Action) => Promise<void>;
} | undefined>(undefined);

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) throw new Error('useRestaurant must be used within a RestaurantProvider');
  return context;
};

// --- Reducer (Local State Updates only) ---
const restaurantReducer = (state: RestaurantState, action: Action): RestaurantState => {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, isLoading: action.isLoading };
    case 'TENANT_NOT_FOUND': return { ...state, isLoading: false, isValidTenant: false };
    case 'TENANT_INACTIVE': return { ...state, isLoading: false, isValidTenant: true, isInactiveTenant: true };
    case 'INIT_DATA': return { ...state, ...action.payload, isLoading: false, isValidTenant: true, isInactiveTenant: false };
    case 'REALTIME_UPDATE_TABLES': return { ...state, tables: action.tables };
    case 'REALTIME_UPDATE_ORDERS': return { ...state, orders: action.orders };
    case 'REALTIME_UPDATE_PRODUCTS': return { ...state, products: action.products };
    case 'REALTIME_UPDATE_SERVICE_CALLS': return { ...state, serviceCalls: action.calls };
    case 'UPDATE_THEME': return { ...state, theme: action.theme };
    case 'UNLOCK_AUDIO': return { ...state, audioUnlocked: true };
    default: return state;
  }
};

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatchLocal] = useReducer(restaurantReducer, initialState);
  const { showAlert } = useUI();

  // --- Initialize Tenant Data ---
  useEffect(() => {
    const slug = getTenantSlug();
    if (!slug) { dispatchLocal({ type: 'TENANT_NOT_FOUND' }); return; }

    const initTenant = async () => {
        try {
            const { data: tenant } = await supabase.from('tenants').select('*').eq('slug', slug).maybeSingle();
            if (!tenant) { dispatchLocal({ type: 'TENANT_NOT_FOUND' }); return; }
            if (tenant.status === 'INACTIVE') { dispatchLocal({ type: 'TENANT_INACTIVE' }); return; }
            
            // Fetch Plan Limits
            let currentLimits = initialState.planLimits;
            const { data: planData } = await supabase.from('plans').select('limits').eq('key', tenant.plan).maybeSingle();
            if (planData?.limits) currentLimits = { ...initialState.planLimits, ...planData.limits };

            // Fetch Operational Data
            const yesterday = new Date(); yesterday.setHours(yesterday.getHours() - 24);
            const [tablesRes, productsRes, ordersRes, callsRes, staffRes] = await Promise.all([
                supabase.from('restaurant_tables').select('*').eq('tenant_id', tenant.id).order('number'),
                supabase.from('products').select('*').eq('tenant_id', tenant.id),
                supabase.from('orders').select(`*, items:order_items (*)`).eq('tenant_id', tenant.id).gte('created_at', yesterday.toISOString()),
                supabase.from('service_calls').select('*').eq('tenant_id', tenant.id).eq('status', 'PENDING'),
                supabase.from('staff').select('*').eq('tenant_id', tenant.id)
            ]);

            const mappedTables = (tablesRes.data || []).map(t => ({ id: t.id, number: t.number, status: t.status, customerName: t.customer_name || '', accessCode: t.access_code || '' }));
            const mappedProducts = (productsRes.data || []).map(p => ({
                id: p.id, linkedInventoryItemId: p.linked_inventory_item_id, name: p.name, description: p.description, price: p.price, costPrice: p.cost_price || 0,
                category: p.category, type: p.type, image: p.image, isVisible: p.is_visible, sortOrder: p.sort_order
            }));
            const mappedOrders = (ordersRes.data || []).map(o => ({
                id: o.id, tableId: o.table_id, timestamp: new Date(o.created_at), isPaid: o.is_paid,
                items: (o.items || []).map((i: any) => ({ id: i.id, productId: i.product_id, quantity: i.quantity, notes: i.notes, status: i.status, productName: i.product_name, productType: i.product_type }))
            }));
            const mappedCalls = (callsRes.data || []).map(c => ({ id: c.id, tableId: c.table_id, status: c.status, timestamp: new Date(c.created_at) }));
            const mappedUsers = (staffRes.data || []).map(u => ({ id: u.id, name: u.name, role: u.role, pin: u.pin, email: u.email, auth_user_id: u.auth_user_id }));

            dispatchLocal({
                type: 'INIT_DATA',
                payload: {
                    tenantSlug: slug, tenantId: tenant.id, theme: tenant.theme_config || initialState.theme,
                    planLimits: currentLimits, tables: mappedTables, products: mappedProducts, orders: mappedOrders, serviceCalls: mappedCalls, users: mappedUsers
                }
            });
        } catch (error) { dispatchLocal({ type: 'TENANT_NOT_FOUND' }); }
    };
    initTenant();
  }, []);

  // --- Realtime Subscriptions ---
  useEffect(() => {
    if (!state.tenantId) return;
    const tenantId = state.tenantId;

    const fetchTables = async () => {
        const { data } = await supabase.from('restaurant_tables').select('*').eq('tenant_id', tenantId).order('number');
        if (data) dispatchLocal({ type: 'REALTIME_UPDATE_TABLES', tables: data.map(t => ({ id: t.id, number: t.number, status: t.status, customerName: t.customer_name, accessCode: t.access_code })) });
    }
    const fetchOrders = async () => {
        const yesterday = new Date(); yesterday.setHours(yesterday.getHours() - 24);
        const { data } = await supabase.from('orders').select(`*, items:order_items (*)`).eq('tenant_id', tenantId).gte('created_at', yesterday.toISOString());
        if (data) {
            const mapped = data.map(o => ({
                id: o.id, tableId: o.table_id, timestamp: new Date(o.created_at), isPaid: o.is_paid,
                items: (o.items || []).map((i: any) => ({ id: i.id, productId: i.product_id, quantity: i.quantity, notes: i.notes, status: i.status, productName: i.product_name, productType: i.product_type }))
            }));
            dispatchLocal({ type: 'REALTIME_UPDATE_ORDERS', orders: mapped });
        }
    }
    const fetchProducts = async () => {
        const { data } = await supabase.from('products').select('*').eq('tenant_id', tenantId);
        if (data) dispatchLocal({ type: 'REALTIME_UPDATE_PRODUCTS', products: data.map(p => ({ ...p, linkedInventoryItemId: p.linked_inventory_item_id, costPrice: p.cost_price })) });
    }
    const fetchCalls = async () => {
        const { data } = await supabase.from('service_calls').select('*').eq('tenant_id', tenantId).eq('status', 'PENDING');
        if (data) dispatchLocal({ type: 'REALTIME_UPDATE_SERVICE_CALLS', calls: data.map(c => ({ id: c.id, tableId: c.table_id, status: c.status, timestamp: new Date(c.created_at) })) });
    }

    const channel = supabase.channel(`rest_ops:${tenantId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables', filter: `tenant_id=eq.${tenantId}` }, fetchTables)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenantId}` }, fetchOrders)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `tenant_id=eq.${tenantId}` }, fetchOrders)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `tenant_id=eq.${tenantId}` }, fetchProducts)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'service_calls', filter: `tenant_id=eq.${tenantId}` }, fetchCalls)
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [state.tenantId]);

  // --- Dispatcher (Side Effects) ---
  const dispatch = async (action: Action) => {
    const { tenantId } = state;
    if (!tenantId && action.type !== 'TENANT_NOT_FOUND') return;

    switch (action.type) {
        // --- Order & POS ---
        case 'PLACE_ORDER':
            const { data: order } = await supabase.from('orders').insert({ tenant_id: tenantId, table_id: action.tableId, status: 'PENDING', is_paid: false }).select().single();
            if (order) {
                const items = action.items.map(i => {
                    const product = state.products.find(p => p.id === i.productId);
                    return {
                        tenant_id: tenantId, 
                        order_id: order.id, 
                        product_id: i.productId, 
                        quantity: i.quantity, 
                        notes: i.notes || '', 
                        status: 'PENDING',
                        product_name: product?.name || 'Item Removido', 
                        product_type: product?.type || 'KITCHEN',
                        product_price: product?.price || 0 // FIX: Send product_price
                    };
                });
                await supabase.from('order_items').insert(items);
            }
            break;
        case 'PROCESS_POS_SALE':
            // CRITICAL: Ensure robust error handling for POS
            if (!tenantId) throw new Error("Sessão perdida. Recarregue a página.");
            
            const { data: rpcData, error: posError } = await supabase.rpc('process_pos_sale', {
                p_tenant_id: tenantId,
                p_customer_name: action.sale.customerName,
                p_total_amount: action.sale.totalAmount,
                p_method: action.sale.method,
                p_items: action.sale.items // Ensure items match JSONB array format expected by SQL
            });

            if (posError) {
                console.error("POS Error:", posError);
                throw new Error(posError.message || "Erro ao processar venda no servidor.");
            }
            
            if (rpcData && rpcData.success === false) {
                 console.error("POS Logic Error:", rpcData.error);
                 throw new Error(rpcData.error || "Erro de lógica na venda.");
            }
            break;

        case 'PROCESS_PAYMENT':
            await supabase.from('orders').update({ is_paid: true, status: 'DELIVERED' }).eq('table_id', action.tableId).eq('is_paid', false);
            await supabase.from('restaurant_tables').update({ status: 'AVAILABLE', customer_name: null, access_code: null }).eq('id', action.tableId);
            // Also creates transaction record
            await supabase.from('transactions').insert({
                tenant_id: tenantId, table_id: action.tableId, amount: action.amount, method: action.method,
                items_summary: 'Mesa ' + state.tables.find(t => t.id === action.tableId)?.number, cashier_name: 'Caixa' // Ideally get current user
            });
            break;
        case 'UPDATE_ITEM_STATUS':
            await supabase.from('order_items').update({ status: action.status }).eq('id', action.itemId);
            break;

        // --- Table Management ---
        case 'ADD_TABLE':
            const nextNumber = state.tables.length > 0 ? Math.max(...state.tables.map(t => t.number)) + 1 : 1;
            await supabase.from('restaurant_tables').insert({ tenant_id: tenantId, number: nextNumber, status: 'AVAILABLE' });
            break;
        case 'DELETE_TABLE': await supabase.from('restaurant_tables').delete().eq('id', action.tableId); break;
        case 'OPEN_TABLE': await supabase.from('restaurant_tables').update({ status: 'OCCUPIED', customer_name: action.customerName, access_code: action.accessCode }).eq('id', action.tableId); break;
        case 'CLOSE_TABLE':
            // Cancel pending orders and free table
            await supabase.from('orders').update({ status: 'CANCELLED' }).eq('table_id', action.tableId).eq('tenant_id', tenantId).neq('status', 'DELIVERED').eq('is_paid', false);
            await supabase.from('restaurant_tables').update({ status: 'AVAILABLE', customer_name: null, access_code: null }).eq('id', action.tableId);
            break;

        // --- Products ---
        case 'ADD_PRODUCT_TO_MENU':
            await supabase.from('products').insert({ tenant_id: tenantId, linked_inventory_item_id: action.product.linkedInventoryItemId, name: action.product.name, description: action.product.description, price: action.product.price, cost_price: action.product.costPrice, category: action.product.category, type: action.product.type, image: action.product.image, is_visible: action.product.isVisible, sort_order: action.product.sortOrder });
            break;
        case 'UPDATE_PRODUCT':
            await supabase.from('products').update({ name: action.product.name, description: action.product.description, price: action.product.price, category: action.product.category, image: action.product.image, is_visible: action.product.isVisible, sort_order: action.product.sortOrder }).eq('id', action.product.id);
            break;
        case 'DELETE_PRODUCT': await supabase.from('products').delete().eq('id', action.productId); break;

        // --- Theme ---
        case 'UPDATE_THEME':
            await supabase.from('tenants').update({ theme_config: action.theme }).eq('id', tenantId);
            dispatchLocal(action);
            break;

        // --- Service Calls ---
        case 'CALL_WAITER':
            await supabase.from('service_calls').insert({ tenant_id: tenantId, table_id: action.tableId, status: 'PENDING' });
            break;
        case 'RESOLVE_WAITER_CALL':
            await supabase.from('service_calls').update({ status: 'RESOLVED' }).eq('id', action.callId);
            break;

        // --- Users ---
        case 'ADD_USER': await supabase.from('staff').insert({ tenant_id: tenantId, name: action.user.name, role: action.user.role, pin: action.user.pin, email: action.user.email }); break;
        case 'UPDATE_USER': await supabase.from('staff').update({ name: action.user.name, role: action.user.role, pin: action.user.pin, email: action.user.email }).eq('id', action.user.id); break;
        case 'DELETE_USER': await supabase.from('staff').delete().eq('id', action.userId); break;

        default: dispatchLocal(action);
    }
  };

  return (
    <RestaurantContext.Provider value={{ state, dispatch }}>
      {children}
    </RestaurantContext.Provider>
  );
};
