export enum Role {
  CLIENT = 'CLIENT',
  WAITER = 'WAITER',
  KITCHEN = 'KITCHEN',
  CASHIER = 'CASHIER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN' // Dono do Sistema
}

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  WAITING_PAYMENT = 'WAITING_PAYMENT',
  CLOSED = 'CLOSED'
}

export enum ProductType {
  KITCHEN = 'KITCHEN',
  BAR = 'BAR'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

// --- SaaS Types ---
export type PlanType = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface RestaurantTenant {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  plan: PlanType;
  joinedAt: Date;
}
// ------------------

export interface User {
  id: string;
  name: string;
  role: Role;
  pin: string; 
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: Date;
}

export interface Transaction {
  id: string;
  tableId: string;
  tableNumber: number;
  amount: number;
  method: 'CASH' | 'CARD' | 'PIX';
  timestamp: Date;
  itemsSummary: string;
  cashierName: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  type: ProductType;
  image: string; 
  isVisible: boolean; 
  sortOrder: number; 
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  notes?: string;
  status: OrderStatus;
  productName: string;
  productType: ProductType;
}

export interface Order {
  id: string;
  tableId: string;
  items: OrderItem[];
  timestamp: Date;
  isPaid: boolean;
}

export interface Table {
  id: string;
  number: number;
  status: TableStatus;
  activeOrderId?: string;
  customerName?: string; 
  accessCode?: string; 
}

export interface RestaurantTheme {
  primaryColor: string;
  backgroundColor: string;
  fontColor: string;
  logoUrl: string;
  restaurantName: string;
}

export interface DailyStats {
  totalRevenue: number;
  totalOrders: number;
  topProduct: string;
}