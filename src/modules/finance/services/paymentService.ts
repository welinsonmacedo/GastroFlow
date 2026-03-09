import { supabase } from '../../../core/api/supabaseClient';
import { EventBus } from '../../../core/events/eventBus';
import { AppEvents } from '../../../core/events/eventTypes';

export const PaymentService = {
  async processPaymentAndCloseTable(orderId: string, tableId: string, amount: number, method: string) {
    const { error } = await supabase.rpc('process_payment_transaction', {
      p_order_id: orderId,
      p_table_id: tableId,
      p_amount: amount,
      p_method: method
    });

    if (error) throw new Error(`Payment failed: ${error.message}`);
    
    EventBus.publish(AppEvents.PAYMENT_COMPLETED, { orderId, amount, method });
    EventBus.publish(AppEvents.TABLE_CLOSED, { tableId });
  }
};
