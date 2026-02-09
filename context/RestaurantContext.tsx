import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { Table, Order, Product, TableStatus, OrderStatus, ProductType, RestaurantTheme, User, AuditLog, Transaction, Role, ServiceCall, OnlineUser, PlanLimits, InventoryItem, Expense, Supplier, InventoryRecipeItem, PurchaseEntry, POSSaleData, CashSession, CashMovement } from '../types';
import { getTenantSlug } from '../utils/tenant';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useUI } from './UIContext';

// --- Types ---
export interface InventoryLog {
    id: string;
    item_id: string;
    item_name?: string; // Join
    type: 'IN' | 'OUT' | 'SALE' | 'LOSS';
    quantity: number;
    reason: string;
    user_name: string;
    created_at: Date;
}

interface State {
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
  currentUser: User | null;
  users: User[];
  auditLogs: AuditLog[];
  transactions: Transaction[];
  serviceCalls: ServiceCall[];
  onlineUsers: OnlineUser[]; 
  audioUnlocked: boolean;
  // ERP STATES
  inventory: InventoryItem[];
  inventoryLogs: InventoryLog[]; // Novo Estado
  expenses: Expense[];
  suppliers: Supplier[];
  // CASHIER STATES
  activeCashSession: CashSession | null;
  cashMovements: CashMovement[];
}

type Action =
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'INIT_DATA'; payload: Partial<State> }
  | { type: 'TENANT_NOT_FOUND' }
  | { type: 'TENANT_INACTIVE' } 
  | { type: 'UPDATE_PLAN_LIMITS'; limits: PlanLimits; status?: string }
  | { type: 'LOGIN'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'REALTIME_UPDATE_TABLES'; tables: Table[] }
  | { type: 'REALTIME_UPDATE_ORDERS'; orders: Order[] }
  | { type: 'REALTIME_UPDATE_PRODUCTS'; products: Product[] }
  | { type: 'REALTIME_UPDATE_TRANSACTIONS'; transactions: Transaction[] }
  | { type: 'REALTIME_UPDATE_AUDIT_LOGS'; auditLogs: AuditLog[] }
  | { type: 'REALTIME_UPDATE_SERVICE_CALLS'; calls: ServiceCall[] }
  | { type: 'REALTIME_UPDATE_INVENTORY'; inventory: InventoryItem[] }
  | { type: 'REALTIME_UPDATE_INVENTORY_LOGS'; logs: InventoryLog[] }
  | { type: 'REALTIME_UPDATE_EXPENSES'; expenses: Expense[] }
  | { type: 'REALTIME_UPDATE_SUPPLIERS'; suppliers: Supplier[] }
  | { type: 'REALTIME_UPDATE_CASH_SESSION'; session: CashSession | null }
  | { type: 'REALTIME_UPDATE_CASH_MOVEMENTS'; movements: CashMovement[] }
  | { type: 'UPDATE_ONLINE_USERS'; users: OnlineUser[] }
  | { type: 'UNLOCK_AUDIO' }
  | { type: 'ADD_USER'; user: User }
  | { type: 'UPDATE_USER'; user: User }
  | { type: 'DELETE_USER'; userId: string }
  | { type: 'ADD_TABLE' }
  | { type: 'DELETE_TABLE'; tableId: string }
  | { type: 'OPEN_TABLE'; tableId: string; customerName: string; accessCode: string }
  | { type: 'CLOSE_TABLE'; tableId: string }
  | { type: 'PLACE_ORDER'; tableId: string; items: { productId: string; quantity: number; notes: string }[] }
  | { type: 'UPDATE_ITEM_STATUS'; orderId: string; itemId: string; status: OrderStatus }
  | { type: 'ADD_PRODUCT_TO_MENU'; product: Product } 
  | { type: 'UPDATE_PRODUCT'; product: Product }
  | { type: 'DELETE_PRODUCT'; productId: string }
  | { type: 'UPDATE_THEME'; theme: RestaurantTheme }
  | { type: 'PROCESS_PAYMENT'; tableId: string; amount: number; method: 'CASH' | 'CARD' | 'PIX' | 'CREDIT' | 'DEBIT' }
  | { type: 'PROCESS_POS_SALE'; sale: POSSaleData }
  | { type: 'CALL_WAITER'; tableId: string }
  | { type: 'RESOLVE_WAITER_CALL'; callId: string }
  | { type: 'PLAY_SOUND'; soundType: 'KITCHEN' | 'WAITER' }
  | { type: 'ADD_INVENTORY_ITEM'; item: InventoryItem }
  | { type: 'UPDATE_INVENTORY_ITEM'; item: InventoryItem }
  | { type: 'UPDATE_STOCK'; itemId: string; quantity: number; reason: string; operation: 'IN' | 'OUT' }
  | { type: 'PROCESS_PURCHASE'; purchase: PurchaseEntry }
  | { type: 'PROCESS_INVENTORY_ADJUSTMENT'; adjustments: { itemId: string; realQty: number }[] }
  | { type: 'ADD_SUPPLIER'; supplier: Supplier }
  | { type: 'DELETE_SUPPLIER'; supplierId: string }
  | { type: 'ADD_EXPENSE'; expense: Expense }
  | { type: 'PAY_EXPENSE'; expenseId: string }
  | { type: 'DELETE_EXPENSE'; expenseId: string }
  // CASHIER ACTIONS
  | { type: 'OPEN_CASH_REGISTER'; initialAmount: number }
  | { type: 'CLOSE_CASH_REGISTER'; finalAmount: number }
  | { type: 'CASH_BLEED'; amount: number; reason: string };

const initialState: State = {
  isLoading: true,
  tenantSlug: null,
  tenantId: null,
  isValidTenant: false,
  isInactiveTenant: false,
  planLimits: { 
      maxTables: -1, 
      maxProducts: -1, 
      maxStaff: -1, 
      allowKds: true, 
      allowCashier: true,
      allowReports: true,
      allowInventory: true,
      allowPurchases: true,
      allowExpenses: true,
      allowStaff: true,
      allowTableMgmt: true,
      allowCustomization: true
  },
  tables: [],
  products: [],
  orders: [],
  theme: { primaryColor: '#000', backgroundColor: '#fff', fontColor: '#000', logoUrl: '', restaurantName: 'Carregando...' },
  currentUser: null,
  users: [],
  auditLogs: [],
  transactions: [],
  serviceCalls: [],
  onlineUsers: [],
  audioUnlocked: false,
  inventory: [],
  inventoryLogs: [],
  expenses: [],
  suppliers: [],
  activeCashSession: null,
  cashMovements: []
};

const RestaurantContext = createContext<{
  state: State;
  dispatch: (action: Action) => Promise<void>;
} | undefined>(undefined);

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
};

// --- Sounds Logic ---
const kitchenSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 
const waiterSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2346/2346-preview.mp3');

const playSoundSafely = async (audio: HTMLAudioElement) => {
    try {
        audio.currentTime = 0;
        await audio.play();
    } catch (e) {
        console.warn("Autoplay bloqueado.", e);
    }
};

const restaurantReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, isLoading: action.isLoading };
    case 'TENANT_NOT_FOUND': return { ...state, isLoading: false, isValidTenant: false };
    case 'TENANT_INACTIVE': return { ...state, isLoading: false, isValidTenant: true, isInactiveTenant: true };
    case 'UPDATE_PLAN_LIMITS': return { ...state, planLimits: action.limits, isInactiveTenant: action.status === 'INACTIVE', isValidTenant: action.status !== 'INACTIVE' };
    case 'INIT_DATA': return { ...state, ...action.payload, isLoading: false, isValidTenant: true, isInactiveTenant: false };
    case 'LOGIN': return { ...state, currentUser: action.user };
    case 'LOGOUT': return { ...state, currentUser: null };
    case 'UNLOCK_AUDIO': return { ...state, audioUnlocked: true };
    case 'REALTIME_UPDATE_TABLES': return { ...state, tables: action.tables };
    case 'REALTIME_UPDATE_ORDERS':
        if (state.currentUser?.role === Role.KITCHEN || state.currentUser?.role === Role.ADMIN) {
             const countNewPending = action.orders.reduce((acc, order) => acc + order.items.filter(i => i.status === OrderStatus.PENDING && i.productType === ProductType.KITCHEN).length, 0);
             const countOldPending = state.orders.reduce((acc, order) => acc + order.items.filter(i => i.status === OrderStatus.PENDING && i.productType === ProductType.KITCHEN).length, 0);
             if (countNewPending > countOldPending) playSoundSafely(kitchenSound);
        }
        return { ...state, orders: action.orders };
    case 'REALTIME_UPDATE_PRODUCTS': return { ...state, products: action.products };
    case 'REALTIME_UPDATE_TRANSACTIONS': return { ...state, transactions: action.transactions };
    case 'REALTIME_UPDATE_AUDIT_LOGS': return { ...state, auditLogs: action.auditLogs };
    case 'REALTIME_UPDATE_SERVICE_CALLS':
        const newPending = action.calls.filter(c => c.status === 'PENDING').length;
        const oldPending = state.serviceCalls.filter(c => c.status === 'PENDING').length;
        if (newPending > oldPending && (state.currentUser?.role === Role.WAITER || state.currentUser?.role === Role.ADMIN)) playSoundSafely(waiterSound);
        return { ...state, serviceCalls: action.calls };
    case 'REALTIME_UPDATE_INVENTORY': return { ...state, inventory: action.inventory };
    case 'REALTIME_UPDATE_INVENTORY_LOGS': return { ...state, inventoryLogs: action.logs };
    case 'REALTIME_UPDATE_EXPENSES': return { ...state, expenses: action.expenses };
    case 'REALTIME_UPDATE_SUPPLIERS': return { ...state, suppliers: action.suppliers };
    case 'REALTIME_UPDATE_CASH_SESSION': return { ...state, activeCashSession: action.session };
    case 'REALTIME_UPDATE_CASH_MOVEMENTS': return { ...state, cashMovements: action.movements };
    case 'UPDATE_ONLINE_USERS': return { ...state, onlineUsers: action.users };
    case 'UPDATE_THEME': return { ...state, theme: action.theme };
    case 'PLAY_SOUND': 
        if (action.soundType === 'KITCHEN') playSoundSafely(kitchenSound);
        if (action.soundType === 'WAITER') playSoundSafely(waiterSound);
        return state;
    default: return state;
  }
};

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatchLocal] = useReducer(restaurantReducer, initialState);
  const [presenceChannel, setPresenceChannel] = useState<any>(null);
  const { showAlert } = useUI();

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
          console.error("Falha audit", e);
      }
  };

  useEffect(() => {
    const slug = getTenantSlug();
    if (!slug) { dispatchLocal({ type: 'TENANT_NOT_FOUND' }); return; }

    const initTenant = async () => {
        try {
            const { data: tenant } = await supabase.from('tenants').select('*').eq('slug', slug).maybeSingle();
            if (!tenant) { dispatchLocal({ type: 'TENANT_NOT_FOUND' }); return; }
            if (tenant.status === 'INACTIVE') { dispatchLocal({ type: 'TENANT_INACTIVE' }); return; }
            
            let currentLimits = initialState.planLimits;
            const { data: planData } = await supabase.from('plans').select('limits').eq('key', tenant.plan).maybeSingle();
            if (planData?.limits) {
                currentLimits = { 
                    ...initialState.planLimits, 
                    ...Object.fromEntries(
                        Object.entries(planData.limits).filter(([_, v]) => v !== undefined && v !== null)
                    )
                };
            }

            const yesterday = new Date(); yesterday.setHours(yesterday.getHours() - 24);

            // Fetch Initial Data + Active Cash Session
            const [
                usersRes, productsRes, tablesRes, ordersRes, transactionsRes, auditRes, callsRes,
                invRes, expRes, suppRes, invRecipesRes, cashSessionRes, invLogsRes
            ] = await Promise.all([
                supabase.from('staff').select('*').eq('tenant_id', tenant.id),
                supabase.from('products').select('*').eq('tenant_id', tenant.id),
                supabase.from('restaurant_tables').select('*').eq('tenant_id', tenant.id).order('number'),
                supabase.from('orders').select(`*, items:order_items (*)`).eq('tenant_id', tenant.id).gte('created_at', yesterday.toISOString()),
                supabase.from('transactions').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(50),
                supabase.from('audit_logs').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(50),
                supabase.from('service_calls').select('*').eq('tenant_id', tenant.id).eq('status', 'PENDING'),
                supabase.from('inventory_items').select('*').eq('tenant_id', tenant.id),
                supabase.from('expenses').select('*').eq('tenant_id', tenant.id).order('due_date', { ascending: true }),
                supabase.from('suppliers').select('*').eq('tenant_id', tenant.id),
                supabase.from('inventory_recipes').select('*').eq('tenant_id', tenant.id),
                supabase.from('cash_sessions').select('*').eq('tenant_id', tenant.id).eq('status', 'OPEN').maybeSingle(),
                supabase.from('inventory_logs').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(100)
            ]);

            const mappedUsers = (usersRes.data || []).map(u => ({ id: u.id, name: u.name, role: u.role, pin: u.pin, auth_user_id: u.auth_user_id, email: u.email, allowedRoutes: u.allowed_routes || [] }));
            
            // Map Active Cash Session
            let activeCashSession = null;
            let cashMovements: CashMovement[] = [];
            
            if (cashSessionRes.data) {
                activeCashSession = {
                    id: cashSessionRes.data.id,
                    openedAt: new Date(cashSessionRes.data.opened_at),
                    initialAmount: cashSessionRes.data.initial_amount,
                    status: cashSessionRes.data.status,
                    operatorName: cashSessionRes.data.operator_name
                };
                
                // Fetch movements for active session
                const { data: moves } = await supabase.from('cash_movements').select('*').eq('session_id', activeCashSession.id);
                if (moves) {
                    cashMovements = moves.map((m: any) => ({
                        id: m.id,
                        sessionId: m.session_id,
                        type: m.type,
                        amount: m.amount,
                        reason: m.reason,
                        timestamp: new Date(m.created_at),
                        userName: m.user_name
                    }));
                }
            }

            const rawInventory = invRes.data || [];
            const rawRecipes = invRecipesRes.data || [];
            
            const mappedInventory: InventoryItem[] = rawInventory.map(i => {
                const myRecipes = rawRecipes.filter((r: any) => r.parent_item_id === i.id);
                const recipeItems: InventoryRecipeItem[] = myRecipes.map((r: any) => {
                    const ing = rawInventory.find((raw: any) => raw.id === r.ingredient_item_id);
                    return {
                        ingredientId: r.ingredient_item_id,
                        ingredientName: ing?.name || '?',
                        quantity: r.quantity,
                        unit: ing?.unit,
                        cost: ing?.cost_price
                    };
                });

                return {
                    id: i.id, name: i.name, unit: i.unit, quantity: i.quantity, minQuantity: i.min_quantity, costPrice: i.cost_price,
                    type: i.type || 'INGREDIENT',
                    image: i.image, // Load Image
                    recipe: recipeItems
                };
            });

            const mappedInventoryLogs: InventoryLog[] = (invLogsRes.data || []).map(l => ({
                id: l.id,
                item_id: l.item_id,
                type: l.type,
                quantity: l.quantity,
                reason: l.reason,
                user_name: l.user_name,
                created_at: new Date(l.created_at)
            }));

            const mappedProducts: Product[] = (productsRes.data || []).map(p => ({
                id: p.id,
                linkedInventoryItemId: p.linked_inventory_item_id, 
                name: p.name, description: p.description, price: p.price, costPrice: p.cost_price || 0,
                category: p.category, type: p.type, image: p.image, isVisible: p.is_visible, sortOrder: p.sort_order
            }));

            const mappedTables = (tablesRes.data || []).map(t => ({ id: t.id, number: t.number, status: t.status, customerName: t.customer_name || '', accessCode: t.access_code || '' }));
            const mappedOrders = (ordersRes.data || []).map(o => ({
                id: o.id, tableId: o.table_id, timestamp: new Date(o.created_at), isPaid: o.is_paid,
                items: (o.items || []).map((i: any) => ({ id: i.id, productId: i.product_id, quantity: i.quantity, notes: i.notes, status: i.status, productName: i.product_name, productType: i.product_type }))
            }));
            const mappedTransactions = (transactionsRes.data || []).map(t => ({ id: t.id, tableId: t.table_id || '', tableNumber: t.table_number || 0, amount: t.amount, method: t.method as any, timestamp: new Date(t.created_at), itemsSummary: t.items_summary || '', cashierName: t.cashier_name || '' }));
            const mappedAuditLogs = (auditRes.data || []).map(l => ({ id: l.id, userId: l.user_id || '', userName: l.user_name || '', action: l.action, details: l.details || '', timestamp: new Date(l.created_at) }));
            const mappedCalls = (callsRes.data || []).map(c => ({ id: c.id, tableId: c.table_id, status: c.status, timestamp: new Date(c.created_at) }));
            const mappedExpenses = (expRes.data || []).map(e => ({ id: e.id, description: e.description, amount: e.amount, category: e.category, dueDate: new Date(e.due_date), paidDate: e.paid_date ? new Date(e.paid_date) : undefined, isPaid: e.is_paid, supplierId: e.supplier_id }));
            const mappedSuppliers: Supplier[] = (suppRes.data || []).map(s => ({ 
                id: s.id, 
                name: s.name, 
                contactName: s.contact_name, 
                phone: s.phone,
                cnpj: s.cnpj,
                ie: s.ie,
                email: s.email,
                cep: s.cep,
                address: s.address,
                number: s.number,
                complement: s.complement,
                city: s.city,
                state: s.state
            }));

            let autoLoggedUser: User | null = null;
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const authenticatedStaff = mappedUsers.find(u => u.auth_user_id === session.user.id);
                if (authenticatedStaff) autoLoggedUser = authenticatedStaff;
                else {
                    const { data: staffData } = await supabase.from('staff').select('*').eq('auth_user_id', session.user.id).eq('tenant_id', tenant.id).maybeSingle();
                    if(staffData) autoLoggedUser = { id: staffData.id, name: staffData.name, role: staffData.role, pin: staffData.pin, auth_user_id: staffData.auth_user_id, email: staffData.email, allowedRoutes: staffData.allowed_routes || [] };
                }
            }

            dispatchLocal({
                type: 'INIT_DATA',
                payload: {
                    tenantSlug: slug, tenantId: tenant.id, theme: tenant.theme_config || initialState.theme,
                    users: mappedUsers, products: mappedProducts, tables: mappedTables, orders: mappedOrders,
                    transactions: mappedTransactions, auditLogs: mappedAuditLogs, serviceCalls: mappedCalls,
                    currentUser: autoLoggedUser, planLimits: currentLimits, inventory: mappedInventory,
                    inventoryLogs: mappedInventoryLogs,
                    expenses: mappedExpenses, suppliers: mappedSuppliers,
                    activeCashSession, cashMovements
                }
            });
        } catch (error) { dispatchLocal({ type: 'TENANT_NOT_FOUND' }); }
    };
    initTenant();
  }, []);

  // --- REALTIME SUBSCRIPTIONS ---
  useEffect(() => {
    if (!state.tenantId) return;
    const tenantId = state.tenantId;

    // Helper: Re-fetch Inventory when DB changes (Backup for strict consistency)
    const fetchInventory = async () => {
        const { data: inv } = await supabase.from('inventory_items').select('*').eq('tenant_id', tenantId);
        const { data: recipes } = await supabase.from('inventory_recipes').select('*').eq('tenant_id', tenantId);
        
        if (inv) {
             const mapped: InventoryItem[] = inv.map(i => {
                 const myRecipes = recipes?.filter((r: any) => r.parent_item_id === i.id) || [];
                 const recipeItems: InventoryRecipeItem[] = myRecipes.map((r: any) => {
                    const ing = inv.find((raw: any) => raw.id === r.ingredient_item_id);
                    return {
                        ingredientId: r.ingredient_item_id,
                        ingredientName: ing?.name || '?',
                        quantity: r.quantity,
                        unit: ing?.unit,
                        cost: ing?.cost_price
                    };
                });
                 return {
                    id: i.id, name: i.name, unit: i.unit, quantity: i.quantity, minQuantity: i.min_quantity, 
                    costPrice: i.cost_price, type: i.type, image: i.image, recipe: recipeItems
                 };
             });
             dispatchLocal({ type: 'REALTIME_UPDATE_INVENTORY', inventory: mapped });
        }
    };

    // Helper: Re-fetch Logs
    const fetchLogs = async () => {
        const { data: logs } = await supabase.from('inventory_logs').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(100);
        if (logs) {
            const mapped: InventoryLog[] = logs.map(l => ({
                id: l.id,
                item_id: l.item_id,
                type: l.type,
                quantity: l.quantity,
                reason: l.reason,
                user_name: l.user_name,
                created_at: new Date(l.created_at)
            }));
            dispatchLocal({ type: 'REALTIME_UPDATE_INVENTORY_LOGS', logs: mapped });
        }
    };

    // Helper: Re-fetch Suppliers
    const fetchSuppliers = async () => {
        const { data } = await supabase.from('suppliers').select('*').eq('tenant_id', tenantId);
        if(data) {
            const mapped: Supplier[] = data.map(s => ({ 
                id: s.id, 
                name: s.name, 
                contactName: s.contact_name, 
                phone: s.phone,
                cnpj: s.cnpj,
                ie: s.ie,
                email: s.email,
                cep: s.cep,
                address: s.address,
                number: s.number,
                complement: s.complement,
                city: s.city,
                state: s.state
            }));
            dispatchLocal({ type: 'REALTIME_UPDATE_SUPPLIERS', suppliers: mapped });
        }
    }

    // Helper: Re-fetch Cash Data
    const fetchCashData = async () => {
        const { data: sessionData } = await supabase.from('cash_sessions').select('*').eq('tenant_id', tenantId).eq('status', 'OPEN').maybeSingle();
        
        if (sessionData) {
            const activeSession = {
                id: sessionData.id,
                openedAt: new Date(sessionData.opened_at),
                initialAmount: sessionData.initial_amount,
                status: sessionData.status,
                operatorName: sessionData.operator_name
            };
            dispatchLocal({ type: 'REALTIME_UPDATE_CASH_SESSION', session: activeSession });

            const { data: moveData } = await supabase.from('cash_movements').select('*').eq('session_id', activeSession.id);
            if (moveData) {
                const movements = moveData.map((m: any) => ({
                    id: m.id,
                    sessionId: m.session_id,
                    type: m.type,
                    amount: m.amount,
                    reason: m.reason,
                    timestamp: new Date(m.created_at),
                    userName: m.user_name
                }));
                dispatchLocal({ type: 'REALTIME_UPDATE_CASH_MOVEMENTS', movements });
            }
        } else {
            dispatchLocal({ type: 'REALTIME_UPDATE_CASH_SESSION', session: null });
            dispatchLocal({ type: 'REALTIME_UPDATE_CASH_MOVEMENTS', movements: [] });
        }
    };

    // Helper: Products
    const fetchProducts = async () => {
        const { data } = await supabase.from('products').select('*').eq('tenant_id', tenantId);
        if (data) {
             const mapped: Product[] = data.map(p => ({
                id: p.id,
                linkedInventoryItemId: p.linked_inventory_item_id, 
                name: p.name, description: p.description, price: p.price, costPrice: p.cost_price || 0,
                category: p.category, type: p.type, image: p.image, isVisible: p.is_visible, sortOrder: p.sort_order
            }));
            dispatchLocal({ type: 'REALTIME_UPDATE_PRODUCTS', products: mapped });
        }
    }

    // Helper: Tables
    const fetchTables = async () => {
        const { data } = await supabase.from('restaurant_tables').select('*').eq('tenant_id', tenantId).order('number');
        if (data) {
            const mapped = data.map(t => ({ id: t.id, number: t.number, status: t.status, customerName: t.customer_name || '', accessCode: t.access_code || '' }));
            dispatchLocal({ type: 'REALTIME_UPDATE_TABLES', tables: mapped });
        }
    }

    // Helper: Orders
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

    // Helper: Service Calls
    const fetchServiceCalls = async () => {
        const { data } = await supabase.from('service_calls').select('*').eq('tenant_id', tenantId).eq('status', 'PENDING');
        if (data) {
            const mapped = data.map(c => ({ id: c.id, tableId: c.table_id, status: c.status, timestamp: new Date(c.created_at) }));
            dispatchLocal({ type: 'REALTIME_UPDATE_SERVICE_CALLS', calls: mapped });
        }
    }

    const channel = supabase.channel(`restaurant_updates:${tenantId}`)
        // Inventory Updates
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items', filter: `tenant_id=eq.${tenantId}` }, fetchInventory)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_logs', filter: `tenant_id=eq.${tenantId}` }, fetchLogs)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers', filter: `tenant_id=eq.${tenantId}` }, fetchSuppliers)
        // Cashier Updates
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_sessions', filter: `tenant_id=eq.${tenantId}` }, fetchCashData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_movements', filter: `tenant_id=eq.${tenantId}` }, fetchCashData)
        // Main Core Updates (Added)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `tenant_id=eq.${tenantId}` }, fetchProducts)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables', filter: `tenant_id=eq.${tenantId}` }, fetchTables)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenantId}` }, fetchOrders)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `tenant_id=eq.${tenantId}` }, fetchOrders)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'service_calls', filter: `tenant_id=eq.${tenantId}` }, fetchServiceCalls)
        .subscribe();

    return () => { supabase.removeChannel(channel); }
  }, [state.tenantId]);


  const dispatch = async (action: Action) => {
    const { tenantId, planLimits } = state;

    // --- CASHIER ACTIONS ---
    if (action.type === 'OPEN_CASH_REGISTER' && tenantId) {
        if (state.activeCashSession) {
            showAlert({ title: "Erro", message: "Já existe um caixa aberto.", type: 'ERROR' });
            return;
        }
        await supabase.from('cash_sessions').insert({
            tenant_id: tenantId,
            initial_amount: action.initialAmount,
            status: 'OPEN',
            operator_name: state.currentUser?.name || 'Staff'
        });
        logAudit(tenantId, 'OPEN_CASH', `Caixa aberto com R$ ${action.initialAmount}`);
        return;
    }

    if (action.type === 'CASH_BLEED' && tenantId) {
        if (!state.activeCashSession) return;
        await supabase.from('cash_movements').insert({
            tenant_id: tenantId,
            session_id: state.activeCashSession.id,
            type: 'BLEED', // Sangria
            amount: action.amount,
            reason: action.reason,
            user_name: state.currentUser?.name
        });
        logAudit(tenantId, 'CASH_BLEED', `Sangria de R$ ${action.amount}: ${action.reason}`);
        return;
    }

    if (action.type === 'CLOSE_CASH_REGISTER' && tenantId) {
        if (!state.activeCashSession) return;
        
        await supabase.from('cash_sessions').update({
            status: 'CLOSED',
            final_amount: action.finalAmount,
            closed_at: new Date().toISOString()
        }).eq('id', state.activeCashSession.id);
        
        logAudit(tenantId, 'CLOSE_CASH', `Caixa fechado. Conferido: R$ ${action.finalAmount}`);
        return;
    }

    // --- ERP HANDLERS ---
    if (action.type === 'ADD_INVENTORY_ITEM' && tenantId) {
        // 1. Create the Item with IMAGE
        const { data: newItem, error } = await supabase.from('inventory_items').insert({
            tenant_id: tenantId,
            name: action.item.name,
            unit: action.item.unit,
            quantity: action.item.quantity,
            min_quantity: action.item.minQuantity,
            cost_price: action.item.costPrice,
            type: action.item.type,
            image: action.item.image // Save Image
        }).select().single();

        if (newItem && !error) {
            // 2. If Composite, Add Recipe
            if (action.item.type === 'COMPOSITE' && action.item.recipe) {
                const recipes = action.item.recipe.map(r => ({
                    tenant_id: tenantId,
                    parent_item_id: newItem.id,
                    ingredient_item_id: r.ingredientId,
                    quantity: r.quantity
                }));
                await supabase.from('inventory_recipes').insert(recipes);
            }
            
            // 3. OPTIMISTIC UPDATE (Atualiza a tela imediatamente)
            const newItemState: InventoryItem = {
                id: newItem.id,
                name: newItem.name,
                unit: newItem.unit,
                quantity: newItem.quantity,
                minQuantity: newItem.min_quantity,
                costPrice: newItem.cost_price,
                type: newItem.type,
                image: newItem.image,
                recipe: action.item.recipe || []
            };
            dispatchLocal({ type: 'REALTIME_UPDATE_INVENTORY', inventory: [...state.inventory, newItemState] });

            logAudit(tenantId, 'ADD_STOCK_ITEM', `Item ${action.item.name} (${action.item.type}) cadastrado`);
        }
        return;
    }

    if (action.type === 'UPDATE_INVENTORY_ITEM' && tenantId) {
        // 1. Update basic fields
        await supabase.from('inventory_items').update({
            name: action.item.name,
            unit: action.item.unit,
            min_quantity: action.item.minQuantity,
            cost_price: action.item.costPrice, // Allow manual cost update
            image: action.item.image,
            type: action.item.type
        }).eq('id', action.item.id);

        // 2. If composite, update recipes (full replace for simplicity)
        if (action.item.type === 'COMPOSITE' && action.item.recipe) {
            // Delete old recipes
            await supabase.from('inventory_recipes').delete().eq('parent_item_id', action.item.id);
            // Insert new recipes
            const recipes = action.item.recipe.map(r => ({
                tenant_id: tenantId,
                parent_item_id: action.item.id,
                ingredient_item_id: r.ingredientId,
                quantity: r.quantity
            }));
            await supabase.from('inventory_recipes').insert(recipes);
        }
        
        // 3. Optimistic update
        const updatedInventory = state.inventory.map(i => i.id === action.item.id ? action.item : i);
        dispatchLocal({ type: 'REALTIME_UPDATE_INVENTORY', inventory: updatedInventory });
        
        logAudit(tenantId, 'UPDATE_STOCK_ITEM', `Item ${action.item.name} atualizado`);
        return;
    }

    if (action.type === 'PROCESS_PURCHASE' && tenantId) {
        try {
            const { supplierId, invoiceNumber, items, totalAmount, installments, taxAmount, distributeTax } = action.purchase;
            const supplier = state.suppliers.find(s => s.id === supplierId);

            // 1. Create Expenses (Installments)
            for (const [index, inst] of installments.entries()) {
                await supabase.from('expenses').insert({
                    tenant_id: tenantId,
                    description: `NF #${invoiceNumber} (${index + 1}/${installments.length}) - ${supplier?.name}`,
                    amount: inst.amount,
                    category: 'Fornecedor',
                    due_date: inst.dueDate.toISOString().split('T')[0],
                    is_paid: false,
                    supplier_id: supplierId
                });
            }

            // 2. Update Inventory (Qty & Cost Price) & Logs
            const totalItemsValue = items.reduce((acc, i) => acc + i.totalPrice, 0);
            
            // Clone inventory for optimistic update
            let updatedInventory = [...state.inventory];

            for (const item of items) {
                const currentItem = state.inventory.find(i => i.id === item.inventoryItemId);
                if (currentItem) {
                    const currentQty = Number(currentItem.quantity);
                    const currentCost = Number(currentItem.costPrice);
                    const incomingQty = Number(item.quantity);
                    
                    // Base cost (from invoice unit price)
                    let incomingTotalCost = item.totalPrice; 

                    // Distribute tax proportionally if enabled
                    if (distributeTax && totalItemsValue > 0 && taxAmount > 0) {
                        const itemShareRatio = item.totalPrice / totalItemsValue;
                        const taxShare = taxAmount * itemShareRatio;
                        incomingTotalCost += taxShare;
                    }
                    
                    // Effective Unit Cost for incoming batch
                    const incomingUnitCost = incomingTotalCost / incomingQty;

                    // Weighted Average Cost Calculation
                    // Formula: ((OldQty * OldCost) + (NewQty * NewCost)) / (OldQty + NewQty)
                    let newWeightedCost = incomingUnitCost;
                    if (currentQty > 0) {
                        const oldTotalValue = currentQty * currentCost;
                        const newTotalValue = oldTotalValue + incomingTotalCost;
                        newWeightedCost = newTotalValue / (currentQty + incomingQty);
                    }

                    const newQty = currentQty + incomingQty;

                    // DB Update
                    await supabase.from('inventory_items').update({
                        quantity: newQty,
                        cost_price: newWeightedCost
                    }).eq('id', item.inventoryItemId);

                    // Sync Product Cost if linked
                    await supabase.from('products').update({
                        cost_price: newWeightedCost
                    }).eq('linked_inventory_item_id', item.inventoryItemId);

                    // Log
                    await supabase.from('inventory_logs').insert({
                        tenant_id: tenantId,
                        item_id: item.inventoryItemId,
                        type: 'IN',
                        quantity: incomingQty,
                        reason: `Compra NF #${invoiceNumber}`,
                        user_name: state.currentUser?.name
                    });

                    // Optimistic update for this item
                    updatedInventory = updatedInventory.map(i => 
                        i.id === item.inventoryItemId 
                        ? { ...i, quantity: newQty, costPrice: newWeightedCost } 
                        : i
                    );
                }
            }
            
            // Dispatch optimistic update
            dispatchLocal({ type: 'REALTIME_UPDATE_INVENTORY', inventory: updatedInventory });
            logAudit(tenantId, 'PURCHASE_ENTRY', `Entrada de Nota #${invoiceNumber} processada.`);
        } catch (err) {
            console.error("Erro ao processar compra:", err);
        }
        return;
    }

    if (action.type === 'PROCESS_INVENTORY_ADJUSTMENT' && tenantId) {
        try {
            let updatedInventory = [...state.inventory];
            for (const adj of action.adjustments) {
                const item = state.inventory.find(i => i.id === adj.itemId);
                if (item) {
                    const currentQty = item.quantity;
                    const diff = adj.realQty - currentQty;

                    if (diff !== 0) {
                        await supabase.from('inventory_items').update({ quantity: adj.realQty }).eq('id', adj.itemId);
                        await supabase.from('inventory_logs').insert({
                            tenant_id: tenantId,
                            item_id: adj.itemId,
                            type: diff > 0 ? 'IN' : 'OUT', // Positive diff means we found more (IN), Negative means loss (OUT)
                            quantity: Math.abs(diff),
                            reason: `Inventário: Ajuste ${diff > 0 ? 'Sobra' : 'Perda'}`,
                            user_name: state.currentUser?.name
                        });
                        
                        // Optimistic
                        updatedInventory = updatedInventory.map(i => i.id === adj.itemId ? { ...i, quantity: adj.realQty } : i);
                    }
                }
            }
            dispatchLocal({ type: 'REALTIME_UPDATE_INVENTORY', inventory: updatedInventory });
            logAudit(tenantId, 'INVENTORY_ADJUSTMENT', `Inventário realizado por ${state.currentUser?.name}`);
        } catch (e) { console.error(e); }
        return;
    }

    if (action.type === 'UPDATE_STOCK' && tenantId) {
        const item = state.inventory.find(i => i.id === action.itemId);
        if(item) {
            const newQty = action.operation === 'IN' ? Number(item.quantity) + Number(action.quantity) : Number(item.quantity) - Number(action.quantity);
            await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', action.itemId);
            await supabase.from('inventory_logs').insert({ tenant_id: tenantId, item_id: action.itemId, type: action.operation, quantity: action.quantity, reason: action.reason, user_name: state.currentUser?.name });
            
            // OPTIMISTIC UPDATE
            const updatedInventory = state.inventory.map(i => i.id === action.itemId ? { ...i, quantity: newQty } : i);
            dispatchLocal({ type: 'REALTIME_UPDATE_INVENTORY', inventory: updatedInventory });
        }
        return;
    }

    if (action.type === 'ADD_SUPPLIER' && tenantId) {
        await supabase.from('suppliers').insert({
            tenant_id: tenantId,
            name: action.supplier.name,
            contact_name: action.supplier.contactName,
            phone: action.supplier.phone,
            // New Fiscal Fields
            cnpj: action.supplier.cnpj,
            ie: action.supplier.ie,
            email: action.supplier.email,
            cep: action.supplier.cep,
            address: action.supplier.address,
            number: action.supplier.number,
            complement: action.supplier.complement,
            city: action.supplier.city,
            state: action.supplier.state
        });
        return;
    }

    if (action.type === 'DELETE_SUPPLIER' && tenantId) {
        await supabase.from('suppliers').delete().eq('id', action.supplierId);
        // O realtime cuidará da atualização da lista
        return;
    }

    // ... (Existing Logic for Products, Orders, Payments - Kept mostly same but ensuring they work) ...
    if (action.type === 'ADD_PRODUCT_TO_MENU' && tenantId) {
        if (planLimits.maxProducts !== -1 && state.products.length >= planLimits.maxProducts) {
            showAlert({ title: "Limite Atingido", message: "Faça upgrade para adicionar mais produtos.", type: 'WARNING' });
            return;
        }
        
        const price = isNaN(Number(action.product.price)) ? 0 : Number(action.product.price);
        const costPrice = isNaN(Number(action.product.costPrice)) ? 0 : Number(action.product.costPrice);

        await supabase.from('products').insert({
            tenant_id: tenantId,
            linked_inventory_item_id: action.product.linkedInventoryItemId,
            name: action.product.name || 'Novo Produto',
            description: action.product.description || '',
            price: price,
            cost_price: costPrice,
            category: action.product.category || 'Outros',
            type: action.product.type || 'KITCHEN',
            image: action.product.image || '',
            is_visible: action.product.isVisible !== false,
            sort_order: action.product.sortOrder || 0
        });
        return;
    }

    if (action.type === 'UPDATE_PRODUCT' && tenantId) {
        const price = isNaN(Number(action.product.price)) ? 0 : Number(action.product.price);
        
        await supabase.from('products').update({
            name: action.product.name,
            description: action.product.description || '',
            price: price,
            category: action.product.category,
            type: action.product.type,
            image: action.product.image || '',
            is_visible: action.product.isVisible,
            sort_order: action.product.sortOrder
        }).eq('id', action.product.id);
        return;
    }

    if (action.type === 'PROCESS_POS_SALE' && tenantId) {
        if (!state.activeCashSession) {
            showAlert({ title: "Caixa Fechado", message: "Abra o caixa antes de realizar vendas.", type: 'ERROR' });
            return;
        }

        const { data: orderData, error } = await supabase.from('orders').insert({
            tenant_id: tenantId,
            table_id: null,
            status: 'DELIVERED',
            is_paid: true
        }).select().single();

        if (orderData && !error) {
            const itemsToInsert = action.sale.items.map(item => {
                const product = state.products.find(p => p.id === item.productId);
                return {
                    tenant_id: tenantId,
                    order_id: orderData.id,
                    product_id: item.productId,
                    product_name: product?.name || 'Unknown',
                    product_price: product?.price || 0,
                    product_type: product?.type || 'KITCHEN',
                    quantity: item.quantity,
                    notes: item.notes,
                    status: 'DELIVERED'
                };
            });
            await supabase.from('order_items').insert(itemsToInsert);

            const itemsSummary = action.sale.items.map(i => `${i.quantity}x ${state.products.find(p => p.id === i.productId)?.name}`).join(', ');
            await supabase.from('transactions').insert({
                tenant_id: tenantId,
                table_number: 0,
                table_id: null,
                amount: action.sale.totalAmount,
                method: action.sale.method,
                items_summary: `PDV: ${itemsSummary}`,
                cashier_name: state.currentUser?.name || 'Caixa'
            });

            // Update Inventory based on sales
            let updatedInventory = [...state.inventory];
            for (const item of action.sale.items) {
                const product = state.products.find(p => p.id === item.productId);
                if (!product || !product.linkedInventoryItemId) continue;

                const invItem = state.inventory.find(i => i.id === product.linkedInventoryItemId);
                if (!invItem) continue;

                if (invItem.type === 'RESALE') {
                    const newQty = Number(invItem.quantity) - Number(item.quantity);
                    await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', invItem.id);
                    await supabase.from('inventory_logs').insert({
                        tenant_id: tenantId,
                        item_id: invItem.id,
                        type: 'SALE',
                        quantity: item.quantity,
                        reason: `Venda PDV #${orderData.id.slice(0,4)}`,
                        user_name: state.currentUser?.name
                    });
                    updatedInventory = updatedInventory.map(i => i.id === invItem.id ? { ...i, quantity: newQty } : i);
                } else if (invItem.type === 'COMPOSITE' && invItem.recipe) {
                    for (const recipeItem of invItem.recipe) {
                        const ingredient = state.inventory.find(i => i.id === recipeItem.ingredientId);
                        if(ingredient) {
                            const totalNeeded = Number(recipeItem.quantity) * Number(item.quantity);
                            const newQty = Number(ingredient.quantity) - totalNeeded;
                            await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', ingredient.id);
                            await supabase.from('inventory_logs').insert({
                                tenant_id: tenantId,
                                item_id: ingredient.id,
                                type: 'SALE',
                                quantity: totalNeeded,
                                reason: `Venda PDV ${product.name}`,
                                user_name: state.currentUser?.name
                            });
                            updatedInventory = updatedInventory.map(i => i.id === ingredient.id ? { ...i, quantity: newQty } : i);
                        }
                    }
                }
            }
            dispatchLocal({ type: 'REALTIME_UPDATE_INVENTORY', inventory: updatedInventory });
        }
        return;
    }

    if (action.type === 'PLACE_ORDER' && tenantId) {
        const { data: orderData, error } = await supabase.from('orders').insert({
            tenant_id: tenantId,
            table_id: action.tableId,
            status: 'PENDING',
            is_paid: false
        }).select().single();

        if (orderData && !error) {
            const itemsToInsert = action.items.map(item => {
                const product = state.products.find(p => p.id === item.productId);
                return {
                    tenant_id: tenantId,
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

            // Deduct Inventory
            let updatedInventory = [...state.inventory];
            for (const item of action.items) {
                const product = state.products.find(p => p.id === item.productId);
                if (!product || !product.linkedInventoryItemId) continue;

                const invItem = state.inventory.find(i => i.id === product.linkedInventoryItemId);
                if (!invItem) continue;

                if (invItem.type === 'RESALE') {
                    const newQty = Number(invItem.quantity) - Number(item.quantity);
                    await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', invItem.id);
                    await supabase.from('inventory_logs').insert({
                        tenant_id: tenantId,
                        item_id: invItem.id,
                        type: 'SALE',
                        quantity: item.quantity,
                        reason: `Venda Pedido #${orderData.id.slice(0,4)}`,
                        user_name: 'Sistema'
                    });
                    updatedInventory = updatedInventory.map(i => i.id === invItem.id ? { ...i, quantity: newQty } : i);
                } else if (invItem.type === 'COMPOSITE' && invItem.recipe) {
                    for (const recipeItem of invItem.recipe) {
                        const ingredient = state.inventory.find(i => i.id === recipeItem.ingredientId);
                        if(ingredient) {
                            const totalNeeded = Number(recipeItem.quantity) * Number(item.quantity);
                            const newQty = Number(ingredient.quantity) - totalNeeded;
                            await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', ingredient.id);
                            await supabase.from('inventory_logs').insert({
                                tenant_id: tenantId,
                                item_id: ingredient.id,
                                type: 'SALE',
                                quantity: totalNeeded,
                                reason: `Venda ${product.name} (Comp)`,
                                user_name: 'Sistema'
                            });
                            updatedInventory = updatedInventory.map(i => i.id === ingredient.id ? { ...i, quantity: newQty } : i);
                        }
                    }
                }
            }
            dispatchLocal({ type: 'REALTIME_UPDATE_INVENTORY', inventory: updatedInventory });
        }
    }

    if (action.type === 'PROCESS_PAYMENT') {
        if (!state.activeCashSession) {
            showAlert({ title: "Caixa Fechado", message: "Abra o caixa antes de receber pagamentos.", type: 'ERROR' });
            return;
        }
        dispatchLocal(action);
    }

    // --- OTHER ACTIONS HANDLERS ---
    if (action.type === 'ADD_TABLE' && tenantId) {
        const nextNumber = state.tables.length > 0 ? Math.max(...state.tables.map(t => t.number)) + 1 : 1;
        await supabase.from('restaurant_tables').insert({
            tenant_id: tenantId,
            number: nextNumber,
            status: 'AVAILABLE'
        });
        return;
    }

    if (action.type === 'DELETE_TABLE' && tenantId) {
        await supabase.from('restaurant_tables').delete().eq('id', action.tableId);
        return;
    }

    if (action.type === 'ADD_USER' && tenantId) {
        await supabase.from('staff').insert({
            tenant_id: tenantId,
            name: action.user.name,
            role: action.user.role,
            pin: action.user.pin,
            email: action.user.email,
            allowed_routes: action.user.allowedRoutes
        });
        return;
    }

    if (action.type === 'UPDATE_USER' && tenantId) {
        await supabase.from('staff').update({
            name: action.user.name,
            role: action.user.role,
            pin: action.user.pin,
            email: action.user.email,
            allowed_routes: action.user.allowedRoutes
        }).eq('id', action.user.id);
        return;
    }

    if (action.type === 'DELETE_USER' && tenantId) {
        await supabase.from('staff').delete().eq('id', action.userId);
        return;
    }

    if (action.type === 'UPDATE_THEME' && tenantId) {
        await supabase.from('tenants').update({
            theme_config: action.theme
        }).eq('id', tenantId);
        dispatchLocal({ type: 'UPDATE_THEME', theme: action.theme });
        return;
    }

    if (action.type === 'ADD_EXPENSE' && tenantId) {
        await supabase.from('expenses').insert({
            tenant_id: tenantId,
            description: action.expense.description,
            amount: action.expense.amount,
            category: action.expense.category,
            due_date: action.expense.dueDate,
            is_paid: action.expense.isPaid,
            supplier_id: action.expense.supplierId
        });
        return;
    }
    
    if (action.type === 'PAY_EXPENSE' && tenantId) {
        await supabase.from('expenses').update({
            is_paid: true,
            paid_date: new Date().toISOString()
        }).eq('id', action.expenseId);
        return;
    }

    if (action.type === 'DELETE_EXPENSE' && tenantId) {
        await supabase.from('expenses').delete().eq('id', action.expenseId);
        return;
    }

    switch (action.type) {
        case 'DELETE_PRODUCT': if (tenantId) await supabase.from('products').delete().eq('id', action.productId); break;
        default: dispatchLocal(action);
    }
  };

  return (
    <RestaurantContext.Provider value={{ state, dispatch }}>
      {children}
    </RestaurantContext.Provider>
  );
};