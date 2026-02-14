
import React, { useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useMenu } from '../context/MenuContext';
import { useOrder } from '../context/OrderContext';
import { useFinance } from '../context/FinanceContext';
import { useUI } from '../context/UIContext';
import { TableStatus, Product } from '../types';
import { Button } from '../components/Button';
import { DollarSign, History, ShoppingCart, Search, Wallet, Receipt, Trash2, User, Lock, ArrowRight, XCircle, RefreshCcw, LayoutDashboard, CreditCard, Banknote, MapPin, Zap, Plus, Clock } from 'lucide-react';
import { CloseRegisterModal } from '../components/modals/CloseRegisterModal';
import { CashBleedModal } from '../components/modals/CashBleedModal';
import { Modal } from '../components/Modal';

export const CashierDashboard: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: menuState } = useMenu();
  const { state: orderState, dispatch: orderDispatch } = useOrder();
  const { state: finState, openRegister, refreshTransactions, voidTransaction } = useFinance();
  const { showAlert, showConfirm } = useUI();
  
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY' | 'PDV' | 'MANAGE'>('ACTIVE');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [openRegisterAmount, setOpenRegisterAmount] = useState('');
  const [bleedModalOpen, setBleedModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [transactionToVoid, setTransactionToVoid] = useState<string | null>(null);
  const [voidPin, setVoidPin] = useState('');
  const [posCart, setPosCart] = useState<{ product: Product; quantity: number; notes: string }[]>([]);
  const [posSearch, setPosSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [processingSale, setProcessingSale] = useState(false);

  const occupiedTables = orderState.tables.filter(t => t.status !== TableStatus.AVAILABLE);
  const selectedTable = orderState.tables.find(t => t.id === selectedTableId);
  const tableOrders = orderState.orders.filter(o => o.tableId === selectedTableId && !o.isPaid);
  const totalAmount = tableOrders.reduce((sum, order) => sum + order.items.reduce((s, i) => s + (i.productPrice * i.quantity), 0), 0);

  const handleManualRefresh = async () => {
      setIsRefreshing(true);
      await refreshTransactions();
      setTimeout(() => setIsRefreshing(false), 800);
  };

  const handlePayment = async (method: string) => {
      if (!selectedTableId || totalAmount <= 0) return;
      
      showConfirm({
          title: "Confirmar Pagamento",
          message: `Deseja confirmar o recebimento de R$ ${totalAmount.toFixed(2)} via ${method}?`,
          onConfirm: async () => {
              try {
                  await orderDispatch({ type: 'PROCESS_PAYMENT', tableId: selectedTableId, amount: totalAmount, method });
                  setSelectedTableId(null);
                  showAlert({ title: "Pagamento Realizado", message: "Mesa liberada com sucesso.", type: 'SUCCESS' });
              } catch (error) {
                  showAlert({ title: "Erro", message: "Falha ao processar pagamento.", type: 'ERROR' });
              }
          }
      });
  };

  const handlePosSale = async (method: 'CASH' | 'CREDIT' | 'DEBIT' | 'PIX') => {
      if (!finState.activeCashSession) return showAlert({ title: "Caixa Fechado", message: "Abra o caixa antes de vender.", type: 'ERROR' });
      if (posCart.length === 0) return showAlert({ title: "Carrinho Vazio", message: "Adicione produtos.", type: 'WARNING' });
      setProcessingSale(true);
      const total = posCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
      try {
          await orderDispatch({ type: 'PROCESS_POS_SALE', sale: { customerName: customerName.trim() || 'Consumidor Final', items: posCart.map(i => ({ productId: i.product.id, quantity: i.quantity, notes: i.notes })), totalAmount: total, method }});
          setPosCart([]); setCustomerName('');
          showAlert({ title: "Venda Registrada", message: `Venda de R$ ${total.toFixed(2)} realizada!`, type: 'SUCCESS' });
          await refreshTransactions();
      } catch (error: any) {
          showAlert({ title: "Erro na Venda", message: "Não foi possível salvar a venda.", type: 'ERROR' });
      } finally { setProcessingSale(false); }
  };

  if (!finState.activeCashSession) {
      return (
          <div className="h-full flex items-center justify-center bg-slate-950 p-4">
              <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center max-w-md w-full border border-white/10">
                  <div className="bg-blue-50 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-8 shadow-inner">
                      <Lock size={48} className="text-blue-600" />
                  </div>
                  <h2 className="text-3xl font-black mb-2 text-slate-800 uppercase tracking-tighter">Frente de Caixa</h2>
                  <p className="text-gray-400 mb-8 font-medium">Informe o fundo de reserva para iniciar o turno.</p>
                  <form onSubmit={(e) => { e.preventDefault(); openRegister(parseFloat(openRegisterAmount), 'Operador'); }}>
                      <div className="mb-8">
                          <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest">Saldo em Dinheiro (Gaveta)</label>
                          <div className="relative">
                            <span className="absolute left-4 top-5 font-black text-2xl text-gray-300">R$</span>
                            <input type="number" step="0.01" className="border-2 border-gray-100 p-6 rounded-3xl w-full text-center text-4xl font-black text-blue-600 focus:outline-none focus:border-blue-500 transition-all shadow-inner bg-gray-50" placeholder="0.00" value={openRegisterAmount} onChange={e => setOpenRegisterAmount(e.target.value)} autoFocus required />
                          </div>
                      </div>
                      <Button type="submit" className="w-full py-5 text-xl font-black rounded-3xl shadow-2xl shadow-blue-200">ABRIR CAIXA AGORA</Button>
                  </form>
              </div>
          </div>
      );
  }

  const NavButton = ({ tab, icon: Icon, label }: any) => (
      <button onClick={() => setActiveTab(tab)} className={`flex-1 md:flex-none md:w-full p-4 rounded-2xl transition-all flex flex-col items-center gap-1 group ${activeTab === tab ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-slate-500 hover:bg-slate-100 md:hover:bg-slate-800 md:text-slate-400'}`}>
          <Icon size={24} strokeWidth={activeTab === tab ? 3 : 2} />
          <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      </button>
  );

  return (
      <div className="h-full bg-gray-50 flex flex-col md:flex-row overflow-hidden font-sans">
          {/* Sincronização Manual FAB (Mobile Only) */}
          <button onClick={handleManualRefresh} className={`md:hidden fixed bottom-24 right-6 z-50 bg-white text-blue-600 p-4 rounded-2xl shadow-2xl border border-gray-100 transition-all active:scale-90 ${isRefreshing ? 'animate-spin' : ''}`}><RefreshCcw size={24}/></button>

          <aside className="w-full md:w-28 bg-white md:bg-slate-950 flex md:flex-col items-center justify-around md:justify-start py-4 px-2 md:px-0 gap-2 md:gap-6 fixed md:relative bottom-0 md:h-full z-40 shrink-0 border-t md:border-t-0 md:border-r border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] md:shadow-none">
              <div className="hidden md:block mb-6 pt-4">
                  <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-600/40"><DollarSign className="text-white" size={28}/></div>
              </div>
              <NavButton tab="ACTIVE" icon={Receipt} label="Mesas" />
              <NavButton tab="PDV" icon={ShoppingCart} label="Balcão" />
              <NavButton tab="HISTORY" icon={History} label="Extrato" />
              <NavButton tab="MANAGE" icon={Wallet} label="Turno" />
          </aside>

          <div className="flex-1 flex flex-col h-full overflow-hidden pb-20 md:pb-0">
              <header className="bg-white/80 backdrop-blur-md border-b p-4 md:p-6 flex justify-between items-center shrink-0 z-30">
                  <div className="flex items-center gap-3">
                      <div className="bg-slate-900 text-white p-2.5 rounded-2xl"><LayoutDashboard size={20}/></div>
                      <h2 className="text-xl font-black uppercase tracking-tighter text-slate-800">
                          {activeTab === 'ACTIVE' && 'Gestão de Mesas'}
                          {activeTab === 'PDV' && 'Ponto de Venda'}
                          {activeTab === 'HISTORY' && 'Extrato de Vendas'}
                          {activeTab === 'MANAGE' && 'Gestão do Turno'}
                      </h2>
                  </div>
                  <div className="flex items-center gap-3">
                      <button onClick={handleManualRefresh} className={`hidden md:flex p-3 rounded-2xl bg-gray-50 text-blue-600 hover:bg-gray-100 transition-all ${isRefreshing ? 'animate-spin' : ''}`}><RefreshCcw size={20}/></button>
                      <div className="bg-emerald-500 text-white px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20">Caixa Aberto</div>
                  </div>
              </header>

              <main className="flex-1 p-4 md:p-8 overflow-hidden">
                  {activeTab === 'ACTIVE' && (
                      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
                          <div className="lg:w-1/3 flex flex-col h-full bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
                              <div className="p-6 bg-slate-50 border-b flex items-center justify-between"><h3 className="font-black uppercase tracking-tight text-slate-700">Ocupação Atual</h3><span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-lg">{occupiedTables.length} Mesas</span></div>
                              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                  {occupiedTables.map(t => (
                                      <button key={t.id} onClick={() => setSelectedTableId(t.id)} className={`w-full p-5 rounded-3xl border-2 text-left transition-all flex justify-between items-center group ${selectedTableId === t.id ? 'border-blue-600 bg-blue-50/50 shadow-lg shadow-blue-600/5' : 'border-transparent bg-gray-50 hover:bg-white hover:border-gray-200'}`}>
                                          <div>
                                              <div className={`font-black text-2xl tracking-tighter ${selectedTableId === t.id ? 'text-blue-600' : 'text-slate-800'}`}>Mesa {t.number}</div>
                                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mt-1"><User size={12}/> {t.customerName}</div>
                                          </div>
                                          {t.status === 'WAITING_PAYMENT' && <div className="bg-orange-500 text-white p-2 rounded-xl animate-pulse"><Receipt size={20}/></div>}
                                      </button>
                                  ))}
                                  {occupiedTables.length === 0 && <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-50 py-20"><DollarSign size={48} className="mb-2"/><p className="font-bold uppercase text-xs">Salão Vazio</p></div>}
                              </div>
                          </div>

                          <div className="lg:w-2/3 flex flex-col h-full bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-fade-in">
                              {selectedTable ? (
                                  <div className="flex flex-col h-full">
                                      <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
                                          <div><h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Mesa {selectedTable.number}</h2><p className="text-blue-400 text-xs font-bold uppercase tracking-widest mt-2">{selectedTable.customerName}</p></div>
                                          <div className="text-right">
                                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Subtotal Acumulado</p>
                                              <p className="text-4xl font-black text-emerald-400">R$ {totalAmount.toFixed(2)}</p>
                                          </div>
                                      </div>
                                      <div className="flex-1 overflow-y-auto p-6">
                                          <table className="w-full text-left">
                                              <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2"><tr className="border-b"><th className="pb-3 px-2">Qtd</th><th className="pb-3">Produto</th><th className="pb-3 text-right">Preço</th><th className="pb-3 text-right">Total</th></tr></thead>
                                              <tbody className="divide-y divide-gray-50">{tableOrders.flatMap(o => o.items).map((item, idx) => (
                                                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors"><td className="py-4 px-2 font-black text-slate-400">{item.quantity}</td><td className="py-4 font-bold text-slate-700">{item.productName}</td><td className="py-4 text-right text-slate-400">R$ {item.productPrice.toFixed(2)}</td><td className="py-4 text-right font-black text-slate-800">R$ {(item.productPrice * item.quantity).toFixed(2)}</td></tr>
                                              ))}</tbody>
                                          </table>
                                      </div>
                                      <div className="p-8 bg-gray-50 border-t grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                                          <button onClick={() => handlePayment('CASH')} className="flex flex-col items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white p-5 rounded-[2rem] font-black shadow-xl shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"><Banknote size={24}/><span className="text-[10px] uppercase tracking-widest">Dinheiro</span></button>
                                          <button onClick={() => handlePayment('PIX')} className="flex flex-col items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white p-5 rounded-[2rem] font-black shadow-xl shadow-slate-900/20 transition-all hover:scale-105 active:scale-95"><Zap size={24}/><span className="text-[10px] uppercase tracking-widest">Pix</span></button>
                                          <button onClick={() => handlePayment('DEBIT')} className="flex flex-col items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-[2rem] font-black shadow-xl shadow-blue-600/20 transition-all hover:scale-105 active:scale-95"><CreditCard size={24}/><span className="text-[10px] uppercase tracking-widest">Débito</span></button>
                                          <button onClick={() => handlePayment('CREDIT')} className="flex flex-col items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white p-5 rounded-[2rem] font-black shadow-xl shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"><CreditCard size={24}/><span className="text-[10px] uppercase tracking-widest">Crédito</span></button>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-gray-300 opacity-50 space-y-4"><Receipt size={80} strokeWidth={1} /><p className="font-black uppercase tracking-widest">Aguardando Seleção</p></div>
                              )}
                          </div>
                      </div>
                  )}

                  {activeTab === 'PDV' && (
                      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
                          <div className="lg:w-2/3 flex flex-col gap-6 h-full overflow-hidden animate-fade-in">
                              <div className="relative shrink-0 group">
                                  <Search className="absolute left-6 top-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={24}/>
                                  <input className="w-full pl-16 pr-6 py-5 rounded-[2rem] border-2 border-transparent bg-white shadow-xl focus:border-blue-500 outline-none transition-all font-bold" placeholder="Filtrar produtos por nome..." value={posSearch} onChange={e => setPosSearch(e.target.value)} autoFocus />
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 overflow-y-auto flex-1 content-start p-1 custom-scrollbar">
                                  {menuState.products.filter(p => p.name.toLowerCase().includes(posSearch.toLowerCase())).map(product => (
                                      <button key={product.id} onClick={() => setPosCart([...posCart, { product, quantity: 1, notes: '' }])} className="bg-white p-5 rounded-[2rem] shadow-sm border-2 border-transparent hover:border-blue-400 hover:shadow-xl transition-all flex flex-col items-start text-left h-44 active:scale-95 group relative overflow-hidden">
                                          <div className="bg-blue-50 text-blue-600 p-2 rounded-xl absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"><Plus size={18}/></div>
                                          <div className="flex-1 w-full"><div className="font-black text-slate-800 text-sm leading-tight mb-2 line-clamp-2 uppercase tracking-tighter">{product.name}</div><div className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-widest inline-block">{product.category}</div></div>
                                          <div className="font-black text-xl text-slate-900 mt-2">R$ {product.price.toFixed(2)}</div>
                                      </button>
                                  ))}
                              </div>
                          </div>
                          <div className="lg:w-1/3 bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 flex flex-col h-full overflow-hidden animate-fade-in">
                              <div className="p-6 bg-slate-900 text-white shrink-0 flex items-center gap-3"><ShoppingCart size={24} className="text-blue-400"/><h3 className="font-black text-xl uppercase tracking-tighter">Venda Balcão</h3></div>
                              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                  {posCart.map((item, idx) => (
                                      <div key={idx} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl relative group animate-fade-in">
                                          <div className="flex-1 pr-4"><div className="text-sm font-black text-slate-800">{item.product.name}</div><div className="text-[10px] font-bold text-gray-400 mt-0.5">{item.quantity} x R$ {item.product.price.toFixed(2)}</div></div>
                                          <div className="font-black text-slate-900 mr-4">R$ {(item.quantity * item.product.price).toFixed(2)}</div>
                                          <button onClick={() => setPosCart(posCart.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 transition-colors p-2"><Trash2 size={18}/></button>
                                      </div>
                                  ))}
                                  {posCart.length === 0 && <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-40 py-20"><ShoppingCart size={64} strokeWidth={1} /><p className="font-black uppercase text-xs mt-2">Carrinho Vazio</p></div>}
                              </div>
                              <div className="p-8 bg-white border-t space-y-6 shrink-0 safe-area-bottom">
                                  <div className="flex justify-between items-center"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Geral</span><span className="text-4xl font-black text-blue-600">R$ {posCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0).toFixed(2)}</span></div>
                                  <div className="grid grid-cols-2 gap-3">
                                      <button onClick={() => handlePosSale('CASH')} className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-emerald-600/20 active:scale-95 transition-all">Dinheiro</button>
                                      <button onClick={() => handlePosSale('PIX')} className="py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-slate-900/20 active:scale-95 transition-all">PIX</button>
                                      <button onClick={() => handlePosSale('DEBIT')} className="py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-blue-600/20 active:scale-95 transition-all">Débito</button>
                                      <button onClick={() => handlePosSale('CREDIT')} className="py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">Crédito</button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}

                  {activeTab === 'HISTORY' && (
                      <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden h-full flex flex-col animate-fade-in">
                          <div className="p-6 border-b bg-gray-50 flex justify-between items-center shrink-0"><h3 className="font-black text-slate-800 uppercase tracking-tighter text-xl">Extrato Diário</h3><Button size="sm" variant="outline" onClick={refreshTransactions} className="rounded-xl flex items-center gap-2"><RefreshCcw size={14} className={isRefreshing ? 'animate-spin' : ''}/> Sincronizar</Button></div>
                          <div className="flex-1 overflow-auto custom-scrollbar">
                              <table className="w-full text-left">
                                  <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest sticky top-0 z-10"><tr className="border-b"><th className="p-6">Data / Hora</th><th className="p-6">Detalhes</th><th className="p-6">Método</th><th className="p-6 text-right">Valor Final</th><th className="p-6 text-center">Auditoria</th></tr></thead>
                                  <tbody className="divide-y divide-gray-50">
                                      {finState.transactions.map(t => (
                                          <tr key={t.id} className={`hover:bg-gray-50/50 transition-colors ${t.status === 'CANCELLED' ? 'opacity-40 grayscale' : ''}`}>
                                              <td className="p-6"><div className="font-black text-slate-700">{t.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div><div className="text-[10px] font-bold text-gray-400">{t.timestamp.toLocaleDateString()}</div></td>
                                              <td className="p-6 text-sm font-bold text-slate-600 uppercase tracking-tight">{t.itemsSummary}</td>
                                              <td className="p-6"><span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg border border-blue-100 uppercase">{t.method}</span></td>
                                              <td className="p-6 text-right font-black text-slate-800">R$ {t.amount.toFixed(2)}</td>
                                              <td className="p-6 text-center">{t.status !== 'CANCELLED' && <button onClick={() => { setTransactionToVoid(t.id); setVoidModalOpen(true); }} className="text-red-300 hover:text-red-500 transition-all"><XCircle size={22}/></button>} {t.status === 'CANCELLED' && <span className="text-[9px] font-black text-red-500 uppercase border border-red-200 px-2 py-1 rounded-lg">Estornado</span>}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  )}

                  {activeTab === 'MANAGE' && (
                      <div className="max-w-4xl mx-auto space-y-8 overflow-y-auto h-full pb-10 custom-scrollbar animate-fade-in">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col justify-between">
                                  <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Responsável</p><h3 className="text-3xl font-black text-slate-800 tracking-tighter">{finState.activeCashSession?.operatorName}</h3><p className="text-sm font-bold text-blue-600 mt-2 flex items-center gap-2"><Clock size={16}/> Turno iniciado às {finState.activeCashSession?.openedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div>
                                  <div className="mt-8 pt-8 border-t flex items-end justify-between"><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fundo Inicial</p><p className="text-2xl font-black text-slate-900">R$ {finState.activeCashSession?.initialAmount.toFixed(2)}</p></div><Button onClick={() => setCloseModalOpen(true)} className="bg-slate-900 hover:bg-red-600 text-white font-black py-4 px-8 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs">Fechar Turno</Button></div>
                              </div>
                              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-emerald-100 flex flex-col justify-between">
                                  <div className="flex items-center gap-4 mb-4"><div className="bg-emerald-500 p-4 rounded-3xl text-white shadow-lg shadow-emerald-500/20"><Wallet size={32}/></div><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-tight">Retiradas & Sangrias</h3></div>
                                  <p className="text-sm text-gray-500 font-medium leading-relaxed">Gerencie todas as saídas manuais do caixa para pagamentos extras ou depósitos bancários.</p>
                                  <button onClick={() => setBleedModalOpen(true)} className="w-full mt-6 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-3xl font-black shadow-xl shadow-emerald-600/20 transition-all uppercase tracking-widest text-xs">Registrar Sangria</button>
                              </div>
                          </div>
                      </div>
                  )}
              </main>
          </div>

          <CashBleedModal isOpen={bleedModalOpen} onClose={() => setBleedModalOpen(false)} />
          <CloseRegisterModal isOpen={closeModalOpen} onClose={() => setCloseModalOpen(false)} onSuccess={() => setActiveTab('ACTIVE')} />
          <Modal isOpen={voidModalOpen} onClose={() => setVoidModalOpen(false)} title="Autorizar Cancelamento" variant="dialog" maxWidth="sm">
              <form onSubmit={async (e) => { e.preventDefault(); if (!transactionToVoid) return; try { await voidTransaction(transactionToVoid, voidPin); setVoidModalOpen(false); setVoidPin(''); showAlert({ title: "Sucesso", message: "Transação estornada!", type: 'SUCCESS' }); } catch (error: any) { showAlert({ title: "Erro", message: error.message, type: 'ERROR' }); } }} className="space-y-6">
                  <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-start gap-3"><Lock size={20} className="shrink-0"/><p>Apenas gerentes podem autorizar o estorno de vendas concluídas. Insira sua Senha Mestra abaixo.</p></div>
                  <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">PIN do Administrador</label><input type="password" autoFocus className="w-full border-2 p-5 rounded-2xl focus:border-red-500 outline-none text-center font-black tracking-[0.5em] text-3xl shadow-inner bg-gray-50" placeholder="****" value={voidPin} onChange={e => setVoidPin(e.target.value)} maxLength={4} /></div>
                  <Button type="submit" className="w-full py-5 bg-red-600 hover:bg-red-700 font-black rounded-2xl text-lg shadow-xl shadow-red-600/20">ESTORNAR AGORA</Button>
              </form>
          </Modal>
      </div>
  );
};
