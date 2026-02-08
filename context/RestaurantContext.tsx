import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { Table, Order, Product, TableStatus, OrderStatus, ProductType, RestaurantTheme, User, AuditLog, Transaction, Role, ServiceCall, OnlineUser, PlanLimits, InventoryItem, Expense, Supplier, InventoryRecipeItem, PurchaseEntry } from '../types';
import { getTenantSlug } from '../utils/tenant';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useUI } from './UIContext';

// --- Types ---
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
  expenses: Expense[];
  suppliers: Supplier[];
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
  | { type: 'REALTIME_UPDATE_EXPENSES'; expenses: Expense[] }
  | { type: 'REALTIME_UPDATE_SUPPLIERS'; suppliers: Supplier[] } // NEW
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
  | { type: 'CALL_WAITER'; tableId: string }
  | { type: 'RESOLVE_WAITER_CALL'; callId: string }
  | { type: 'PLAY_SOUND'; soundType: 'KITCHEN' | 'WAITER' }
  // ERP ACTIONS
  | { type: 'ADD_INVENTORY_ITEM'; item: InventoryItem }
  | { type: 'UPDATE_STOCK'; itemId: string; quantity: number; reason: string; operation: 'IN' | 'OUT' }
  | { type: 'PROCESS_PURCHASE'; purchase: PurchaseEntry } // NEW: Entrada de Nota Completa
  | { type: 'ADD_SUPPLIER'; supplier: Supplier } // NEW
  | { type: 'DELETE_SUPPLIER'; supplierId: string } // NEW
  | { type: 'ADD_EXPENSE'; expense: Expense }
  | { type: 'PAY_EXPENSE'; expenseId: string }
  | { type: 'DELETE_EXPENSE'; expenseId: string };

const initialState: State = {
  isLoading: true,
  tenantSlug: null,
  tenantId: null,
  isValidTenant: false,
  isInactiveTenant: false,
  planLimits: { maxTables: -1, maxProducts: -1, maxStaff: -1, allowKds: true, allowCashier: true },
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
  expenses: [],
  suppliers: []
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
    case 'REALTIME_UPDATE_EXPENSES': return { ...state, expenses: action.expenses };
    case 'REALTIME_UPDATE_SUPPLIERS': return { ...state, suppliers: action.suppliers };
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
            if (planData?.limits) currentLimits = planData.limits;

            const yesterday = new Date(); yesterday.setHours(yesterday.getHours() - 24);

            const [
                usersRes, productsRes, tablesRes, ordersRes, transactionsRes, auditRes, callsRes,
                invRes, expRes, suppRes, invRecipesRes
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
                supabase.from('inventory_recipes').select('*').eq('tenant_id', tenant.id)
            ]);

            const mappedUsers = (usersRes.data || []).map(u => ({ id: u.id, name: u.name, role: u.role, pin: u.pin, auth_user_id: u.auth_user_id, email: u.email, allowedRoutes: u.allowed_routes || [] }));
            
            // Build Inventory with Recipes
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
                    recipe: recipeItems
                };
            });

            // Map Products (Menu)
            const mappedProducts: Product[] = (productsRes.data || []).map(p => ({
                id: p.id,
                linkedInventoryItemId: p.linked_inventory_item_id, // Link Vital
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
            const mappedSuppliers = (suppRes.data || []).map(s => ({ id: s.id, name: s.name, contactName: s.contact_name, phone: s.phone }));

            // Auto Login Check
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
                    expenses: mappedExpenses, suppliers: mappedSuppliers
                }
            });
        } catch (error) { dispatchLocal({ type: 'TENANT_NOT_FOUND' }); }
    };
    initTenant();
  }, []);

  // ... (Presence and Auth Effects omitted for brevity, same as before) ...
  // 2. Presence Logic
  useEffect(() => {
      if (!state.tenantId || !state.currentUser) {
          if (presenceChannel) {
              presenceChannel.unsubscribe();
              setPresenceChannel(null);
          }
          return;
      }

      const channel = supabase.channel(`presence:${state.tenantId}`, {
          config: { presence: { key: state.currentUser.id } },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
            const newState = channel.presenceState();
            const users: OnlineUser[] = [];
            Object.keys(newState).forEach(key => {
                const presence = newState[key][0];
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
      return () => { channel.unsubscribe(); };
  }, [state.tenantId, state.currentUser?.id]);

  // 3. Auth Listener
  useEffect(() => {
    if (!state.tenantId) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
        if (event === 'SIGNED_IN' && session?.user) {
            const authenticatedStaff = state.users.find(u => u.auth_user_id === session.user.id);
            if (authenticatedStaff) {
                dispatchLocal({ type: 'LOGIN', user: authenticatedStaff });
            } else {
                 const { data: staffData } = await supabase.from('staff').select('*').eq('auth_user_id', session.user.id).eq('tenant_id', state.tenantId).maybeSingle();
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

    return () => { subscription.unsubscribe(); };
  }, [state.tenantId, state.users]); 

  // 4. REALTIME SUBSCRIPTION
  useEffect(() => {
    if (!state.tenantId) return;
    const tenantId = state.tenantId;

    const fetchOrders = async () => {
        const yesterday = new Date(); yesterday.setHours(yesterday.getHours() - 24);
        const { data } = await supabase.from('orders').select(`*, items:order_items (*)`).eq('tenant_id', tenantId).gte('created_at', yesterday.toISOString());
        if (data) {
             const mappedOrders = data.map((o: any) => ({
                id: o.id, tableId: o.table_id, timestamp: new Date(o.created_at), isPaid: o.is_paid,
                items: (o.items || []).map((i: any) => ({ id: i.id, productId: i.product_id, quantity: i.quantity, notes: i.notes, status: i.status, productName: i.product_name, productType: i.product_type }))
            }));
            dispatchLocal({ type: 'REALTIME_UPDATE_ORDERS', orders: mappedOrders });
        }
    };

    const fetchProducts = async () => {
         const { data } = await supabase.from('products').select('*').eq('tenant_id', tenantId);
         if (data) {
             const mapped = data.map((p: any) => ({
                id: p.id, name: p.name, description: p.description, price: p.price, category: p.category, type: p.type, 
                linkedInventoryItemId: p.linked_inventory_item_id, image: p.image, isVisible: p.is_visible, sortOrder: p.sort_order
            }));
            dispatchLocal({ type: 'REALTIME_UPDATE_PRODUCTS', products: mapped });
         }
    };

    const fetchInventory = async () => {
        const { data: invData } = await supabase.from('inventory_items').select('*').eq('tenant_id', tenantId);
        const { data: recipeData } = await supabase.from('inventory_recipes').select('*').eq('tenant_id', tenantId);
        
        if (invData) {
            const mapped: InventoryItem[] = invData.map((i: any) => {
                const myRecipes = (recipeData || []).filter((r: any) => r.parent_item_id === i.id);
                const recipeItems = myRecipes.map((r: any) => {
                    const ing = invData.find((raw: any) => raw.id === r.ingredient_item_id);
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
                    recipe: recipeItems
                };
            });
            dispatchLocal({ type: 'REALTIME_UPDATE_INVENTORY', inventory: mapped });
        }
    };

    const fetchSuppliers = async () => {
        const { data } = await supabase.from('suppliers').select('*').eq('tenant_id', tenantId);
        if(data) {
            const mapped = data.map((s:any) => ({ id: s.id, name: s.name, contactName: s.contact_name, phone: s.phone }));
            dispatchLocal({ type: 'REALTIME_UPDATE_SUPPLIERS', suppliers: mapped });
        }
    };

    const fetchExpenses = async () => {
        const { data } = await supabase.from('expenses').select('*').eq('tenant_id', tenantId).order('due_date', { ascending: true });
        if (data) {
            const mapped = data.map((e: any) => ({ id: e.id, description: e.description, amount: e.amount, category: e.category, dueDate: new Date(e.due_date), paidDate: e.paid_date ? new Date(e.paid_date) : undefined, isPaid: e.is_paid, supplierId: e.supplier_id }));
            dispatchLocal({ type: 'REALTIME_UPDATE_EXPENSES', expenses: mapped });
        }
    };

    const channel = supabase.channel(`restaurant_updates:${tenantId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenantId}` }, fetchOrders)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `tenant_id=eq.${tenantId}` }, fetchOrders)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `tenant_id=eq.${tenantId}` }, fetchProducts)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items', filter: `tenant_id=eq.${tenantId}` }, fetchInventory)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_recipes', filter: `tenant_id=eq.${tenantId}` }, fetchInventory)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers', filter: `tenant_id=eq.${tenantId}` }, fetchSuppliers)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `tenant_id=eq.${tenantId}` }, fetchExpenses)
        .subscribe();

    return () => { supabase.removeChannel(channel); }
  }, [state.tenantId]);

  const dispatch = async (action: Action) => {
    const { tenantId, planLimits } = state;

    // --- ERP HANDLERS ---
    if (action.type === 'ADD_INVENTORY_ITEM' && tenantId) {
        // 1. Create the Item
        const { data: newItem, error } = await supabase.from('inventory_items').insert({
            tenant_id: tenantId,
            name: action.item.name,
            unit: action.item.unit,
            quantity: action.item.quantity,
            min_quantity: action.item.minQuantity,
            cost_price: action.item.costPrice,
            type: action.item.type
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
            logAudit(tenantId, 'ADD_STOCK_ITEM', `Item ${action.item.name} (${action.item.type}) cadastrado`);
        }
        return;
    }

    // --- NEW: PROCESS PURCHASE ENTRY ---
    if (action.type === 'PROCESS_PURCHASE' && tenantId) {
        try {
            const { supplierId, invoiceNumber, items, totalAmount, installments } = action.purchase;
            const supplier = state.suppliers.find(s => s.id === supplierId);

            // 1. Create Expenses (Financial) - Iterate over installments
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

            // 2. Update Inventory (Qty & Cost Price) and Log
            for (const item of items) {
                const currentItem = state.inventory.find(i => i.id === item.inventoryItemId);
                if (currentItem) {
                    const currentQty = Number(currentItem.quantity);
                    const currentCost = Number(currentItem.costPrice);
                    const incomingQty = Number(item.quantity);
                    const incomingCost = Number(item.unitPrice);

                    // Weighted Average Cost Formula
                    // Se estoque atual for zero ou negativo, assume o novo custo
                    let newCost = incomingCost;
                    if (currentQty > 0) {
                        newCost = ((currentQty * currentCost) + (incomingQty * incomingCost)) / (currentQty + incomingQty);
                    }

                    const newQty = currentQty + incomingQty;

                    // Update DB
                    await supabase.from('inventory_items').update({
                        quantity: newQty,
                        cost_price: newCost
                    }).eq('id', item.inventoryItemId);

                    // Log Movement
                    await supabase.from('inventory_logs').insert({
                        tenant_id: tenantId,
                        item_id: item.inventoryItemId,
                        type: 'IN',
                        quantity: incomingQty,
                        reason: `Compra NF #${invoiceNumber}`,
                        user_name: state.currentUser?.name
                    });
                }
            }
            logAudit(tenantId, 'PURCHASE_ENTRY', `Entrada de Nota #${invoiceNumber} processada.`);
        } catch (err) {
            console.error("Erro ao processar compra:", err);
        }
        return;
    }

    if (action.type === 'ADD_SUPPLIER' && tenantId) {
        await supabase.from('suppliers').insert({
            tenant_id: tenantId,
            name: action.supplier.name,
            contact_name: action.supplier.contactName,
            phone: action.supplier.phone
        });
        return;
    }

    if (action.type === 'DELETE_SUPPLIER' && tenantId) {
        await supabase.from('suppliers').delete().eq('id', action.supplierId);
        return;
    }

    if (action.type === 'ADD_PRODUCT_TO_MENU' && tenantId) {
        if (planLimits.maxProducts !== -1 && state.products.length >= planLimits.maxProducts) {
            showAlert({ title: "Limite Atingido", message: "Faça upgrade para adicionar mais produtos.", type: 'WARNING' });
            return;
        }
        
        await supabase.from('products').insert({
            tenant_id: tenantId,
            linked_inventory_item_id: action.product.linkedInventoryItemId, // IMPORTANT
            name: action.product.name,
            description: action.product.description,
            price: action.product.price,
            cost_price: action.product.costPrice,
            category: action.product.category,
            type: action.product.type,
            image: action.product.image,
            is_visible: action.product.isVisible,
            sort_order: action.product.sortOrder
        });
        return;
    }

    if (action.type === 'UPDATE_PRODUCT' && tenantId) {
        // Agora atualizamos apenas os dados de "Vitrine", o vínculo de estoque não muda
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
        return;
    }

    // --- ORDER LOGIC WITH AUTOMATIC STOCK DEDUCTION ---
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

            // --- STOCK DEDUCTION LOGIC ---
            // Finds the LINKED inventory item for each product sold
            for (const item of action.items) {
                const product = state.products.find(p => p.id === item.productId);
                if (!product || !product.linkedInventoryItemId) continue;

                const invItem = state.inventory.find(i => i.id === product.linkedInventoryItemId);
                if (!invItem) continue;

                if (invItem.type === 'RESALE') {
                    // Direct Deduction
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
                } else if (invItem.type === 'COMPOSITE' && invItem.recipe) {
                    // Recipe Deduction
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
                        }
                    }
                }
            }
        }
    }

    // Default handlers
    switch (action.type) {
        case 'UPDATE_STOCK':
            if (tenantId) {
                const item = state.inventory.find(i => i.id === action.itemId);
                if(item) {
                    const newQty = action.operation === 'IN' ? Number(item.quantity) + Number(action.quantity) : Number(item.quantity) - Number(action.quantity);
                    await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', action.itemId);
                    await supabase.from('inventory_logs').insert({ tenant_id: tenantId, item_id: action.itemId, type: action.operation, quantity: action.quantity, reason: action.reason, user_name: state.currentUser?.name });
                }
            }
            break;
        case 'DELETE_PRODUCT': if (tenantId) await supabase.from('products').delete().eq('id', action.productId); break;
        // ... Other generic handlers (UPDATE_ITEM_STATUS, PROCESS_PAYMENT, etc) passed through
        default: dispatchLocal(action);
    }
  };

  return (
    <RestaurantContext.Provider value={{ state, dispatch }}>
      {children}
    </RestaurantContext.Provider>
  );
};