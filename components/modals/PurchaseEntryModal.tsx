
import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { PurchaseItemInput } from '../../types';
import { Plus, Trash2 } from 'lucide-react';

interface PurchaseEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PurchaseEntryModal: React.FC<PurchaseEntryModalProps> = ({ isOpen, onClose }) => {
  const { state, processPurchase } = useInventory();
  const { showAlert } = useUI();

  const [form, setForm] = useState({
    supplierId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0],
    items: [] as PurchaseItemInput[], taxAmount: 0, distributeTax: true
  });
  const [tempItem, setTempItem] = useState({ itemId: '', quantity: 1, unitPrice: 0 });

  const handleAddItem = () => {
    const item = state.inventory.find(i => i.id === tempItem.itemId);
    if (!item || tempItem.quantity <= 0) return;
    const newItem: PurchaseItemInput = {
      inventoryItemId: item.id,
      quantity: tempItem.quantity,
      unitPrice: tempItem.unitPrice,
      totalPrice: tempItem.quantity * tempItem.unitPrice
    };
    setForm(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setTempItem({ itemId: '', quantity: 1, unitPrice: 0 });
  };

  const handleSubmit = async () => {
    if (!form.supplierId || form.items.length === 0) return;
    const total = form.items.reduce((acc, i) => acc + i.totalPrice, 0) + Number(form.taxAmount);
    
    try {
      await processPurchase({
        ...form,
        date: new Date(form.date),
        totalAmount: total,
        installments: [{ dueDate: new Date(form.date), amount: total }]
      });
      onClose();
      setForm({ supplierId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0], items: [], taxAmount: 0, distributeTax: true });
      showAlert({ title: "Sucesso", message: "Nota lançada e estoque atualizado!", type: 'SUCCESS' });
    } catch (error) {
      showAlert({ title: "Erro", message: "Erro ao processar nota.", type: 'ERROR' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Lançamento de Nota Fiscal" variant="page">
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase px-1">Fornecedor</label>
            <select className="w-full border-2 p-3 rounded-xl bg-white focus:border-blue-500 outline-none" value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">Selecione...</option>
              {state.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase px-1">Número da Nota</label>
            <input className="w-full border-2 p-3 rounded-xl" placeholder="000.000.000" value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase px-1">Data de Emissão</label>
            <input type="date" className="w-full border-2 p-3 rounded-xl" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200">
          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Plus size={16} className="text-blue-600" /> Adicionar Itens</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Insumo</label>
              <select className="w-full border-2 p-2.5 rounded-xl bg-white text-sm" value={tempItem.itemId} onChange={e => setTempItem({ ...tempItem, itemId: e.target.value })}>
                <option value="">Selecione um insumo...</option>
                {state.inventory.filter(i => i.type !== 'COMPOSITE').map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Qtd Comprada</label>
              <input type="number" step="0.001" className="w-full border-2 p-2.5 rounded-xl" value={tempItem.quantity} onChange={e => setTempItem({ ...tempItem, quantity: parseFloat(e.target.value) })} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Preço Un. (R$)</label>
              <input type="number" step="0.01" className="w-full border-2 p-2.5 rounded-xl" value={tempItem.unitPrice} onChange={e => setTempItem({ ...tempItem, unitPrice: parseFloat(e.target.value) })} />
            </div>
          </div>
          <Button onClick={handleAddItem} variant="secondary" className="mt-4"><Plus size={16} /> Adicionar Item</Button>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-white"><tr><th className="p-3">Item</th><th className="p-3 text-right">Qtd</th><th className="p-3 text-right">Preço Un.</th><th className="p-3 text-right">Total</th><th className="p-3 text-center">Ações</th></tr></thead>
          <tbody className="divide-y">{form.items.map((it, idx) => (
            <tr key={idx} className="hover:bg-slate-50">
              <td className="p-3 font-bold">{state.inventory.find(i => i.id === it.inventoryItemId)?.name}</td>
              <td className="p-3 text-right font-mono">{it.quantity}</td>
              <td className="p-3 text-right font-mono">R$ {it.unitPrice.toFixed(2)}</td>
              <td className="p-3 text-right font-black text-blue-600">R$ {it.totalPrice.toFixed(2)}</td>
              <td className="p-3 text-center"><button onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })} className="text-red-400 p-1"><Trash2 size={16} /></button></td>
            </tr>
          ))}</tbody>
        </table>

        <div className="flex flex-col md:flex-row justify-between items-end border-t pt-6 gap-6">
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 w-full md:w-80">
            <div className="flex justify-between items-center text-sm mb-2"><span className="text-blue-600 font-bold">Total Produtos:</span><span className="font-bold">R$ {form.items.reduce((acc, i) => acc + i.totalPrice, 0).toFixed(2)}</span></div>
            <div className="flex justify-between items-center text-xl font-black text-blue-800 pt-2 border-t border-blue-200"><span>TOTAL NOTA:</span><span>R$ {form.items.reduce((acc, i) => acc + i.totalPrice, 0).toFixed(2)}</span></div>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <Button variant="secondary" onClick={onClose} className="flex-1 px-8 py-4">Cancelar</Button>
            <Button onClick={handleSubmit} className="flex-1 px-8 py-4 shadow-xl">Confirmar Lançamento</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
