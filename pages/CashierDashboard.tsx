
import React, { useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useFinance } from '../context/FinanceContext';
import { useUI } from '../context/UIContext';
import { TableStatus, Product } from '../types';
import { Button } from '../components/Button';
import { DollarSign, History, ShoppingCart, Search, Plus, Wallet, Receipt, Trash2, User, Loader2 } from 'lucide-react';
import { Modal } from '../components/Modal';

export const CashierDashboard: React.FC = () => {
  const { state: restState, dispatch: restDispatch } = useRestaurant();
  const { state: finState, openRegister, closeRegister, bleedRegister, refreshTransactions } = useFinance();
  const { showAlert, showConfirm } = useUI();
  
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY' | 'PDV' | 'MANAGE'>('ACTIVE');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  
  // Management States
  const [openRegisterAmount, setOpenRegisterAmount] = useState('');
  const [bleedAmount, setBleedAmount] = useState('');
  const [bleedReason, setBleedReason] = useState('');
  const [closeCountedAmount, setCloseCountedAmount] = useState('');
  const [bleedModalOpen, setBleedModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);

  // POS States
  const [posCart, setPosCart] = useState<{ product: Product; quantity: number; notes: string }[]>([]);
  const [posSearch, setPosSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [processingSale, setProcessingSale] = useState(false);

  // Derived Data
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

      try {
          // AWAIT dispatch. Context handles throwing error if RPC fails.
          await restDispatch({
              type: 'PROCESS_POS_SALE',
              sale: {
                  customerName: customerName || 'Consumidor Final',
                  items: posCart.map(i => ({ productId: i.product.id, quantity: i.quantity, notes: i.notes })),
                  totalAmount: total,
                  method
              }
          });

          // Only clear if successful
          setPosCart([]);
          setCustomerName('');
          showAlert({ title: "Venda Registrada", message: `Venda de R$ ${total.toFixed(2)} realizada!`, type: 'SUCCESS' });
          
          // Force transaction list refresh (FinanceContext) to show item immediately
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

  const handleBleed = async (e: React.FormEvent) => {
      e.preventDefault();
      await bleedRegister(parseFloat(bleedAmount), bleedReason, 'Staff');
      setBleedModalOpen(false); setBleedAmount('');
      showAlert({ title: "Sucesso", message: "Sangria realizada.", type: 'SUCCESS' });
  };

  const handleCloseRegister = async () => {
      await closeRegister(parseFloat(closeCountedAmount));
      setCloseModalOpen(false); setCloseCountedAmount('');
      setActiveTab('ACTIVE');
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
              // Refresh finance data to show new transaction
              setTimeout(() => refreshTransactions(), 500); 
          }
      });
  };

  if (!finState.activeCashSession) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
              <div className="bg-white p-8 rounded-xl shadow-xl text-center max-w-md">
                  <h2 className="text-2xl font-bold mb-4">Caixa Fechado</h2>
                  <form onSubmit={handleOpenRegister}>
                      <input type="number" step="0.01" className="border p-3 rounded w-full mb-4 text-center text-xl" placeholder="Fundo de Troco (R$)" value={openRegisterAmount} onChange={e => setOpenRegisterAmount(e.target.value)} autoFocus required />
                      <Button type="submit" className="w-full py-3">ABRIR CAIXA</Button>
                  </form>
              </div>
          </div>
      );
  }

  const posTotal = posCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const filteredProducts = restState.products.filter(p => p.name.toLowerCase().includes(posSearch.toLowerCase()) && p.isVisible);

  return (
      <div className="min-h-screen bg-gray-50 flex">
          {/* Sidebar */}
          <div className="w-20 bg-slate-900 flex flex-col items-center py-6 gap-6 text-slate-400 fixed h-full z-10">
              <button onClick={() => setActiveTab('ACTIVE')} className={`p-3 rounded-xl transition-all ${activeTab === 'ACTIVE' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`} title="Mesas Abertas"><DollarSign/></button>
              <button onClick={() => setActiveTab('PDV')} className={`p-3 rounded-xl transition-all ${activeTab === 'PDV' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`} title="Venda Balcão"><ShoppingCart/></button>
              <button onClick={() => setActiveTab('HISTORY')} className={`p-3 rounded-xl transition-all ${activeTab === 'HISTORY' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`} title="Histórico"><History/></button>
              <button onClick={() => setActiveTab('MANAGE')} className={`p-3 rounded-xl mt-auto transition-all ${activeTab === 'MANAGE' ? 'bg-red-600 text-white' : 'hover:bg-slate-800'}`} title="Gestão de Caixa"><Wallet/></button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 ml-20">
              {activeTab === 'ACTIVE' && (
                  <div className="flex gap-6 h-[calc(100vh-3rem)]">
                      <div className="w-1/3 bg-white rounded-xl shadow-sm border p-4 overflow-y-auto">
                          <h3 className="font-bold mb-4 text-gray-700 flex items-center gap-2"><DollarSign size={20}/> Mesas Abertas</h3>
                          {occupiedTables.length === 0 && <p className="text-gray-400 text-center py-10">Nenhuma mesa ocupada.</p>}
                          <div className="space-y-2">
                            {occupiedTables.map(t => (
                                <div key={t.id} onClick={() => setSelectedTableId(t.id)} className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedTableId === t.id ? 'bg-blue-50 border-blue-500 shadow-md' : 'hover:bg-gray-50'}`}>
                                    <div className="font-bold text-lg">Mesa {t.number}</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-1"><User size={12}/> {t.customerName}</div>
                                </div>
                            ))}
                          </div>
                      </div>
                      <div className="flex-1 bg-white rounded-xl shadow-sm border p-6 flex flex-col">
                          {selectedTable ? (
                              <>
                                  <div className="border-b pb-4 mb-4">
                                      <h2 className="text-3xl font-bold text-gray-800">Mesa {selectedTable.number}</h2>
                                      <p className="text-gray-500">{selectedTable.customerName}</p>
                                  </div>
                                  
                                  <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                                      {tableOrders.flatMap(o => o.items).map((item, idx) => {
                                          const p = restState.products.find(prod => prod.id === item.productId);
                                          return (
                                              <div key={idx} className="flex justify-between items-center text-sm border-b border-dashed pb-2">
                                                  <span>{item.quantity}x {p?.name}</span>
                                                  <span className="font-bold">R$ {((p?.price || 0) * item.quantity).toFixed(2)}</span>
                                              </div>
                                          )
                                      })}
                                  </div>

                                  <div className="bg-gray-50 p-4 rounded-xl">
                                      <div className="flex justify-between items-center text-2xl font-bold mb-6">
                                          <span>Total</span>
                                          <span className="text-blue-600">R$ {totalAmount.toFixed(2)}</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                          <Button onClick={() => handlePayment('CASH')} className="py-4 text-lg">Dinheiro</Button>
                                          <Button onClick={() => handlePayment('PIX')} className="py-4 text-lg bg-emerald-600 hover:bg-emerald-700">Pix</Button>
                                          <Button onClick={() => handlePayment('DEBIT')} variant="secondary" className="py-4">Débito</Button>
                                          <Button onClick={() => handlePayment('CREDIT')} variant="secondary" className="py-4">Crédito</Button>
                                      </div>
                                  </div>
                              </>
                          ) : (
                              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                  <Receipt size={64} className="mb-4 opacity-20"/>
                                  <p className="text-lg">Selecione uma mesa para receber</p>
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {activeTab === 'PDV' && (
                  <div className="flex gap-6 h-[calc(100vh-3rem)]">
                      {/* Product Grid */}
                      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border overflow-hidden">
                          <div className="p-4 border-b">
                              <div className="relative">
                                  <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                                  <input 
                                      type="text" 
                                      placeholder="Buscar produto (Nome)..." 
                                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      value={posSearch}
                                      onChange={e => setPosSearch(e.target.value)}
                                      autoFocus
                                  />
                              </div>
                          </div>
                          <div className="flex-1 overflow-y-auto p-4">
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                  {filteredProducts.map(p => (
                                      <button 
                                          key={p.id} 
                                          onClick={() => addToPosCart(p)}
                                          className="flex flex-col items-start p-4 bg-white border rounded-xl hover:shadow-md hover:border-blue-500 transition-all text-left group active:scale-95"
                                      >
                                          <div className="font-bold text-gray-800 line-clamp-2 mb-1 group-hover:text-blue-600">{p.name}</div>
                                          <div className="text-green-600 font-bold">R$ {p.price.toFixed(2)}</div>
                                      </button>
                                  ))}
                              </div>
                          </div>
                      </div>

                      {/* Cart Side */}
                      <div className="w-96 bg-white rounded-xl shadow-sm border flex flex-col">
                          <div className="p-4 border-b bg-gray-50">
                              <h3 className="font-bold text-gray-700 flex items-center gap-2"><ShoppingCart size={20}/> Venda Balcão</h3>
                          </div>
                          
                          <div className="p-4 border-b">
                              <label className="text-xs font-bold text-gray-500 uppercase">Cliente (Opcional)</label>
                              <input 
                                  className="w-full border-b border-gray-300 py-1 focus:outline-none focus:border-blue-500 bg-transparent"
                                  placeholder="Nome do Cliente"
                                  value={customerName}
                                  onChange={e => setCustomerName(e.target.value)}
                              />
                          </div>

                          <div className="flex-1 overflow-y-auto p-4 space-y-4">
                              {posCart.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center group">
                                      <div>
                                          <div className="font-medium text-gray-800">{item.product.name}</div>
                                          <div className="text-xs text-gray-500">{item.quantity} x R$ {item.product.price.toFixed(2)}</div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                          <span className="font-bold">R$ {(item.quantity * item.product.price).toFixed(2)}</span>
                                          <button onClick={() => removeFromPosCart(idx)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={18}/></button>
                                      </div>
                                  </div>
                              ))}
                              {posCart.length === 0 && <div className="text-center text-gray-400 mt-10">Carrinho vazio</div>}
                          </div>

                          <div className="p-4 bg-gray-50 border-t">
                              <div className="flex justify-between items-center text-2xl font-bold mb-4">
                                  <span>Total</span>
                                  <span className="text-blue-600">R$ {posTotal.toFixed(2)}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                  <Button onClick={() => handlePosSale('CASH')} size="sm" disabled={processingSale}>Dinheiro</Button>
                                  <Button onClick={() => handlePosSale('PIX')} size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={processingSale}>Pix</Button>
                                  <Button onClick={() => handlePosSale('DEBIT')} size="sm" variant="secondary" disabled={processingSale}>Débito</Button>
                                  <Button onClick={() => handlePosSale('CREDIT')} size="sm" variant="secondary" disabled={processingSale}>Crédito</Button>
                              </div>
                              {processingSale && <div className="text-center mt-2 text-sm text-blue-600 flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={14}/> Processando...</div>}
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'HISTORY' && (
                  <div className="bg-white rounded-xl shadow-sm border p-6">
                      <div className="flex justify-between items-center mb-6">
                          <h2 className="text-xl font-bold flex items-center gap-2"><History size={24}/> Histórico de Vendas (Últimas 50)</h2>
                          <Button size="sm" variant="secondary" onClick={() => refreshTransactions()}>Atualizar</Button>
                      </div>
                      <div className="overflow-x-auto">
                          <table className="w-full text-left">
                              <thead className="bg-gray-50 border-b">
                                  <tr>
                                      <th className="p-3">Hora</th>
                                      <th className="p-3">Tipo</th>
                                      <th className="p-3">Resumo</th>
                                      <th className="p-3">Método</th>
                                      <th className="p-3 text-right">Valor</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y">
                                  {finState.transactions.map(t => (
                                      <tr key={t.id} className="hover:bg-gray-50">
                                          <td className="p-3">{new Date(t.timestamp).toLocaleTimeString()}</td>
                                          <td className="p-3">
                                              {t.tableId ? <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded font-bold">MESA</span> : <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-bold">BALCÃO</span>}
                                          </td>
                                          <td className="p-3 text-sm text-gray-600">{t.itemsSummary}</td>
                                          <td className="p-3 text-sm">{t.method}</td>
                                          <td className="p-3 text-right font-bold text-green-600">R$ {t.amount.toFixed(2)}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {activeTab === 'MANAGE' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-col justify-between">
                          <div>
                              <h3 className="text-xl font-bold text-gray-800 mb-2">Sangria de Caixa</h3>
                              <p className="text-gray-500 text-sm mb-6">Retirada de valor para pagamentos ou segurança.</p>
                          </div>
                          <Button onClick={() => setBleedModalOpen(true)} className="w-full bg-orange-600 hover:bg-orange-700 text-white">Realizar Sangria</Button>
                      </div>
                      <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-col justify-between">
                          <div>
                              <h3 className="text-xl font-bold text-gray-800 mb-2">Fechar Caixa</h3>
                              <p className="text-gray-500 text-sm mb-6">Encerrar o turno e conferir valores.</p>
                          </div>
                          <Button onClick={() => setCloseModalOpen(true)} className="w-full bg-slate-900 hover:bg-slate-800">Fechar Caixa</Button>
                      </div>
                  </div>
              )}
          </div>

          {/* Modals */}
          {bleedModalOpen && (
              <Modal isOpen={true} onClose={() => setBleedModalOpen(false)} title="Sangria de Caixa">
                  <form onSubmit={handleBleed} className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold mb-1">Valor a Retirar (R$)</label>
                          <input type="number" step="0.01" className="w-full border p-2 rounded" value={bleedAmount} onChange={e => setBleedAmount(e.target.value)} autoFocus required />
                      </div>
                      <div>
                          <label className="block text-sm font-bold mb-1">Motivo</label>
                          <input className="w-full border p-2 rounded" placeholder="Ex: Pagamento Fornecedor" value={bleedReason} onChange={e => setBleedReason(e.target.value)} required />
                      </div>
                      <Button type="submit" className="w-full mt-2">Confirmar Sangria</Button>
                  </form>
              </Modal>
          )}

          {closeModalOpen && (
              <Modal isOpen={true} onClose={() => setCloseModalOpen(false)} title="Fechar Caixa">
                  <form onSubmit={e => { e.preventDefault(); handleCloseRegister(); }} className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-4">
                          <p>Total de Vendas (Dinheiro): <strong>R$ {finState.transactions.filter(t => t.method === 'CASH' && finState.activeCashSession && new Date(t.timestamp) >= new Date(finState.activeCashSession.openedAt)).reduce((acc, t) => acc + t.amount, 0).toFixed(2)}</strong></p>
                          <p>Total Sangrias: <strong>R$ {finState.cashMovements.filter(m => m.type === 'BLEED').reduce((acc, m) => acc + m.amount, 0).toFixed(2)}</strong></p>
                          <p className="mt-2 text-lg">Saldo Esperado em Gaveta: <strong>R$ {(
                              (finState.activeCashSession?.initialAmount || 0) + 
                              finState.transactions.filter(t => t.method === 'CASH' && finState.activeCashSession && new Date(t.timestamp) >= new Date(finState.activeCashSession.openedAt)).reduce((acc, t) => acc + t.amount, 0) -
                              finState.cashMovements.filter(m => m.type === 'BLEED').reduce((acc, m) => acc + m.amount, 0)
                          ).toFixed(2)}</strong></p>
                      </div>
                      <div>
                          <label className="block text-sm font-bold mb-1">Valor Contado em Gaveta (R$)</label>
                          <input type="number" step="0.01" className="w-full border p-2 rounded text-xl font-bold" value={closeCountedAmount} onChange={e => setCloseCountedAmount(e.target.value)} required autoFocus />
                      </div>
                      <Button type="submit" className="w-full mt-2 bg-red-600 hover:bg-red-700">Encerrar Turno</Button>
                  </form>
              </Modal>
          )}
      </div>
  );
};
