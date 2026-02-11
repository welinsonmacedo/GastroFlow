
import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { ImageUploader } from '../../components/ImageUploader';
import { Modal } from '../../components/Modal';
import { InventoryItem, InventoryType, Supplier, PurchaseItemInput, PurchaseInstallment } from '../../types';
// Added missing icons: Package, Archive, AlertTriangle
import { Plus, Trash2, Edit, ArrowDown, Layers, ClipboardList, FileText, Truck, X, Star, CheckSquare, Square, Info, Search, Loader2, MapPin, Phone, User as UserIcon, Calendar, Filter, Package, Archive, AlertTriangle } from 'lucide-react';

export const AdminInventory: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: invState, addInventoryItem, updateInventoryItem, updateStock, processInventoryAdjustment, addSupplier, deleteSupplier, processPurchase } = useInventory();
  const { showAlert, showConfirm } = useUI();
  
  // Modals e Estados
  const [editingInventory, setEditingInventory] = useState<Partial<InventoryItem> | null>(null);
  const [invRecipeStep, setInvRecipeStep] = useState<{ ingredientId: string, qty: number }[]>([]);
  const [selectedIngredientAdd, setSelectedIngredientAdd] = useState('');
  const [stockModal, setStockModal] = useState<{ itemId: string, type: 'IN' | 'OUT', quantity: string, reason: string } | null>(null);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [inventoryCounts, setInventoryCounts] = useState<{ [key: string]: number }>({});
  
  // Estados de Compra (Entrada de Nota)
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseHistoryOpen, setPurchaseHistoryOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({ supplierId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0], items: [] as PurchaseItemInput[], taxAmount: 0, distributeTax: true });
  const [tempPurchaseItem, setTempPurchaseItem] = useState({ itemId: '', quantity: 1, unitPrice: 0 });
  const [paymentInstallments, setPaymentInstallments] = useState<PurchaseInstallment[]>([]);
  const [installmentsCount, setInstallmentsCount] = useState(1);

  // Estados de Fornecedor
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({ name: '', phone: '', email: '', city: '', state: '' });

  // --- Handlers de Fornecedor ---
  const handleAddSupplier = async (e: React.FormEvent) => {
      e.preventDefault();
      await addSupplier(newSupplier as Supplier);
      setNewSupplier({ name: '', phone: '', email: '', city: '', state: '' });
      showAlert({ title: "Sucesso", message: "Fornecedor cadastrado!", type: 'SUCCESS' });
  };

  // --- Handlers de Entrada de Nota ---
  const handleAddItemToPurchase = () => {
      const item = invState.inventory.find(i => i.id === tempPurchaseItem.itemId);
      if(!item) return;
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
      await processPurchase({
          ...purchaseForm,
          date: new Date(purchaseForm.date),
          totalAmount: purchaseForm.items.reduce((acc, i) => acc + i.totalPrice, 0) + purchaseForm.taxAmount,
          installments: paymentInstallments.length > 0 ? paymentInstallments : [{ dueDate: new Date(purchaseForm.date), amount: purchaseForm.items.reduce((acc, i) => acc + i.totalPrice, 0) + purchaseForm.taxAmount }]
      });
      setPurchaseModalOpen(false);
      setPurchaseForm({ supplierId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0], items: [], taxAmount: 0, distributeTax: true });
      showAlert({ title: "Sucesso", message: "Nota lançada e estoque atualizado!", type: 'SUCCESS' });
  };

  // --- Handlers de Estoque ---
  const handleSaveInventoryItem = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingInventory || !editingInventory.name) return;
      const finalItem: any = { ...editingInventory };
      if (finalItem.id) await updateInventoryItem(finalItem as InventoryItem);
      else await addInventoryItem({ ...finalItem, isExtra: finalItem.isExtra || false } as InventoryItem);
      setEditingInventory(null);
      showAlert({ title: "Sucesso", message: "Item salvo!", type: 'SUCCESS' });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        {/* Header Principal */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
            <div>
                {/* Fixed missing Package icon import */}
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Package className="text-orange-500"/> Gestão de Estoque</h2>
                <p className="text-sm text-gray-500">Insumos, fichas técnicas e suprimentos.</p>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button onClick={() => setPurchaseHistoryOpen(true)} variant="secondary" className="bg-slate-50 text-slate-700 border-slate-200"><FileText size={16}/> Logs</Button>
                <Button onClick={() => setSupplierModalOpen(true)} variant="secondary" className="bg-slate-50 text-slate-700 border-slate-200"><Truck size={16}/> Fornecedores</Button>
                <Button onClick={() => setPurchaseModalOpen(true)} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100"><Plus size={16}/> Entrada Nota</Button>
                <Button onClick={() => setInventoryModalOpen(true)} variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-100"><ClipboardList size={16}/> Balanço</Button>
                <Button onClick={() => setEditingInventory({ name: '', unit: 'UN', type: 'INGREDIENT', quantity: 0, minQuantity: 5, costPrice: 0, isExtra: false })} className="shadow-lg shadow-blue-100"><Plus size={16}/> Novo Item</Button>
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
                                            {/* Fixed missing Archive icon import */}
                                            {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <Archive className="text-slate-400" size={20}/>}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 flex items-center gap-2">
                                                {item.name}
                                                {item.isExtra && <span className="bg-amber-100 text-amber-700 text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase">Adicional</span>}
                                            </div>
                                            {/* Fixed missing AlertTriangle icon import */}
                                            {item.quantity <= item.minQuantity && <span className="text-[9px] text-red-500 font-bold flex items-center gap-1 uppercase"><AlertTriangle size={10}/> Abaixo do Mínimo ({item.minQuantity})</span>}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${item.type === 'INGREDIENT' ? 'bg-orange-50 text-orange-600' : item.type === 'RESALE' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                        {item.type === 'INGREDIENT' ? 'MATÉRIA PRIMA' : item.type === 'RESALE' ? 'REVENDA' : 'PRODUZIDO'}
                                    </span>
                                </td>
                                <td className="p-4 text-center text-sm font-medium text-slate-400">{item.unit}</td>
                                <td className={`p-4 text-right font-mono font-bold text-lg ${item.quantity <= item.minQuantity ? 'text-red-600' : 'text-slate-700'}`}>
                                    {item.quantity.toFixed(item.unit === 'UN' ? 0 : 3)}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="text-sm font-black text-emerald-600">R$ {item.costPrice.toFixed(2)}</div>
                                    <div className="text-[9px] text-slate-400 uppercase font-bold">Última Compra</div>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingInventory(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={18}/></button>
                                        <button onClick={() => setStockModal({ itemId: item.id, type: 'IN', quantity: '', reason: '' })} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><Plus size={18}/></button>
                                        <button onClick={() => setStockModal({ itemId: item.id, type: 'OUT', quantity: '', reason: '' })} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><ArrowDown size={18}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* MODAL: CADASTRO DE ITEM (Restaurado) */}
        {editingInventory && (
            <Modal isOpen={!!editingInventory} onClose={() => setEditingInventory(null)} title={editingInventory.id ? "Editar Insumo" : "Novo Item de Estoque"} variant="page">
                <form onSubmit={handleSaveInventoryItem} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">1. Identificação</h4>
                                <div className="space-y-4">
                                    <div><label className="block text-xs font-bold mb-1">Nome do Item</label><input required className="w-full border-2 p-3 rounded-xl focus:border-blue-500 outline-none" value={editingInventory.name} onChange={e => setEditingInventory({...editingInventory!, name: e.target.value})} placeholder="Ex: Filé de Frango, Coca-Cola 350ml" /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-bold mb-1">Tipo</label><select className="w-full border-2 p-3 rounded-xl bg-white" value={editingInventory.type} onChange={e => setEditingInventory({...editingInventory!, type: e.target.value as InventoryType})}><option value="INGREDIENT">Matéria Prima</option><option value="RESALE">Revenda</option><option value="COMPOSITE">Ficha Técnica (Produzido)</option></select></div>
                                        <div><label className="block text-xs font-bold mb-1">Unidade</label><select className="w-full border-2 p-3 rounded-xl bg-white" value={editingInventory.unit} onChange={e => setEditingInventory({...editingInventory!, unit: e.target.value})}><option value="UN">UN</option><option value="KG">KG</option><option value="LT">LT</option><option value="GR">GR</option></select></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-black text-orange-700 uppercase tracking-widest">2. Adicional de Venda</h4>
                                    <button type="button" onClick={() => setEditingInventory({...editingInventory!, isExtra: !editingInventory!.isExtra})} className={`p-1 rounded-md ${editingInventory.isExtra ? 'bg-orange-600 text-white' : 'bg-white border text-slate-300'}`}>{editingInventory.isExtra ? <CheckSquare size={20}/> : <Square size={20}/>}</button>
                                </div>
                                <p className="text-[10px] text-orange-600 font-medium leading-relaxed">Marque esta option se este insumo pode ser oferecido como opcional (ex: Queijo Extra, Bacon) no cardápio digital do cliente.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">3. Custos e Alertas</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold mb-1">Custo Unitário (R$)</label><input type="number" step="0.01" className="w-full border-2 p-3 rounded-xl font-bold text-emerald-600" value={editingInventory.costPrice} onChange={e => setEditingInventory({...editingInventory!, costPrice: parseFloat(e.target.value)})} /></div>
                                    <div><label className="block text-xs font-bold mb-1">Estoque Mínimo</label><input type="number" className="w-full border-2 p-3 rounded-xl font-bold text-red-600" value={editingInventory.minQuantity} onChange={e => setEditingInventory({...editingInventory!, minQuantity: parseFloat(e.target.value)})} /></div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">4. Imagem do Insumo</h4>
                                <ImageUploader value={editingInventory.image || ''} onChange={(val) => setEditingInventory({...editingInventory!, image: val})} maxSizeKB={200} />
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

        {/* MODAL: ENTRADA DE NOTA (Restaurado) */}
        {purchaseModalOpen && (
            <Modal isOpen={purchaseModalOpen} onClose={() => setPurchaseModalOpen(false)} title="Lançamento de Nota Fiscal" variant="page">
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><label className="block text-xs font-bold mb-1">Fornecedor</label><select className="w-full border-2 p-3 rounded-xl" value={purchaseForm.supplierId} onChange={e => setPurchaseForm({...purchaseForm, supplierId: e.target.value})}><option value="">Selecione...</option>{invState.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                        <div><label className="block text-xs font-bold mb-1">Número da Nota</label><input className="w-full border-2 p-3 rounded-xl" placeholder="000.000.000" value={purchaseForm.invoiceNumber} onChange={e => setPurchaseForm({...purchaseForm, invoiceNumber: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold mb-1">Data de Emissão</label><input type="date" className="w-full border-2 p-3 rounded-xl" value={purchaseForm.date} onChange={e => setPurchaseForm({...purchaseForm, date: e.target.value})} /></div>
                    </div>
                    
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <h4 className="text-sm font-bold mb-4 flex items-center gap-2"><Plus size={16} className="text-blue-600"/> Adicionar Itens da Nota</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                            <div className="md:col-span-2"><select className="w-full border-2 p-2.5 rounded-xl text-sm" value={tempPurchaseItem.itemId} onChange={e => setTempPurchaseItem({...tempPurchaseItem, itemId: e.target.value})}><option value="">Selecione o Insumo...</option>{invState.inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</select></div>
                            <div><input type="number" className="w-full border-2 p-2.5 rounded-xl text-sm" placeholder="Qtd" value={tempPurchaseItem.quantity} onChange={e => setTempPurchaseItem({...tempPurchaseItem, quantity: parseFloat(e.target.value)})} /></div>
                            <div><input type="number" className="w-full border-2 p-2.5 rounded-xl text-sm" placeholder="Preço Un." value={tempPurchaseItem.unitPrice} onChange={e => setTempPurchaseItem({...tempPurchaseItem, unitPrice: parseFloat(e.target.value)})} /></div>
                        </div>
                        <Button onClick={handleAddItemToPurchase} className="mt-4 w-full md:w-auto" variant="secondary"><Plus size={16}/> Adicionar Item</Button>
                    </div>

                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 font-black uppercase text-[10px] text-slate-500"><tr><th className="p-3">Item</th><th className="p-3 text-right">Qtd</th><th className="p-3 text-right">Unitário</th><th className="p-3 text-right">Total</th></tr></thead>
                        <tbody className="divide-y">{purchaseForm.items.map((it, idx) => (<tr key={idx}>
                            <td className="p-3 font-bold">{invState.inventory.find(i=>i.id===it.inventoryItemId)?.name}</td>
                            <td className="p-3 text-right font-mono">{it.quantity}</td>
                            <td className="p-3 text-right font-mono">R$ {it.unitPrice.toFixed(2)}</td>
                            <td className="p-3 text-right font-black">R$ {it.totalPrice.toFixed(2)}</td>
                        </tr>))}</tbody>
                    </table>

                    <div className="flex flex-col md:flex-row gap-4 justify-between items-end border-t pt-6">
                        <div className="w-full md:w-64 space-y-2">
                             <div className="flex justify-between text-lg font-black"><span>Total Geral:</span> <span className="text-blue-600">R$ {purchaseForm.items.reduce((acc, i) => acc + i.totalPrice, 0).toFixed(2)}</span></div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <Button variant="secondary" onClick={() => setPurchaseModalOpen(false)} className="flex-1 md:flex-none">Cancelar</Button>
                            <Button onClick={handleProcessPurchase} className="flex-1 md:flex-none">Confirmar Lançamento</Button>
                        </div>
                    </div>
                </div>
            </Modal>
        )}

        {/* MODAL: GESTÃO DE FORNECEDORES (Restaurado) */}
        {supplierModalOpen && (
            <Modal isOpen={supplierModalOpen} onClose={() => setSupplierModalOpen(false)} title="Fornecedores" variant="page">
                <div className="space-y-6">
                    <form onSubmit={handleAddSupplier} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <input className="md:col-span-1 border-2 p-2 rounded-lg text-sm" placeholder="Nome Fantasia" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} required />
                        <input className="border-2 p-2 rounded-lg text-sm" placeholder="WhatsApp" value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} />
                        <input className="border-2 p-2 rounded-lg text-sm" placeholder="E-mail" value={newSupplier.email} onChange={e => setNewSupplier({...newSupplier, email: e.target.value})} />
                        <Button type="submit" size="sm">Cadastrar</Button>
                    </form>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {invState.suppliers.map(s => (
                            <div key={s.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex justify-between items-start">
                                <div><h4 className="font-bold text-slate-800">{s.name}</h4><p className="text-xs text-slate-400">{s.phone}</p></div>
                                <button onClick={() => deleteSupplier(s.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
        )}
    </div>
  );
};
