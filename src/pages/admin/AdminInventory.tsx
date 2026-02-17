import React, { useState, useEffect } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { InventoryItem, InventoryType, PurchaseItemInput } from '../../types';
import { Archive, AlertTriangle, Plus, ArrowDown, Edit, FileText, Truck, ClipboardList, Search, Trash2, Filter, Layers, Package, ShoppingBag, ScanLine, MapPin, Phone, User as UserIcon, Scale, FileInput, Calculator, X, Tag, CheckSquare, Square, Info, PlusCircle } from 'lucide-react';
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
        <div className="space-y-6 animate-fade-in">
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
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      );
  };

  const renderNewItemView = () => (
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-200 animate-fade-in">
          <header className="mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><PlusCircle size={24} className="text-blue-600"/> Cadastrar Novo Item</h2>
              <p className="text-sm text-gray-500">Adicione insumos ou produtos para venda.</p>
          </header>
          
          <form onSubmit={handleSaveNewItem} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Coluna 1 */}
                  <div className="space-y-4">
                      <div><label className="block text-xs font-bold mb-1">Nome do Item</label><input required className="w-full border p-2.5 rounded-xl" value={newItemForm.name} onChange={e => setNewItemForm({ ...newItemForm, name: e.target.value })} /></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold mb-1">Tipo</label><select className="w-full border p-2.5 rounded-xl bg-white" value={newItemForm.type} onChange={e => setNewItemForm({ ...newItemForm, type: e.target.value as any })}><option value="INGREDIENT">Matéria Prima</option><option value="RESALE">Revenda</option><option value="COMPOSITE">Produzido (Prato)</option></select></div>
                          <div><label className="block text-xs font-bold mb-1">Unidade</label><select className="w-full border p-2.5 rounded-xl bg-white" value={newItemForm.unit} onChange={e => setNewItemForm({ ...newItemForm, unit: e.target.value })}><option value="UN">UN</option><option value="KG">KG</option><option value="LT">LT</option></select></div>
                      </div>
                      
                      {/* Categoria apenas para Venda */}
                      {newItemForm.type !== 'INGREDIENT' && (
                          <div>
                            <label className="block text-xs font-bold mb-1 text-purple-700">Categoria (Cardápio)</label>
                            <input className="w-full border p-2.5 rounded-xl" list="categories" value={newItemForm.category} onChange={e => setNewItemForm({...newItemForm, category: e.target.value})} />
                            <datalist id="categories">{defaultCategories.map(c => <option key={c} value={c}/>)}</datalist>
                          </div>
                      )}

                      {/* Checkbox Adicional */}
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                           <label className="flex items-center gap-2 cursor-pointer">
                               <input type="checkbox" checked={newItemForm.isExtra} onChange={e => setNewItemForm({...newItemForm, isExtra: e.target.checked})} className="w-5 h-5 text-orange-600 rounded"/>
                               <span className="text-sm font-bold text-slate-700">É um Adicional?</span>
                           </label>
                           {newItemForm.isExtra && (
                               <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                                   <p className="text-xs font-bold text-gray-500 mb-1">Disponível em:</p>
                                   {defaultCategories.map(cat => (
                                       <label key={cat} className="flex items-center gap-2 text-xs p-1 hover:bg-white rounded cursor-pointer">
                                           <input type="checkbox" checked={newItemForm.targetCategories?.includes(cat)} onChange={() => toggleTargetCategory(cat)} className="rounded text-orange-500"/> {cat}
                                       </label>
                                   ))}
                               </div>
                           )}
                      </div>
                  </div>

                  {/* Coluna 2 */}
                  <div className="space-y-4">
                      {newItemForm.type === 'COMPOSITE' ? (
                          <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                              <h4 className="text-xs font-black text-purple-700 uppercase mb-2">Receita (Ingredientes)</h4>
                              <div className="flex gap-2 mb-2">
                                  <select className="flex-1 text-sm border p-2 rounded-lg" value={selectedIngToAdd} onChange={e => setSelectedIngToAdd(e.target.value)}>
                                      <option value="">Adicionar Insumo...</option>
                                      {invState.inventory.filter(i => i.type === 'INGREDIENT').map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                  </select>
                                  <Button type="button" size="sm" onClick={() => { if(selectedIngToAdd) { setRecipeItems([...recipeItems, { ingredientId: selectedIngToAdd, quantity: 1 }]); setSelectedIngToAdd(''); } }}><Plus size={16}/></Button>
                              </div>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {recipeItems.map((r, idx) => {
                                      const ing = invState.inventory.find(i => i.id === r.ingredientId);
                                      return (
                                          <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border text-sm">
                                              <span>{ing?.name}</span>
                                              <div className="flex items-center gap-1"><input type="number" step="0.001" className="w-16 border rounded p-1 text-right" value={r.quantity} onChange={e => { const n = [...recipeItems]; n[idx].quantity = parseFloat(e.target.value); setRecipeItems(n); }} /><button type="button" onClick={() => setRecipeItems(recipeItems.filter((_, i) => i !== idx))} className="text-red-500"><X size={14}/></button></div>
                                          </div>
                                      )
                                  })}
                              </div>
                          </div>
                      ) : (
                          <div className="grid grid-cols-2 gap-4">
                              <div><label className="block text-xs font-bold mb-1 text-blue-600">Estoque Inicial</label><input type="number" step="0.001" className="w-full border p-2.5 rounded-xl font-bold bg-blue-50 border-blue-100" value={newItemForm.quantity} onChange={e => setNewItemForm({...newItemForm, quantity: parseFloat(e.target.value)})} /></div>
                              <div><label className="block text-xs font-bold mb-1">Mínimo</label><input type="number" className="w-full border p-2.5 rounded-xl" value={newItemForm.minQuantity} onChange={e => setNewItemForm({...newItemForm, minQuantity: parseFloat(e.target.value)})} /></div>
                              <div className="col-span-2"><label className="block text-xs font-bold mb-1">Custo Médio (R$)</label><input type="number" step="0.01" className="w-full border p-2.5 rounded-xl" value={newItemForm.costPrice} onChange={e => setNewItemForm({...newItemForm, costPrice: parseFloat(e.target.value)})} /></div>
                          </div>
                      )}
                      
                      {newItemForm.type !== 'INGREDIENT' && (
                          <div><label className="block text-xs font-bold mb-1 text-emerald-600">Preço de Venda (R$)</label><input type="number" step="0.01" className="w-full border p-2.5 rounded-xl font-black text-emerald-600 bg-emerald-50 border-emerald-100" value={newItemForm.salePrice} onChange={e => setNewItemForm({...newItemForm, salePrice: parseFloat(e.target.value)})} /></div>
                      )}

                      {/* Image Uploader */}
                      {newItemForm.type !== 'INGREDIENT' && (
                          <div className="border rounded-xl p-4 bg-gray-50">
                              <label className="block text-xs font-bold mb-2">Imagem</label>
                              <ImageUploader value={newItemForm.image || ''} onChange={(val) => setNewItemForm({...newItemForm, image: val})} maxSizeKB={200} />
                          </div>
                      )}
                  </div>
              </div>
              <Button type="submit" className="w-full py-4 text-lg">Salvar Item</Button>
          </form>
      </div>
  );

  const renderEntryView = () => (
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-200 animate-fade-in">
          <header className="mb-6 flex justify-between items-center border-b pb-4">
              <div><h2 className="text-xl font-bold text-gray-800">Entrada de Nota Fiscal</h2><p className="text-sm text-gray-500">Atualiza estoque e gera contas a pagar.</p></div>
              <div className="text-right"><p className="text-xs font-bold text-gray-400">TOTAL DA NOTA</p><p className="text-2xl font-black text-blue-600">R$ {(entryForm.items.reduce((acc, i) => acc + i.totalPrice, 0) + Number(entryForm.taxAmount)).toFixed(2)}</p></div>
          </header>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                  <label className="block text-xs font-bold mb-1">Fornecedor</label>
                  <select className="w-full border p-2.5 rounded-lg bg-white" value={entryForm.supplierId} onChange={e => setEntryForm({...entryForm, supplierId: e.target.value})}>
                      <option value="">Selecione...</option>
                      {invState.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
              </div>
              <div><label className="block text-xs font-bold mb-1">Número Nota</label><input className="w-full border p-2.5 rounded-lg" value={entryForm.invoiceNumber} onChange={e => setEntryForm({...entryForm, invoiceNumber: e.target.value})} /></div>
              <div><label className="block text-xs font-bold mb-1">Data Emissão</label><input type="date" className="w-full border p-2.5 rounded-lg" value={entryForm.date} onChange={e => setEntryForm({...entryForm, date: e.target.value})} /></div>
          </div>

          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-6">
              <h4 className="text-xs font-black text-slate-500 uppercase mb-3">Adicionar Item</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-2"><label className="block text-[10px] font-bold mb-1">Insumo</label><select className="w-full border p-2 rounded-lg text-sm" value={entryTempItem.itemId} onChange={e => setEntryTempItem({...entryTempItem, itemId: e.target.value})}><option value="">Selecione...</option>{invState.inventory.filter(i => i.type !== 'COMPOSITE').map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</select></div>
                  <div><label className="block text-[10px] font-bold mb-1">Qtd</label><input type="number" className="w-full border p-2 rounded-lg" value={entryTempItem.quantity} onChange={e => setEntryTempItem({...entryTempItem, quantity: parseFloat(e.target.value)})} /></div>
                  <div><label className="block text-[10px] font-bold mb-1">Preço Un.</label><input type="number" className="w-full border p-2 rounded-lg" value={entryTempItem.unitPrice} onChange={e => setEntryTempItem({...entryTempItem, unitPrice: parseFloat(e.target.value)})} /></div>
              </div>
              <Button onClick={handleAddEntryItem} size="sm" className="mt-3"><Plus size={14}/> Adicionar à Lista</Button>
          </div>

          <div className="border rounded-xl overflow-hidden mb-6">
              <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100 font-bold text-gray-600"><tr><th className="p-3">Item</th><th className="p-3 text-right">Qtd</th><th className="p-3 text-right">Unit.</th><th className="p-3 text-right">Total</th><th className="p-3"></th></tr></thead>
                  <tbody>{entryForm.items.map((it, idx) => (
                      <tr key={idx} className="border-b"><td className="p-3">{invState.inventory.find(i => i.id === it.inventoryItemId)?.name}</td><td className="p-3 text-right">{it.quantity}</td><td className="p-3 text-right">R$ {it.unitPrice.toFixed(2)}</td><td className="p-3 text-right font-bold">R$ {it.totalPrice.toFixed(2)}</td><td className="p-3 text-center"><button onClick={() => setEntryForm({...entryForm, items: entryForm.items.filter((_, i) => i !== idx)})} className="text-red-500"><Trash2 size={14}/></button></td></tr>
                  ))}</tbody>
              </table>
          </div>

          <div className="flex gap-4 items-end mb-6">
              <div className="flex-1">
                  <label className="block text-xs font-bold mb-1">Custos Extras (Frete/Imposto)</label>
                  <input type="number" className="w-full border p-2 rounded-lg" value={entryForm.taxAmount} onChange={e => setEntryForm({...entryForm, taxAmount: parseFloat(e.target.value)})} />
              </div>
              <label className="flex items-center gap-2 mb-2 cursor-pointer"><input type="checkbox" checked={entryForm.distributeTax} onChange={e => setEntryForm({...entryForm, distributeTax: e.target.checked})} /> <span className="text-xs font-bold text-gray-600">Distribuir no custo unitário?</span></label>
          </div>

          <Button onClick={handleSubmitEntry} className="w-full py-4 text-lg">Finalizar Entrada</Button>
      </div>
  );

  const renderCountView = () => (
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-200 animate-fade-in flex flex-col h-[calc(100vh-140px)]">
          <header className="mb-4 flex justify-between items-center shrink-0">
              <div><h2 className="text-xl font-bold text-gray-800">Balanço de Estoque</h2><p className="text-sm text-gray-500">Contagem física para ajuste de perdas/sobras.</p></div>
              <div className="relative w-64"><Search className="absolute left-3 top-2.5 text-gray-400" size={16}/><input className="w-full border rounded-lg pl-9 p-2 text-sm" placeholder="Filtrar lista..." value={countSearch} onChange={e => setCountSearch(e.target.value)}/></div>
          </header>

          <div className="flex-1 overflow-y-auto border rounded-xl relative custom-scrollbar">
              <table className="w-full text-left text-sm relative">
                  <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10"><tr><th className="p-3">Item</th><th className="p-3 text-right">Estoque Sistema</th><th className="p-3 text-right w-32">Contagem Real</th><th className="p-3 text-right">Diferença</th></tr></thead>
                  <tbody className="divide-y">
                      {invState.inventory.filter(i => i.type !== 'COMPOSITE' && i.name.toLowerCase().includes(countSearch.toLowerCase())).map(item => {
                          const sysQty = item.quantity;
                          const inputVal = counts[item.id] ?? '';
                          const realQty = inputVal === '' ? sysQty : parseFloat(inputVal);
                          const diff = realQty - sysQty;
                          return (
                              <tr key={item.id} className="hover:bg-gray-50">
                                  <td className="p-3 font-medium">{item.name} <span className="text-xs text-gray-400">({item.unit})</span></td>
                                  <td className="p-3 text-right font-mono text-gray-500">{sysQty}</td>
                                  <td className="p-2"><input type="number" className={`w-full border rounded p-1.5 text-right font-bold outline-none focus:border-blue-500 ${diff !== 0 ? 'bg-yellow-50 border-yellow-300' : ''}`} placeholder={sysQty.toString()} value={inputVal} onChange={e => setCounts({...counts, [item.id]: e.target.value})} /></td>
                                  <td className={`p-3 text-right font-bold ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-green-600' : 'text-gray-300'}`}>{diff > 0 ? `+${diff}` : diff}</td>
                              </tr>
                          )
                      })}
                  </tbody>
              </table>
          </div>
          
          <div className="pt-4 mt-4 border-t shrink-0">
              <Button onClick={handleSubmitCount} className="w-full py-4 text-lg">Processar Ajustes</Button>
          </div>
      </div>
  );

  const renderSuppliersView = () => (
      <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Truck className="text-blue-600"/> Fornecedores</h2>
              <Button onClick={() => setShowSupplierForm(true)}><Plus size={16}/> Novo Fornecedor</Button>
          </div>

          {showSupplierForm && (
              <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200 animate-fade-in">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Cadastro</h4>
                  <form onSubmit={handleSaveSupplier} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2"><label className="text-xs font-bold block mb-1">Nome / Razão Social</label><input required className="w-full border p-2 rounded-lg" value={newSupplierForm.name} onChange={e => setNewSupplierForm({...newSupplierForm, name: e.target.value})} /></div>
                      <div><label className="text-xs font-bold block mb-1">CNPJ</label><input className="w-full border p-2 rounded-lg" value={newSupplierForm.cnpj} onChange={e => setNewSupplierForm({...newSupplierForm, cnpj: e.target.value})} /></div>
                      <div><label className="text-xs font-bold block mb-1">Contato</label><input className="w-full border p-2 rounded-lg" value={newSupplierForm.contactName} onChange={e => setNewSupplierForm({...newSupplierForm, contactName: e.target.value})} /></div>
                      <div><label className="text-xs font-bold block mb-1">Telefone</label><input className="w-full border p-2 rounded-lg" value={newSupplierForm.phone} onChange={e => setNewSupplierForm({...newSupplierForm, phone: e.target.value})} /></div>
                      <div><label className="text-xs font-bold block mb-1">Email</label><input className="w-full border p-2 rounded-lg" value={newSupplierForm.email} onChange={e => setNewSupplierForm({...newSupplierForm, email: e.target.value})} /></div>
                      <div className="md:col-span-2 flex gap-2 mt-2">
                          <Button type="button" variant="secondary" onClick={() => setShowSupplierForm(false)} className="flex-1">Cancelar</Button>
                          <Button type="submit" className="flex-1">Salvar</Button>
                      </div>
                  </form>
              </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {invState.suppliers.map(s => (
                  <div key={s.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between group hover:border-blue-300 transition-all relative">
                      <button onClick={() => handleDeleteSupplier(s.id)} className="absolute top-4 right-4 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                      <div>
                          <h4 className="font-bold text-slate-800 text-lg mb-1">{s.name}</h4>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mb-2"><UserIcon size={12}/> {s.contactName || 'Sem contato'}</p>
                          <div className="space-y-1">
                              <p className="text-xs bg-slate-50 p-1.5 rounded flex items-center gap-2"><Phone size={12}/> {s.phone}</p>
                              <p className="text-xs bg-slate-50 p-1.5 rounded flex items-center gap-2"><FileText size={12}/> {s.cnpj}</p>
                          </div>
                      </div>
                  </div>
              ))}
              {invState.suppliers.length === 0 && <div className="col-span-full text-center py-10 text-gray-400">Nenhum fornecedor cadastrado.</div>}
          </div>
      </div>
  );

  const renderLogsView = () => (
      <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><ClipboardList className="text-purple-600"/> Logs de Estoque</h2>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b"><tr><th className="p-4">Data</th><th className="p-4">Item</th><th className="p-4">Tipo</th><th className="p-4 text-right">Qtd</th><th className="p-4">Motivo</th><th className="p-4">Usuário</th></tr></thead>
                  <tbody className="divide-y">
                      {invState.inventoryLogs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50">
                              <td className="p-4 text-slate-400 font-mono">{log.created_at?.toLocaleString()}</td>
                              <td className="p-4 font-bold text-slate-700">{invState.inventory.find(i => i.id === log.item_id)?.name || 'Desconhecido'}</td>
                              <td className="p-4"><span className={`px-2 py-1 rounded font-black uppercase ${log.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{log.type === 'IN' ? 'Entrada' : 'Saída'}</span></td>
                              <td className="p-4 text-right font-mono font-bold">{log.quantity}</td>
                              <td className="p-4 text-slate-600">{log.reason}</td>
                              <td className="p-4 text-slate-400 italic">{log.user_name}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
  );

  return (
    <div className="animate-fade-in pb-20">
        {view === 'ITEMS' && renderItemsView()}
        {view === 'NEW_ITEM' && renderNewItemView()}
        {view === 'ENTRY' && renderEntryView()}
        {view === 'COUNT' && renderCountView()}
        {view === 'SUPPLIERS' && renderSuppliersView()}
        {view === 'LOGS' && renderLogsView()}

        {/* Modais Componentizados para Edições Rápidas */}
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
