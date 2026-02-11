import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Table, Product, Order, ServiceCall, RestaurantTheme, 
  RestaurantBusinessInfo, PlanLimits, Role, User, ProductType, OrderStatus 
} from '../types';
import { getTenantSlug } from '../utils/tenant';
import { DEFAULT_THEME } from '../constants';

// Define the shape of the restaurant state
interface RestaurantState {
  tenantId: string | null;
  tenantSlug: string | null;
  isValidTenant: boolean;
  isInactiveTenant: boolean;
  isLoading: boolean;
  theme: RestaurantTheme;
  businessInfo: RestaurantBusinessInfo;
  planLimits: PlanLimits;
  tables: Table[];
  products: Product[];
  orders: Order[];
  serviceCalls: ServiceCall[];
  users: User[];
  audioUnlocked: boolean;
}

// Define the available actions for the dispatcher
type RestaurantAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_INITIAL_DATA'; payload: Partial<RestaurantState> }
  | { type: 'SET_TABLES'; payload: Table[] }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'SET_SERVICE_CALLS'; payload: ServiceCall[] }
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'UNLOCK_AUDIO' }
  | { type: 'PLACE_ORDER'; tableId: string; items: { productId: string; quantity: number; notes: string }[] }
  | { type: 'CALL_WAITER'; tableId: string }
  | { type: 'RESOLVE_WAITER_CALL'; callId: string }
  | { type: 'UPDATE_ITEM_STATUS'; orderId: string; itemId: string; status: OrderStatus }
  | { type: 'OPEN_TABLE'; tableId: string; customerName: string; accessCode: string }
  | { type: 'CLOSE_TABLE'; tableId: string }
  | { type: 'PROCESS_PAYMENT'; tableId: string; amount: number; method: string }
  | { type: 'PROCESS_POS_SALE'; sale: any }
  | { type: 'ADD_TABLE' }
  | { type: 'DELETE_TABLE'; tableId: string }
  | { type: 'ADD_PRODUCT_TO_MENU'; product: Product }
  | { type: 'UPDATE_PRODUCT'; product: Product }
  | { type: 'DELETE_PRODUCT'; productId: string }
  | { type: 'ADD_USER'; user: User }
  | { type: 'UPDATE_USER'; user: User }
  | { type: 'DELETE_USER'; userId: string }
  | { type: 'UPDATE_THEME'; theme: RestaurantTheme }
  | { type: 'UPDATE_BUSINESS_INFO'; info: RestaurantBusinessInfo };

const initialState: RestaurantState = {
  tenantId: null,
  tenantSlug: null,
  isValidTenant: false,
  isInactiveTenant: false,
  isLoading: true,
  theme: DEFAULT_THEME,
  businessInfo: {},
  planLimits: { maxTables: 0, maxProducts: 0, maxStaff: 0, allowKds: false, allowCashier: false },
  tables: [],
  products: [],
  orders: [],
  serviceCalls: [],
  users: [],
  audioUnlocked: false,
};

// Standard React reducer for state management
const restaurantReducer = (state: RestaurantState, action: any): RestaurantState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_INITIAL_DATA':
      return { ...state, ...action.payload, isLoading: false };
    case 'SET_TABLES':
      return { ...state, tables: action.payload };
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload };
    case 'SET_ORDERS':
      return { ...state, orders: action.payload };
    case 'SET_SERVICE_CALLS':
      return { ...state, serviceCalls: action.payload };
    case 'SET_USERS':
      return { ...state, users: action.payload };
    case 'UNLOCK_AUDIO':
      return { ...state, audioUnlocked: true };
    case 'UPDATE_THEME':
      return { ...state, theme: action.theme };
    case 'UPDATE_BUSINESS_INFO':
      return { ...state, businessInfo: action.info };
    default:
      return state;
  }
};

const RestaurantContext = createContext<{
  state: RestaurantState;
  dispatch: (action: RestaurantAction) => Promise<void>;
} | undefined>(undefined);

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, baseDispatch] = useReducer(restaurantReducer, initialState);

  // Fetch all necessary data for the current tenant
  const fetchAllData = useCallback(async (tenantId: string) => {
    const [tables, products, orders, items, calls, staff, plans] = await Promise.all([
      supabase.from('tables').select('*').eq('tenant_id', tenantId).order('number', { ascending: true }),
      supabase.from('products').select('*').eq('tenant_id', tenantId).order('sort_order', { ascending: true }),
      supabase.from('orders').select('*').eq('tenant_id', tenantId).eq('is_paid', false),
      supabase.from('order_items').select('*').eq('tenant_id', tenantId),
      supabase.from('service_calls').select('*').eq('tenant_id', tenantId).eq('status', 'PENDING'),
      supabase.from('staff').select('*').eq('tenant_id', tenantId),
      supabase.from('tenants').select('plan, status, plans(limits)').eq('id', tenantId).single()
    ]);

    const mappedOrders: Order[] = (orders.data || []).map(o => ({
      id: o.id,
      tableId: o.table_id,
      timestamp: new Date(o.created_at),
      isPaid: o.is_paid,
      items: (items.data || [])
        .filter(item => item.order_id === o.id)
        .map(item => ({
          id: item.id,
          productId: item.product_id,
          quantity: item.quantity,
          notes: item.notes,
          status: item.status as OrderStatus,
          productName: item.product_name,
          productType: item.product_type as ProductType,
          productPrice: item.product_price
        }))
    }));

    baseDispatch({
      type: 'SET_INITIAL_DATA',
      payload: {
        tables: (tables.data || []).map(t => ({
          id: t.id,
          number: t.number,
          status: t.status,
          customerName: t.customer_name,
          accessCode: t.access_code
        })),
        products: (products.data || []).map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          costPrice: p.cost_price,
          category: p.category,
          type: p.type,
          image: p.image,
          isVisible: p.is_visible,
          sortOrder: p.sort_order,
          isExtra: p.is_extra,
          linkedExtraIds: p.linked_extra_ids,
          linkedInventoryItemId: p.linked_inventory_item_id
        })),
        orders: mappedOrders,
        serviceCalls: (calls.data || []).map(c => ({
          id: c.id,
          tableId: c.table_id,
          status: c.status,
          timestamp: new Date(c.created_at)
        })),
        users: (staff.data || []).map(s => ({
          id: s.id,
          name: s.name,
          email: s.email,
          role: s.role as Role,
          pin: s.pin,
          auth_user_id: s.auth_user_id,
          allowedRoutes: s.allowed_routes
        })),
        planLimits: plans.data?.plans?.limits || initialState.planLimits
      }
    });
  }, []);

  useEffect(() => {
    const init = async () => {
      const slug = getTenantSlug();
      if (!slug) {
        baseDispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      const { data: tenant } = await supabase.from('tenants').select('*').eq('slug', slug).maybeSingle();
      if (!tenant) {
        baseDispatch({ type: 'SET_INITIAL_DATA', payload: { isValidTenant: false } });
        return;
      }

      if (tenant.status === 'INACTIVE') {
        baseDispatch({ type: 'SET_INITIAL_DATA', payload: { isValidTenant: true, isInactiveTenant: true, tenantId: tenant.id, tenantSlug: slug } });
        return;
      }

      baseDispatch({
        type: 'SET_INITIAL_DATA',
        payload: {
          tenantId: tenant.id,
          tenantSlug: slug,
          isValidTenant: true,
          isInactiveTenant: false,
          theme: tenant.theme_config || DEFAULT_THEME,
          businessInfo: tenant.business_info || {}
        }
      });

      fetchAllData(tenant.id);

      // Realtime updates subscription
      const channel = supabase.channel(`tenant_updates:${tenant.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', filter: `tenant_id=eq.${tenant.id}` }, () => fetchAllData(tenant.id))
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    init();
  }, [fetchAllData]);

  // Wrapper for dispatch to handle async side effects with Supabase
  const dispatch = async (action: RestaurantAction) => {
    const { tenantId } = state;
    if (!tenantId) return;

    switch (action.type) {
      case 'PLACE_ORDER':
        // Capture order in Supabase
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
              product_price: product?.price || 0,
              product_cost_price: product?.costPrice || 0
            };
          });
          await supabase.from('order_items').insert(items);
        }
        break;

      case 'CALL_WAITER':
        await supabase.from('service_calls').insert({ tenant_id: tenantId, table_id: action.tableId, status: 'PENDING' });
        break;

      case 'RESOLVE_WAITER_CALL':
        await supabase.from('service_calls').update({ status: 'RESOLVED' }).eq('id', action.callId);
        break;

      case 'UPDATE_ITEM_STATUS':
        await supabase.from('order_items').update({ status: action.status }).eq('id', action.itemId);
        break;

      case 'OPEN_TABLE':
        await supabase.from('tables').update({ status: 'OCCUPIED', customer_name: action.customerName, access_code: action.accessCode }).eq('id', action.tableId);
        break;

      case 'CLOSE_TABLE':
        await supabase.from('tables').update({ status: 'AVAILABLE', customer_name: null, access_code: null }).eq('id', action.tableId);
        break;

      case 'PROCESS_PAYMENT':
        // Process a payment for a table
        await supabase.from('orders').update({ is_paid: true }).eq('table_id', action.tableId).eq('is_paid', false);
        const tableToPay = state.tables.find(t => t.id === action.tableId);
        await supabase.from('transactions').insert({
          tenant_id: tenantId,
          table_id: action.tableId,
          table_number: tableToPay?.number || 0,
          amount: action.amount,
          method: action.method,
          items_summary: `Mesa ${tableToPay?.number}`
        });
        await supabase.from('tables').update({ status: 'AVAILABLE', customer_name: null, access_code: null }).eq('id', action.tableId);
        break;

      case 'PROCESS_POS_SALE':
        // Handle POS sales (counter sales)
        const { data: posOrder } = await supabase.from('orders').insert({ tenant_id: tenantId, status: 'DELIVERED', is_paid: true }).select().single();
        if (posOrder) {
          const posItems = action.sale.items.map((i: any) => {
            const product = state.products.find(p => p.id === i.productId);
            return {
              tenant_id: tenantId,
              order_id: posOrder.id,
              product_id: i.productId,
              quantity: i.quantity,
              notes: i.notes || '',
              status: 'DELIVERED',
              product_name: product?.name || 'Item',
              product_type: product?.type || 'BAR',
              product_price: product?.price || 0,
              product_cost_price: product?.costPrice || 0
            };
          });
          await supabase.from('order_items').insert(posItems);
          await supabase.from('transactions').insert({
            tenant_id: tenantId,
            amount: action.sale.totalAmount,
            method: action.sale.method,
            items_summary: `Venda Balcão: ${action.sale.customerName}`
          });
        }
        break;

      case 'ADD_TABLE':
        const nextTableNumber = state.tables.length > 0 ? Math.max(...state.tables.map(t => t.number)) + 1 : 1;
        await supabase.from('tables').insert({ tenant_id: tenantId, number: nextTableNumber, status: 'AVAILABLE' });
        break;

      case 'DELETE_TABLE':
        await supabase.from('tables').delete().eq('id', action.tableId);
        break;

      case 'ADD_PRODUCT_TO_MENU':
        await supabase.from('products').insert({
          tenant_id: tenantId,
          name: action.product.name,
          description: action.product.description,
          price: action.product.price,
          category: action.product.category,
          image: action.product.image,
          is_visible: action.product.isVisible,
          sort_order: action.product.sortOrder,
          linked_inventory_item_id: action.product.linkedInventoryItemId,
          is_extra: action.product.isExtra,
          linked_extra_ids: action.product.linkedExtraIds
        });
        break;

      case 'UPDATE_PRODUCT':
        await supabase.from('products').update({
          name: action.product.name,
          description: action.product.description,
          price: action.product.price,
          category: action.product.category,
          image: action.product.image,
          is_visible: action.product.isVisible,
          sort_order: action.product.sortOrder,
          is_extra: action.product.isExtra,
          linked_extra_ids: action.product.linkedExtraIds
        }).eq('id', action.product.id);
        break;

      case 'DELETE_PRODUCT':
        await supabase.from('products').delete().eq('id', action.productId);
        break;

      case 'ADD_USER':
        await supabase.from('staff').insert({
          tenant_id: tenantId,
          name: action.user.name,
          email: action.user.email,
          role: action.user.role,
          pin: action.user.pin,
          allowed_routes: action.user.allowedRoutes
        });
        break;

      case 'UPDATE_USER':
        await supabase.from('staff').update({
          name: action.user.name,
          email: action.user.email,
          role: action.user.role,
          pin: action.user.pin,
          allowed_routes: action.user.allowedRoutes
        }).eq('id', action.user.id);
        break;

      case 'DELETE_USER':
        await supabase.from('staff').delete().eq('id', action.userId);
        break;

      case 'UPDATE_THEME':
        await supabase.from('tenants').update({ theme_config: action.theme }).eq('id', tenantId);
        baseDispatch(action);
        break;

      case 'UPDATE_BUSINESS_INFO':
        await supabase.from('tenants').update({ business_info: action.info }).eq('id', tenantId);
        baseDispatch(action);
        break;

      case 'UNLOCK_AUDIO':
        baseDispatch(action);
        break;
    }
  };

  return (
    <RestaurantContext.Provider value={{ state, dispatch }}>
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) throw new Error('useRestaurant must be used within a RestaurantProvider');
  return context;
};
