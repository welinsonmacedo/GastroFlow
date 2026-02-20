
import React, { useState } from 'react';
import { Modal } from '../Modal';
import { useFinance } from '../../context/FinanceContext';
import { useUI } from '../../context/UIContext';

interface CloseRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CloseRegisterModal: React.FC<CloseRegisterModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { closeRegister } = useFinance();
  const { showAlert } = useUI();
  const [amount, setAmount] = useState('');

  const handleClose = async () => {
      try {
          await closeRegister(parseFloat(amount));
          setAmount('');
          onClose();
          if (onSuccess) onSuccess();
      } catch (error) {
          showAlert({ title: "Erro", message: "Erro ao fechar o caixa.", type: 'ERROR' });
      }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Fechar Caixa" variant="dialog" maxWidth="sm" onSave={handleClose}>
        <div className="space-y-4">
            <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800 border border-yellow-200">
                <p className="font-bold">Atenção:</p>
                <p>Conte o dinheiro físico na gaveta e informe abaixo. O sistema calculará a diferença (quebra de caixa).</p>
            </div>
            <div>
                <label className="block text-sm font-bold mb-1">Valor Contado em Dinheiro (R$)</label>
                <input type="number" step="0.01" className="w-full border p-3 rounded text-2xl font-bold text-center" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
            </div>
        </div>
    </Modal>
  );
};
