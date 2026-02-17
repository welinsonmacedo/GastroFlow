
import React, { useState } from 'react';
import { useInventory } from '../../../context/InventoryContext';
import { useUI } from '../../../context/UIContext';
import { InventoryItem } from '../../../types';
import { Archive, AlertTriangle, Plus, ArrowDown, Edit, Search, Trash2, Package, ShoppingBag, Layers, ScanLine } from 'lucide-react';
import { InventoryItemModal } from '../../../components/modals/InventoryItemModal';
import { StockAdjustmentModal } from '../../../components/modals/StockAdjustmentModal';

export const InventoryItemsView: React.FC = () => {
    const { state: invState, deleteInventoryItem } = useInventory();
    const { showConfirm, showAlert } = useUI();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'INGREDIENT' | 'RESALE' | 'COMPOSITE'>('ALL');
    const [onlyLowStock, setOnlyLowStock] = useState(false);
    
    // Estados locais para modais
    const [activeModal, setActiveModal] = useState<'NONE' | 'ITEM_EDIT' | 'STOCK_ADJ'>('NONE');
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [stockAdjParams, setStockAdjParams] = useState<{ itemId: string, type: 'IN' | 'OUT' } | null>(null);

    const handleEditItem = (item: InventoryItem) => {
        setSelectedItem(item);
        setActiveModal('ITEM_EDIT');
    };

    const handleStockAdj = (itemId: string, type: 'IN' | 'OUT') => {
        setStockAdjParams({ itemId, type });
        setActiveModal('STOCK_ADJ');
    };

    const handleDeleteItem = (itemId: string) => {
        showConfirm({
            title: "Excluir Item",
            message: "Tem certeza? Isso removerá o item do estoque permanentemente.",
            type: 'WARNING',
            onConfirm: async () => {
                try {
                    await deleteInventoryItem(itemId);
                    showAlert({ title: "Sucesso", message: "Item excluído.", type: 'SUCCESS' });
                } catch (error: any) {
                    showAlert({ title: "Erro", message: error.message || "Erro ao excluir.", type: 'ERROR' });
                }
            }
        });
    };

    const filteredInventory = invState.inventory.filter(item => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = item.name.toLowerCase().includes(term) || item.unit.toLowerCase().includes(term) || (item.barcode && item.barcode.includes(term));
        const matchesType = filterType === 'ALL' || item.type === filterType;
        const matchesLowStock = onlyLowStock ? (item.quantity <= item.minQuantity && item.type !== 'COMPOSITE') : true;
        return matchesSearch && matchesType && matchesLowStock;
    });

    return (
        <div className="space-y-6 animate-fade-in w-full h-full flex flex-col">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 justify-between items-center shrink-0">
                <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto max-w-full">
                    <button onClick={() => setFilterType('ALL')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${filterType === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Todos</button>
                    <button onClick={() => setFilterType('INGREDIENT')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${filterType === 'INGREDIENT' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Package size={14}/> Matéria Prima</button>
                    <button onClick={() => setFilterType('RESALE')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${filterType === 'RESALE' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><ShoppingBag size={14}/> Revenda</button>
                    <button onClick={() => setFilterType('COMPOSITE')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${filterType === 'COMPOSITE' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Layers size={14}/> Produzido</button>
                </div>

                <div className="flex gap-4 w-full lg:w-auto items-center">
                    <button onClick={() => setOnlyLowStock(!onlyLowStock)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${onlyLowStock ? 'bg-red-50 text-red-600 border-red-200 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                        <AlertTriangle size={14} className={onlyLowStock ? "fill-red-600" : ""} /> {onlyLowStock ? 'Vendo Críticos' : 'Alertas'}
                    </button>
                    <div className="relative flex-1 lg:w-64">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input type="text" placeholder="Buscar item ou código..." className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50 focus:bg-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1">
                <div className="overflow-x-auto h-full custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b sticky top-0 z-10">
                            <tr>
                                <th className="p-4">Item / Insumo</th>
                                <th className="p-4">Código (EAN)</th>
                                <th className="p-4">Tipo</th>
                                <th className="p-4 text-center">Unidade</th>
                                <th className="p-4 text-right">Estoque</th>
                                <th className="p-4 text-right">Custo Médio</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredInventory.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                                                {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <Archive className="text-slate-400" size={20}/>}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                                    {item.name}
                                                    {item.isExtra && <span className="bg-amber-100 text-amber-700 text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase">Adicional</span>}
                                                </div>
                                                {item.quantity <= item.minQuantity && item.type !== 'COMPOSITE' && <span className="text-[9px] text-red-500 font-bold flex items-center gap-1 uppercase"><AlertTriangle size={10}/> Abaixo do Mínimo ({item.minQuantity})</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs font-mono text-gray-500">{item.barcode ? <span className="flex items-center gap-1"><ScanLine size={12}/>{item.barcode}</span> : '-'}</td>
                                    <td className="p-4">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${item.type === 'INGREDIENT' ? 'bg-orange-50 text-orange-600' : item.type === 'RESALE' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                            {item.type === 'INGREDIENT' ? 'MATÉRIA PRIMA' : item.type === 'RESALE' ? 'REVENDA' : 'PRODUZIDO'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center text-sm font-medium text-slate-400">{item.unit}</td>
                                    <td className={`p-4 text-right font-mono font-bold text-lg ${item.type === 'COMPOSITE' ? 'text-slate-300' : (item.quantity <= item.minQuantity ? 'text-red-600' : 'text-slate-700')}`}>
                                        {item.type === 'COMPOSITE' ? '---' : (item.quantity || 0).toFixed(item.unit === 'UN' ? 0 : 2)}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="text-sm font-black text-emerald-600">R$ {(item.costPrice || 0).toFixed(2)}</div>
                                        <div className="text-[9px] text-slate-400 uppercase font-bold">Custo Unit.</div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEditItem(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={18}/></button>
                                            {item.type !== 'COMPOSITE' && (
                                                <>
                                                    <button onClick={() => handleStockAdj(item.id, 'IN')} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><Plus size={18}/></button>
                                                    <button onClick={() => handleStockAdj(item.id, 'OUT')} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><ArrowDown size={18}/></button>
                                                </>
                                            )}
                                            <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Modais Aninhados */}
            <InventoryItemModal 
                isOpen={activeModal === 'ITEM_EDIT'} 
                onClose={() => setActiveModal('NONE')} 
                itemToEdit={selectedItem} 
            />
            
            {stockAdjParams && (
                <StockAdjustmentModal 
                    isOpen={activeModal === 'STOCK_ADJ'} 
                    onClose={() => setActiveModal('NONE')} 
                    itemId={stockAdjParams.itemId}
                    initialType={stockAdjParams.type}
                />
            )}
        </div>
    );
};
