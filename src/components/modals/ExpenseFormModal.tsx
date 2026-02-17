
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
  const [recurrenceMonths, setRecurrenceMonths] = useState(2); // Padrão 2 meses se for recorrente
  
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
              setRecurrenceMonths(1); // Edição não gera parcelas novas
          } else {
              setForm({ description: '', amount: 0, category: 'Outros', isPaid: false, paymentMethod: 'BANK', isRecurring: false, supplierId: '' });
              setDateStr(new Date().toISOString().split('T')[0]);
              setRecurrenceMonths(2);
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
          // Data base (corrigida para meio-dia para evitar fuso)
          const baseDate = new Date(dateStr + 'T12:00:00');

          // LÓGICA DE RECORRÊNCIA (GERAÇÃO DE PARCELAS)
          // Apenas para NOVAS despesas que são marcadas como RECORRENTES
          if (!expenseToEdit && form.isRecurring && recurrenceMonths > 1) {
              
              for (let i = 0; i < recurrenceMonths; i++) {
                  // Clona a data base
                  const nextDate = new Date(baseDate);
                  // Adiciona meses (0, 1, 2...)
                  nextDate.setMonth(baseDate.getMonth() + i);

                  const expenseData = {
                      ...form,
                      description: `${form.description} (${i + 1}/${recurrenceMonths})`, // Adiciona (1/12) na descrição
                      amount: amount,
                      dueDate: nextDate,
                      isPaid: i === 0 ? (form.isPaid || false) : false, // Apenas a primeira pode ser marcada como paga no ato
                      paymentMethod: form.paymentMethod || 'BANK',
                      supplierId: form.supplierId || undefined
                  } as Expense;

                  if (!expenseData.id) delete (expenseData as any).id;
                  await addExpense(expenseData);
              }
              
              showAlert({ title: "Sucesso", message: `${recurrenceMonths} parcelas geradas com sucesso!`, type: 'SUCCESS' });

          } else {
              // LÓGICA PADRÃO (Uma única despesa ou Edição)
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
                  await addExpense(expenseData);
                  showAlert({ title: "Sucesso", message: "Despesa registrada!", type: 'SUCCESS' });
              }
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
                <input required placeholder="Ex: Conta de Luz, Aluguel" className="w-full border p-2.5 rounded-lg text-sm" value={form.description} onChange={e => setForm({...form, description: e.target.value})} autoFocus />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-600">Valor (R$)</label>
                    <input required type="number" step="0.01" className="w-full border p-2.5 rounded-lg text-sm font-bold text-red-600" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value)})} />
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-600">Vencimento {form.isRecurring && !expenseToEdit ? '(1ª Parc)' : ''}</label>
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

            <div className="flex flex-col gap-3 mt-2 bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                    <input type="checkbox" checked={form.isPaid} onChange={e => setForm({...form, isPaid: e.target.checked})} id="paid-check" className="rounded text-blue-600 w-4 h-4"/>
                    <label htmlFor="paid-check" className="text-sm cursor-pointer select-none font-medium">Já foi pago?</label>
                </div>
                
                <div className="flex items-start gap-2 pt-2 border-t">
                    <input type="checkbox" checked={form.isRecurring} onChange={e => setForm({...form, isRecurring: e.target.checked})} id="recur-check" className="rounded text-blue-600 w-4 h-4 mt-0.5"/>
                    <div className="flex-1">
                        <label htmlFor="recur-check" className="text-sm cursor-pointer select-none font-bold text-gray-700">Repetir Despesa (Recorrente)</label>
                        
                        {/* Se for recorrente e estiver criando (não editando), mostra o input de quantidade */}
                        {form.isRecurring && !expenseToEdit && (
                            <div className="mt-2 animate-fade-in">
                                <label className="block text-xs text-gray-500 mb-1">Repetir por quantos meses?</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        min="2" 
                                        max="60" 
                                        className="w-20 border p-1.5 rounded text-center font-bold text-sm" 
                                        value={recurrenceMonths} 
                                        onChange={e => setRecurrenceMonths(parseInt(e.target.value))} 
                                    />
                                    <span className="text-xs text-gray-400">parcelas/meses</span>
                                </div>
                                <p className="text-[10px] text-blue-600 mt-1">O sistema irá gerar <strong>{recurrenceMonths}</strong> despesas futuras automaticamente.</p>
                            </div>
                        )}
                        {expenseToEdit && form.isRecurring && (
                             <p className="text-[10px] text-gray-400 mt-1">Edição de item recorrente altera apenas esta parcela.</p>
                        )}
                    </div>
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
