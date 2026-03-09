import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Order, CreateOrderDTO, OrderStatus } from '../types/orderTypes';
import { OrderService } from '../services/orderService';
import { useTenant } from '../../../core/tenant/TenantContext';
import { EventBus } from '../../../core/events/eventBus';
import { AppEvents } from '../../../core/events/eventTypes';

interface OrderContextType {
  orders: Order[];
  isLoading: boolean;
  createOrder: (payload: CreateOrderDTO) => Promise<void>;
  updateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  refreshOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider = ({ children }: { children: ReactNode }) => {
  const { tenant } = useTenant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshOrders = async () => {
    if (!tenant) return;
    setIsLoading(true);
    try {
      const data = await OrderService.getOrdersByTenant(tenant.id);
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch orders', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshOrders();
    
    // Listen to realtime client events to refresh
    const unsubscribe = EventBus.subscribe(AppEvents.ORDER_CREATED, () => {
      refreshOrders();
    });
    
    return () => unsubscribe();
  }, [tenant]);

  const createOrder = async (payload: CreateOrderDTO) => {
    await OrderService.createOrder(payload);
  };

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    await OrderService.updateOrderStatus(orderId, status);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  return (
    <OrderContext.Provider value={{ orders, isLoading, createOrder, updateStatus, refreshOrders }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};
