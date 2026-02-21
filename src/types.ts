
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

export type SystemModule = 'RESTAURANT' | 'SNACKBAR' | 'DISTRIBUTOR' | 'COMMERCE' | 'MANAGER' | 'CONFIG' | 'FINANCE' | 'INVENTORY' | 'HR' | 'AUDIT';

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
export type WorkModel = '44H_WEEKLY' | '12X36' | 'PART_TIME' | 'INTERMITTENT' | 'ROTATING';
export type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'VACATION';
export type TaxRegime = 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL' | 'MEI';
export type TaxPayerType = 'EMPLOYEE' | 'EMPLOYER';
export type TaxCalculationBasis = 'GROSS_TOTAL' | 'BASE_SALARY';
export type PayrollEventType = 'BONUS' | 'COMMISSION' | 'DEDUCTION' | 'ADVANCE' | 'NIGHT_SHIFT' | 'INSALUBRITY' | 'DANGEROUSNESS' | 'FOOD_VOUCHER';

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

export interface PayrollEvent {
    id: string;
    staffId: string;
    month: number;
    year: number;
    type: PayrollEventType;
    description: string;
    value: number;
}

// Interfaces Novas para Cálculo Real
export interface RhPayrollSetting {
    id: string;
    minWage: number;
    inssCeiling: number;
    irrfDependentDeduction: number;
    fgtsRate: number;
    validFrom: string;
    validUntil?: string;
}

export interface RhInssBracket {
    id: string;
    minValue: number;
    maxValue?: number; // Null = infinito
    rate: number;
    validFrom: string;
}

export interface RhIrrfBracket {
    id: string;
    minValue: number;
    maxValue?: number;
    rate: number;
    deduction: number;
    validFrom: string;
}

export interface RHTax {
    id: string;
    name: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    payerType: TaxPayerType; 
    calculationBasis: TaxCalculationBasis; 
    isActive: boolean;
}

export interface RHBenefit {
    id: string;
    name: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    isActive: boolean;
}

export interface PayrollPreview {
    staffId: string;
    staffName: string;
    baseSalary: number;
    
    // Horas Extras e Adicionais
    overtime50: number; // Valor R$
    overtime100: number; // Valor R$
    nightShiftAdd: number; // Adicional Noturno R$
    bankOfHoursBalance: number; // Saldo em horas
    
    absencesTotal: number;
    addictionals: number; // Insalubridade/Periculosidade
    eventsValue: number; // Bônus/Comissões manuais
    
    benefits: number;

    grossTotal: number;
    discounts: number; // Total descontos
    advances: number; // Adiantamentos
    netTotal: number;
    hoursWorked: number;
    
    // Custos da Empresa
    employerCharges: number; 
    totalCompanyCost: number; 

    // Detalhamento Impostos
    inssValue: number;
    irrfValue: number;
    fgtsValue: number; 
    
    taxBreakdown: { name: string; value: number; type: TaxPayerType }[];
    benefitBreakdown: { name: string; value: number }[];
    eventBreakdown: { name: string; value: number; type: 'CREDIT' | 'DEBIT' }[];
}

export interface ClosedPayroll {
    id: string;
    month: number;
    year: number;
    totalCost: number;
    totalNet: number;
    employeeCount: number;
    closedAt: Date;
    closedBy: string;
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

export type PlanType = 'FREE' | 'PRO' | 'ENTERPRISE';

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

export interface TimeClockConfig {
    validationType: 'GEOLOCATION' | 'NONE';
    maxDistanceMeters?: number;
    maxDailyPunches?: number;
    restaurantLocation?: {
        lat: number;
        lng: number;
    };
}

export interface TimeClockSettings {
    validationType: 'GEOLOCATION' | 'NONE';
    maxDistanceMeters?: number;
    maxDailyPunches?: number; // Default 4
    latitude?: number;
    longitude?: number;
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
    taxRegime?: TaxRegime; 
    deliverySettings?: DeliveryMethodConfig[]; 
    paymentMethods?: PaymentMethodConfig[]; 
    expenseCategories?: ExpenseCategory[]; 
    timeClock?: TimeClockConfig;
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
  customLimits?: PlanLimits;
  businessInfo?: RestaurantBusinessInfo;
}

export interface User {
  id: string;
  tenant_id: string;
  auth_user_id?: string;
  name: string;
  email?: string;
  role: Role;
  customRoleId?: string; 
  customRoleName?: string;
  allowedRoutes?: string[];
  allowedFeatures?: string[];
  
  // RH Fields
  department?: string;
  hireDate?: Date;
  contractType?: ContractType;
  workModel?: WorkModel; // Novo campo
  baseSalary?: number;
  benefitsTotal?: number; 
  status?: EmployeeStatus;
  shiftId?: string; 
  phone?: string;
  documentCpf?: string;
  dependentsCount?: number;
  bankHoursBalance?: number; // Saldo de horas atual

  // Extended
  birthDate?: Date;
  mothersName?: string;
  fathersName?: string;
  maritalStatus?: string;
  gender?: string;
  educationLevel?: string;
  rgNumber?: string;
  rgIssuer?: string;
  rgState?: string;
  ctpsNumber?: string;
  ctpsSeries?: string;
  ctpsState?: string;
  pisPasep?: string;
  voterRegistration?: string;
  addressZip?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressComplement?: string;
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  bankAccountType?: string;
  pixKey?: string;
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

export interface SuggestionItem {
    id: string;
    name: string;
    unit: string;
    currentStock: number;
    minStock: number;
    costPrice: number;
    suggestedQty: number;
    estimatedCost: number;
    salesCount: number;
    supplierId?: string;
    supplierName?: string;
}

export interface PurchaseOrder {
    id: string;
    created_at: string;
    supplier_id: string;
    total_cost: number;
    status: string;
    supplierName?: string;
}
