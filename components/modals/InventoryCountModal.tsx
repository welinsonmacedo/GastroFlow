
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { Info } from 'lucide-react';

interface InventoryCountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InventoryCountModal: React.FC<InventoryCountModalProps> = ({ isOpen, onClose }) => {
  const { state, processInventoryAdjustment } = useInventory();
  const { showAlert } = useUI();
  const [counts, setCounts] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (isOpen) {
      const initialCounts: { [key: string]: string } = {};
      state.inventory.forEach(item => {
        if (item.type !== 'COMPOSITE') {
          initialCounts[item.id] = item.quantity.toString();
        }
      });
      setCounts(initialCounts);
    }
  }, [isOpen, state.inventory]);

  const handleProcess = async () => {
    const adjustments = Object.keys(counts).map(id => ({
      itemId: id,
      realQty: parseFloat(counts[id] || '0')
    }));
    await processInventoryAdjustment(adjustments);
    onClose();
    showAlert({ title: "Sucesso", message: "Balanço finalizado!", type: 'SUCCESS' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Inventário (Contagem Física)" variant="page">
      <div className="space-y-6">
        <div className="bg-amber-50 p-4 rounded-xl border-2 border-dashed border-amber-200 text-amber-800 text-sm flex gap-3">
          <Info size={20} className="shrink-0" />
          <p>Informe a quantidade real contada na prateleira. O sistema ajustará o estoque atual e gerará logs de perda ou sobra automaticamente.</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="p-3">Item</th>
                <th className="p-3 text-right">Estoque Virtual</th>
                <th className="p-3 text-right w-32">Contagem Real</th>
                <th className="p-3 text-right">Diferença</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {state.inventory.filter(i => i.type !== 'COMPOSITE').map(item => {
                const currentQty = item.quantity;
                const inputVal = counts[item.id] ?? '';
                const realQty = inputVal === '' ? currentQty : parseFloat(inputVal);
                const diff = realQty - currentQty;

                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold">{item.name} ({item.unit})</td>
                    <td className="p-3 text-right font-mono text-slate-500">{currentQty}</td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.001"
                        className="w-full border-2 p-1.5 rounded-lg text-right font-bold focus:border-yellow-500 outline-none"
                        value={inputVal}
                        onChange={e => setCounts({ ...counts, [item.id]: e.target.value })}
                        placeholder={currentQty.toString()}
                      />
                    </td>
                    <td className={`p-3 text-right font-black ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-green-600' : 'text-slate-300'}`}>
                      {diff > 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex gap-4 pt-6 border-t">
          <Button variant="secondary" onClick={onClose} className="flex-1 py-4">Cancelar</Button>
          <Button onClick={handleProcess} className="flex-1 py-4 shadow-xl">Finalizar Inventário</Button>
        </div>
      </div>
    </Modal>
  );
};
