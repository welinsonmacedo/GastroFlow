
import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useFinance } from '../../context/FinanceContext';
import { useUI } from '../../context/UIContext';
import { Expense } from '../../types';

interface CashBleedModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string; // Para identificar se é Admin ou Staff
}

export const CashBleedModal: React.FC<CashBleedModalProps> = ({ isOpen, onClose, userRole = 'Staff' }) => {
  const { state: finState, bleedRegister, addExpense } = useFinance();
  const { showAlert } = useUI();
  
  const [form, setForm] = useState({ amount: '', reason: '' });

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const amount = parseFloat(form.amount);
      if (!amount || amount <= 0) return;

      try {
          if (!finState.activeCashSession) {
              // Se caixa fechado e for admin, permite lançar como despesa paga em dinheiro
              if (userRole === 'Admin') {
                  await addExpense({
                      description: `Saída Manual: ${form.reason}`,
                      amount: amount,
                      category: 'Outros',
                      dueDate: new Date(),
                      isPaid: true,
                      paymentMethod: 'CASH',
                      id: Math.random().toString()
                  } as Expense);
                  showAlert({ title: "Sucesso", message: "Despesa registrada (Caixa Fechado).", type: 'SUCCESS' });
              } else {
                  showAlert({ title: "Erro", message: "Caixa fechado. Não é possível realizar sangria.", type: 'ERROR' });
                  return;
              }
          } else {
              // Sangria normal
              await bleedRegister(amount, form.reason, userRole);
              showAlert({ title: "Sucesso", message: "Sangria realizada.", type: 'SUCCESS' });
          }
          
          setForm({ amount: '', reason: '' });
          onClose();
      } catch (error) {
          showAlert({ title: "Erro", message: "Erro ao registrar retirada.", type: 'ERROR' });
      }
  };

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        title="Saída Manual de Dinheiro / Sangria"
        variant="dialog"
        maxWidth="sm"
    >
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-red-50 border border-red-100 p-3 rounded-lg text-xs text-red-800">
                Isso registrará uma retirada de dinheiro da gaveta do caixa atual.
            </div>
            <div>
                <label className="block text-xs font-bold mb-1 text-gray-600">Valor a Retirar (R$)</label>
                <input required type="number" step="0.01" className="w-full border p-3 rounded-lg text-lg font-bold text-red-600" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} autoFocus />
            </div>
            <div>
                <label className="block text-xs font-bold mb-1 text-gray-600">Motivo</label>
                <input required placeholder="Ex: Compra de Gelo, Vale Transporte" className="w-full border p-3 rounded-lg text-sm" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
            </div>
            <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
                <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700">Confirmar Retirada</Button>
            </div>
        </form>
    </Modal>
  );
};
