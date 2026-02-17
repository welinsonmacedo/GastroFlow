
import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { PurchaseItemInput } from '../../types';
import { Plus, Trash2, Calculator } from 'lucide-react';

interface PurchaseEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PurchaseEntryModal: React.FC<PurchaseEntryModalProps> = ({ isOpen, onClose }) => {
  const { state, processPurchase } = useInventory();
  const { showAlert } = useUI();

  const [form, setForm] = useState({
    supplierId: '', 
    invoiceNumber: '',
    series: '',
    accessKey: '', 
    date: new Date().toISOString().split('T')[0],
    items: [] as PurchaseItemInput[], 
    taxes: { icms: 0, ipi: 0, st: 0, freight: 0, others: 0 },
    distributeTax: true
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

  const calculateTotalTaxes = () => {
      const { icms, ipi, st, freight, others } = form.taxes;
      return (Number(icms)||0) + (Number(ipi)||0) + (Number(st)||0) + (Number(freight)||0) + (Number(others)||0);
  };

  const handleSubmit = async () => {
    if (!form.supplierId || form.items.length === 0) return;
    const total = form.items.reduce((acc, i) => acc + i.totalPrice, 0) + calculateTotalTaxes();
    
    try {
      await processPurchase({
        ...form,
        date: new Date(form.date),
        totalAmount: total,
        installments: [{ dueDate: new Date(form.date), amount: total }]
      });
      onClose();
      setForm({ 
          supplierId: '', invoiceNumber: '', series: '', accessKey: '', 
          date: new Date().toISOString().split('T')[0], items: [], 
          taxes: { icms: 0, ipi: 0, st: 0, freight: 0, others: 0 }, distributeTax: true 
      });
      showAlert({ title: "Sucesso", message: "Nota lançada e estoque atualizado!", type: 'SUCCESS' });
    } catch (error) {
      showAlert({ title: "Erro", message: "Erro ao processar nota.", type: 'ERROR' });
    }
  };

  const calculateSubtotal = () => form.items.reduce((acc, i) => acc + i.totalPrice, 0);
  const calculateTotal = () => calculateSubtotal() + calculateTotalTaxes();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Lançamento de Nota Fiscal" variant="page">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase px-1">Fornecedor</label>
            <select className="w-full border-2 p-3 rounded-xl bg-white focus:border-blue-500 outline-none" value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">Selecione...</option>
              {state.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase px-1">Número da Nota</label>
            <input className="w-full border-2 p-3 rounded-xl" placeholder="000.000" value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase px-1">Série</label>
            <input className="w-full border-2 p-3 rounded-xl" placeholder="1" value={form.series} onChange={e => setForm({ ...form, series: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Chave de Acesso</label>
                <input className="w-full border-2 p-3 rounded-xl text-xs font-mono" placeholder="44 dígitos" maxLength={44} value={form.accessKey} onChange={e => setForm({ ...form, accessKey: e.target.value })} />
             </div>
             <div>
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Emissão</label>
                <input type="date" className="w-full border-2 p-3 rounded-xl" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
             </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200">
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

        <div className="overflow-hidden rounded-xl border border-slate-200 max-h-48 overflow-y-auto custom-scrollbar">
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
        </div>

        {/* ÁREA DE IMPOSTOS E TOTAIS */}
        <div className="flex flex-col md:flex-row justify-between items-start border-t pt-6 gap-6">
          
          <div className="w-full md:w-2/3 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Calculator size={14}/> Custos Adicionais & Impostos</h4>
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div><label className="text-[10px] font-bold text-gray-500 uppercase">ICMS-ST</label><input type="number" className="w-full border p-1.5 rounded text-sm font-bold" value={form.taxes.st} onChange={e => setForm({...form, taxes: {...form.taxes, st: parseFloat(e.target.value) || 0}})} /></div>
                <div><label className="text-[10px] font-bold text-gray-500 uppercase">IPI</label><input type="number" className="w-full border p-1.5 rounded text-sm font-bold" value={form.taxes.ipi} onChange={e => setForm({...form, taxes: {...form.taxes, ipi: parseFloat(e.target.value) || 0}})} /></div>
                <div><label className="text-[10px] font-bold text-gray-500 uppercase">ICMS</label><input type="number" className="w-full border p-1.5 rounded text-sm font-bold" value={form.taxes.icms} onChange={e => setForm({...form, taxes: {...form.taxes, icms: parseFloat(e.target.value) || 0}})} /></div>
                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Frete</label><input type="number" className="w-full border p-1.5 rounded text-sm font-bold" value={form.taxes.freight} onChange={e => setForm({...form, taxes: {...form.taxes, freight: parseFloat(e.target.value) || 0}})} /></div>
                <div className="col-span-2"><label className="text-[10px] font-bold text-gray-500 uppercase">Outras Despesas</label><input type="number" className="w-full border p-1.5 rounded text-sm font-bold" value={form.taxes.others} onChange={e => setForm({...form, taxes: {...form.taxes, others: parseFloat(e.target.value) || 0}})} /></div>
            </div>
            
            <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200">
                <input 
                    type="checkbox" 
                    id="distributeTax"
                    checked={form.distributeTax} 
                    onChange={e => setForm({...form, distributeTax: e.target.checked})}
                    className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                />
                <label htmlFor="distributeTax" className="text-xs font-bold text-gray-600 cursor-pointer select-none">
                    Distribuir custo total nos itens do estoque?
                </label>
            </div>
          </div>

          <div className="w-full md:w-80 space-y-4">
             <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <div className="flex justify-between items-center text-sm mb-2 text-blue-800 opacity-80">
                    <span className="font-bold">Subtotal Itens:</span>
                    <span>R$ {calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-2 text-blue-800 opacity-80">
                    <span className="font-bold">Total Impostos:</span>
                    <span>R$ {calculateTotalTaxes().toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xl font-black text-blue-800 pt-3 border-t border-blue-200 mt-2">
                    <span>TOTAL NOTA:</span>
                    <span>R$ {calculateTotal().toFixed(2)}</span>
                </div>
            </div>
            
            <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose} className="flex-1 py-3 text-sm">Cancelar</Button>
                <Button onClick={handleSubmit} className="flex-1 py-3 text-sm shadow-xl">Confirmar</Button>
            </div>
          </div>

        </div>
      </div>
    </Modal>
  );
};
