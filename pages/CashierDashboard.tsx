
import React, { useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useFinance } from '../context/FinanceContext';
import { useUI } from '../context/UIContext';
import { TableStatus, Product } from '../types';
import { Button } from '../components/Button';
import { DollarSign, History, ShoppingCart, Search, Wallet, Receipt, Trash2, User, Lock, ArrowRight } from 'lucide-react';
import { CloseRegisterModal } from '../components/modals/CloseRegisterModal';
import { CashBleedModal } from '../components/modals/CashBleedModal';

export const CashierDashboard: React.FC = () => {
  const { state: restState, dispatch: restDispatch } = useRestaurant();
  const { state: finState, openRegister, refreshTransactions } = useFinance();
  const { showAlert, showConfirm } = useUI();
  
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY' | 'PDV' | 'MANAGE'>('ACTIVE');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  
  // Management States
  const [openRegisterAmount, setOpenRegisterAmount] = useState('');
  const [bleedModalOpen, setBleedModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);

  // POS States
  const [posCart, setPosCart] = useState<{ product: Product; quantity: number; notes: string }[]>([]);
  const [posSearch, setPosSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [processingSale, setProcessingSale] = useState(false);

  const occupiedTables = restState.tables.filter(t => t.status !== TableStatus.AVAILABLE);
  const selectedTable = restState.tables.find(t => t.id === selectedTableId);
  const tableOrders = restState.orders.filter(o => o.tableId === selectedTableId && !o.isPaid);
  const totalAmount = tableOrders.reduce((sum, order) => sum + order.items.reduce((s, i) => {
        const p = restState.products.find(prod => prod.id === i.productId);
        return s + ((p?.price || 0) * i.quantity);
  }, 0), 0);

  // --- POS LOGIC ---
  const addToPosCart = (product: Product) => {
      setPosCart(prev => {
          const existing = prev.find(i => i.product.id === product.id);
          if (existing) {
              return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
          }
          return [...prev, { product, quantity: 1, notes: '' }];
      });
  };

  const removeFromPosCart = (index: number) => {
      setPosCart(prev => prev.filter((_, i) => i !== index));
  };

  const handlePosSale = async (method: 'CASH' | 'CREDIT' | 'DEBIT' | 'PIX') => {
      if (!finState.activeCashSession) return showAlert({ title: "Caixa Fechado", message: "Abra o caixa antes de vender.", type: 'ERROR' });
      if (posCart.length === 0) return showAlert({ title: "Carrinho Vazio", message: "Adicione produtos.", type: 'WARNING' });

      setProcessingSale(true);
      
      const total = posCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
      const cleanItems = posCart.map(i => ({ 
          productId: i.product.id, 
          quantity: Number(i.quantity), 
          notes: i.notes || '' 
      }));

      try {
          await restDispatch({
              type: 'PROCESS_POS_SALE',
              sale: {
                  customerName: customerName.trim() || 'Consumidor Final',
                  items: cleanItems,
                  totalAmount: Number(total.toFixed(2)),
                  method
              }
          });

          setPosCart([]);
          setCustomerName('');
          showAlert({ title: "Venda Registrada", message: `Venda de R$ ${total.toFixed(2)} realizada!`, type: 'SUCCESS' });
          await refreshTransactions();

      } catch (error: any) {
          console.error("Sale Failed", error);
          showAlert({ title: "Erro na Venda", message: error.message || "Não foi possível salvar a venda.", type: 'ERROR' });
      } finally {
          setProcessingSale(false);
      }
  };

  // --- MANAGEMENT HANDLERS ---
  const handleOpenRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      await openRegister(parseFloat(openRegisterAmount), 'Staff');
      setOpenRegisterAmount('');
  };

  const handlePayment = (method: 'CASH' | 'CREDIT' | 'DEBIT' | 'PIX') => {
      if(!finState.activeCashSession) return showAlert({ title: "Erro", message: "Caixa fechado.", type: 'ERROR' });
      if(!selectedTableId) return;
      showConfirm({
          title: "Confirmar Pagamento", message: `Receber R$ ${totalAmount.toFixed(2)}?`,
          onConfirm: () => {
              restDispatch({ type: 'PROCESS_PAYMENT', tableId: selectedTableId, amount: totalAmount, method });
              setSelectedTableId(null);
              showAlert({ title: "Sucesso", message: "Pago!", type: 'SUCCESS' });
              setTimeout(() => refreshTransactions(), 500); 
          }
      });
  };

  // --- TELA DE CAIXA FECHADO (ABRIR CAIXA) ---
  if (!finState.activeCashSession) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
              <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-md w-full">
                  <div className="bg-blue-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                      <Lock size={40} className="text-blue-600" />
                  </div>
                  <h2 className="text-3xl font-bold mb-2 text-gray-800">Caixa Fechado</h2>
                  <p className="text-gray-500 mb-8">Informe o fundo de troco para iniciar as vendas.</p>
                  <form onSubmit={handleOpenRegister}>
                      <div className="mb-6">
                          <label className="block text-sm font-bold text-gray-700 mb-2 text-left">Valor em Gaveta (R$)</label>
                          <input 
                              type="number" 
                              step="0.01" 
                              className="border-2 border-gray-200 p-4 rounded-xl w-full text-center text-3xl font-bold focus:outline-none focus:border-blue-500 transition-colors" 
                              placeholder="0.00" 
                              value={openRegisterAmount} 
                              onChange={e => setOpenRegisterAmount(e.target.value)} 
                              autoFocus 
                              required 
                          />
                      </div>
                      <Button type="submit" className="w-full py-4 text-lg font-bold shadow-lg">
                          ABRIR CAIXA
                      </Button>
                  </form>
              </div>
          </div>
      );
  }

  const posTotal = posCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const filteredProducts = restState.products.filter(p => p.name.toLowerCase().includes(posSearch.toLowerCase()));

  const NavButton = ({ tab, icon: Icon, label }: any) => (
      <button 
          onClick={() => setActiveTab(tab)} 
          className={`w-full p-3 rounded-xl transition-all flex flex-col items-center gap-1 group
              ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
          title={label}
      >
          <Icon size={24} className="mb-1"/>
          <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </button>
  );

  return (
      <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
          <div className="w-full md:w-24 bg-slate-900 flex md:flex-col items-center justify-between md:justify-start py-4 px-2 md:px-0 gap-2 md:gap-6 fixed md:relative bottom-0 md:h-screen z-20 shrink-0">
              <div className="hidden md:block mb-4">
                  <div className="bg-blue-600 p-2 rounded-lg"><DollarSign className="text-white"/></div>
              </div>
              <div className="flex md:flex-col w-full justify-around md:justify-start gap-2">
                  <NavButton tab="ACTIVE" icon={DollarSign} label="Mesas" />
                  <NavButton tab="PDV" icon={ShoppingCart} label="Balcão" />
                  <NavButton tab="HISTORY" icon={History} label="Histórico" />
                  <NavButton tab="MANAGE" icon={Wallet} label="Gestão" />
              </div>
          </div>

          <div className="flex-1 p-4 md:p-6 overflow-y-auto mb-20 md:mb-0 h-screen">
              {activeTab === 'ACTIVE' && (
                  <div className="flex flex-col lg:flex-row gap-6 h-full">
                      <div className="lg:w-1/3 bg-white rounded-xl shadow-sm border p-4 overflow-y-auto max-h-[40vh] lg:max-h-full">
                          <h3 className="font-bold mb-4 text-gray-700 flex items-center gap-2"><DollarSign size={20}/> Mesas Abertas</h3>
                          {occupiedTables.length === 0 && <p className="text-gray-400 text-center py-10">Nenhuma mesa ocupada.</p>}
                          <div className="space-y-3">
                              {occupiedTables.map(t => (
                                  <button 
                                      key={t.id} 
                                      onClick={() => setSelectedTableId(t.id)}
                                      className={`w-full p-4 rounded-xl border text-left transition-all flex justify-between items-center
                                          ${selectedTableId === t.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'hover:bg-gray-50'}`}
                                  >
                                      <div>
                                          <div className="font-bold text-lg text-gray-800">Mesa {t.number}</div>
                                          <div className="text-xs text-gray-500 flex items-center gap-1"><User size={12}/> {t.customerName}</div>
                                      </div>
                                      <div className={`px-2 py-1 rounded text-xs font-bold ${t.status === 'WAITING_PAYMENT' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                          {t.status === 'WAITING_PAYMENT' ? 'Pediu Conta' : 'Ocupada'}
                                      </div>
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div className="lg:w-2/3 bg-white rounded-xl shadow-sm border p-6 flex flex-col h-full">
                          {selectedTable ? (
                              <>
                                  <div className="flex justify-between items-center mb-6 pb-4 border-b">
                                      <div>
                                          <h2 className="text-2xl font-bold text-gray-800">Mesa {selectedTable.number}</h2>
                                          <p className="text-gray-500 text-sm">Cliente: {selectedTable.customerName}</p>
                                      </div>
                                      <div className="text-right">
                                          <p className="text-sm text-gray-500 uppercase font-bold">Total a Pagar</p>
                                          <p className="text-3xl font-bold text-blue-600">R$ {totalAmount.toFixed(2)}</p>
                                      </div>
                                  </div>

                                  <div className="flex-1 overflow-y-auto mb-6">
                                      <table className="w-full text-left text-sm">
                                          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                                              <tr>
                                                  <th className="p-3 rounded-l-lg">Qtd</th>
                                                  <th className="p-3">Item</th>
                                                  <th className="p-3 text-right rounded-r-lg">Valor</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y">
                                              {tableOrders.flatMap(o => o.items).map((item, idx) => {
                                                  const product = restState.products.find(p => p.id === item.productId);
                                                  return (
                                                      <tr key={`${item.id}-${idx}`}>
                                                          <td className="p-3 font-bold">{item.quantity}</td>
                                                          <td className="p-3">{product?.name || item.productName}</td>
                                                          <td className="p-3 text-right">R$ {((product?.price || 0) * item.quantity).toFixed(2)}</td>
                                                      </tr>
                                                  );
                                              })}
                                          </tbody>
                                      </table>
                                  </div>

                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t">
                                      <Button onClick={() => handlePayment('CASH')} className="bg-emerald-600 hover:bg-emerald-700 h-12 text-sm">DINHEIRO</Button>
                                      <Button onClick={() => handlePayment('PIX')} className="bg-slate-800 hover:bg-slate-900 h-12 text-sm">PIX</Button>
                                      <Button onClick={() => handlePayment('DEBIT')} className="bg-blue-600 hover:bg-blue-700 h-12 text-sm">DÉBITO</Button>
                                      <Button onClick={() => handlePayment('CREDIT')} className="bg-indigo-600 hover:bg-indigo-700 h-12 text-sm">CRÉDITO</Button>
                                  </div>
                              </>
                          ) : (
                              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                  <Receipt size={64} className="mb-4 opacity-20"/>
                                  <p>Selecione uma mesa para receber o pagamento.</p>
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {activeTab === 'PDV' && (
                  <div className="flex flex-col lg:flex-row gap-6 h-full">
                      <div className="lg:w-2/3 flex flex-col gap-4 h-full">
                          <div className="relative">
                              <Search className="absolute left-3 top-3 text-gray-400" size={20}/>
                              <input 
                                  className="w-full pl-10 pr-4 py-3 rounded-xl border shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                  placeholder="Buscar produto (Nome, Código)..."
                                  value={posSearch}
                                  onChange={e => setPosSearch(e.target.value)}
                                  autoFocus
                              />
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 overflow-y-auto flex-1 content-start p-1">
                              {filteredProducts.map(product => (
                                  <button 
                                      key={product.id} 
                                      onClick={() => addToPosCart(product)}
                                      className="bg-white p-3 rounded-xl shadow-sm border hover:border-blue-500 hover:shadow-md transition-all flex flex-col items-start text-left h-32 active:scale-95"
                                  >
                                      <div className="flex-1 w-full">
                                          <div className="font-bold text-gray-800 line-clamp-2 text-sm leading-tight mb-1">{product.name}</div>
                                          <div className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded w-fit">{product.category}</div>
                                      </div>
                                      <div className="font-bold text-blue-600 w-full text-right">R$ {product.price.toFixed(2)}</div>
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div className="lg:w-1/3 bg-white rounded-xl shadow-xl border flex flex-col h-full overflow-hidden">
                          <div className="p-4 bg-slate-50 border-b">
                              <h3 className="font-bold text-gray-800 flex items-center gap-2"><ShoppingCart size={18}/> Cesta de Compras</h3>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto p-4 space-y-3">
                              {posCart.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center border-b pb-3 last:border-0">
                                      <div className="flex-1">
                                          <div className="text-sm font-medium">{item.product.name}</div>
                                          <div className="text-xs text-gray-500">{item.quantity} x R$ {item.product.price.toFixed(2)}</div>
                                      </div>
                                      <div className="font-bold text-gray-800 mr-3">R$ {(item.quantity * item.product.price).toFixed(2)}</div>
                                      <button onClick={() => removeFromPosCart(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                  </div>
                              ))}
                              {posCart.length === 0 && <div className="text-center text-gray-400 py-10 text-sm">Carrinho vazio</div>}
                          </div>

                          <div className="p-4 bg-gray-50 border-t space-y-3">
                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase">Cliente (Opcional)</label>
                                  <input 
                                      className="w-full border p-2 rounded text-sm mt-1" 
                                      placeholder="Nome do cliente"
                                      value={customerName}
                                      onChange={e => setCustomerName(e.target.value)}
                                  />
                              </div>
                              <div className="flex justify-between items-center text-xl font-bold text-gray-800 pt-2">
                                  <span>Total</span>
                                  <span>R$ {posTotal.toFixed(2)}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                  <Button onClick={() => handlePosSale('CASH')} disabled={processingSale} className="bg-emerald-600 hover:bg-emerald-700 text-xs h-10">DINHEIRO</Button>
                                  <Button onClick={() => handlePosSale('PIX')} disabled={processingSale} className="bg-slate-800 hover:bg-slate-900 text-xs h-10">PIX</Button>
                                  <Button onClick={() => handlePosSale('DEBIT')} disabled={processingSale} className="bg-blue-600 hover:bg-blue-700 text-xs h-10">DÉBITO</Button>
                                  <Button onClick={() => handlePosSale('CREDIT')} disabled={processingSale} className="bg-indigo-600 hover:bg-indigo-700 text-xs h-10">CRÉDITO</Button>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'HISTORY' && (
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                          <h3 className="font-bold text-gray-700">Histórico de Transações</h3>
                          <Button size="sm" variant="outline" onClick={refreshTransactions}><ArrowRight size={14} className="rotate-90"/> Atualizar</Button>
                      </div>
                      <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                              <thead className="bg-gray-100 text-gray-600">
                                  <tr>
                                      <th className="p-3">Data</th>
                                      <th className="p-3">Tipo</th>
                                      <th className="p-3">Origem</th>
                                      <th className="p-3">Método</th>
                                      <th className="p-3 text-right">Valor</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y">
                                  {finState.transactions.map(t => (
                                      <tr key={t.id} className="hover:bg-gray-50">
                                          <td className="p-3">{t.timestamp.toLocaleString()}</td>
                                          <td className="p-3"><span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Venda</span></td>
                                          <td className="p-3 text-gray-600">{t.itemsSummary}</td>
                                          <td className="p-3 text-xs font-mono">{t.method}</td>
                                          <td className="p-3 text-right font-bold">R$ {t.amount.toFixed(2)}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {activeTab === 'MANAGE' && (
                  <div className="max-w-2xl mx-auto space-y-6">
                      <div className="bg-white p-6 rounded-xl shadow-sm border">
                          <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2"><Wallet size={24}/> Gestão de Caixa</h3>
                          
                          <div className="grid grid-cols-2 gap-4 mb-6">
                              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                  <div className="text-sm text-blue-600 font-bold mb-1">Status</div>
                                  <div className={`text-lg font-bold ${finState.activeCashSession ? 'text-green-600' : 'text-red-600'}`}>
                                      {finState.activeCashSession ? 'ABERTO' : 'FECHADO'}
                                  </div>
                              </div>
                              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="text-sm text-gray-500 font-bold mb-1">Fundo Inicial</div>
                                  <div className="text-lg font-bold text-gray-800">R$ {finState.activeCashSession?.initialAmount.toFixed(2) || '0.00'}</div>
                              </div>
                          </div>

                          <div className="flex flex-col gap-3">
                              <Button onClick={() => setBleedModalOpen(true)} disabled={!finState.activeCashSession} variant="secondary" className="justify-between group">
                                  <span className="flex items-center gap-2"><ArrowRight className="text-red-500 group-hover:translate-x-1 transition-transform" size={18}/> Sangria (Retirada)</span>
                              </Button>
                              <Button onClick={() => setCloseModalOpen(true)} disabled={!finState.activeCashSession} className="justify-between bg-slate-800 hover:bg-slate-900">
                                  <span className="flex items-center gap-2"><Lock size={18}/> Fechar Caixa</span>
                              </Button>
                          </div>
                      </div>
                  </div>
              )}
          </div>

          <CashBleedModal isOpen={bleedModalOpen} onClose={() => setBleedModalOpen(false)} />
          
          <CloseRegisterModal 
            isOpen={closeModalOpen} 
            onClose={() => setCloseModalOpen(false)} 
            onSuccess={() => setActiveTab('ACTIVE')} 
          />
      </div>
  );
};
