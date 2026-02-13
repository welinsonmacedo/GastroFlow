
import React, { useState, useEffect, useRef } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useMenu } from '../context/MenuContext';
import { useOrder } from '../context/OrderContext';
import { useUI } from '../context/UIContext';
import { TableStatus, Product, OrderStatus } from '../types';
import { Button } from '../components/Button';
import { WaiterProductModal, OpenTableModal, TableActionsModal } from '../components/modals/WaiterModals';
import { Bell, Plus, Search, ShoppingCart, ArrowLeft, Utensils, Trash2, Clock, CheckCircle, ChevronUp, ChevronDown, Zap } from 'lucide-react';

const FALLBACK_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export const WaiterApp: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: menuState } = useMenu();
  const { state: orderState, dispatch: orderDispatch } = useOrder();
  const [, setTick] = useState(0);
  
  const { showAlert } = useUI();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [orderingTableId, setOrderingTableId] = useState<string | null>(null);
  const [selectedTableForOpen, setSelectedTableForOpen] = useState<string | null>(null);
  const [selectedTableForAction, setSelectedTableForAction] = useState<string | null>(null);
  const [cart, setCart] = useState<{ product: Product; quantity: number; notes: string; extras?: Product[] }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  
  // Drawer de Itens Prontos
  const [isServingDrawerOpen, setIsServingDrawerOpen] = useState(false);
  
  const [productModal, setProductModal] = useState<Product | null>(null);

  const pendingCalls = orderState.serviceCalls.filter(c => c.status === 'PENDING');
  const graceMinutes = restState.businessInfo?.orderGracePeriodMinutes || 0;

  // Lógica para capturar itens que precisam ser servidos
  const readyItems = orderState.orders.flatMap(order => {
      // Ignora pedidos já pagos ou cancelados
      if (order.isPaid || order.status === 'CANCELLED') return [];

      return order.items
          .filter(item => {
              // Filtra Adicionais (não aparecem como itens de entrega, pois acompanham o principal)
              const product = menuState.products.find(p => p.id === item.productId);
              const isExtra = product?.isExtra || item.notes?.includes('[ADICIONAL');
              if (isExtra) return false;

              // 1. Itens marcados como PRONTO pela cozinha
              if (item.status === OrderStatus.READY) return true;
              
              // 2. Bebidas Imediatas (Pendentes e com a flag [IMEDIATA])
              // Estas não passam pelo KDS, o garçom deve pegar e entregar direto
              const isImmediate = item.notes?.includes('[IMEDIATA]');
              if (isImmediate && item.status === OrderStatus.PENDING) return true;

              return false;
          })
          .map(item => ({ ...item, orderId: order.id, tableId: order.tableId }));
  });

  useEffect(() => {
      audioRef.current = new Audio(FALLBACK_SOUND_URL);
      audioRef.current.preload = 'auto';
      const interval = setInterval(() => setTick(t => t + 1), 10000);
      return () => clearInterval(interval);
  }, []);

  const enableAudio = () => {
      if (audioRef.current) {
          audioRef.current.play().then(() => { orderDispatch({ type: 'UNLOCK_AUDIO' }); }).catch(err => console.error(err));
      } else {
          orderDispatch({ type: 'UNLOCK_AUDIO' });
      }
  };

  const handleAddToCart = (item: { product: Product, qty: number, note: string, selectedExtraIds: string[] }) => {
      const chosenExtras = item.selectedExtraIds
          .map(id => menuState.products.find(p => p.id === id))
          .filter(Boolean) as Product[];

      setCart(prev => [
          ...prev, 
          { product: item.product, quantity: item.qty, notes: item.note, extras: chosenExtras }
      ]); 
  };

  const submitOrder = async () => {
    if (!orderingTableId || cart.length === 0) return;
    const flattenedItems: { productId: string; quantity: number; notes: string }[] = [];
    cart.forEach(item => {
        flattenedItems.push({ productId: item.product.id, quantity: item.quantity, notes: item.notes });
        item.extras?.forEach(extra => {
            flattenedItems.push({ productId: extra.id, quantity: item.quantity, notes: `[ADICIONAL DE: ${item.product.name}]` });
        });
    });
    // Pedidos feitos pelo garçom pulam a carência (já estão confirmados)
    await orderDispatch({ type: 'PLACE_ORDER', tableId: orderingTableId, items: flattenedItems });
    setCart([]); 
    setOrderingTableId(null);
    showAlert({ title: "Sucesso", message: "Pedido enviado para produção!", type: 'SUCCESS' });
  };

  const handleMarkDelivered = (orderId: string, itemId: string) => {
      orderDispatch({ type: 'UPDATE_ITEM_STATUS', orderId, itemId, status: OrderStatus.DELIVERED });
  };

  if (!orderState.audioUnlocked) {
    return (
        <div className="h-full bg-slate-900 flex items-center justify-center p-4 text-center">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full space-y-6">
                <Bell size={48} className="text-blue-600 mx-auto" />
                <h1 className="text-2xl font-bold">Ativar Sistema</h1>
                <p className="text-gray-500 text-sm">O sistema de áudio e tela precisa ser ativado para alertas em tempo real.</p>
                <button onClick={enableAudio} className="bg-blue-600 text-white font-bold py-4 px-6 rounded-xl w-full shadow-lg">ATIVAR GARÇOM</button>
            </div>
        </div>
    );
  }

  if (orderingTableId) {
      const table = orderState.tables.find(t => t.id === orderingTableId);
      const filteredProducts = menuState.products.filter(p => !p.isExtra && (selectedCategory === 'Todos' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const categories = ['Todos', ...Array.from(new Set(menuState.products.filter(p => !p.isExtra).map(p => p.category)))];

      return (
          <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
              <WaiterProductModal 
                  isOpen={!!productModal} 
                  onClose={() => setProductModal(null)} 
                  product={productModal}
                  onConfirm={handleAddToCart}
              />
              <header className="bg-white border-b p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                      <button onClick={() => setOrderingTableId(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"><ArrowLeft size={24}/></button>
                      <div>
                          <h1 className="font-black text-slate-800 leading-none">Novo Pedido</h1>
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Mesa {table?.number}</span>
                      </div>
                  </div>
                  <div className="bg-blue-600 px-3 py-1.5 rounded-xl font-black text-white shadow-lg shadow-blue-200">
                      R$ {cart.reduce((acc, i) => {
                          const extras = (i.extras || []).reduce((s, e) => s + e.price, 0);
                          return acc + ((i.product.price + extras) * i.quantity);
                      }, 0).toFixed(2)}
                  </div>
              </header>
              <div className="flex flex-1 overflow-hidden">
                  <div className="flex-1 overflow-hidden flex flex-col">
                      <div className="p-4 bg-white border-b space-y-3">
                          <div className="relative">
                              <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                              <input type="text" placeholder="Buscar produto..." className="w-full pl-10 pr-4 py-2 border-2 border-gray-100 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                              {categories.map(cat => (
                                  <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all ${selectedCategory === cat ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-gray-500 border-gray-100'}`}>{cat}</button>
                              ))}
                          </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 content-start pb-24 custom-scrollbar">
                          {filteredProducts.map(product => (
                              <div key={product.id} onClick={() => setProductModal(product)} className="bg-white p-3 rounded-2xl border-2 border-transparent shadow-sm flex justify-between items-center cursor-pointer hover:border-blue-200 active:scale-95 transition-all">
                                  <div className="flex-1 min-w-0 pr-2">
                                      <div className="font-bold text-slate-800 truncate leading-tight">{product.name}</div>
                                      <div className="text-[10px] text-gray-400 font-bold uppercase">{product.category}</div>
                                      <div className="text-sm font-black text-blue-600 mt-1">R$ {product.price.toFixed(2)}</div>
                                  </div>
                                  <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-colors"><Plus size={20} strokeWidth={3} /></div>
                              </div>
                          ))}
                      </div>
                  </div>
                  {cart.length > 0 && (
                      <div className="w-full md:w-80 bg-white border-l shadow-2xl flex flex-col z-20 absolute md:relative bottom-0 h-[60vh] md:h-auto rounded-t-3xl md:rounded-none">
                          <div className="p-5 border-b font-black flex justify-between items-center text-slate-800">
                              <div className="flex items-center gap-2"><ShoppingCart size={20}/> ITENS ({cart.length})</div>
                              <button onClick={() => setCart([])} className="text-[10px] text-red-500 hover:underline uppercase">Limpar</button>
                          </div>
                          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                              {cart.map((item, idx) => (
                                  <div key={idx} className="text-sm border-b border-gray-100 pb-4 last:border-0">
                                      <div className="flex justify-between font-black text-slate-800 mb-1">
                                          <span>{item.quantity}x {item.product.name}</span>
                                          <span>R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                                      </div>
                                      {item.extras?.map(ex => (
                                          <div key={ex.id} className="text-[10px] font-bold text-orange-600 flex justify-between">
                                              <span>+ {ex.name}</span>
                                              <span>R$ {(ex.price * item.quantity).toFixed(2)}</span>
                                          </div>
                                      ))}
                                      {item.notes && <div className="text-[11px] text-blue-500 mt-2 italic bg-blue-50 p-2 rounded-lg leading-tight">"{item.notes}"</div>}
                                  </div>
                              ))}
                          </div>
                          <div className="p-5 border-t bg-gray-50">
                              <Button onClick={submitOrder} className="w-full py-4 text-lg font-black shadow-xl shadow-blue-200">LANÇAR PEDIDO</Button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-100 p-4 lg:p-6 pb-32">
        <header className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Atendimento</h1>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sistema Ativo</span>
            </div>
        </header>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {orderState.tables.map(table => {
                const hasCall = pendingCalls.find(c => c.tableId === table.id);
                
                // Lógica de "Buffered Orders" para o garçom:
                const tableOrders = orderState.orders.filter(o => o.tableId === table.id && !o.isPaid && o.status !== 'CANCELLED');
                const hasBufferedOrder = tableOrders.some(o => {
                    const diffMin = (new Date().getTime() - new Date(o.timestamp).getTime()) / 60000;
                    return diffMin < graceMinutes;
                });

                return (
                    <div 
                        key={table.id} 
                        onClick={() => hasCall ? orderDispatch({ type: 'RESOLVE_WAITER_CALL', callId: hasCall.id }) : (table.status === TableStatus.AVAILABLE ? setSelectedTableForOpen(table.id) : setSelectedTableForAction(table.id))} 
                        className={`p-6 rounded-3xl shadow-sm border-4 flex flex-col items-center justify-center min-h-[140px] transition-all cursor-pointer relative group active:scale-95
                            ${hasCall ? 'bg-red-500 border-red-200 text-white animate-pulse' : 
                              (table.status === TableStatus.OCCUPIED ? 'bg-white border-blue-500 text-slate-800 hover:shadow-lg' : 'bg-gray-100 border-transparent text-slate-400 grayscale')}
                        `}
                    >
                        <div className={`text-4xl font-black mb-1 ${hasCall ? 'text-white' : 'text-slate-800'}`}>{table.number}</div>
                        {hasCall && <Bell size={24} className="absolute top-3 right-3 animate-bounce fill-white" />}
                        
                        {/* Indicador de Pedido Sendo Confirmado */}
                        {hasBufferedOrder && !hasCall && (
                            <div className="absolute top-3 right-3 text-blue-500 animate-spin">
                                <Clock size={20} />
                            </div>
                        )}

                        <div className="text-[10px] font-black uppercase tracking-widest opacity-60">
                            {hasCall ? 'CHAMANDO!' : (table.status === TableStatus.AVAILABLE ? 'LIVRE' : 'OCUPADA')}
                        </div>
                        {table.status === TableStatus.OCCUPIED && (
                            <div className="mt-2 flex flex-col items-center gap-1 w-full px-1">
                                <div className="text-[9px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors truncate max-w-full">
                                    {table.customerName || 'Cliente'}
                                </div>
                                {table.accessCode && (
                                    <div className="text-[10px] font-mono font-black text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 group-hover:bg-white/90 group-hover:text-slate-800">
                                        Cód: {table.accessCode}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>

        {/* --- READY ITEMS DRAWER (PARA SERVIR) --- */}
        {readyItems.length > 0 && (
            <div className={`fixed bottom-0 left-0 right-0 z-40 bg-white shadow-[0_-5px_20px_rgba(0,0,0,0.1)] transition-transform duration-300 rounded-t-3xl border-t border-gray-200 ${isServingDrawerOpen ? 'translate-y-0' : 'translate-y-[calc(100%-80px)]'}`}>
                {/* Handle / Header */}
                <div 
                    onClick={() => setIsServingDrawerOpen(!isServingDrawerOpen)}
                    className="p-4 flex justify-between items-center cursor-pointer bg-yellow-50 rounded-t-3xl border-b border-yellow-100 hover:bg-yellow-100 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-yellow-500 text-white p-2 rounded-full animate-bounce">
                            <Utensils size={20}/>
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 uppercase tracking-tight">Pronto para Servir</h3>
                            <p className="text-xs text-yellow-700 font-bold">{readyItems.length} itens aguardando entrega</p>
                        </div>
                    </div>
                    <div className="text-yellow-600">
                        {isServingDrawerOpen ? <ChevronDown size={24}/> : <ChevronUp size={24}/>}
                    </div>
                </div>

                {/* List Content */}
                <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3 bg-gray-50">
                    {readyItems.map((item, idx) => {
                        const tableNumber = orderState.tables.find(t => t.id === item.tableId)?.number || '?';
                        const isImmediate = item.notes?.includes('[IMEDIATA]');
                        
                        return (
                            <div key={`${item.id}-${idx}`} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center animate-fade-in">
                                <div className="flex items-center gap-4">
                                    <div className="bg-slate-900 text-white w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg">
                                        {tableNumber}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">{item.quantity}x {item.productName}</div>
                                        <div className="flex gap-2 mt-1">
                                            {isImmediate && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black flex items-center gap-1"><Zap size={10}/> IMEDIATA</span>}
                                            {item.notes && <span className="text-[10px] text-gray-500 italic max-w-[150px] truncate">{item.notes}</span>}
                                        </div>
                                    </div>
                                </div>
                                <Button 
                                    onClick={() => handleMarkDelivered(item.orderId, item.id)}
                                    size="sm" 
                                    className="bg-green-600 hover:bg-green-700 text-white shadow-md"
                                >
                                    <CheckCircle size={16} className="mr-1"/> Entregue
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}
        
        <OpenTableModal 
            isOpen={!!selectedTableForOpen} 
            onClose={() => setSelectedTableForOpen(null)} 
            tableId={selectedTableForOpen}
        />

        <TableActionsModal
            isOpen={!!selectedTableForAction}
            onClose={() => setSelectedTableForAction(null)}
            tableId={selectedTableForAction}
            onOrder={() => { setOrderingTableId(selectedTableForAction); setSelectedTableForAction(null); setCart([]); }}
        />
    </div>
  );
};
