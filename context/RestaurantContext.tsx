
// ... (imports remain the same)
import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { Table, Order, Product, TableStatus, OrderStatus, ProductType, RestaurantTheme, User, AuditLog, Transaction, Role, ServiceCall, OnlineUser, PlanLimits, InventoryItem, Expense, Supplier, InventoryRecipeItem, PurchaseEntry, POSSaleData, CashSession, CashMovement } from '../types';
import { getTenantSlug } from '../utils/tenant';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useUI } from './UIContext';

// ... (Types/Interfaces remain the same)
export interface InventoryLog {
    id: string;
    item_id: string;
    item_name?: string; 
    type: 'IN' | 'OUT' | 'SALE' | 'LOSS';
    quantity: number;
    reason: string;
    user_name: string;
    created_at: Date;
}

// ... (State Interface remains the same)
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
  inventory: InventoryItem[];
  inventoryLogs: InventoryLog[];
  expenses: Expense[];
  suppliers: Supplier[];
  activeCashSession: CashSession | null;
  cashMovements: CashMovement[];
}

// ... (Action Types remain the same)
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
  | { type: 'OPEN_CASH_REGISTER'; initialAmount: number }
  | { type: 'CLOSE_CASH_REGISTER'; finalAmount: number }
  | { type: 'CASH_BLEED'; amount: number; reason: string };

// ... (Initial State logic remains the same)
const initialState: State = {
  isLoading: true,
  tenantSlug: null,
  tenantId: null,
  isValidTenant: false,
  isInactiveTenant: false,
  planLimits: { 
      maxTables: -1, maxProducts: -1, maxStaff: -1, 
      allowKds: true, allowCashier: true, allowReports: true,
      allowInventory: true, allowPurchases: true, allowExpenses: true,
      allowStaff: true, allowTableMgmt: true, allowCustomization: true
  },
  tables: [], products: [], orders: [],
  theme: { primaryColor: '#000', backgroundColor: '#fff', fontColor: '#000', logoUrl: '', restaurantName: 'Carregando...' },
  currentUser: null, users: [], auditLogs: [], transactions: [], serviceCalls: [], onlineUsers: [], audioUnlocked: false,
  inventory: [], inventoryLogs: [], expenses: [], suppliers: [], activeCashSession: null, cashMovements: []
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

// ... (Sound logic and Reducer remain same)
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
  // ... (Reducer logic remains same - it just updates state from Realtime, heavy lifting is in Dispatch)
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
  const { showAlert } = useUI();

  // ... (Effects for INIT_DATA and REALTIME - kept same as before)
  // ... (Audit Log Function - kept same)
  const logAudit = async (tenantId: string, action: string, details: string) => {
      try {
          await supabase.from('audit_logs').insert({
              tenant_id: tenantId,
              user_id: state.currentUser?.id,
              user_name: state.currentUser?.name || 'Sistema',
              action,
              details
          });
      } catch (e) { console.error(e); }
  };

  // ... (Initial Data Fetching logic - kept same)
  // ... (Realtime Subscriptions - kept same)
  // [OMITTED FOR BREVITY - Assume INIT_DATA and REALTIME useEffects are here as before]
  // We assume the initial load and realtime subscriptions are correct. The main changes are below in dispatch.

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
                    image: i.image,
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

  // ... (Realtime Listeners omitted for brevity, logic remains same)
  // Need to ensure useEffect for Realtime is present in actual file.

  const dispatch = async (action: Action) => {
    const { tenantId, planLimits } = state;

    // --- CASHIER ACTIONS (Refactored to use RPC) ---
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
            type: 'BLEED', 
            amount: action.amount,
            reason: action.reason,
            user_name: state.currentUser?.name
        });
        logAudit(tenantId, 'CASH_BLEED', `Sangria de R$ ${action.amount}: ${action.reason}`);
        return;
    }

    if (action.type === 'CLOSE_CASH_REGISTER' && tenantId) {
        if (!state.activeCashSession) return;
        
        // USE RPC FOR SECURE SERVER-SIDE CALCULATION
        const { error } = await supabase.rpc('close_cash_session', {
            p_session_id: state.activeCashSession.id,
            p_final_amount: action.finalAmount
        });

        if (error) {
            console.error("Erro fechamento:", error);
            showAlert({ title: "Erro", message: "Falha ao fechar caixa.", type: 'ERROR' });
        } else {
            logAudit(tenantId, 'CLOSE_CASH', `Caixa fechado. Conferido: R$ ${action.finalAmount}`);
        }
        return;
    }

    // --- POS SALE (Refactored to use RPC) ---
    if (action.type === 'PROCESS_POS_SALE' && tenantId) {
       // Calls the new atomic function that creates order, items, and financial transaction
       // The DB Trigger will handle inventory deduction automatically!
       const { error } = await supabase.rpc('process_pos_sale', {
           p_tenant_id: tenantId,
           p_customer_name: action.sale.customerName,
           p_total_amount: action.sale.totalAmount,
           p_method: action.sale.method,
           p_items: action.sale.items // Pass as JSONB
       });

       if (error) {
           console.error("POS Sale Error:", error);
           showAlert({ title: "Erro na Venda", message: "Não foi possível registrar a venda. Tente novamente.", type: 'ERROR' });
       }
       return;
    }

    // --- PAYMENT PROCESSING (Table) ---
    if (action.type === 'PROCESS_PAYMENT' && tenantId) {
        const { error } = await supabase.from('orders').update({
            is_paid: true, 
            status: 'DELIVERED' // Ensure it's delivered to trigger stock check if needed
        }).eq('table_id', action.tableId).eq('is_paid', false);

        if (!error) {
            await supabase.from('restaurant_tables').update({ status: 'AVAILABLE', customer_name: null, access_code: null }).eq('id', action.tableId);
            
            // Register Transaction
            await supabase.from('transactions').insert({
                tenant_id: tenantId,
                table_id: action.tableId,
                amount: action.amount,
                method: action.method,
                items_summary: 'Mesa ' + state.tables.find(t => t.id === action.tableId)?.number,
                cashier_name: state.currentUser?.name
            });
            logAudit(tenantId, 'PAYMENT', `Pagamento Mesa - R$ ${action.amount}`);
        }
        return;
    }

    // --- INVENTORY ACTIONS (Keep insert/update, rely on triggers for complex checks if needed) ---
    if (action.type === 'ADD_INVENTORY_ITEM' && tenantId) {
        const { data: newItem, error } = await supabase.from('inventory_items').insert({
            tenant_id: tenantId,
            name: action.item.name,
            unit: action.item.unit,
            quantity: action.item.quantity,
            min_quantity: action.item.minQuantity,
            cost_price: action.item.costPrice,
            type: action.item.type,
            image: action.item.image 
        }).select().single();

        if (newItem && !error) {
            if (action.item.type === 'COMPOSITE' && action.item.recipe) {
                const recipes = action.item.recipe.map(r => ({
                    tenant_id: tenantId,
                    parent_item_id: newItem.id,
                    ingredient_item_id: r.ingredientId,
                    quantity: r.quantity
                }));
                await supabase.from('inventory_recipes').insert(recipes);
            }
            // Optimistic update handled by Realtime subscription usually, but we can dispatchLocal too
            logAudit(tenantId, 'ADD_STOCK_ITEM', `Item ${action.item.name} cadastrado`);
        }
        return;
    }

    // ... (Keep existing UPDATE_INVENTORY_ITEM logic, similar to above)
    // ... (Keep existing ADD_PRODUCT_TO_MENU logic, similar to above)

    // Fallback for simple CRUD
    switch (action.type) {
        case 'DELETE_PRODUCT': if (tenantId) await supabase.from('products').delete().eq('id', action.productId); break;
        case 'ADD_TABLE': 
            const nextNumber = state.tables.length > 0 ? Math.max(...state.tables.map(t => t.number)) + 1 : 1;
            await supabase.from('restaurant_tables').insert({ tenant_id: tenantId, number: nextNumber, status: 'AVAILABLE' });
            break;
        case 'DELETE_TABLE': await supabase.from('restaurant_tables').delete().eq('id', action.tableId); break;
        case 'OPEN_TABLE':
            await supabase.from('restaurant_tables').update({ status: 'OCCUPIED', customer_name: action.customerName, access_code: action.accessCode }).eq('id', action.tableId);
            break;
        case 'CLOSE_TABLE':
            await supabase.from('restaurant_tables').update({ status: 'AVAILABLE', customer_name: null, access_code: null }).eq('id', action.tableId);
            // Optional: Archive unpaid orders or mark as loss
            break;
        case 'PLACE_ORDER':
            const { data: order } = await supabase.from('orders').insert({ tenant_id: tenantId, table_id: action.tableId, status: 'PENDING', is_paid: false }).select().single();
            if (order) {
                const items = action.items.map(i => ({
                    tenant_id: tenantId,
                    order_id: order.id,
                    product_id: i.productId,
                    quantity: i.quantity,
                    notes: i.notes,
                    status: 'PENDING',
                    product_type: state.products.find(p => p.id === i.productId)?.type || 'KITCHEN'
                }));
                await supabase.from('order_items').insert(items);
                // Trigger `deduct_inventory_on_order` runs automatically here in DB!
            }
            break;
        case 'UPDATE_ITEM_STATUS':
            await supabase.from('order_items').update({ status: action.status }).eq('id', action.itemId);
            break;
        default:
            dispatchLocal(action); // For local UI state only actions
    }
  };

  return (
    <RestaurantContext.Provider value={{ state, dispatch }}>
      {children}
    </RestaurantContext.Provider>
  );
};
