
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

export type OrderType = 'DINE_IN' | 'DELIVERY' | 'PDV';

export type SystemModule = 'RESTAURANT' | 'SNACKBAR' | 'DISTRIBUTOR' | 'COMMERCE' | 'MANAGER' | 'CONFIG' | 'FINANCE' | 'INVENTORY' | 'HR';

export type DeliveryPlatform = 'PHONE' | 'WHATSAPP' | 'IFOOD' | 'UBER_EATS' | 'RAPPI' | 'OTHER' | 'OWN_FLEET';

// --- Custom Roles ---
export interface RolePermissions {
    allowed_modules: SystemModule[];
    allowed_features: string[];
}

export interface CustomRole {
    id: string;
    name: string;
    description?: string;
    permissions: RolePermissions;
}

// --- HR Types ---
export type ContractType = 'CLT' | 'PJ' | 'TEMPORARY' | 'INTERN' | 'FREELANCE';
export type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'VACATION';

export interface Shift {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    toleranceMinutes: number;
    nightShift: boolean;
}

export interface TimeEntry {
    id: string;
    staffId: string;
    entryDate: Date;
    clockIn?: Date;
    breakStart?: Date;
    breakEnd?: Date;
    clockOut?: Date;
    justification?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface PayrollPreview {
    staffId: string;
    staffName: string;
    baseSalary: number;
    overtimeTotal: number;
    absencesTotal: number;
    addictionals: number;
    benefits: number;
    grossTotal: number;
    discounts: number;
    netTotal: number;
    hoursWorked: number;
}

export interface DeliveryMethodConfig {
    id: string;
    name: string; 
    type: 'OWN' | 'APP' | 'PICKUP';
    feeType: 'FIXED' | 'PERCENTAGE';
    feeValue: number;
    feeBehavior: 'ADD_TO_TOTAL' | 'DEDUCT_FROM_NET' | 'NONE'; 
    estimatedTimeMin?: number;
    estimatedTimeMax?: number;
    isActive: boolean;
}

export interface PaymentMethodConfig {
    id: string;
    name: string; 
    type: 'CREDIT' | 'DEBIT' | 'PIX' | 'CASH' | 'MEAL_VOUCHER';
    feePercentage: number; 
    isActive: boolean;
}

export interface ExpenseCategory {
    id: string;
    name: string; 
}

export interface DeliveryInfo {
    customerName: string;
    phone: string;
    address: string;
    methodId: string; 
    platform: string; 
    deliveryFee: number; 
    changeFor?: number; 
    paymentMethod?: string; 
    paymentStatus?: 'PENDING' | 'PAID';
}

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
    allowHR?: boolean;
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
    orderGracePeriodMinutes?: number;
    adminPin?: string;
    deliverySettings?: DeliveryMethodConfig[]; 
    paymentMethods?: PaymentMethodConfig[]; 
    expenseCategories?: ExpenseCategory[]; 
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
  allowedModules?: SystemModule[]; 
  allowedFeatures?: string[]; 
  businessInfo?: RestaurantBusinessInfo;
}

export interface User {
  id: string;
  auth_user_id?: string;
  name: string;
  email?: string;
  role: Role;
  customRoleId?: string; // Novo
  customRoleName?: string; // Novo (para display)
  allowedRoutes?: string[];
  // RH Fields
  department?: string;
  hireDate?: Date;
  contractType?: ContractType;
  baseSalary?: number;
  benefitsTotal?: number;
  status?: EmployeeStatus;
  phone?: string;
  documentCpf?: string;
}

export interface SystemAccessLog {
    id: string;
    staff_id: string;
    login_at: Date;
    last_seen_at: Date;
    logout_at?: Date;
    device_info?: string;
    staff_name?: string; 
    staff_role?: string; 
}

export interface SecurityIncident {
    id: string;
    severity: 'LOW' | 'MEDIUM' | 'CRITICAL';
    type: string;
    details: string;
    created_at: Date;
    ip_address?: string;
    user_agent?: string;
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
    barcode?: string; 
    unit: string;
    quantity: number;
    minQuantity: number;
    costPrice: number;
    salePrice: number;
    category?: string;
    description?: string; 
    type: InventoryType;
    image?: string;
    recipe?: InventoryRecipeItem[];
    isExtra: boolean; 
    targetCategories?: string[];
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
  targetCategories?: string[];
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  notes?: string;
  status: OrderStatus;
  productName: string;
  productType: ProductType;
  productPrice: number;
  productCostPrice: number;
}

export interface Order {
  id: string;
  tableId: string;
  items: OrderItem[];
  timestamp: Date;
  isPaid: boolean;
  status: string;
  type?: OrderType;
  deliveryInfo?: DeliveryInfo;
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
  reason?: string;
}

export interface RestaurantTheme {
  primaryColor: string;
  backgroundColor: string;
  fontColor: string;
  logoUrl: string;
  bannerUrl?: string;
  restaurantName: string;
  viewMode?: 'LIST' | 'GRID';
  fontFamily?: 'Inter' | 'Roboto' | 'Playfair Display' | 'Montserrat';
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  buttonStyle?: 'fill' | 'outline' | 'minimal';
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

export interface PurchaseTaxes {
    icms: number;
    ipi: number;
    st: number;
    freight: number;
    others: number;
}

export interface PurchaseEntry {
    supplierId: string;
    invoiceNumber: string;
    series?: string; 
    accessKey?: string; 
    date: Date;
    items: PurchaseItemInput[];
    totalAmount: number;
    taxes: PurchaseTaxes; 
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
  status: 'COMPLETED' | 'CANCELLED'; 
}

export interface CashSession {
  id: string;
  openedAt: Date;
  initialAmount: number;
  status: 'OPEN' | 'CLOSED';
  operatorName: string;
  closedAt?: Date;
  finalAmount?: number | null;
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
