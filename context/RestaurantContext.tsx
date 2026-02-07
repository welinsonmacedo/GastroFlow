import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Table, Order, Product, TableStatus, OrderStatus, ProductType, OrderItem, RestaurantTheme, User, AuditLog, Transaction, Role } from '../types';
import { getTenantSlug } from '../utils/tenant';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// --- Types ---
interface State {
  isLoading: boolean;
  tenantSlug: string | null;
  tenantId: string | null; // ID UUID do Supabase
  isValidTenant: boolean;
  tables: Table[];
  products: Product[];
  orders: Order[];
  theme: RestaurantTheme;
  currentUser: User | null;
  users: User[];
  auditLogs: AuditLog[];
  transactions: Transaction[];
}

type Action =
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'INIT_DATA'; payload: Partial<State> }
  | { type: 'TENANT_NOT_FOUND' }
  | { type: 'LOGIN'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'REALTIME_UPDATE_TABLES'; tables: Table[] }
  | { type: 'REALTIME_UPDATE_ORDERS'; orders: Order[] }
  | { type: 'REALTIME_UPDATE_PRODUCTS'; products: Product[] }
  // Ações que disparam side-effects no Supabase (interceptadas)
  | { type: 'ADD_USER'; user: User }
  | { type: 'UPDATE_USER'; user: User }
  | { type: 'DELETE_USER'; userId: string }
  | { type: 'OPEN_TABLE'; tableId: string; customerName: string; accessCode: string }
  | { type: 'CLOSE_TABLE'; tableId: string }
  | { type: 'PLACE_ORDER'; tableId: string; items: { productId: string; quantity: number; notes: string }[] }
  | { type: 'UPDATE_ITEM_STATUS'; orderId: string; itemId: string; status: OrderStatus }
  | { type: 'UPDATE_PRODUCT'; product: Product }
  | { type: 'ADD_PRODUCT'; product: Product }
  | { type: 'UPDATE_THEME'; theme: RestaurantTheme }
  | { type: 'PROCESS_PAYMENT'; tableId: string; amount: number; method: 'CASH' | 'CARD' | 'PIX' };

const initialState: State = {
  isLoading: true,
  tenantSlug: null,
  tenantId: null,
  isValidTenant: false,
  tables: [],
  products: [],
  orders: [],
  theme: { primaryColor: '#000', backgroundColor: '#fff', fontColor: '#000', logoUrl: '', restaurantName: 'Carregando...' },
  currentUser: null,
  users: [],
  auditLogs: [],
  transactions: []
};

const RestaurantContext = createContext<{
  state: State;
  dispatch: (action: Action) => Promise<void>;
} | undefined>(undefined);

// --- Reducer (Gerencia apenas estado local e atualizações via Realtime) ---
const restaurantReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_LOADING':
        return { ...state, isLoading: action.isLoading };
    
    case 'TENANT_NOT_FOUND':
        return { ...state, isLoading: false, isValidTenant: false };

    case 'INIT_DATA':
        return { ...state, ...action.payload, isLoading: false, isValidTenant: true };

    case 'LOGIN':
      return { ...state, currentUser: action.user };

    case 'LOGOUT':
      return { ...state, currentUser: null };

    // Atualizações vindas do Realtime ou Fetch
    case 'REALTIME_UPDATE_TABLES':
        // Mesclar tabelas existentes com as novas para não perder estado momentâneo se houver
        return { ...state, tables: action.tables };
    
    case 'REALTIME_UPDATE_ORDERS':
        return { ...state, orders: action.orders };
    
    case 'REALTIME_UPDATE_PRODUCTS':
        return { ...state, products: action.products };

    // Optimistic Updates (opcional, aqui estamos confiando no Realtime para simplicidade, 
    // mas poderíamos atualizar o state imediatamente para feedback instantâneo)
    case 'UPDATE_THEME':
        return { ...state, theme: action.theme };

    default:
      return state;
  }
};

// --- Provider ---
export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatchLocal] = useReducer(restaurantReducer, initialState);

  // 1. Inicialização e Fetch de Dados
  useEffect(() => {
    const slug = getTenantSlug();
    if (!slug) {
        dispatchLocal({ type: 'TENANT_NOT_FOUND' });
        return;
    }

    if (!isSupabaseConfigured()) {
        console.warn("Supabase não configurado. Verifique o arquivo .env");
        // Fallback para mock se quiser, ou erro. Vamos dar erro para forçar config.
        alert("Por favor configure as chaves VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env");
        return;
    }

    const initTenant = async () => {
        try {
            // A. Buscar Tenant
            const { data: tenant, error: tenantError } = await supabase
                .from('tenants')
                .select('*')
                .eq('slug', slug)
                .single();

            if (tenantError || !tenant) {
                dispatchLocal({ type: 'TENANT_NOT_FOUND' });
                return;
            }

            // B. Buscar Dados Relacionados
            const [usersRes, productsRes, tablesRes, ordersRes] = await Promise.all([
                supabase.from('staff').select('*').eq('tenant_id', tenant.id),
                supabase.from('products').select('*').eq('tenant_id', tenant.id),
                supabase.from('restaurant_tables').select('*').eq('tenant_id', tenant.id).order('number'),
                supabase.from('orders').select(`
                    *,
                    items:order_items (*)
                `).eq('tenant_id', tenant.id).eq('is_paid', false) // Apenas pedidos ativos
            ]);

            // Mapeamento de dados SQL -> App Types
            const mappedUsers: User[] = (usersRes.data || []).map(u => ({ id: u.id, name: u.name, role: u.role as Role, pin: u.pin }));
            
            const mappedProducts: Product[] = (productsRes.data || []).map(p => ({
                id: p.id,
                name: p.name,
                description: p.description,
                price: p.price,
                category: p.category,
                type: p.type as ProductType,
                image: p.image,
                isVisible: p.is_visible,
                sortOrder: p.sort_order
            }));

            const mappedTables: Table[] = (tablesRes.data || []).map(t => ({
                id: t.id,
                number: t.number,
                status: t.status as TableStatus,
                customerName: t.customer_name || '',
                accessCode: t.access_code || ''
            }));

            const mappedOrders: Order[] = (ordersRes.data || []).map(o => ({
                id: o.id,
                tableId: o.table_id,
                timestamp: new Date(o.created_at),
                isPaid: o.is_paid,
                items: (o.items || []).map((i: any) => ({
                    id: i.id,
                    productId: i.product_id,
                    quantity: i.quantity,
                    notes: i.notes,
                    status: i.status as OrderStatus,
                    productName: i.product_name,
                    productType: i.product_type as ProductType
                }))
            }));

            dispatchLocal({
                type: 'INIT_DATA',
                payload: {
                    tenantSlug: slug,
                    tenantId: tenant.id,
                    theme: tenant.theme_config || initialState.theme,
                    users: mappedUsers,
                    products: mappedProducts,
                    tables: mappedTables,
                    orders: mappedOrders
                }
            });

        } catch (error) {
            console.error("Erro ao inicializar:", error);
            dispatchLocal({ type: 'TENANT_NOT_FOUND' });
        }
    };

    initTenant();
  }, []);

  // 2. Realtime Subscription
  useEffect(() => {
    if (!state.tenantId) return;

    const channel = supabase.channel('restaurant_changes')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'restaurant_tables', filter: `tenant_id=eq.${state.tenantId}` },
            async (payload) => {
                // Simplificação: Refetch tables para garantir consistência
                const { data } = await supabase.from('restaurant_tables').select('*').eq('tenant_id', state.tenantId!).order('number');
                if (data) {
                    const mapped = data.map(t => ({ id: t.id, number: t.number, status: t.status, customerName: t.customer_name, accessCode: t.access_code }));
                    dispatchLocal({ type: 'REALTIME_UPDATE_TABLES', tables: mapped as Table[] });
                }
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'order_items', filter: `tenant_id=eq.${state.tenantId}` }, // Infelizmente filter em join tables é complexo, melhor ouvir orders ou items
            async () => {
                // Ao mudar qualquer item, refetch orders ativos
                const { data } = await supabase.from('orders').select(`*, items:order_items (*)`).eq('tenant_id', state.tenantId!).eq('is_paid', false);
                if (data) {
                     const mappedOrders: Order[] = data.map(o => ({
                        id: o.id,
                        tableId: o.table_id,
                        timestamp: new Date(o.created_at),
                        isPaid: o.is_paid,
                        items: (o.items || []).map((i: any) => ({
                            id: i.id,
                            productId: i.product_id,
                            quantity: i.quantity,
                            notes: i.notes,
                            status: i.status as OrderStatus,
                            productName: i.product_name,
                            productType: i.product_type as ProductType
                        }))
                    }));
                    dispatchLocal({ type: 'REALTIME_UPDATE_ORDERS', orders: mappedOrders });
                }
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    }
  }, [state.tenantId]);


  // 3. Intercept Dispatch para Side-Effects (Mutations)
  const dispatch = async (action: Action) => {
    // Primeiro, aplica localmente (se necessário/possível)
    // Para simplificar, vamos deixar o Realtime atualizar o estado na maioria dos casos,
    // mas para Login/Logout usamos local.
    
    const { tenantId } = state;

    switch (action.type) {
        case 'LOGIN':
        case 'LOGOUT':
        case 'SET_LOADING':
            dispatchLocal(action);
            break;
        
        case 'OPEN_TABLE':
            if (tenantId) {
                await supabase.from('restaurant_tables').update({
                    status: 'OCCUPIED',
                    customer_name: action.customerName,
                    access_code: action.accessCode
                }).eq('id', action.tableId);
            }
            break;

        case 'CLOSE_TABLE':
            if (tenantId) {
                await supabase.from('restaurant_tables').update({
                    status: 'AVAILABLE',
                    customer_name: null,
                    access_code: null
                }).eq('id', action.tableId);
            }
            break;

        case 'PLACE_ORDER':
            if (tenantId) {
                // 1. Criar Ordem
                const { data: orderData, error } = await supabase.from('orders').insert({
                    tenant_id: tenantId,
                    table_id: action.tableId,
                    status: 'PENDING',
                    is_paid: false
                }).select().single();

                if (orderData && !error) {
                    // 2. Inserir Itens
                    const itemsToInsert = action.items.map(item => {
                        const product = state.products.find(p => p.id === item.productId);
                        return {
                            order_id: orderData.id,
                            product_id: item.productId,
                            product_name: product?.name || 'Unknown',
                            product_price: product?.price || 0,
                            product_type: product?.type || 'KITCHEN',
                            quantity: item.quantity,
                            notes: item.notes,
                            status: 'PENDING'
                        };
                    });
                    await supabase.from('order_items').insert(itemsToInsert);
                }
            }
            break;

        case 'UPDATE_ITEM_STATUS':
            if (tenantId) {
                await supabase.from('order_items').update({ status: action.status }).eq('id', action.itemId);
            }
            break;
        
        case 'PROCESS_PAYMENT':
            if (tenantId) {
                // 1. Registrar Transação
                await supabase.from('transactions').insert({
                    tenant_id: tenantId,
                    table_id: action.tableId,
                    amount: action.amount,
                    method: action.method,
                    items_summary: 'Pedido processado via sistema',
                    cashier_name: state.currentUser?.name || 'Sistema'
                });

                // 2. Marcar Ordens como Pagas
                const tableOrders = state.orders.filter(o => o.tableId === action.tableId);
                const orderIds = tableOrders.map(o => o.id);
                if (orderIds.length > 0) {
                    await supabase.from('orders').update({ is_paid: true, status: 'COMPLETED' }).in('id', orderIds);
                }

                // 3. Liberar Mesa
                await supabase.from('restaurant_tables').update({
                    status: 'AVAILABLE',
                    customer_name: null,
                    access_code: null
                }).eq('id', action.tableId);

                // Forçar atualização local rápida
                const updatedOrders = state.orders.filter(o => o.tableId !== action.tableId);
                dispatchLocal({ type: 'REALTIME_UPDATE_ORDERS', orders: updatedOrders });
            }
            break;

        case 'ADD_PRODUCT':
             if (tenantId) {
                 const { data } = await supabase.from('products').insert({
                     tenant_id: tenantId,
                     name: action.product.name,
                     description: action.product.description,
                     price: action.product.price,
                     category: action.product.category,
                     type: action.product.type,
                     image: action.product.image,
                     is_visible: action.product.isVisible,
                     sort_order: action.product.sortOrder
                 }).select().single();
                 
                 // Recarregar lista
                 if(data) {
                    const { data: allProducts } = await supabase.from('products').select('*').eq('tenant_id', tenantId);
                    // Mapeia e atualiza... simplificado:
                    window.location.reload(); // Hack para simplificar atualização de produtos admin
                 }
             }
             break;
        
        case 'UPDATE_PRODUCT':
            if(tenantId) {
                await supabase.from('products').update({
                     name: action.product.name,
                     description: action.product.description,
                     price: action.product.price,
                     category: action.product.category,
                     type: action.product.type,
                     image: action.product.image,
                     is_visible: action.product.isVisible,
                     sort_order: action.product.sortOrder
                }).eq('id', action.product.id);
                window.location.reload(); 
            }
            break;
        
        case 'UPDATE_THEME':
            if(tenantId) {
                await supabase.from('tenants').update({ theme_config: action.theme }).eq('id', tenantId);
                dispatchLocal(action); // Atualiza localmente imediato
            }
            break;
            
        case 'ADD_USER':
            if(tenantId) {
                await supabase.from('staff').insert({
                    tenant_id: tenantId,
                    name: action.user.name,
                    role: action.user.role,
                    pin: action.user.pin
                });
                window.location.reload();
            }
            break;

        case 'DELETE_USER':
            if(tenantId) {
                await supabase.from('staff').delete().eq('id', action.userId);
                window.location.reload();
            }
            break;
        
        case 'UPDATE_USER':
            if(tenantId) {
                await supabase.from('staff').update({
                    name: action.user.name,
                    role: action.user.role,
                    pin: action.user.pin
                }).eq('id', action.user.id);
                window.location.reload();
            }
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
  if (!context) throw new Error("useRestaurant must be used within RestaurantProvider");
  return context;
};