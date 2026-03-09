import { useEffect, useState } from 'react';
import { supabase } from '../../../core/api/supabaseClient';
import { Order } from '../../orders/types/orderTypes';
import { OrderService } from '../../orders/services/orderService';

export const useRealtimeKDS = (tenantId: string | undefined) => {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!tenantId) return;

    const fetchActiveOrders = async () => {
      try {
        const data = await OrderService.getOrdersByTenant(tenantId);
        // Filter only active orders for KDS
        setActiveOrders(data.filter(o => ['PENDING', 'PREPARING', 'READY'].includes(o.status)));
      } catch (error) {
        console.error('Error fetching KDS orders:', error);
      }
    };

    fetchActiveOrders();

    const channel = supabase
      .channel('kds_orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          console.log('Realtime Order Update:', payload);
          fetchActiveOrders(); // Simple approach: refetch on change. Could be optimized to mutate state.
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  return { activeOrders };
};
