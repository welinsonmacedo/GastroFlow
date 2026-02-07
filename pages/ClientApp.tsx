import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import { Button } from '../components/Button';
import { TableStatus, Product } from '../types';
import { ShoppingCart, ChefHat, Info, Plus, Minus, X, Lock, Receipt, Loader2, Bell, AlertTriangle } from 'lucide-react';

export const ClientApp: React.FC = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const { state, dispatch } = useRestaurant();
  const [cart, setCart] = useState<{ product: Product; quantity: number; notes: string }[]>([]);
  const [view, setView] = useState<'MENU' | 'CART' | 'STATUS' | 'BILL'>('MENU');
  const [accessPin, setAccessPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1, notes: '' }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
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
          
          {waiterCalled && (
             <p className="text-green-600 text-sm mt-4 font-bold animate-pulse">Garçom a caminho!</p>
          )}
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
              className={`text-center text-4xl tracking-[0.5em] w-full border-2 rounded-xl py-4 mb-4 font-mono font-bold focus:outline-none transition-colors
                  ${errorMsg ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200 focus:border-blue-500'}
              `}
              value={accessPin}
              onChange={(e) => { setAccessPin(e.target.value); setErrorMsg(''); }}
              placeholder="0000"
            />

            {errorMsg && (
                <div className="mb-4 text-red-500 text-sm flex items-center justify-center gap-2 font-bold animate-bounce">
                    <AlertTriangle size={16} /> {errorMsg}
                </div>
            )}
            
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
                    <Button 
                        onClick={callWaiter} 
                        variant="secondary"
                        className="w-full py-2 flex items-center justify-center gap-2 text-gray-700 bg-white border border-gray-300 shadow-sm hover:bg-gray-50"
                    >
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

  // Produtos visíveis e ordenados
  const visibleProducts = state.products
    .filter(p => p.isVisible)
    .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: theme.backgroundColor, color: theme.fontColor }}>
      {/* Header */}
      <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex justify-between items-center">
        <div>
           {theme.logoUrl ? (
             <img src={theme.logoUrl} alt="Logo" className="h-8 mb-1" />
           ) : (
             <h1 className="font-bold text-lg" style={{ color: theme.primaryColor }}>{theme.restaurantName}</h1>
           )}
          <p className="text-xs text-gray-500">Mesa #{table.number} - {table.customerName}</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setView('BILL')}
                className={`p-2 rounded-full ${view === 'BILL' ? 'bg-blue-100' : ''}`}
                style={{ color: view === 'BILL' ? theme.primaryColor : '#4b5563' }}
                title="Ver Conta"
            >
                <Receipt size={24} />
            </button>
            <button 
                onClick={() => setView('STATUS')}
                className={`p-2 rounded-full ${view === 'STATUS' ? 'bg-blue-100' : ''}`}
                style={{ color: view === 'STATUS' ? theme.primaryColor : '#4b5563' }}
                title="Status do Pedido"
            >
                <Info size={24} />
            </button>
            <button 
                onClick={() => setView(view === 'CART' ? 'MENU' : 'CART')}
                className="relative p-2"
                style={{ color: theme.primaryColor }}
                title="Carrinho"
            >
            <ShoppingCart size={24} />
            {cart.length > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cart.reduce((a, b) => a + b.quantity, 0)}
                </span>
            )}
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-2xl mx-auto">
        {view === 'MENU' && (
          <div className="space-y-6">
            {['Lanches', 'Pratos Principais', 'Acompanhamentos', 'Bebidas', 'Sobremesas', 'Pizzas'].map(category => {
              const items = visibleProducts.filter(p => p.category === category);
              if (items.length === 0) return null;
              return (
                <div key={category}>
                  <h2 className="text-xl font-bold mb-3" style={{ color: theme.fontColor }}>{category}</h2>
                  <div className="grid gap-4">
                    {items.map(product => (
                      <div key={product.id} className="bg-white rounded-xl p-3 shadow-sm flex gap-4">
                        <img src={product.image} alt={product.name} className="w-24 h-24 object-cover rounded-lg bg-gray-200" />
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-semibold">{product.name}</h3>
                            <p className="text-xs text-gray-500 line-clamp-2">{product.description}</p>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <span className="font-bold" style={{ color: theme.primaryColor }}>R$ {product.price.toFixed(2)}</span>
                            <button 
                                className="px-3 py-1.5 text-sm rounded-lg text-white"
                                style={{ backgroundColor: theme.primaryColor }}
                                onClick={() => addToCart(product)}
                            >
                                Adicionar
                            </button>
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
          <div className="bg-white rounded-xl shadow-sm p-4 min-h-[50vh]">
            <h2 className="text-xl font-bold mb-4">Seu Pedido</h2>
            {cart.length === 0 ? (
                <div className="text-center text-gray-500 py-10">Seu carrinho está vazio</div>
            ) : (
                <div className="space-y-4">
                {cart.map(item => (
                    <div key={item.product.id} className="flex justify-between items-start border-b pb-4">
                    <div className="flex-1">
                        <h4 className="font-medium">{item.product.name}</h4>
                        <p className="text-sm text-gray-500">R$ {item.product.price.toFixed(2)}</p>
                        <input 
                            type="text" 
                            placeholder="Observações (ex: sem cebola)..."
                            className="text-xs mt-1 w-full border-b border-gray-200 focus:border-blue-500 focus:outline-none py-1"
                            value={item.notes}
                            onChange={(e) => {
                                setCart(prev => prev.map(p => p.product.id === item.product.id ? { ...p, notes: e.target.value } : p));
                            }}
                        />
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                        <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 rounded bg-gray-100"><Minus size={16}/></button>
                        <span className="w-6 text-center font-medium">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 rounded bg-gray-100"><Plus size={16}/></button>
                        <button onClick={() => removeFromCart(item.product.id)} className="text-red-500 ml-2"><X size={18}/></button>
                    </div>
                    </div>
                ))}
                
                <div className="mt-6 pt-4 border-t">
                    <div className="flex justify-between text-lg font-bold mb-4">
                        <span>Total</span>
                        <span>R$ {cartTotal.toFixed(2)}</span>
                    </div>
                    <button 
                        className="w-full py-3 rounded-lg text-white font-bold text-lg hover:opacity-90"
                        style={{ backgroundColor: '#16a34a' }} // Green fixed for buy button
                        onClick={submitOrder}
                    >
                        Enviar Pedido para Cozinha
                    </button>
                </div>
                </div>
            )}
          </div>
        )}

        {view === 'BILL' && (
          <div className="bg-white rounded-xl shadow-sm p-6 min-h-[50vh]">
              <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Conta Parcial</h2>
              
              <div className="space-y-4 mb-6">
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
                  {tableOrders.length === 0 && <p className="text-center text-gray-400 py-4">Nenhum pedido realizado ainda.</p>}
              </div>

              {tableOrders.length > 0 && (
                <div className="flex justify-between items-center text-xl font-bold border-t-2 border-gray-800 pt-4 mb-8">
                    <span>Total</span>
                    <span style={{ color: theme.primaryColor }}>R$ {billTotal.toFixed(2)}</span>
                </div>
              )}
              
              <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg text-sm text-yellow-800 text-center">
                 <p className="font-bold mb-1">Deseja fechar a conta?</p>
                 <p>Chame o garçom ou dirija-se ao caixa informando o número da sua mesa.</p>
              </div>

               <Button 
                variant="outline" 
                className="w-full mt-4 bg-white border-blue-200 text-blue-600"
                onClick={callWaiter}
               >
                 <Bell size={18} /> {waiterCalled ? 'Solicitação Enviada' : 'Chamar Garçom'}
               </Button>
          </div>
        )}

        {view === 'STATUS' && (
            <div className="space-y-4">
                <h2 className="text-xl font-bold">Histórico de Pedidos</h2>
                {tableOrders.length === 0 && <p className="text-gray-500">Nenhum pedido ativo encontrado.</p>}
                {[...tableOrders].reverse().map(order => (
                    <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex justify-between text-sm text-gray-500 mb-2">
                            <span>Pedido #{order.id.substr(0,8)}</span>
                            <span>{order.timestamp.toLocaleTimeString()}</span>
                        </div>
                        <div className="space-y-2">
                            {order.items.map(item => (
                                <div key={item.id} className="flex justify-between items-center">
                                    <span className="text-gray-800">{item.quantity}x {item.productName}</span>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium
                                        ${item.status === 'PENDING' ? 'bg-gray-100 text-gray-600' : ''}
                                        ${item.status === 'PREPARING' ? 'bg-yellow-100 text-yellow-700' : ''}
                                        ${item.status === 'READY' ? 'bg-green-100 text-green-700' : ''}
                                        ${item.status === 'DELIVERED' ? 'bg-blue-50 text-blue-600' : ''}
                                    `}>
                                        {item.status === 'PENDING' && 'PENDENTE'}
                                        {item.status === 'PREPARING' && 'PREPARANDO'}
                                        {item.status === 'READY' && 'PRONTO'}
                                        {item.status === 'DELIVERED' && 'ENTREGUE'}
                                        {item.status === 'CANCELLED' && 'CANCELADO'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                <div className="mt-8 bg-blue-50 p-4 rounded-lg">
                    <p className="text-center text-blue-800 text-sm">Precisa de ajuda?</p>
                    <Button 
                        variant="outline" 
                        className="w-full mt-2 bg-white border-blue-200 text-blue-600"
                        onClick={callWaiter}
                    >
                        {waiterCalled ? 'Solicitação Enviada' : 'Chamar Garçom'}
                    </Button>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};