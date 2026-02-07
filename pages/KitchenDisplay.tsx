import React from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { OrderStatus, ProductType } from '../types';
import { Clock, Check, ChefHat } from 'lucide-react';

export const KitchenDisplay: React.FC = () => {
  const { state, dispatch } = useRestaurant();

  // Get only KITCHEN items that are not yet Delivered/Cancelled
  const activeOrders = state.orders.filter(order => 
    order.items.some(item => 
      item.productType === ProductType.KITCHEN && 
      (item.status === OrderStatus.PENDING || item.status === OrderStatus.PREPARING)
    )
  );

  const updateItemStatus = (orderId: string, itemId: string, nextStatus: OrderStatus) => {
    dispatch({ type: 'UPDATE_ITEM_STATUS', orderId, itemId, status: nextStatus });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4">
      <header className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-3">
            <ChefHat className="text-yellow-500" /> 
            Cozinha (KDS)
        </h1>
        <div className="text-xl font-mono text-yellow-400">
            {new Date().toLocaleTimeString()}
        </div>
      </header>

      <div className="flex gap-4 overflow-x-auto pb-4 kds-scroll min-h-[calc(100vh-100px)]">
        {activeOrders.length === 0 && (
            <div className="w-full h-full flex items-center justify-center text-slate-600 text-2xl font-bold">
                Sem Pedidos Ativos
            </div>
        )}
        
        {activeOrders.map(order => {
          const table = state.tables.find(t => t.id === order.tableId);
          // Calculate time elapsed (mock)
          const elapsedMinutes = Math.floor((new Date().getTime() - new Date(order.timestamp).getTime()) / 60000);
          
          return (
            <div key={order.id} className="min-w-[300px] max-w-[300px] bg-slate-800 rounded-lg overflow-hidden border border-slate-700 flex flex-col">
              {/* Card Header */}
              <div className={`p-3 flex justify-between items-center ${elapsedMinutes > 20 ? 'bg-red-900' : 'bg-slate-700'}`}>
                <div className="font-bold text-2xl">Mesa {table?.number}</div>
                <div className="flex items-center gap-1 text-sm font-mono">
                  <Clock size={16} /> {elapsedMinutes}m
                </div>
              </div>

              {/* Items List */}
              <div className="p-2 flex-1 space-y-2">
                {order.items
                  .filter(item => item.productType === ProductType.KITCHEN && item.status !== OrderStatus.DELIVERED)
                  .map(item => (
                    <div 
                        key={item.id} 
                        className={`p-3 rounded border-l-4 transition-all
                            ${item.status === OrderStatus.PENDING ? 'bg-slate-700 border-yellow-500' : ''}
                            ${item.status === OrderStatus.PREPARING ? 'bg-blue-900/30 border-blue-500' : ''}
                            ${item.status === OrderStatus.READY ? 'bg-green-900/30 border-green-500 opacity-50' : ''}
                        `}
                    >
                        <div className="flex justify-between items-start">
                             <span className="font-bold text-lg">{item.quantity}x {item.productName}</span>
                             {item.status === OrderStatus.PENDING && (
                                 <button 
                                    onClick={() => updateItemStatus(order.id, item.id, OrderStatus.PREPARING)}
                                    className="text-xs bg-yellow-600 px-2 py-1 rounded text-white hover:bg-yellow-500"
                                >
                                    Iniciar
                                </button>
                             )}
                             {item.status === OrderStatus.PREPARING && (
                                 <button 
                                    onClick={() => updateItemStatus(order.id, item.id, OrderStatus.READY)}
                                    className="text-xs bg-green-600 px-2 py-1 rounded text-white hover:bg-green-500 flex items-center gap-1"
                                >
                                    <Check size={12}/> Pronto
                                </button>
                             )}
                              {item.status === OrderStatus.READY && (
                                 <span className="text-xs text-green-400 font-bold">PRONTO</span>
                             )}
                        </div>
                        {item.notes && (
                            <div className="text-red-300 italic text-sm mt-1 bg-red-900/20 p-1 rounded">
                                " {item.notes} "
                            </div>
                        )}
                    </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};