import React, { useState, useEffect } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { InventoryItem, InventoryType, PurchaseItemInput } from '../../types';
import { Archive, AlertTriangle, Plus, ArrowDown, Edit, FileText, Truck, ClipboardList, Search, Trash2, Filter, Layers, Package, ShoppingBag, ScanLine, MapPin, Phone, User as UserIcon, Scale, FileInput, Calculator, X, Tag, CheckSquare, Square, Info, PlusCircle, Save, ShoppingCart } from 'lucide-react';
import { ImageUploader } from '../../components/ImageUploader';

// Modais (Ainda usados para Edição pontual e ações menores)
import { InventoryItemModal } from '../../components/modals/InventoryItemModal';
import { StockAdjustmentModal } from '../../components/modals/StockAdjustmentModal';

interface AdminInventoryProps {
    view: 'ITEMS' | 'SUPPLIERS' | 'LOGS' | 'ENTRY' | 'COUNT' | 'NEW_ITEM';
}

export const AdminInventory: React.FC<AdminInventoryProps> = ({ view }) => {
  const { state: invState, deleteInventoryItem, deleteSupplier, addInventoryItem, processPurchase, processInventoryAdjustment, addSupplier } = useInventory();
  const { showConfirm, showAlert } = useUI();
  
  // Controle de Estado dos Modais (apenas para edição e ajuste rápido)
  const [activeModal, setActiveModal] = useState<'NONE' | 'ITEM_EDIT' | 'STOCK_ADJ'>('NONE');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [stockAdjParams, setStockAdjParams] = useState<{ itemId: string, type: 'IN' | 'OUT' } | null>(null);
  
  // Estado de Busca e Filtros da Lista
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'INGREDIENT' | 'RESALE' | 'COMPOSITE'>('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // --- ESTADOS PARA VIEWS (PÁGINAS) ---

  // Estado: NOVO ITEM
  const [newItemForm, setNewItemForm] = useState<Partial<InventoryItem>>({
    name: '', barcode: '', unit: 'UN', type: 'INGREDIENT', quantity: 0, minQuantity: 5, costPrice: 0, salePrice: 0, category: '', isExtra: false, image: '', targetCategories: []
  });
  const [recipeItems, setRecipeItems] = useState<{ ingredientId: string, quantity: number }[]>([]);
  const [selectedIngToAdd, setSelectedIngToAdd] = useState('');
  const defaultCategories = ['Lanches', 'Pizzas', 'Pratos Principais', 'Acompanhamentos', 'Bebidas', 'Sobremesas', 'Mercearia', 'Limpeza', 'Higiene', 'Padaria'];

  // Estado: ENTRADA DE NOTA
  const [entryForm, setEntryForm] = useState({
    supplierId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0],
    items: [] as PurchaseItemInput[], taxAmount: 0, distributeTax: true
  });
  const [entryTempItem, setEntryTempItem] = useState({ itemId: '', quantity: 1, unitPrice: 0 });

  // Estado: BALANÇO (CONTAGEM)
  const [countSearch, setCountSearch] = useState('');
  const [counts, setCounts] = useState<{ [key: string]: string }>({});

  // Estado: NOVO FORNECEDOR
  const [newSupplierForm, setNewSupplierForm] = useState({ name: '', phone: '', email: '', cnpj: '', contactName: '' });
  const [showSupplierForm, setShowSupplierForm] = useState(false);

  // --- HANDLERS ITEMS ---
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

  // --- HANDLERS NOVO ITEM ---
  const handleSaveNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemForm.name) return;
    if (newItemForm.type !== 'INGREDIENT' && !newItemForm.category) {
        return showAlert({ title: "Categoria Obrigatória", message: "Itens de venda precisam de uma categoria.", type: 'WARNING' });
    }

    try {
      const finalItem: any = { ...newItemForm };
      if (finalItem.type === 'COMPOSITE') {
        finalItem.recipe = recipeItems;
        finalItem.costPrice = recipeItems.reduce((acc: number, item: any) => {
             const ing = invState.inventory.find(i => i.id === item.ingredientId);
             return acc + ((ing?.costPrice || 0) * item.quantity);
        }, 0);
      }
      if (finalItem.type === 'INGREDIENT') { finalItem.salePrice = 0; finalItem.category = ''; }

      await addInventoryItem(finalItem as InventoryItem);
      showAlert({ title: "Sucesso", message: "Item criado com sucesso!", type: 'SUCCESS' });
      // Reset form
      setNewItemForm({ name: '', barcode: '', unit: 'UN', type: 'INGREDIENT', quantity: 0, minQuantity: 5, costPrice: 0, salePrice: 0, category: '', isExtra: false, image: '', targetCategories: [] });
      setRecipeItems([]);
    } catch (error: any) {
      showAlert({ title: "Erro", message: error.message, type: 'ERROR' });
    }
  };

  const toggleTargetCategory = (cat: string) => {
      const current = newItemForm.targetCategories || [];
      setNewItemForm({ ...newItemForm, targetCategories: current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat] });
  };

  // --- HANDLERS ENTRADA NOTA ---
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

  // --- HANDLERS BALANÇO ---
  const handleSubmitCount = async () => {
    const adjustments = Object.keys(counts).map(id => ({ itemId: id, realQty: parseFloat(counts[id] || '0') }));
    if (adjustments.length === 0) return;
    await processInventoryAdjustment(adjustments);
    setCounts({});
    showAlert({ title: "Balanço Finalizado", message: "Estoque ajustado com sucesso.", type: 'SUCCESS' });
  };

  // --- HANDLERS FORNECEDOR ---
  const handleSaveSupplier = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newSupplierForm.name) return;
      await addSupplier(newSupplierForm as any);
      setNewSupplierForm({ name: '', phone: '', email: '', cnpj: '', contactName: '' });
      setShowSupplierForm(false);
      showAlert({ title: "Sucesso", message: "Fornecedor adicionado.", type: "SUCCESS" });
  };
  const handleDeleteSupplier = (id: string) => {
      showConfirm({ title: "Excluir Fornecedor", message: "Tem certeza?", onConfirm: async () => { await deleteSupplier(id); showAlert({ title: "Sucesso", message: "Fornecedor removido.", type: 'SUCCESS' }); } });
  };

  // --- RENDERIZADORES ---

  const renderItemsView = () => {
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
                <div className="overflow-x-auto h-full">
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
        </div>
      );
  };

  const renderNewItemView = () => (
      <div className="w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-200 animate-fade-in flex flex-col h-full overflow-y-auto">
          <header className="mb-6 border-b pb-4 shrink-0">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><PlusCircle size={24} className="text-blue-600"/> Cadastrar Novo Item</h2>
              <p className="text-sm text-gray-500">Adicione insumos ou produtos para venda.</p>
          </header>
          
          <form onSubmit={handleSaveNewItem} className="space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Coluna 1 */}
                  <div className="space-y-5">
                      <div><label className="block text-xs font-bold mb-1 text-slate-600">Nome do Item</label><input required className="w-full border p-3 rounded-xl focus:border-blue-500 outline-none transition-colors bg-gray-50 focus:bg-white" value={newItemForm.name} onChange={e => setNewItemForm({ ...newItemForm, name: e.target.value })} placeholder="Ex: Queijo Mussarela" /></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold mb-1 text-slate-600">Tipo</label><select className="w-full border p-3 rounded-xl bg-white focus:border-blue-500 outline-none" value={newItemForm.type} onChange={e => setNewItemForm({ ...newItemForm, type: e.target.value as any })}><option value="INGREDIENT">Matéria Prima</option><option value="RESALE">Revenda</option><option value="COMPOSITE">Produzido (Prato)</option></select></div>
                          <div><label className="block text-xs font-bold mb-1 text-slate-600">Unidade</label><select className="w-full border p-3 rounded-xl bg-white focus:border-blue-500 outline-none" value={newItemForm.unit} onChange={e => setNewItemForm({ ...newItemForm, unit: e.target.value })}><option value="UN">UN</option><option value="KG">KG</option><option value="LT">LT</option></select></div>
                      </div>
                      
                      {/* Categoria apenas para Venda */}
                      {newItemForm.type !== 'INGREDIENT' && (
                          <div>
                            <label className="block text-xs font-bold mb-1 text-purple-700">Categoria (Cardápio)</label>
                            <input className="w-full border p-3 rounded-xl focus:border-purple-500 outline-none" list="categories" value={newItemForm.category} onChange={e => setNewItemForm({...newItemForm, category: e.target.value})} placeholder="Selecione ou digite..." />
                            <datalist id="categories">{defaultCategories.map(c => <option key={c} value={c}/>)}</datalist>
                          </div>
                      )}

                      {/* Checkbox Adicional */}
                      <div className="p-5 bg-orange-50/50 rounded-xl border border-orange-100">
                           <label className="flex items-center gap-3 cursor-pointer">
                               <input type="checkbox" checked={newItemForm.isExtra} onChange={e => setNewItemForm({...newItemForm, isExtra: e.target.checked})} className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"/>
                               <span className="text-sm font-bold text-slate-700">Item Adicional (Extra)?</span>
                           </label>
                           {newItemForm.isExtra && (
                               <div className="mt-4 space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                   <p className="text-xs font-bold text-orange-800 mb-2">Disponível nas categorias:</p>
                                   {defaultCategories.map(cat => (
                                       <label key={cat} className="flex items-center gap-2 text-xs p-2 bg-white rounded-lg border border-orange-100 hover:border-orange-300 cursor-pointer transition-all">
                                           <input type="checkbox" checked={newItemForm.targetCategories?.includes(cat)} onChange={() => toggleTargetCategory(cat)} className="rounded text-orange-500 focus:ring-0"/> {cat}
                                       </label>
                                   ))}
                               </div>
                           )}
                      </div>
                  </div>

                  {/* Coluna 2 */}
                  <div className="space-y-5">
                      {newItemForm.type === 'COMPOSITE' ? (
                          <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 h-full flex flex-col">
                              <h4 className="text-xs font-black text-purple-700 uppercase mb-3 flex items-center gap-2"><Layers size={14}/> Receita (Ficha Técnica)</h4>
                              <div className="flex gap-2 mb-3">
                                  <select className="flex-1 text-sm border p-2.5 rounded-lg bg-white focus:border-purple-500 outline-none" value={selectedIngToAdd} onChange={e => setSelectedIngToAdd(e.target.value)}>
                                      <option value="">Adicionar Insumo...</option>
                                      {invState.inventory.filter(i => i.type === 'INGREDIENT').map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                  </select>
                                  <Button type="button" size="sm" onClick={() => { if(selectedIngToAdd) { setRecipeItems([...recipeItems, { ingredientId: selectedIngToAdd, quantity: 1 }]); setSelectedIngToAdd(''); } }} className="bg-purple-600 hover:bg-purple-700 text-white"><Plus size={16}/></Button>
                              </div>
                              <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2 bg-white/50 rounded-xl p-2 border border-purple-100">
                                  {recipeItems.map((r, idx) => {
                                      const ing = invState.inventory.find(i => i.id === r.ingredientId);
                                      return (
                                          <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm text-sm">
                                              <span className="font-bold text-slate-700">{ing?.name}</span>
                                              <div className="flex items-center gap-2"><input type="number" step="0.001" className="w-20 border p-1.5 rounded text-right font-mono" value={r.quantity} onChange={e => { const n = [...recipeItems]; n[idx].quantity = parseFloat(e.target.value); setRecipeItems(n); }} /><button type="button" onClick={() => setRecipeItems(recipeItems.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded hover:bg-red-100 transition-colors"><X size={14}/></button></div>
                                          </div>
                                      )
                                  })}
                                  {recipeItems.length === 0 && <p className="text-center text-purple-300 text-xs italic py-4">Nenhum ingrediente adicionado.</p>}
                              </div>
                          </div>
                      ) : (
                          <div className="grid grid-cols-2 gap-4">
                              <div><label className="block text-xs font-bold mb-1 text-blue-600">Estoque Inicial</label><input type="number" step="0.001" className="w-full border-2 border-blue-100 p-3 rounded-xl font-bold bg-blue-50 text-blue-800 outline-none focus:border-blue-400" value={newItemForm.quantity} onChange={e => setNewItemForm({...newItemForm, quantity: parseFloat(e.target.value)})} /></div>
                              <div><label className="block text-xs font-bold mb-1 text-slate-600">Estoque Mínimo</label><input type="number" className="w-full border p-3 rounded-xl focus:border-blue-500 outline-none" value={newItemForm.minQuantity} onChange={e => setNewItemForm({...newItemForm, minQuantity: parseFloat(e.target.value)})} /></div>
                              <div className="col-span-2"><label className="block text-xs font-bold mb-1 text-slate-600">Custo Médio (R$)</label><input type="number" step="0.01" className="w-full border p-3 rounded-xl focus:border-blue-500 outline-none" value={newItemForm.costPrice} onChange={e => setNewItemForm({...newItemForm, costPrice: parseFloat(e.target.value)})} /></div>
                          </div>
                      )}
                      
                      {newItemForm.type !== 'INGREDIENT' && (
                          <div><label className="block text-xs font-bold mb-1 text-emerald-600">Preço de Venda (R$)</label><input type="number" step="0.01" className="w-full border-2 border-emerald-100 p-3 rounded-xl font-black text-emerald-600 bg-emerald-50 text-xl outline-none focus:border-emerald-400" value={newItemForm.salePrice} onChange={e => setNewItemForm({...newItemForm, salePrice: parseFloat(e.target.value)})} /></div>
                      )}

                      {/* Image Uploader */}
                      {newItemForm.type !== 'INGREDIENT' && (
                          <div className="border rounded-xl p-4 bg-gray-50">
                              <label className="block text-xs font-bold mb-2 text-slate-600">Imagem do Produto</label>
                              <ImageUploader value={newItemForm.image || ''} onChange={(val) => setNewItemForm({...newItemForm, image: val})} maxSizeKB={200} />
                          </div>
                      )}
                  </div>
              </div>
              <div className="border-t pt-4 mt-auto">
                  <Button type="submit" className="w-full py-4 text-lg shadow-lg font-bold">Salvar Item no Estoque</Button>
              </div>
          </form>
      </div>
  );

  const renderEntryView = () => (
      <div className="w-full h-full bg-white p-6 rounded-2xl shadow-sm border border-gray-200 animate-fade-in flex flex-col overflow-hidden">
          <header className="mb-6 flex justify-between items-center border-b pb-4 shrink-0">
              <div><h2 className="text-xl font-bold text-gray-800">Entrada de Nota Fiscal</h2><p className="text-sm text-gray-500">Atualiza estoque e gera contas a pagar.</p></div>
              <div className="text-right"><p className="text-xs font-bold text-gray-400">TOTAL DA NOTA</p><p className="text-2xl font-black text-blue-600">R$ {(entryForm.items.reduce((acc, i) => acc + i.totalPrice, 0) + Number(entryForm.taxAmount)).toFixed(2)}</p></div>
          </header>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
              {/* Coluna 1: Dados da Nota */}
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 overflow-y-auto">
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
              <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 overflow-y-auto">
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
                   <div className="bg-slate-50 p-4 font-bold border-b text-sm text-slate-700 flex justify-between items-center">
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

  const renderCountView = () => (
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

  const renderSuppliersView = () => (
      <div className="w-full h-full flex flex-col space-y-6 overflow-hidden">
          <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 shrink-0">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Truck className="text-blue-600"/> Fornecedores</h2>
              <Button onClick={() => setShowSupplierForm(true)}><Plus size={18}/> Novo Fornecedor</Button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
              {showSupplierForm && (
                  <div className="bg-white p-6 rounded-2xl border-2 border-blue-100 shadow-md mb-6 animate-fade-in">
                      <h4 className="text-sm font-black text-blue-800 uppercase tracking-widest mb-4">Cadastro de Fornecedor</h4>
                      <form onSubmit={handleSaveSupplier} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2"><label className="text-xs font-bold block mb-1 text-slate-600">Nome / Razão Social</label><input required className="w-full border p-3 rounded-lg focus:border-blue-500 outline-none" value={newSupplierForm.name} onChange={e => setNewSupplierForm({...newSupplierForm, name: e.target.value})} /></div>
                          <div><label className="text-xs font-bold block mb-1 text-slate-600">CNPJ</label><input className="w-full border p-3 rounded-lg focus:border-blue-500 outline-none" value={newSupplierForm.cnpj} onChange={e => setNewSupplierForm({...newSupplierForm, cnpj: e.target.value})} /></div>
                          <div><label className="text-xs font-bold block mb-1 text-slate-600">Nome Contato</label><input className="w-full border p-3 rounded-lg focus:border-blue-500 outline-none" value={newSupplierForm.contactName} onChange={e => setNewSupplierForm({...newSupplierForm, contactName: e.target.value})} /></div>
                          <div><label className="text-xs font-bold block mb-1 text-slate-600">Telefone</label><input className="w-full border p-3 rounded-lg focus:border-blue-500 outline-none" value={newSupplierForm.phone} onChange={e => setNewSupplierForm({...newSupplierForm, phone: e.target.value})} /></div>
                          <div><label className="text-xs font-bold block mb-1 text-slate-600">Email</label><input className="w-full border p-3 rounded-lg focus:border-blue-500 outline-none" value={newSupplierForm.email} onChange={e => setNewSupplierForm({...newSupplierForm, email: e.target.value})} /></div>
                          <div className="md:col-span-2 flex gap-3 mt-2">
                              <Button type="button" variant="secondary" onClick={() => setShowSupplierForm(false)} className="flex-1 py-3">Cancelar</Button>
                              <Button type="submit" className="flex-1 py-3 shadow-md">Salvar Fornecedor</Button>
                          </div>
                      </form>
                  </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {invState.suppliers.map(s => (
                      <div key={s.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between group hover:border-blue-400 hover:shadow-lg transition-all relative">
                          <button onClick={() => handleDeleteSupplier(s.id)} className="absolute top-4 right-4 text-red-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                          <div>
                              <h4 className="font-bold text-slate-800 text-lg mb-1 truncate pr-6" title={s.name}>{s.name}</h4>
                              <p className="text-xs text-slate-500 flex items-center gap-1 mb-3"><UserIcon size={12}/> {s.contactName || 'Sem contato'}</p>
                              <div className="space-y-2">
                                  <p className="text-xs bg-slate-50 p-2 rounded-lg flex items-center gap-2 border border-slate-100 font-medium text-slate-600"><Phone size={12} className="text-blue-500"/> {s.phone || '-'}</p>
                                  <p className="text-xs bg-slate-50 p-2 rounded-lg flex items-center gap-2 border border-slate-100 font-medium text-slate-600"><FileText size={12} className="text-blue-500"/> {s.cnpj || '-'}</p>
                              </div>
                          </div>
                      </div>
                  ))}
                  {invState.suppliers.length === 0 && !showSupplierForm && <div className="col-span-full text-center py-20 text-gray-400 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl"><Truck size={48} className="mb-4 opacity-20"/><p>Nenhum fornecedor cadastrado.</p></div>}
              </div>
          </div>
      </div>
  );

  const renderLogsView = () => (
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

  return (
    <div className="animate-fade-in pb-20 w-full h-full flex flex-col">
        {view === 'ITEMS' && renderItemsView()}
        {view === 'NEW_ITEM' && renderNewItemView()}
        {view === 'ENTRY' && renderEntryView()}
        {view === 'COUNT' && renderCountView()}
        {view === 'SUPPLIERS' && renderSuppliersView()}
        {view === 'LOGS' && renderLogsView()}

        {/* Modais Componentizados para Edições Rápidas (Estes continuam como modais pois são auxiliares da tela ITEMS) */}
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
