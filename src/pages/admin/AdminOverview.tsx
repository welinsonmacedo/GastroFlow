
import React from 'react';
import { useRestaurant } from '@/core/context/RestaurantContext';
import { useInventory } from '@/core/context/InventoryContext';
import { useFinance } from '@/core/context/FinanceContext';
import { useOrder } from '@/core/context/OrderContext';
import { StatCard } from '../../components/StatCard';
import { DollarSign, AlertTriangle, ShoppingBag, TrendingUp } from 'lucide-react';

export const AdminOverview: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: invState } = useInventory();
  const { state: finState } = useFinance();
  const { state: orderState } = useOrder();
  const { planLimits } = restState;

  // Filtra transações canceladas para não somar na receita
  const salesToday = finState.transactions
    .filter(t => t.status !== 'CANCELLED')
    .reduce((acc, t) => acc + t.amount, 0);

  const lowStockCount = invState.inventory.filter(i => i.quantity <= i.minQuantity).length;
  // Filtra pedidos cancelados ou pagos
  const openOrders = orderState.orders.filter(o => !o.isPaid && o.status !== 'CANCELLED').length;
  
  const validTransactionsCount = finState.transactions.filter(t => t.status !== 'CANCELLED').length;

  return (
    <div className="animate-fade-in">
        <header className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Visão Geral</h2>
            <p className="text-gray-500">Resumo da operação em tempo real.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                title="Vendas Hoje" 
                value={`R$ ${salesToday.toFixed(2)}`} 
                icon={<DollarSign size={20}/>}
                colorBorder="border-blue-500"
            />
            
            {planLimits.allowInventory && (
                <StatCard 
                    title="Estoque Baixo" 
                    value={lowStockCount} 
                    icon={<AlertTriangle size={20}/>}
                    colorBorder="border-yellow-500"
                />
            )}
            
            <StatCard 
                title="Pedidos Abertos" 
                value={openOrders} 
                icon={<ShoppingBag size={20}/>}
                colorBorder="border-purple-500"
            />

            <StatCard 
                title="Transações Válidas" 
                value={validTransactionsCount} 
                icon={<TrendingUp size={20}/>}
                colorBorder="border-green-500"
            />
        </div>
    </div>
  );
};
