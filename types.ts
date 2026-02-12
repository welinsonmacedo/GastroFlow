

export enum Role {
  CLIENT = 'CLIENT',
  WAITER = 'WAITER',
  KITCHEN = 'KITCHEN',
  CASHIER = 'CASHIER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
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

export interface PlanLimits {
    maxTables: number;
    maxProducts: number;
    maxStaff: number;
    allowKds: boolean;
    allowCashier: boolean;
    allowReports?: boolean;
    allowInventory?: boolean;
    allowPurchases?: boolean;
    allowExpenses?: boolean;
    allowStaff?: boolean;
    allowTableMgmt?: boolean;
    allowCustomization?: boolean;
}

export interface Plan {
    id: string;
    key: PlanType;
    name: string;
    price: string;
    period: string;
    features: string[];
    limits?: PlanLimits;
    is_popular: boolean;
    button_text: string;
}

export interface RestaurantBusinessInfo {
    restaurantName?: string;
    ownerName?: string;
    cnpj?: string;
    phone?: string;
    email?: string;
    address?: {
        cep: string;
        street: string;
        number: string;
        complement?: string;
        neighborhood: string;
        city: string;
        state: string;
    };
    instagram?: string;
    website?: string;
}

export interface RestaurantTenant {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  plan: PlanType;
  joinedAt: Date;
  requestCount?: number;
  businessInfo?: RestaurantBusinessInfo;
}

export interface User {
  id: string;
  auth_user_id?: string;
  name: string;
  email?: string;
  role: Role;
  pin: string; 
  allowedRoutes?: string[];
}

export interface InventoryRecipeItem {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit?: string;
  cost?: number;
}

export type InventoryType = 'INGREDIENT' | 'RESALE' | 'COMPOSITE';

export interface InventoryItem {
    id: string;
    name: string;
    unit: string;
    quantity: number;
    minQuantity: number;
    costPrice: number;
    type: InventoryType;
    image?: string;
    recipe?: InventoryRecipeItem[];
    isExtra: boolean; // Indica se é um adicional
}

export interface InventoryLog {
  id: string;
  item_id: string;
  type: 'IN' | 'OUT' | 'SALE' | 'LOSS';
  quantity: number;
  reason: string;
  user_name: string;
  created_at: Date;
}

export interface Product {
  id: string;
  linkedInventoryItemId: string;
  name: string;
  description: string;
  price: number;
  costPrice?: number;
  category: string;
  type: ProductType;
  image: string; 
  isVisible: boolean; 
  sortOrder: number;
  isExtra: boolean; 
  linkedExtraIds?: string[]; 
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  notes?: string;
  status: OrderStatus;
  productName: string;
  productType: ProductType;
  // Added productPrice and productCostPrice to fix type errors in pages/ClientApp.tsx
  productPrice: number;
  productCostPrice: number;
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

export interface ServiceCall {
  id: string;
  tableId: string;
  status: 'PENDING' | 'RESOLVED';
  timestamp: Date;
}

export interface RestaurantTheme {
  primaryColor: string;
  backgroundColor: string;
  fontColor: string;
  logoUrl: string;
  bannerUrl?: string;
  restaurantName: string;
  viewMode?: 'LIST' | 'GRID';
}

export interface Supplier {
    id: string;
    name: string;
    contactName: string;
    phone: string;
    cnpj?: string;
    ie?: string;
    email?: string;
    cep?: string;
    address?: string;
    number?: string;
    complement?: string;
    city?: string;
    state?: string;
}

export interface PurchaseItemInput {
    inventoryItemId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

export interface PurchaseInstallment {
    dueDate: Date;
    amount: number;
}

export interface PurchaseEntry {
    supplierId: string;
    invoiceNumber: string;
    date: Date;
    items: PurchaseItemInput[];
    totalAmount: number;
    taxAmount: number;
    distributeTax: boolean;
    installments: PurchaseInstallment[];
}

export interface Expense {
    id: string;
    description: string;
    amount: number;
    category: string;
    dueDate: Date;
    paidDate?: Date;
    isPaid: boolean;
    supplierId?: string;
    isRecurring?: boolean;
    paymentMethod?: 'CASH' | 'BANK';
}

export interface POSSaleData {
    customerName: string;
    items: { productId: string; quantity: number; notes: string }[];
    totalAmount: number;
    method: 'CASH' | 'CARD' | 'PIX' | 'CREDIT' | 'DEBIT';
}

export interface Transaction {
  id: string;
  tableId: string;
  tableNumber: number;
  amount: number;
  method: string;
  timestamp: Date;
  itemsSummary: string;
  cashierName: string;
}

export interface CashSession {
  id: string;
  openedAt: Date;
  initialAmount: number;
  status: 'OPEN' | 'CLOSED';
  operatorName: string;
}

export interface CashMovement {
  id: string;
  sessionId: string;
  type: 'BLEED' | 'SUPPLY';
  amount: number;
  reason: string;
  timestamp: Date;
  userName: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  action: string;
  details: any;
  created_at: Date;
}