
import React, { useState, useEffect } from 'react';
import { useRestaurant } from '@/core/context/RestaurantContext';
import { useFinance } from '@/core/context/FinanceContext';
import { useStaff } from '@/core/context/StaffContext';
import { useUI } from '@/core/context/UIContext';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal'; 
import { ExpenseFormModal } from '../../components/modals/ExpenseFormModal';
import { CashBleedModal } from '../../components/modals/CashBleedModal';
import { supabase } from '@/core/api/supabaseClient';
import { Expense, CashSession, Transaction, CashMovement } from '@/types';
import { Plus, CheckSquare, Trash2, Wallet, Banknote, ArrowDown, Repeat, Archive, User, ChevronRight, LayoutDashboard, List, DollarSign, Edit, Lock, Settings } from 'lucide-react';
import { GlobalLoading } from '../../components/GlobalLoading';

export const AdminFinance: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: finState, updateExpense, deleteExpense } = useFinance();
  const { state: staffState, saveLegalSettings } = useStaff();
  const { showAlert } = useUI();
  
  // State for Tabs (Simplified to just Operational Finance)
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SESSIONS' | 'EXPENSES'>('OVERVIEW');

  // State for Expenses Filter
  const [expenseViewMode] = useState<'MONTH' | 'RECURRING' | 'HISTORY'>('MONTH');
  const [historyStart] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
  const [historyEnd] = useState(new Date().toISOString().split('T')[0]);

  // State for Modals
  const [editingExpense, setEditingExpense] = useState<Partial<Expense> | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isBleedModalOpen, setIsBleedModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // States para Ações Sensíveis (Baixa e Exclusão)
  const [payModal, setPayModal] = useState<{ isOpen: boolean, expense: Expense | null }>({ isOpen: false, expense: null });
  const [paymentMethod, setPaymentMethod] = useState<'BANK' | 'CASH'>('BANK');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, expenseId: string | null }>({ isOpen: false, expenseId: null });
  const [adminPin, setAdminPin] = useState('');

  // State para Histórico de Caixas
  const [sessionsHistory, setSessionsHistory] = useState<CashSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  // State para Detalhes da Sessão (Modal)
  const [selectedSession, setSelectedSession] = useState<CashSession | null>(null);
  const [sessionDetails, setSessionDetails] = useState<{ transactions: Transaction[], movements: CashMovement[] } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // --- Fetch Sessions History ---
  useEffect(() => {
      if (activeTab === 'SESSIONS' && restState.tenantId) {
          const fetchSessions = async () => {
              setLoadingSessions(true);
              const { data } = await supabase
                .from('cash_sessions')
                .select('*')
                .eq('tenant_id', restState.tenantId)
                .order('opened_at', { ascending: false })
                .limit(50); 

              if (data) {
                  const mappedSessions = data.map((s: any) => ({
                      id: s.id,
                      openedAt: new Date(s.opened_at),
                      initialAmount: s.initial_amount,
                      status: s.status,
                      operatorName: s.operator_name,
                      closedAt: s.closed_at ? new Date(s.closed_at) : undefined,
                      finalAmount: s.final_amount
                  }));
                  setSessionsHistory(mappedSessions);
              }
              setLoadingSessions(false);
          };
          fetchSessions();
      }
  }, [activeTab, restState.tenantId]);

  // --- Handle View Session Details ---
  const handleViewSession = async (session: CashSession) => {
      setSelectedSession(session);
      setSessionDetails(null);
      setLoadingDetails(true);

      try {
          const startTime = session.openedAt.toISOString();
          const endTime = session.closedAt ? session.closedAt.toISOString() : new Date().toISOString();

          // 1. Buscar Transações (Vendas) neste período
          const { data: transData } = await supabase
              .from('transactions')
              .select('*')
              .eq('tenant_id', restState.tenantId)
              .gte('created_at', startTime)
              .lte('created_at', endTime)
              .order('created_at', { ascending: false });

          const mappedTrans = (transData || []).map((t: any) => ({
              id: t.id,
              tableId: t.table_id || '',
              tableNumber: t.table_number || 0,
              amount: t.amount,
              method: t.method,
              timestamp: new Date(t.created_at),
              itemsSummary: t.items_summary || '',
              cashierName: t.cashier_name || '',
              status: t.status || 'COMPLETED'
          }));

          // 2. Buscar Movimentações (Sangrias/Suprimentos) desta sessão
          const { data: moveData } = await supabase
              .from('cash_movements')
              .select('*')
              .eq('session_id', session.id)
              .order('created_at', { ascending: false });
            
          const mappedMoves = (moveData || []).map((m: any) => ({
              id: m.id,
              sessionId: m.session_id,
              type: m.type,
              amount: m.amount,
              reason: m.reason,
              timestamp: new Date(m.created_at),
              userName: m.user_name
          }));

          setSessionDetails({
              transactions: mappedTrans,
              movements: mappedMoves
          });

      } catch (error) {
          console.error("Erro ao buscar detalhes da sessão:", error);
          showAlert({ title: "Erro", message: "Não foi possível carregar os detalhes.", type: "ERROR" });
      } finally {
          setLoadingDetails(false);
      }
  };

  // --- Calculations (Overview Tab) ---
  const activeTransactions = finState.transactions.filter(t => t.status !== 'CANCELLED');

  // 1. Receitas Totais (Todas as transações válidas)
  const totalRevenue = activeTransactions.reduce((acc, t) => acc + t.amount, 0);

  // 2. Despesas Totais Pagas
  const totalExpensesPaid = finState.expenses
      .filter(e => e.isPaid)
      .reduce((acc, e) => acc + e.amount, 0);

  // 3. Saldo Absoluto (Tudo que a empresa tem: Banco + Cofre)
  const absoluteBalance = totalRevenue - totalExpensesPaid;

  // 4. Lógica de Caixa (Dinheiro Físico) - Sessão Atual
  const activeSessionInitial = finState.activeCashSession?.initialAmount || 0;
  
  const sessionCashSales = activeTransactions
      .filter(t => t.method === 'CASH' && finState.activeCashSession && new Date(t.timestamp) >= finState.activeCashSession.openedAt)
      .reduce((acc, t) => acc + t.amount, 0);
      
  const sessionBleeds = finState.cashMovements
      .filter(m => m.type === 'BLEED' && finState.activeCashSession && m.sessionId === finState.activeCashSession.id)
      .reduce((acc, m) => acc + m.amount, 0);
  const sessionSupplies = finState.cashMovements
      .filter(m => m.type === 'SUPPLY' && finState.activeCashSession && m.sessionId === finState.activeCashSession.id)
      .reduce((acc, m) => acc + m.amount, 0);
  
  // Despesas pagas em DINHEIRO (na sessão atual, assumindo que sai da gaveta)
  const sessionCashExpenses = finState.expenses
      .filter(e => e.isPaid && e.paymentMethod === 'CASH' && finState.activeCashSession && e.paidDate && new Date(e.paidDate) >= finState.activeCashSession.openedAt)
      .reduce((acc, e) => acc + e.amount, 0);

  // 5. Saldo Dinheiro (Gaveta Real)
  const drawerBalance = finState.activeCashSession 
      ? (activeSessionInitial + sessionCashSales + sessionSupplies - sessionBleeds - sessionCashExpenses)
      : 0;

  // 6. Saldo Financeiro (Banco/Cofre) = Saldo Absoluto - Dinheiro na Gaveta
  const bankBalance = absoluteBalance - drawerBalance;

  // 7. Valor Atual Esperado (Soma dos Saldos)
  const totalExpectedBalance = absoluteBalance;

  // Extra: Despesas do Mês para contexto
  const currentMonthExpenses = finState.expenses
      .filter(e => new Date(e.dueDate).getMonth() === new Date().getMonth())
      .reduce((acc, e) => acc + e.amount, 0);

  // --- Filtering Logic for Expenses Tab ---
  const filteredExpenses = finState.expenses.filter(expense => {
      const dueDate = new Date(expense.dueDate);
      const today = new Date();

      if (expenseViewMode === 'RECURRING') {
          return expense.isRecurring;
      }
      
      if (expenseViewMode === 'MONTH') {
          return dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
      }

      if (expenseViewMode === 'HISTORY') {
          const start = new Date(historyStart);
          const end = new Date(historyEnd);
          end.setHours(23, 59, 59, 999); 
          
          const dateToCheck = expense.isPaid && expense.paidDate ? new Date(expense.paidDate) : dueDate;
          return dateToCheck >= start && dateToCheck <= end;
      }

      return true;
  }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // --- Handlers ---
  const openPayModal = (expense: Expense) => {
      setPayModal({ isOpen: true, expense });
      setPaymentMethod(expense.paymentMethod || 'BANK');
      setPaymentDate(new Date().toISOString().split('T')[0]);
  };

  const handleConfirmPay = async () => {
      if (!payModal.expense) return;
      try {
          await updateExpense({
              ...payModal.expense,
              isPaid: true,
              paidDate: new Date(paymentDate),
              paymentMethod: paymentMethod
          });
          showAlert({ title: "Sucesso", message: "Pagamento registrado.", type: 'SUCCESS' });
          setPayModal({ isOpen: false, expense: null });
      } catch (error) {
          showAlert({ title: "Erro", message: "Erro ao registrar pagamento.", type: 'ERROR' });
      }
  };

  const openDeleteModal = (id: string) => {
      setDeleteModal({ isOpen: true, expenseId: id });
      setAdminPin('');
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!deleteModal.expenseId) return;

      try {
          await deleteExpense(deleteModal.expenseId, adminPin);
          setDeleteModal({ isOpen: false, expenseId: null });
          setAdminPin('');
          showAlert({ title: "Excluído", message: "Despesa removida com sucesso.", type: 'SUCCESS' });
      } catch (error: any) {
          showAlert({ title: "Erro", message: error.message || "Erro ao excluir despesa.", type: 'ERROR' });
      }
  };

  const handleEditExpense = (expense: Expense) => {
      setEditingExpense(expense);
      setIsExpenseModalOpen(true);
  };

  const StatBox = ({ title, value, icon: Icon, color, subtext }: any) => (
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
          <div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
              <h3 className={`text-2xl font-bold ${color}`}>{value}</h3>
              {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
          </div>
          <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('600', '50').replace('700', '50')}`}>
              <Icon size={24} className={color} />
          </div>
      </div>
  );

  const TabButton = ({ id, label, icon: Icon }: any) => (
      <button 
          onClick={() => setActiveTab(id)}
          className={`px-6 py-3 rounded-t-xl font-bold text-sm flex items-center gap-2 transition-all border-b-2 ${activeTab === id ? 'text-blue-600 border-blue-600 bg-blue-50/50' : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-gray-50'}`}
      >
          <Icon size={18} />
          <span className="hidden md:inline">{label}</span>
      </button>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        
        {/* --- Header Navigation --- */}
        <div className="bg-white border-b border-gray-200 px-6 pt-4 rounded-xl shadow-sm print:hidden">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Fluxo de Caixa & Despesas</h2>
                    <p className="text-sm text-gray-500">Controle operacional do dinheiro.</p>
                </div>
                <Button variant="outline" onClick={() => setIsSettingsModalOpen(true)} className="flex items-center gap-2">
                    <Settings size={18} />
                    <span className="hidden md:inline">Configurações</span>
                </Button>
            </div>

            <div className="flex overflow-x-auto gap-2">
                <TabButton id="OVERVIEW" label="Visão Geral" icon={LayoutDashboard} />
                <TabButton id="SESSIONS" label="Histórico de Caixas" icon={Archive} />
                <TabButton id="EXPENSES" label="Despesas" icon={List} />
            </div>
        </div>

        {/* --- Content Area --- */}
        <div className="min-h-[500px]">
            
            {/* VIEW: OVERVIEW */}
            {activeTab === 'OVERVIEW' && (
                <div className="space-y-8 animate-fade-in">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatBox 
                            title="Valor Atual Esperado" 
                            value={`R$ ${totalExpectedBalance.toFixed(2)}`} 
                            icon={DollarSign} 
                            color="text-emerald-600"
                            subtext="Soma de Cofre/Banco + Dinheiro"
                        />
                        <StatBox 
                            title="Saldo Financeiro" 
                            value={`R$ ${bankBalance.toFixed(2)}`} 
                            icon={Banknote} 
                            color="text-blue-600"
                            subtext="Cofre e Contas Bancárias"
                        />
                        <StatBox 
                            title="Dinheiro em Caixa" 
                            value={`R$ ${drawerBalance.toFixed(2)}`} 
                            icon={Wallet} 
                            color="text-green-600"
                            subtext={finState.activeCashSession ? "Gaveta do Caixa Aberto" : "Caixa Fechado (R$ 0,00)"}
                        />
                        <StatBox 
                            title="Despesas do Mês" 
                            value={`R$ ${currentMonthExpenses.toFixed(2)}`} 
                            icon={ArrowDown} 
                            color="text-red-600"
                            subtext="Total a Pagar/Pago"
                        />
                    </div>
                </div>
            )}

            {/* VIEW: HISTÓRICO DE CAIXAS (SESSIONS) */}
            {activeTab === 'SESSIONS' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white p-4 rounded-xl shadow-sm border mb-4">
                        <h3 className="font-bold text-lg text-gray-800">Histórico de Turnos</h3>
                        <p className="text-xs text-gray-500">Registro de todas as aberturas e fechamentos de caixa. Clique para ver detalhes.</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b text-xs font-black text-gray-400 uppercase tracking-widest">
                                <tr>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Abertura</th>
                                    <th className="p-4">Fechamento</th>
                                    <th className="p-4">Operador</th>
                                    <th className="p-4 text-right">Fundo Inicial</th>
                                    <th className="p-4 text-right">Valor Final (Contado)</th>
                                    <th className="p-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-sm">
                                {loadingSessions ? (
                                    <tr><td colSpan={7} className="p-8 text-center"><GlobalLoading message="Carregando histórico..." /></td></tr>
                                ) : sessionsHistory.length === 0 ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-gray-400">Nenhum caixa registrado.</td></tr>
                                ) : (
                                    sessionsHistory.map(session => (
                                        <tr 
                                            key={session.id} 
                                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                                            onClick={() => handleViewSession(session)}
                                        >
                                            <td className="p-4">
                                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase border ${session.status === 'OPEN' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                    {session.status === 'OPEN' ? 'Aberto' : 'Fechado'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-700 font-medium">
                                                {session.openedAt.toLocaleString()}
                                            </td>
                                            <td className="p-4 text-gray-500">
                                                {session.closedAt ? session.closedAt.toLocaleString() : '-'}
                                            </td>
                                            <td className="p-4 flex items-center gap-2">
                                                <User size={14} className="text-gray-400"/>
                                                <span className="font-bold text-slate-700">{session.operatorName}</span>
                                            </td>
                                            <td className="p-4 text-right font-mono text-slate-600">
                                                R$ {session.initialAmount.toFixed(2)}
                                            </td>
                                            <td className="p-4 text-right font-mono font-bold text-slate-800">
                                                {session.finalAmount !== undefined && session.finalAmount !== null 
                                                    ? `R$ ${session.finalAmount.toFixed(2)}` 
                                                    : '-'
                                                }
                                            </td>
                                            <td className="p-4 text-center">
                                                <ChevronRight size={16} className="text-gray-400" />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* VIEW: EXPENSES */}
            {activeTab === 'EXPENSES' && (
                <div className="space-y-6 animate-fade-in">
                    
                    {/* Toolbar de Ações e Filtros */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-sm border gap-4">
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">Contas a Pagar</h3>
                            <p className="text-xs text-gray-500">Gerencie pagamentos e custos.</p>
                        </div>
                        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                            <Button onClick={() => { setEditingExpense(null); setIsExpenseModalOpen(true); }}><Plus size={16}/> Nova Despesa</Button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white border-b text-xs font-black text-gray-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="p-4">Vencimento</th>
                                        <th className="p-4">Descrição</th>
                                        <th className="p-4">Categoria</th>
                                        <th className="p-4">Origem Pagto.</th>
                                        <th className="p-4 text-right">Valor</th>
                                        <th className="p-4 text-center">Status</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-sm">
                                    {filteredExpenses.map(expense => (
                                        <tr key={expense.id} className={`hover:bg-gray-50 transition-colors ${expense.isPaid ? 'bg-gray-50/50' : ''}`}>
                                            <td className="p-4 flex flex-col">
                                                <span className={`font-bold ${expense.isPaid ? 'text-slate-500' : (new Date(expense.dueDate) < new Date() ? 'text-red-600' : 'text-slate-700')}`}>
                                                    {new Date(expense.dueDate).toLocaleDateString()}
                                                </span>
                                                {expense.isRecurring && <span className="text-[10px] text-blue-600 flex items-center gap-1 font-bold"><Repeat size={10}/> Recorrente</span>}
                                            </td>
                                            <td className="p-4 font-medium">{expense.description}</td>
                                            <td className="p-4 text-gray-500">{expense.category}</td>
                                            <td className="p-4">
                                                {expense.paymentMethod === 'CASH' ? 
                                                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-bold border border-emerald-100 uppercase">Dinheiro</span> : 
                                                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold border border-blue-100 uppercase">Banco</span>
                                                }
                                            </td>
                                            <td className="p-4 text-right font-black text-slate-700">- R$ {expense.amount.toFixed(2)}</td>
                                            <td className="p-4 text-center">
                                                {expense.isPaid ? 
                                                    <div className="flex flex-col items-center">
                                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-black uppercase border border-green-200">Pago</span>
                                                        <span className="text-[10px] text-gray-400 mt-1">{expense.paidDate ? new Date(expense.paidDate).toLocaleDateString() : '-'}</span>
                                                    </div> : 
                                                    <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-[10px] font-black uppercase border border-yellow-200">Pendente</span>
                                                }
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {!expense.isPaid && (
                                                        <>
                                                            <button onClick={() => handleEditExpense(expense)} className="text-blue-600 p-2 rounded hover:bg-blue-50 transition-colors" title="Editar"><Edit size={18}/></button>
                                                            <button onClick={() => openPayModal(expense)} className="text-green-600 p-2 rounded hover:bg-green-50 transition-colors" title="Dar Baixa (Pagar)"><CheckSquare size={18}/></button>
                                                        </>
                                                    )}
                                                    <button onClick={() => openDeleteModal(expense.id)} className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors" title="Excluir"><Trash2 size={18}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredExpenses.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-gray-400 italic">Nenhuma despesa encontrada neste filtro.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* --- MODAIS LOCAIS PARA CONFIRMAÇÃO --- */}

        {/* Modal de Confirmação de Pagamento */}
        <Modal isOpen={payModal.isOpen} onClose={() => setPayModal({ isOpen: false, expense: null })} title="Confirmar Pagamento" variant="dialog" maxWidth="sm">
            <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-800">
                    <p className="font-bold">Deseja dar baixa em:</p>
                    <p>{payModal.expense?.description}</p>
                    <p className="text-lg font-black mt-1">R$ {payModal.expense?.amount.toFixed(2)}</p>
                </div>

                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-600">Origem do Pagamento</label>
                    <select className="w-full border p-2.5 rounded-lg text-sm bg-white" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}>
                        <option value="BANK">Conta Bancária</option>
                        <option value="CASH">Dinheiro (Caixa)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-600">Data do Pagamento</label>
                    <input type="date" className="w-full border p-2.5 rounded-lg text-sm" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                </div>

                <Button onClick={handleConfirmPay} className="w-full py-3">Confirmar Baixa</Button>
            </div>
        </Modal>

        {/* Modal de Exclusão com Senha */}
        <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, expenseId: null })} title="Excluir Despesa" variant="dialog" maxWidth="sm">
            <form onSubmit={handleConfirmDelete} className="space-y-4">
                <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-sm text-red-800 flex items-start gap-2">
                    <Lock size={16} className="shrink-0 mt-0.5"/>
                    <p>Esta ação é irreversível. Insira a senha mestra para continuar.</p>
                </div>
                
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-600">Senha Mestra (Admin)</label>
                    <input 
                        type="password" 
                        autoFocus 
                        className="w-full border p-2.5 rounded-lg text-center tracking-[0.5em] font-mono text-lg" 
                        placeholder="****" 
                        value={adminPin} 
                        onChange={e => setAdminPin(e.target.value)} 
                        maxLength={4}
                    />
                </div>

                <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => setDeleteModal({ isOpen: false, expenseId: null })} className="flex-1">Cancelar</Button>
                    <Button type="submit" variant="danger" className="flex-1">Confirmar Exclusão</Button>
                </div>
            </form>
        </Modal>

        {/* Modal Detalhes da Sessão */}
        <Modal isOpen={!!selectedSession} onClose={() => setSelectedSession(null)} title="Detalhes da Sessão" variant="dialog" maxWidth="lg">
            <div className="h-full flex flex-col max-h-[80vh]">
                {loadingDetails ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="space-y-6 overflow-y-auto pr-1">
                         {/* Header Resumo */}
                         <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                 <div>
                                     <p className="text-[10px] font-bold text-gray-500 uppercase">Abertura</p>
                                     <p className="font-bold text-slate-800">{selectedSession?.openedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                 </div>
                                 <div>
                                     <p className="text-[10px] font-bold text-gray-500 uppercase">Fechamento</p>
                                     <p className="font-bold text-slate-800">{selectedSession?.closedAt ? selectedSession.closedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Em Aberto'}</p>
                                 </div>
                                 <div>
                                     <p className="text-[10px] font-bold text-gray-500 uppercase">Fundo</p>
                                     <p className="font-bold text-slate-800">R$ {selectedSession?.initialAmount.toFixed(2)}</p>
                                 </div>
                                 <div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase">Final (Contado)</p>
                                    <p className="font-bold text-slate-800">{selectedSession?.finalAmount ? `R$ ${selectedSession.finalAmount.toFixed(2)}` : '-'}</p>
                                 </div>
                             </div>
                         </div>

                         {/* Seção Transações e Movimentos (Timeline Unificada) */}
                         <div>
                             <h4 className="font-black text-sm text-gray-800 uppercase tracking-widest mb-3 border-b pb-2">Extrato de Operações</h4>
                             <div className="space-y-2">
                                 {/* Lista combinada de vendas e movimentações */}
                                 {((sessionDetails?.transactions || []).map((t: any) => ({...t, _type: 'SALE'}))
                                     .concat((sessionDetails?.movements || []).map((m: any) => ({...m, _type: m.type})))
                                 ).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                  .map((item: any) => (
                                     <div key={item.id} className={`flex justify-between items-center p-3 rounded-lg border-l-4 ${
                                         item._type === 'SALE' ? 'bg-white border-green-500' : 
                                         item._type === 'BLEED' ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'
                                     } shadow-sm`}>
                                         <div>
                                             <p className="text-xs font-bold text-gray-800 flex items-center gap-2">
                                                 {item._type === 'SALE' ? 'Venda' : (item._type === 'BLEED' ? 'Sangria' : 'Suprimento')}
                                                 <span className="text-[10px] text-gray-400 font-normal">{item.timestamp.toLocaleTimeString()}</span>
                                             </p>
                                             <p className="text-[10px] text-gray-500">
                                                 {item._type === 'SALE' 
                                                     ? `${item.itemsSummary} (${item.method})` 
                                                     : `${item.reason} - ${item.userName}`
                                                 }
                                             </p>
                                         </div>
                                         <span className={`font-mono font-bold text-sm ${item._type === 'BLEED' ? 'text-red-600' : 'text-green-600'}`}>
                                             {item._type === 'BLEED' ? '-' : '+'} R$ {item.amount.toFixed(2)}
                                         </span>
                                     </div>
                                 ))}
                                 {(!sessionDetails?.transactions.length && !sessionDetails?.movements.length) && (
                                     <p className="text-center py-6 text-gray-400 italic text-sm">Nenhuma operação registrada nesta sessão.</p>
                                 )}
                             </div>
                         </div>
                    </div>
                )}
            </div>
        </Modal>

        {/* Modais Globais */}
        <ExpenseFormModal 
            isOpen={isExpenseModalOpen} 
            onClose={() => setIsExpenseModalOpen(false)} 
            expenseToEdit={editingExpense} 
        />

        <CashBleedModal 
            isOpen={isBleedModalOpen} 
            onClose={() => setIsBleedModalOpen(false)}
            userRole="Admin" 
        />

        {/* Modal de Configurações Financeiras */}
        <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="Configurações Financeiras" variant="dialog" maxWidth="md">
            <div className="space-y-6">
                {restState.allowedModules?.includes('FINANCE') && (
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                            <User size={18} /> Integração com RH
                        </h4>
                        <p className="text-sm text-blue-600 mb-4">
                            Configure como o módulo financeiro interage com a folha de pagamento.
                        </p>
                        
                        <div className="bg-white p-4 rounded-lg border border-blue-100 flex items-center justify-between">
                            <div>
                                <p className="font-bold text-gray-800 text-sm">Lançar Folha como Despesa</p>
                                <p className="text-xs text-gray-500 mt-1">Ao fechar uma folha no RH, criar automaticamente uma despesa a pagar.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-[10px] font-black uppercase tracking-wider ${staffState.legalSettings?.integrateFinance ? 'text-green-600' : 'text-gray-400'}`}>
                                    {staffState.legalSettings?.integrateFinance ? 'ATIVADO' : 'DESATIVADO'}
                                </span>
                                <button 
                                    onClick={() => saveLegalSettings({ integrateFinance: !staffState.legalSettings?.integrateFinance })}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${staffState.legalSettings?.integrateFinance ? 'bg-green-500' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${staffState.legalSettings?.integrateFinance ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="flex justify-end">
                    <Button onClick={() => setIsSettingsModalOpen(false)}>Fechar</Button>
                </div>
            </div>
        </Modal>
    </div>
  );
};
