
import React from 'react';
import { Modal } from '../Modal';
import { useInventory } from '../../context/InventoryContext';

interface InventoryLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InventoryLogsModal: React.FC<InventoryLogsModalProps> = ({ isOpen, onClose }) => {
  const { state } = useInventory();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Histórico de Movimentações de Estoque" variant="page">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b">
            <tr>
              <th className="p-3">Data/Hora</th>
              <th className="p-3">Item</th>
              <th className="p-3">Operação</th>
              <th className="p-3 text-right">Qtd</th>
              <th className="p-3">Motivo</th>
              <th className="p-3">Usuário</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {state.inventoryLogs.map(log => (
              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 whitespace-nowrap text-slate-400">
                  {log.created_at ? log.created_at.toLocaleString() : '-'}
                </td>
                <td className="p-3 font-bold text-slate-700">{state.inventory.find(i => i.id === log.item_id)?.name || 'Desconhecido'}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase
                                            ${log.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                                        `}>
                    {log.type === 'IN' ? 'ENTRADA' : 'SAÍDA'}
                  </span>
                </td>
                <td className="p-3 text-right font-mono font-bold text-slate-600">{log.quantity}</td>
                <td className="p-3 text-slate-500">{log.reason}</td>
                <td className="p-3 text-slate-400 italic">{log.user_name}</td>
              </tr>
            ))}
            {state.inventoryLogs.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-slate-400">Nenhum log encontrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </Modal>
  );
};
