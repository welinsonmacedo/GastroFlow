
import React, { useState } from 'react';
import { useInventory } from '../../../context/InventoryContext';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/Button';
import { PurchaseItemInput } from '../../../types';
import { FileText, Plus, Trash2, ShoppingCart, Save } from 'lucide-react';

export const InventoryEntryView: React.FC = () => {
  const { state: invState, processPurchase } = useInventory();
  const { showAlert } = useUI();
  
  const [entryForm, setEntryForm] = useState({
    supplierId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0],
    items: [] as PurchaseItemInput[], taxAmount: 0, distributeTax: true
  });
  const [entryTempItem, setEntryTempItem] = useState({ itemId: '', quantity: 1, unitPrice: 0 });

  const handleAddEntryItem = () => {
    const item = invState.inventory.find(i => i.id === entryTempItem.itemId);
    if (!item || entryTempItem.quantity <= 0) return;
    const newItem: PurchaseItemInput = {
      inventoryItemId: item.id, quantity: entryTempItem.quantity, unitPrice: entryTempItem.unitPrice, totalPrice: entryTempItem.quantity * entryTempItem.unitPrice
    };
    setEntryForm(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setEntryTempItem({ itemId: '', quantity: 1, unitPrice: 0 });
  };

  const handleSubmitEntry = async () => {
    if (!entryForm.supplierId || entryForm.items.length === 0) return showAlert({title: "Dados Incompletos", message: "Selecione fornecedor e adicione itens.", type: "WARNING"});
    const total = entryForm.items.reduce((acc, i) => acc + i.totalPrice, 0) + Number(entryForm.taxAmount);
    try {
      await processPurchase({ ...entryForm, date: new Date(entryForm.date), totalAmount: total, installments: [{ dueDate: new Date(entryForm.date), amount: total }] });
      setEntryForm({ supplierId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0], items: [], taxAmount: 0, distributeTax: true });
      showAlert({ title: "Nota Lançada", message: "Estoque atualizado!", type: 'SUCCESS' });
    } catch (error) { showAlert({ title: "Erro", message: "Erro ao processar nota.", type: 'ERROR' }); }
  };

  return (
      <div className="w-full h-full bg-white p-6 rounded-2xl shadow-sm border border-gray-200 animate-fade-in flex flex-col overflow-hidden">
          <header className="mb-6 flex justify-between items-center border-b pb-4 shrink-0">
              <div><h2 className="text-xl font-bold text-gray-800">Entrada de Nota Fiscal</h2><p className="text-sm text-gray-500">Atualiza estoque e gera contas a pagar.</p></div>
              <div className="text-right"><p className="text-xs font-bold text-gray-400">TOTAL DA NOTA</p><p className="text-2xl font-black text-blue-600">R$ {(entryForm.items.reduce((acc, i) => acc + i.totalPrice, 0) + Number(entryForm.taxAmount)).toFixed(2)}</p></div>
          </header>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
              {/* Coluna 1: Dados da Nota */}
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 overflow-y-auto custom-scrollbar">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FileText size={18}/> Dados da Nota</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold mb-1 text-slate-600">Fornecedor</label>
                          <select className="w-full border p-3 rounded-xl bg-white focus:border-blue-500 outline-none" value={entryForm.supplierId} onChange={e => setEntryForm({...entryForm, supplierId: e.target.value})}>
                              <option value="">Selecione...</option>
                              {invState.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold mb-1 text-slate-600">Número Nota</label>
                          <input className="w-full border p-3 rounded-xl focus:border-blue-500 outline-none" value={entryForm.invoiceNumber} onChange={e => setEntryForm({...entryForm, invoiceNumber: e.target.value})} placeholder="000.000.000"/>
                      </div>
                      <div>
                          <label className="block text-xs font-bold mb-1 text-slate-600">Data Emissão</label>
                          <input type="date" className="w-full border p-3 rounded-xl focus:border-blue-500 outline-none" value={entryForm.date} onChange={e => setEntryForm({...entryForm, date: e.target.value})} />
                      </div>
                      <div className="pt-4 border-t border-gray-200">
                          <label className="block text-xs font-bold mb-1 text-slate-600">Custos Extras (Frete/Imposto)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-400 font-bold">R$</span>
                            <input type="number" className="w-full border pl-8 p-3 rounded-xl focus:border-blue-500 outline-none bg-white" value={entryForm.taxAmount} onChange={e => setEntryForm({...entryForm, taxAmount: parseFloat(e.target.value)})} />
                          </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-xl border border-gray-200">
                          <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={entryForm.distributeTax} onChange={e => setEntryForm({...entryForm, distributeTax: e.target.checked})} />
                          <span className="text-xs font-bold text-gray-600">Distribuir custo nos itens?</span>
                      </label>
                  </div>
              </div>

              {/* Coluna 2: Lançamento de Produto */}
              <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 overflow-y-auto custom-scrollbar">
                   <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2"><Plus size={18}/> Adicionar Produto</h3>
                   <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold mb-1 text-blue-700">Insumo / Produto</label>
                            <select className="w-full border-2 border-blue-200 p-3 rounded-xl text-sm bg-white focus:border-blue-500 outline-none" value={entryTempItem.itemId} onChange={e => setEntryTempItem({...entryTempItem, itemId: e.target.value})}>
                                <option value="">Selecione...</option>
                                {invState.inventory.filter(i => i.type !== 'COMPOSITE').map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold mb-1 text-blue-700">Qtd</label>
                                <input type="number" className="w-full border-2 border-blue-200 p-3 rounded-xl focus:border-blue-500 outline-none" value={entryTempItem.quantity} onChange={e => setEntryTempItem({...entryTempItem, quantity: parseFloat(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-blue-700">Preço Un.</label>
                                <input type="number" className="w-full border-2 border-blue-200 p-3 rounded-xl focus:border-blue-500 outline-none" value={entryTempItem.unitPrice} onChange={e => setEntryTempItem({...entryTempItem, unitPrice: parseFloat(e.target.value)})} />
                            </div>
                        </div>
                        <div className="pt-4">
                            <Button onClick={handleAddEntryItem} className="w-full shadow-lg font-bold py-3"><Plus size={18}/> Adicionar Item</Button>
                        </div>
                   </div>
              </div>

              {/* Coluna 3: Lista de Produtos */}
              <div className="flex flex-col h-full border rounded-2xl overflow-hidden shadow-sm bg-white">
                   <div className="bg-slate-50 p-4 font-bold border-b text-sm text-slate-700 flex justify-between items-center shrink-0">
                       <span>Itens na Nota ({entryForm.items.length})</span>
                       <span className="text-xs text-slate-400">Total Itens: R$ {entryForm.items.reduce((acc, i) => acc + i.totalPrice, 0).toFixed(2)}</span>
                   </div>
                   <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                      {entryForm.items.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-gray-300">
                              <ShoppingCart size={48} className="mb-2 opacity-20"/>
                              <p className="text-sm font-bold">Nenhum item adicionado</p>
                          </div>
                      ) : (
                          <table className="w-full text-left text-sm">
                              <tbody className="divide-y divide-gray-100">
                                  {entryForm.items.map((it, idx) => (
                                      <tr key={idx} className="hover:bg-gray-50">
                                          <td className="p-3">
                                              <div className="font-bold text-slate-700">{invState.inventory.find(i => i.id === it.inventoryItemId)?.name}</div>
                                              <div className="text-xs text-gray-400">{it.quantity} x R$ {it.unitPrice.toFixed(2)}</div>
                                          </td>
                                          <td className="p-3 text-right font-black text-slate-800">R$ {it.totalPrice.toFixed(2)}</td>
                                          <td className="p-3 text-right w-10"><button onClick={() => setEntryForm({...entryForm, items: entryForm.items.filter((_, i) => i !== idx)})} className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors"><Trash2 size={16}/></button></td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      )}
                   </div>
                   <div className="p-4 bg-gray-50 border-t shrink-0">
                       <Button onClick={handleSubmitEntry} className="w-full py-4 text-lg font-bold shadow-lg bg-green-600 hover:bg-green-700">
                           <Save size={20}/> Finalizar Entrada
                       </Button>
                   </div>
              </div>

          </div>
      </div>
  );
};
