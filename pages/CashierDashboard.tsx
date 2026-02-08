import React, { useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useUI } from '../context/UIContext';
import { TableStatus, Product, ProductType } from '../types';
import { Button } from '../components/Button';
import { DollarSign, CreditCard, Smartphone, History, Receipt, ArrowLeft, ShoppingCart, Search, Plus, Minus, Trash2, Tag, Box } from 'lucide-react';

export const CashierDashboard: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { showAlert, showConfirm } = useUI();
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY' | 'PDV'>('ACTIVE');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // --- PDV States ---
  const [posCart, setPosCart] = useState<{ product: Product; quantity: number; notes: string }[]>([]);
  const [posSearch, setPosSearch] = useState('');
  const [posCategory, setPosCategory] = useState('Todos');
  const [customerName, setCustomerName] = useState('');

  const occupiedTables = state.tables.filter(t => t.status !== TableStatus.AVAILABLE);
  
  const selectedTable = state.tables.find(t => t.id === selectedTableId);
  const tableOrders = state.orders.filter(o => o.tableId === selectedTableId && !o.isPaid);
  
  const totalAmount = tableOrders.reduce((sum, order) => 
    sum + order.items.reduce((orderSum, item) => {
        const product = state.products.find(p => p.id === item.productId);
        return orderSum + ((product?.price || 0) * item.quantity);
    }, 0)
  , 0);

  // --- Payment Handler (Tables) ---
  const handlePayment = (method: 'CASH' | 'CREDIT' | 'DEBIT' | 'PIX') => {
    if (!selectedTableId) return;
    const methodLabel = method === 'CREDIT' ? 'Cartão de Crédito' : method === 'DEBIT' ? 'Cartão de Débito' : method;
    
    showConfirm({
        title: "Confirmar Pagamento",
        message: `Deseja registrar o pagamento de R$ ${totalAmount.toFixed(2)} via ${methodLabel}?`,
        confirmText: "Confirmar",
        onConfirm: () => {
            dispatch({ 
                type: 'PROCESS_PAYMENT', 
                tableId: selectedTableId, 
                amount: totalAmount, 
                method: method 
            });
            setSelectedTableId(null);
            showAlert({ title: "Sucesso", message: "Pagamento registrado com sucesso!", type: 'SUCCESS' });
        }
    });
  };

  // --- PDV Logic ---
  const addToPosCart = (product: Product) => {
      setPosCart(prev => {
          const existing = prev.find(i => i.product.id === product.id);
          if (existing) {
              return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
          }
          return [...prev, { product, quantity: 1, notes: '' }];
      });
  };

  const updatePosQuantity = (index: number, delta: number) => {
      setPosCart(prev => {
          const newCart = [...prev];
          newCart[index].quantity += delta;
          if (newCart[index].quantity <= 0) return newCart.filter((_, i) => i !== index);
          return newCart;
      });
  };

  const posTotal = posCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  const handlePosCheckout = (method: 'CASH' | 'CREDIT' | 'DEBIT' | 'PIX') => {
      if (posCart.length === 0) return;
      const methodLabel = method === 'CREDIT' ? 'Cartão de Crédito' : method === 'DEBIT' ? 'Cartão de Débito' : method;

      showConfirm({
          title: "Finalizar Venda PDV",
          message: `Confirmar venda de R$ ${posTotal.toFixed(2)} via ${methodLabel}?`,
          confirmText: "Finalizar",
          onConfirm: () => {
              dispatch({
                  type: 'PROCESS_POS_SALE',
                  sale: {
                      customerName: customerName || 'Cliente Balcão',
                      items: posCart.map(i => ({ productId: i.product.id, quantity: i.quantity, notes: i.notes })),
                      totalAmount: posTotal,
                      method: method
                  }
              });
              setPosCart([]);
              setCustomerName('');
              showAlert({ title: "Venda Realizada", message: "Venda registrada e estoque atualizado.", type: 'SUCCESS' });
          }
      });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row h-screen overflow-hidden">
        {/* Sidebar Mini (Horizontal on mobile, Vertical on desktop) */}
        <div className="w-full lg:w-20 bg-slate-900 text-white flex flex-row lg:flex-col items-center justify-center lg:justify-start py-4 lg:py-6 gap-6 shrink-0 z-10">
            <button 
                onClick={() => setActiveTab('ACTIVE')}
                className={`p-3 rounded-xl transition-all ${activeTab === 'ACTIVE' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
                title="Caixa Ativo (Mesas)"
            >
                <DollarSign size={24} />
            </button>
            <button 
                onClick={() => setActiveTab('PDV')}
                className={`p-3 rounded-xl transition-all ${activeTab === 'PDV' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
                title="PDV / Venda Direta"
            >
                <ShoppingCart size={24} />
            </button>
            <button 
                onClick={() => setActiveTab('HISTORY')}
                className={`p-3 rounded-xl transition-all ${activeTab === 'HISTORY' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
                title="Histórico de Vendas"
            >
                <History size={24} />
            </button>
        </div>

      {activeTab === 'ACTIVE' && (
          <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-6 overflow-hidden">
            {/* Table List */}
            <div className="w-full lg:w-1/3 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[300px] lg:max-h-none lg:h-auto border border-gray-200">
                <div className="p-4 bg-gray-800 text-white font-bold flex justify-between items-center">
                    <span>Mesas Abertas</span>
                    <span className="text-xs bg-red-500 px-2 py-1 rounded-full">{occupiedTables.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {occupiedTables.length === 0 && <div className="p-8 text-center text-gray-400">Nenhuma mesa ativa.</div>}
                    {occupiedTables.map(table => (
                        <div 
                            key={table.id}
                            onClick={() => setSelectedTableId(table.id)}
                            className={`p-4 border-b cursor-pointer hover:bg-gray-50 flex justify-between items-center transition-colors
                                ${selectedTableId === table.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
                            `}
                        >
                            <div>
                                <div className="font-bold text-lg text-gray-800">Mesa {table.number}</div>
                                <div className="text-xs text-gray-500">{table.customerName}</div>
                            </div>
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-bold shadow-sm">
                                OCUPADA
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bill Details */}
            <div className="flex-1 bg-white rounded-xl shadow-sm p-4 lg:p-6 flex flex-col border border-gray-200 min-h-[500px]">
                {selectedTable ? (
                    <>
                        <div className="flex justify-between items-center border-b pb-4 mb-4">
                            <h2 className="text-xl lg:text-2xl font-bold text-gray-800">Checkout - Mesa {selectedTable.number}</h2>
                            <span className="text-sm text-gray-500">{new Date().toLocaleDateString()}</span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto mb-6 pr-2">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider sticky top-0">
                                    <tr>
                                        <th className="p-3 rounded-tl-lg">Item</th>
                                        <th className="p-3 text-right">Qtd</th>
                                        <th className="p-3 text-right hidden sm:table-cell">Unitário</th>
                                        <th className="p-3 text-right rounded-tr-lg">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {tableOrders.flatMap(order => order.items).map((item, idx) => {
                                        const product = state.products.find(p => p.id === item.productId);
                                        if (!product) return null;
                                        return (
                                            <tr key={`${item.id}-${idx}`} className="border-b hover:bg-gray-50">
                                                <td className="p-3 font-medium text-gray-700">{product.name}</td>
                                                <td className="p-3 text-right">{item.quantity}</td>
                                                <td className="p-3 text-right hidden sm:table-cell">R$ {product.price.toFixed(2)}</td>
                                                <td className="p-3 text-right font-bold">R$ {(product.price * item.quantity).toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {tableOrders.length === 0 && <div className="text-center py-10 text-gray-400">Nenhum pedido lançado nesta mesa.</div>}
                        </div>

                        <div className="bg-slate-50 p-4 lg:p-6 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-gray-500 font-medium">Total a Pagar</span>
                                <span className="text-3xl lg:text-4xl font-bold text-slate-800">R$ {totalAmount.toFixed(2)}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={() => handlePayment('CASH')}
                                    disabled={totalAmount === 0}
                                    className="flex flex-col items-center justify-center gap-2 h-20 bg-white border-2 border-green-100 hover:border-green-500 hover:bg-green-50 rounded-xl transition-all text-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <DollarSign size={24} /> 
                                    <span className="font-bold">Dinheiro</span>
                                </button>
                                <button 
                                    onClick={() => handlePayment('PIX')}
                                    disabled={totalAmount === 0}
                                    className="flex flex-col items-center justify-center gap-2 h-20 bg-white border-2 border-purple-100 hover:border-purple-500 hover:bg-purple-50 rounded-xl transition-all text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Smartphone size={24} />
                                    <span className="font-bold">Pix</span>
                                </button>
                                <button 
                                    onClick={() => handlePayment('DEBIT')}
                                    disabled={totalAmount === 0}
                                    className="flex flex-col items-center justify-center gap-2 h-20 bg-white border-2 border-cyan-100 hover:border-cyan-500 hover:bg-cyan-50 rounded-xl transition-all text-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <CreditCard size={24} />
                                    <span className="font-bold">Débito</span>
                                </button>
                                <button 
                                    onClick={() => handlePayment('CREDIT')}
                                    disabled={totalAmount === 0}
                                    className="flex flex-col items-center justify-center gap-2 h-20 bg-white border-2 border-blue-100 hover:border-blue-500 hover:bg-blue-50 rounded-xl transition-all text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <CreditCard size={24} />
                                    <span className="font-bold">Crédito</span>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Receipt size={64} className="mb-4 text-gray-200" />
                        <p>Selecione uma mesa para processar o pagamento</p>
                    </div>
                )}
            </div>
          </div>
      )}

      {activeTab === 'PDV' && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Left Column: Product Selection */}
              <div className="flex-1 flex flex-col border-r border-gray-200 bg-white">
                  {/* Search Header */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4 items-center">
                      <div className="relative flex-1">
                          <Search className="absolute left-3 top-3 text-gray-400" size={20}/>
                          <input 
                              type="text" 
                              className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              placeholder="Buscar produto (Nome ou Cód)..."
                              value={posSearch}
                              onChange={e => setPosSearch(e.target.value)}
                              autoFocus
                          />
                      </div>
                      <select 
                          className="p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                          value={posCategory}
                          onChange={e => setPosCategory(e.target.value)}
                      >
                          <option value="Todos">Todas Categorias</option>
                          {Array.from(new Set(state.products.map(p => p.category))).map(c => (
                              <option key={c} value={c}>{c}</option>
                          ))}
                      </select>
                  </div>

                  {/* Product Grid */}
                  <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                          {state.products.filter(p => 
                              (posCategory === 'Todos' || p.category === posCategory) &&
                              p.name.toLowerCase().includes(posSearch.toLowerCase())
                          ).map(product => (
                              <div 
                                  key={product.id} 
                                  onClick={() => addToPosCart(product)}
                                  className="bg-white p-3 rounded-xl shadow-sm border hover:border-blue-500 cursor-pointer flex flex-col h-full hover:shadow-md transition-all active:scale-95"
                              >
                                  <div className="h-24 w-full bg-gray-50 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                                      {product.image ? <img src={product.image} className="h-full w-full object-cover" /> : <Box className="text-gray-300"/>}
                                  </div>
                                  <h4 className="font-bold text-gray-800 text-sm line-clamp-2 mb-1">{product.name}</h4>
                                  <div className="mt-auto flex justify-between items-center">
                                      <span className="text-blue-600 font-bold">R$ {product.price.toFixed(2)}</span>
                                      <div className="bg-blue-50 p-1 rounded text-blue-600"><Plus size={16}/></div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

              {/* Right Column: Cart & Payment */}
              <div className="w-full lg:w-96 bg-white flex flex-col border-l border-gray-200 shadow-xl z-20">
                  <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
                      <h3 className="font-bold flex items-center gap-2"><ShoppingCart size={20}/> Venda Balcão</h3>
                      <span className="bg-blue-600 text-xs px-2 py-1 rounded font-bold">{posCart.reduce((a,b)=>a+b.quantity,0)} Itens</span>
                  </div>

                  {/* Customer Input */}
                  <div className="p-3 bg-gray-50 border-b">
                      <input 
                          type="text" 
                          placeholder="Nome do Cliente (Opcional)"
                          className="w-full p-2 border rounded text-sm focus:outline-none focus:border-blue-500 bg-white"
                          value={customerName}
                          onChange={e => setCustomerName(e.target.value)}
                      />
                  </div>

                  {/* Cart Items */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {posCart.length === 0 && (
                          <div className="text-center text-gray-400 mt-10">
                              <ShoppingCart size={48} className="mx-auto mb-2 opacity-20"/>
                              <p>Carrinho vazio</p>
                          </div>
                      )}
                      {posCart.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center border-b pb-3 last:border-0">
                              <div className="flex-1">
                                  <div className="font-medium text-sm text-gray-800">{item.product.name}</div>
                                  <div className="text-xs text-gray-500">R$ {item.product.price.toFixed(2)} un.</div>
                              </div>
                              <div className="flex items-center gap-3">
                                  <div className="flex items-center border rounded bg-gray-50">
                                      <button onClick={() => updatePosQuantity(idx, -1)} className="p-1 hover:bg-gray-200 text-gray-600"><Minus size={14}/></button>
                                      <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                                      <button onClick={() => updatePosQuantity(idx, 1)} className="p-1 hover:bg-gray-200 text-gray-600"><Plus size={14}/></button>
                                  </div>
                                  <span className="font-bold text-sm w-16 text-right">R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                              </div>
                          </div>
                      ))}
                  </div>

                  {/* Footer Totals */}
                  <div className="p-4 bg-gray-50 border-t">
                      <div className="flex justify-between items-center mb-4">
                          <span className="text-gray-600">Subtotal</span>
                          <span className="text-2xl font-bold text-gray-900">R$ {posTotal.toFixed(2)}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => handlePosCheckout('CASH')} className="bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition flex items-center justify-center gap-1 text-sm"><DollarSign size={16}/> Dinheiro</button>
                          <button onClick={() => handlePosCheckout('PIX')} className="bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition flex items-center justify-center gap-1 text-sm"><Smartphone size={16}/> Pix</button>
                          <button onClick={() => handlePosCheckout('DEBIT')} className="bg-cyan-600 text-white py-3 rounded-lg font-bold hover:bg-cyan-700 transition flex items-center justify-center gap-1 text-sm"><CreditCard size={16}/> Débito</button>
                          <button onClick={() => handlePosCheckout('CREDIT')} className="bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-1 text-sm"><CreditCard size={16}/> Crédito</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'HISTORY' && (
          <div className="flex-1 p-4 lg:p-8 h-screen overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Histórico de Transações</h2>
              
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden overflow-x-auto">
                   <table className="w-full text-left min-w-[700px]">
                        <thead className="bg-gray-100 text-gray-600 text-sm">
                            <tr>
                                <th className="p-4">ID</th>
                                <th className="p-4">Data/Hora</th>
                                <th className="p-4">Ref.</th>
                                <th className="p-4">Resumo</th>
                                <th className="p-4">Caixa</th>
                                <th className="p-4">Método</th>
                                <th className="p-4 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...state.transactions].reverse().map(t => (
                                <tr key={t.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4 font-mono text-xs text-gray-500">{t.id.slice(0, 8)}...</td>
                                    <td className="p-4 text-sm">{t.timestamp.toLocaleString()}</td>
                                    <td className="p-4 font-bold">{t.tableNumber > 0 ? `Mesa ${t.tableNumber}` : 'Balcão (PDV)'}</td>
                                    <td className="p-4 text-sm text-gray-600 max-w-xs truncate" title={t.itemsSummary}>{t.itemsSummary}</td>
                                    <td className="p-4 text-sm">{t.cashierName}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap
                                            ${t.method === 'PIX' ? 'bg-purple-100 text-purple-700' : ''}
                                            ${t.method === 'CREDIT' ? 'bg-blue-100 text-blue-700' : ''}
                                            ${t.method === 'DEBIT' ? 'bg-cyan-100 text-cyan-700' : ''}
                                            ${t.method === 'CASH' ? 'bg-green-100 text-green-700' : ''}
                                            ${t.method === 'CARD' ? 'bg-gray-100 text-gray-700' : ''} 
                                        `}>
                                            {t.method === 'CREDIT' ? 'CRÉDITO' : 
                                             t.method === 'DEBIT' ? 'DÉBITO' : 
                                             t.method === 'CASH' ? 'DINHEIRO' : 
                                             t.method === 'CARD' ? 'CARTÃO' : t.method}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-bold text-gray-800">R$ {t.amount.toFixed(2)}</td>
                                </tr>
                            ))}
                            {state.transactions.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-400">Nenhuma venda registrada ainda.</td>
                                </tr>
                            )}
                        </tbody>
                   </table>
              </div>
          </div>
      )}
    </div>
  );
};