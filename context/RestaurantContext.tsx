
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { Table, Order, Product, RestaurantTheme, ServiceCall, PlanLimits, User, Role, POSSaleData, RestaurantBusinessInfo, OrderStatus, ProductType } from '../types';
import { getTenantSlug } from '../utils/tenant';
import { supabase } from '../lib/supabase';
import { useUI } from './UIContext';

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
  businessInfo: RestaurantBusinessInfo;
  serviceCalls: ServiceCall[];
  users: User[];
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
  | { type: 'REALTIME_UPDATE_USERS'; users: User[] }
  | { type: 'UPDATE_THEME'; theme: RestaurantTheme }
  | { type: 'UPDATE_BUSINESS_INFO'; info: RestaurantBusinessInfo }
  | { type: 'UNLOCK_AUDIO' };

const initialState: RestaurantState = {
  isLoading: true,
  tenantSlug: null,
  tenantId: null,
  isValidTenant: false,
  isInactiveTenant: false,
  planLimits: { maxTables: -1, maxProducts: -1, maxStaff: -1, allowKds: true, allowCashier: true, allowReports: true, allowInventory: true, allowPurchases: true, allowExpenses: true, allowStaff: true, allowTableMgmt: true, allowCustomization: true },
  tables: [], products: [], orders: [],
  theme: { primaryColor: '#000', backgroundColor: '#fff', fontColor: '#000', logoUrl: '', restaurantName: 'Carregando...' },
  businessInfo: {}, 
  serviceCalls: [], users: [],
  audioUnlocked: false
};

const restaurantReducer = (state: RestaurantState, action: any): RestaurantState => {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, isLoading: action.isLoading };
    case 'TENANT_NOT_FOUND': return { ...state, isLoading: false, isValidTenant: false };
    case 'TENANT_INACTIVE': return { ...state, isLoading: false, isValidTenant: true, isInactiveTenant: true };
    case 'INIT_DATA': return { ...state, ...action.payload, isLoading: false, isValidTenant: true, isInactiveTenant: false };
    case 'REALTIME_UPDATE_TABLES': return { ...state, tables: action.tables };
    case 'REALTIME_UPDATE_ORDERS': return { ...state, orders: action.orders };
    case 'REALTIME_UPDATE_PRODUCTS': return { ...state, products: action.products };
    case 'REALTIME_UPDATE_SERVICE_CALLS': return { ...state, serviceCalls: action.calls };
    case 'REALTIME_UPDATE_USERS': return { ...state, users: action.users };
    case 'UPDATE_THEME': return { ...state, theme: action.theme };
    case 'UPDATE_BUSINESS_INFO': return { ...state, businessInfo: action.info };
    case 'UNLOCK_AUDIO': return { ...state, audioUnlocked: true };
    default: return state;
  }
};

const RestaurantContext = createContext<{
  state: RestaurantState;
  dispatch: (action: any) => Promise<void>;
} | undefined>(undefined);

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatchLocal] = useReducer(restaurantReducer, initialState);
  const { showAlert } = useUI();

  const fetchOperationalData = useCallback(async (tenant: any) => {
    const yesterday = new Date(); yesterday.setHours(yesterday.getHours() - 24);
    const [tablesRes, productsRes, ordersRes, callsRes, staffRes] = await Promise.all([
        supabase.from('restaurant_tables').select('*').eq('tenant_id', tenant.id).order('number'),
        supabase.from('products').select('*').eq('tenant_id', tenant.id),
        supabase.from('orders').select(`*, items:order_items (*)`).eq('tenant_id', tenant.id).gte('created_at', yesterday.toISOString()),
        supabase.from('service_calls').select('*').eq('tenant_id', tenant.id).eq('status', 'PENDING'),
        supabase.from('staff').select('*').eq('tenant_id', tenant.id)
    ]);

    dispatchLocal({
        type: 'INIT_DATA',
        payload: {
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            theme: tenant.theme_config || initialState.theme,
            businessInfo: tenant.business_info || {},
            tables: (tablesRes.data || []).map(t => ({ id: t.id, number: t.number, status: t.status, customerName: t.customer_name || '', accessCode: t.access_code || '' })),
            products: (productsRes.data || []).map(p => ({
                id: p.id, linkedInventoryItemId: p.linked_inventory_item_id, name: p.name, description: p.description, price: p.price, costPrice: p.cost_price || 0,
                category: p.category, type: p.type, image: p.image, isVisible: p.is_visible, sortOrder: p.sort_order, 
                isExtra: p.is_extra || false, linkedExtraIds: p.linked_extra_ids || []
            })),
            orders: (ordersRes.data || []).map(o => ({
                id: o.id, tableId: o.table_id, timestamp: new Date(o.created_at), isPaid: o.is_paid,
                items: (o.items || []).map((i: any) => ({ id: i.id, productId: i.product_id, quantity: i.quantity, notes: i.notes, status: i.status, productName: i.product_name, productType: i.product_type, productPrice: i.product_price, productCostPrice: Number(i.product_cost_price) || 0 }))
            })),
            serviceCalls: (callsRes.data || []).map(c => ({ id: c.id, tableId: c.table_id, status: c.status, timestamp: new Date(c.created_at) })),
            users: (staffRes.data || []).map(u => ({ id: u.id, name: u.name, role: u.role, pin: u.pin, email: u.email, auth_user_id: u.auth_user_id, allowedRoutes: u.allowed_routes || [] }))
        }
    });
  }, []);

  useEffect(() => {
    const slug = getTenantSlug();
    if (!slug) { dispatchLocal({ type: 'SET_LOADING', isLoading: false }); return; }

    const init = async () => {
        const { data: tenant } = await supabase.from('tenants').select('*').eq('slug', slug).maybeSingle();
        if (!tenant) { dispatchLocal({ type: 'TENANT_NOT_FOUND' }); return; }
        if (tenant.status === 'INACTIVE') { dispatchLocal({ type: 'TENANT_INACTIVE' }); return; }
        fetchOperationalData(tenant);
        
        const channel = supabase.channel(`ops:${tenant.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', filter: `tenant_id=eq.${tenant.id}` }, () => fetchOperationalData(tenant))
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    };
    init();
  }, [fetchOperationalData]);

  const dispatch = async (action: any) => {
    const { tenantId } = state;
    if (!tenantId) return;

    switch (action.type) {
        case 'PLACE_ORDER':
            const { data: order } = await supabase.from('orders').insert({ tenant_id: tenantId, table_id: action.tableId, status: 'PENDING', is_paid: false }).select().single();
            if (order) {
                const items = action.items.map((i: any) => {
                    const product = state.products.find(p => p.id === i.productId);
                    return {
                        tenant_id: tenantId, order_id: order.id, product_id: i.productId, quantity: i.quantity, notes: i.notes || '', status: 'PENDING',
                        product_name: product?.name || 'Item', product_type: product?.type || 'KITCHEN',
                        product_price: Number(product?.price) || 0, product_cost_price: Number(product?.costPrice) || 0
                    };
                });
                await supabase.from('order_items').insert(items);
            }
            break;
        case 'PROCESS_POS_SALE':
            // O RPC process_pos_sale deve ser atualizado no banco para aceitar custo, 
            // mas via front enviamos os dados preparados
            const enrichedItems = action.sale.items.map((i: any) => {
                const prod = state.products.find(p => p.id === i.productId);
                return { ...i, costPrice: prod?.costPrice || 0 };
            });
            await supabase.rpc('process_pos_sale', { 
                p_tenant_id: tenantId, 
                p_customer_name: action.sale.customerName, 
                p_total_amount: action.sale.totalAmount, 
                p_method: action.sale.method, 
                p_items: enrichedItems 
            });
            break;
        case 'PROCESS_PAYMENT':
            await supabase.from('orders').update({ is_paid: true, status: 'DELIVERED' }).eq('table_id', action.tableId).eq('is_paid', false);
            await supabase.from('restaurant_tables').update({ status: 'AVAILABLE', customer_name: null, access_code: null }).eq('id', action.tableId);
            await supabase.from('transactions').insert({ tenant_id: tenantId, table_id: action.tableId, amount: action.amount, method: action.method, items_summary: `Mesa ${state.tables.find(t => t.id === action.tableId)?.number}`, cashier_name: 'Caixa' });
            break;
        case 'UPDATE_ITEM_STATUS': await supabase.from('order_items').update({ status: action.status }).eq('id', action.itemId); break;
        case 'ADD_TABLE': await supabase.from('restaurant_tables').insert({ tenant_id: tenantId, number: state.tables.length + 1, status: 'AVAILABLE' }); break;
        case 'DELETE_TABLE': await supabase.from('restaurant_tables').delete().eq('id', action.tableId); break;
        case 'OPEN_TABLE': await supabase.from('restaurant_tables').update({ status: 'OCCUPIED', customer_name: action.customerName, access_code: action.accessCode }).eq('id', action.tableId); break;
        case 'CLOSE_TABLE': await supabase.from('restaurant_tables').update({ status: 'AVAILABLE', customer_name: null, access_code: null }).eq('id', action.tableId); break;
        
        case 'ADD_PRODUCT_TO_MENU': 
            const { error: insertError } = await supabase.from('products').insert({
                tenant_id: tenantId, 
                name: action.product.name, 
                price: action.product.price, 
                cost_price: action.product.costPrice,
                category: action.product.category, 
                type: action.product.type, 
                image: action.product.image, 
                is_visible: action.product.isVisible,
                sort_order: action.product.sortOrder, 
                linked_inventory_item_id: action.product.linkedInventoryItemId,
                is_extra: action.product.isExtra,
                linked_extra_ids: action.product.linkedExtraIds
            }); 
            if (insertError) throw insertError;
            break;

        case 'UPDATE_PRODUCT':
            const { error: updateError } = await supabase.from('products').update({
                name: action.product.name, 
                price: action.product.price, 
                category: action.product.category, 
                description: action.product.description,
                image: action.product.image, 
                is_visible: action.product.isVisible, 
                sort_order: action.product.sortOrder,
                is_extra: action.product.isExtra,
                linked_extra_ids: action.product.linkedExtraIds
            }).eq('id', action.product.id);
            if (updateError) throw updateError;
            break;

        case 'DELETE_PRODUCT': await supabase.from('products').delete().eq('id', action.productId); break;
        case 'UPDATE_THEME': await supabase.from('tenants').update({ theme_config: action.theme }).eq('id', tenantId); dispatchLocal(action); break;
        case 'UPDATE_BUSINESS_INFO': await supabase.from('tenants').update({ business_info: action.info }).eq('id', tenantId); dispatchLocal(action); break;
        case 'CALL_WAITER': await supabase.from('service_calls').insert({ tenant_id: tenantId, table_id: action.tableId, status: 'PENDING' }); break;
        case 'RESOLVE_WAITER_CALL': await supabase.from('service_calls').update({ status: 'RESOLVED' }).eq('id', action.callId); break;
        case 'ADD_USER': await supabase.from('staff').insert({ tenant_id: tenantId, name: action.user.name, role: action.user.role, pin: action.user.pin, email: action.user.email, allowed_routes: action.user.allowedRoutes }); break;
        case 'UPDATE_USER': await supabase.from('staff').update({ name: action.user.name, role: action.user.role, pin: action.user.pin, email: action.user.email, allowed_routes: action.user.allowedRoutes }).eq('id', action.user.id); break;
        case 'DELETE_USER': await supabase.from('staff').delete().eq('id', action.userId); break;
        case 'UNLOCK_AUDIO': dispatchLocal(action); break;
    }
  };

  return <RestaurantContext.Provider value={{ state, dispatch }}>{children}</RestaurantContext.Provider>;
};

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) throw new Error('useRestaurant must be used within a RestaurantProvider');
  return context;
};
