
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useFinance } from '../../context/FinanceContext';
import { useUI } from '../../context/UIContext';
import { Expense } from '../../types';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseToEdit?: Partial<Expense> | null;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({ isOpen, onClose, expenseToEdit }) => {
  const { addExpense, updateExpense } = useFinance();
  const { showAlert } = useUI();

  // Use string for date input handling to avoid timezone issues during selection
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  
  const [form, setForm] = useState<Partial<Expense>>({
      description: '', amount: 0, category: 'Outros', isPaid: false, paymentMethod: 'BANK', isRecurring: false, supplierId: ''
  });

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
          } else {
              setForm({ description: '', amount: 0, category: 'Outros', isPaid: false, paymentMethod: 'BANK', isRecurring: false, supplierId: '' });
              setDateStr(new Date().toISOString().split('T')[0]);
          }
      }
  }, [isOpen, expenseToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const amount = parseFloat(form.amount?.toString() || '0');
      if (amount <= 0) {
          return showAlert({ title: "Valor Inválido", message: "Informe um valor maior que zero.", type: 'WARNING' });
      }

      if (!dateStr) {
          return showAlert({ title: "Data Inválida", message: "Informe a data de vencimento.", type: 'WARNING' });
      }

      try {
          // Create date object at noon to ensure it stays on the correct day regardless of UTC shifts
          const fixedDate = new Date(dateStr + 'T12:00:00');

          const expenseData = {
              ...form,
              amount: amount,
              dueDate: fixedDate,
              isPaid: form.isPaid || false,
              paymentMethod: form.paymentMethod || 'BANK',
              supplierId: form.supplierId || undefined
          } as Expense;

          if (expenseToEdit && expenseToEdit.id) {
              // Edit Mode
              await updateExpense(expenseData);
              showAlert({ title: "Sucesso", message: "Despesa atualizada!", type: 'SUCCESS' });
          } else {
              // Create Mode
              // Don't send empty string ID for new items
              if (!expenseData.id) delete (expenseData as any).id;
              await addExpense(expenseData);
              showAlert({ title: "Sucesso", message: "Despesa registrada!", type: 'SUCCESS' });
          }
          
          onClose();
      } catch (error: any) {
          console.error(error);
          const msg = error?.message || error?.error_description || JSON.stringify(error) || "Erro desconhecido";
          showAlert({ title: "Erro ao Salvar", message: `Detalhe: ${msg}`, type: 'ERROR' });
      }
  };

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        title={expenseToEdit ? "Editar Despesa" : "Registrar Despesa"}
        variant="dialog"
        maxWidth="md"
    >
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-xs font-bold mb-1 text-gray-600">Descrição</label>
                <input required placeholder="Ex: Conta de Luz" className="w-full border p-2.5 rounded-lg text-sm" value={form.description} onChange={e => setForm({...form, description: e.target.value})} autoFocus />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-600">Valor (R$)</label>
                    <input required type="number" step="0.01" className="w-full border p-2.5 rounded-lg text-sm font-bold text-red-600" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value)})} />
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-600">Vencimento</label>
                    <input required type="date" className="w-full border p-2.5 rounded-lg text-sm" value={dateStr} onChange={e => setDateStr(e.target.value)} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-600">Categoria</label>
                    <select className="w-full border p-2.5 rounded-lg text-sm bg-white" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
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
                    <select className="w-full border p-2.5 rounded-lg text-sm bg-white" value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value as any})}>
                        <option value="BANK">Conta Bancária</option>
                        <option value="CASH">Dinheiro (Caixa)</option>
                    </select>
                </div>
            </div>

            <div className="flex flex-col gap-2 mt-2 bg-gray-50 p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                    <input type="checkbox" checked={form.isPaid} onChange={e => setForm({...form, isPaid: e.target.checked})} id="paid-check" className="rounded text-blue-600 w-4 h-4"/>
                    <label htmlFor="paid-check" className="text-sm cursor-pointer select-none font-medium">Já foi pago?</label>
                </div>
                <div className="flex items-center gap-2">
                    <input type="checkbox" checked={form.isRecurring} onChange={e => setForm({...form, isRecurring: e.target.checked})} id="recur-check" className="rounded text-blue-600 w-4 h-4"/>
                    <label htmlFor="recur-check" className="text-sm cursor-pointer select-none text-gray-600">Despesa Recorrente (Mensal)</label>
                </div>
            </div>

            <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
                <Button type="submit" className="flex-1">Salvar</Button>
            </div>
        </form>
    </Modal>
  );
};
