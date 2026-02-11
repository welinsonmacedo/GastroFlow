
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import { Button } from '../components/Button';
import { TableStatus, Product } from '../types';
import { ShoppingCart, ChefHat, Info, Plus, Minus, X, Lock, Receipt, Loader2, Bell, AlertTriangle, ArrowLeft, Search, Edit3, Zap, UtensilsCrossed, Clock, CheckSquare, Square } from 'lucide-react';

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

  const calculateUnitPrice = () => {
      if (!selectedProduct) return 0;
      const extrasTotal = (selectedProduct.linkedExtraIds || []).reduce((acc, id) => {
          if (!selectedExtraIds.includes(id)) return acc;
          const extraProd = state.products.find(p => p.id === id);
          return acc + (extraProd?.price || 0);
      }, 0);
      return selectedProduct.price + extrasTotal;
  };

  const addToCartFromModal = () => {
    if (!selectedProduct) return;

    let finalNote = modalNotes;

    if (selectedProduct.category === 'Bebidas') {
        const timingPrefix = drinkTiming === 'IMMEDIATE' ? '[ENTREGA IMEDIATA] ' : '[ENTREGAR COM COMIDA] ';
        finalNote = timingPrefix + finalNote;
    }

    if (selectedExtraIds.length > 0) {
        const extraNames = selectedExtraIds.map(id => {
            const prod = state.products.find(p => p.id === id);
            return `+ ${prod?.name}`;
        }).join(', ');
        finalNote = finalNote ? `${finalNote}\nAdicionais: ${extraNames}` : `Adicionais: ${extraNames}`;
    }
    
    finalNote = finalNote.trim();

    const productWithAdjustedPrice = {
        ...selectedProduct,
        price: calculateUnitPrice() 
    };

    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.product.id === selectedProduct.id && item.notes === finalNote && item.product.price === productWithAdjustedPrice.price);
      if (existingIndex >= 0) {
        const newCart = [...prev];
        newCart[existingIndex].quantity += modalQuantity;
        return newCart;
      }
      return [...prev, { product: productWithAdjustedPrice, quantity: modalQuantity, notes: finalNote }];
    });

    setSelectedProduct(null);
  };

  const billTotal = tableOrders.reduce((acc, order) => {
    return acc + order.items.reduce((sum, item) => {
       const product = state.products.find(p => p.id === item.productId);
       return sum + ((product?.price || 0) * item.quantity);
    }, 0);
  }, 0);

  if (!table) return <div className="p-8 text-center text-red-500">QR Code da Mesa Inválido</div>;

  if (!isTableActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 relative" style={{ backgroundColor: theme.backgroundColor }}>
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full">
          <ChefHat size={48} className="mx-auto mb-4" style={{ color: theme.primaryColor }} />
          <h1 className="text-2xl font-bold mb-2 text-gray-800">{theme.restaurantName}</h1>
          <h2 className="text-xl font-bold text-gray-700 mb-1">Mesa #{table.number}</h2>
          <p className="text-red-500 font-medium mb-4">Mesa fechada</p>
          <Button onClick={() => { dispatch({ type: 'CALL_WAITER', tableId: table.id }); setWaiterCalled(true); }} className="w-full py-4 flex items-center justify-center gap-2">
             {waiterCalled ? 'Chamando...' : 'Chamar Garçom'}
          </Button>
        </div>
      </div>
    );
  }

  const requiresAuth = table.accessCode && table.accessCode.length > 0;
  if (requiresAuth && !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6" style={{ backgroundColor: theme.backgroundColor }}>
         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full">
            <Lock size={48} className="text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Digite o Código</h2>
            <input type="tel" maxLength={4} className="text-center text-4xl tracking-[0.5em] w-full border-2 rounded-xl py-4 mb-4 font-mono font-bold" value={accessPin} onChange={e => setAccessPin(e.target.value)} placeholder="0000" />
            <button onClick={() => table.accessCode === accessPin ? setIsAuthenticated(true) : setErrorMsg('Incorreto')} className="w-full text-white font-bold py-3 rounded-lg shadow-md" style={{ backgroundColor: theme.primaryColor }}>Entrar</button>
            {errorMsg && <p className="text-red-500 text-xs mt-2">{errorMsg}</p>}
         </div>
      </div>
    );
  }

  const visibleProducts = state.products.filter(p => p.isVisible && !p.isExtra).sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: theme.backgroundColor, color: theme.fontColor }}>
      {selectedProduct && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center animate-fade-in backdrop-blur-sm">
              <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="relative h-56 sm:h-64 bg-white flex items-center justify-center border-b border-gray-100 p-4">
                      <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-contain" />
                      <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full text-gray-600 shadow-sm"><X size={24} /></button>
                  </div>
                  <div className="p-6 flex-1 overflow-y-auto">
                      <div className="flex justify-between items-start mb-2">
                          <h2 className="text-2xl font-bold text-gray-800 leading-tight">{selectedProduct.name}</h2>
                          <span className="text-xl font-bold text-green-700 whitespace-nowrap">R$ {calculateUnitPrice().toFixed(2)}</span>
                      </div>
                      <p className="text-gray-500 text-sm mb-6 leading-relaxed">{selectedProduct.description}</p>
                      <div className="space-y-6">
                          {selectedProduct.category === 'Bebidas' && (
                              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                  <label className="block text-sm font-bold text-blue-800 mb-3 flex items-center gap-2"><Clock size={16}/> Quando servir?</label>
                                  <div className="grid grid-cols-2 gap-3">
                                      <button onClick={() => setDrinkTiming('IMMEDIATE')} className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all ${drinkTiming === 'IMMEDIATE' ? 'border-blue-500 bg-blue-100 text-blue-700 font-bold' : 'bg-white text-gray-500 border-transparent'}`}><Zap size={24}/><span className="text-xs">Agora</span></button>
                                      <button onClick={() => setDrinkTiming('WITH_FOOD')} className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all ${drinkTiming === 'WITH_FOOD' ? 'border-orange-500 bg-orange-100 text-orange-700 font-bold' : 'bg-white text-gray-500 border-transparent'}`}><UtensilsCrossed size={24}/><span className="text-xs">Com Comida</span></button>
                                  </div>
                              </div>
                          )}
                          {selectedProduct.linkedExtraIds && selectedProduct.linkedExtraIds.length > 0 && (
                              <div className="border-t border-b py-4">
                                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Plus size={16} className="text-green-600"/> Adicionais</label>
                                  <div className="space-y-2">
                                      {selectedProduct.linkedExtraIds.map(id => {
                                          const extra = state.products.find(p => p.id === id);
                                          if (!extra) return null;
                                          const isSelected = selectedExtraIds.includes(id);
                                          return (
                                              <div key={id} onClick={() => toggleExtra(id)} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-orange-50 border-orange-300' : 'bg-white border-gray-100'}`}>
                                                  <div className="flex items-center gap-3">{isSelected ? <CheckSquare size={20} className="text-orange-600"/> : <Square size={20} className="text-gray-300"/>}<span className="text-sm font-medium">{extra.name}</span></div>
                                                  <span className="text-sm font-bold text-gray-500">+ R$ {extra.price.toFixed(2)}</span>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          )}
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><Edit3 size={16} /> Observações</label>
                              <textarea className="w-full border border-gray-300 rounded-xl p-3 text-sm bg-gray-50" rows={2} placeholder="Ex: Sem cebola..." value={modalNotes} onChange={e => setModalNotes(e.target.value)}></textarea>
                          </div>
                          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                              <span className="font-bold text-gray-700">Quantidade</span>
                              <div className="flex items-center gap-4 bg-white shadow-sm rounded-lg border px-2 py-1">
                                  <button onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))} className="p-2 text-gray-500 disabled:opacity-30"><Minus size={20} /></button>
                                  <span className="font-bold text-xl w-8 text-center">{modalQuantity}</span>
                                  <button onClick={() => setModalQuantity(modalQuantity + 1)} className="p-2 text-gray-500"><Plus size={20} /></button>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="p-4 border-t bg-white safe-area-bottom">
                      <button onClick={addToCartFromModal} className="w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg flex justify-between items-center px-6" style={{ backgroundColor: theme.primaryColor }}>
                          <span>Adicionar</span>
                          <span>R$ {(calculateUnitPrice() * modalQuantity).toFixed(2)}</span>
                      </button>
                  </div>
              </div>
          </div>
      )}
      <header className="bg-white shadow-sm sticky top-0 z-20"><div className="flex justify-between items-center p-4"><div>{view !== 'MENU' ? (<button onClick={() => setView('MENU')} className="flex items-center gap-2 text-gray-600 font-bold"><ArrowLeft size={20} /> Voltar</button>) : (<div className="flex items-center gap-2">{theme.logoUrl ? (<img src={theme.logoUrl} className="h-10 w-10 object-contain rounded-full" />) : (<ChefHat size={32} style={{ color: theme.primaryColor }} />)}<div><h1 className="font-bold text-lg leading-tight" style={{ color: theme.primaryColor }}>{theme.restaurantName}</h1><p className="text-xs text-gray-500">Mesa #{table.number}</p></div></div>)}</div><div className="flex gap-2">{view !== 'BILL' && (<button onClick={() => setView('BILL')} className="p-2 rounded-full text-gray-600"><Receipt size={24} /></button>)}{view !== 'STATUS' && (<button onClick={() => setView('STATUS')} className="p-2 rounded-full text-gray-600"><Info size={24} /></button>)}{view !== 'CART' && (<button onClick={() => setView('CART')} className="relative p-2 rounded-full text-gray-600"><ShoppingCart size={24} />{cart.length > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{cart.reduce((a, b) => a + b.quantity, 0)}</span>}</button>)}</div></div></header>
      <main className="p-4 max-w-2xl mx-auto min-h-[calc(100vh-160px)]">
        {view === 'MENU' && (
          <div className="space-y-8 mt-2">
            {['Promocoes', 'Lanches', 'Pizzas', 'Pratos Principais', 'Acompanhamentos', 'Bebidas', 'Sobremesas'].map(category => {
              const items = visibleProducts.filter(p => p.category === category && p.name.toLowerCase().includes(searchQuery.toLowerCase()));
              if (items.length === 0) return null;
              return (
                <div key={category}>
                  <h2 className="text-xl font-bold mb-4 sticky top-16 bg-white/95 backdrop-blur py-2 z-10 px-2 rounded-lg shadow-sm border-l-4" style={{ borderColor: theme.primaryColor }}>{category}</h2>
                  <div className={theme.viewMode === 'GRID' ? "grid grid-cols-2 gap-4" : "flex flex-col gap-4"}>
                    {items.map(product => (
                      <div key={product.id} onClick={() => openProductModal(product)} className={`bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 flex cursor-pointer hover:shadow-md transition-shadow ${theme.viewMode === 'GRID' ? 'flex-col' : 'flex-row p-3 gap-4'}`}>
                        <div className={`${theme.viewMode === 'GRID' ? 'w-full h-32' : 'w-24 h-24 shrink-0'}`}><img src={product.image} className="w-full h-full object-cover bg-gray-100" /></div>
                        <div className={`flex-1 flex flex-col justify-between ${theme.viewMode === 'GRID' ? 'p-3' : ''}`}><h3 className="font-bold text-gray-800 leading-tight mb-1">{product.name}</h3><p className="text-xs text-gray-500 line-clamp-2 mb-2">{product.description}</p><div className="flex justify-between items-center mt-auto"><span className="font-bold text-lg" style={{ color: theme.primaryColor }}>R$ {product.price.toFixed(2)}</span><div className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md" style={{ backgroundColor: theme.primaryColor }}><Plus size={20} /></div></div></div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {view === 'CART' && (
          <div className="bg-white rounded-xl shadow-lg border overflow-hidden animate-fade-in"><div className="bg-gray-50 p-4 border-b flex justify-between items-center"><h2 className="text-xl font-bold text-gray-800">Seu Pedido</h2><button onClick={() => setView('MENU')} className="text-gray-400"><X size={24}/></button></div><div className="p-4 min-h-[50vh]">{cart.length === 0 ? (<div className="flex flex-col items-center justify-center h-64 text-gray-400"><ShoppingCart size={48} className="mb-4 opacity-50"/><p>Vazio</p></div>) : (<div className="space-y-4">{cart.map((item, idx) => (<div key={idx} className="flex justify-between items-start border-b pb-4 last:border-0"><div className="flex-1"><h4 className="font-medium text-gray-800">{item.product.name}</h4><p className="text-sm text-gray-500 font-medium">R$ {item.product.price.toFixed(2)} x {item.quantity}</p>{item.notes && (<div className="text-xs mt-2 bg-yellow-50 text-yellow-800 border border-yellow-200 p-2 rounded whitespace-pre-line">{item.notes}</div>)}</div><div className="flex items-center gap-3 ml-4"><span className="font-bold text-lg">{item.quantity}</span><button onClick={() => setView('CART')} className="text-red-400 bg-red-50 p-2 rounded-lg"><X size={18}/></button></div></div>))}</div>)}</div>{cart.length > 0 && (<div className="bg-gray-50 p-4 border-t sticky bottom-0"><div className="flex justify-between text-xl font-bold mb-4"><span>Total</span><span>R$ {cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0).toFixed(2)}</span></div><button className="w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg" style={{ backgroundColor: '#16a34a' }} onClick={() => { dispatch({ type: 'PLACE_ORDER', tableId: table.id, items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity, notes: i.notes })) }); setCart([]); setView('STATUS'); }}>Enviar Pedido</button></div>)}</div>
        )}
      </main>
    </div>
  );
};
