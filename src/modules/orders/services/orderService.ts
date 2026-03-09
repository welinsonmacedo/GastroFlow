import { supabase } from '../../../core/api/supabaseClient';
import { EventBus } from '../../../core/events/eventBus';
import { AppEvents } from '../../../core/events/eventTypes';
import { Order, CreateOrderDTO, OrderStatus } from '../types/orderTypes';

export const OrderService = {
  async createOrder(payload: CreateOrderDTO): Promise<Order> {
    const { data, error } = await supabase.rpc('create_order_transaction', {
      p_table_id: payload.tableId,
      p_items: payload.items,
      p_tenant_id: payload.tenantId
    });

    if (error) throw new Error(error.message);

    EventBus.publish(AppEvents.ORDER_CREATED, {
      orderId: data.id,
      tableId: payload.tableId,
      total: data.total,
      tenantId: payload.tenantId
    });

    return data as Order;
  },

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) throw new Error(error.message);
    
    EventBus.publish(AppEvents.ORDER_STATUS_CHANGED, { orderId, status });
  },
  
  async getOrdersByTenant(tenantId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
      
    if (error) throw new Error(error.message);
    return data as Order[];
  }
};
