
import React, { useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useFinance } from '../context/FinanceContext';
import { useUI } from '../context/UIContext';
import { TableStatus, Product } from '../types';
import { Button } from '../components/Button';
import { DollarSign, History, ShoppingCart, Search, Wallet, Receipt, Trash2, User, Loader2, ArrowRight, AlertTriangle, Lock } from 'lucide-react';
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
          await restDispatch({
              type: 'PROCESS_POS_SALE',
              sale: {
                  customerName: customerName || 'Consumidor Final',
                  items: posCart.map(i => ({ productId: i.product.id, quantity: i.quantity, notes: i.notes })),
                  totalAmount: total,
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
  const filteredProducts = restState.products.filter(p => p.name.toLowerCase().includes(posSearch.toLowerCase()) && p.isVisible);

  // Botão da Sidebar
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
          {/* Sidebar */}
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

          {/* Content */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto mb-20 md:mb-0 h-screen">
              {activeTab === 'ACTIVE' && (
                  <div className="flex flex-col lg:flex-row gap-6 h-full">
                      <div className="lg:w-1/3 bg-white rounded-xl shadow-sm border p-4 overflow-y-auto max-h-[40vh] lg:max-h-full">
                          <h3 className="font-bold mb-4 text-gray-700 flex items-center gap-2"><DollarSign size={20}/> Mesas Abertas</h3>
                          {occupiedTables.length === 0 && <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed">Nenhuma mesa ocupada no momento.</div>}
                          <div className="space-y-2">
                            {occupiedTables.map(t => (
                                <div key={t.id} onClick={() => setSelectedTableId(t.id)} className={`p-4 border rounded-xl cursor-pointer transition-all flex justify-between items-center ${selectedTableId === t.id ? 'bg-blue-50 border-blue-500 shadow-md ring-1 ring-blue-500' : 'hover:bg-gray-50 hover:border-gray-300'}`}>
                                    <div>
                                        <div className="font-bold text-lg text-gray-800">Mesa {t.number}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1"><User size={12}/> {t.customerName}</div>
                                    </div>
                                    <ArrowRight size={20} className={`text-gray-300 ${selectedTableId === t.id ? 'text-blue-500' : ''}`}/>
                                </div>
                            ))}
                          </div>
                      </div>
                      <div className="flex-1 bg-white rounded-xl shadow-sm border p-6 flex flex-col min-h-[500px]">
                          {selectedTable ? (
                              <>
                                  <div className="border-b pb-4 mb-4 flex justify-between items-start">
                                      <div>
                                          <h2 className="text-3xl font-bold text-gray-800">Mesa {selectedTable.number}</h2>
                                          <p className="text-gray-500">{selectedTable.customerName}</p>
                                      </div>
                                      <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">EM ABERTO</div>
                                  </div>
                                  
                                  <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2">
                                      {tableOrders.flatMap(o => o.items).map((item, idx) => {
                                          const p = restState.products.find(prod => prod.id === item.productId);
                                          return (
                                              <div key={idx} className="flex justify-between items-center text-sm border-b border-dashed pb-2 last:border-0">
                                                  <div>
                                                      <span className="font-bold text-gray-800">{item.quantity}x </span>
                                                      <span className="text-gray-600">{p?.name}</span>
                                                  </div>
                                                  <span className="font-bold text-gray-900">R$ {((p?.price || 0) * item.quantity).toFixed(2)}</span>
                                              </div>
                                          )
                                      })}
                                  </div>

                                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                                      <div className="flex justify-between items-center text-3xl font-bold mb-6 text-gray-800">
                                          <span>Total</span>
                                          <span className="text-blue-600">R$ {totalAmount.toFixed(2)}</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                          <Button onClick={() => handlePayment('CASH')} className="py-4 text-lg shadow-sm">Dinheiro</Button>
                                          <Button onClick={() => handlePayment('PIX')} className="py-4 text-lg bg-emerald-600 hover:bg-emerald-700 shadow-sm">Pix</Button>
                                          <Button onClick={() => handlePayment('DEBIT')} variant="secondary" className="py-4 shadow-sm bg-white border">Débito</Button>
                                          <Button onClick={() => handlePayment('CREDIT')} variant="secondary" className="py-4 shadow-sm bg-white border">Crédito</Button>
                                      </div>
                                  </div>
                              </>
                          ) : (
                              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                  <div className="bg-gray-50 p-6 rounded-full mb-4">
                                      <Receipt size={48} className="opacity-30"/>
                                  </div>
                                  <p className="text-lg font-medium">Selecione uma mesa para receber</p>
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {activeTab === 'PDV' && (
                  <div className="flex flex-col lg:flex-row gap-6 h-full">
                      {/* Product Grid */}
                      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border overflow-hidden h-[60vh] lg:h-full">
                          <div className="p-4 border-b bg-gray-50">
                              <div className="relative">
                                  <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                                  <input 
                                      type="text" 
                                      placeholder="Buscar produto (Nome)..." 
                                      className="w-full pl-10 pr-4 py-3 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                      value={posSearch}
                                      onChange={e => setPosSearch(e.target.value)}
                                      autoFocus
                                  />
                              </div>
                          </div>
                          <div className="flex-1 overflow-y-auto p-4">
                              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                  {filteredProducts.map(p => (
                                      <button 
                                          key={p.id} 
                                          onClick={() => addToPosCart(p)}
                                          className="flex flex-col items-start p-4 bg-white border rounded-xl hover:shadow-md hover:border-blue-500 transition-all text-left group active:scale-95"
                                      >
                                          <div className="font-bold text-gray-800 line-clamp-2 mb-1 group-hover:text-blue-600 text-sm">{p.name}</div>
                                          <div className="text-green-600 font-bold">R$ {p.price.toFixed(2)}</div>
                                      </button>
                                  ))}
                              </div>
                          </div>
                      </div>

                      {/* Cart Side */}
                      <div className="w-full lg:w-96 bg-white rounded-xl shadow-sm border flex flex-col h-[40vh] lg:h-full">
                          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                              <h3 className="font-bold text-gray-700 flex items-center gap-2"><ShoppingCart size={20}/> Venda Balcão</h3>
                              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">{posCart.reduce((a,b)=>a+b.quantity,0)} itens</span>
                          </div>
                          
                          <div className="p-4 border-b">
                              <input 
                                  className="w-full border-b border-gray-300 py-1 focus:outline-none focus:border-blue-500 bg-transparent text-sm"
                                  placeholder="Nome do Cliente (Opcional)"
                                  value={customerName}
                                  onChange={e => setCustomerName(e.target.value)}
                              />
                          </div>

                          <div className="flex-1 overflow-y-auto p-4 space-y-4">
                              {posCart.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center group bg-gray-50 p-2 rounded-lg">
                                      <div>
                                          <div className="font-medium text-gray-800 text-sm">{item.product.name}</div>
                                          <div className="text-xs text-gray-500">{item.quantity} x R$ {item.product.price.toFixed(2)}</div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                          <span className="font-bold text-sm">R$ {(item.quantity * item.product.price).toFixed(2)}</span>
                                          <button onClick={() => removeFromPosCart(idx)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"><Trash2 size={16}/></button>
                                      </div>
                                  </div>
                              ))}
                              {posCart.length === 0 && (
                                  <div className="text-center text-gray-400 mt-10 flex flex-col items-center">
                                      <ShoppingCart size={32} className="opacity-20 mb-2"/>
                                      <span className="text-sm">Carrinho vazio</span>
                                  </div>
                              )}
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
                  <div className="bg-white rounded-xl shadow-sm border p-6 h-full flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800"><History size={24}/> Histórico de Vendas (Últimas 50)</h2>
                          <Button size="sm" variant="secondary" onClick={() => refreshTransactions()}>Atualizar</Button>
                      </div>
                      <div className="overflow-auto flex-1">
                          <table className="w-full text-left">
                              <thead className="bg-gray-50 border-b text-gray-600 sticky top-0">
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
                                          <td className="p-3 text-sm">{new Date(t.timestamp).toLocaleTimeString()}</td>
                                          <td className="p-3">
                                              {t.tableId ? <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded font-bold">MESA {t.tableNumber}</span> : <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-bold">BALCÃO</span>}
                                          </td>
                                          <td className="p-3 text-sm text-gray-600 max-w-xs truncate" title={t.itemsSummary}>{t.itemsSummary}</td>
                                          <td className="p-3 text-sm font-medium">{t.method}</td>
                                          <td className="p-3 text-right font-bold text-green-600">R$ {t.amount.toFixed(2)}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {activeTab === 'MANAGE' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-10">
                      <div className="bg-white p-8 rounded-2xl shadow-md border border-orange-100 flex flex-col justify-between hover:shadow-lg transition-shadow">
                          <div className="mb-6">
                              <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                                  <Wallet className="text-orange-600" size={24}/>
                              </div>
                              <h3 className="text-2xl font-bold text-gray-800 mb-2">Sangria de Caixa</h3>
                              <p className="text-gray-500 leading-relaxed">Retirada de valor para pagamentos externos, fornecedores ou transporte de valores por segurança.</p>
                          </div>
                          <Button onClick={() => setBleedModalOpen(true)} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 text-lg">Realizar Sangria</Button>
                      </div>
                      
                      <div className="bg-white p-8 rounded-2xl shadow-md border border-red-100 flex flex-col justify-between hover:shadow-lg transition-shadow">
                          <div className="mb-6">
                              <div className="bg-red-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                                  <Lock className="text-red-600" size={24}/>
                              </div>
                              <h3 className="text-2xl font-bold text-gray-800 mb-2">Fechar Caixa</h3>
                              <p className="text-gray-500 leading-relaxed">Encerrar o turno atual. O sistema irá comparar o valor esperado com o valor contado.</p>
                          </div>
                          <Button onClick={() => setCloseModalOpen(true)} className="w-full bg-slate-900 hover:bg-slate-800 py-3 text-lg">Fechar Caixa</Button>
                      </div>
                  </div>
              )}
          </div>

          {/* Modals - Renderizados condicionalmente com verificações seguras */}
          <Modal 
            isOpen={bleedModalOpen} 
            onClose={() => setBleedModalOpen(false)} 
            title="Sangria de Caixa"
            variant="dialog"
            maxWidth="sm"
          >
              <form onSubmit={handleBleed} className="space-y-4">
                  <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-lg text-sm flex items-center gap-2">
                      <AlertTriangle size={16}/> Esta ação retirará dinheiro do caixa.
                  </div>
                  <div>
                      <label className="block text-sm font-bold mb-1">Valor a Retirar (R$)</label>
                      <input type="number" step="0.01" className="w-full border p-3 rounded-lg font-bold text-lg" value={bleedAmount} onChange={e => setBleedAmount(e.target.value)} autoFocus required />
                  </div>
                  <div>
                      <label className="block text-sm font-bold mb-1">Motivo</label>
                      <input className="w-full border p-3 rounded-lg" placeholder="Ex: Pagamento Fornecedor" value={bleedReason} onChange={e => setBleedReason(e.target.value)} required />
                  </div>
                  <div className="flex gap-2 mt-4">
                      <Button type="button" variant="secondary" onClick={() => setBleedModalOpen(false)} className="flex-1">Cancelar</Button>
                      <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700">Confirmar</Button>
                  </div>
              </form>
          </Modal>

          <Modal 
            isOpen={closeModalOpen} 
            onClose={() => setCloseModalOpen(false)} 
            title="Fechar Caixa"
            variant="dialog"
            maxWidth="md"
          >
              <form onSubmit={e => { e.preventDefault(); handleCloseRegister(); }} className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-900">
                      <h4 className="font-bold mb-2 text-lg">Resumo do Turno</h4>
                      <div className="space-y-1 text-sm">
                          <p className="flex justify-between"><span>Fundo Inicial:</span> <strong>R$ {finState.activeCashSession?.initialAmount.toFixed(2)}</strong></p>
                          <p className="flex justify-between"><span>Vendas (Dinheiro):</span> <strong>R$ {finState.transactions.filter(t => t.method === 'CASH' && finState.activeCashSession && new Date(t.timestamp) >= new Date(finState.activeCashSession.openedAt)).reduce((acc, t) => acc + t.amount, 0).toFixed(2)}</strong></p>
                          <p className="flex justify-between text-red-600"><span>Sangrias:</span> <strong>- R$ {finState.cashMovements.filter(m => m.type === 'BLEED').reduce((acc, m) => acc + m.amount, 0).toFixed(2)}</strong></p>
                          <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between text-lg font-bold">
                              <span>Saldo Esperado:</span>
                              <span>R$ {(
                                  (finState.activeCashSession?.initialAmount || 0) + 
                                  finState.transactions.filter(t => t.method === 'CASH' && finState.activeCashSession && new Date(t.timestamp) >= new Date(finState.activeCashSession.openedAt)).reduce((acc, t) => acc + t.amount, 0) -
                                  finState.cashMovements.filter(m => m.type === 'BLEED').reduce((acc, m) => acc + m.amount, 0)
                              ).toFixed(2)}</span>
                          </div>
                      </div>
                  </div>
                  <div>
                      <label className="block text-sm font-bold mb-2 text-gray-700">Valor Contado em Gaveta (R$)</label>
                      <input type="number" step="0.01" className="w-full border-2 border-gray-300 p-3 rounded-xl text-3xl font-bold text-center focus:border-blue-500 focus:outline-none" value={closeCountedAmount} onChange={e => setCloseCountedAmount(e.target.value)} required autoFocus />
                      <p className="text-xs text-gray-500 mt-2 text-center">Digite o valor físico presente na gaveta.</p>
                  </div>
                  <div className="flex gap-2">
                      <Button type="button" variant="secondary" onClick={() => setCloseModalOpen(false)} className="flex-1 py-3">Cancelar</Button>
                      <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 py-3 text-lg shadow-lg">Encerrar Turno</Button>
                  </div>
              </form>
          </Modal>
      </div>
  );
};
