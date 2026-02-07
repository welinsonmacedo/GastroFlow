import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { Table, Order, Product, TableStatus, OrderStatus, ProductType, OrderItem, RestaurantTheme, User, AuditLog, Transaction, Role, ServiceCall, OnlineUser } from '../types';
import { getTenantSlug } from '../utils/tenant';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
  serviceCalls: ServiceCall[];
  onlineUsers: OnlineUser[]; // Novo estado para realtime
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
  | { type: 'REALTIME_UPDATE_TRANSACTIONS'; transactions: Transaction[] }
  | { type: 'REALTIME_UPDATE_AUDIT_LOGS'; auditLogs: AuditLog[] }
  | { type: 'REALTIME_UPDATE_SERVICE_CALLS'; calls: ServiceCall[] }
  | { type: 'UPDATE_ONLINE_USERS'; users: OnlineUser[] }
  // Ações que disparam side-effects no Supabase (interceptadas)
  | { type: 'ADD_USER'; user: User }
  | { type: 'UPDATE_USER'; user: User }
  | { type: 'DELETE_USER'; userId: string }
  | { type: 'ADD_TABLE' }
  | { type: 'DELETE_TABLE'; tableId: string }
  | { type: 'OPEN_TABLE'; tableId: string; customerName: string; accessCode: string }
  | { type: 'CLOSE_TABLE'; tableId: string }
  | { type: 'PLACE_ORDER'; tableId: string; items: { productId: string; quantity: number; notes: string }[] }
  | { type: 'UPDATE_ITEM_STATUS'; orderId: string; itemId: string; status: OrderStatus }
  | { type: 'UPDATE_PRODUCT'; product: Product }
  | { type: 'ADD_PRODUCT'; product: Product }
  | { type: 'DELETE_PRODUCT'; productId: string } // Nova Action
  | { type: 'UPDATE_THEME'; theme: RestaurantTheme }
  | { type: 'PROCESS_PAYMENT'; tableId: string; amount: number; method: 'CASH' | 'CARD' | 'PIX' }
  | { type: 'CALL_WAITER'; tableId: string }
  | { type: 'RESOLVE_WAITER_CALL'; callId: string }
  | { type: 'PLAY_SOUND'; soundType: 'KITCHEN' | 'WAITER' };

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
  transactions: [],
  serviceCalls: [],
  onlineUsers: []
};

const RestaurantContext = createContext<{
  state: State;
  dispatch: (action: Action) => Promise<void>;
} | undefined>(undefined);

// --- Sounds Logic ---
const kitchenSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 
const waiterSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2346/2346-preview.mp3');

const playSoundSafely = async (audio: HTMLAudioElement) => {
    try {
        audio.currentTime = 0;
        await audio.play();
    } catch (e) {
        console.warn("Autoplay blocked or audio error", e);
    }
};

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
        return { ...state, tables: action.tables };
    
    case 'REALTIME_UPDATE_ORDERS':
        // Detectar se há novos itens de cozinha para tocar som
        if (state.currentUser?.role === Role.KITCHEN || state.currentUser?.role === Role.ADMIN) {
             // Lógica simplificada: Se o numero de ordens aumentou, toca som. 
             if (action.orders.length > state.orders.length) {
                 playSoundSafely(kitchenSound);
             }
        }
        return { ...state, orders: action.orders };
    
    case 'REALTIME_UPDATE_PRODUCTS':
        return { ...state, products: action.products };
    
    case 'REALTIME_UPDATE_TRANSACTIONS':
        return { ...state, transactions: action.transactions };
    
    case 'REALTIME_UPDATE_AUDIT_LOGS':
        return { ...state, auditLogs: action.auditLogs };

    case 'REALTIME_UPDATE_SERVICE_CALLS':
        // Se houver novos chamados pendentes e o usuário for Garçom/Admin
        const newPending = action.calls.filter(c => c.status === 'PENDING').length;
        const oldPending = state.serviceCalls.filter(c => c.status === 'PENDING').length;
        
        if (newPending > oldPending && (state.currentUser?.role === Role.WAITER || state.currentUser?.role === Role.ADMIN)) {
            playSoundSafely(waiterSound);
        }
        return { ...state, serviceCalls: action.calls };

    case 'UPDATE_ONLINE_USERS':
        return { ...state, onlineUsers: action.users };

    case 'UPDATE_THEME':
        return { ...state, theme: action.theme };
    
    case 'PLAY_SOUND': // Action manual se necessário
        if (action.soundType === 'KITCHEN') playSoundSafely(kitchenSound);
        if (action.soundType === 'WAITER') playSoundSafely(waiterSound);
        return state;

    default:
      return state;
  }
};

// --- Provider ---
export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatchLocal] = useReducer(restaurantReducer, initialState);
  const [presenceChannel, setPresenceChannel] = useState<any>(null);

  // Helper para logging
  const logAudit = async (tenantId: string, action: string, details: string) => {
      try {
          await supabase.from('audit_logs').insert({
              tenant_id: tenantId,
              user_id: state.currentUser?.id,
              user_name: state.currentUser?.name || 'Sistema',
              action,
              details
          });
      } catch (e) {
          console.error("Falha ao criar log de auditoria", e);
      }
  };

  // 1. Inicialização e Fetch de Dados
  useEffect(() => {
    const slug = getTenantSlug();
    if (!slug) {
        dispatchLocal({ type: 'TENANT_NOT_FOUND' });
        return;
    }

    if (!isSupabaseConfigured()) {
        console.warn("Supabase não configurado. Verifique o arquivo .env");
    }

    const initTenant = async () => {
        try {
            // A. Buscar Tenant
            const { data: tenant, error: tenantError } = await supabase
                .from('tenants')
                .select('*')
                .eq('slug', slug)
                .maybeSingle();

            if (tenantError || !tenant) {
                dispatchLocal({ type: 'TENANT_NOT_FOUND' });
                return;
            }

            // B. Buscar Dados Relacionados
            const [usersRes, productsRes, tablesRes, ordersRes, transactionsRes, auditRes, callsRes] = await Promise.all([
                supabase.from('staff').select('*').eq('tenant_id', tenant.id),
                supabase.from('products').select('*').eq('tenant_id', tenant.id),
                supabase.from('restaurant_tables').select('*').eq('tenant_id', tenant.id).order('number'),
                supabase.from('orders').select(`*, items:order_items (*)`).eq('tenant_id', tenant.id).eq('is_paid', false), // Apenas pedidos ativos
                supabase.from('transactions').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(50),
                supabase.from('audit_logs').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(50),
                supabase.from('service_calls').select('*').eq('tenant_id', tenant.id).eq('status', 'PENDING')
            ]);

            // Mapeamento de dados SQL -> App Types
            const mappedUsers: User[] = (usersRes.data || []).map(u => ({ 
                id: u.id, 
                name: u.name, 
                role: u.role as Role, 
                pin: u.pin,
                auth_user_id: u.auth_user_id,
                email: u.email,
                allowedRoutes: u.allowed_routes || [] // Busca rotas permitidas
            }));
            
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

            const mappedTransactions: Transaction[] = (transactionsRes.data || []).map(t => ({
                id: t.id,
                tableId: t.table_id || '',
                tableNumber: t.table_number || 0,
                amount: t.amount,
                method: t.method as any,
                timestamp: new Date(t.created_at),
                itemsSummary: t.items_summary || '',
                cashierName: t.cashier_name || ''
            }));

            const mappedAuditLogs: AuditLog[] = (auditRes.data || []).map(l => ({
                id: l.id,
                userId: l.user_id || '',
                userName: l.user_name || '',
                action: l.action,
                details: l.details || '',
                timestamp: new Date(l.created_at)
            }));

             const mappedCalls: ServiceCall[] = (callsRes.data || []).map(c => ({
                id: c.id,
                tableId: c.table_id,
                status: c.status,
                timestamp: new Date(c.created_at)
            }));

            // C. AUTO-LOGIN via Supabase Auth Check (Initial Load)
            let autoLoggedUser: User | null = null;
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                // Tenta achar na lista carregada
                const authenticatedStaff = mappedUsers.find(u => u.auth_user_id === session.user.id);
                if (authenticatedStaff) {
                    autoLoggedUser = authenticatedStaff;
                } else {
                    // Se não achou (talvez paginação ou RLS), tenta buscar individualmente para garantir
                    const { data: staffData } = await supabase.from('staff').select('*').eq('auth_user_id', session.user.id).eq('tenant_id', tenant.id).maybeSingle();
                    if(staffData) {
                         autoLoggedUser = {
                             id: staffData.id,
                             name: staffData.name,
                             role: staffData.role,
                             pin: staffData.pin,
                             auth_user_id: staffData.auth_user_id,
                             email: staffData.email,
                             allowedRoutes: staffData.allowed_routes || []
                         };
                    }
                }
            }

            dispatchLocal({
                type: 'INIT_DATA',
                payload: {
                    tenantSlug: slug,
                    tenantId: tenant.id,
                    theme: tenant.theme_config || initialState.theme,
                    users: mappedUsers,
                    products: mappedProducts,
                    tables: mappedTables,
                    orders: mappedOrders,
                    transactions: mappedTransactions,
                    auditLogs: mappedAuditLogs,
                    serviceCalls: mappedCalls,
                    currentUser: autoLoggedUser
                }
            });

        } catch (error) {
            console.error("Erro ao inicializar:", error);
            dispatchLocal({ type: 'TENANT_NOT_FOUND' });
        }
    };

    initTenant();
  }, []);

  // 2. Presence Logic (Monitoramento Online)
  useEffect(() => {
      // Só ativa se tiver tenant e usuário logado
      if (!state.tenantId || !state.currentUser) {
          if (presenceChannel) {
              presenceChannel.unsubscribe();
              setPresenceChannel(null);
          }
          return;
      }

      // Cria canal para tracking de presença
      const channel = supabase.channel(`presence:${state.tenantId}`, {
          config: {
              presence: {
                  key: state.currentUser.id,
              },
          },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
            const newState = channel.presenceState();
            const users: OnlineUser[] = [];
            
            Object.keys(newState).forEach(key => {
                const presence = newState[key][0]; // Pega a última sessão
                if (presence) {
                    users.push({
                        id: presence.user_id,
                        name: presence.name,
                        role: presence.role,
                        onlineAt: new Date(presence.online_at)
                    });
                }
            });
            dispatchLocal({ type: 'UPDATE_ONLINE_USERS', users });
        })
        .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    user_id: state.currentUser?.id,
                    name: state.currentUser?.name,
                    role: state.currentUser?.role,
                    online_at: new Date().toISOString(),
                });
            }
        });

      setPresenceChannel(channel);

      return () => {
          channel.unsubscribe();
      };
  }, [state.tenantId, state.currentUser?.id]); // Re-executa se mudar o usuário logado

  // 3. Auth Listener Change (Detecta logins feitos em outras partes, como Login.tsx ou OwnerLogin.tsx)
  useEffect(() => {
    if (!state.tenantId) return; // Só roda se o tenant já foi identificado

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
        if (event === 'SIGNED_IN' && session?.user) {
            // Tenta encontrar o usuário na lista de staff deste restaurante
            const authenticatedStaff = state.users.find(u => u.auth_user_id === session.user.id);
            if (authenticatedStaff) {
                dispatchLocal({ type: 'LOGIN', user: authenticatedStaff });
            } else {
                 // Fallback: busca no banco se não estiver na lista local
                 const { data: staffData } = await supabase
                    .from('staff')
                    .select('*')
                    .eq('auth_user_id', session.user.id)
                    .eq('tenant_id', state.tenantId)
                    .maybeSingle();
                
                 if(staffData) {
                     dispatchLocal({ type: 'LOGIN', user: {
                         id: staffData.id,
                         name: staffData.name,
                         role: staffData.role,
                         pin: staffData.pin,
                         auth_user_id: staffData.auth_user_id,
                         email: staffData.email,
                         allowedRoutes: staffData.allowed_routes || []
                     }});
                 }
            }
        } else if (event === 'SIGNED_OUT') {
            dispatchLocal({ type: 'LOGOUT' });
        }
    });

    return () => {
        subscription.unsubscribe();
    };
  }, [state.tenantId, state.users]); 

  // 4. Realtime Subscription (Dados do Banco)
  useEffect(() => {
    if (!state.tenantId) return;

    const channel = supabase.channel('restaurant_changes')
        // Mesas
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'restaurant_tables', filter: `tenant_id=eq.${state.tenantId}` },
            async () => {
                const { data } = await supabase.from('restaurant_tables').select('*').eq('tenant_id', state.tenantId!).order('number');
                if (data) {
                    const mapped = data.map((t: any) => ({ id: t.id, number: t.number, status: t.status, customerName: t.customer_name, accessCode: t.access_code }));
                    dispatchLocal({ type: 'REALTIME_UPDATE_TABLES', tables: mapped as Table[] });
                }
            }
        )
        // Pedidos (Itens)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'order_items', filter: `tenant_id=eq.${state.tenantId}` },
            async () => {
                const { data } = await supabase.from('orders').select(`*, items:order_items (*)`).eq('tenant_id', state.tenantId!).eq('is_paid', false);
                if (data) {
                     const mappedOrders: Order[] = data.map((o: any) => ({
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
        // Chamados (Service Calls)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'service_calls', filter: `tenant_id=eq.${state.tenantId}` },
            async () => {
                 const { data } = await supabase.from('service_calls').select('*').eq('tenant_id', state.tenantId!).eq('status', 'PENDING');
                 if(data) {
                     const mappedCalls: ServiceCall[] = data.map((c: any) => ({
                        id: c.id,
                        tableId: c.table_id,
                        status: c.status,
                        timestamp: new Date(c.created_at)
                    }));
                    dispatchLocal({ type: 'REALTIME_UPDATE_SERVICE_CALLS', calls: mappedCalls });
                 }
            }
        )
        // Transações
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'transactions', filter: `tenant_id=eq.${state.tenantId}` },
            async () => {
                const { data } = await supabase.from('transactions').select('*').eq('tenant_id', state.tenantId!).order('created_at', { ascending: false }).limit(50);
                if (data) {
                    const mapped = data.map((t: any) => ({
                        id: t.id, tableId: t.table_id || '', tableNumber: t.table_number || 0, amount: t.amount, method: t.method as any, timestamp: new Date(t.created_at), itemsSummary: t.items_summary || '', cashierName: t.cashier_name || ''
                    }));
                    dispatchLocal({ type: 'REALTIME_UPDATE_TRANSACTIONS', transactions: mapped });
                }
            }
        )
        // Logs de Auditoria
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'audit_logs', filter: `tenant_id=eq.${state.tenantId}` },
            async () => {
                const { data } = await supabase.from('audit_logs').select('*').eq('tenant_id', state.tenantId!).order('created_at', { ascending: false }).limit(50);
                if (data) {
                    const mapped = data.map((l: any) => ({
                        id: l.id, userId: l.user_id || '', userName: l.user_name || '', action: l.action, details: l.details || '', timestamp: new Date(l.created_at)
                    }));
                    dispatchLocal({ type: 'REALTIME_UPDATE_AUDIT_LOGS', auditLogs: mapped });
                }
            }
        )
        // Produtos
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'products', filter: `tenant_id=eq.${state.tenantId}` },
            async () => {
                 const { data } = await supabase.from('products').select('*').eq('tenant_id', state.tenantId!);
                 if (data) {
                     const mapped = data.map((p: any) => ({
                        id: p.id, name: p.name, description: p.description, price: p.price, category: p.category, type: p.type as ProductType, image: p.image, isVisible: p.is_visible, sortOrder: p.sort_order
                    }));
                    dispatchLocal({ type: 'REALTIME_UPDATE_PRODUCTS', products: mapped });
                 }
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    }
  }, [state.tenantId]);


  // 5. Intercept Dispatch para Side-Effects (Mutations)
  const dispatch = async (action: Action) => {
    const { tenantId } = state;

    switch (action.type) {
        case 'LOGIN':
            // Log de login
            dispatchLocal(action);
            break;
        case 'LOGOUT':
            // Deslogar também do Supabase Auth para garantir segurança
            await supabase.auth.signOut();
            dispatchLocal(action);
            break;
        case 'SET_LOADING':
            dispatchLocal(action);
            break;
        case 'PLAY_SOUND':
            dispatchLocal(action);
            break;
        
        case 'ADD_TABLE':
            if (tenantId) {
                // Calcula o próximo número de mesa
                const maxNumber = state.tables.reduce((max, t) => Math.max(max, t.number), 0);
                const nextNumber = maxNumber + 1;
                
                await supabase.from('restaurant_tables').insert({
                    tenant_id: tenantId,
                    number: nextNumber,
                    status: 'AVAILABLE'
                });
                logAudit(tenantId, 'ADD_TABLE', `Mesa ${nextNumber} criada`);
            }
            break;

        case 'DELETE_TABLE':
            if (tenantId) {
                // Verifica se há pedidos abertos
                const hasOrders = state.orders.some(o => o.tableId === action.tableId && !o.isPaid);
                if (hasOrders) {
                    alert("Não é possível excluir uma mesa com pedidos em aberto.");
                    return;
                }
                await supabase.from('restaurant_tables').delete().eq('id', action.tableId);
                logAudit(tenantId, 'DELETE_TABLE', `Mesa ID ${action.tableId} excluída`);
            }
            break;

        case 'OPEN_TABLE':
            if (tenantId) {
                await supabase.from('restaurant_tables').update({
                    status: 'OCCUPIED',
                    customer_name: action.customerName,
                    access_code: action.accessCode
                }).eq('id', action.tableId);
                logAudit(tenantId, 'OPEN_TABLE', `Mesa ${action.tableId} aberta para ${action.customerName}`);
            }
            break;

        case 'CLOSE_TABLE':
            if (tenantId) {
                await supabase.from('restaurant_tables').update({
                    status: 'AVAILABLE',
                    customer_name: null,
                    access_code: null
                }).eq('id', action.tableId);
                logAudit(tenantId, 'CLOSE_TABLE', `Mesa ${action.tableId} fechada manualmente`);
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
                            tenant_id: tenantId, // Importante para RLS/Filtro
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
                    // Não precisa logar audit aqui, é ação do cliente
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
                // Buscar número da mesa
                const table = state.tables.find(t => t.id === action.tableId);
                
                // 1. Registrar Transação
                await supabase.from('transactions').insert({
                    tenant_id: tenantId,
                    table_id: action.tableId,
                    table_number: table?.number || 0,
                    amount: action.amount,
                    method: action.method,
                    items_summary: 'Pedido processado via sistema', // Melhoria futura: listar itens
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
                
                logAudit(tenantId, 'PAYMENT', `Pagamento de R$${action.amount} recebido via ${action.method} mesa ${table?.number}`);
            }
            break;

        case 'CALL_WAITER':
            if (tenantId) {
                // Verifica se já existe chamado pendente para evitar spam
                const { data: existing } = await supabase.from('service_calls')
                    .select('id')
                    .eq('table_id', action.tableId)
                    .eq('status', 'PENDING')
                    .maybeSingle();

                if (!existing) {
                    await supabase.from('service_calls').insert({
                        tenant_id: tenantId,
                        table_id: action.tableId,
                        status: 'PENDING'
                    });
                }
            }
            break;
        
        case 'RESOLVE_WAITER_CALL':
            if (tenantId) {
                await supabase.from('service_calls')
                    .update({ status: 'RESOLVED' })
                    .eq('id', action.callId);
            }
            break;

        case 'ADD_PRODUCT':
             if (tenantId) {
                 await supabase.from('products').insert({
                     tenant_id: tenantId,
                     name: action.product.name,
                     description: action.product.description,
                     price: action.product.price,
                     category: action.product.category,
                     type: action.product.type,
                     image: action.product.image,
                     is_visible: action.product.isVisible,
                     sort_order: action.product.sortOrder
                 });
                 logAudit(tenantId, 'ADD_PRODUCT', `Produto ${action.product.name} criado`);
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
                // Auditoria opcional para updates frequentes
            }
            break;
        
        case 'DELETE_PRODUCT':
            if (tenantId) {
                await supabase.from('products').delete().eq('id', action.productId);
                logAudit(tenantId, 'DELETE_PRODUCT', `Produto ID ${action.productId} removido`);
            }
            break;
        
        case 'UPDATE_THEME':
            if(tenantId) {
                await supabase.from('tenants').update({ theme_config: action.theme }).eq('id', tenantId);
                dispatchLocal(action);
                logAudit(tenantId, 'UPDATE_THEME', `Tema atualizado`);
            }
            break;
            
        case 'ADD_USER':
            if(tenantId) {
                await supabase.from('staff').insert({
                    tenant_id: tenantId,
                    name: action.user.name,
                    role: action.user.role,
                    pin: action.user.pin,
                    email: action.user.email,
                    allowed_routes: action.user.allowedRoutes // Salva permissões
                });
                window.location.reload();
                logAudit(tenantId, 'ADD_USER', `Usuário ${action.user.name} criado`);
            }
            break;

        case 'DELETE_USER':
            if(tenantId) {
                await supabase.from('staff').delete().eq('id', action.userId);
                window.location.reload();
                logAudit(tenantId, 'DELETE_USER', `Usuário ID ${action.userId} removido`);
            }
            break;
        
        case 'UPDATE_USER':
            if(tenantId) {
                await supabase.from('staff').update({
                    name: action.user.name,
                    role: action.user.role,
                    pin: action.user.pin,
                    email: action.user.email,
                    allowed_routes: action.user.allowedRoutes // Atualiza permissões
                }).eq('id', action.user.id);
                window.location.reload();
                logAudit(tenantId, 'UPDATE_USER', `Usuário ${action.user.name} atualizado`);
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