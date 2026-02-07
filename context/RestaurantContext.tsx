import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Table, Order, Product, TableStatus, OrderStatus, ProductType, OrderItem, RestaurantTheme, User, AuditLog, Transaction } from '../types';
import { getTenantSlug } from '../utils/tenant';
import { getTenantData } from '../data/mockDb';

interface State {
  isLoading: boolean;
  tenantSlug: string | null;
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
  | { type: 'INIT_TENANT'; slug: string; data: any }
  | { type: 'TENANT_NOT_FOUND' }
  | { type: 'LOGIN'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'ADD_USER'; user: User }
  | { type: 'UPDATE_USER'; user: User }
  | { type: 'DELETE_USER'; userId: string }
  | { type: 'OPEN_TABLE'; tableId: string; customerName: string; accessCode: string }
  | { type: 'CLOSE_TABLE'; tableId: string }
  | { type: 'PLACE_ORDER'; tableId: string; items: { productId: string; quantity: number; notes: string }[] }
  | { type: 'UPDATE_ITEM_STATUS'; orderId: string; itemId: string; status: OrderStatus }
  | { type: 'UPDATE_PRODUCT_DESC'; productId: string; description: string }
  | { type: 'UPDATE_PRODUCT'; product: Product }
  | { type: 'ADD_PRODUCT'; product: Product }
  | { type: 'UPDATE_THEME'; theme: RestaurantTheme }
  | { type: 'PROCESS_PAYMENT'; tableId: string; amount: number; method: 'CASH' | 'CARD' | 'PIX' };

const initialState: State = {
  isLoading: true,
  tenantSlug: null,
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
  dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

// Helper para log de auditoria
const createAuditLog = (state: State, action: string, details: string): AuditLog => ({
  id: Math.random().toString(36).substr(2, 9),
  userId: state.currentUser?.id || 'system',
  userName: state.currentUser?.name || 'System',
  action,
  details,
  timestamp: new Date()
});

const restaurantReducer = (state: State, action: Action): State => {
  let newState = { ...state };
  let logEntry: AuditLog | null = null;

  switch (action.type) {
    case 'INIT_TENANT':
        return {
            ...state,
            isLoading: false,
            isValidTenant: true,
            tenantSlug: action.slug,
            ...action.data // Carrega dados do DB
        };

    case 'TENANT_NOT_FOUND':
        return { ...state, isLoading: false, isValidTenant: false };

    case 'LOGIN':
      newState.currentUser = action.user;
      logEntry = createAuditLog(newState, 'LOGIN', `Usuário ${action.user.name} logou.`);
      break;

    case 'LOGOUT':
      logEntry = createAuditLog(state, 'LOGOUT', `Usuário ${state.currentUser?.name} saiu.`);
      newState.currentUser = null;
      break;

    case 'ADD_USER':
      newState.users = [...state.users, action.user];
      logEntry = createAuditLog(state, 'ADD_USER', `Novo funcionário: ${action.user.name} (${action.user.role})`);
      break;

    case 'UPDATE_USER':
      newState.users = state.users.map(u => u.id === action.user.id ? action.user : u);
      logEntry = createAuditLog(state, 'UPDATE_USER', `Dados atualizados: ${action.user.name}`);
      break;

    case 'DELETE_USER':
      const deletedUser = state.users.find(u => u.id === action.userId);
      newState.users = state.users.filter(u => u.id !== action.userId);
      logEntry = createAuditLog(state, 'DELETE_USER', `Funcionário removido: ${deletedUser?.name}`);
      break;

    case 'OPEN_TABLE':
      newState.tables = state.tables.map(t => 
        t.id === action.tableId 
          ? { ...t, status: TableStatus.OCCUPIED, customerName: action.customerName, accessCode: action.accessCode } 
          : t
      );
      logEntry = createAuditLog(state, 'OPEN_TABLE', `Mesa ${action.tableId} aberta para ${action.customerName}`);
      break;

    case 'CLOSE_TABLE':
      newState.tables = state.tables.map(t => 
        t.id === action.tableId 
          ? { ...t, status: TableStatus.AVAILABLE, customerName: '', accessCode: '' } 
          : t
      );
      // Clean up orders handled in payment usually, but here strict cleanup
      logEntry = createAuditLog(state, 'CLOSE_TABLE', `Mesa ${action.tableId} fechada manualmente.`);
      break;

    case 'PLACE_ORDER': {
      const newOrderItems: OrderItem[] = action.items.map(i => {
        const product = state.products.find(p => p.id === i.productId);
        return {
          id: Math.random().toString(36).substr(2, 9),
          productId: i.productId,
          quantity: i.quantity,
          notes: i.notes,
          status: OrderStatus.PENDING,
          productName: product?.name || 'Unknown',
          productType: product?.type || ProductType.KITCHEN
        };
      });

      const newOrder: Order = {
        id: Math.random().toString(36).substr(2, 9),
        tableId: action.tableId,
        items: newOrderItems,
        timestamp: new Date(),
        isPaid: false
      };

      newState.orders = [...state.orders, newOrder];
      // Logs are usually spammy for client orders, maybe skip or log simple
      break;
    }

    case 'UPDATE_ITEM_STATUS':
      newState.orders = state.orders.map(order => {
        if (order.id !== action.orderId) return order;
        return {
          ...order,
          items: order.items.map(item => item.id === action.itemId ? { ...item, status: action.status } : item)
        };
      });
      break;
      
    case 'UPDATE_PRODUCT_DESC':
      newState.products = state.products.map(p => p.id === action.productId ? { ...p, description: action.description } : p);
      logEntry = createAuditLog(state, 'AI_UPDATE', `Descrição IA gerada para produto ${action.productId}`);
      break;
      
    case 'UPDATE_PRODUCT':
      newState.products = state.products.map(p => p.id === action.product.id ? action.product : p);
      logEntry = createAuditLog(state, 'UPDATE_PRODUCT', `Produto atualizado: ${action.product.name}`);
      break;

    case 'ADD_PRODUCT':
      newState.products = [...state.products, action.product];
      logEntry = createAuditLog(state, 'ADD_PRODUCT', `Novo produto criado: ${action.product.name}`);
      break;

    case 'UPDATE_THEME':
      newState.theme = action.theme;
      logEntry = createAuditLog(state, 'UPDATE_THEME', `Tema visual atualizado`);
      break;

    case 'PROCESS_PAYMENT':
        // 1. Create Transaction
        const tableToPay = state.tables.find(t => t.id === action.tableId);
        const ordersToPay = state.orders.filter(o => o.tableId === action.tableId && !o.isPaid);
        
        const summary = ordersToPay.flatMap(o => o.items.map(i => `${i.quantity}x ${i.productName}`)).join(', ');

        const transaction: Transaction = {
            id: Math.random().toString(36).substr(2, 9),
            tableId: action.tableId,
            tableNumber: tableToPay?.number || 0,
            amount: action.amount,
            method: action.method,
            timestamp: new Date(),
            itemsSummary: summary,
            cashierName: state.currentUser?.name || 'Sistema'
        };

        newState.transactions = [...state.transactions, transaction];

        // 2. Mark orders as paid (or remove them depending on logic, let's just keep them marked paid for history if we had a persistent db)
        newState.orders = state.orders.map(o => o.tableId === action.tableId ? { ...o, isPaid: true } : o);

        // 3. Free the table
        newState.tables = state.tables.map(t => 
            t.id === action.tableId 
            ? { ...t, status: TableStatus.AVAILABLE, customerName: '', accessCode: '' } 
            : t
        );

        logEntry = createAuditLog(state, 'PAYMENT', `Pagamento R$${action.amount} (${action.method}) na Mesa ${tableToPay?.number}`);
        break;

    default:
      return state;
  }

  if (logEntry) {
      newState.auditLogs = [logEntry, ...state.auditLogs];
  }

  return newState;
};

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(restaurantReducer, initialState);

  // Inicializa dados baseados no Tenant (Subdomínio)
  useEffect(() => {
      const slug = getTenantSlug();
      if (slug) {
          const data = getTenantData(slug);
          if (data) {
              dispatch({ type: 'INIT_TENANT', slug, data });
          } else {
              dispatch({ type: 'TENANT_NOT_FOUND' });
          }
      } else {
          // Não estamos em um tenant (Landing Page ou Super Admin)
          dispatch({ type: 'TENANT_NOT_FOUND' });
      }
  }, []);

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