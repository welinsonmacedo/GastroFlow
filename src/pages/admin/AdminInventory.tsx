
import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { InventoryItem, Supplier } from '../../types';
import { Archive, AlertTriangle, Plus, ArrowDown, Edit, FileText, Truck, ClipboardList, Search, Trash2, Filter, Layers, Package, ShoppingBag, ScanLine, MapPin, Phone, User as UserIcon } from 'lucide-react';
import { Modal } from '../../components/Modal';

// Modais
import { InventoryItemModal } from '../../components/modals/InventoryItemModal';
import { SupplierManagerModal } from '../../components/modals/SupplierManagerModal'; // Mantido para adicionar
import { PurchaseEntryModal } from '../../components/modals/PurchaseEntryModal';
import { StockAdjustmentModal } from '../../components/modals/StockAdjustmentModal';
import { InventoryCountModal } from '../../components/modals/InventoryCountModal';

interface AdminInventoryProps {
    view: 'ITEMS' | 'SUPPLIERS' | 'LOGS';
}

export const AdminInventory: React.FC<AdminInventoryProps> = ({ view }) => {
  const { state: invState, deleteInventoryItem, deleteSupplier } = useInventory();
  const { showConfirm, showAlert } = useUI();
  
  // Controle de Estado dos Modais
  const [activeModal, setActiveModal] = useState<'NONE' | 'ITEM' | 'SUPPLIER' | 'PURCHASE' | 'STOCK' | 'COUNT'>('NONE');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [stockAdjParams, setStockAdjParams] = useState<{ itemId: string, type: 'IN' | 'OUT' } | null>(null);
  
  // Estado de Busca e Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'INGREDIENT' | 'RESALE' | 'COMPOSITE'>('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // --- HANDLERS ITEMS ---
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

  // --- HANDLERS SUPPLIERS ---
  const handleDeleteSupplier = (id: string) => {
      showConfirm({ 
          title: "Excluir Fornecedor", 
          message: "Tem certeza?", 
          onConfirm: async () => {
              await deleteSupplier(id);
              showAlert({ title: "Sucesso", message: "Fornecedor removido.", type: 'SUCCESS' });
          } 
      });
  };

  // --- RENDERIZADORES ---

  const renderItemsView = () => {
      // Lógica Avançada de Filtragem
      const filteredInventory = invState.inventory.filter(item => {
          const term = searchTerm.toLowerCase();
          const matchesSearch = 
            item.name.toLowerCase().includes(term) || 
            item.unit.toLowerCase().includes(term) ||
            (item.barcode && item.barcode.includes(term));
          
          const matchesType = filterType === 'ALL' || item.type === filterType;
          const matchesLowStock = onlyLowStock 
              ? (item.quantity <= item.minQuantity && item.type !== 'COMPOSITE') 
              : true;

          return matchesSearch && matchesType && matchesLowStock;
      });

      return (
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-6">
                <div className="shrink-0">
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Archive className="text-orange-500"/> Gestão de Itens</h2>
                    <p className="text-sm text-gray-500">Controle de insumos, revenda e fichas técnicas.</p>
                </div>
                
                <div className="flex flex-wrap gap-2 justify-end w-full xl:w-auto">
                    <Button onClick={() => setActiveModal('PURCHASE')} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 text-xs md:text-sm"><Plus size={16}/> Entrada Nota</Button>
                    <Button onClick={() => setActiveModal('COUNT')} variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-100 text-xs md:text-sm"><ClipboardList size={16}/> Balanço</Button>
                    <Button onClick={handleNewItem} className="shadow-lg shadow-blue-100 text-xs md:text-sm"><Plus size={16}/> Novo Item</Button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 justify-between items-center">
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

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b">
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
                            {filteredInventory.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-slate-400"><div className="flex flex-col items-center gap-2"><Filter size={32} className="opacity-20"/><p>Nenhum item encontrado com os filtros atuais.</p></div></td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      );
  };

  const renderSuppliersView = () => {
      const filteredSuppliers = invState.suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return (
          <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
                  <div>
                      <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Truck className="text-blue-600"/> Fornecedores</h2>
                      <p className="text-sm text-gray-500">Parceiros e distribuidores cadastrados.</p>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                      <div className="relative flex-1 md:w-64">
                          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                          <input type="text" placeholder="Buscar fornecedor..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                      </div>
                      <Button onClick={() => setActiveModal('SUPPLIER')}><Plus size={16}/> Novo</Button>
                  </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSuppliers.map(s => (
                      <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-colors group relative">
                          <div className="space-y-3">
                              <div className="flex justify-between items-start">
                                  <div>
                                      <h4 className="font-bold text-slate-800 leading-tight text-lg">{s.name}</h4>
                                      {s.contactName && <p className="text-xs text-blue-600 font-bold mt-1">{s.contactName}</p>}
                                  </div>
                                  <button onClick={() => handleDeleteSupplier(s.id)} className="text-red-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                              </div>
                              <div className="space-y-1">
                                  <div className="text-xs text-slate-500 flex items-center gap-2"><Phone size={14} className="text-slate-400"/> {s.phone || 'Sem telefone'}</div>
                                  <div className="text-xs text-slate-400 flex items-center gap-2 truncate"><FileText size={14} className="text-slate-400"/> {s.cnpj || 'Sem CNPJ'}</div>
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2 truncate pt-3 border-t"><MapPin size={12} /> {s.city && s.state ? `${s.city}-${s.state}` : 'Sem endereço'}</div>
                          </div>
                      </div>
                  ))}
                  {filteredSuppliers.length === 0 && (
                      <div className="col-span-full text-center py-20 text-gray-400 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                          <Truck size={48} className="mx-auto mb-2 opacity-20"/>
                          <p>Nenhum fornecedor encontrado.</p>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  const renderLogsView = () => {
      // Filtragem básica nos logs se necessário (atualmente sem filtro de texto para logs para simplicidade)
      const logs = invState.inventoryLogs;

      return (
          <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div>
                      <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><ClipboardList className="text-purple-600"/> Logs de Estoque</h2>
                      <p className="text-sm text-gray-500">Histórico de todas as movimentações (Entradas, Saídas, Vendas).</p>
                  </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b">
                              <tr>
                                  <th className="p-4">Data/Hora</th>
                                  <th className="p-4">Item</th>
                                  <th className="p-4">Operação</th>
                                  <th className="p-4 text-right">Qtd</th>
                                  <th className="p-4">Motivo</th>
                                  <th className="p-4">Usuário</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {logs.map(log => (
                                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="p-4 whitespace-nowrap text-slate-500 font-mono">
                                          {log.created_at ? log.created_at.toLocaleString() : '-'}
                                      </td>
                                      <td className="p-4 font-bold text-slate-700">{invState.inventory.find(i => i.id === log.item_id)?.name || 'Desconhecido'}</td>
                                      <td className="p-4">
                                          <span className={`px-2 py-1 rounded-md font-black text-[9px] uppercase border
                                              ${log.type === 'IN' ? 'bg-green-50 text-green-700 border-green-100' : 
                                                log.type === 'OUT' ? 'bg-red-50 text-red-700 border-red-100' : 
                                                log.type === 'SALE' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50'}
                                          `}>
                                              {log.type === 'IN' ? 'ENTRADA' : log.type === 'OUT' ? 'SAÍDA' : log.type === 'SALE' ? 'VENDA' : 'PERDA'}
                                          </span>
                                      </td>
                                      <td className="p-4 text-right font-mono font-bold text-slate-800">{log.quantity}</td>
                                      <td className="p-4 text-slate-600">{log.reason}</td>
                                      <td className="p-4 text-slate-400 italic">{log.user_name}</td>
                                  </tr>
                              ))}
                              {logs.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-slate-400">Nenhum histórico registrado.</td></tr>}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="animate-fade-in pb-20">
        {view === 'ITEMS' && renderItemsView()}
        {view === 'SUPPLIERS' && renderSuppliersView()}
        {view === 'LOGS' && renderLogsView()}

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
    </div>
  );
};
