
import React, { useState, useEffect } from 'react';
import { useFinance } from '@/core/context/FinanceContext';
import { useOrder } from '@/core/context/OrderContext';
import { useUI } from '@/core/context/UIContext';
import { useAuth } from '@/core/context/AuthProvider';
import { TableStatus } from '@/types'; 
import { Button } from '../components/Button';
import { History, ShoppingCart, Wallet, Receipt, Lock, RefreshCcw, LogOut, LayoutGrid, Bike, User, Eye, XCircle, Banknote, Zap, CreditCard, Split, CheckSquare, EyeOff } from 'lucide-react';
import { CloseRegisterModal } from '../components/modals/CloseRegisterModal';
import { CashBleedModal } from '../components/modals/CashBleedModal';
import { Modal } from '../components/Modal';
import { GlobalLoading } from '../components/GlobalLoading';

// Sub-Componentes
import { CashierPOSView } from '../components/cashier/CashierPOSView';
import { Clock } from 'lucide-react';
import { DeliveryOptionsModal } from '../components/modals/DeliveryOptionsModal';
import { DeliveryStatusModal } from '../components/modals/DeliveryStatusModal';

export const CashierDashboard: React.FC = () => {
  const { state: orderState, dispatch: orderDispatch } = useOrder();
  const { state: finState, openRegister, refreshTransactions, voidTransaction } = useFinance();
  const { showAlert, showConfirm, isHeaderVisible, toggleHeader } = useUI();
  const { logout, state: authState } = useAuth();

  useEffect(() => {
    // Hide header on mount if it's visible
    if (isHeaderVisible) {
      toggleHeader();
    }
    // Optional: Show header again on unmount
    return () => {
      if (!isHeaderVisible) {
        // toggleHeader(); // We might not want to force it back on unmount if they are navigating elsewhere
      }
    };
  }, []);
  
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY' | 'PDV' | 'MANAGE'>('PDV');
  const [cart, setCart] = useState<{ item: any; quantity: number; notes: string; extras: any[] }[]>([]);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [deliveryStatusModalOpen, setDeliveryStatusModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  
  const [openRegisterAmount, setOpenRegisterAmount] = useState('');
  const [openingLoading, setOpeningLoading] = useState(false);
  
  const [bleedModalOpen, setBleedModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [cashPaymentModalOpen, setCashPaymentModalOpen] = useState(false);

  const [transactionToVoid, setTransactionToVoid] = useState<string | null>(null);
  const [voidPin, setVoidPin] = useState('');
  
  const [cashReceived, setCashReceived] = useState('');
  const [pendingCashAction, setPendingCashAction] = useState<{ type: 'TABLE', total: number } | null>(null);

  const [splitMode, setSplitMode] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const occupiedTables = orderState.tables.filter(t => t.status !== TableStatus.AVAILABLE);
  const selectedTable = orderState.tables.find(t => t.id === selectedTableId);
  const tableOrders = orderState.orders.filter(o => o.tableId === selectedTableId && !o.isPaid);
  
  const ordersToPay = (splitMode && selectedOrderIds.length > 0)
    ? tableOrders.filter(o => selectedOrderIds.includes(o.id))
    : tableOrders;

  const totalAmount = ordersToPay.reduce((sum, order) => sum + order.items.reduce((s, i) => s + (i.productPrice * i.quantity), 0), 0);

  const handleManualRefresh = async () => {
      setIsRefreshing(true);
      await refreshTransactions();
      setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleLogout = () => {
      showConfirm({ title: "Sair do Caixa?", message: "Isso fará logout do sistema.", type: 'WARNING', confirmText: "Sair", onConfirm: logout });
  };

  const handleOpenRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      const amount = parseFloat(openRegisterAmount);
      if (isNaN(amount) || amount < 0) return showAlert({ title: "Valor Inválido", message: "Informe um valor inicial válido.", type: 'WARNING' });

      setOpeningLoading(true);
      try {
          await openRegister(amount, authState.currentUser?.name || 'Operador');
          setOpenRegisterAmount('');
      } catch (error: any) {
          showAlert({ title: "Erro ao Abrir", message: error.message || "Falha ao abrir caixa.", type: 'ERROR' });
      } finally { setOpeningLoading(false); }
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]);
  };

  const handlePayment = async (method: string) => {
      if (!selectedTableId || totalAmount <= 0) return;
      if (method === 'CASH') {
          setCashReceived('');
          setPendingCashAction({ type: 'TABLE', total: totalAmount });
          setCashPaymentModalOpen(true);
          return;
      }
      showConfirm({
          title: "Confirmar Pagamento",
          message: `Deseja confirmar o recebimento de R$ ${totalAmount.toFixed(2)} via ${method}?`,
          onConfirm: () => finalizeTablePayment(method)
      });
  };

  const finalizeTablePayment = async (method: string) => {
      if (!selectedTableId) return;
      try {
          await orderDispatch({ 
              type: 'PROCESS_PAYMENT', 
              tableId: selectedTableId, 
              amount: totalAmount, 
              method, 
              cashierName: 'Caixa',
              specificOrderIds: (splitMode && selectedOrderIds.length > 0) ? selectedOrderIds : undefined
          });
          
          if (!splitMode || totalAmount >= tableOrders.reduce((sum, order) => sum + order.items.reduce((s, i) => s + (i.productPrice * i.quantity), 0), 0)) {
              setSelectedTableId(null);
          } else {
              setSplitMode(false);
              setSelectedOrderIds([]);
          }
          showAlert({ title: "Pagamento Realizado", message: "Pagamento registrado com sucesso.", type: 'SUCCESS' });
      } catch (error) { showAlert({ title: "Erro", message: "Falha ao processar pagamento.", type: 'ERROR' }); }
  };

  const handleVoidSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!transactionToVoid) return;
      try {
          await voidTransaction(transactionToVoid, voidPin);
          setVoidModalOpen(false); setVoidPin('');
          showAlert({ title: "Sucesso", message: "Transação estornada!", type: 'SUCCESS' });
      } catch (error: any) { showAlert({ title: "Erro", message: error.message, type: 'ERROR' }); }
  };

  if (!finState.activeCashSession) {
      return (
          <div className="h-full flex items-center justify-center bg-slate-950 p-4 font-sans">
              <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center max-w-md w-full border border-white/10 relative">
                  <button onClick={handleLogout} className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition-colors"><LogOut size={24} /></button>
                  <div className="bg-blue-50 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-8 shadow-inner"><Lock size={48} className="text-blue-600" /></div>
                  <h2 className="text-3xl font-black mb-2 text-slate-800 uppercase tracking-tighter">Frente de Caixa</h2>
                  <p className="text-gray-400 mb-8 font-medium">Informe o fundo de reserva para iniciar o turno.</p>
                  <form onSubmit={handleOpenRegister}>
                      <div className="mb-8">
                          <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest">Saldo em Dinheiro (Gaveta)</label>
                          <div className="relative">
                              <span className="absolute left-4 top-5 font-black text-2xl text-gray-300">R$</span>
                              <input type="number" step="0.01" className="border-2 border-gray-100 p-6 rounded-3xl w-full text-center text-4xl font-black text-blue-600 focus:outline-none focus:border-blue-500 transition-all shadow-inner bg-gray-50" placeholder="0.00" value={openRegisterAmount} onChange={e => setOpenRegisterAmount(e.target.value)} autoFocus required disabled={openingLoading}/>
                          </div>
                      </div>
                      <Button type="submit" disabled={openingLoading} className="w-full py-5 text-xl font-black rounded-3xl shadow-2xl shadow-blue-200">ABRIR CAIXA AGORA</Button>
                  </form>
              </div>
              {openingLoading && <GlobalLoading message="Abrindo caixa..." />}
          </div>
      );
  }

  const NavTab = ({ tab, icon: Icon, label }: any) => (
      <button onClick={() => setActiveTab(tab)} className={`px-4 py-2 md:px-6 rounded-xl flex items-center gap-2 transition-all font-bold text-sm border-2 ${activeTab === tab ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-gray-500 border-transparent hover:bg-gray-100'}`}>
          <Icon size={18} /> <span className="hidden md:inline">{label}</span>
      </button>
  );

  return (
      <div className="h-full bg-gray-100 flex flex-col overflow-hidden font-sans">
          {/* Sub-Header para Navegação Local do Caixa */}
          <div className="bg-white border-b px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 z-20">
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto max-w-full no-scrollbar">
                  <NavTab tab="PDV" icon={ShoppingCart} label="Balcão" />
                  <NavTab tab="ACTIVE" icon={Receipt} label="Mesas" />
                  <NavTab tab="HISTORY" icon={History} label="Extrato" />
                  <NavTab tab="MANAGE" icon={Wallet} label="Turno" />
              </div>
              <div className="flex items-center gap-2">
                  {activeTab === 'PDV' && (
                      <button 
                        onClick={() => setDeliveryModalOpen(true)} 
                        disabled={cart.length === 0}
                        className={`p-2.5 rounded-xl transition-all relative ${cart.length > 0 ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}
                        title="Configurar Delivery"
                      >
                          <Bike size={18}/>
                      </button>
                  )}
                  
                  <button 
                    onClick={() => setDeliveryStatusModalOpen(true)}
                    className="p-2.5 rounded-xl bg-gray-50 text-slate-600 hover:bg-gray-100 transition-all relative"
                    title="Status Delivery"
                  >
                      <Clock size={18}/>
                      {orderState.orders.some(o => o.type === 'DELIVERY' && !o.isPaid && o.status !== 'CANCELLED' && (o.items.filter(i => i.productType === 'KITCHEN').length === 0 || o.items.filter(i => i.productType === 'KITCHEN').every(i => i.status === 'READY'))) && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></span>
                      )}
                  </button>

                  <button 
                    onClick={toggleHeader}
                    className="p-2.5 rounded-xl bg-gray-50 text-slate-600 hover:bg-gray-100 transition-all"
                    title={isHeaderVisible ? "Ocultar Menu" : "Mostrar Menu"}
                  >
                    {isHeaderVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>

                  <button onClick={handleManualRefresh} className={`p-2.5 rounded-xl bg-gray-50 text-blue-600 hover:bg-blue-50 transition-all ${isRefreshing ? 'animate-spin' : ''}`} title="Sincronizar"><RefreshCcw size={18}/></button>
                  <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 uppercase tracking-wide">Caixa Aberto</div>
              </div>
          </div>

          <main className="flex-1 p-3 md:p-6 overflow-hidden">
                  
                  {activeTab === 'PDV' && <CashierPOSView cart={cart} setCart={setCart} />}

                  {activeTab === 'ACTIVE' && (
                      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
                          <div className="lg:w-1/3 flex flex-col h-full bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
                              <div className="p-6 bg-slate-50 border-b flex items-center justify-between"><h3 className="font-black uppercase tracking-tight text-slate-700">Ocupação Atual</h3><span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-lg">{occupiedTables.length} Mesas</span></div>
                              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                  {occupiedTables.map(t => (
                                      <button key={t.id} onClick={() => setSelectedTableId(t.id)} className={`w-full p-5 rounded-3xl border-2 text-left transition-all flex justify-between items-center group relative overflow-hidden ${selectedTableId === t.id ? 'border-blue-600 bg-blue-50/50 shadow-lg shadow-blue-600/5' : 'border-transparent bg-gray-50 hover:bg-white hover:border-gray-200'}`}>
                                          <div className="relative z-10">
                                              <div className={`font-black text-2xl tracking-tighter ${selectedTableId === t.id ? 'text-blue-600' : 'text-slate-800'}`}>Mesa {t.number}</div>
                                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mt-1"><User size={12}/> {t.customerName}</div>
                                          </div>
                                          {t.status === 'WAITING_PAYMENT' && <div className="bg-orange-500 text-white p-2 rounded-xl animate-pulse relative z-10"><Receipt size={20}/></div>}
                                      </button>
                                  ))}
                                  {occupiedTables.length === 0 && <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-50 py-20"><LayoutGrid size={48} className="mb-2"/><p className="font-bold uppercase text-xs">Salão Vazio</p></div>}
                              </div>
                          </div>

                          <div className="lg:w-2/3 flex flex-col h-full bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden animate-fade-in">
                              {selectedTable ? (
                                  <div className="flex flex-col h-full">
                                      <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
                                          <div><h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Mesa {selectedTable.number}</h2><p className="text-blue-400 text-xs font-bold uppercase tracking-widest mt-2">{selectedTable.customerName}</p></div>
                                          <div className="text-right">
                                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{splitMode ? 'Total Selecionado' : 'Subtotal Acumulado'}</p>
                                              <p className={`text-4xl font-black ${splitMode ? 'text-orange-400' : 'text-emerald-400'}`}>R$ {totalAmount.toFixed(2)}</p>
                                          </div>
                                      </div>
                                      
                                      <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                          {splitMode && (
                                              <div className="flex items-center justify-between bg-orange-50 p-3 rounded-xl mb-4 border border-orange-100">
                                                  <div className="flex items-center gap-2 text-orange-700 font-bold text-sm"><Split size={16}/> Selecione os pedidos para pagar</div>
                                                  <button onClick={() => { setSplitMode(false); setSelectedOrderIds([]); }} className="text-xs font-bold text-gray-500 hover:text-gray-800">Cancelar Seleção</button>
                                              </div>
                                          )}
                                          {tableOrders.map(order => {
                                              const orderTotal = order.items.reduce((s, i) => s + (i.productPrice * i.quantity), 0);
                                              const isSelected = selectedOrderIds.includes(order.id);
                                              
                                              return (
                                                <div key={order.id} onClick={() => splitMode && toggleOrderSelection(order.id)} className={`border rounded-2xl overflow-hidden transition-all ${splitMode ? 'cursor-pointer hover:border-blue-400' : ''} ${isSelected ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50' : 'border-gray-100'}`}>
                                                    <div className="bg-gray-50 p-3 flex justify-between items-center border-b border-gray-100">
                                                        <div className="flex items-center gap-2">
                                                            {splitMode && (<div className={`w-5 h-5 rounded border-2 flex items-center justify-center bg-white ${isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'}`}>{isSelected && <CheckSquare size={14}/>}</div>)}
                                                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Pedido #{order.id.slice(0,4)}</span>
                                                            <span className="text-[10px] text-gray-400 ml-2">{new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                        </div>
                                                        <span className="font-bold text-slate-700">R$ {orderTotal.toFixed(2)}</span>
                                                    </div>
                                                    <div className="p-3"><table className="w-full text-left"><tbody className="divide-y divide-gray-50">{order.items.map((item, idx) => (<tr key={idx} className=""><td className="py-2 px-2 font-black text-slate-400 text-sm">{item.quantity}x</td><td className="py-2 font-bold text-slate-700 text-sm">{item.productName}</td><td className="py-2 text-right text-slate-400 text-sm">R$ {(item.productPrice * item.quantity).toFixed(2)}</td></tr>))}</tbody></table></div>
                                                </div>
                                              );
                                          })}
                                      </div>

                                      <div className="p-6 bg-gray-50 border-t grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
                                          {!splitMode && tableOrders.length > 1 && (<button onClick={() => setSplitMode(true)} className="col-span-2 lg:col-span-4 flex items-center justify-center gap-2 bg-white border-2 border-orange-200 text-orange-600 hover:bg-orange-50 p-3 rounded-2xl font-black uppercase text-xs tracking-widest mb-2 transition-all"><Split size={16}/> Dividir Conta / Selecionar Pedidos</button>)}
                                          <button onClick={() => handlePayment('CASH')} className="flex flex-col items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-2xl font-black shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95"><Banknote size={20}/><span className="text-[10px] uppercase tracking-widest">Dinheiro</span></button>
                                          <button onClick={() => handlePayment('PIX')} className="flex flex-col items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-2xl font-black shadow-lg shadow-slate-900/20 transition-all hover:scale-[1.02] active:scale-95"><Zap size={20}/><span className="text-[10px] uppercase tracking-widest">Pix</span></button>
                                          <button onClick={() => handlePayment('DEBIT')} className="flex flex-col items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-2xl font-black shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-95"><CreditCard size={20}/><span className="text-[10px] uppercase tracking-widest">Débito</span></button>
                                          <button onClick={() => handlePayment('CREDIT')} className="flex flex-col items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-2xl font-black shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95"><CreditCard size={20}/><span className="text-[10px] uppercase tracking-widest">Crédito</span></button>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-gray-300 opacity-50 space-y-4"><Receipt size={80} strokeWidth={1} /><p className="font-black uppercase tracking-widest">Aguardando Seleção</p></div>
                              )}
                          </div>
                      </div>
                  )}

                  {activeTab === 'HISTORY' && (
                      <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden h-full flex flex-col animate-fade-in">
                          <div className="p-6 border-b bg-gray-50 flex justify-between items-center shrink-0"><h3 className="font-black text-slate-800 uppercase tracking-tighter text-xl">Extrato Diário</h3><Button size="sm" variant="outline" onClick={refreshTransactions} className="rounded-xl flex items-center gap-2"><RefreshCcw size={14} className={isRefreshing ? 'animate-spin' : ''}/> Sincronizar</Button></div>
                          <div className="flex-1 overflow-auto custom-scrollbar">
                              <table className="w-full text-left">
                                  <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest sticky top-0 z-10"><tr className="border-b"><th className="p-6">Hora</th><th className="p-6">Detalhes</th><th className="p-6">Método</th><th className="p-6 text-right">Valor</th><th className="p-6 text-center">Ações</th></tr></thead>
                                  <tbody className="divide-y divide-gray-50">
                                      {finState.transactions.map(t => (
                                          <tr key={t.id} className={`hover:bg-gray-50/50 transition-colors ${t.status === 'CANCELLED' ? 'opacity-40 grayscale' : ''}`}>
                                              <td className="p-6"><div className="font-black text-slate-700">{t.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></td>
                                              <td className="p-6 text-sm font-bold text-slate-600 uppercase tracking-tight">{t.itemsSummary}</td>
                                              <td className="p-6"><span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg border border-blue-100 uppercase">{t.method}</span></td>
                                              <td className="p-6 text-right font-black text-slate-800">R$ {t.amount.toFixed(2)}</td>
                                              <td className="p-6 text-center">
                                                  <div className="flex justify-center items-center gap-2">
                                                      {t.cashierName && (
                                                          <div className="relative group">
                                                              <Eye size={20} className="text-gray-400 cursor-help" />
                                                              <div className="absolute right-0 bottom-full mb-2 w-32 bg-slate-800 text-white text-[10px] font-bold p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">Op: {t.cashierName}</div>
                                                          </div>
                                                      )}
                                                      {t.status !== 'CANCELLED' && <button onClick={() => { setTransactionToVoid(t.id); setVoidModalOpen(true); }} className="text-red-300 hover:text-red-500 transition-all"><XCircle size={22}/></button>} 
                                                      {t.status === 'CANCELLED' && <span className="text-[9px] font-black text-red-500 uppercase border border-red-200 px-2 py-1 rounded-lg">Estornado</span>}
                                                  </div>
                                              </td>
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
          
          <CashBleedModal isOpen={bleedModalOpen} onClose={() => setBleedModalOpen(false)} />
          <CloseRegisterModal isOpen={closeModalOpen} onClose={() => setCloseModalOpen(false)} onSuccess={() => setActiveTab('ACTIVE')} />
          
          <DeliveryOptionsModal 
            isOpen={deliveryModalOpen} 
            onClose={() => setDeliveryModalOpen(false)} 
            cart={cart} 
            onSuccess={() => setCart([])} 
          />

          <DeliveryStatusModal 
            isOpen={deliveryStatusModalOpen} 
            onClose={() => setDeliveryStatusModalOpen(false)} 
          />
          
          <Modal isOpen={voidModalOpen} onClose={() => setVoidModalOpen(false)} title="Autorizar Cancelamento" variant="dialog" maxWidth="sm">
              <form onSubmit={handleVoidSubmit} className="space-y-6">
                  <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-start gap-3"><Lock size={20} className="shrink-0"/><p>Apenas gerentes podem autorizar o estorno de vendas concluídas. Insira sua Senha Mestra abaixo.</p></div>
                  <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">PIN do Administrador</label><input type="password" autoFocus className="w-full border-2 p-5 rounded-2xl focus:border-red-500 outline-none text-center font-black tracking-[0.5em] text-3xl shadow-inner bg-gray-50" placeholder="****" value={voidPin} onChange={e => setVoidPin(e.target.value)} maxLength={4} /></div>
                  <Button type="submit" className="w-full py-5 bg-red-600 hover:bg-red-700 font-black rounded-2xl text-lg shadow-xl shadow-red-600/20">ESTORNAR AGORA</Button>
              </form>
          </Modal>

          <Modal isOpen={cashPaymentModalOpen} onClose={() => { setCashPaymentModalOpen(false); setPendingCashAction(null); }} title="Recebimento em Dinheiro" variant="dialog" maxWidth="sm">
              <div className="space-y-6">
                  <div className="text-center">
                      <p className="text-sm font-bold text-gray-500 uppercase">Valor Total</p>
                      <p className="text-4xl font-black text-slate-800">R$ {pendingCashAction?.total.toFixed(2)}</p>
                  </div>
                  <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Valor Recebido</label>
                      <input type="number" step="0.01" autoFocus className="w-full border-2 p-5 rounded-2xl focus:border-emerald-500 outline-none text-center font-black text-3xl shadow-inner bg-emerald-50/30 text-emerald-700" placeholder="0.00" value={cashReceived} onChange={e => setCashReceived(e.target.value)} />
                  </div>
                  {parseFloat(cashReceived) >= (pendingCashAction?.total || 0) && (
                      <div className="bg-emerald-100 p-4 rounded-2xl text-center border border-emerald-200">
                          <p className="text-sm font-bold text-emerald-700 uppercase">Troco a Devolver</p>
                          <p className="text-3xl font-black text-emerald-800">R$ {(parseFloat(cashReceived) - (pendingCashAction?.total || 0)).toFixed(2)}</p>
                      </div>
                  )}
                  <Button onClick={() => { setCashPaymentModalOpen(false); if (pendingCashAction) finalizeTablePayment('CASH'); }} disabled={!cashReceived || parseFloat(cashReceived) < (pendingCashAction?.total || 0)} className="w-full py-5 text-xl font-black rounded-2xl shadow-xl">CONFIRMAR RECEBIMENTO</Button>
              </div>
          </Modal>
      </div>
  );
};
