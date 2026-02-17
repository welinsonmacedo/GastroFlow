
import React, { useState } from 'react';
import { useInventory } from '../../../context/InventoryContext';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/Button';
import { Search } from 'lucide-react';

export const InventoryCountView: React.FC = () => {
  const { state: invState, processInventoryAdjustment } = useInventory();
  const { showAlert } = useUI();
  
  const [countSearch, setCountSearch] = useState('');
  const [counts, setCounts] = useState<{ [key: string]: string }>({});

  const handleSubmitCount = async () => {
    const adjustments = Object.keys(counts).map(id => ({ itemId: id, realQty: parseFloat(counts[id] || '0') }));
    if (adjustments.length === 0) return;
    await processInventoryAdjustment(adjustments);
    setCounts({});
    showAlert({ title: "Balanço Finalizado", message: "Estoque ajustado com sucesso.", type: 'SUCCESS' });
  };

  return (
      <div className="w-full h-full bg-white p-8 rounded-2xl shadow-sm border border-gray-200 animate-fade-in flex flex-col overflow-hidden">
          <header className="mb-4 flex justify-between items-center shrink-0">
              <div><h2 className="text-xl font-bold text-gray-800">Balanço de Estoque</h2><p className="text-sm text-gray-500">Contagem física para ajuste de perdas/sobras.</p></div>
              <div className="relative w-72"><Search className="absolute left-3 top-3 text-gray-400" size={18}/><input className="w-full border-2 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:border-blue-500 outline-none" placeholder="Filtrar lista..." value={countSearch} onChange={e => setCountSearch(e.target.value)}/></div>
          </header>

          <div className="flex-1 overflow-hidden border rounded-2xl relative flex flex-col">
              <div className="overflow-y-auto custom-scrollbar flex-1">
                  <table className="w-full text-left text-sm relative">
                      <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-xs sticky top-0 z-10 shadow-sm"><tr><th className="p-4 bg-gray-100">Item</th><th className="p-4 text-right bg-gray-100">Estoque Sistema</th><th className="p-4 text-right w-40 bg-gray-100">Contagem Real</th><th className="p-4 text-right bg-gray-100">Diferença</th></tr></thead>
                      <tbody className="divide-y divide-gray-50">
                          {invState.inventory.filter(i => i.type !== 'COMPOSITE' && i.name.toLowerCase().includes(countSearch.toLowerCase())).map(item => {
                              const sysQty = item.quantity;
                              const inputVal = counts[item.id] ?? '';
                              const realQty = inputVal === '' ? sysQty : parseFloat(inputVal);
                              const diff = realQty - sysQty;
                              return (
                                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                                      <td className="p-4 font-bold text-slate-700">{item.name} <span className="text-xs font-normal text-gray-400">({item.unit})</span></td>
                                      <td className="p-4 text-right font-mono text-slate-500 bg-gray-50/50">{sysQty}</td>
                                      <td className="p-2"><input type="number" className={`w-full border-2 p-2 rounded-lg text-right font-bold outline-none focus:border-blue-500 transition-colors ${diff !== 0 ? 'bg-yellow-50 border-yellow-300' : 'border-gray-200'}`} placeholder={sysQty.toString()} value={inputVal} onChange={e => setCounts({...counts, [item.id]: e.target.value})} /></td>
                                      <td className={`p-4 text-right font-black ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-green-600' : 'text-gray-300'}`}>{diff > 0 ? `+${diff}` : diff}</td>
                                  </tr>
                              )
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
          
          <div className="pt-6 mt-auto shrink-0 border-t border-gray-100">
              <Button onClick={handleSubmitCount} className="w-full py-4 text-lg font-bold shadow-lg">Processar Ajustes de Estoque</Button>
          </div>
      </div>
  );
};
