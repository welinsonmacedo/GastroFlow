
import React, { useEffect, useRef, useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useMenu } from '../context/MenuContext';
import { useOrder } from '../context/OrderContext';
import { OrderStatus, ProductType, OrderItem } from '../types';
import { Clock, ChefHat, CheckCircle, AlertTriangle, Volume2, Zap, Plus, Printer, RefreshCcw, Bike, ArrowRight } from 'lucide-react';
import { printHtml, getReceiptStyles } from '../utils/printHelper';

const KITCHEN_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/571/571-preview.mp3";

export const KitchenDisplay: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: menuState } = useMenu();
  const { state: orderState, dispatch: orderDispatch } = useOrder();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [, setTick] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevPendingCount = useRef(0);
  const wakeLockRef = useRef<any>(null);

  const isKitchenItem = (item: OrderItem) => {
      const product = menuState.products.find(p => p.id === item.productId);
      const isDrink = product ? product.category === 'Bebidas' : false;
      return item.productType === ProductType.KITCHEN && !isDrink;
  };

  const graceMinutes = restState.businessInfo?.orderGracePeriodMinutes || 0;

  // Filtra pedidos ativos
  const activeOrders = orderState.orders.filter(order => {
      if (order.status === 'CANCELLED') return false;
      const now = new Date().getTime();
      const orderTime = new Date(order.timestamp).getTime();
      const diffMinutes = (now - orderTime) / 60000;
      
      // Respeita o tempo de carência (apenas para Mesa)
      if (order.type === 'DINE_IN' && diffMinutes < graceMinutes) return false;

      return order.items.some(item => 
          isKitchenItem(item) && 
          (item.status === OrderStatus.PENDING || item.status === OrderStatus.PREPARING)
      );
  });

  const currentPendingCount = activeOrders.reduce((acc, order) => {
      return acc + order.items.filter(i => isKitchenItem(i) && i.status === OrderStatus.PENDING).length;
  }, 0);

  useEffect(() => {
      const interval = setInterval(() => setTick(t => t + 1), 10000);
      return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 800);
  };

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) { wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); }
    } catch (err) { console.error('Erro Wake Lock:', err); }
  };

  useEffect(() => {
    audioRef.current = new Audio(KITCHEN_SOUND_URL);
    audioRef.current.volume = 1.0;
    audioRef.current.preload = 'auto'; 
  }, []);

  const playSound = () => {
      if (audioRef.current && orderState.audioUnlocked) {
          audioRef.current.currentTime = 0; 
          audioRef.current.play().catch(e => console.warn("Áudio bloqueado:", e));
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
  };

  useEffect(() => {
      if (orderState.audioUnlocked && currentPendingCount > prevPendingCount.current) {
          console.log("🔔 Novo Pedido na Cozinha!");
          playSound();
      }
      prevPendingCount.current = currentPendingCount;
  }, [currentPendingCount, orderState.audioUnlocked]);

  const enableAudio = () => {
      if (audioRef.current) {
          audioRef.current.play().then(() => {
              orderDispatch({ type: 'UNLOCK_AUDIO' });
              requestWakeLock();
          }).catch(e => {
              orderDispatch({ type: 'UNLOCK_AUDIO' });
          });
      } else {
          orderDispatch({ type: 'UNLOCK_AUDIO' });
          requestWakeLock();
      }
  };

  const updateGroupStatus = (orderId: string, mainItem: OrderItem, extras: OrderItem[], nextStatus: OrderStatus) => {
      orderDispatch({ type: 'UPDATE_ITEM_STATUS', orderId, itemId: mainItem.id, status: nextStatus });
      extras.forEach(extra => {
          orderDispatch({ type: 'UPDATE_ITEM_STATUS', orderId, itemId: extra.id, status: nextStatus });
      });
  };

  const groupOrderItems = (items: OrderItem[]) => {
      const grouped: { main: OrderItem, extras: OrderItem[] }[] = [];
      const kitchenItems = items.filter(item => isKitchenItem(item) && item.status !== OrderStatus.DELIVERED && item.status !== OrderStatus.CANCELLED);

      kitchenItems.forEach(item => {
          const product = menuState.products.find(p => p.id === item.productId);
          const isExtra = product?.isExtra || item.notes?.includes('[ADICIONAL');
          if (isExtra && grouped.length > 0) grouped[grouped.length - 1].extras.push(item);
          else grouped.push({ main: item, extras: [] });
      });
      return grouped;
  };

  const handlePrintOrder = (order: any) => {
      const table = orderState.tables.find(t => t.id === order.tableId);
      const groupedItems = groupOrderItems(order.items);
      const date = new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const title = order.type === 'DELIVERY' ? `DELIVERY - ${order.deliveryInfo?.platform || 'Telefone'}` : `MESA ${table?.number || '?'}`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cozinha</title>
            ${getReceiptStyles()}
        </head>
        <body>
            <div class="header">
                <span class="title">${title}</span>
                <span class="subtitle">Pedido #${order.id.slice(0,4)} • ${date}</span>
                ${order.deliveryInfo ? `<div class="subtitle">${order.deliveryInfo.customerName}</div>` : ''}
            </div>
            ${groupedItems.map(({ main, extras }) => `
                <div style="margin-bottom: 10px; border-bottom: 1px dotted #ccc; padding-bottom: 5px;">
                    <div class="item-row">
                        <span>${main.quantity}x ${main.productName}</span>
                    </div>
                    ${main.notes ? `<div class="note">OBS: ${main.notes}</div>` : ''}
                    ${extras.map(e => `<div class="extras">+ ${e.quantity}x ${e.productName}</div>`).join('')}
                </div>
            `).join('')}
        </body>
        </html>
      `;
      printHtml(html);
  };

  if (!orderState.audioUnlocked) {
      return (
          <div className="h-full bg-slate-900 flex items-center justify-center p-4">
              <div className="text-center text-white space-y-6 max-w-md bg-slate-800 p-8 rounded-[2.5rem] shadow-2xl border border-white/5">
                  <div className="bg-slate-900 p-6 rounded-full inline-block mb-4 border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                      <ChefHat size={64} className="text-emerald-500" />
                  </div>
                  <h1 className="text-3xl font-black uppercase tracking-tighter">Kitchen OS</h1>
                  <p className="text-slate-400 text-sm">O sistema manterá a tela ligada e emitirá alertas sonoros.</p>
                  <button onClick={enableAudio} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 px-8 rounded-2xl shadow-xl w-full text-xl flex items-center justify-center gap-3">
                      <Volume2 size={28} /> ATIVAR COZINHA
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 p-4 overflow-hidden font-sans">
      <header className="mb-6 flex justify-between items-center shrink-0 bg-slate-900/50 p-4 rounded-3xl border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-4">
            <div className="bg-emerald-500 p-2 rounded-xl text-white shadow-lg shadow-emerald-500/20">
                <ChefHat size={24} />
            </div>
            <div>
                <h1 className="text-xl font-black uppercase tracking-tighter leading-none">Cozinha (KDS)</h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Operação em Tempo Real</p>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
            <button onClick={handleManualRefresh} className={`p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all ${isRefreshing ? 'animate-spin' : ''}`}>
                <RefreshCcw size={20} className="text-emerald-400" />
            </button>
            <div className="text-lg font-black font-mono text-white bg-black/40 px-4 py-2 rounded-2xl border border-white/5">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
      </header>

      <div className="flex-1 flex gap-5 overflow-x-auto pb-6 kds-scroll px-1">
        {activeOrders.length === 0 && (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                <div className="bg-slate-900 p-10 rounded-full border border-white/5 opacity-50">
                    <ChefHat size={80} className="text-slate-700"/>
                </div>
                <div className="text-2xl font-black uppercase tracking-widest opacity-30">Tudo limpo, Chef!</div>
            </div>
        )}
        
        {activeOrders.map(order => {
          const table = orderState.tables.find(t => t.id === order.tableId);
          const elapsedMinutes = Math.floor((new Date().getTime() - new Date(order.timestamp).getTime()) / 60000);
          const isLate = elapsedMinutes > 20;
          const groupedItems = groupOrderItems(order.items);
          const isDelivery = order.type === 'DELIVERY';
          const isPDV = order.type === 'PDV';
          const goesToCashier = isDelivery || isPDV;
          
          return (
            <div key={order.id} className={`min-w-[340px] max-w-[340px] bg-slate-900 rounded-[2rem] overflow-hidden border-2 flex flex-col shadow-2xl transition-all h-full ${isLate ? 'border-red-500 ring-4 ring-red-500/10' : (isDelivery ? 'border-orange-500' : (isPDV ? 'border-purple-500' : 'border-white/5'))}`}>
              
              <div className={`p-5 flex justify-between items-center shrink-0 ${isLate ? 'bg-red-600' : (isDelivery ? 'bg-orange-600' : (isPDV ? 'bg-purple-600' : 'bg-slate-800'))}`}>
                <div className="overflow-hidden">
                    {isDelivery ? (
                        <>
                            <div className="flex items-center gap-2 mb-1">
                                <Bike size={20} className="text-white"/>
                                <span className="font-black text-xl tracking-tighter uppercase truncate">{order.deliveryInfo?.platform || 'DELIVERY'}</span>
                            </div>
                            <div className="text-[10px] font-bold opacity-80 uppercase tracking-widest truncate">{order.deliveryInfo?.customerName || 'Cliente'}</div>
                        </>
                    ) : isPDV ? (
                        <>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-black text-xl tracking-tighter uppercase truncate">BALCÃO</span>
                            </div>
                            <div className="text-[10px] font-bold opacity-80 uppercase tracking-widest truncate">{order.deliveryInfo?.customerName || 'Retirada'}</div>
                        </>
                    ) : (
                        <>
                            <div className="font-black text-3xl tracking-tighter uppercase">Mesa {table?.number || '?'}</div>
                            <div className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Ticket #{order.id.slice(0,4)}</div>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2 text-xl font-black font-mono bg-black/30 px-3 py-1.5 rounded-2xl shrink-0">
                    <Clock size={20} className={isLate ? 'animate-bounce' : ''} /> {elapsedMinutes}m
                </div>
              </div>
              
              <div className="bg-slate-850 p-3 border-b border-white/5 flex justify-between shrink-0 gap-2">
                  <button onClick={() => handlePrintOrder(order)} className="bg-slate-700 hover:bg-slate-600 p-3 rounded-2xl text-white transition-all"><Printer size={20} /></button>
                  <button onClick={() => order.items.forEach(i => isKitchenItem(i) && orderDispatch({ type: 'UPDATE_ITEM_STATUS', orderId: order.id, itemId: i.id, status: OrderStatus.READY }))} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-2xl font-black text-xs flex-1 transition-all uppercase tracking-tight">Concluir Tudo</button>
              </div>

              <div className="p-4 flex-1 space-y-3 overflow-y-auto custom-scrollbar">
                {groupedItems.map(({ main, extras }) => (
                    <div key={main.id} className={`p-4 rounded-3xl border-2 transition-all relative flex flex-col gap-3 ${main.status === OrderStatus.PENDING ? 'bg-slate-800 border-emerald-500/20' : 'bg-blue-600/10 border-blue-500/30'}`}>
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-black text-2xl text-white tracking-tight leading-none">{main.quantity}x {main.productName}</span>
                            </div>
                            {main.notes && (
                                <div className="bg-yellow-500/10 border-2 border-yellow-500/30 text-yellow-500 font-black text-xs p-3 rounded-2xl flex items-start gap-2 mb-2 animate-pulse">
                                    <AlertTriangle size={16} className="shrink-0" />
                                    <span className="uppercase">{main.notes}</span>
                                </div>
                            )}
                            {extras.length > 0 && (
                                <div className="mt-2 pl-4 border-l-2 border-dashed border-white/20 space-y-1">
                                    {extras.map(e => (
                                        <div key={e.id} className="text-emerald-300 text-sm font-bold flex items-center gap-2">
                                            <Plus size={12} /> {e.quantity}x {e.productName}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 mt-auto">
                            {main.status === OrderStatus.PENDING ? (
                                <button onClick={() => updateGroupStatus(order.id, main, extras, OrderStatus.PREPARING)} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all">Começar</button>
                            ) : (
                                <button onClick={() => updateGroupStatus(order.id, main, extras, OrderStatus.READY)} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2">
                                    {goesToCashier ? <span className="flex items-center gap-2"><ArrowRight size={18}/> Enviar ao Caixa</span> : <span className="flex items-center gap-2"><CheckCircle size={18}/> Pronto!</span>}
                                </button>
                            )}
                        </div>
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
