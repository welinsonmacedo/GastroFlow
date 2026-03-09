export type EventType = 
  | 'ORDER_CREATED'
  | 'ORDER_UPDATED'
  | 'ORDER_PAID'
  | 'STOCK_LOW'
  | 'USER_LOGGED_IN'
  | 'USER_LOGGED_OUT';

export interface EventPayloads {
  'ORDER_CREATED': { orderId: string; tableId?: string; total: number };
  'ORDER_UPDATED': { orderId: string; status: string };
  'ORDER_PAID': { orderId: string; amount: number; method: string };
  'STOCK_LOW': { productId: string; productName: string; currentStock: number };
  'USER_LOGGED_IN': { userId: string; role: string };
  'USER_LOGGED_OUT': { userId: string };
}
