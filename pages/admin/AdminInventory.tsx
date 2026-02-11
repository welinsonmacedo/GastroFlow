
import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { ImageUploader } from '../../components/ImageUploader';
import { Modal } from '../../components/Modal';
import { InventoryItem, InventoryType, Supplier, PurchaseItemInput, PurchaseInstallment } from '../../types';
import { 
  Plus, Trash2, Edit, ArrowDown, Layers, ClipboardList, 
  FileText, Truck, Star, CheckSquare, Square, Search, 
  MapPin, Phone, User as UserIcon, Archive, AlertTriangle, 
  X, Loader2, Info, Calendar, DollarSign, ArrowUp 
} from 'lucide-react';

export const AdminInventory: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: invState, addInventoryItem, updateInventoryItem, updateStock, processInventoryAdjustment, addSupplier, deleteSupplier, processPurchase } = useInventory();
  const { showAlert, showConfirm } = useUI();
  
  // Modais e Estados de Edição
  const [editingInventory, setEditingInventory] = useState<Partial<InventoryItem> | null>(null);
  const [recipeItems, setRecipeItems] = useState<{ ingredientId: string, qty: number }[]>([]);
  const [selectedIngToAdd, setSelectedIngToAdd] = useState('');
  
  // Modais de Operação
  const [stockModal, setStockModal] = useState<{ itemId: string, type: 'IN' | 'OUT', quantity: string, reason: string } | null>(null);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [inventoryCounts, setInventoryCounts] = useState<{ [key: string]: number }>({});
  
  // Entrada de Nota
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseHistoryOpen, setPurchaseHistoryOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({ 
    supplierId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0], 
    items: [] as PurchaseItemInput[], taxAmount: 0, distributeTax: true 
  });
  const [tempPurchaseItem, setTempPurchaseItem] = useState({ itemId: '', quantity: 1, unitPrice: 0 });
  const [paymentInstallments, setPaymentInstallments] = useState<PurchaseInstallment[]>([]);

  // Fornecedores
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({ 
      name: '', contactName: '', phone: '', 
      cnpj: '', ie: '', email: '', cep: '', address: '', number: '', complement: '', city: '', state: '' 
  });
  const [loadingCep, setLoadingCep] = useState(false);

  // --- Handlers de Receita (Ficha Técnica) ---
  const handleAddIngToRecipe = () => {
      if(!selectedIngToAdd) return;
      const ing = invState.inventory.find(i => i.id === selectedIngToAdd);
      if(ing) {
          setRecipeItems([...recipeItems, { ingredientId: ing.id, qty: 1 }]);
          setSelectedIngToAdd('');
      }
  };

  const calculateRecipeCost = () => {
      return recipeItems.reduce((acc, item) => {
          const ing = invState.inventory.find(i => i.id === item.ingredientId);
          return acc + ((ing?.costPrice || 0) * item.qty);
      }, 0);
  };

  // --- Handlers Principais ---
  const handleSaveInventoryItem = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingInventory || !editingInventory.name) return;
      
      const finalItem: any = { ...editingInventory };
      if (finalItem.type === 'COMPOSITE') {
          finalItem.recipe = recipeItems;
          finalItem.costPrice = calculateRecipeCost();
      }

      if (finalItem.id) await updateInventoryItem(finalItem as InventoryItem);
      else await addInventoryItem(finalItem as InventoryItem);
      
      setEditingInventory(null);
      setRecipeItems([]);
      showAlert({ title: "Sucesso", message: "Item salvo no estoque!", type: 'SUCCESS' });
  };

  const handleAddItemToPurchase = () => {
      const item = invState.inventory.find(i => i.id === tempPurchaseItem.itemId);
      if(!item || tempPurchaseItem.quantity <= 0) return;
      const newItem: PurchaseItemInput = {
          inventoryItemId: item.id,
          quantity: tempPurchaseItem.quantity,
          unitPrice: tempPurchaseItem.unitPrice,
          totalPrice: tempPurchaseItem.quantity * tempPurchaseItem.unitPrice
      };
      setPurchaseForm(prev => ({ ...prev, items: [...prev.items, newItem] }));
      setTempPurchaseItem({ itemId: '', quantity: 1, unitPrice: 0 });
  };

  const handleProcessPurchase = async () => {
      if(!purchaseForm.supplierId || purchaseForm.items.length === 0) return;
      const total = purchaseForm.items.reduce((acc, i) => acc + i.totalPrice, 0) + Number(purchaseForm.taxAmount);
      await processPurchase({
          ...purchaseForm,
          date: new Date(purchaseForm.date),
          totalAmount: total,
          installments: [{ dueDate: new Date(purchaseForm.date), amount: total }]
      });
      setPurchaseModalOpen(false);
      setPurchaseForm({ supplierId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0], items: [], taxAmount: 0, distributeTax: true });
      showAlert({ title: "Sucesso", message: "Nota lançada e estoque atualizado!", type: 'SUCCESS' });
  };

  const handleStockUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!stockModal) return;
      await updateStock(stockModal.itemId, parseFloat(stockModal.quantity), stockModal.type, stockModal.reason);
      setStockModal(null);
      showAlert({ title: "Sucesso", message: "Movimentação registrada!", type: 'SUCCESS' });
  };

  // --- Handlers Fornecedor ---
  const formatCNPJ = (value: string) => {
      return value.replace(/\D/g, '')
          .replace(/^(\d{2})(\d)/, '$1.$2')
          .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
          .replace(/\.(\d{3})(\d)/, '.$1/$2')
          .replace(/(\d{4})(\d)/, '$1-$2')
          .slice(0, 18);
  };

  const formatCEP = (value: string) => {
      return value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);
  };

  const formatPhone = (value: string) => {
      const v = value.replace(/\D/g, '');
      if (v.length > 10) {
          return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
      } else {
          return v.replace(/^(\d{2})(\d{4})(\d{4}).*/, '($1) $2-$3').slice(0, 14);
      }
  };

  const handleCepBlur = async () => {
      const cep = newSupplier.cep?.replace(/\D/g, '');
      if (cep && cep.length === 8) {
          setLoadingCep(true);
          try {
              const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
              const data = await response.json();
              if (!data.erro) {
                  setNewSupplier(prev => ({
                      ...prev,
                      address: data.logradouro,
                      city: data.localidade,
                      state: data.uf,
                  }));
              }
          } catch (error) {
              console.error("Erro ao buscar CEP", error);
          } finally {
              setLoadingCep(false);
          }
      }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newSupplier.name) return;
      try {
          await addSupplier(newSupplier as Supplier);
          setNewSupplier({ name: '', contactName: '', phone: '', cnpj: '', ie: '', email: '', cep: '', address: '', number: '', complement: '', city: '', state: '' });
          showAlert({ title: "Sucesso", message: "Fornecedor cadastrado com sucesso!", type: 'SUCCESS' });
      } catch (error) {
          showAlert({ title: "Erro", message: "Erro ao salvar fornecedor.", type: 'ERROR' });
      }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        {/* Header Principal */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
            <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Archive className="text-orange-500"/> Gestão de Estoque</h2>
                <p className="text-sm text-gray-500">Controle de insumos, revenda e fichas técnicas.</p>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button onClick={() => setPurchaseHistoryOpen(true)} variant="secondary" className="bg-slate-50 text-slate-700 border-slate-200"><FileText size={16}/> Logs</Button>
                <Button onClick={() => setSupplierModalOpen(true)} variant="secondary" className="bg-slate-50 text-slate-700 border-slate-200"><Truck size={16}/> Fornecedores</Button>
                <Button onClick={() => setPurchaseModalOpen(true)} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100"><Plus size={16}/> Entrada Nota</Button>
                <Button onClick={() => setInventoryModalOpen(true)} variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-100"><ClipboardList size={16}/> Balanço</Button>
                <Button onClick={() => { setEditingInventory({ name: '', unit: 'UN', type: 'INGREDIENT', quantity: 0, minQuantity: 5, costPrice: 0, isExtra: false }); setRecipeItems([]); }} className="shadow-lg shadow-blue-100"><Plus size={16}/> Novo Item</Button>
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
                        {invState.inventory.map(item => (
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
                                    {item.type === 'COMPOSITE' ? '---' : item.quantity.toFixed(item.unit === 'UN' ? 0 : 2)}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="text-sm font-black text-emerald-600">R$ {item.costPrice.toFixed(2)}</div>
                                    <div className="text-[9px] text-slate-400 uppercase font-bold">Custo Unit.</div>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEditingInventory(item); setRecipeItems(item.recipe?.map(r=>({ingredientId: r.ingredientId, qty: r.quantity})) || []); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={18}/></button>
                                        {item.type !== 'COMPOSITE' && (
                                            <>
                                                <button onClick={() => setStockModal({ itemId: item.id, type: 'IN', quantity: '', reason: '' })} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><Plus size={18}/></button>
                                                <button onClick={() => setStockModal({ itemId: item.id, type: 'OUT', quantity: '', reason: '' })} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><ArrowDown size={18}/></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* MODAL: CADASTRO DE ITEM (COM FICHA TÉCNICA) */}
        {editingInventory && (
            <Modal isOpen={!!editingInventory} onClose={() => setEditingInventory(null)} title={editingInventory.id ? "Editar Item" : "Novo Item de Estoque"} variant="page">
                <form onSubmit={handleSaveInventoryItem} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">1. Identificação</h4>
                                <div className="space-y-4">
                                    <div><label className="block text-xs font-bold mb-1">Nome do Item</label><input required className="w-full border-2 p-3 rounded-xl focus:border-blue-500 outline-none" value={editingInventory.name} onChange={e => setEditingInventory({...editingInventory!, name: e.target.value})} placeholder="Ex: Filé de Frango, Coca-Cola 350ml" /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-bold mb-1">Tipo de Item</label><select className="w-full border-2 p-3 rounded-xl bg-white" value={editingInventory.type} onChange={e => setEditingInventory({...editingInventory!, type: e.target.value as InventoryType})}><option value="INGREDIENT">Matéria Prima</option><option value="RESALE">Revenda</option><option value="COMPOSITE">Ficha Técnica (Produzido)</option></select></div>
                                        <div><label className="block text-xs font-bold mb-1">Unidade</label><select className="w-full border-2 p-3 rounded-xl bg-white" value={editingInventory.unit} onChange={e => setEditingInventory({...editingInventory!, unit: e.target.value})}><option value="UN">UN</option><option value="KG">KG</option><option value="LT">LT</option><option value="GR">GR</option></select></div>
                                    </div>
                                </div>
                            </div>

                            {editingInventory.type === 'COMPOSITE' && (
                                <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                                    <h4 className="text-xs font-black text-purple-700 uppercase tracking-widest mb-4 flex items-center gap-2"><Layers size={14}/> 2. Composição da Ficha Técnica</h4>
                                    <div className="flex gap-2 mb-4">
                                        <select className="flex-1 border-2 p-2 rounded-xl text-sm bg-white" value={selectedIngToAdd} onChange={e => setSelectedIngToAdd(e.target.value)}>
                                            <option value="">Escolher Ingrediente...</option>
                                            {invState.inventory.filter(i=>i.type==='INGREDIENT').map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                                        </select>
                                        <Button type="button" onClick={handleAddIngToRecipe} variant="secondary" className="bg-purple-600 text-white hover:bg-purple-700"><Plus size={18}/></Button>
                                    </div>
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {recipeItems.map((step, idx) => {
                                            const ing = invState.inventory.find(i => i.id === step.ingredientId);
                                            return (
                                                <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-purple-100 shadow-sm">
                                                    <div className="flex-1 min-w-0 pr-2">
                                                        <div className="font-bold text-slate-800 text-sm truncate">{ing?.name}</div>
                                                        <div className="text-[10px] text-slate-400">Custo unitário: R$ {ing?.costPrice.toFixed(2)} / {ing?.unit}</div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input type="number" step="0.001" className="w-20 border-2 p-1 rounded-lg text-right font-bold" value={step.qty} onChange={e => {
                                                            const n = [...recipeItems]; n[idx].qty = parseFloat(e.target.value); setRecipeItems(n);
                                                        }} />
                                                        <button type="button" onClick={() => setRecipeItems(recipeItems.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1"><X size={16}/></button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {recipeItems.length === 0 && <p className="text-center py-4 text-purple-300 text-xs italic">Nenhum ingrediente adicionado.</p>}
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-purple-200 flex justify-between items-center">
                                        <span className="text-xs font-bold text-purple-700 uppercase">Custo Total Calculado:</span>
                                        <span className="text-lg font-black text-purple-900">R$ {calculateRecipeCost().toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                            
                            <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 flex justify-between items-center">
                                <div className="pr-4">
                                    <h4 className="text-xs font-black text-orange-700 uppercase tracking-widest mb-1">Adicional de Venda</h4>
                                    <p className="text-[10px] text-orange-600 font-medium">Permite oferecer este item como opcional pago no cardápio.</p>
                                </div>
                                <button type="button" onClick={() => setEditingInventory({...editingInventory!, isExtra: !editingInventory!.isExtra})} className={`p-2 rounded-xl transition-all ${editingInventory.isExtra ? 'bg-orange-600 text-white shadow-lg' : 'bg-white border text-slate-200'}`}>
                                    {editingInventory.isExtra ? <CheckSquare size={24}/> : <Square size={24}/>}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">3. Financeiro e Alertas</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold mb-1">Custo Médio (R$)</label>
                                        <input type="number" step="0.01" className={`w-full border-2 p-3 rounded-xl font-bold text-emerald-600 ${editingInventory.type === 'COMPOSITE' ? 'bg-gray-50' : ''}`} value={editingInventory.type === 'COMPOSITE' ? calculateRecipeCost() : editingInventory.costPrice} onChange={e => setEditingInventory({...editingInventory!, costPrice: parseFloat(e.target.value)})} disabled={editingInventory.type === 'COMPOSITE'} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1">Estoque Mínimo</label>
                                        <input type="number" className="w-full border-2 p-3 rounded-xl font-bold text-red-600" value={editingInventory.minQuantity} onChange={e => setEditingInventory({...editingInventory!, minQuantity: parseFloat(e.target.value)})} />
                                    </div>
                                </div>
                                {!editingInventory.id && editingInventory.type !== 'COMPOSITE' && (
                                    <div className="mt-4">
                                        <label className="block text-xs font-bold mb-1 text-blue-600 uppercase">Estoque Inicial</label>
                                        <input type="number" step="0.001" className="w-full border-2 border-blue-100 p-3 rounded-xl font-bold bg-blue-50" value={editingInventory.quantity} onChange={e => setEditingInventory({...editingInventory!, quantity: parseFloat(e.target.value)})} />
                                    </div>
                                )}
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">4. Imagem do Produto</h4>
                                <ImageUploader value={editingInventory.image || ''} onChange={(val) => setEditingInventory({...editingInventory!, image: val})} maxSizeKB={250} />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4 pt-6 border-t">
                        <Button type="button" variant="secondary" onClick={() => setEditingInventory(null)} className="flex-1 py-4">Cancelar</Button>
                        <Button type="submit" className="flex-1 py-4 shadow-xl">Salvar Item de Estoque</Button>
                    </div>
                </form>
            </Modal>
        )}

        {/* MODAL: ENTRADA DE NOTA */}
        {purchaseModalOpen && (
            <Modal isOpen={purchaseModalOpen} onClose={() => setPurchaseModalOpen(false)} title="Lançamento de Nota Fiscal" variant="page">
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase px-1">Fornecedor</label>
                            <select className="w-full border-2 p-3 rounded-xl bg-white focus:border-blue-500 outline-none" value={purchaseForm.supplierId} onChange={e => setPurchaseForm({...purchaseForm, supplierId: e.target.value})}>
                                <option value="">Selecione...</option>
                                {invState.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase px-1">Número da Nota</label>
                            <input className="w-full border-2 p-3 rounded-xl" placeholder="000.000.000" value={purchaseForm.invoiceNumber} onChange={e => setPurchaseForm({...purchaseForm, invoiceNumber: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase px-1">Data de Emissão</label>
                            <input type="date" className="w-full border-2 p-3 rounded-xl" value={purchaseForm.date} onChange={e => setPurchaseForm({...purchaseForm, date: e.target.value})} />
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Plus size={16} className="text-blue-600"/> Adicionar Itens</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">Insumo</label>
                                <select className="w-full border-2 p-2.5 rounded-xl bg-white text-sm" value={tempPurchaseItem.itemId} onChange={e => setTempPurchaseItem({...tempPurchaseItem, itemId: e.target.value})}>
                                    <option value="">Selecione um insumo...</option>
                                    {invState.inventory.filter(i=>i.type!=='COMPOSITE').map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">Qtd Comprada</label>
                                <input type="number" step="0.001" className="w-full border-2 p-2.5 rounded-xl" value={tempPurchaseItem.quantity} onChange={e => setTempPurchaseItem({...tempPurchaseItem, quantity: parseFloat(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">Preço Un. (R$)</label>
                                <input type="number" step="0.01" className="w-full border-2 p-2.5 rounded-xl" value={tempPurchaseItem.unitPrice} onChange={e => setTempPurchaseItem({...tempPurchaseItem, unitPrice: parseFloat(e.target.value)})} />
                            </div>
                        </div>
                        <Button onClick={handleAddItemToPurchase} variant="secondary" className="mt-4"><Plus size={16}/> Adicionar Item</Button>
                    </div>

                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900 text-white"><tr><th className="p-3">Item</th><th className="p-3 text-right">Qtd</th><th className="p-3 text-right">Preço Un.</th><th className="p-3 text-right">Total</th><th className="p-3 text-center">Ações</th></tr></thead>
                        <tbody className="divide-y">{purchaseForm.items.map((it, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-3 font-bold">{invState.inventory.find(i=>i.id===it.inventoryItemId)?.name}</td>
                                <td className="p-3 text-right font-mono">{it.quantity}</td>
                                <td className="p-3 text-right font-mono">R$ {it.unitPrice.toFixed(2)}</td>
                                <td className="p-3 text-right font-black text-blue-600">R$ {it.totalPrice.toFixed(2)}</td>
                                <td className="p-3 text-center"><button onClick={() => setPurchaseForm({...purchaseForm, items: purchaseForm.items.filter((_,i)=>i!==idx)})} className="text-red-400 p-1"><Trash2 size={16}/></button></td>
                            </tr>
                        ))}</tbody>
                    </table>

                    <div className="flex flex-col md:flex-row justify-between items-end border-t pt-6 gap-6">
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 w-full md:w-80">
                            <div className="flex justify-between items-center text-sm mb-2"><span className="text-blue-600 font-bold">Total Produtos:</span><span className="font-bold">R$ {purchaseForm.items.reduce((acc, i) => acc + i.totalPrice, 0).toFixed(2)}</span></div>
                            <div className="flex justify-between items-center text-xl font-black text-blue-800 pt-2 border-t border-blue-200"><span>TOTAL NOTA:</span><span>R$ {purchaseForm.items.reduce((acc, i) => acc + i.totalPrice, 0).toFixed(2)}</span></div>
                        </div>
                        <div className="flex gap-4 w-full md:w-auto">
                            <Button variant="secondary" onClick={() => setPurchaseModalOpen(false)} className="flex-1 px-8 py-4">Cancelar</Button>
                            <Button onClick={handleProcessPurchase} className="flex-1 px-8 py-4 shadow-xl">Confirmar Lançamento</Button>
                        </div>
                    </div>
                </div>
            </Modal>
        )}

        {/* MODAL: MOVIMENTAÇÃO MANUAL */}
        {stockModal && (
            <Modal isOpen={!!stockModal} onClose={() => setStockModal(null)} title={stockModal.type === 'IN' ? 'Entrada Manual' : 'Saída Manual / Perda'} variant="dialog" maxWidth="sm">
                <form onSubmit={handleStockUpdate} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-1">Quantidade</label>
                        <input type="number" step="0.001" className="w-full border-2 p-3 rounded-xl font-bold text-center text-2xl focus:border-blue-500 outline-none" value={stockModal.quantity} onChange={e => setStockModal({...stockModal, quantity: e.target.value})} autoFocus />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-1">Motivo / Justificativa</label>
                        <input className="w-full border-2 p-3 rounded-xl text-sm focus:border-blue-500 outline-none" placeholder="Ex: Ajuste de quebra, Bonificação..." value={stockModal.reason} onChange={e => setStockModal({...stockModal, reason: e.target.value})} />
                    </div>
                    <Button type="submit" className="w-full py-4 text-lg">Confirmar Ajuste</Button>
                </form>
            </Modal>
        )}

        {/* MODAL: FORNECEDORES */}
        {supplierModalOpen && (
            <Modal isOpen={supplierModalOpen} onClose={() => setSupplierModalOpen(false)} title="Gestão de Fornecedores" variant="page">
                <div className="space-y-8">
                    <form onSubmit={handleAddSupplier} className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Novo Fornecedor</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold mb-1 uppercase text-slate-500">Razão Social / Nome Fantasia *</label>
                                <input required placeholder="Ex: Distribuidora Silva LTDA" className="border-2 p-2.5 rounded-xl w-full focus:border-blue-500 outline-none" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 uppercase text-slate-500">CNPJ</label>
                                <input placeholder="00.000.000/0000-00" className="border-2 p-2.5 rounded-xl w-full" value={newSupplier.cnpj} onChange={e => setNewSupplier({...newSupplier, cnpj: formatCNPJ(e.target.value)})} maxLength={18} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 uppercase text-slate-500">Inscrição Estadual</label>
                                <input placeholder="Isento ou Número" className="border-2 p-2.5 rounded-xl w-full" value={newSupplier.ie} onChange={e => setNewSupplier({...newSupplier, ie: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 uppercase text-slate-500">Nome Contato</label>
                                <div className="relative">
                                    <UserIcon size={14} className="absolute left-3 top-3.5 text-gray-400"/>
                                    <input placeholder="Ex: João" className="border-2 p-2.5 pl-9 rounded-xl w-full" value={newSupplier.contactName} onChange={e => setNewSupplier({...newSupplier, contactName: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 uppercase text-slate-500">Telefone / WhatsApp</label>
                                <div className="relative">
                                    <Phone size={14} className="absolute left-3 top-3.5 text-gray-400"/>
                                    <input placeholder="(00) 00000-0000" className="border-2 p-2.5 pl-9 rounded-xl w-full" value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: formatPhone(e.target.value)})} />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold mb-1 uppercase text-slate-500">E-mail</label>
                                <input type="email" placeholder="contato@fornecedor.com" className="border-2 p-2.5 rounded-xl w-full" value={newSupplier.email} onChange={e => setNewSupplier({...newSupplier, email: e.target.value})} />
                            </div>
                        </div>
                        <div className="border-t pt-4 mt-2">
                            <h5 className="text-xs font-bold text-gray-500 mb-3 uppercase flex items-center gap-1"><MapPin size={12}/> Endereço</h5>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div className="md:col-span-1">
                                    <label className="block text-[10px] font-bold mb-1 uppercase text-slate-400">CEP</label>
                                    <div className="relative">
                                        <input 
                                            placeholder="00000-000" 
                                            className={`border-2 p-2.5 rounded-xl w-full text-sm ${loadingCep ? 'bg-gray-100' : ''}`}
                                            value={newSupplier.cep} 
                                            onChange={e => setNewSupplier({...newSupplier, cep: formatCEP(e.target.value)})}
                                            onBlur={handleCepBlur}
                                            maxLength={9}
                                        />
                                        {loadingCep && <Loader2 size={14} className="absolute right-3 top-3 animate-spin text-blue-500"/>}
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-bold mb-1 uppercase text-slate-400">Logradouro</label>
                                    <input className="border-2 p-2.5 rounded-xl w-full text-sm bg-gray-50" value={newSupplier.address} onChange={e => setNewSupplier({...newSupplier, address: e.target.value})} />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-[10px] font-bold mb-1 uppercase text-slate-400">Número</label>
                                    <input className="border-2 p-2.5 rounded-xl w-full text-sm" value={newSupplier.number} onChange={e => setNewSupplier({...newSupplier, number: e.target.value})} />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-[10px] font-bold mb-1 uppercase text-slate-400">Complemento</label>
                                    <input className="border-2 p-2.5 rounded-xl w-full text-sm" value={newSupplier.complement} onChange={e => setNewSupplier({...newSupplier, complement: e.target.value})} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-bold mb-1 uppercase text-slate-400">Cidade</label>
                                    <input className="border-2 p-2.5 rounded-xl w-full text-sm bg-gray-50" value={newSupplier.city} onChange={e => setNewSupplier({...newSupplier, city: e.target.value})} />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-[10px] font-bold mb-1 uppercase text-slate-400">UF</label>
                                    <input className="border-2 p-2.5 rounded-xl w-full text-sm bg-gray-50" maxLength={2} value={newSupplier.state} onChange={e => setNewSupplier({...newSupplier, state: e.target.value.toUpperCase()})} />
                                </div>
                            </div>
                        </div>
                        <Button size="lg" type="submit" className="w-full mt-4 py-3 font-bold shadow-md">Salvar Fornecedor</Button>
                    </form>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {invState.suppliers.map(s => (
                            <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-colors group relative">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-slate-800 leading-tight pr-6">{s.name}</h4>
                                        <button onClick={() => deleteSupplier(s.id)} className="text-red-300 hover:text-red-500 absolute top-4 right-4 p-1 rounded-full hover:bg-red-50 transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-2"><Phone size={12}/> {s.phone || 'Sem telefone'}</div>
                                    <div className="text-xs text-slate-400 flex items-center gap-2 truncate"><FileText size={12}/> {s.cnpj || 'Sem CNPJ'}</div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-2 truncate mt-1 pt-1 border-t"><MapPin size={10}/> {s.city && s.state ? `${s.city}-${s.state}` : 'Sem endereço'}</div>
                                </div>
                            </div>
                        ))}
                        {invState.suppliers.length === 0 && (
                            <div className="col-span-full text-center py-10 text-gray-400 bg-slate-50 rounded-xl border-2 border-dashed">
                                <p>Nenhum fornecedor cadastrado.</p>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        )}
    </div>
  );
};
