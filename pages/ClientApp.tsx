
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import { Button } from '../components/Button';
import { TableStatus, Product } from '../types';
// Added missing icons: Trash2, ArrowRight, Activity
import { ShoppingCart, ChefHat, Info, Plus, Minus, X, Lock, Receipt, Loader2, Bell, AlertTriangle, ArrowLeft, Search, Edit3, Zap, UtensilsCrossed, Clock, CheckSquare, Square, Trash2, ArrowRight, Activity } from 'lucide-react';

export const ClientApp: React.FC = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const { state, dispatch } = useRestaurant();
  
  // Cart Items: Agora o carrinho guarda os itens e seus sub-itens vinculados
  const [cart, setCart] = useState<{ product: Product; quantity: number; notes: string; extras?: Product[] }[]>([]);
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
  const [drinkTiming, setDrinkTiming] = useState<'IMMEDIATE' | 'WITH_FOOD'>('IMMEDIATE');
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);

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
  const isTableActive = table?.status === TableStatus.OCCUPIED;
  const tableOrders = state.orders.filter(o => o.tableId === tableId && !o.isPaid);

  const openProductModal = (product: Product) => {
      setSelectedProduct(product);
      setModalQuantity(1);
      setModalNotes('');
      setDrinkTiming('IMMEDIATE');
      setSelectedExtraIds([]);
  };

  const toggleExtra = (id: string) => {
      setSelectedExtraIds(prev => 
          prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
  };

  const calculateModalTotal = () => {
      if (!selectedProduct) return 0;
      const extrasTotal = selectedExtraIds.reduce((acc, id) => {
          const extraProd = state.products.find(p => p.id === id);
          return acc + (extraProd?.price || 0);
      }, 0);
      return (selectedProduct.price + extrasTotal) * modalQuantity;
  };

  const addToCartFromModal = () => {
    if (!selectedProduct) return;

    let finalNote = modalNotes;

    if (selectedProduct.category === 'Bebidas') {
        const timingPrefix = drinkTiming === 'IMMEDIATE' ? '[IMEDIATA] ' : '[COM COMIDA] ';
        finalNote = timingPrefix + finalNote;
    }

    // Buscamos os objetos completos dos produtos extras para o carrinho
    const chosenExtras = selectedExtraIds
        .map(id => state.products.find(p => p.id === id))
        .filter(Boolean) as Product[];

    setCart(prev => [
        ...prev, 
        { 
            product: selectedProduct, 
            quantity: modalQuantity, 
            notes: finalNote.trim(),
            extras: chosenExtras
        }
    ]);

    setSelectedProduct(null);
  };

  const submitOrder = async () => {
    if (!tableId || !table || cart.length === 0) return;

    // Criamos um array flat de itens para o pedido
    // Cada extra vira um item de linha separado no banco de dados para descontar estoque
    const flattenedItems: { productId: string; quantity: number; notes: string }[] = [];

    cart.forEach(item => {
        // Item Principal
        flattenedItems.push({
            productId: item.product.id,
            quantity: item.quantity,
            notes: item.notes
        });

        // Adicionais como itens filhos
        item.extras?.forEach(extra => {
            flattenedItems.push({
                productId: extra.id,
                quantity: item.quantity, // Mesma quantidade do prato principal
                notes: `[ADICIONAL DE: ${item.product.name}]`
            });
        });
    });

    await dispatch({
      type: 'PLACE_ORDER',
      tableId,
      items: flattenedItems
    });
    
    setCart([]);
    setView('STATUS');
  };

  const billTotal = tableOrders.reduce((acc, order) => {
    return acc + order.items.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);
  }, 0);

  if (!table) return <div className="p-8 text-center text-red-500">QR Code Inválido</div>;

  if (!isTableActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6" style={{ backgroundColor: theme.backgroundColor }}>
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full border border-gray-100">
          <ChefHat size={64} className="mx-auto mb-6 text-blue-600" />
          <h1 className="text-2xl font-bold mb-2 text-gray-800">{theme.restaurantName}</h1>
          <h2 className="text-xl font-bold text-gray-700 mb-6 underline decoration-blue-500 underline-offset-4">Mesa #{table.number}</h2>
          <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold mb-8 animate-pulse border border-red-100">Mesa Fechada</div>
          <Button onClick={() => { dispatch({ type: 'CALL_WAITER', tableId: table.id }); setWaiterCalled(true); }} className="w-full py-4 text-lg font-bold shadow-lg">
             {waiterCalled ? 'Solicitação Enviada!' : 'Chamar Garçom'}
          </Button>
        </div>
      </div>
    );
  }

  const requiresAuth = table.accessCode && table.accessCode.length > 0;
  if (requiresAuth && !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6" style={{ backgroundColor: theme.backgroundColor }}>
         <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full border border-gray-100">
            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock size={32} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Digite o Código</h2>
            <p className="text-gray-400 text-sm mb-6">Insira os 4 dígitos para ver o menu.</p>
            <input 
                type="tel" maxLength={4} 
                className="text-center text-5xl tracking-[0.5em] w-full border-2 rounded-2xl py-4 mb-6 font-mono font-bold focus:border-blue-500 outline-none" 
                value={accessPin} 
                onChange={e => setAccessPin(e.target.value)} 
                placeholder="0000" 
            />
            <Button onClick={() => table.accessCode === accessPin ? setIsAuthenticated(true) : setErrorMsg('Código Incorreto')} className="w-full py-4 text-lg font-bold">Acessar Cardápio</Button>
            {errorMsg && <p className="text-red-500 text-xs mt-4 font-bold animate-bounce">{errorMsg}</p>}
         </div>
      </div>
    );
  }

  const visibleProducts = state.products.filter(p => p.isVisible && !p.isExtra).sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: theme.backgroundColor, color: theme.fontColor }}>
      
      {/* MODAL PRODUTO + ADICIONAIS */}
      {selectedProduct && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center animate-fade-in backdrop-blur-sm">
              <div className="bg-white w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] border border-gray-100">
                  <div className="relative h-64 sm:h-72 bg-white flex items-center justify-center p-4 border-b">
                      <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-contain drop-shadow-xl" />
                      <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 bg-gray-100/80 p-3 rounded-full text-gray-800 shadow-sm backdrop-blur-sm hover:bg-red-500 hover:text-white transition-all"><X size={24} /></button>
                  </div>
                  <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                      <div className="flex justify-between items-start mb-2">
                          <h2 className="text-3xl font-extrabold text-gray-800 leading-tight">{selectedProduct.name}</h2>
                          <span className="text-2xl font-black text-green-600 whitespace-nowrap">R$ {selectedProduct.price.toFixed(2)}</span>
                      </div>
                      <p className="text-gray-500 text-sm mb-8 leading-relaxed font-medium">{selectedProduct.description}</p>
                      
                      <div className="space-y-8">
                          {selectedProduct.category === 'Bebidas' && (
                              <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm">
                                  <label className="block text-sm font-black text-blue-800 mb-3 flex items-center gap-2 uppercase tracking-wider"><Clock size={16}/> Quando servir?</label>
                                  <div className="grid grid-cols-2 gap-3">
                                      <button onClick={() => setDrinkTiming('IMMEDIATE')} className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${drinkTiming === 'IMMEDIATE' ? 'border-blue-500 bg-white text-blue-700 shadow-md scale-[1.02]' : 'bg-white/50 text-gray-400 border-transparent opacity-70'}`}><Zap size={24}/><span className="text-[10px] font-bold">ENTREGAR AGORA</span></button>
                                      <button onClick={() => setDrinkTiming('WITH_FOOD')} className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${drinkTiming === 'WITH_FOOD' ? 'border-orange-500 bg-white text-orange-700 shadow-md scale-[1.02]' : 'bg-white/50 text-gray-400 border-transparent opacity-70'}`}><UtensilsCrossed size={24}/><span className="text-[10px] font-bold">COM A COMIDA</span></button>
                                  </div>
                              </div>
                          )}

                          {/* LISTA DE ADICIONAIS VINCULADOS */}
                          {selectedProduct.linkedExtraIds && selectedProduct.linkedExtraIds.length > 0 && (
                              <div className="space-y-4">
                                  <label className="block text-sm font-black text-gray-700 flex items-center gap-2 uppercase tracking-wider"><Plus size={18} className="text-green-600"/> Personalize seu prato</label>
                                  <div className="space-y-3">
                                      {selectedProduct.linkedExtraIds.map(id => {
                                          const extra = state.products.find(p => p.id === id);
                                          if (!extra) return null;
                                          const isSelected = selectedExtraIds.includes(id);
                                          return (
                                              <div 
                                                key={id} 
                                                onClick={() => toggleExtra(id)} 
                                                className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${isSelected ? 'bg-orange-50 border-orange-400 ring-4 ring-orange-50' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}
                                              >
                                                  <div className="flex items-center gap-4">
                                                      <div className="relative">
                                                          {isSelected ? <CheckSquare size={24} className="text-orange-600"/> : <Square size={24} className="text-gray-300"/>}
                                                      </div>
                                                      <div className="min-w-0">
                                                          <span className={`text-sm block font-bold truncate ${isSelected ? 'text-orange-900' : 'text-gray-700'}`}>{extra.name}</span>
                                                          <span className="text-[10px] text-gray-400">R$ {extra.price.toFixed(2)}</span>
                                                      </div>
                                                  </div>
                                                  <span className={`text-sm font-black ${isSelected ? 'text-orange-600' : 'text-gray-400'}`}>+ R$ {extra.price.toFixed(2)}</span>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          )}

                          <div className="space-y-2">
                              <label className="block text-sm font-black text-gray-700 flex items-center gap-2 uppercase tracking-wider"><Edit3 size={18} className="text-blue-500" /> Observações</label>
                              <textarea className="w-full border-2 border-gray-100 rounded-2xl p-4 text-sm bg-gray-50 focus:border-blue-500 outline-none transition-colors" rows={2} placeholder="Ex: Sem cebola, ponto da carne..." value={modalNotes} onChange={e => setModalNotes(e.target.value)}></textarea>
                          </div>

                          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border-2 border-gray-100">
                              <span className="font-black text-gray-600 uppercase tracking-widest text-xs">Quantidade</span>
                              <div className="flex items-center gap-6 bg-white shadow-sm rounded-xl px-4 py-2 border">
                                  <button onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))} className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30"><Minus size={22} /></button>
                                  <span className="font-black text-2xl w-8 text-center text-gray-800">{modalQuantity}</span>
                                  <button onClick={() => setModalQuantity(modalQuantity + 1)} className="p-1 text-gray-400 hover:text-green-600"><Plus size={22} /></button>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="p-6 border-t bg-white safe-area-bottom">
                      <button 
                        onClick={addToCartFromModal} 
                        className="w-full py-5 rounded-2xl text-white font-black text-xl shadow-xl hover:scale-[0.98] active:scale-95 transition-all flex justify-between items-center px-8" 
                        style={{ backgroundColor: theme.primaryColor }}
                      >
                          <span>Adicionar</span>
                          <span className="bg-white/20 px-3 py-1 rounded-lg">R$ {calculateModalTotal().toFixed(2)}</span>
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* HEADER */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
          <div className="flex justify-between items-center p-4 max-w-2xl mx-auto">
            <div>
               {view !== 'MENU' ? (
                   <button onClick={() => setView('MENU')} className="flex items-center gap-2 text-gray-700 font-black hover:text-blue-600 transition-colors uppercase tracking-widest text-xs">
                       <ArrowLeft size={20} /> Voltar
                   </button>
               ) : (
                   <div className="flex items-center gap-3">
                       {theme.logoUrl ? (
                         <img src={theme.logoUrl} className="h-10 w-10 object-contain rounded-xl shadow-sm border border-gray-50" />
                       ) : (
                         <ChefHat size={32} style={{ color: theme.primaryColor }} />
                       )}
                       <div>
                           <h1 className="font-black text-lg leading-tight uppercase tracking-tight" style={{ color: theme.primaryColor }}>{theme.restaurantName}</h1>
                           <p className="text-[10px] text-gray-400 font-bold">MESA #{table.number} • {table.customerName}</p>
                       </div>
                   </div>
               )}
            </div>
            
            <div className="flex gap-2">
                <button onClick={() => setView('BILL')} className="p-2.5 rounded-full text-gray-600 hover:bg-gray-100 transition-colors"><Receipt size={24} /></button>
                <button onClick={() => setView('STATUS')} className="p-2.5 rounded-full text-gray-600 hover:bg-gray-100 transition-colors"><Info size={24} /></button>
                <button onClick={() => setView('CART')} className="relative p-2.5 rounded-full text-gray-600 hover:bg-gray-100 transition-colors">
                    <ShoppingCart size={24} />
                    {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-black border-2 border-white shadow-md">{cart.length}</span>}
                </button>
            </div>
          </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto min-h-[calc(100vh-160px)]">
        {view === 'MENU' && (
          <div className="space-y-12 mt-4 animate-fade-in">
            {/* Search */}
            <div className="relative group">
                <Search size={20} className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors"/>
                <input 
                    className="w-full bg-white border-2 border-gray-100 p-3.5 pl-12 rounded-2xl text-sm focus:border-blue-500 outline-none shadow-sm transition-all" 
                    placeholder="O que você deseja pedir hoje?..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {['Lanches', 'Pizzas', 'Pratos Principais', 'Acompanhamentos', 'Bebidas', 'Sobremesas'].map(category => {
              const items = visibleProducts.filter(p => p.category === category && p.name.toLowerCase().includes(searchQuery.toLowerCase()));
              if (items.length === 0) return null;
              
              const isGrid = theme.viewMode === 'GRID';

              return (
                <div key={category} className="space-y-6">
                  <h2 className="text-xl font-black mb-4 flex items-center gap-3 border-l-4 pl-4 uppercase tracking-[0.2em]" style={{ borderColor: theme.primaryColor }}>
                    {category}
                    <span className="h-[1px] flex-1 bg-gray-100"></span>
                  </h2>
                  <div className={isGrid ? "grid grid-cols-2 gap-4" : "flex flex-col gap-5"}>
                    {items.map(product => (
                      <div key={product.id} onClick={() => openProductModal(product)} className={`bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100 flex cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all active:scale-95 group ${isGrid ? 'flex-col' : 'flex-row p-4 gap-5'}`}>
                        <div className={`relative ${isGrid ? 'w-full h-40' : 'w-24 h-24 sm:w-32 sm:h-32 shrink-0'} rounded-2xl overflow-hidden bg-gray-50`}>
                            <img src={product.image} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-black text-gray-800 shadow-sm">R$ {product.price.toFixed(0)}</div>
                        </div>
                        <div className={`flex-1 flex flex-col justify-between ${isGrid ? 'p-5' : ''}`}>
                          <div className="space-y-1">
                            <h3 className="font-black text-gray-800 leading-tight text-lg group-hover:text-blue-600 transition-colors">{product.name}</h3>
                            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed font-medium">{product.description}</p>
                          </div>
                          <div className="flex justify-between items-center mt-4">
                            <span className="font-black text-xl text-green-600">R$ {product.price.toFixed(2)}</span>
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:rotate-90" style={{ backgroundColor: theme.primaryColor }}>
                                <Plus size={24} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === 'CART' && (
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-fade-in flex flex-col min-h-[60vh]">
            <div className="bg-gray-50/80 backdrop-blur-md p-6 border-b flex justify-between items-center sticky top-0 z-10">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Sua Cesta</h2>
                    <p className="text-[10px] font-bold text-gray-400">Revise seus itens antes de enviar à cozinha.</p>
                </div>
                <button onClick={() => setView('MENU')} className="text-gray-400 hover:text-red-500 transition-colors"><X size={32}/></button>
            </div>
            
            <div className="p-6 flex-1 space-y-6">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 space-y-4">
                        <div className="bg-gray-100 p-8 rounded-full"><ShoppingCart size={64} className="opacity-20"/></div>
                        <p className="font-bold">Sua cesta está vazia</p>
                        <Button onClick={() => setView('MENU')} variant="outline" className="rounded-full px-8">Explorar Cardápio</Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                    {cart.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start border-b border-gray-100 pb-6 last:border-0 animate-fade-in" style={{ animationDelay: `${idx * 0.1}s` }}>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-black text-gray-800 text-lg leading-tight truncate">{item.quantity}x {item.product.name}</h4>
                                <div className="flex items-center gap-3 mt-1 mb-2">
                                    <span className="text-sm text-green-600 font-black">R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase">Base</span>
                                </div>
                                
                                {item.extras && item.extras.length > 0 && (
                                    <div className="space-y-1.5 mb-3">
                                        {item.extras.map(ex => (
                                            <div key={ex.id} className="flex items-center gap-2 text-xs font-bold text-orange-600 bg-orange-50 w-fit px-2 py-0.5 rounded-lg border border-orange-100">
                                                <Plus size={10} strokeWidth={3}/> {ex.name} (+R$ {ex.price.toFixed(2)})
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {item.notes && (
                                    <div className="text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-100 p-3 rounded-2xl flex items-start gap-2 italic">
                                        <Edit3 size={14} className="shrink-0 mt-0.5 opacity-50"/> "{item.notes}"
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col items-end gap-4 ml-4">
                                <button onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2.5 rounded-full transition-all border border-transparent hover:border-red-100">
                                    <Trash2 size={22}/>
                                </button>
                            </div>
                        </div>
                    ))}
                    </div>
                )}
            </div>
            
            {cart.length > 0 && (
                <div className="bg-gray-50 p-8 border-t space-y-6">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400 font-black uppercase tracking-widest text-xs">Total do Pedido</span>
                        <span className="text-4xl font-black text-gray-800">R$ {cart.reduce((acc, item) => {
                            const extrasSum = (item.extras || []).reduce((s, e) => s + e.price, 0);
                            return acc + ((item.product.price + extrasSum) * item.quantity);
                        }, 0).toFixed(2)}</span>
                    </div>
                    <button 
                        className="w-full py-5 rounded-[1.8rem] text-white font-black text-2xl shadow-2xl hover:scale-[0.99] active:scale-95 transition-all flex items-center justify-center gap-4 bg-emerald-600"
                        onClick={submitOrder}
                    >
                        Confirmar Pedido <ArrowRight size={28} strokeWidth={3}/>
                    </button>
                    <p className="text-[10px] text-gray-400 text-center font-bold px-4 leading-relaxed italic">
                        Ao clicar em confirmar, seu pedido é enviado instantaneamente para a nossa equipe de produção.
                    </p>
                </div>
            )}
          </div>
        )}

        {view === 'BILL' && (
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-fade-in">
              <div className="bg-slate-900 p-8 text-white">
                <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3"><Receipt size={32} className="text-blue-400"/> Sua Conta</h2>
                <p className="text-blue-300/60 text-xs font-bold mt-1">Mesa #{table.number} • {table.customerName}</p>
              </div>
              
              <div className="p-8">
                  <div className="space-y-4 mb-8">
                      {tableOrders.flatMap(o => o.items).map((item, idx) => (
                          <div key={`${item.id}-${idx}`} className="flex justify-between text-sm border-b border-dashed border-gray-100 pb-4 last:border-0">
                              <div className="flex flex-col">
                                  <span className="text-gray-800 font-black">{item.quantity}x {item.productName}</span>
                                  {item.notes && <span className="text-[10px] text-gray-400 font-bold italic mt-0.5">{item.notes}</span>}
                              </div>
                              <span className="font-black text-gray-900">R$ {(item.productPrice * item.quantity).toFixed(2)}</span>
                          </div>
                      ))}
                      {tableOrders.length === 0 && (
                        <div className="text-center py-20 text-gray-300">
                            <Receipt size={64} className="mx-auto mb-4 opacity-10"/>
                            <p className="font-bold">Nenhum consumo registrado ainda.</p>
                        </div>
                      )}
                  </div>

                  {tableOrders.length > 0 && (
                    <div className="flex justify-between items-center text-3xl font-black border-t-4 border-gray-800 pt-6 mb-10">
                        <span className="text-gray-400 text-sm uppercase tracking-widest">Total Geral</span>
                        <span style={{ color: theme.primaryColor }}>R$ {billTotal.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="bg-yellow-50 border-2 border-yellow-100 p-6 rounded-3xl text-sm text-yellow-800 mb-8 space-y-2">
                     <p className="font-black text-lg flex items-center gap-2"><Info size={20}/> Deseja fechar a conta?</p>
                     <p className="font-medium opacity-80">Por favor, chame nosso garçom através do botão abaixo para processar o pagamento e liberar a mesa.</p>
                  </div>

                   <Button 
                    variant="outline" 
                    className="w-full py-5 rounded-2xl bg-white border-blue-100 text-blue-600 hover:bg-blue-50 font-black shadow-lg text-lg"
                    onClick={() => { dispatch({ type: 'CALL_WAITER', tableId: table.id }); setWaiterCalled(true); }}
                   >
                     <Bell size={24} className={waiterCalled ? "animate-ping" : ""} /> {waiterCalled ? 'GARÇOM CHAMADO' : 'CHAMAR GARÇOM AGORA'}
                   </Button>
              </div>
          </div>
        )}

        {view === 'STATUS' && (
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-fade-in">
                <div className="bg-blue-600 p-8 text-white">
                    <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3"><Clock size={32}/> Meus Pedidos</h2>
                    <p className="text-blue-100/60 text-xs font-bold mt-1">Acompanhe a produção em tempo real.</p>
                </div>
                
                <div className="p-8 space-y-6">
                    {tableOrders.length === 0 && (
                         <div className="text-center py-20 text-gray-300">
                            <Activity size={64} className="mx-auto mb-4 opacity-10"/>
                            <p className="font-bold">Aguardando seu primeiro pedido!</p>
                        </div>
                    )}
                    {[...tableOrders].reverse().map(order => (
                        <div key={order.id} className="bg-gray-50 rounded-3xl p-6 border border-gray-100 shadow-sm animate-fade-in">
                            <div className="flex justify-between text-[10px] font-black text-gray-400 mb-4 border-b border-gray-200 pb-3 uppercase tracking-widest">
                                <span>PEDIDO #{order.id.substr(0,6)}</span>
                                <span>{order.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div className="space-y-4">
                                {order.items.map(item => (
                                    <div key={item.id} className="flex justify-between items-center">
                                        <div className="flex flex-col min-w-0 pr-4">
                                            <span className="text-gray-800 font-black truncate">{item.quantity}x {item.productName}</span>
                                            {item.notes && <span className="text-[10px] text-gray-400 italic font-bold leading-tight">"{item.notes}"</span>}
                                        </div>
                                        <span className={`text-[9px] px-3 py-1.5 rounded-full font-black uppercase tracking-tighter shrink-0 ml-2 shadow-sm border
                                            ${item.status === 'PENDING' ? 'bg-white text-gray-500 border-gray-200' : ''}
                                            ${item.status === 'PREPARING' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 animate-pulse' : ''}
                                            ${item.status === 'READY' ? 'bg-green-600 text-white border-green-700' : ''}
                                            ${item.status === 'DELIVERED' ? 'bg-blue-100 text-blue-700 border-blue-200' : ''}
                                        `}>
                                            {item.status === 'PENDING' && 'Fila'}
                                            {item.status === 'PREPARING' && 'Produzindo'}
                                            {item.status === 'READY' && 'Pronto!'}
                                            {item.status === 'DELIVERED' && 'Entregue'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    <div className="mt-8 bg-blue-50/50 p-6 rounded-3xl border-2 border-dashed border-blue-100 text-center">
                        <p className="text-blue-800 text-xs mb-4 font-black uppercase tracking-widest">Precisa de algo mais?</p>
                        <Button 
                            variant="outline" 
                            className="w-full bg-white border-blue-200 text-blue-600 hover:bg-blue-50 font-black py-4 rounded-2xl shadow-md"
                            onClick={() => { dispatch({ type: 'CALL_WAITER', tableId: table.id }); setWaiterCalled(true); }}
                        >
                            {waiterCalled ? 'JÁ CHAMAMOS O GARÇOM' : 'CHAMAR GARÇOM'}
                        </Button>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};
