
import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useFinance } from '../../context/FinanceContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal'; // Importando Modal Genérico para ações locais
import { ExpenseFormModal } from '../../components/modals/ExpenseFormModal';
import { CashBleedModal } from '../../components/modals/CashBleedModal';
import { Expense } from '../../types';
import { Plus, CheckSquare, Trash2, Wallet, CreditCard, Banknote, ArrowDown, Repeat, PieChart, FileText, Lightbulb, LayoutDashboard, List, Edit, Lock, Calendar, ShoppingCart, Filter, History, Clock } from 'lucide-react';

// Importando os componentes das outras páginas para uso nas abas
import { AdminAccounting } from './AdminAccounting';
import { AccountingReport } from './AccountingReport';
import { AdminFinancialTips } from './AdminFinancialTips';
import { AdminPurchaseSuggestions } from './AdminPurchaseSuggestions'; // Nova importação

export const AdminFinance: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: finState, updateExpense, deleteExpense } = useFinance();
  const { showConfirm, showAlert } = useUI();
  
  // State for Tabs
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'EXPENSES' | 'PURCHASES' | 'DRE' | 'REPORT' | 'TIPS'>('OVERVIEW');

  // State for Expenses Filter
  const [expenseViewMode, setExpenseViewMode] = useState<'MONTH' | 'RECURRING' | 'HISTORY'>('MONTH');
  const [historyStart, setHistoryStart] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
  const [historyEnd, setHistoryEnd] = useState(new Date().toISOString().split('T')[0]);

  // State for Modals
  const [editingExpense, setEditingExpense] = useState<Partial<Expense> | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isBleedModalOpen, setIsBleedModalOpen] = useState(false);

  // States para Ações Sensíveis (Baixa e Exclusão)
  const [payModal, setPayModal] = useState<{ isOpen: boolean, expense: Expense | null }>({ isOpen: false, expense: null });
  const [paymentMethod, setPaymentMethod] = useState<'BANK' | 'CASH'>('BANK');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, expenseId: string | null }>({ isOpen: false, expenseId: null });
  const [adminPin, setAdminPin] = useState('');

  // --- Calculations (Overview Tab) ---
  const activeTransactions = finState.transactions.filter(t => t.status !== 'CANCELLED');

  const pixSales = activeTransactions.filter(t => t.method === 'PIX').reduce((acc, t) => acc + t.amount, 0);
  const cardSales = activeTransactions.filter(t => ['CREDIT', 'DEBIT', 'CARD'].includes(t.method)).reduce((acc, t) => acc + t.amount, 0);

  const activeSessionInitial = finState.activeCashSession?.initialAmount || 0;
  
  const sessionCashSales = activeTransactions
      .filter(t => t.method === 'CASH' && finState.activeCashSession && new Date(t.timestamp) >= finState.activeCashSession.openedAt)
      .reduce((acc, t) => acc + t.amount, 0);
      
  const sessionBleeds = finState.cashMovements
      .filter(m => m.type === 'BLEED')
      .reduce((acc, m) => acc + m.amount, 0);
  const sessionSupplies = finState.cashMovements
      .filter(m => m.type === 'SUPPLY')
      .reduce((acc, m) => acc + m.amount, 0);
  
  const cashExpensesToday = finState.expenses
      .filter(e => e.isPaid && e.paymentMethod === 'CASH' && new Date(e.paidDate!).toDateString() === new Date().toDateString())
      .reduce((acc, e) => acc + e.amount, 0);

  const drawerBalance = activeSessionInitial + sessionCashSales + sessionSupplies - sessionBleeds - cashExpensesToday;

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
          // Filtra pelo mês e ano atual
          return dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
      }

      if (expenseViewMode === 'HISTORY') {
          const start = new Date(historyStart);
          const end = new Date(historyEnd);
          end.setHours(23, 59, 59, 999); // Garante que pegue o dia final inteiro
          
          // Se foi pago, usa a data de pagamento, se não, usa vencimento
          const dateToCheck = expense.isPaid && expense.paidDate ? new Date(expense.paidDate) : dueDate;
          return dateToCheck >= start && dateToCheck <= end;
      }

      return true;
  }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // --- Handlers ---

  // 1. Abrir Modal de Pagamento
  const openPayModal = (expense: Expense) => {
      setPayModal({ isOpen: true, expense });
      setPaymentMethod(expense.paymentMethod || 'BANK');
      setPaymentDate(new Date().toISOString().split('T')[0]);
  };

  // 2. Confirmar Pagamento
  const handleConfirmPay = async () => {
      if (!payModal.expense) return;
      try {
          // Usamos updateExpense para atualizar status, data e método de uma vez
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

  // 3. Abrir Modal de Exclusão
  const openDeleteModal = (id: string) => {
      setDeleteModal({ isOpen: true, expenseId: id });
      setAdminPin('');
  };

  // 4. Confirmar Exclusão com Senha
  const handleConfirmDelete = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!deleteModal.expenseId) return;

      if (adminPin !== restState.businessInfo?.adminPin) {
          return showAlert({ title: "Acesso Negado", message: "Senha mestra incorreta.", type: 'ERROR' });
      }

      try {
          await deleteExpense(deleteModal.expenseId);
          setDeleteModal({ isOpen: false, expenseId: null });
          setAdminPin('');
          showAlert({ title: "Excluído", message: "Despesa removida com sucesso.", type: 'SUCCESS' });
      } catch (error) {
          showAlert({ title: "Erro", message: "Erro ao excluir despesa.", type: 'ERROR' });
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
          {label}
      </button>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        
        {/* --- Header Navigation --- */}
        <div className="bg-white border-b border-gray-200 px-6 pt-4 rounded-xl shadow-sm print:hidden">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Central Financeira</h2>
                    <p className="text-sm text-gray-500">Gestão completa de caixa, despesas e contabilidade.</p>
                </div>
            </div>

            <div className="flex overflow-x-auto gap-2">
                <TabButton id="OVERVIEW" label="Visão Geral" icon={LayoutDashboard} />
                <TabButton id="EXPENSES" label="Despesas" icon={List} />
                {restState.planLimits.allowInventory && <TabButton id="PURCHASES" label="Sugestão de Compras" icon={ShoppingCart} />}
                <TabButton id="DRE" label="DRE Gerencial" icon={PieChart} />
                <TabButton id="REPORT" label="Relatório Contábil" icon={FileText} />
                <TabButton id="TIPS" label="Dicas Inteligentes" icon={Lightbulb} />
            </div>
        </div>

        {/* --- Content Area --- */}
        <div className="min-h-[500px]">
            
            {/* VIEW: OVERVIEW */}
            {activeTab === 'OVERVIEW' && (
                <div className="space-y-8 animate-fade-in">
                    <div className="flex justify-end">
                        <Button onClick={() => setIsBleedModalOpen(true)} variant="secondary" className="bg-red-50 text-red-600 border-red-100 hover:bg-red-100"><ArrowDown size={16}/> Saída Manual (Dinheiro)</Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatBox 
                            title="Caixa Atual (Gaveta)" 
                            value={`R$ ${drawerBalance.toFixed(2)}`} 
                            icon={Wallet} 
                            color="text-emerald-600"
                            subtext={finState.activeCashSession ? "Caixa Aberto" : "Caixa Fechado"}
                        />
                        <StatBox 
                            title="Vendas Pix" 
                            value={`R$ ${pixSales.toFixed(2)}`} 
                            icon={Banknote} 
                            color="text-blue-600"
                            subtext="Acumulado"
                        />
                        <StatBox 
                            title="Vendas Cartão" 
                            value={`R$ ${cardSales.toFixed(2)}`} 
                            icon={CreditCard} 
                            color="text-purple-600"
                            subtext="Crédito/Débito"
                        />
                        <StatBox 
                            title="Despesas do Mês" 
                            value={`R$ ${currentMonthExpenses.toFixed(2)}`} 
                            icon={ArrowDown} 
                            color="text-red-600"
                            subtext="Contas a Pagar/Pagas"
                        />
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
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button onClick={() => setExpenseViewMode('MONTH')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${expenseViewMode === 'MONTH' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}><Calendar size={14}/> Mês Atual</button>
                                <button onClick={() => setExpenseViewMode('RECURRING')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${expenseViewMode === 'RECURRING' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}><Repeat size={14}/> Recorrentes</button>
                                <button onClick={() => setExpenseViewMode('HISTORY')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${expenseViewMode === 'HISTORY' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}><History size={14}/> Histórico</button>
                            </div>
                            <Button onClick={() => { setEditingExpense(null); setIsExpenseModalOpen(true); }}><Plus size={16}/> Nova Despesa</Button>
                        </div>
                    </div>

                    {/* Filtro de Data para Histórico */}
                    {expenseViewMode === 'HISTORY' && (
                        <div className="bg-white p-3 rounded-xl shadow-sm border flex items-center gap-3 animate-fade-in">
                            <Filter size={16} className="text-gray-400"/>
                            <span className="text-xs font-bold text-gray-500 uppercase">Filtrar Período:</span>
                            <input type="date" className="border rounded p-1 text-sm bg-gray-50" value={historyStart} onChange={e => setHistoryStart(e.target.value)} />
                            <span className="text-gray-400 font-bold">-</span>
                            <input type="date" className="border rounded p-1 text-sm bg-gray-50" value={historyEnd} onChange={e => setHistoryEnd(e.target.value)} />
                        </div>
                    )}

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
            
            {/* VIEW: PURCHASES */}
            {activeTab === 'PURCHASES' && <AdminPurchaseSuggestions />}

            {activeTab === 'DRE' && <AdminAccounting />}
            {activeTab === 'REPORT' && <AccountingReport />}
            {activeTab === 'TIPS' && <AdminFinancialTips />}
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
    </div>
  );
};
