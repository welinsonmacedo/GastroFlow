
import React, { useState, useEffect, useRef } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useMenu } from '../context/MenuContext';
import { useOrder } from '../context/OrderContext';
import { useUI } from '../context/UIContext';
import { TableStatus, Product, OrderStatus } from '../types';
import { Button } from '../components/Button';
import { WaiterProductModal, OpenTableModal, TableActionsModal } from '../components/modals/WaiterModals';
import { Bell, Plus, Search, ShoppingCart, ArrowLeft, Utensils, Trash2, Clock, CheckCircle, ChevronUp, ChevronDown, Zap, RefreshCcw } from 'lucide-react';

const FALLBACK_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export const WaiterApp: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: menuState } = useMenu();
  const { state: orderState, dispatch: orderDispatch } = useOrder();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [, setTick] = useState(0);
  const { showAlert } = useUI();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [orderingTableId, setOrderingTableId] = useState<string | null>(null);
  const [selectedTableForOpen, setSelectedTableForOpen] = useState<string | null>(null);
  const [selectedTableForAction, setSelectedTableForAction] = useState<string | null>(null);
  const [cart, setCart] = useState<{ product: Product; quantity: number; notes: string; extras?: Product[] }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [isServingDrawerOpen, setIsServingDrawerOpen] = useState(false);
  const [productModal, setProductModal] = useState<Product | null>(null);

  const pendingCalls = orderState.serviceCalls.filter(c => c.status === 'PENDING');
  const graceMinutes = restState.businessInfo?.orderGracePeriodMinutes || 0;

  const readyItems = orderState.orders.flatMap(order => {
      if (order.isPaid || order.status === 'CANCELLED') return [];
      return order.items.filter(item => {
              const product = menuState.products.find(p => p.id === item.productId);
              if (product?.isExtra || item.notes?.includes('[ADICIONAL')) return false;
              if (item.status === OrderStatus.READY) return true;
              if (item.notes?.includes('[IMEDIATA]') && item.status === OrderStatus.PENDING) return true;
              return false;
          })
          .map(item => ({ ...item, orderId: order.id, tableId: order.tableId }));
  });

  useEffect(() => {
      audioRef.current = new Audio(FALLBACK_SOUND_URL);
      const interval = setInterval(() => setTick(t => t + 1), 10000);
      return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 800);
  };

  const enableAudio = () => {
      if (audioRef.current) {
          audioRef.current.play().then(() => { orderDispatch({ type: 'UNLOCK_AUDIO' }); }).catch(() => {});
      } else {
          orderDispatch({ type: 'UNLOCK_AUDIO' });
      }
  };

  const submitOrder = async () => {
    if (!orderingTableId || cart.length === 0) return;
    const flattenedItems: any[] = [];
    cart.forEach(item => {
        flattenedItems.push({ productId: item.product.id, quantity: item.quantity, notes: item.notes });
        item.extras?.forEach(extra => {
            flattenedItems.push({ productId: extra.id, quantity: item.quantity, notes: `[ADICIONAL DE: ${item.product.name}]` });
        });
    });
    await orderDispatch({ type: 'PLACE_ORDER', tableId: orderingTableId, items: flattenedItems });
    setCart([]); 
    setOrderingTableId(null);
    showAlert({ title: "Sucesso", message: "Pedido enviado para produção!", type: 'SUCCESS' });
  };

  if (!orderState.audioUnlocked) {
    return (
        <div className="h-full bg-slate-950 flex items-center justify-center p-4">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full text-center border border-gray-100">
                <div className="bg-blue-50 p-6 rounded-full inline-block mb-6 text-blue-600">
                    <Bell size={48} className="animate-bounce" />
                </div>
                <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter mb-2">Service App</h1>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">Ative o sistema para receber chamados e avisos de pratos prontos em tempo real.</p>
                <button onClick={enableAudio} className="bg-blue-600 text-white font-black py-5 px-6 rounded-2xl w-full shadow-xl shadow-blue-200 hover:scale-105 transition-all text-lg">ENTRAR NO SALÃO</button>
            </div>
        </div>
    );
  }

  if (orderingTableId) {
      const table = orderState.tables.find(t => t.id === orderingTableId);
      const filteredProducts = menuState.products.filter(p => !p.isExtra && (selectedCategory === 'Todos' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const categories = ['Todos', ...Array.from(new Set(menuState.products.filter(p => !p.isExtra).map(p => p.category)))];

      return (
          <div className="flex flex-col h-full bg-gray-50 overflow-hidden font-sans">
              <WaiterProductModal 
                  isOpen={!!productModal} 
                  onClose={() => setProductModal(null)} 
                  product={productModal} 
                  onConfirm={(item) => {
                      const extras = item.selectedExtraIds
                          .map(id => menuState.products.find(p => p.id === id))
                          .filter((p): p is Product => !!p);
                      setCart([...cart, { 
                          product: item.product, 
                          quantity: item.qty, 
                          notes: item.note, 
                          extras 
                      }]);
                  }} 
              />
              <header className="bg-white/80 backdrop-blur-md border-b p-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
                  <div className="flex items-center gap-3">
                      <button onClick={() => setOrderingTableId(null)} className="p-3 bg-gray-100 hover:bg-gray-200 rounded-2xl text-slate-600 transition-colors"><ArrowLeft size={24}/></button>
                      <div>
                          <h1 className="font-black text-slate-900 leading-none tracking-tight">Novo Pedido</h1>
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Mesa {table?.number}</span>
                      </div>
                  </div>
                  <div className="bg-blue-600 px-4 py-2 rounded-2xl font-black text-white shadow-xl shadow-blue-200">
                      R$ {cart.reduce((acc, i) => acc + ((i.product.price + (i.extras?.reduce((s, e) => s + e.price, 0) || 0)) * i.quantity), 0).toFixed(2)}
                  </div>
              </header>

              <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                  <div className="flex-1 overflow-hidden flex flex-col">
                      <div className="p-4 bg-white border-b space-y-4">
                          <div className="relative group">
                              <Search className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20}/>
                              <input type="text" placeholder="Pesquisar produto..." className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-sm focus:bg-white focus:border-blue-500 outline-none transition-all" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                              {categories.map(cat => (
                                  <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all whitespace-nowrap ${selectedCategory === cat ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-gray-400 border-gray-100'}`}>{cat}</button>
                              ))}
                          </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 content-start pb-32">
                          {filteredProducts.map(product => (
                              <div key={product.id} onClick={() => setProductModal(product)} className="bg-white p-4 rounded-3xl border-2 border-transparent shadow-sm flex justify-between items-center cursor-pointer hover:border-blue-200 active:scale-95 transition-all group">
                                  <div className="flex-1 min-w-0 pr-2">
                                      <div className="font-black text-slate-800 truncate leading-tight">{product.name}</div>
                                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{product.category}</div>
                                      <div className="text-base font-black text-blue-600 mt-2">R$ {product.price.toFixed(2)}</div>
                                  </div>
                                  <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all"><Plus size={22} strokeWidth={3} /></div>
                              </div>
                          ))}
                      </div>
                  </div>

                  {cart.length > 0 && (
                      <div className="w-full md:w-96 bg-white border-t md:border-t-0 md:border-l shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col z-40 fixed md:relative bottom-0 h-[70vh] md:h-auto rounded-t-[3rem] md:rounded-none animate-fade-in">
                          <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                              <div className="flex items-center gap-3"><ShoppingCart className="text-blue-600" size={24}/><span className="font-black text-slate-800 uppercase tracking-tighter text-xl">Resumo</span></div>
                              <button onClick={() => setCart([])} className="text-[10px] font-black text-red-500 uppercase hover:underline">Limpar</button>
                          </div>
                          <div className="flex-1 overflow-y-auto p-6 space-y-4">
                              {cart.map((item, idx) => (
                                  <div key={idx} className="bg-gray-50 p-4 rounded-2xl relative group">
                                      <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-white text-red-500 p-1.5 rounded-full shadow-md border border-red-50 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                      <div className="flex justify-between font-black text-slate-800 mb-1">
                                          <span>{item.quantity}x {item.product.name}</span>
                                          <span className="text-blue-600">R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                                      </div>
                                      {item.extras?.map(ex => (
                                          <div key={ex.id} className="text-[10px] font-bold text-orange-600 ml-4">+ {ex.name} (+ R$ {ex.price.toFixed(2)})</div>
                                      ))}
                                      {item.notes && <div className="text-[11px] text-gray-500 mt-2 italic pl-4 border-l-2 border-blue-200">"{item.notes}"</div>}
                                  </div>
                              ))}
                          </div>
                          <div className="p-6 bg-white border-t safe-area-bottom">
                              <Button onClick={submitOrder} className="w-full py-5 text-xl font-black rounded-3xl shadow-2xl shadow-blue-200">FINALIZAR PEDIDO</Button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-4 lg:p-8 pb-40 font-sans">
        <header className="flex justify-between items-center mb-8 bg-white/60 backdrop-blur-md p-4 rounded-[2rem] border border-white shadow-sm sticky top-0 z-30">
            <div>
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Atendimento</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Status do Salão</p>
            </div>
            <div className="flex items-center gap-3">
                <button 
                    onClick={handleManualRefresh}
                    className={`p-3 rounded-2xl bg-white border border-gray-100 shadow-sm transition-all ${isRefreshing ? 'animate-spin' : 'hover:scale-105 active:scale-95'}`}
                >
                    <RefreshCcw size={20} className="text-blue-600" />
                </button>
                <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-2xl border border-emerald-500/20">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Sincronizado</span>
                </div>
            </div>
        </header>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {orderState.tables.map(table => {
                const hasCall = pendingCalls.find(c => c.tableId === table.id);
                const tableOrders = orderState.orders.filter(o => o.tableId === table.id && !o.isPaid && o.status !== 'CANCELLED');
                const hasBufferedOrder = tableOrders.some(o => (new Date().getTime() - new Date(o.timestamp).getTime()) / 60000 < graceMinutes);

                return (
                    <div 
                        key={table.id} 
                        onClick={() => hasCall ? orderDispatch({ type: 'RESOLVE_WAITER_CALL', callId: hasCall.id }) : (table.status === TableStatus.AVAILABLE ? setSelectedTableForOpen(table.id) : setSelectedTableForAction(table.id))} 
                        className={`p-6 rounded-[2.5rem] shadow-xl border-4 flex flex-col items-center justify-center min-h-[160px] transition-all cursor-pointer relative active:scale-95
                            ${hasCall ? 'bg-red-500 border-red-200 text-white animate-pulse' : 
                              (table.status === TableStatus.OCCUPIED ? 'bg-white border-blue-500 text-slate-800' : 'bg-gray-100 border-transparent text-slate-400 opacity-50')}
                        `}
                    >
                        <div className={`text-5xl font-black mb-1 tracking-tighter ${hasCall ? 'text-white' : 'text-slate-900'}`}>{table.number}</div>
                        {hasCall && <Bell size={28} className="absolute top-4 right-4 animate-bounce" fill="white" />}
                        {hasBufferedOrder && !hasCall && <div className="absolute top-4 right-4 text-blue-500 animate-spin"><Clock size={24} /></div>}

                        <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">
                            {hasCall ? 'CHAMANDO!' : (table.status === TableStatus.AVAILABLE ? 'LIVRE' : 'OCUPADA')}
                        </div>
                        
                        {table.status === TableStatus.OCCUPIED && (
                            <div className="mt-3 bg-blue-50 px-3 py-1 rounded-full text-[10px] font-black text-blue-600 border border-blue-100 truncate max-w-full uppercase tracking-tighter">
                                {table.customerName || 'Cliente'}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>

        {readyItems.length > 0 && (
            <div className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500 ease-in-out ${isServingDrawerOpen ? 'translate-y-0' : 'translate-y-[calc(100%-80px)]'}`}>
                <div onClick={() => setIsServingDrawerOpen(!isServingDrawerOpen)} className="mx-auto max-w-lg bg-emerald-600 p-5 flex justify-between items-center cursor-pointer rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(16,185,129,0.3)] border-b border-emerald-500/20">
                    <div className="flex items-center gap-4 text-white">
                        <div className="bg-white/20 p-2.5 rounded-2xl animate-bounce"><Utensils size={24}/></div>
                        <div>
                            <h3 className="font-black text-lg uppercase tracking-tight leading-none">Pronto para Servir</h3>
                            <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1">{readyItems.length} pratos aguardando</p>
                        </div>
                    </div>
                    <div className="bg-white/10 p-2 rounded-full text-white">{isServingDrawerOpen ? <ChevronDown size={24}/> : <ChevronUp size={24}/>}</div>
                </div>
                <div className="mx-auto max-w-lg max-h-[60vh] overflow-y-auto p-6 space-y-4 bg-white shadow-2xl rounded-b-none border-x border-t border-gray-100 safe-area-bottom">
                    {readyItems.map((item, idx) => (
                        <div key={`${item.id}-${idx}`} className="bg-gray-50 p-5 rounded-[2rem] border-2 border-transparent hover:border-emerald-200 transition-all flex justify-between items-center animate-fade-in shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="bg-slate-900 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg">{orderState.tables.find(t => t.id === item.tableId)?.number}</div>
                                <div>
                                    <div className="font-black text-slate-800">{item.quantity}x {item.productName}</div>
                                    <div className="flex gap-2 mt-1">
                                        {item.notes?.includes('[IMEDIATA]') && <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-lg font-black uppercase tracking-tighter flex items-center gap-1"><Zap size={10}/> Imediata</span>}
                                        {item.notes && <span className="text-[10px] text-gray-400 italic truncate max-w-[140px]">{item.notes}</span>}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => orderDispatch({ type: 'UPDATE_ITEM_STATUS', orderId: item.orderId, itemId: item.id, status: OrderStatus.DELIVERED })} className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-2xl shadow-lg shadow-emerald-600/20 transition-all"><CheckCircle size={24}/></button>
                        </div>
                    ))}
                </div>
            </div>
        )}
        
        <OpenTableModal isOpen={!!selectedTableForOpen} onClose={() => setSelectedTableForOpen(null)} tableId={selectedTableForOpen} />
        <TableActionsModal isOpen={!!selectedTableForAction} onClose={() => setSelectedTableForAction(null)} tableId={selectedTableForAction} onOrder={() => { setOrderingTableId(selectedTableForAction); setSelectedTableForAction(null); setCart([]); }} />
    </div>
  );
};
