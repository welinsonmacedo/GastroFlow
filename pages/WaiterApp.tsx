
import React, { useState, useEffect, useRef } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useMenu } from '../context/MenuContext';
import { useOrder } from '../context/OrderContext';
import { useInventory } from '../context/InventoryContext'; // Adicionado InventoryContext
import { useUI } from '../context/UIContext';
import { TableStatus, Product, OrderStatus } from '../types';
import { Button } from '../components/Button';
import { WaiterProductModal, OpenTableModal, TableActionsModal } from '../components/modals/WaiterModals';
import { Bell, Plus, Search, ShoppingCart, ArrowLeft, Utensils, Trash2, Clock, CheckCircle, ChevronUp, ChevronDown, Zap, RefreshCcw, Lock, List, Grid, History, AlertTriangle, PackageX } from 'lucide-react';
import { Modal } from '../components/Modal';

const FALLBACK_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export const WaiterApp: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: menuState } = useMenu();
  const { state: orderState, dispatch: orderDispatch } = useOrder();
  const { state: invState } = useInventory(); // Estado do estoque em tempo real
  
  const [activeTab, setActiveTab] = useState<'TABLES' | 'ORDERS'>('TABLES');
  const [showHistory, setShowHistory] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [, setTick] = useState(0);
  const { showAlert } = useUI();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [orderingTableId, setOrderingTableId] = useState<string | null>(null);
  const [selectedTableForOpen, setSelectedTableForOpen] = useState<string | null>(null);
  const [selectedTableForAction, setSelectedTableForAction] = useState<string | null>(null);
  
  // Confirmação de Chamado
  const [confirmCallId, setConfirmCallId] = useState<string | null>(null);
  const [callingTableNumber, setCallingTableNumber] = useState<number | null>(null);

  const [cart, setCart] = useState<{ product: Product; quantity: number; notes: string; extras?: Product[] }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [isServingDrawerOpen, setIsServingDrawerOpen] = useState(false);
  const [productModal, setProductModal] = useState<Product | null>(null);

  const pendingCalls = orderState.serviceCalls.filter(c => c.status === 'PENDING');
  const graceMinutes = restState.businessInfo?.orderGracePeriodMinutes || 0;

  // Itens prontos para servir (Drawer Inferior)
  const readyItems = orderState.orders.flatMap(order => {
      if (order.isPaid || order.status === 'CANCELLED') return [];

      // Verifica se existe algum item de COZINHA (KITCHEN) com status READY neste pedido
      // Isso serve de gatilho para liberar as bebidas "Com Comida"
      const hasKitchenFoodReady = order.items.some(i => 
          i.status === OrderStatus.READY && 
          i.productType === 'KITCHEN'
      );

      return order.items.filter(item => {
              const product = menuState.products.find(p => p.id === item.productId);
              if (product?.isExtra || item.notes?.includes('[ADICIONAL')) return false;
              
              // 1. Se o item já está pronto (Cozinha marcou READY)
              if (item.status === OrderStatus.READY) return true;
              
              // 2. Bebidas Imediatas (aparecem assim que pedidas, se ainda PENDING)
              if (item.notes?.includes('[IMEDIATA]') && item.status === OrderStatus.PENDING) return true;

              // 3. Bebidas "Com Comida" (aparecem visualmente apenas se houver comida pronta no pedido)
              if (item.notes?.includes('[COM COMIDA]') && item.status === OrderStatus.PENDING) {
                  return hasKitchenFoodReady;
              }

              return false;
          })
          .map(item => ({ 
              ...item, 
              orderId: order.id, 
              tableId: order.tableId,
              // Flag para UI saber se foi liberado pelo prato
              isTriggeredByFood: hasKitchenFoodReady && item.notes?.includes('[COM COMIDA]')
          }));
  });

  // Lógica de Filtragem da Aba Pedidos
  const baseOrders = orderState.orders
      .filter(o => !o.isPaid && o.status !== 'CANCELLED')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const displayedOrders = baseOrders.filter(o => 
      showHistory ? o.status === 'DELIVERED' : o.status !== 'DELIVERED'
  );

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
        // Marca que foi o garçom nas notas
        const waiterNote = item.notes ? `${item.notes} [GARÇOM]` : `[GARÇOM]`;
        
        flattenedItems.push({ productId: item.product.id, quantity: item.quantity, notes: waiterNote });
        
        item.extras?.forEach(extra => {
            flattenedItems.push({ productId: extra.id, quantity: item.quantity, notes: `[ADICIONAL DE: ${item.product.name}] [GARÇOM]` });
        });
    });
    await orderDispatch({ type: 'PLACE_ORDER', tableId: orderingTableId, items: flattenedItems });
    setCart([]); 
    setOrderingTableId(null);
    showAlert({ title: "Sucesso", message: "Pedido enviado para produção!", type: 'SUCCESS' });
  };

  const handleResolveCall = () => {
      if (confirmCallId) {
          orderDispatch({ type: 'RESOLVE_WAITER_CALL', callId: confirmCallId });
          setConfirmCallId(null);
          setCallingTableNumber(null);
          showAlert({ title: "Atendido", message: "Chamado finalizado.", type: 'SUCCESS' });
      }
  };

  // Helper para checar estoque de um produto
  const getProductStockStatus = (product: Product) => {
      if (!product.linkedInventoryItemId) return { status: 'OK', qty: 999 };
      
      const stockItem = invState.inventory.find(i => i.id === product.linkedInventoryItemId);
      
      if (!stockItem) return { status: 'OK', qty: 999 };
      
      if (stockItem.quantity <= 0) return { status: 'OUT', qty: 0 };
      if (stockItem.quantity <= stockItem.minQuantity) return { status: 'LOW', qty: stockItem.quantity };
      
      return { status: 'OK', qty: stockItem.quantity };
  };

  // Tela Inicial: Bloqueio de Áudio
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

  // Tela de Lançamento de Pedido (Overlay)
  if (orderingTableId) {
      const table = orderState.tables.find(t => t.id === orderingTableId);
      const filteredProducts = menuState.products.filter(p => !p.isExtra && (selectedCategory === 'Todos' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const categories = ['Todos', ...Array.from(new Set(menuState.products.filter(p => !p.isExtra).map(p => p.category)))];

      return (
          <div className="flex flex-col h-full bg-gray-50 overflow-hidden font-sans fixed inset-0 z-[60]">
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
                          {filteredProducts.map(product => {
                              const stockInfo = getProductStockStatus(product);
                              const isOutOfStock = stockInfo.status === 'OUT';
                              const isLowStock = stockInfo.status === 'LOW';

                              return (
                                  <div 
                                    key={product.id} 
                                    onClick={() => !isOutOfStock && setProductModal(product)} 
                                    className={`bg-white p-4 rounded-3xl border-2 border-transparent shadow-sm flex justify-between items-center cursor-pointer transition-all group relative overflow-hidden
                                        ${isOutOfStock ? 'opacity-60 grayscale cursor-not-allowed bg-gray-100' : 'hover:border-blue-200 active:scale-95'}
                                    `}
                                  >
                                      {/* Faixa Esgotado */}
                                      {isOutOfStock && (
                                          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
                                              <span className="bg-red-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg transform -rotate-6 border-2 border-white">Esgotado</span>
                                          </div>
                                      )}

                                      <div className="flex-1 min-w-0 pr-2">
                                          <div className="font-black text-slate-800 truncate leading-tight">{product.name}</div>
                                          <div className="flex items-center gap-2 mt-1">
                                              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{product.category}</div>
                                              {isLowStock && !isOutOfStock && (
                                                  <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                                      <AlertTriangle size={8}/> Restam {stockInfo.qty}
                                                  </span>
                                              )}
                                          </div>
                                          <div className="text-base font-black text-blue-600 mt-2">R$ {product.price.toFixed(2)}</div>
                                      </div>
                                      <div className={`p-3 rounded-2xl shadow-inner transition-all ${isOutOfStock ? 'bg-gray-200 text-gray-400' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                                          {isOutOfStock ? <PackageX size={22} /> : <Plus size={22} strokeWidth={3} />}
                                      </div>
                                  </div>
                              );
                          })}
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

  // TELA PRINCIPAL DO GARÇOM
  return (
    <div className="h-full flex flex-col bg-gray-50 font-sans">
        {/* Header */}
        <header className="flex justify-between items-center bg-white/60 backdrop-blur-md p-4 rounded-b-[2rem] border-b border-white shadow-sm sticky top-0 z-30 shrink-0">
            <div>
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Atendimento</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {activeTab === 'TABLES' ? 'Mapa de Mesas' : 'Fila de Pedidos'}
                </p>
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
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hidden sm:inline">Online</span>
                </div>
            </div>
        </header>
        
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 pb-40">
            
            {/* VIEW: TABLES */}
            {activeTab === 'TABLES' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {orderState.tables.map(table => {
                        const hasCall = pendingCalls.find(c => c.tableId === table.id);
                        const tableOrders = orderState.orders.filter(o => o.tableId === table.id && !o.isPaid && o.status !== 'CANCELLED');
                        const hasBufferedOrder = tableOrders.some(o => (new Date().getTime() - new Date(o.timestamp).getTime()) / 60000 < graceMinutes);

                        return (
                            <div 
                                key={table.id} 
                                onClick={() => {
                                    if (hasCall) {
                                        setConfirmCallId(hasCall.id);
                                        setCallingTableNumber(table.number);
                                    } else if (table.status === TableStatus.AVAILABLE) {
                                        setSelectedTableForOpen(table.id);
                                    } else {
                                        setSelectedTableForAction(table.id);
                                    }
                                }} 
                                className={`p-4 rounded-[2rem] shadow-sm border-4 flex flex-col items-center justify-between min-h-[140px] transition-all cursor-pointer relative active:scale-95
                                    ${hasCall ? 'bg-red-500 border-red-200 text-white animate-pulse shadow-red-500/30' : 
                                    (table.status === TableStatus.OCCUPIED ? 'bg-white border-blue-500 text-slate-800' : 'bg-gray-100 border-transparent text-slate-400 opacity-60')}
                                `}
                            >
                                <div className="w-full flex justify-between items-start">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                        {hasCall ? 'CHAMANDO!' : (table.status === TableStatus.AVAILABLE ? 'LIVRE' : 'OCUPADA')}
                                    </span>
                                    {table.status === TableStatus.OCCUPIED && (
                                        <div className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1">
                                            <Lock size={8}/> {table.accessCode}
                                        </div>
                                    )}
                                </div>

                                <div className={`text-5xl font-black tracking-tighter ${hasCall ? 'text-white' : 'text-slate-900'}`}>{table.number}</div>
                                
                                {hasCall && <Bell size={28} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" fill="white" />}
                                {hasBufferedOrder && !hasCall && <div className="absolute top-4 right-4 text-blue-500 animate-spin"><Clock size={20} /></div>}

                                <div className="w-full mt-2">
                                    {table.status === TableStatus.OCCUPIED && (
                                        <div className="bg-blue-50 px-3 py-1.5 rounded-xl text-[10px] font-black text-blue-600 border border-blue-100 truncate w-full text-center uppercase tracking-tight">
                                            {table.customerName || 'Cliente'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* VIEW: ORDERS */}
            {activeTab === 'ORDERS' && (
                <div className="space-y-4">
                    {/* Header da Lista de Pedidos */}
                    <div className="flex justify-between items-center mb-6 px-2">
                        <h2 className={`font-black text-lg ${showHistory ? 'text-slate-400' : 'text-slate-800'}`}>
                            {showHistory ? 'Histórico (Entregues)' : 'Em Andamento'}
                        </h2>
                        <button 
                            onClick={() => setShowHistory(!showHistory)} 
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all
                                ${showHistory ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-100 border border-gray-200'}
                            `}
                        >
                            <History size={16} /> 
                            {showHistory ? 'Voltar para Ativos' : 'Ver Histórico'}
                        </button>
                    </div>

                    {displayedOrders.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                            <Utensils size={64} className="text-slate-300 mb-4"/>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">
                                {showHistory ? 'Nenhum pedido entregue recentemente' : 'Sem pedidos ativos no momento'}
                            </p>
                        </div>
                    )}

                    {displayedOrders.map(order => {
                        const table = orderState.tables.find(t => t.id === order.tableId);
                        return (
                            <div key={order.id} className={`bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 ${order.status === 'DELIVERED' ? 'opacity-70' : ''}`}>
                                <div className="flex justify-between items-center border-b pb-3 mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-slate-900 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg">{table?.number}</div>
                                        <div>
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Pedido #{order.id.slice(0,4)}</p>
                                            <p className="text-[10px] text-slate-400">{new Date(order.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase ${order.status === 'DELIVERED' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {order.status === 'PENDING' ? 'Na Fila' : order.status === 'PREPARING' ? 'Preparando' : order.status === 'READY' ? 'Pronto' : 'Entregue'}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {order.items.map(item => (
                                        <div key={item.id} className="flex justify-between items-start text-sm">
                                            <div className="flex-1">
                                                <span className="font-bold text-slate-700">{item.quantity}x {item.productName}</span>
                                                {item.notes && <p className="text-[10px] text-gray-400 italic">{item.notes}</p>}
                                            </div>
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${item.status === 'READY' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{item.status}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* Bottom Tab Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 flex justify-around items-center z-40 safe-area-bottom">
            <button onClick={() => setActiveTab('TABLES')} className={`flex flex-col items-center gap-1 p-2 rounded-2xl flex-1 transition-all ${activeTab === 'TABLES' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>
                <Grid size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest">Mesas</span>
            </button>
            <button onClick={() => setActiveTab('ORDERS')} className={`flex flex-col items-center gap-1 p-2 rounded-2xl flex-1 transition-all ${activeTab === 'ORDERS' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>
                <List size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest">Pedidos</span>
            </button>
        </div>

        {/* Drawer de Prontos */}
        {readyItems.length > 0 && (
            <div className={`fixed bottom-[80px] left-0 right-0 z-50 transition-transform duration-500 ease-in-out ${isServingDrawerOpen ? 'translate-y-0' : 'translate-y-[calc(100%-60px)]'}`}>
                <div onClick={() => setIsServingDrawerOpen(!isServingDrawerOpen)} className="mx-4 bg-emerald-600 p-4 flex justify-between items-center cursor-pointer rounded-t-[2rem] shadow-[0_-10px_40px_rgba(16,185,129,0.3)] border-b border-emerald-500/20">
                    <div className="flex items-center gap-3 text-white">
                        <div className="bg-white/20 p-2 rounded-xl animate-bounce"><Utensils size={20}/></div>
                        <div>
                            <h3 className="font-black text-sm uppercase tracking-tight leading-none">Pronto para Servir</h3>
                            <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-0.5">{readyItems.length} itens aguardando</p>
                        </div>
                    </div>
                    <div className="bg-white/10 p-1.5 rounded-full text-white">{isServingDrawerOpen ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}</div>
                </div>
                <div className="mx-4 max-h-[50vh] overflow-y-auto p-4 space-y-3 bg-white shadow-2xl rounded-b-none border-x border-t border-gray-100 safe-area-bottom pb-6">
                    {readyItems.map((item, idx) => (
                        <div key={`${item.id}-${idx}`} className="bg-gray-50 p-4 rounded-[1.5rem] border-2 border-transparent hover:border-emerald-200 transition-all flex justify-between items-center animate-fade-in shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="bg-slate-900 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-lg">{orderState.tables.find(t => t.id === item.tableId)?.number}</div>
                                <div>
                                    <div className="font-black text-slate-800 text-sm">{item.quantity}x {item.productName}</div>
                                    <div className="flex gap-2 mt-0.5 flex-wrap">
                                        {item.notes?.includes('[IMEDIATA]') && <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-lg font-black uppercase tracking-tighter flex items-center gap-1"><Zap size={10}/> Imediata</span>}
                                        {/* Badge específica para bebida liberada com comida */}
                                        {(item as any).isTriggeredByFood && <span className="text-[9px] bg-purple-600 text-white px-2 py-0.5 rounded-lg font-black uppercase tracking-tighter flex items-center gap-1"><Utensils size={10}/> Liberado c/ Prato</span>}
                                        {item.notes && !item.notes.includes('[IMEDIATA]') && !item.notes.includes('[COM COMIDA]') && <span className="text-[10px] text-gray-400 italic truncate max-w-[120px]">{item.notes}</span>}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => orderDispatch({ type: 'UPDATE_ITEM_STATUS', orderId: item.orderId, itemId: item.id, status: OrderStatus.DELIVERED })} className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all"><CheckCircle size={20}/></button>
                        </div>
                    ))}
                </div>
            </div>
        )}
        
        {/* Modais */}
        <OpenTableModal isOpen={!!selectedTableForOpen} onClose={() => setSelectedTableForOpen(null)} tableId={selectedTableForOpen} />
        
        <TableActionsModal 
            isOpen={!!selectedTableForAction} 
            onClose={() => setSelectedTableForAction(null)} 
            tableId={selectedTableForAction} 
            orders={orderState.orders.filter(o => o.tableId === selectedTableForAction && o.status !== 'CANCELLED')}
            onOrder={() => { setOrderingTableId(selectedTableForAction); setSelectedTableForAction(null); setCart([]); }} 
        />

        {/* Modal de Confirmação de Chamado */}
        <Modal 
            isOpen={!!confirmCallId} 
            onClose={() => { setConfirmCallId(null); setCallingTableNumber(null); }} 
            title="Atender Chamado?" 
            variant="dialog" 
            maxWidth="sm"
        >
            <div className="flex flex-col items-center text-center space-y-6">
                <div className="bg-red-100 p-6 rounded-full text-red-600 animate-pulse">
                    <Bell size={48} />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-slate-900 mb-1">Mesa {callingTableNumber}</h3>
                    <p className="text-gray-500 text-sm">O cliente solicitou a presença de um garçom.</p>
                </div>
                <div className="flex gap-3 w-full">
                    <Button variant="secondary" onClick={() => { setConfirmCallId(null); setCallingTableNumber(null); }} className="flex-1">Cancelar</Button>
                    <Button onClick={handleResolveCall} className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-red-200">Confirmar</Button>
                </div>
            </div>
        </Modal>
    </div>
  );
};
