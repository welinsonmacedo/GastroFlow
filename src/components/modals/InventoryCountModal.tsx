
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useInventory } from '@/core/context/InventoryContext';
import { useUI } from '@/core/context/UIContext';
import { Info, Search, Package, ShoppingBag } from 'lucide-react';

interface InventoryCountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InventoryCountModal: React.FC<InventoryCountModalProps> = ({ isOpen, onClose }) => {
  const { state, processInventoryAdjustment } = useInventory();
  const { showAlert } = useUI();
  
  const [counts, setCounts] = useState<{ [key: string]: string }>({});
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'INGREDIENT' | 'RESALE'>('ALL');

  useEffect(() => {
    if (isOpen) {
      const initialCounts: { [key: string]: string } = {};
      state.inventory.forEach(item => {
        if (item.type !== 'COMPOSITE') {
          initialCounts[item.id] = item.quantity.toString();
        }
      });
      setCounts(initialCounts);
      setSearchTerm('');
      setFilterType('ALL');
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

  // Lógica de Filtragem
  const filteredItems = state.inventory.filter(item => {
      // Ignora sempre os compostos (Pratos) no balanço físico
      if (item.type === 'COMPOSITE') return false;

      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'ALL' || item.type === filterType;

      return matchesSearch && matchesType;
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Inventário (Contagem Física)" variant="page" onSave={handleProcess}>
      <div className="space-y-4 h-full flex flex-col">
        {/* Header e Instruções */}
        <div className="bg-amber-50 p-4 rounded-xl border-2 border-dashed border-amber-200 text-amber-800 text-sm flex gap-3 shrink-0">
          <Info size={20} className="shrink-0" />
          <p>Informe a quantidade real contada na prateleira. O sistema ajustará o estoque atual e gerará logs de perda ou sobra automaticamente.</p>
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-col md:flex-row gap-3 shrink-0">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar item para contar..." 
                    className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    autoFocus
                />
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-xl shrink-0 overflow-x-auto">
                <button 
                    onClick={() => setFilterType('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${filterType === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Todos
                </button>
                <button 
                    onClick={() => setFilterType('INGREDIENT')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${filterType === 'INGREDIENT' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Package size={14}/> Matéria Prima
                </button>
                <button 
                    onClick={() => setFilterType('RESALE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${filterType === 'RESALE' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <ShoppingBag size={14}/> Revenda
                </button>
            </div>
        </div>

        {/* Tabela com Scroll Interno */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-500 shrink-0">
              <span>LISTAGEM DE ITENS</span>
              <span>{filteredItems.length} encontrados</span>
          </div>
          
          <div className="overflow-y-auto flex-1 custom-scrollbar max-h-[50vh]">
            <table className="w-full text-left text-sm relative">
                <thead className="bg-white text-slate-800 sticky top-0 z-10 shadow-sm">
                <tr>
                    <th className="p-3 bg-gray-50">Item</th>
                    <th className="p-3 text-right bg-gray-50">Estoque Virtual</th>
                    <th className="p-3 text-right w-32 bg-gray-50">Contagem Real</th>
                    <th className="p-3 text-right bg-gray-50">Diferença</th>
                </tr>
                </thead>
                <tbody className="divide-y">
                {filteredItems.map(item => {
                    const currentQty = item.quantity;
                    const inputVal = counts[item.id] ?? '';
                    const realQty = inputVal === '' ? currentQty : parseFloat(inputVal);
                    const diff = realQty - currentQty;

                    return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold">
                            <div className="flex flex-col">
                                <span className="text-slate-700">{item.name}</span>
                                <span className="text-[10px] text-slate-400 font-normal uppercase">{item.unit} • {item.type === 'INGREDIENT' ? 'Matéria Prima' : 'Revenda'}</span>
                            </div>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-500 bg-slate-50/50">{currentQty}</td>
                        <td className="p-2">
                        <input
                            type="number"
                            step="0.001"
                            className={`w-full border-2 p-2 rounded-lg text-right font-bold outline-none transition-colors ${inputVal !== '' && diff !== 0 ? 'border-blue-300 bg-blue-50' : 'border-gray-200 focus:border-blue-500'}`}
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
                {filteredItems.length === 0 && (
                    <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400">
                            Nenhum item encontrado para "{searchTerm}" no filtro selecionado.
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
};
