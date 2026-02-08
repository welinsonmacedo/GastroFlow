
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
}
// ------------------

export interface User {
  id: string;
  auth_user_id?: string;
  name: string;
  email?: string;
  role: Role;
  pin: string; 
  allowedRoutes?: string[];
}

export interface OnlineUser {
    id: string;
    name: string;
    role: Role;
    onlineAt: Date;
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
  method: 'CASH' | 'CARD' | 'PIX' | 'CREDIT' | 'DEBIT';
  timestamp: Date;
  itemsSummary: string;
  cashierName: string;
}

// --- ERP TYPES UPDATED ---

export type InventoryType = 'INGREDIENT' | 'RESALE' | 'COMPOSITE';

export interface InventoryRecipeItem {
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    cost: number;
}

export interface InventoryItem {
    id: string;
    name: string;
    unit: string; // kg, lt, un
    quantity: number;
    minQuantity: number;
    costPrice: number;
    type: InventoryType; // Novo campo
    recipe?: InventoryRecipeItem[]; // Apenas para COMPOSITE
}

// Product agora é apenas uma "Vitrine" para um InventoryItem
export interface Product {
  id: string;
  linkedInventoryItemId: string; // Obrigatório agora
  name: string; // Pode ser diferente do estoque (nome comercial)
  description: string;
  price: number; // Preço de Venda
  costPrice?: number; // Vem do estoque
  category: string;
  type: ProductType; // KITCHEN / BAR
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
    phone: string;
    contactName: string;
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
    invoiceNumber: string; // Numero da Nota
    date: Date;
    items: PurchaseItemInput[];
    totalAmount: number;
    taxAmount: number; // Impostos
    distributeTax: boolean; // Distribuir no custo?
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
}

export interface POSSaleData {
    customerName: string;
    items: { productId: string; quantity: number; notes: string }[];
    totalAmount: number;
    method: 'CASH' | 'CARD' | 'PIX' | 'CREDIT' | 'DEBIT';
}
