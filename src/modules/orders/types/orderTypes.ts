export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED' | 'PAID' | 'CANCELLED';

export interface OrderItem {
  productId: string;
  quantity: number;
  priceAtTime: number;
  notes?: string;
}

export interface CreateOrderDTO {
  tenantId: string;
  tableId: string;
  items: OrderItem[];
}

export interface Order {
  id: string;
  tenant_id: string;
  table_id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
}
