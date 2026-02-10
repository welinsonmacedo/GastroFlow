
import React, { useState, useEffect, useRef } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useUI } from '../context/UIContext';
import { TableStatus, OrderStatus, ProductType, Product, OrderItem } from '../types';
import { Button } from '../components/Button';
import { CheckCircle, Coffee, User, Key, X, Bell, Plus, Minus, Search, ShoppingCart, ChevronRight, Utensils, Trash2, ArrowLeft, Volume2, Edit3, MessageSquare, ChevronUp, ChevronDown, AlertTriangle, Zap } from 'lucide-react';

// Som de "Ding" em Base64
const BELL_SOUND_BASE64 = "data:audio/mp3;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAG84AA0WAgAAAAAAABZsAAAAtAAAAAAAABaAAAAAABZAAABcAAABjAAAA//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAG84AA0WAgAAAAAAABZsAAAAtAAAAAAAABaAAAAAABZAAABcAAABjAAAA"; 
const FALLBACK_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export const WaiterApp: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { showAlert, showConfirm } = useUI();
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevCallsCount = useRef(0);
  const prevReadyCount = useRef(0);
  const wakeLockRef = useRef<any>(null); // Referência para o bloqueio de tela

  // States
  const [selectedTableForOpen, setSelectedTableForOpen] = useState<string | null>(null);
  const [selectedTableForAction, setSelectedTableForAction] = useState<string | null>(null);
  const [orderingTableId, setOrderingTableId] = useState<string | null>(null);
  const [isReadyToServeOpen, setIsReadyToServeOpen] = useState(false);
  const [isIos, setIsIos] = useState(false);
  
  // Order Form States
  const [customerName, setCustomerName] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [cart, setCart] = useState<{ product: Product; quantity: number; notes: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [quickAddModal, setQuickAddModal] = useState<{ product: Product; qty: number; note: string } | null>(null);

  // --- ITEM FILTER LOGIC ---
  const isWaiterItem = (item: OrderItem) => {
      const product = state.products.find(p => p.id === item.productId);
      const isDrink = product ? product.category === 'Bebidas' : false;

      // 1. Itens de Cozinha que estão PRONTOS (Cozinheiro finalizou)
      if (item.status === OrderStatus.READY && item.productType === ProductType.KITCHEN) return true;

      // 2. Itens de BAR que estão PENDENTES (Garçom deve pegar/fazer)
      //    OU Itens que são Bebidas (mesmo marcados como Kitchen por erro)
      if (item.status === OrderStatus.PENDING && (item.productType === ProductType.BAR || isDrink)) return true;

      return false;
  };

  const readyToServeItems = state.orders.flatMap(order => 
    order.items
      .filter(item => isWaiterItem(item))
      .map(item => ({ ...item, tableId: order.tableId, orderId: order.id }))
  );
  
  const pendingCalls = state.serviceCalls.filter(c => c.status === 'PENDING');

  // --- WAKE LOCK (MANTER TELA LIGADA) ---
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('Tela mantida ligada (Wake Lock ativo)');
      }
    } catch (err) {
      console.error('Erro ao solicitar Wake Lock:', err);
    }
  };

  // Reconectar Wake Lock se a aba ficar visível novamente
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && state.audioUnlocked) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (wakeLockRef.current) wakeLockRef.current.release();
    };
  }, [state.audioUnlocked]);

  // --- LÓGICA DE ÁUDIO ---
  useEffect(() => {
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIos(isIOSDevice);

      audioRef.current = new Audio(FALLBACK_SOUND_URL);
      audioRef.current.preload = 'auto';
  }, []);

  useEffect(() => {
      const hasNewCalls = pendingCalls.length > prevCallsCount.current;
      const hasNewReadyItems = readyToServeItems.length > prevReadyCount.current;

      if (state.audioUnlocked && (hasNewCalls || hasNewReadyItems)) {
          audioRef.current?.play().catch(err => console.warn("Autoplay bloqueado", err));
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }

      prevCallsCount.current = pendingCalls.length;
      prevReadyCount.current = readyToServeItems.length;
  }, [pendingCalls.length, readyToServeItems.length, state.audioUnlocked]);

  const enableAudio = () => {
      if (audioRef.current) {
          audioRef.current.play()
            .then(() => {
                dispatch({ type: 'UNLOCK_AUDIO' });
                requestWakeLock(); // Solicita manter a tela ligada
            })
            .catch(err => {
                console.error("Erro ao desbloquear áudio", err);
                alert("Não foi possível ativar o som. Verifique permissões.");
            });
      } else {
          dispatch({ type: 'UNLOCK_AUDIO' });
          requestWakeLock();
      }
  };

  // ... (Restante do código de handlers: addToCart, submitOrder, etc... mantidos iguais) ...
  const handleTableClick = (tableId: string, currentStatus: TableStatus) => {
    if (currentStatus === TableStatus.AVAILABLE) {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedCode(code);
      setCustomerName('');
      setSelectedTableForOpen(tableId);
    } else {
      setSelectedTableForAction(tableId);
    }
  };

  const confirmOpenTable = () => {
    if (selectedTableForOpen) {
      dispatch({ type: 'OPEN_TABLE', tableId: selectedTableForOpen, customerName: customerName || 'Cliente', accessCode: generatedCode });
      setSelectedTableForOpen(null);
    }
  };

  const handleCloseTable = () => {
      if (selectedTableForAction) {
          showConfirm({
              title: "Fechar Mesa", message: "Tem certeza que deseja fechar esta mesa?", confirmText: "Fechar", type: 'WARNING',
              onConfirm: () => { dispatch({ type: 'CLOSE_TABLE', tableId: selectedTableForAction }); setSelectedTableForAction(null); }
          });
      }
  };

  const startOrder = () => {
      if (selectedTableForAction) {
          setOrderingTableId(selectedTableForAction);
          setSelectedTableForAction(null);
          setCart([]);
          setSearchQuery('');
      }
  };

  const addToCart = (product: Product, quantity = 1, notes = '') => {
    setCart(prev => {
      if (notes) return [...prev, { product, quantity, notes }];
      const existing = prev.find(item => item.product.id === product.id && !item.notes);
      if (existing) return prev.map(item => item.product.id === product.id && !item.notes ? { ...item, quantity: item.quantity + quantity } : item);
      return [...prev, { product, quantity, notes: '' }];
    });
  };

  const confirmQuickAdd = () => {
      if (quickAddModal) { addToCart(quickAddModal.product, quickAddModal.qty, quickAddModal.note); setQuickAddModal(null); }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter(item => item.quantity > 0));
  };

  const submitOrder = () => {
    if (!orderingTableId || cart.length === 0) return;
    dispatch({ type: 'PLACE_ORDER', tableId: orderingTableId, items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity, notes: i.notes })) });
    setCart([]); setOrderingTableId(null);
    showAlert({ title: "Sucesso", message: "Pedido enviado!", type: 'SUCCESS' });
  };

  const markDelivered = (orderId: string, itemId: string) => dispatch({ type: 'UPDATE_ITEM_STATUS', orderId, itemId, status: OrderStatus.DELIVERED });
  const resolveCall = (callId: string) => dispatch({ type: 'RESOLVE_WAITER_CALL', callId });

  // --- AUDIO UNLOCK SCREEN ---
  if (!state.audioUnlocked) {
    return (
        <div className="h-full bg-slate-900 flex items-center justify-center p-4">
            <div className="text-center space-y-6 max-w-sm w-full bg-white p-8 rounded-2xl shadow-2xl">
                <div className="bg-blue-100 p-6 rounded-full inline-block mb-2 shadow-inner animate-bounce">
                    <Bell size={48} className="text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-800">Garçom Ativo</h1>
                
                <div className="text-left bg-gray-50 p-4 rounded-lg text-sm text-gray-600 space-y-2 border border-gray-200">
                    <p className="flex items-start gap-2">
                        <Volume2 className="text-blue-500 shrink-0" size={18}/>
                        <span>O sistema tocará um alerta quando houver chamados.</span>
                    </p>
                    <p className="flex items-start gap-2">
                        <Zap className="text-orange-500 shrink-0" size={18}/>
                        <span><strong>A tela do celular ficará sempre ligada</strong> para garantir que o som toque. Mantenha o app aberto.</span>
                    </p>
                    {isIos && (
                        <p className="flex items-start gap-2 text-yellow-700 font-bold bg-yellow-50 p-2 rounded">
                            <AlertTriangle className="shrink-0" size={18}/>
                            <span>No iPhone, desligue o botão lateral "Silencioso" ou o som não sairá.</span>
                        </p>
                    )}
                </div>

                <button onClick={enableAudio} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg w-full flex items-center justify-center gap-3 text-lg active:scale-95 transition-transform">
                    <Volume2 size={24} /> ATIVAR SISTEMA
                </button>
            </div>
        </div>
    );
  }

  // --- VIEW: POS ---
  if (orderingTableId) {
      const table = state.tables.find(t => t.id === orderingTableId);
      const filteredProducts = state.products.filter(p => (selectedCategory === 'Todos' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
      const categories = ['Todos', ...Array.from(new Set(state.products.map(p => p.category)))];

      return (
          <div className="flex flex-col h-full overflow-hidden bg-gray-50">
              {quickAddModal && (
                  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
                          <div className="bg-slate-900 text-white p-4 flex justify-between items-center"><h3 className="font-bold">{quickAddModal.product.name}</h3><button onClick={() => setQuickAddModal(null)}><X size={20}/></button></div>
                          <div className="p-6 space-y-4">
                              <div><label className="block text-sm font-bold text-gray-700 mb-2">Quantidade</label><div className="flex items-center gap-4 bg-gray-100 p-2 rounded-lg justify-center"><button onClick={() => setQuickAddModal({...quickAddModal, qty: Math.max(1, quickAddModal.qty - 1)})} className="p-2 bg-white rounded shadow-sm"><Minus size={20}/></button><span className="text-xl font-bold w-8 text-center">{quickAddModal.qty}</span><button onClick={() => setQuickAddModal({...quickAddModal, qty: quickAddModal.qty + 1})} className="p-2 bg-white rounded shadow-sm"><Plus size={20}/></button></div></div>
                              <div><label className="block text-sm font-bold text-gray-700 mb-2">Observação</label><textarea className="w-full border rounded-lg p-3 text-sm" rows={3} placeholder="Ex: Sem cebola..." value={quickAddModal.note} onChange={(e) => setQuickAddModal({...quickAddModal, note: e.target.value})} autoFocus /></div>
                              <Button onClick={confirmQuickAdd} className="w-full py-3 text-lg">Adicionar ao Pedido</Button>
                          </div>
                      </div>
                  </div>
              )}
              <header className="bg-white border-b p-4 shadow-sm flex items-center justify-between shrink-0 safe-area-top">
                  <div className="flex items-center gap-2"><button onClick={() => setOrderingTableId(null)} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} className="text-gray-600"/></button><div><h1 className="font-bold text-lg leading-none">Novo Pedido</h1><span className="text-sm text-gray-500">Mesa {table?.number} - {table?.customerName}</span></div></div>
                  <div className="font-bold text-blue-600">R$ {cartTotal.toFixed(2)}</div>
              </header>
              <div className="flex flex-1 overflow-hidden">
                  <div className="flex-1 flex flex-col overflow-hidden relative">
                      <div className="p-4 bg-white border-b space-y-3">
                          <div className="relative"><Search className="absolute left-3 top-3 text-gray-400" size={20} /><input type="text" placeholder="Buscar produto..." className="w-full pl-10 pr-4 py-2 border rounded-lg bg-gray-50" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus /></div>
                          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">{categories.map(cat => (<button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1 rounded-full text-sm font-medium border ${selectedCategory === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>{cat}</button>))}</div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 content-start pb-24">
                          {filteredProducts.map(product => {
                              const inCart = cart.find(i => i.product.id === product.id);
                              return (
                                  <div key={product.id} className={`bg-white p-3 rounded-xl border shadow-sm flex justify-between items-center transition-all ${inCart ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50' : ''}`}>
                                      <div className="flex-1 min-w-0 pr-2"><div className="font-bold text-gray-800 truncate">{product.name}</div><div className="text-sm text-gray-500">R$ {product.price.toFixed(2)}</div></div>
                                      <div className="flex items-center gap-2">
                                          <button onClick={() => setQuickAddModal({ product, qty: 1, note: '' })} className="bg-gray-100 p-2 rounded-lg text-gray-600 hover:text-yellow-700"><Edit3 size={20} /></button>
                                          {inCart && !inCart.notes ? (<div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border shadow-sm"><button onClick={() => updateQuantity(product.id, -1)} className="p-1 hover:text-red-500"><Minus size={18}/></button><span className="font-bold w-4 text-center">{inCart.quantity}</span><button onClick={() => updateQuantity(product.id, 1)} className="p-1 hover:text-green-500"><Plus size={18}/></button></div>) : (<button onClick={() => addToCart(product)} className="bg-blue-600 p-2 rounded-lg text-white hover:bg-blue-700 shadow-sm"><Plus size={20} /></button>)}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
                  {cart.length > 0 && (
                      <div className="w-full md:w-80 bg-white border-l shadow-xl flex flex-col z-20 absolute md:relative bottom-0 h-[60vh] md:h-auto rounded-t-2xl md:rounded-none safe-area-bottom">
                          <div className="p-4 bg-gray-50 border-b flex justify-between items-center"><h3 className="font-bold flex items-center gap-2"><ShoppingCart size={18}/> Resumo</h3><span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">{cart.reduce((a,b)=>a+b.quantity,0)} itens</span></div>
                          <div className="flex-1 overflow-y-auto p-4 space-y-4">{cart.map((item, idx) => (<div key={`${item.product.id}-${idx}`} className="text-sm border-b pb-3 last:border-0"><div className="flex justify-between items-start mb-1"><span className="font-medium text-gray-800">{item.quantity}x {item.product.name}</span><span className="font-bold">R$ {(item.product.price * item.quantity).toFixed(2)}</span></div>{item.notes ? (<div className="text-xs bg-yellow-50 text-yellow-800 p-2 rounded flex items-start gap-1 mt-1 border border-yellow-100"><MessageSquare size={12} className="mt-0.5 shrink-0"/> {item.notes}</div>) : (<input placeholder="Adicionar obs..." className="w-full text-xs border-b border-dashed bg-transparent focus:outline-none text-gray-400 mt-1" onBlur={(e) => { const val = e.target.value; if(val) setCart(prev => prev.map((p, i) => i === idx ? { ...p, notes: val } : p)); }}/>)}</div>))}</div>
                          <div className="p-4 border-t bg-gray-50"><div className="flex justify-between items-center text-xl font-bold text-gray-800 mb-4"><span>Total</span><span>R$ {cartTotal.toFixed(2)}</span></div><Button onClick={submitOrder} className="w-full py-3 text-lg shadow-lg">Enviar Pedido <Utensils size={18} /></Button></div>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // --- VIEW: DASHBOARD ---
  return (
    <div className="min-h-full bg-gray-100 p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 relative pb-24 lg:pb-6">
      {pendingCalls.length > 0 && (
          <div className="fixed top-4 left-0 right-0 z-30 flex justify-center px-4">
              <div className="bg-red-600 text-white px-6 py-4 rounded-full shadow-2xl animate-bounce flex items-center gap-3 cursor-pointer hover:bg-red-700 border-4 border-white" onClick={() => resolveCall(pendingCalls[0].id)}>
                  <Bell size={24} className="fill-white"/><span className="font-bold text-lg">MESA {state.tables.find(t => t.id === pendingCalls[0].tableId)?.number} CHAMANDO!</span>
              </div>
          </div>
      )}
      {selectedTableForOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm relative">
            <button onClick={() => setSelectedTableForOpen(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24}/></button>
            <h3 className="text-xl font-bold mb-4">Abrir Mesa</h3>
            <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label><input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full border p-2 rounded-lg" placeholder="Ex: João Silva" autoFocus /></div>
            <div className="bg-blue-50 p-4 rounded-lg mb-6 text-center"><p className="text-sm text-blue-600 mb-1">Senha do cliente:</p><div className="text-4xl font-mono font-bold text-blue-800 tracking-widest">{generatedCode}</div></div>
            <Button className="w-full py-3" onClick={confirmOpenTable}>Confirmar e Liberar Mesa</Button>
          </div>
        </div>
      )}
      {selectedTableForAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs overflow-hidden animate-fade-in">
                  <div className="bg-slate-900 text-white p-4 flex justify-between items-center"><h3 className="font-bold text-lg">Mesa {state.tables.find(t => t.id === selectedTableForAction)?.number}</h3><button onClick={() => setSelectedTableForAction(null)} className="text-slate-400 hover:text-white"><X size={20}/></button></div>
                  <div className="p-4 space-y-3">
                      <button onClick={startOrder} className="w-full py-4 bg-blue-50 text-blue-700 font-bold rounded-xl flex items-center justify-center gap-3 hover:bg-blue-100"><Utensils size={24} /> Fazer Pedido</button>
                      <button onClick={handleCloseTable} className="w-full py-4 bg-red-50 text-red-700 font-bold rounded-xl flex items-center justify-center gap-3 hover:bg-red-100"><Trash2 size={24} /> Fechar Mesa</button>
                  </div>
              </div>
          </div>
      )}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">Mesas {state.audioUnlocked && <span className="text-xs font-normal bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1"><Zap size={12}/> Tela Ativa</span>}</h1>
            <button onClick={enableAudio} className="text-xs text-blue-600 underline">Testar Som</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {state.tables.map(table => {
            const hasCall = pendingCalls.find(c => c.tableId === table.id);
            return (
            <div key={table.id} onClick={() => hasCall ? resolveCall(hasCall.id) : handleTableClick(table.id, table.status)} className={`p-4 rounded-xl shadow-sm border-2 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[120px] md:min-h-[140px] relative ${hasCall ? 'bg-red-50 border-red-500 animate-[pulse_1s_infinite]' : ''} ${!hasCall && table.status === TableStatus.OCCUPIED ? 'bg-white border-blue-500 hover:shadow-md' : ''} ${!hasCall && table.status === TableStatus.AVAILABLE ? 'bg-gray-50 border-transparent hover:border-gray-300' : ''} ${!hasCall && table.status === TableStatus.WAITING_PAYMENT ? 'bg-yellow-50 border-yellow-400' : ''}`}>
              <div className="text-3xl md:text-4xl font-bold mb-1 text-gray-700">{table.number}</div>
              {hasCall && <div className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full animate-bounce shadow-lg"><Bell size={20} fill="white" /></div>}
              {table.status === TableStatus.OCCUPIED && (<div className="flex flex-col items-center w-full"><div className="flex items-center justify-center gap-1 text-sm font-medium text-blue-800 mb-1 w-full"><User size={12} className="shrink-0" /> <span className="truncate max-w-[80%]">{table.customerName}</span></div><div className="hidden sm:flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded"><Key size={10} /> {table.accessCode}</div></div>)}
              <div className={`text-[10px] md:text-xs font-bold uppercase px-2 py-1 rounded-full mt-2 ${hasCall ? 'bg-red-600 text-white' : ''} ${!hasCall && table.status === TableStatus.OCCUPIED ? 'bg-blue-100 text-blue-700' : ''} ${!hasCall && table.status === TableStatus.AVAILABLE ? 'bg-gray-200 text-gray-600' : ''} ${!hasCall && table.status === TableStatus.WAITING_PAYMENT ? 'bg-yellow-100 text-yellow-700' : ''}`}>{hasCall ? 'CHAMANDO' : (table.status === TableStatus.AVAILABLE ? 'LIVRE' : table.status === TableStatus.OCCUPIED ? 'OCUPADA' : table.status === TableStatus.WAITING_PAYMENT ? 'PAGAMENTO' : 'FECHADA')}</div>
            </div>
          )})}
        </div>
      </div>
      <div className={`bg-white rounded-t-xl lg:rounded-xl shadow-[0_-4px_10px_rgba(0,0,0,0.1)] lg:shadow-lg border border-gray-100 fixed bottom-0 left-0 right-0 z-20 lg:static lg:h-fit lg:sticky lg:top-4 transition-all duration-300 ${isReadyToServeOpen ? 'h-[70vh]' : 'h-16 lg:h-auto'}`}>
        <div className="p-4 flex items-center justify-between border-b cursor-pointer lg:cursor-default bg-white lg:rounded-t-xl" onClick={() => setIsReadyToServeOpen(!isReadyToServeOpen)}>
            <div className="flex items-center gap-2"><div className={`rounded-full w-8 h-8 flex items-center justify-center font-bold ${readyToServeItems.length > 0 ? 'bg-green-500 text-white animate-pulse' : 'bg-gray-200 text-gray-500'}`}>{readyToServeItems.length}</div><h2 className="text-xl font-bold text-gray-800">Para Servir</h2></div>
            <div className="lg:hidden text-gray-400">{isReadyToServeOpen ? <ChevronDown size={24} /> : <ChevronUp size={24} />}</div>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-64px)] lg:max-h-[80vh]">
            {readyToServeItems.length === 0 && <div className="text-center text-gray-400 py-10 flex flex-col items-center"><CheckCircle size={48} className="opacity-20 mb-2"/><p>Tudo entregue!</p></div>}
            {readyToServeItems.map((item, idx) => {
                const table = state.tables.find(t => t.id === item.tableId);
                const isBarItem = item.productType === ProductType.BAR || state.products.find(p => p.id === item.productId)?.category === 'Bebidas';
                
                return (
                    <div key={`${item.id}-${idx}`} className="border rounded-lg p-3 bg-gray-50 hover:bg-white transition-colors shadow-sm">
                        <div className="flex justify-between items-start mb-2"><span className="font-bold text-lg bg-slate-800 text-white px-2 rounded">M-{table?.number}</span>{isBarItem ? (<span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-bold flex items-center gap-1"><Coffee size={12}/> BAR</span>) : (<span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold flex items-center gap-1"><CheckCircle size={12}/> COZINHA PRONTA</span>)}</div>
                        <div className="font-medium text-gray-800 mb-1 text-lg">{item.quantity}x {item.productName}</div>
                        {item.notes && <div className="text-xs text-red-600 italic mb-2 bg-red-50 p-1 rounded border border-red-100">Nota: {item.notes}</div>}
                        <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold" onClick={(e) => { e.stopPropagation(); markDelivered(item.orderId, item.id); }}>Marcar Entregue</Button>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};
