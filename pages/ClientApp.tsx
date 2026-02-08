import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import { Button } from '../components/Button';
import { TableStatus, Product } from '../types';
import { ShoppingCart, ChefHat, Info, Plus, Minus, X, Lock, Receipt, Loader2, Bell, AlertTriangle, ArrowLeft, Search, Edit3 } from 'lucide-react';

export const ClientApp: React.FC = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const { state, dispatch } = useRestaurant();
  const [cart, setCart] = useState<{ product: Product; quantity: number; notes: string }[]>([]);
  const [view, setView] = useState<'MENU' | 'CART' | 'STATUS' | 'BILL'>('MENU');
  const [accessPin, setAccessPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // --- Modal State ---
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalNotes, setModalNotes] = useState('');

  // Handle Loading
  if (state.isLoading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
              <Loader2 className="animate-spin mb-2 text-blue-600" size={32} />
              <p>Carregando cardápio...</p>
          </div>
      );
  }

  const table = state.tables.find(t => t.id === tableId);
  const theme = state.theme;

  // Derive table status
  const isTableActive = table?.status === TableStatus.OCCUPIED;
  const tableOrders = state.orders.filter(o => o.tableId === tableId && !o.isPaid);

  const checkPin = () => {
    setErrorMsg('');
    if (table?.accessCode === accessPin) {
      setIsAuthenticated(true);
    } else {
      setErrorMsg("Código incorreto.");
    }
  };

  const callWaiter = () => {
      if (tableId) {
          dispatch({ type: 'CALL_WAITER', tableId });
          setWaiterCalled(true);
          setTimeout(() => setWaiterCalled(false), 5000); 
      }
  };

  const openProductModal = (product: Product) => {
      setSelectedProduct(product);
      setModalQuantity(1);
      setModalNotes('');
  };

  const closeProductModal = () => {
      setSelectedProduct(null);
  };

  const addToCartFromModal = () => {
    if (!selectedProduct) return;

    setCart(prev => {
      // Verifica se já existe o MESMO produto com a MESMA observação
      const existingIndex = prev.findIndex(item => item.product.id === selectedProduct.id && item.notes === modalNotes);
      
      if (existingIndex >= 0) {
        const newCart = [...prev];
        newCart[existingIndex].quantity += modalQuantity;
        return newCart;
      }
      
      return [...prev, { product: selectedProduct, quantity: modalQuantity, notes: modalNotes }];
    });

    closeProductModal();
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const submitOrder = () => {
    if (!tableId || cart.length === 0) return;
    dispatch({
      type: 'PLACE_ORDER',
      tableId,
      items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity, notes: i.notes }))
    });
    setCart([]);
    setView('STATUS');
  };

  const billTotal = tableOrders.reduce((acc, order) => {
    return acc + order.items.reduce((sum, item) => {
       const product = state.products.find(p => p.id === item.productId);
       return sum + ((product?.price || 0) * item.quantity);
    }, 0);
  }, 0);

  if (!table) return <div className="p-8 text-center text-red-500">QR Code da Mesa Inválido</div>;

  // --- CENÁRIO 1: Mesa Fechada / Disponível ---
  if (!isTableActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 relative" style={{ backgroundColor: theme.backgroundColor }}>
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full">
          <ChefHat size={48} className="mx-auto mb-4" style={{ color: theme.primaryColor }} />
          <h1 className="text-2xl font-bold mb-2 text-gray-800">{theme.restaurantName}</h1>
          <div className="my-6">
            <h2 className="text-xl font-bold text-gray-700 mb-1">Mesa #{table.number}</h2>
            <p className="text-red-500 font-medium">Esta mesa está fechada</p>
          </div>
          <p className="text-gray-500 text-sm mb-8">
            Para iniciar o atendimento e liberar o cardápio, por favor solicite a presença de um garçom.
          </p>
          <Button 
            onClick={callWaiter} 
            className={`w-full py-4 flex items-center justify-center gap-2 text-lg font-bold shadow-lg ${waiterCalled ? 'bg-green-600' : 'bg-slate-800'}`}
          >
             {waiterCalled ? <><Loader2 className="animate-spin" size={24}/> Chamando...</> : <><Bell size={24} /> Chamar Garçom</>}
          </Button>
          {waiterCalled && <p className="text-green-600 text-sm mt-4 font-bold animate-pulse">Garçom a caminho!</p>}
        </div>
      </div>
    );
  }

  // --- CENÁRIO 2: Mesa Aberta, mas não autenticada (Pede Senha) ---
  const requiresAuth = table.accessCode && table.accessCode.length > 0;
  
  if (requiresAuth && !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6" style={{ backgroundColor: theme.backgroundColor }}>
         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full">
            <Lock size={48} className="text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Digite o Código</h2>
            <p className="text-gray-600 mb-6 text-sm">Insira o código de 4 dígitos fornecido pelo garçom para acessar o cardápio da <strong>Mesa {table.number}</strong>.</p>
            <input 
              type="tel" 
              maxLength={4}
              className={`text-center text-4xl tracking-[0.5em] w-full border-2 rounded-xl py-4 mb-4 font-mono font-bold focus:outline-none transition-colors ${errorMsg ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200 focus:border-blue-500'}`}
              value={accessPin}
              onChange={(e) => { setAccessPin(e.target.value); setErrorMsg(''); }}
              placeholder="0000"
            />
            {errorMsg && <div className="mb-4 text-red-500 text-sm flex items-center justify-center gap-2 font-bold animate-bounce"><AlertTriangle size={16} /> {errorMsg}</div>}
            <button 
                onClick={checkPin}
                className="w-full text-white font-bold py-3 rounded-lg shadow-md hover:opacity-90 transition-opacity mb-6"
                style={{ backgroundColor: theme.primaryColor }}
            >
                Entrar
            </button>
            {errorMsg && (
                <div className="animate-fade-in bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <p className="text-xs text-gray-500 mb-3">Esqueceu o código ou precisa de ajuda?</p>
                    <Button onClick={callWaiter} variant="secondary" className="w-full py-2 flex items-center justify-center gap-2 text-gray-700 bg-white border border-gray-300 shadow-sm hover:bg-gray-50">
                        <Bell size={18} /> {waiterCalled ? 'Solicitação Enviada!' : 'Chamar Garçom'}
                    </Button>
                </div>
            )}
         </div>
      </div>
    );
  }

  // --- CENÁRIO 3: Autenticado (Cardápio e Pedidos) ---

  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  
  // Filter products: Must be visible AND NOT an ingredient
  const visibleProducts = state.products
    .filter(p => p.isVisible && p.format !== 'INGREDIENT')
    .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: theme.backgroundColor, color: theme.fontColor }}>
      
      {/* --- MODAL DE PRODUTO --- */}
      {selectedProduct && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center animate-fade-in backdrop-blur-sm">
              <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                  
                  <div className="relative h-48 sm:h-56 bg-gray-100">
                      <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                      <button onClick={closeProductModal} className="absolute top-4 right-4 bg-white/90 p-2 rounded-full text-gray-800 shadow-md hover:bg-white transition-colors">
                          <X size={24} />
                      </button>
                  </div>

                  <div className="p-6 flex-1 overflow-y-auto">
                      <div className="flex justify-between items-start mb-2">
                          <h2 className="text-2xl font-bold text-gray-800 leading-tight">{selectedProduct.name}</h2>
                          <span className="text-xl font-bold text-green-700 whitespace-nowrap">R$ {selectedProduct.price.toFixed(2)}</span>
                      </div>
                      <p className="text-gray-500 text-sm mb-6 leading-relaxed">{selectedProduct.description}</p>

                      <div className="space-y-4">
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                  <Edit3 size={16} className="text-blue-500" /> Observações
                              </label>
                              <textarea 
                                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow bg-gray-50"
                                  rows={3}
                                  placeholder="Ex: Sem cebola, ponto da carne, gelo e limão..."
                                  value={modalNotes}
                                  onChange={(e) => setModalNotes(e.target.value)}
                              ></textarea>
                          </div>

                          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                              <span className="font-bold text-gray-700">Quantidade</span>
                              <div className="flex items-center gap-4 bg-white shadow-sm rounded-lg border px-2 py-1">
                                  <button onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))} className="p-2 text-gray-500 hover:text-blue-600 disabled:opacity-30"><Minus size={20} /></button>
                                  <span className="font-bold text-xl w-8 text-center">{modalQuantity}</span>
                                  <button onClick={() => setModalQuantity(modalQuantity + 1)} className="p-2 text-gray-500 hover:text-blue-600"><Plus size={20} /></button>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="p-4 border-t bg-white safe-area-bottom">
                      <button 
                          onClick={addToCartFromModal}
                          className="w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg flex justify-between items-center px-6 hover:opacity-90 active:scale-95 transition-all"
                          style={{ backgroundColor: theme.primaryColor }}
                      >
                          <span>Adicionar</span>
                          <span>R$ {(selectedProduct.price * modalQuantity).toFixed(2)}</span>
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Header Fixo */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
          <div className="flex justify-between items-center p-4">
            <div>
               {view !== 'MENU' ? (
                   <button onClick={() => setView('MENU')} className="flex items-center gap-2 text-gray-600 font-bold hover:text-gray-900 transition-colors">
                       <ArrowLeft size={20} /> Voltar ao Menu
                   </button>
               ) : (
                   <div className="flex items-center gap-2">
                       {theme.logoUrl ? (
                         <img src={theme.logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded-full bg-gray-50 p-1" />
                       ) : (
                         <ChefHat size={32} style={{ color: theme.primaryColor }} />
                       )}
                       <div>
                           <h1 className="font-bold text-lg leading-tight" style={{ color: theme.primaryColor }}>{theme.restaurantName}</h1>
                           <p className="text-xs text-gray-500">Mesa #{table.number} - {table.customerName}</p>
                       </div>
                   </div>
               )}
            </div>
            
            <div className="flex gap-2">
                {view !== 'BILL' && (
                    <button onClick={() => setView('BILL')} className="p-2 rounded-full text-gray-600 hover:bg-gray-100" title="Ver Conta">
                        <Receipt size={24} />
                    </button>
                )}
                {view !== 'STATUS' && (
                    <button onClick={() => setView('STATUS')} className="p-2 rounded-full text-gray-600 hover:bg-gray-100" title="Status do Pedido">
                        <Info size={24} />
                    </button>
                )}
                {view !== 'CART' && (
                    <button onClick={() => setView('CART')} className="relative p-2 rounded-full text-gray-600 hover:bg-gray-100" style={{ color: theme.primaryColor }} title="Carrinho">
                        <ShoppingCart size={24} />
                        {cart.length > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{cart.reduce((a, b) => a + b.quantity, 0)}</span>}
                    </button>
                )}
            </div>
          </div>
      </header>

      {/* Banner Area (Only on Menu View) */}
      {view === 'MENU' && (
          <>
            {theme.bannerUrl && (
                <div className="w-full h-48 md:h-64 bg-gray-200 overflow-hidden relative">
                    <img src={theme.bannerUrl} className="w-full h-full object-cover" alt="Banner do Restaurante" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                        <h2 className="text-white text-2xl font-bold shadow-sm">{theme.restaurantName}</h2>
                    </div>
                </div>
            )}
            
            {/* Search Bar */}
            <div className="p-4 pb-0 max-w-2xl mx-auto">
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar no cardápio..." 
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-shadow"
                        style={{ '--tw-ring-color': theme.primaryColor } as React.CSSProperties}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                     {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>
          </>
      )}

      {/* Main Content */}
      <main className="p-4 max-w-2xl mx-auto min-h-[calc(100vh-160px)]">
        
        {view === 'MENU' && (
          <div className="space-y-8 mt-2">
            {['Promocoes', 'Lanches', 'Pizzas', 'Pratos Principais', 'Acompanhamentos', 'Bebidas', 'Sobremesas'].map(category => {
              // Filter logic updated to include search query
              const items = visibleProducts.filter(p => 
                  p.category === category && 
                  p.name.toLowerCase().includes(searchQuery.toLowerCase())
              );
              
              if (items.length === 0) return null;
              
              // Verifica o modo de visualização (Lista vs Grade)
              const isGrid = theme.viewMode === 'GRID';

              return (
                <div key={category}>
                  <h2 className="text-xl font-bold mb-4 sticky top-16 bg-white/95 backdrop-blur py-2 z-10 px-2 rounded-lg shadow-sm border-l-4" style={{ borderColor: theme.primaryColor, color: theme.fontColor }}>{category}</h2>
                  <div className={isGrid ? "grid grid-cols-2 gap-4" : "flex flex-col gap-4"}>
                    {items.map(product => (
                      <div key={product.id} onClick={() => openProductModal(product)} className={`bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 flex cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99] ${isGrid ? 'flex-col' : 'flex-row p-3 gap-4'}`}>
                        
                        {/* Imagem */}
                        <div className={`${isGrid ? 'w-full h-32' : 'w-24 h-24 shrink-0'}`}>
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover bg-gray-100" />
                        </div>

                        {/* Conteúdo */}
                        <div className={`flex-1 flex flex-col justify-between ${isGrid ? 'p-3' : ''}`}>
                          <div>
                            <h3 className="font-bold text-gray-800 leading-tight mb-1">{product.name}</h3>
                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{product.description}</p>
                          </div>
                          <div className="flex justify-between items-center mt-auto">
                            <span className="font-bold text-lg" style={{ color: theme.primaryColor }}>R$ {product.price.toFixed(2)}</span>
                            <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md"
                                style={{ backgroundColor: theme.primaryColor }}
                            >
                                <Plus size={20} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
             {/* No Results Message */}
             {visibleProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && searchQuery && (
                 <div className="text-center py-10 text-gray-400">
                     <Search size={48} className="mx-auto mb-2 opacity-20"/>
                     <p>Nenhum produto encontrado para "{searchQuery}"</p>
                 </div>
             )}
          </div>
        )}

        {view === 'CART' && (
          <div className="bg-white rounded-xl shadow-lg border overflow-hidden animate-fade-in relative">
            <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Seu Pedido</h2>
                <button onClick={() => setView('MENU')} className="text-gray-400 hover:text-red-500"><X size={24}/></button>
            </div>
            
            <div className="p-4 min-h-[50vh]">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <ShoppingCart size={48} className="mb-4 opacity-50"/>
                        <p>Seu carrinho está vazio</p>
                        <button onClick={() => setView('MENU')} className="mt-4 text-blue-600 font-bold text-sm">Voltar ao Cardápio</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                    {cart.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start border-b pb-4 last:border-0">
                        <div className="flex-1">
                            <h4 className="font-medium text-gray-800">{item.product.name}</h4>
                            <p className="text-sm text-gray-500 font-medium">R$ {item.product.price.toFixed(2)} <span className="text-xs text-gray-400">x {item.quantity}</span></p>
                            {item.notes && (
                                <div className="text-xs mt-2 bg-yellow-50 text-yellow-800 border border-yellow-200 p-2 rounded flex items-start gap-1">
                                    <Info size={12} className="mt-0.5 shrink-0"/> {item.notes}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                            <span className="w-6 text-center font-bold text-lg">{item.quantity}</span>
                            <button onClick={() => removeFromCart(idx)} className="text-red-400 ml-2 hover:text-red-600 bg-red-50 p-2 rounded-lg"><X size={18}/></button>
                        </div>
                        </div>
                    ))}
                    </div>
                )}
            </div>
            
            {cart.length > 0 && (
                <div className="bg-gray-50 p-4 border-t sticky bottom-0">
                    <div className="flex justify-between text-xl font-bold mb-4 text-gray-800">
                        <span>Total</span>
                        <span>R$ {cartTotal.toFixed(2)}</span>
                    </div>
                    <button 
                        className="w-full py-4 rounded-xl text-white font-bold text-lg hover:opacity-90 shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2"
                        style={{ backgroundColor: '#16a34a' }}
                        onClick={submitOrder}
                    >
                        Enviar Pedido <ArrowLeft className="rotate-180" size={20} />
                    </button>
                </div>
            )}
          </div>
        )}

        {view === 'BILL' && (
          <div className="bg-white rounded-xl shadow-lg border overflow-hidden animate-fade-in">
              <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Receipt size={20}/> Conta Parcial</h2>
                <button onClick={() => setView('MENU')} className="text-gray-400 hover:text-red-500"><X size={24}/></button>
              </div>
              
              <div className="p-6">
                  <div className="space-y-3 mb-6">
                      {tableOrders.flatMap(o => o.items).map((item, idx) => {
                          const product = state.products.find(p => p.id === item.productId);
                          if(!product) return null;
                          return (
                              <div key={`${item.id}-${idx}`} className="flex justify-between text-sm border-b border-dashed border-gray-200 pb-2">
                                  <span className="text-gray-700 font-medium">{item.quantity}x {product.name}</span>
                                  <span className="font-bold text-gray-900">R$ {(product.price * item.quantity).toFixed(2)}</span>
                              </div>
                          );
                      })}
                      {tableOrders.length === 0 && <p className="text-center text-gray-400 py-10">Nenhum pedido realizado ainda.</p>}
                  </div>

                  {tableOrders.length > 0 && (
                    <div className="flex justify-between items-center text-2xl font-bold border-t-2 border-gray-800 pt-4 mb-8">
                        <span>Total</span>
                        <span style={{ color: theme.primaryColor }}>R$ {billTotal.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg text-sm text-yellow-800 text-center mb-4">
                     <p className="font-bold mb-1">Deseja fechar a conta?</p>
                     <p>Chame o garçom ou dirija-se ao caixa informando o número da sua mesa.</p>
                  </div>

                   <Button 
                    variant="outline" 
                    className="w-full bg-white border-blue-200 text-blue-600 hover:bg-blue-50"
                    onClick={callWaiter}
                   >
                     <Bell size={18} /> {waiterCalled ? 'Solicitação Enviada' : 'Chamar Garçom'}
                   </Button>
              </div>
          </div>
        )}

        {view === 'STATUS' && (
            <div className="bg-white rounded-xl shadow-lg border overflow-hidden animate-fade-in">
                <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Info size={20}/> Status dos Pedidos</h2>
                    <button onClick={() => setView('MENU')} className="text-gray-400 hover:text-red-500"><X size={24}/></button>
                </div>
                
                <div className="p-4 space-y-4">
                    {tableOrders.length === 0 && <p className="text-gray-500 text-center py-10">Nenhum pedido ativo encontrado.</p>}
                    {[...tableOrders].reverse().map(order => (
                        <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex justify-between text-xs text-gray-500 mb-3 border-b pb-2">
                                <span>PEDIDO #{order.id.substr(0,6).toUpperCase()}</span>
                                <span>{order.timestamp.toLocaleTimeString()}</span>
                            </div>
                            <div className="space-y-3">
                                {order.items.map(item => (
                                    <div key={item.id} className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-gray-800 font-medium">{item.quantity}x {item.productName}</span>
                                            {item.notes && <span className="text-xs text-gray-500 italic">Obs: {item.notes}</span>}
                                        </div>
                                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider shrink-0 ml-2
                                            ${item.status === 'PENDING' ? 'bg-gray-100 text-gray-600' : ''}
                                            ${item.status === 'PREPARING' ? 'bg-yellow-100 text-yellow-700 animate-pulse' : ''}
                                            ${item.status === 'READY' ? 'bg-green-100 text-green-700' : ''}
                                            ${item.status === 'DELIVERED' ? 'bg-blue-50 text-blue-600' : ''}
                                        `}>
                                            {item.status === 'PENDING' && 'Aguardando'}
                                            {item.status === 'PREPARING' && 'Preparando'}
                                            {item.status === 'READY' && 'Pronto'}
                                            {item.status === 'DELIVERED' && 'Entregue'}
                                            {item.status === 'CANCELLED' && 'Cancelado'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    <div className="mt-8 bg-blue-50 p-4 rounded-lg text-center">
                        <p className="text-blue-800 text-sm mb-2 font-medium">Precisa de algo mais?</p>
                        <Button 
                            variant="outline" 
                            className="w-full bg-white border-blue-200 text-blue-600 hover:bg-blue-50"
                            onClick={callWaiter}
                        >
                            {waiterCalled ? 'Solicitação Enviada' : 'Chamar Garçom'}
                        </Button>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};