export enum AppEvents {
  ORDER_CREATED = 'order.created',
  ORDER_STATUS_CHANGED = 'order.status_changed',
  PAYMENT_COMPLETED = 'payment.completed',
  TABLE_CLOSED = 'table.closed',
  INVENTORY_LOW = 'inventory.low_stock',
  EMPLOYEE_CLOCK_IN = 'employee.clock_in',
  EMPLOYEE_CLOCK_OUT = 'employee.clock_out',
  AUTH_SESSION_EXPIRED = 'auth.session_expired',
}

export interface OrderCreatedPayload {
  orderId: string;
  tableId: string;
  total: number;
  tenantId: string;
}

export interface PaymentCompletedPayload {
  orderId: string;
  amount: number;
  method: string;
}
