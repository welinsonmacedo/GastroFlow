import React, { useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { TableStatus, OrderStatus, ProductType, Product } from '../types';
import { Button } from '../components/Button';
import { CheckCircle, Coffee, User, Key, X, Bell, Plus, Minus, Search, ShoppingCart, ChevronRight, Utensils, Trash2, ArrowLeft, Volume2 } from 'lucide-react';

export const WaiterApp: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  
  // States
  const [selectedTableForOpen, setSelectedTableForOpen] = useState<string | null>(null);
  const [selectedTableForAction, setSelectedTableForAction] = useState<string | null>(null); // Menu de opções
  const [orderingTableId, setOrderingTableId] = useState<string | null>(null); // Modo Pedido
  
  // Order Form States
  const [customerName, setCustomerName] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [cart, setCart] = useState<{ product: Product; quantity: number; notes: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // Active items ready to serve (Kitchen Ready OR Bar Pending)
  const readyToServeItems = state.orders.flatMap(order => 
    order.items
      .filter(item => 
        (item.status === OrderStatus.READY && item.productType === ProductType.KITCHEN) || 
        (item.status === OrderStatus.PENDING && item.productType === ProductType.BAR)
      )
      .map(item => ({ ...item, tableId: order.tableId, orderId: order.id }))
  );
  
  const pendingCalls = state.serviceCalls.filter(c => c.status === 'PENDING');

  const enableAudio = () => {
      dispatch({ type: 'UNLOCK_AUDIO' });
  };

  // --- Handlers ---

  const handleTableClick = (tableId: string, currentStatus: TableStatus) => {
    if (currentStatus === TableStatus.AVAILABLE) {
      // Inicia fluxo de abertura
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedCode(code);
      setCustomerName('');
      setSelectedTableForOpen(tableId);
    } else {
      // Abre menu de ações para mesa ocupada
      setSelectedTableForAction(tableId);
    }
  };

  const confirmOpenTable = () => {
    if (selectedTableForOpen) {
      dispatch({ 
        type: 'OPEN_TABLE', 
        tableId: selectedTableForOpen, 
        customerName: customerName || 'Cliente', 
        accessCode: generatedCode 
      });
      setSelectedTableForOpen(null);
    }
  };

  const handleCloseTable = () => {
      if (selectedTableForAction && window.confirm("Tem certeza que deseja fechar esta mesa? Isso limpará a sessão atual.")) {
          dispatch({ type: 'CLOSE_TABLE', tableId: selectedTableForAction });
          setSelectedTableForAction(null);
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

  // --- Cart Logic ---

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1, notes: '' }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) }; // Allow 0 to remove? No, separate remove
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const submitOrder = () => {
    if (!orderingTableId || cart.length === 0) return;
    dispatch({
      type: 'PLACE_ORDER',
      tableId: orderingTableId,
      items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity, notes: i.notes }))
    });
    setCart([]);
    setOrderingTableId(null);
    alert("Pedido enviado para a cozinha!");
  };

  const markDelivered = (orderId: string, itemId: string) => {
    dispatch({ type: 'UPDATE_ITEM_STATUS', orderId, itemId, status: OrderStatus.DELIVERED });
  };
  
  const resolveCall = (callId: string) => {
      dispatch({ type: 'RESOLVE_WAITER_CALL', callId });
  };

  // --- AUDIO UNLOCK SCREEN ---
  if (!state.audioUnlocked) {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <div className="text-center space-y-6 max-w-sm">
                <div className="bg-blue-100 p-8 rounded-full inline-block mb-4 shadow-lg animate-pulse">
                    <Bell size={64} className="text-blue-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-800">App do Garçom</h1>
                <p className="text-gray-500">
                    Toque no botão abaixo para ativar os sons de notificação e começar a atender.
                </p>
                <button 
                  onClick={enableAudio}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-10 rounded-xl shadow-lg w-full flex items-center justify-center gap-3 text-lg"
                >
                    <Volume2 size={24} /> ATIVAR SOM
                </button>
            </div>
        </div>
    );
  }

  // --- Render Views ---

  // 1. VIEW: ORDERING (POS)
  if (orderingTableId) {
      const table = state.tables.find(t => t.id === orderingTableId);
      const filteredProducts = state.products.filter(p => 
          (selectedCategory === 'Todos' || p.category === selectedCategory) &&
          p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
      const categories = ['Todos', ...Array.from(new Set(state.products.map(p => p.category)))];

      return (
          <div className="min-h-screen bg-gray-50 flex flex-col h-screen overflow-hidden">
              {/* Header */}
              <header className="bg-white border-b p-4 shadow-sm flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                      <button onClick={() => setOrderingTableId(null)} className="p-2 hover:bg-gray-100 rounded-full">
                          <ArrowLeft size={24} className="text-gray-600"/>
                      </button>
                      <div>
                          <h1 className="font-bold text-lg leading-none">Novo Pedido</h1>
                          <span className="text-sm text-gray-500">Mesa {table?.number} - {table?.customerName}</span>
                      </div>
                  </div>
                  <div className="font-bold text-blue-600">
                      R$ {cartTotal.toFixed(2)}
                  </div>
              </header>

              <div className="flex flex-1 overflow-hidden">
                  {/* Left: Product Selection */}
                  <div className="flex-1 flex flex-col overflow-hidden relative">
                      {/* Search & Filter */}
                      <div className="p-4 bg-white border-b space-y-3">
                          <div className="relative">
                              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                              <input 
                                  type="text" 
                                  placeholder="Buscar produto..." 
                                  className="w-full pl-10 pr-4 py-2 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  autoFocus
                              />
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                              {categories.map(cat => (
                                  <button
                                      key={cat}
                                      onClick={() => setSelectedCategory(cat)}
                                      className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors border
                                          ${selectedCategory === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}
                                      `}
                                  >
                                      {cat}
                                  </button>
                              ))}
                          </div>
                      </div>

                      {/* Product List */}
                      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 content-start">
                          {filteredProducts.map(product => {
                              const inCart = cart.find(i => i.product.id === product.id);
                              return (
                                  <div key={product.id} className={`bg-white p-3 rounded-xl border shadow-sm flex justify-between items-center transition-all ${inCart ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50' : 'hover:border-gray-300'}`}>
                                      <div className="flex-1 min-w-0 pr-2">
                                          <div className="font-bold text-gray-800 truncate">{product.name}</div>
                                          <div className="text-sm text-gray-500">R$ {product.price.toFixed(2)}</div>
                                      </div>
                                      
                                      {inCart ? (
                                          <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border shadow-sm">
                                              <button onClick={() => updateQuantity(product.id, -1)} className="p-1 hover:text-red-500"><Minus size={18}/></button>
                                              <span className="font-bold w-4 text-center">{inCart.quantity}</span>
                                              <button onClick={() => updateQuantity(product.id, 1)} className="p-1 hover:text-green-500"><Plus size={18}/></button>
                                          </div>
                                      ) : (
                                          <button 
                                              onClick={() => addToCart(product)}
                                              className="bg-gray-100 p-2 rounded-lg text-gray-600 hover:bg-blue-600 hover:text-white transition-colors"
                                          >
                                              <Plus size={20} />
                                          </button>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  </div>

                  {/* Right: Cart Summary (Desktop Only or Toggle) */}
                  {cart.length > 0 && (
                      <div className="w-full md:w-80 bg-white border-l shadow-xl flex flex-col z-20 absolute md:relative bottom-0 h-[60vh] md:h-auto rounded-t-2xl md:rounded-none">
                          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                              <h3 className="font-bold flex items-center gap-2"><ShoppingCart size={18}/> Resumo</h3>
                              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">{cart.reduce((a,b)=>a+b.quantity,0)} itens</span>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto p-4 space-y-4">
                              {cart.map(item => (
                                  <div key={item.product.id} className="text-sm">
                                      <div className="flex justify-between items-start mb-1">
                                          <span className="font-medium text-gray-800">{item.quantity}x {item.product.name}</span>
                                          <span className="font-bold">R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                                      </div>
                                      <input 
                                          placeholder="Obs: Sem cebola..."
                                          className="w-full text-xs border-b border-dashed bg-transparent focus:outline-none focus:border-blue-500 text-gray-500"
                                          value={item.notes}
                                          onChange={(e) => setCart(prev => prev.map(p => p.product.id === item.product.id ? { ...p, notes: e.target.value } : p))}
                                      />
                                  </div>
                              ))}
                          </div>

                          <div className="p-4 border-t bg-gray-50">
                              <div className="flex justify-between items-center text-xl font-bold text-gray-800 mb-4">
                                  <span>Total</span>
                                  <span>R$ {cartTotal.toFixed(2)}</span>
                              </div>
                              <Button onClick={submitOrder} className="w-full py-3 text-lg shadow-lg">
                                  Enviar Pedido <Utensils size={18} />
                              </Button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // 2. VIEW: DASHBOARD (Tables)
  return (
    <div className="min-h-screen bg-gray-100 p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
      
      {/* Alert Overlay for Service Calls - Shows on top if any call exists */}
      {pendingCalls.length > 0 && (
          <div className="fixed top-20 left-0 right-0 z-30 flex justify-center px-4 pointer-events-none">
              <div className="bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl animate-bounce flex items-center gap-3 pointer-events-auto cursor-pointer" onClick={() => resolveCall(pendingCalls[0].id)}>
                  <Bell size={24} className="fill-white"/>
                  <span className="font-bold text-lg">
                      MESA {state.tables.find(t => t.id === pendingCalls[0].tableId)?.number} CHAMANDO!
                  </span>
                  <div className="bg-white text-red-600 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                      {pendingCalls.length}
                  </div>
              </div>
          </div>
      )}

      {/* Modal de Abertura de Mesa */}
      {selectedTableForOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm relative">
            <button 
                onClick={() => setSelectedTableForOpen(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full"
            >
                <X size={24}/>
            </button>
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-xl font-bold">Abrir Mesa</h3>
            </div>
            
            <div className="mb-4">
               <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
               <input 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full border p-2 rounded-lg"
                  placeholder="Ex: João Silva"
                  autoFocus
               />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg mb-6 text-center">
              <p className="text-sm text-blue-600 mb-1">Senha gerada para o cliente:</p>
              <div className="text-4xl font-mono font-bold text-blue-800 tracking-widest">{generatedCode}</div>
              <p className="text-xs text-blue-400 mt-1">Informe este código ao cliente.</p>
            </div>

            <Button className="w-full py-3" onClick={confirmOpenTable}>
               Confirmar e Liberar Mesa
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Ações da Mesa (Novo Pedido / Fechar) */}
      {selectedTableForAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs overflow-hidden animate-fade-in">
                  <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                      <h3 className="font-bold text-lg">Mesa {state.tables.find(t => t.id === selectedTableForAction)?.number}</h3>
                      <button onClick={() => setSelectedTableForAction(null)} className="text-slate-400 hover:text-white"><X size={20}/></button>
                  </div>
                  <div className="p-4 space-y-3">
                      <button 
                          onClick={startOrder}
                          className="w-full py-4 bg-blue-50 text-blue-700 font-bold rounded-xl flex items-center justify-center gap-3 hover:bg-blue-100 transition-colors"
                      >
                          <Utensils size={24} /> Fazer Pedido
                      </button>
                      <button 
                          onClick={handleCloseTable}
                          className="w-full py-4 bg-red-50 text-red-700 font-bold rounded-xl flex items-center justify-center gap-3 hover:bg-red-100 transition-colors"
                      >
                          <Trash2 size={24} /> Fechar Mesa
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Left Column: Tables Management */}
      <div className="lg:col-span-2 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            Mesas 
            <span className="text-xs font-normal bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                <Volume2 size={12}/> Som Ativo
            </span>
        </h1>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {state.tables.map(table => {
            const hasCall = pendingCalls.find(c => c.tableId === table.id);
            return (
            <div 
              key={table.id} 
              className={`p-4 rounded-xl shadow-sm border-2 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[140px] relative
                ${hasCall ? 'bg-red-50 border-red-500 animate-[pulse_1s_infinite]' : ''}
                ${!hasCall && table.status === TableStatus.OCCUPIED ? 'bg-white border-blue-500 hover:shadow-md' : ''}
                ${!hasCall && table.status === TableStatus.AVAILABLE ? 'bg-gray-50 border-transparent hover:border-gray-300' : ''}
                ${!hasCall && table.status === TableStatus.WAITING_PAYMENT ? 'bg-yellow-50 border-yellow-400' : ''}
              `}
              onClick={() => hasCall ? resolveCall(hasCall.id) : handleTableClick(table.id, table.status)}
            >
              <div className="text-4xl font-bold mb-1 text-gray-700">{table.number}</div>
              
              {hasCall && (
                  <div className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full animate-bounce">
                      <Bell size={20} fill="white" />
                  </div>
              )}
              
              {table.status === TableStatus.OCCUPIED && (
                <div className="flex flex-col items-center">
                   <div className="flex items-center gap-1 text-sm font-medium text-blue-800 mb-1">
                      <User size={12} /> {table.customerName}
                   </div>
                   <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                      <Key size={10} /> {table.accessCode}
                   </div>
                </div>
              )}

              <div className={`text-xs font-bold uppercase px-2 py-1 rounded-full mt-2
                 ${hasCall ? 'bg-red-600 text-white' : ''}
                 ${!hasCall && table.status === TableStatus.OCCUPIED ? 'bg-blue-100 text-blue-700' : ''}
                 ${!hasCall && table.status === TableStatus.AVAILABLE ? 'bg-gray-200 text-gray-600' : ''}
              `}>
                {hasCall ? 'CHAMANDO' : (
                    <>
                        {table.status === TableStatus.AVAILABLE && 'LIVRE'}
                        {table.status === TableStatus.OCCUPIED && 'OCUPADA'}
                        {table.status === TableStatus.WAITING_PAYMENT && 'PAGAMENTO'}
                        {table.status === TableStatus.CLOSED && 'FECHADA'}
                    </>
                )}
              </div>
            </div>
          )})}
        </div>
      </div>

      {/* Right Column: Action Center (Ready to Serve) - Stacks on bottom on mobile */}
      <div className="bg-white rounded-xl shadow-lg p-4 h-fit sticky lg:top-4 z-10 border border-gray-100">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b">
            <div className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                {readyToServeItems.length}
            </div>
            <h2 className="text-xl font-bold text-gray-800">Para Servir</h2>
        </div>

        <div className="space-y-4 max-h-[50vh] lg:max-h-[80vh] overflow-y-auto">
            {readyToServeItems.length === 0 && (
                <div className="text-center text-gray-400 py-10">Tudo entregue!</div>
            )}
            {readyToServeItems.map((item, idx) => {
                const table = state.tables.find(t => t.id === item.tableId);
                return (
                    <div key={`${item.id}-${idx}`} className="border rounded-lg p-3 bg-gray-50 hover:bg-white transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-lg bg-black text-white px-2 rounded">M-{table?.number}</span>
                            {item.productType === ProductType.BAR ? (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-bold flex items-center gap-1">
                                    <Coffee size={12}/> BAR
                                </span>
                            ) : (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold flex items-center gap-1">
                                    <CheckCircle size={12}/> COZINHA PRONTA
                                </span>
                            )}
                        </div>
                        <div className="font-medium text-gray-800 mb-1">{item.quantity}x {item.productName}</div>
                        {item.notes && <div className="text-xs text-red-500 italic mb-2">Nota: {item.notes}</div>}
                        
                        <Button 
                            size="sm" 
                            variant="success" 
                            className="w-full"
                            onClick={(e) => { e.stopPropagation(); markDelivered(item.orderId, item.id); }}
                        >
                            Marcar Entregue
                        </Button>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};