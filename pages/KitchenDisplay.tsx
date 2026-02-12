
import React, { useEffect, useRef, useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useMenu } from '../context/MenuContext';
import { useOrder } from '../context/OrderContext';
import { OrderStatus, ProductType, OrderItem } from '../types';
import { Clock, Check, ChefHat, CheckCircle, AlertTriangle, Volume2, Zap, Plus } from 'lucide-react';

const BELL_SOUND_BASE64 = "data:audio/mp3;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAG84AA0WAgAAAAAAABZsAAAAtAAAAAAAABaAAAAAABZAAABcAAABjAAAA//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAG84AA0WAgAAAAAAABZsAAAAtAAAAAAAABaAAAAAABZAAABcAAABjAAAA"; 

export const KitchenDisplay: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: menuState } = useMenu();
  const { state: orderState, dispatch: orderDispatch } = useOrder();
  
  // State for triggering re-render to "release" buffered orders
  const [, setTick] = useState(0);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevOrdersCount = useRef(0);
  const wakeLockRef = useRef<any>(null);

  // --- FILTER LOGIC ---
  const isKitchenItem = (item: OrderItem) => {
      const product = menuState.products.find(p => p.id === item.productId);
      // Se não achar o produto (deletado?), assume KITCHEN por segurança se o tipo gravado for KITCHEN
      const isDrink = product ? product.category === 'Bebidas' : false;
      return item.productType === ProductType.KITCHEN && !isDrink;
  };

  // Grace period setting
  const graceMinutes = restState.businessInfo?.orderGracePeriodMinutes || 0;

  // Filter orders by grace period
  const activeOrders = orderState.orders.filter(order => {
      // Pedidos cancelados nunca aparecem
      if (order.status === 'CANCELLED') return false;

      // Cálculo do arrependimento
      const now = new Date().getTime();
      const orderTime = new Date(order.timestamp).getTime();
      const diffMinutes = (now - orderTime) / 60000;

      // Se ainda estiver no tempo de arrependimento, some da cozinha
      if (diffMinutes < graceMinutes) return false;

      return order.items.some(item => 
          isKitchenItem(item) && 
          (item.status === OrderStatus.PENDING || item.status === OrderStatus.PREPARING)
      );
  });

  // Effect to re-check timers every 10 seconds
  useEffect(() => {
      const interval = setInterval(() => setTick(t => t + 1), 10000);
      return () => clearInterval(interval);
  }, []);

  // --- WAKE LOCK ---
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('KDS Wake Lock Ativo');
      }
    } catch (err) {
      console.error('Erro Wake Lock:', err);
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && orderState.audioUnlocked) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (wakeLockRef.current) wakeLockRef.current.release();
    };
  }, [orderState.audioUnlocked]);

  // --- AUDIO LOGIC ---
  useEffect(() => {
      audioRef.current = new Audio(BELL_SOUND_BASE64);
      prevOrdersCount.current = activeOrders.length;
  }, []);

  useEffect(() => {
      if (activeOrders.length > prevOrdersCount.current) {
          if (orderState.audioUnlocked) {
              audioRef.current?.play().catch(err => console.warn("Autoplay bloqueado:", err));
              if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          }
      }
      prevOrdersCount.current = activeOrders.length;
  }, [activeOrders.length, orderState.audioUnlocked]);

  const enableAudio = () => {
      if (audioRef.current) {
          audioRef.current.play()
            .then(() => {
                orderDispatch({ type: 'UNLOCK_AUDIO' });
                requestWakeLock();
            })
            .catch(err => {
                console.error("Erro audio", err);
                alert("Verifique permissões de áudio.");
            });
      } else {
          orderDispatch({ type: 'UNLOCK_AUDIO' });
          requestWakeLock();
      }
  };

  const updateItemStatus = (orderId: string, itemId: string, nextStatus: OrderStatus) => {
    orderDispatch({ type: 'UPDATE_ITEM_STATUS', orderId, itemId, status: nextStatus });
  };

  // Atualiza status do grupo (Item Principal + Extras)
  const updateGroupStatus = (orderId: string, mainItem: OrderItem, extras: OrderItem[], nextStatus: OrderStatus) => {
      updateItemStatus(orderId, mainItem.id, nextStatus);
      extras.forEach(extra => {
          // Só atualiza o extra se ele não estiver já num status mais avançado (opcional, mas seguro)
          if (extra.status !== nextStatus && extra.status !== OrderStatus.DELIVERED) {
              updateItemStatus(orderId, extra.id, nextStatus);
          }
      });
  };

  const completeAllOrderItems = (orderId: string) => {
      const order = orderState.orders.find(o => o.id === orderId);
      if(!order) return;
      order.items.forEach(item => {
          if(isKitchenItem(item) && (item.status === OrderStatus.PENDING || item.status === OrderStatus.PREPARING)) {
              updateItemStatus(orderId, item.id, OrderStatus.READY);
          }
      });
  };

  // --- GROUPING LOGIC (Main Product + Extras) ---
  const groupOrderItems = (items: OrderItem[]) => {
      const grouped: { main: OrderItem, extras: OrderItem[] }[] = [];
      
      // Filtra apenas itens de cozinha e não entregues/cancelados
      const kitchenItems = items.filter(item => 
          isKitchenItem(item) && 
          item.status !== OrderStatus.DELIVERED && 
          item.status !== OrderStatus.CANCELLED
      );

      kitchenItems.forEach(item => {
          const product = menuState.products.find(p => p.id === item.productId);
          // Verifica se é extra via flag do produto OU via anotação de sistema (fallback)
          const isExtra = product?.isExtra || item.notes?.includes('[ADICIONAL');

          if (isExtra && grouped.length > 0) {
              // Se for extra, anexa ao último item principal adicionado
              // Isso assume que o array vem ordenado por inserção (o que é padrão do Supabase/SQL)
              grouped[grouped.length - 1].extras.push(item);
          } else {
              // Se for item principal (ou extra órfão), cria novo grupo
              grouped.push({ main: item, extras: [] });
          }
      });

      return grouped;
  };

  if (!orderState.audioUnlocked) {
      return (
          <div className="h-full bg-slate-900 flex items-center justify-center p-4">
              <div className="text-center text-white space-y-6 max-w-md bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
                  <div className="bg-slate-900 p-6 rounded-full inline-block mb-4 shadow-inner animate-pulse border-2 border-yellow-500">
                      <ChefHat size={64} className="text-yellow-500" />
                  </div>
                  <h1 className="text-3xl font-bold">KDS - Cozinha</h1>
                  <p className="text-slate-400">
                      O sistema precisa permissão para tocar o alarme e <strong>manter a tela ligada</strong>.
                  </p>
                  <button onClick={enableAudio} className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-3 w-full text-xl active:scale-95">
                      <Volume2 size={28} /> ATIVAR SISTEMA
                  </button>
                  <p className="text-xs text-slate-500 mt-4">Recomendamos usar o navegador em tela cheia (F11).</p>
              </div>
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 text-slate-100 p-4 overflow-hidden">
      <header className="mb-6 flex justify-between items-center shrink-0">
        <h1 className="text-3xl font-bold flex items-center gap-3">
            <ChefHat className="text-yellow-500" /> Cozinha (KDS)
        </h1>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm bg-slate-800 px-3 py-1 rounded-full text-green-400 border border-green-900">
                <Zap size={14} /> Tela Ativa
            </div>
            <div className="text-xl font-mono text-yellow-400">
                {new Date().toLocaleTimeString()}
            </div>
        </div>
      </header>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 kds-scroll">
        {activeOrders.length === 0 && (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                <ChefHat size={64} className="opacity-20"/>
                <div className="text-2xl font-bold">Sem Pedidos Pendentes</div>
                <p className="text-slate-500">Tudo limpo por aqui, chef!</p>
            </div>
        )}
        
        {activeOrders.map(order => {
          const table = orderState.tables.find(t => t.id === order.tableId);
          const elapsedMinutes = Math.floor((new Date().getTime() - new Date(order.timestamp).getTime()) / 60000);
          const isLate = elapsedMinutes > 20;
          const groupedItems = groupOrderItems(order.items);
          
          return (
            <div key={order.id} className="min-w-[320px] max-w-[320px] bg-slate-800 rounded-xl overflow-hidden border border-slate-700 flex flex-col shadow-xl animate-fade-in h-full max-h-full">
              <div className={`p-4 flex justify-between items-center shrink-0 ${isLate ? 'bg-red-700 animate-pulse' : 'bg-slate-700'}`}>
                <div><div className="font-bold text-3xl">Mesa {table?.number}</div><div className="text-xs opacity-75">#{order.id.slice(0,4)}</div></div>
                <div className="flex flex-col items-end"><div className="flex items-center gap-1 text-lg font-mono font-bold bg-black/20 px-2 rounded"><Clock size={18} /> {elapsedMinutes}m</div></div>
              </div>
              <div className="bg-slate-750 p-2 border-b border-slate-700 flex justify-end shrink-0">
                  <button onClick={() => completeAllOrderItems(order.id)} className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-2 rounded flex items-center gap-2 font-bold w-full justify-center transition-colors"><CheckCircle size={14}/> CONCLUIR TODOS</button>
              </div>
              <div className="p-2 flex-1 space-y-2 overflow-y-auto">
                {groupedItems.map(({ main, extras }) => {
                    const isGroupReady = main.status === OrderStatus.READY;
                    return (
                        <div key={main.id} className={`p-3 rounded-lg border-l-4 transition-all relative ${main.status === OrderStatus.PENDING ? 'bg-slate-700 border-yellow-500 animate-[pulse_2s_infinite]' : ''} ${main.status === OrderStatus.PREPARING ? 'bg-blue-900/40 border-blue-500' : ''} ${main.status === OrderStatus.READY ? 'bg-green-900/40 border-green-500 opacity-60 grayscale' : ''}`}>
                            {/* Main Item */}
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-xl text-white">{main.quantity}x {main.productName}</span>
                            </div>
                            
                            {/* Observações do Item Principal */}
                            {main.notes && <div className="bg-yellow-100 text-red-700 font-bold text-sm p-2 rounded border-2 border-red-500 flex items-start gap-2 mb-2 shadow-sm animate-pulse"><AlertTriangle size={16} className="shrink-0 mt-0.5" fill="orange" /> <span className="uppercase">{main.notes}</span></div>}

                            {/* EXTRAS (Adicionais) aninhados */}
                            {extras.length > 0 && (
                                <div className="mt-2 mb-2 pl-3 border-l-2 border-slate-600 space-y-1">
                                    {extras.map(extra => (
                                        <div key={extra.id} className="flex items-center gap-2 text-slate-300 text-sm bg-slate-800/50 p-1.5 rounded">
                                            <Plus size={12} className="text-green-400" />
                                            <span className="font-bold">{extra.quantity}x {extra.productName}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-end gap-2 mt-2">
                                {main.status === OrderStatus.PENDING && (
                                    <button 
                                        onClick={() => updateGroupStatus(order.id, main, extras, OrderStatus.PREPARING)} 
                                        className="text-xs bg-yellow-600 px-3 py-2 rounded text-white hover:bg-yellow-500 font-bold w-full"
                                    >
                                        INICIAR PREPARO
                                    </button>
                                )}
                                {main.status === OrderStatus.PREPARING && (
                                    <button 
                                        onClick={() => updateGroupStatus(order.id, main, extras, OrderStatus.READY)} 
                                        className="text-xs bg-green-600 px-3 py-2 rounded text-white hover:bg-green-500 flex items-center justify-center gap-1 font-bold w-full"
                                    >
                                        <Check size={14}/> PRONTO
                                    </button>
                                )}
                                {main.status === OrderStatus.READY && (
                                    <span className="text-xs text-green-400 font-bold border border-green-500 px-2 py-1 rounded w-full text-center">PRONTO</span>
                                )}
                            </div>
                        </div>
                    );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
