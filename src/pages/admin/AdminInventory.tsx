
import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { InventoryItem } from '../../types';
import { Archive, AlertTriangle, Plus, ArrowDown, Edit, FileText, Truck, ClipboardList, Search, Trash2, Filter, Layers, Package, ShoppingBag } from 'lucide-react';

// Modais Separados
import { InventoryItemModal } from '../../components/modals/InventoryItemModal';
import { SupplierManagerModal } from '../../components/modals/SupplierManagerModal';
import { PurchaseEntryModal } from '../../components/modals/PurchaseEntryModal';
import { StockAdjustmentModal } from '../../components/modals/StockAdjustmentModal';
import { InventoryCountModal } from '../../components/modals/InventoryCountModal';
import { InventoryLogsModal } from '../../components/modals/InventoryLogsModal';

export const AdminInventory: React.FC = () => {
  const { state: invState, deleteInventoryItem } = useInventory();
  const { showConfirm, showAlert } = useUI();
  
  // Controle de Estado dos Modais
  const [activeModal, setActiveModal] = useState<'NONE' | 'ITEM' | 'SUPPLIER' | 'PURCHASE' | 'STOCK' | 'COUNT' | 'LOGS'>('NONE');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [stockAdjParams, setStockAdjParams] = useState<{ itemId: string, type: 'IN' | 'OUT' } | null>(null);
  
  // Estado de Busca e Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'INGREDIENT' | 'RESALE' | 'COMPOSITE'>('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setActiveModal('ITEM');
  };

  const handleNewItem = () => {
    setSelectedItem(null);
    setActiveModal('ITEM');
  };

  const handleStockAdj = (itemId: string, type: 'IN' | 'OUT') => {
    setStockAdjParams({ itemId, type });
    setActiveModal('STOCK');
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

  // Lógica Avançada de Filtragem
  const filteredInventory = invState.inventory.filter(item => {
      // 1. Filtro de Texto
      const term = searchTerm.toLowerCase();
      const matchesSearch = item.name.toLowerCase().includes(term) || item.unit.toLowerCase().includes(term);
      
      // 2. Filtro de Tipo
      const matchesType = filterType === 'ALL' || item.type === filterType;

      // 3. Filtro de Estoque Baixo
      const matchesLowStock = onlyLowStock ? item.quantity <= item.minQuantity : true;

      return matchesSearch && matchesType && matchesLowStock;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        {/* Header Principal */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-6">
            <div className="shrink-0">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Archive className="text-orange-500"/> Gestão de Estoque</h2>
                <p className="text-sm text-gray-500">Controle de insumos, revenda e fichas técnicas.</p>
            </div>
            
            <div className="flex flex-wrap gap-2 justify-end w-full xl:w-auto">
                <Button onClick={() => setActiveModal('LOGS')} variant="secondary" className="bg-slate-50 text-slate-700 border-slate-200 text-xs md:text-sm"><FileText size={16}/> Logs</Button>
                <Button onClick={() => setActiveModal('SUPPLIER')} variant="secondary" className="bg-slate-50 text-slate-700 border-slate-200 text-xs md:text-sm"><Truck size={16}/> Fornecedores</Button>
                <Button onClick={() => setActiveModal('PURCHASE')} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 text-xs md:text-sm"><Plus size={16}/> Entrada Nota</Button>
                <Button onClick={() => setActiveModal('COUNT')} variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-100 text-xs md:text-sm"><ClipboardList size={16}/> Balanço</Button>
                <Button onClick={handleNewItem} className="shadow-lg shadow-blue-100 text-xs md:text-sm"><Plus size={16}/> Novo Item</Button>
            </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 justify-between items-center">
            
            {/* Abas de Tipo */}
            <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto max-w-full">
                <button 
                    onClick={() => setFilterType('ALL')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${filterType === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Todos
                </button>
                <button 
                    onClick={() => setFilterType('INGREDIENT')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${filterType === 'INGREDIENT' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Package size={14}/> Matéria Prima
                </button>
                <button 
                    onClick={() => setFilterType('RESALE')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${filterType === 'RESALE' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <ShoppingBag size={14}/> Revenda
                </button>
                <button 
                    onClick={() => setFilterType('COMPOSITE')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${filterType === 'COMPOSITE' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Layers size={14}/> Produzido
                </button>
            </div>

            <div className="flex gap-4 w-full lg:w-auto items-center">
                {/* Toggle Estoque Baixo */}
                <button 
                    onClick={() => setOnlyLowStock(!onlyLowStock)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${onlyLowStock ? 'bg-red-50 text-red-600 border-red-200 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                >
                    <AlertTriangle size={14} className={onlyLowStock ? "fill-red-600" : ""} />
                    {onlyLowStock ? 'Vendo Críticos' : 'Alertas'}
                </button>

                {/* Barra de Busca */}
                <div className="relative flex-1 lg:w-64">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar item..." 
                        className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50 focus:bg-white"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
        </div>

        {/* Tabela de Itens */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b">
                        <tr>
                            <th className="p-4">Item / Insumo</th>
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
                        {filteredInventory.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-10 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Filter size={32} className="opacity-20"/>
                                        <p>Nenhum item encontrado com os filtros atuais.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Modais Componentizados */}
        <InventoryItemModal 
            isOpen={activeModal === 'ITEM'} 
            onClose={() => setActiveModal('NONE')} 
            itemToEdit={selectedItem} 
        />
        
        <SupplierManagerModal 
            isOpen={activeModal === 'SUPPLIER'} 
            onClose={() => setActiveModal('NONE')} 
        />
        
        <PurchaseEntryModal 
            isOpen={activeModal === 'PURCHASE'} 
            onClose={() => setActiveModal('NONE')} 
        />
        
        {stockAdjParams && (
            <StockAdjustmentModal 
                isOpen={activeModal === 'STOCK'} 
                onClose={() => setActiveModal('NONE')} 
                itemId={stockAdjParams.itemId}
                initialType={stockAdjParams.type}
            />
        )}
        
        <InventoryCountModal 
            isOpen={activeModal === 'COUNT'} 
            onClose={() => setActiveModal('NONE')} 
        />
        
        <InventoryLogsModal 
            isOpen={activeModal === 'LOGS'} 
            onClose={() => setActiveModal('NONE')} 
        />
    </div>
  );
};
