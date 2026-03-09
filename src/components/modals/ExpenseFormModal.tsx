
import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../Modal';
import { useFinance } from '@/core/context/FinanceContext';
import { useRestaurant } from '@/core/context/RestaurantContext'; // Para categorias dinâmicas
import { useUI } from '@/core/context/UIContext';
import { Expense } from '@/types';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseToEdit?: Partial<Expense> | null;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({ isOpen, onClose, expenseToEdit }) => {
  const { addExpense, updateExpense } = useFinance();
  const { state: restState } = useRestaurant();
  const { showAlert } = useUI();

  // Use string for date input handling to avoid timezone issues during selection
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [recurrenceMonths, setRecurrenceMonths] = useState(2); 
  
  const [form, setForm] = useState<Partial<Expense>>({
      description: '', amount: 0, category: 'Outros', isPaid: false, paymentMethod: 'BANK', isRecurring: false, supplierId: ''
  });

  // MEMOIZATION FIX: Previne que 'categories' seja recriado a cada render, evitando loop no useEffect
  const categories = useMemo(() => {
      return restState.businessInfo?.expenseCategories && restState.businessInfo.expenseCategories.length > 0
        ? restState.businessInfo.expenseCategories.map(c => c.name)
        : ['Fornecedor', 'Pessoal', 'Aluguel', 'Impostos', 'Manutenção', 'Outros'];
  }, [restState.businessInfo]);

  useEffect(() => {
      if(isOpen) {
          if (expenseToEdit) {
              setForm(expenseToEdit);
              if (expenseToEdit.dueDate) {
                  const d = new Date(expenseToEdit.dueDate);
                  if(!isNaN(d.getTime())) {
                      setDateStr(d.toISOString().split('T')[0]);
                  }
              }
              setRecurrenceMonths(1);
          } else {
              // Inicializa com a primeira categoria disponível
              setForm({ 
                  description: '', 
                  amount: 0, 
                  category: categories[0], 
                  isPaid: false, 
                  paymentMethod: 'BANK', 
                  isRecurring: false, 
                  supplierId: '' 
              });
              setDateStr(new Date().toISOString().split('T')[0]);
              setRecurrenceMonths(2);
          }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, expenseToEdit]); // Removido 'categories' das dependências para evitar reset durante digitação se o contexto atualizar

  const handleSubmit = async () => {
      const amount = parseFloat(form.amount?.toString() || '0');
      if (amount <= 0) {
          return showAlert({ title: "Valor Inválido", message: "Informe um valor maior que zero.", type: 'WARNING' });
      }

      if (!form.description) {
           return showAlert({ title: "Descrição Obrigatória", message: "Informe a descrição.", type: 'WARNING' });
      }

      if (!dateStr) {
          return showAlert({ title: "Data Inválida", message: "Informe a data de vencimento.", type: 'WARNING' });
      }

      try {
          const baseDate = new Date(dateStr + 'T12:00:00');

          const expenseData = {
              ...form,
              amount: amount,
              dueDate: baseDate,
              isPaid: form.isPaid || false,
              paymentMethod: form.paymentMethod || 'BANK',
              supplierId: form.supplierId || undefined
          } as Expense;

          if (expenseToEdit && expenseToEdit.id) {
              await updateExpense(expenseData);
              showAlert({ title: "Sucesso", message: "Despesa atualizada!", type: 'SUCCESS' });
          } else {
              if (!expenseData.id) delete (expenseData as any).id;
              
              // If recurring, pass recurrenceMonths to addExpense
              const recMonths = form.isRecurring ? recurrenceMonths : 1;
              await addExpense(expenseData, recMonths);
              
              if (recMonths > 1) {
                  showAlert({ title: "Sucesso", message: `${recMonths} parcelas geradas com sucesso!`, type: 'SUCCESS' });
              } else {
                  showAlert({ title: "Sucesso", message: "Despesa registrada!", type: 'SUCCESS' });
              }
          }
          
          onClose();
      } catch (error: any) {
          console.error(error);
          showAlert({ title: "Erro ao Salvar", message: `Erro: ${error.message}`, type: 'ERROR' });
      }
  };

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        title={expenseToEdit ? "Editar Despesa" : "Registrar Despesa"}
        variant="dialog"
        maxWidth="md"
        onSave={handleSubmit}
    >
        <div className="space-y-4">
            <div>
                <label className="block text-xs font-bold mb-1 text-gray-600">Descrição</label>
                <input required placeholder="Ex: Conta de Luz" className="w-full border p-2.5 rounded-lg text-sm focus:border-blue-500 outline-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} autoFocus />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-600">Valor (R$)</label>
                    <input required type="number" step="0.01" className="w-full border p-2.5 rounded-lg text-sm font-bold text-red-600 focus:border-blue-500 outline-none" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value)})} />
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-600">Vencimento</label>
                    <input required type="date" className="w-full border p-2.5 rounded-lg text-sm focus:border-blue-500 outline-none" value={dateStr} onChange={e => setDateStr(e.target.value)} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-600">Categoria</label>
                    <select className="w-full border p-2.5 rounded-lg text-sm bg-white focus:border-blue-500 outline-none" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                        {categories.map((cat, idx) => (
                            <option key={idx} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-600">Origem</label>
                    <select className="w-full border p-2.5 rounded-lg text-sm bg-white focus:border-blue-500 outline-none" value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value as any})}>
                        <option value="BANK">Conta Bancária</option>
                        <option value="CASH">Dinheiro (Caixa)</option>
                    </select>
                </div>
            </div>

            <div className="flex flex-col gap-3 mt-2 bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                    <input type="checkbox" checked={form.isPaid} onChange={e => setForm({...form, isPaid: e.target.checked})} id="paid-check" className="rounded text-blue-600 w-4 h-4"/>
                    <label htmlFor="paid-check" className="text-sm cursor-pointer select-none font-medium">Já foi pago?</label>
                </div>
                <div className="flex items-start gap-2 pt-2 border-t">
                    <input type="checkbox" checked={form.isRecurring} onChange={e => setForm({...form, isRecurring: e.target.checked})} id="recur-check" className="rounded text-blue-600 w-4 h-4 mt-0.5"/>
                    <div className="flex-1">
                        <label htmlFor="recur-check" className="text-sm cursor-pointer select-none font-bold text-gray-700">Repetir Despesa (Recorrente)</label>
                        {form.isRecurring && !expenseToEdit && (
                            <div className="mt-2 animate-fade-in">
                                <label className="block text-xs text-gray-500 mb-1">Repetir por quantos meses?</label>
                                <div className="flex items-center gap-2">
                                    <input type="number" min="2" max="60" className="w-20 border p-1.5 rounded text-center font-bold text-sm focus:border-blue-500 outline-none" value={recurrenceMonths} onChange={e => setRecurrenceMonths(parseInt(e.target.value))} />
                                    <span className="text-xs text-gray-400">parcelas</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </Modal>
  );
};
