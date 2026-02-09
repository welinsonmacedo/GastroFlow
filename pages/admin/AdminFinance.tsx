
import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useFinance } from '../../context/FinanceContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Expense } from '../../types';
import { Plus, CheckSquare, Trash2, Wallet, CreditCard, Banknote, ArrowDown, ArrowUp, Calendar, Repeat } from 'lucide-react';

export const AdminFinance: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: finState, addExpense, payExpense, deleteExpense, bleedRegister } = useFinance();
  const { showConfirm, showAlert } = useUI();
  
  // State for Modals
  const [editingExpense, setEditingExpense] = useState<Partial<Expense> | null>(null);
  const [manualOutModal, setManualOutModal] = useState(false);
  const [manualOutForm, setManualOutForm] = useState({ amount: '', reason: '' });

  // --- Calculations ---
  // 1. Receitas (Baseado nas transações carregadas)
  const totalSales = finState.transactions.reduce((acc, t) => acc + t.amount, 0);
  const cashSales = finState.transactions.filter(t => t.method === 'CASH').reduce((acc, t) => acc + t.amount, 0);
  const pixSales = finState.transactions.filter(t => t.method === 'PIX').reduce((acc, t) => acc + t.amount, 0);
  const cardSales = finState.transactions.filter(t => t.method === 'CREDIT' || t.method === 'DEBIT' || t.method === 'CARD').reduce((acc, t) => acc + t.amount, 0);

  // 2. Gaveta (Sessão Atual)
  const activeSessionInitial = finState.activeCashSession?.initialAmount || 0;
  const sessionCashSales = finState.transactions
      .filter(t => t.method === 'CASH' && finState.activeCashSession && new Date(t.timestamp) >= finState.activeCashSession.openedAt)
      .reduce((acc, t) => acc + t.amount, 0);
  const sessionBleeds = finState.cashMovements
      .filter(m => m.type === 'BLEED')
      .reduce((acc, m) => acc + m.amount, 0);
  const sessionSupplies = finState.cashMovements
      .filter(m => m.type === 'SUPPLY')
      .reduce((acc, m) => acc + m.amount, 0);
  
  // Despesas pagas em DINHEIRO (afetam o caixa se não houver um cofre separado, assumindo que sai da gaveta se for hoje)
  const cashExpensesToday = finState.expenses
      .filter(e => e.isPaid && e.paymentMethod === 'CASH' && new Date(e.paidDate!).toDateString() === new Date().toDateString())
      .reduce((acc, e) => acc + e.amount, 0);

  const drawerBalance = activeSessionInitial + sessionCashSales + sessionSupplies - sessionBleeds - cashExpensesToday;

  // 3. Despesas Totais (Mês Atual)
  const currentMonthExpenses = finState.expenses
      .filter(e => new Date(e.dueDate).getMonth() === new Date().getMonth())
      .reduce((acc, e) => acc + e.amount, 0);

  // --- Handlers ---

  const handleSaveExpense = async (e: React.FormEvent) => {
      e.preventDefault();
      if(editingExpense) {
          await addExpense({ 
              ...editingExpense, 
              id: Math.random().toString(), 
              isPaid: editingExpense.isPaid || false,
              paymentMethod: editingExpense.paymentMethod || 'BANK' 
          } as Expense);
          setEditingExpense(null);
          showAlert({ title: "Sucesso", message: "Despesa registrada!", type: 'SUCCESS' });
      }
  };

  const handleManualOut = async (e: React.FormEvent) => {
      e.preventDefault();
      const amount = parseFloat(manualOutForm.amount);
      if (!amount || amount <= 0) return;

      if (!finState.activeCashSession) {
          // Se não tem caixa aberto, registra como despesa paga em dinheiro
          await addExpense({
              description: `Saída Manual: ${manualOutForm.reason}`,
              amount: amount,
              category: 'Outros',
              dueDate: new Date(),
              isPaid: true,
              paymentMethod: 'CASH',
              id: Math.random().toString()
          } as Expense);
      } else {
          // Se tem caixa aberto, faz sangria
          await bleedRegister(amount, manualOutForm.reason, 'Admin');
      }
      
      setManualOutModal(false);
      setManualOutForm({ amount: '', reason: '' });
      showAlert({ title: "Sucesso", message: "Saída registrada.", type: 'SUCCESS' });
  };

  const handlePayExpense = (id: string) => {
      showConfirm({
          title: "Dar Baixa",
          message: "Confirmar pagamento desta conta?",
          onConfirm: async () => {
              await payExpense(id);
              showAlert({ title: "Sucesso", message: "Pagamento registrado.", type: 'SUCCESS' });
          }
      });
  };

  const handleDeleteExpense = (id: string) => {
        showConfirm({ title: 'Excluir', message: 'Remover despesa?', onConfirm: async () => await deleteExpense(id) });
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

  return (
    <div className="space-y-8 animate-fade-in pb-10">
        
        {/* --- Header & Dashboard --- */}
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Gestão Financeira</h2>
                    <p className="text-sm text-gray-500">Fluxo de caixa e controle de contas.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setManualOutModal(true)} variant="secondary" className="bg-red-50 text-red-600 border-red-100 hover:bg-red-100"><ArrowDown size={16}/> Saída Manual (Dinheiro)</Button>
                    <Button onClick={() => setEditingExpense({ description: '', amount: 0, category: 'Fornecedor', dueDate: new Date().toISOString().split('T')[0] as any, isPaid: false, paymentMethod: 'BANK' })}><Plus size={16}/> Nova Despesa</Button>
                </div>
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
        
        {/* --- Expenses Table --- */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-800">Contas e Despesas</h3>
                <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-500">{finState.expenses.length} registros</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b text-sm text-gray-600">
                        <tr>
                            <th className="p-4">Vencimento</th>
                            <th className="p-4">Descrição</th>
                            <th className="p-4">Categoria</th>
                            <th className="p-4">Método</th>
                            <th className="p-4 text-right">Valor</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                        {finState.expenses.map(expense => (
                            <tr key={expense.id} className={`hover:bg-gray-50 transition-colors ${expense.isPaid ? 'opacity-60 bg-gray-50' : ''}`}>
                                <td className="p-4 flex flex-col">
                                    <span>{new Date(expense.dueDate).toLocaleDateString()}</span>
                                    {expense.isRecurring && <span className="text-[10px] text-blue-600 flex items-center gap-1 font-bold"><Repeat size={10}/> Recorrente</span>}
                                </td>
                                <td className="p-4 font-medium">{expense.description}</td>
                                <td className="p-4 text-gray-500">{expense.category}</td>
                                <td className="p-4">
                                    {expense.paymentMethod === 'CASH' ? 
                                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold">Dinheiro</span> : 
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">Banco</span>
                                    }
                                </td>
                                <td className="p-4 text-right font-bold text-red-600">- R$ {expense.amount.toFixed(2)}</td>
                                <td className="p-4 text-center">
                                    {expense.isPaid ? 
                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold border border-green-200">PAGO</span> : 
                                        <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold border border-yellow-200">PENDENTE</span>
                                    }
                                </td>
                                <td className="p-4 text-right">
                                    {!expense.isPaid && (
                                        <button onClick={() => handlePayExpense(expense.id)} className="text-green-600 p-2 rounded hover:bg-green-50 mr-2 transition-colors" title="Marcar como Pago"><CheckSquare size={18}/></button>
                                    )}
                                    <button onClick={() => handleDeleteExpense(expense.id)} className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors"><Trash2 size={18}/></button>
                                </td>
                            </tr>
                        ))}
                        {finState.expenses.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-400">Nenhuma despesa registrada.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>

        {/* --- Expense Modal --- */}
        <Modal 
            isOpen={!!editingExpense} 
            onClose={() => setEditingExpense(null)}
            title="Registrar Despesa"
            variant="dialog"
            maxWidth="md"
        >
            <form onSubmit={handleSaveExpense} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-600">Descrição</label>
                    <input required placeholder="Ex: Conta de Luz" className="w-full border p-2.5 rounded-lg text-sm" value={editingExpense?.description || ''} onChange={e => setEditingExpense(prev => ({...prev!, description: e.target.value}))} autoFocus />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold mb-1 text-gray-600">Valor (R$)</label>
                        <input required type="number" step="0.01" className="w-full border p-2.5 rounded-lg text-sm font-bold text-red-600" value={editingExpense?.amount || ''} onChange={e => setEditingExpense(prev => ({...prev!, amount: parseFloat(e.target.value)}))} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 text-gray-600">Vencimento</label>
                        <input type="date" className="w-full border p-2.5 rounded-lg text-sm" value={editingExpense?.dueDate ? new Date(editingExpense.dueDate).toISOString().split('T')[0] : ''} onChange={e => setEditingExpense(prev => ({...prev!, dueDate: e.target.value as any}))} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold mb-1 text-gray-600">Categoria</label>
                        <select className="w-full border p-2.5 rounded-lg text-sm bg-white" value={editingExpense?.category || 'Outros'} onChange={e => setEditingExpense(prev => ({...prev!, category: e.target.value}))}>
                            <option>Fornecedor</option>
                            <option>Utilidades (Luz/Água)</option>
                            <option>Aluguel</option>
                            <option>Manutenção</option>
                            <option>Pessoal</option>
                            <option>Impostos</option>
                            <option>Outros</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 text-gray-600">Origem do Pagamento</label>
                        <select className="w-full border p-2.5 rounded-lg text-sm bg-white" value={editingExpense?.paymentMethod || 'BANK'} onChange={e => setEditingExpense(prev => ({...prev!, paymentMethod: e.target.value as any}))}>
                            <option value="BANK">Conta Bancária</option>
                            <option value="CASH">Dinheiro (Caixa)</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-col gap-2 mt-2 bg-gray-50 p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={editingExpense?.isPaid || false} onChange={e => setEditingExpense(prev => ({...prev!, isPaid: e.target.checked}))} id="paid-check" className="rounded text-blue-600 w-4 h-4"/>
                        <label htmlFor="paid-check" className="text-sm cursor-pointer select-none font-medium">Já foi pago?</label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={editingExpense?.isRecurring || false} onChange={e => setEditingExpense(prev => ({...prev!, isRecurring: e.target.checked}))} id="recur-check" className="rounded text-blue-600 w-4 h-4"/>
                        <label htmlFor="recur-check" className="text-sm cursor-pointer select-none text-gray-600">Despesa Recorrente (Mensal)</label>
                    </div>
                </div>

                <div className="flex gap-2 pt-2">
                    <Button type="button" variant="secondary" onClick={() => setEditingExpense(null)} className="flex-1">Cancelar</Button>
                    <Button type="submit" className="flex-1">Salvar</Button>
                </div>
            </form>
        </Modal>

        {/* --- Manual Out Modal --- */}
        <Modal 
            isOpen={manualOutModal} 
            onClose={() => setManualOutModal(false)}
            title="Saída Manual de Dinheiro"
            variant="dialog"
            maxWidth="sm"
        >
            <form onSubmit={handleManualOut} className="space-y-4">
                <div className="bg-red-50 border border-red-100 p-3 rounded-lg text-xs text-red-800">
                    Isso registrará uma retirada de dinheiro do caixa atual (Sangria) ou uma despesa paga em dinheiro se o caixa estiver fechado.
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-600">Valor a Retirar (R$)</label>
                    <input required type="number" step="0.01" className="w-full border p-3 rounded-lg text-lg font-bold text-red-600" value={manualOutForm.amount} onChange={e => setManualOutForm({...manualOutForm, amount: e.target.value})} autoFocus />
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-600">Motivo</label>
                    <input required placeholder="Ex: Compra de Gelo, Vale Transporte" className="w-full border p-3 rounded-lg text-sm" value={manualOutForm.reason} onChange={e => setManualOutForm({...manualOutForm, reason: e.target.value})} />
                </div>
                <div className="flex gap-2 pt-2">
                    <Button type="button" variant="secondary" onClick={() => setManualOutModal(false)} className="flex-1">Cancelar</Button>
                    <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700">Confirmar Retirada</Button>
                </div>
            </form>
        </Modal>
    </div>
  );
};
