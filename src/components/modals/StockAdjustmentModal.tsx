
import React, { useState } from 'react';
import { Modal } from '../Modal';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  initialType: 'IN' | 'OUT';
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({ isOpen, onClose, itemId, initialType }) => {
  const { updateStock } = useInventory();
  const { showAlert } = useUI();
  
  const [form, setForm] = useState({ quantity: '', reason: '' });

  const handleSubmit = async () => {
    if (!itemId || !form.quantity) return;
    
    try {
        await updateStock(itemId, parseFloat(form.quantity), initialType, form.reason);
        setForm({ quantity: '', reason: '' });
        onClose();
        showAlert({ title: "Sucesso", message: "Movimentação registrada!", type: 'SUCCESS' });
    } catch (error) {
        showAlert({ title: "Erro", message: "Erro ao registrar movimentação.", type: 'ERROR' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialType === 'IN' ? 'Entrada Manual' : 'Saída Manual / Perda'} variant="dialog" maxWidth="sm" onSave={handleSubmit}>
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase px-1">Quantidade</label>
          <input type="number" step="0.001" className="w-full border-2 p-3 rounded-xl font-bold text-center text-2xl focus:border-blue-500 outline-none" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} autoFocus />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase px-1">Motivo / Justificativa</label>
          <input className="w-full border-2 p-3 rounded-xl text-sm focus:border-blue-500 outline-none" placeholder="Ex: Ajuste de quebra, Bonificação..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
};
