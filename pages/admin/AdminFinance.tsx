
import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useFinance } from '../../context/FinanceContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Expense } from '../../types';
import { Plus, CheckSquare, Trash2 } from 'lucide-react';

export const AdminFinance: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: finState, addExpense, payExpense, deleteExpense } = useFinance();
  const { showConfirm, showAlert } = useUI();
  const [editingExpense, setEditingExpense] = useState<Partial<Expense> | null>(null);

  const handleSaveExpense = async (e: React.FormEvent) => {
      e.preventDefault();
      if(editingExpense) {
          await addExpense({ ...editingExpense, id: Math.random().toString(), isPaid: editingExpense.isPaid || false } as Expense);
          setEditingExpense(null);
          showAlert({ title: "Sucesso", message: "Despesa registrada!", type: 'SUCCESS' });
      }
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
        showConfirm({ 
            title: 'Excluir', 
            message: 'Remover despesa?', 
            onConfirm: async () => {
                await deleteExpense(id);
            } 
        });
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Financeiro</h2>
                <p className="text-sm text-gray-500">Contas a pagar e despesas.</p>
            </div>
            <Button onClick={() => setEditingExpense({ description: '', amount: 0, category: 'Outros', dueDate: new Date().toISOString().split('T')[0] as any, isPaid: false })}><Plus size={16}/> Nova Despesa</Button>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-50 border-b text-sm">
                    <tr>
                        <th className="p-4">Vencimento</th>
                        <th className="p-4">Descrição</th>
                        <th className="p-4">Categoria</th>
                        <th className="p-4 text-right">Valor</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y text-sm">
                    {finState.expenses.map(expense => (
                        <tr key={expense.id} className={`hover:bg-gray-50 transition-colors ${expense.isPaid ? 'opacity-60 bg-gray-50' : ''}`}>
                            <td className="p-4">{new Date(expense.dueDate).toLocaleDateString()}</td>
                            <td className="p-4 font-medium">{expense.description}</td>
                            <td className="p-4 text-gray-500">{expense.category}</td>
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
                    {finState.expenses.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">Nenhuma despesa registrada.</td></tr>}
                </tbody>
            </table>
        </div>

        <Modal 
            isOpen={!!editingExpense} 
            onClose={() => setEditingExpense(null)}
            title="Registrar Despesa"
            variant="dialog" // Small form
            maxWidth="md"
        >
            <form onSubmit={handleSaveExpense} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-600">Descrição</label>
                    <input required placeholder="Ex: Conta de Luz" className="w-full border p-2.5 rounded-lg text-sm" value={editingExpense?.description || ''} onChange={e => setEditingExpense(prev => ({...prev!, description: e.target.value}))} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold mb-1 text-gray-600">Valor (R$)</label>
                        <input required type="number" step="0.01" className="w-full border p-2.5 rounded-lg text-sm font-bold text-red-600" value={editingExpense?.amount || 0} onChange={e => setEditingExpense(prev => ({...prev!, amount: parseFloat(e.target.value)}))} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 text-gray-600">Vencimento</label>
                        <input type="date" className="w-full border p-2.5 rounded-lg text-sm" value={editingExpense?.dueDate ? new Date(editingExpense.dueDate).toISOString().split('T')[0] : ''} onChange={e => setEditingExpense(prev => ({...prev!, dueDate: e.target.value as any}))} />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-600">Categoria</label>
                    <select className="w-full border p-2.5 rounded-lg text-sm bg-white" value={editingExpense?.category || ''} onChange={e => setEditingExpense(prev => ({...prev!, category: e.target.value}))}>
                        <option>Fornecedor</option>
                        <option>Utilidades (Luz/Água)</option>
                        <option>Aluguel</option>
                        <option>Manutenção</option>
                        <option>Pessoal</option>
                        <option>Outros</option>
                    </select>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border">
                    <input type="checkbox" checked={editingExpense?.isPaid || false} onChange={e => setEditingExpense(prev => ({...prev!, isPaid: e.target.checked}))} id="paid-check" className="rounded text-blue-600"/>
                    <label htmlFor="paid-check" className="text-sm cursor-pointer select-none">Já foi pago?</label>
                </div>

                <div className="flex gap-2 pt-2">
                    <Button type="button" variant="secondary" onClick={() => setEditingExpense(null)} className="flex-1">Cancelar</Button>
                    <Button type="submit" className="flex-1">Salvar</Button>
                </div>
            </form>
        </Modal>
    </div>
  );
};