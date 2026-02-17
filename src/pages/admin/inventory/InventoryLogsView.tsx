
import React from 'react';
import { useInventory } from '../../../context/InventoryContext';
import { ClipboardList } from 'lucide-react';

export const InventoryLogsView: React.FC = () => {
    const { state: invState } = useInventory();

    return (
      <div className="w-full space-y-6 h-full flex flex-col overflow-hidden">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 shrink-0">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><ClipboardList className="text-purple-600"/> Logs de Estoque</h2>
              <p className="text-sm text-gray-500">Histórico de todas as movimentações de entrada e saída.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
              <div className="overflow-y-auto custom-scrollbar flex-1">
                  <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b sticky top-0 z-10"><tr><th className="p-4 bg-slate-50">Data</th><th className="p-4 bg-slate-50">Item</th><th className="p-4 bg-slate-50">Tipo</th><th className="p-4 text-right bg-slate-50">Qtd</th><th className="p-4 bg-slate-50">Motivo</th><th className="p-4 bg-slate-50">Usuário</th></tr></thead>
                      <tbody className="divide-y divide-slate-50">
                          {invState.inventoryLogs.map(log => (
                              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-4 text-slate-500 font-mono whitespace-nowrap">{log.created_at?.toLocaleString()}</td>
                                  <td className="p-4 font-bold text-slate-700">{invState.inventory.find(i => i.id === log.item_id)?.name || 'Desconhecido'}</td>
                                  <td className="p-4"><span className={`px-2 py-1 rounded font-black uppercase text-[10px] ${log.type === 'IN' ? 'bg-green-100 text-green-700' : log.type === 'SALE' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{log.type === 'IN' ? 'Entrada' : log.type === 'SALE' ? 'Venda' : 'Saída'}</span></td>
                                  <td className="p-4 text-right font-mono font-bold">{log.quantity}</td>
                                  <td className="p-4 text-slate-600 max-w-xs truncate" title={log.reason}>{log.reason}</td>
                                  <td className="p-4 text-slate-400 italic font-bold">{log.user_name}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
    );
};
