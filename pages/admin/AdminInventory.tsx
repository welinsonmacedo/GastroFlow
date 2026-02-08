import React, { useState } from 'react';
import { useRestaurant, InventoryLog } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { ImageUploader } from '../../components/ImageUploader';
import { InventoryItem, PurchaseItemInput, PurchaseInstallment, Supplier } from '../../types';
import { Package, FileText, Truck, ClipboardList, Plus, Info, Layers, Trash2, Edit, ArrowDown, MapPin, Loader2, Phone, User as UserIcon, AlertTriangle } from 'lucide-react';

export const AdminInventory: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { showAlert, showConfirm } = useUI();
  const { planLimits } = state;

  // --- States ---
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseHistoryOpen, setPurchaseHistoryOpen] = useState(false);
  const [editingInventory, setEditingInventory] = useState<Partial<InventoryItem> | null>(null);
  const [stockModal, setStockModal] = useState<{ itemId: string, type: 'IN' | 'OUT', quantity: string, reason: string } | null>(null);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  
  // Forms
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({ name: '', contactName: '', phone: '', cnpj: '', ie: '', email: '', cep: '', address: '', number: '', complement: '', city: '', state: '' });
  const [loadingCep, setLoadingCep] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState<{ supplierId: string; invoiceNumber: string; date: string; items: PurchaseItemInput[]; taxAmount: number; distributeTax: boolean; }>({ supplierId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0], items: [], taxAmount: 0, distributeTax: true });
  const [tempPurchaseItem, setTempPurchaseItem] = useState({ itemId: '', quantity: 1, unitPrice: 0 });
  const [paymentInstallments, setPaymentInstallments] = useState<PurchaseInstallment[]>([]);
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [invRecipeStep, setInvRecipeStep] = useState<{ ingredientId: string, qty: number }[]>([]);
  const [selectedIngredientAdd, setSelectedIngredientAdd] = useState('');
  const [inventoryCounts, setInventoryCounts] = useState<{ [key: string]: number }>({});

  const purchaseItemsTotal = purchaseForm.items.reduce((acc, i) => acc + i.totalPrice, 0);

  // --- Handlers (Stock Item) ---
  const handleSaveInventoryItem = (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingInventory || !editingInventory.name) return;
      const finalItem: any = { ...editingInventory };
      if (finalItem.type === 'COMPOSITE') {
          finalItem.recipe = invRecipeStep;
          const cost = invRecipeStep.reduce((acc, step) => {
              const ing = state.inventory.find(i => i.id === step.ingredientId);
              return acc + ((ing?.costPrice || 0) * step.qty);
          }, 0);
          finalItem.costPrice = cost;
      }
      dispatch({ type: 'ADD_INVENTORY_ITEM', item: finalItem as InventoryItem });
      setEditingInventory(null);
      setInvRecipeStep([]);
      showAlert({ title: "Sucesso", message: "Item cadastrado!", type: 'SUCCESS' });
  };

  const handleStockUpdate = (e: React.FormEvent) => {
      e.preventDefault();
      if(!stockModal) return;
      dispatch({ type: 'UPDATE_STOCK', itemId: stockModal.itemId, operation: stockModal.type, quantity: parseFloat(stockModal.quantity), reason: stockModal.reason });
      setStockModal(null);
      showAlert({ title: "Sucesso", message: "Movimentação registrada!", type: 'SUCCESS' });
  };

  const handleAddIngredientToRecipe = () => {
      if(!selectedIngredientAdd) return;
      const ing = state.inventory.find(i => i.id === selectedIngredientAdd);
      if(ing) {
          setInvRecipeStep([...invRecipeStep, { ingredientId: ing.id, qty: 1 }]);
          setSelectedIngredientAdd('');
      }
  };

  // --- Handlers (Supplier) ---
  const formatCNPJ = (value: string) => value.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 18);
  const formatCEP = (value: string) => value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);
  const formatPhone = (value: string) => { const v = value.replace(/\D/g, ''); return v.length > 10 ? v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3') : v.replace(/^(\d{2})(\d{4})(\d{4}).*/, '($1) $2-$3').slice(0, 14); };

  const handleCepBlur = async () => {
      const cep = newSupplier.cep?.replace(/\D/g, '');
      if (cep && cep.length === 8) {
          setLoadingCep(true);
          try {
              const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
              const data = await response.json();
              if (!data.erro) setNewSupplier(prev => ({ ...prev, address: data.logradouro, city: data.localidade, state: data.uf }));
          } catch (error) { console.error(error); } finally { setLoadingCep(false); }
      }
  };

  const handleAddSupplier = (e: React.FormEvent) => {
      e.preventDefault();
      if(!newSupplier.name) return;
      dispatch({ type: 'ADD_SUPPLIER', supplier: { ...newSupplier, id: '' } as Supplier });
      setNewSupplier({ name: '', contactName: '', phone: '', cnpj: '', ie: '', email: '', cep: '', address: '', number: '', complement: '', city: '', state: '' });
      showAlert({ title: "Sucesso", message: "Fornecedor adicionado!", type: 'SUCCESS' });
  };

  const handleDeleteSupplier = (id: string) => {
      showConfirm({
          title: "Excluir Fornecedor",
          message: "Confirma a exclusão deste fornecedor?",
          type: 'WARNING',
          onConfirm: () => dispatch({ type: 'DELETE_SUPPLIER', supplierId: id })
      });
  };

  // --- Handlers (Purchase) ---
  const handleAddItemToPurchase = () => {
      if (!tempPurchaseItem.itemId || tempPurchaseItem.quantity <= 0) return;
      const item = state.inventory.find(i => i.id === tempPurchaseItem.itemId);
      if(!item) return;
      setPurchaseForm(prev => ({ ...prev, items: [...prev.items, { inventoryItemId: item.id, quantity: Number(tempPurchaseItem.quantity), unitPrice: Number(tempPurchaseItem.unitPrice), totalPrice: Number(tempPurchaseItem.quantity) * Number(tempPurchaseItem.unitPrice) }] }));
      setTempPurchaseItem({ itemId: '', quantity: 1, unitPrice: 0 });
  };

  const handleRemovePurchaseItem = (index: number) => {
      setPurchaseForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const generateInstallments = () => {
      const grandTotal = purchaseForm.items.reduce((acc, i) => acc + i.totalPrice, 0) + Number(purchaseForm.taxAmount || 0);
      if (grandTotal <= 0) return;
      const count = Math.max(1, Math.min(12, installmentsCount));
      const amountPerInst = grandTotal / count;
      const newInst: PurchaseInstallment[] = [];
      for (let i = 0; i < count; i++) {
          const date = new Date(firstDueDate); date.setDate(date.getDate() + (i * 30));
          newInst.push({ dueDate: date, amount: parseFloat(amountPerInst.toFixed(2)) });
      }
      const sum = newInst.reduce((acc, i) => acc + i.amount, 0);
      if (Math.abs(grandTotal - sum) > 0.001) newInst[newInst.length - 1].amount += (grandTotal - sum);
      setPaymentInstallments(newInst);
  };

  const handleInstallmentDateChange = (index: number, newDateStr: string) => {
      const newInstallments = [...paymentInstallments];
      newInstallments[index].dueDate = new Date(newDateStr + 'T12:00:00');
      setPaymentInstallments(newInstallments);
  };

  const submitPurchaseEntry = (e: React.FormEvent) => {
      e.preventDefault();
      if(!purchaseForm.supplierId || !purchaseForm.invoiceNumber || purchaseForm.items.length === 0) {
          showAlert({ title: "Erro", message: "Preencha o fornecedor, número da nota e adicione itens.", type: 'ERROR' });
          return;
      }

      const grandTotal = purchaseItemsTotal + Number(purchaseForm.taxAmount || 0);
      let finalInstallments = paymentInstallments.length > 0 ? paymentInstallments : [{ amount: grandTotal, dueDate: new Date(purchaseForm.date) }];
      const totalInst = finalInstallments.reduce((acc, i) => acc + i.amount, 0);
      
      if (Math.abs(grandTotal - totalInst) > 0.05) {
          showAlert({ title: "Divergência", message: "Valor das parcelas não bate com o total.", type: 'WARNING' });
          return;
      }

      dispatch({ type: 'PROCESS_PURCHASE', purchase: { ...purchaseForm, date: new Date(purchaseForm.date), totalAmount: grandTotal, installments: finalInstallments } });
      setPurchaseModalOpen(false);
      setPurchaseForm({ supplierId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0], items: [], taxAmount: 0, distributeTax: true });
      setPaymentInstallments([]);
      showAlert({ title: "Sucesso", message: "Nota lançada!", type: 'SUCCESS' });
  };

  // --- Handlers (Inventory Count) ---
  const handleInventorySave = () => {
      const adjustments = Object.keys(inventoryCounts).map(itemId => ({ itemId, realQty: inventoryCounts[itemId] }));
      dispatch({ type: 'PROCESS_INVENTORY_ADJUSTMENT', adjustments });
      setInventoryModalOpen(false);
      showAlert({ title: "Sucesso", message: "Inventário atualizado!", type: 'SUCCESS' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Estoque</h2>
                <p className="text-sm text-gray-500">Gestão de produtos e insumos.</p>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                {planLimits.allowPurchases && (
                    <>
                        <Button onClick={() => setPurchaseHistoryOpen(true)} variant="outline" className="text-xs flex-1 md:flex-none"><FileText size={16}/> Histórico</Button>
                        <Button onClick={() => setSupplierModalOpen(true)} variant="outline" className="text-xs flex-1 md:flex-none"><Truck size={16}/> Fornecedores</Button>
                        <Button onClick={() => setPurchaseModalOpen(true)} variant="secondary" className="text-xs flex-1 md:flex-none bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200"><FileText size={16}/> Entrada Nota</Button>
                    </>
                )}
                <Button onClick={() => { 
                    const initialCounts: any = {}; 
                    state.inventory.filter(i => i.type !== 'COMPOSITE').forEach(i => initialCounts[i.id] = i.quantity); 
                    setInventoryCounts(initialCounts);
                    setInventoryModalOpen(true); 
                }} variant="secondary" className="text-xs flex-1 md:flex-none bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200"><ClipboardList size={16}/> Inventário</Button>
                <Button onClick={() => { setEditingInventory({ name: '', unit: 'UN', type: 'INGREDIENT', quantity: 0, minQuantity: 5, costPrice: 0, image: '' }); setInvRecipeStep([]); }} className="text-xs flex-1 md:flex-none"><Plus size={16}/> Novo Item</Button>
            </div>
        </div>

        {/* LISTA DE ESTOQUE */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px] text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                        <tr>
                            <th className="p-4">Item</th>
                            <th className="p-4">Tipo</th>
                            <th className="p-4 text-center">Un</th>
                            <th className="p-4 text-right">Estoque</th>
                            <th className="p-4 text-right">Custo</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {state.inventory.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50">
                                <td className="p-4 font-medium flex items-center gap-3">
                                    {item.image && <img src={item.image} className="w-8 h-8 rounded object-cover border" alt="" />}
                                    {item.name}
                                </td>
                                <td className="p-4">
                                    {item.type === 'INGREDIENT' && <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">Matéria Prima</span>}
                                    {item.type === 'RESALE' && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Revenda</span>}
                                    {item.type === 'COMPOSITE' && <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">Prato</span>}
                                </td>
                                <td className="p-4 text-center">{item.unit}</td>
                                <td className={`p-4 text-right font-bold ${item.type === 'COMPOSITE' ? 'text-gray-400' : (item.quantity <= item.minQuantity ? 'text-red-600' : 'text-gray-800')}`}>
                                    {item.type === 'COMPOSITE' ? '-' : item.quantity}
                                </td>
                                <td className="p-4 text-right">R$ {item.costPrice.toFixed(2)}</td>
                                <td className="p-4 flex justify-end gap-2">
                                    <button onClick={() => setEditingInventory(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Editar"><Edit size={16}/></button>
                                    {item.type !== 'COMPOSITE' && (
                                        <>
                                            <button onClick={() => setStockModal({ itemId: item.id, type: 'IN', quantity: '', reason: '' })} className="p-2 bg-green-50 text-green-600 rounded hover:bg-green-100" title="Entrada"><Plus size={16}/></button>
                                            <button onClick={() => setStockModal({ itemId: item.id, type: 'OUT', quantity: '', reason: '' })} className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Saída"><ArrowDown size={16}/></button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* MODAL: ITEM ESTOQUE (PAGE) */}
        <Modal isOpen={!!editingInventory} onClose={() => setEditingInventory(null)} title="Item de Estoque" variant="page">
            <form onSubmit={handleSaveInventoryItem} className="space-y-6">
                <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => setEditingInventory({...editingInventory, type: 'INGREDIENT'})} className={`p-3 rounded border text-sm font-bold ${editingInventory?.type === 'INGREDIENT' ? 'bg-orange-100 border-orange-500 text-orange-700' : 'bg-gray-50'}`}>Matéria Prima</button>
                    <button type="button" onClick={() => setEditingInventory({...editingInventory, type: 'RESALE'})} className={`p-3 rounded border text-sm font-bold ${editingInventory?.type === 'RESALE' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-gray-50'}`}>Revenda</button>
                    <button type="button" onClick={() => setEditingInventory({...editingInventory, type: 'COMPOSITE'})} className={`p-3 rounded border text-sm font-bold ${editingInventory?.type === 'COMPOSITE' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'bg-gray-50'}`}>Produzido</button>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <label className="block text-sm font-bold mb-1">Nome</label>
                        <input required className="w-full border p-3 rounded-lg text-base" value={editingInventory?.name} onChange={e => setEditingInventory({...editingInventory, name: e.target.value})} placeholder={editingInventory?.type === 'COMPOSITE' ? 'Ex: X-Salada' : 'Ex: Farinha de Trigo'} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Unidade</label>
                        <select className="w-full border p-3 rounded-lg bg-white" value={editingInventory?.unit} onChange={e => setEditingInventory({...editingInventory, unit: e.target.value})}>
                            <option value="UN">UN</option><option value="KG">KG</option><option value="LT">LT</option><option value="GR">GR</option>
                        </select>
                    </div>
                    {editingInventory?.type !== 'COMPOSITE' && (
                        <div>
                            <label className="block text-sm font-bold mb-1">{editingInventory?.id ? 'Custo Médio (R$)' : 'Custo Inicial (R$)'}</label>
                            <input type="number" step="0.01" className="w-full border p-3 rounded-lg" value={editingInventory?.costPrice} onChange={e => setEditingInventory({...editingInventory, costPrice: parseFloat(e.target.value)})} disabled={!!editingInventory?.id} />
                        </div>
                    )}
                    {editingInventory?.type !== 'COMPOSITE' && (
                        <div>
                            <label className="block text-sm font-bold mb-1">Estoque Inicial</label>
                            <input type="number" className="w-full border p-3 rounded-lg" value={editingInventory?.quantity} onChange={e => setEditingInventory({...editingInventory, quantity: parseFloat(e.target.value)})} />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-bold mb-1">Estoque Mínimo</label>
                        <input type="number" className="w-full border p-3 rounded-lg" value={editingInventory?.minQuantity} onChange={e => setEditingInventory({...editingInventory, minQuantity: parseFloat(e.target.value)})} />
                    </div>
                </div>
                {(editingInventory?.type === 'RESALE' || editingInventory?.type === 'COMPOSITE') && (
                    <div>
                        <label className="block text-sm font-bold mb-1">Foto (Opcional)</label>
                        <ImageUploader value={editingInventory?.image || ''} onChange={(val) => setEditingInventory({...editingInventory, image: val})} />
                    </div>
                )}
                {editingInventory?.type === 'COMPOSITE' && (
                    <div className="bg-gray-50 p-6 rounded-xl border mt-4">
                        <h4 className="font-bold text-base mb-4 flex items-center gap-2"><Layers size={20}/> Composição</h4>
                        <div className="flex gap-2 mb-4">
                            <select className="flex-1 border p-2 rounded bg-white" value={selectedIngredientAdd} onChange={e => setSelectedIngredientAdd(e.target.value)}>
                                <option value="">Adicionar ingrediente...</option>
                                {state.inventory.filter(i => i.type !== 'COMPOSITE').map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                            </select>
                            <button type="button" onClick={handleAddIngredientToRecipe} className="bg-blue-600 text-white px-4 rounded"><Plus size={20}/></button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {invRecipeStep.map((step, idx) => {
                                const ing = state.inventory.find(i => i.id === step.ingredientId);
                                return (
                                    <div key={idx} className="flex justify-between items-center text-sm bg-white p-3 rounded border">
                                        <span>{ing?.name}</span>
                                        <div className="flex items-center gap-2">
                                            <input type="number" step="0.001" className="w-20 border p-1 rounded text-right" value={step.qty} onChange={e => { const n = [...invRecipeStep]; n[idx].qty = parseFloat(e.target.value); setInvRecipeStep(n); }} />
                                            <span className="text-xs text-gray-500">{ing?.unit}</span>
                                            <button type="button" onClick={() => setInvRecipeStep(invRecipeStep.filter((_, i) => i !== idx))} className="text-red-500"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                <div className="flex gap-3 pt-6 border-t"><Button type="button" variant="secondary" onClick={() => setEditingInventory(null)} className="flex-1 py-3">Cancelar</Button><Button type="submit" className="flex-1 py-3">Salvar</Button></div>
            </form>
        </Modal>

        {/* MODAL: MOVIMENTAÇÃO MANUAL (DIALOG) */}
        <Modal isOpen={!!stockModal} onClose={() => setStockModal(null)} title={stockModal?.type === 'IN' ? 'Entrada Manual' : 'Saída / Perda'} variant="dialog" maxWidth="sm">
            <form onSubmit={handleStockUpdate} className="space-y-4">
                <input type="number" step="0.001" placeholder="Quantidade" className="w-full border p-3 rounded-lg text-lg text-center font-bold" value={stockModal?.quantity || ''} onChange={e => setStockModal({...stockModal!, quantity: e.target.value})} autoFocus />
                <input type="text" placeholder="Motivo (Ex: Perda, Ajuste)" className="w-full border p-3 rounded-lg" value={stockModal?.reason || ''} onChange={e => setStockModal({...stockModal!, reason: e.target.value})} />
                <div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => setStockModal(null)} className="flex-1">Cancelar</Button><Button type="submit" className="flex-1">Confirmar</Button></div>
            </form>
        </Modal>

        {/* MODAL: FORNECEDOR (PAGE) */}
        <Modal isOpen={supplierModalOpen} onClose={() => setSupplierModalOpen(false)} title="Gerenciar Fornecedores" variant="page">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h4 className="font-bold text-lg text-blue-700 flex items-center gap-2 mb-4"><Plus size={20}/> Cadastrar Novo</h4>
                    <form onSubmit={handleAddSupplier} className="bg-gray-50 p-6 rounded-xl border space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="md:col-span-2"><label className="block text-xs font-bold mb-1">Razão Social *</label><input required className="border p-2 rounded text-sm w-full" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold mb-1">CNPJ</label><input className="border p-2 rounded text-sm w-full" value={newSupplier.cnpj} onChange={e => setNewSupplier({...newSupplier, cnpj: formatCNPJ(e.target.value)})} maxLength={18} /></div>
                            <div><label className="block text-xs font-bold mb-1">IE</label><input className="border p-2 rounded text-sm w-full" value={newSupplier.ie} onChange={e => setNewSupplier({...newSupplier, ie: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold mb-1">Contato</label><input className="border p-2 rounded text-sm w-full" value={newSupplier.contactName} onChange={e => setNewSupplier({...newSupplier, contactName: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold mb-1">Telefone</label><input className="border p-2 rounded text-sm w-full" value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: formatPhone(e.target.value)})} /></div>
                            <div className="md:col-span-2"><label className="block text-xs font-bold mb-1">Email</label><input className="border p-2 rounded text-sm w-full" value={newSupplier.email} onChange={e => setNewSupplier({...newSupplier, email: e.target.value})} /></div>
                        </div>
                        <div className="border-t pt-3 mt-2">
                            <h5 className="text-xs font-bold text-gray-500 mb-2 uppercase">Endereço</h5>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div className="md:col-span-1 relative"><input placeholder="CEP" className={`border p-2 rounded text-sm w-full ${loadingCep ? 'bg-gray-100' : ''}`} value={newSupplier.cep} onChange={e => setNewSupplier({...newSupplier, cep: formatCEP(e.target.value)})} onBlur={handleCepBlur} maxLength={9} />{loadingCep && <Loader2 size={14} className="absolute right-2 top-2.5 animate-spin text-blue-500"/>}</div>
                                <div className="md:col-span-2"><input placeholder="Rua" className="border p-2 rounded text-sm w-full bg-gray-50" value={newSupplier.address} onChange={e => setNewSupplier({...newSupplier, address: e.target.value})} /></div>
                                <div className="md:col-span-1"><input placeholder="Nº" className="border p-2 rounded text-sm w-full" value={newSupplier.number} onChange={e => setNewSupplier({...newSupplier, number: e.target.value})} /></div>
                                <div className="md:col-span-2"><input placeholder="Cidade" className="border p-2 rounded text-sm w-full bg-gray-50" value={newSupplier.city} onChange={e => setNewSupplier({...newSupplier, city: e.target.value})} /></div>
                                <div className="md:col-span-2"><input placeholder="UF" className="border p-2 rounded text-sm w-full bg-gray-50" maxLength={2} value={newSupplier.state} onChange={e => setNewSupplier({...newSupplier, state: e.target.value?.toUpperCase()})} /></div>
                            </div>
                        </div>
                        <Button size="sm" type="submit" className="w-full mt-2 py-2">Salvar Fornecedor</Button>
                    </form>
                </div>
                <div>
                    <h4 className="font-bold text-lg mb-4 text-gray-800">Lista de Fornecedores</h4>
                    <div className="overflow-y-auto max-h-[70vh] border rounded-xl">
                        <table className="w-full text-left text-sm"><thead className="bg-gray-100 sticky top-0"><tr><th className="p-3">Nome</th><th className="p-3">CNPJ</th><th className="p-3 text-right">Ação</th></tr></thead>
                        <tbody className="divide-y">{state.suppliers.map(s => (<tr key={s.id}><td className="p-3 font-medium">{s.name}</td><td className="p-3">{s.cnpj}</td><td className="p-3 text-right"><button onClick={() => handleDeleteSupplier(s.id)}><Trash2 size={18} className="text-red-500"/></button></td></tr>))}</tbody></table>
                    </div>
                </div>
            </div>
        </Modal>

        {/* MODAL: COMPRAS / NOTA FISCAL (PAGE) */}
        <Modal isOpen={purchaseModalOpen} onClose={() => setPurchaseModalOpen(false)} title="Entrada de Nota Fiscal" variant="page">
            <div className="flex-1 overflow-y-auto pr-2 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div>
                        <label className="block text-sm font-bold mb-1">Fornecedor</label>
                        <select className="w-full border p-3 rounded-lg bg-white" value={purchaseForm.supplierId} onChange={e => setPurchaseForm({...purchaseForm, supplierId: e.target.value})}>
                            <option value="">Selecione...</option>
                            {state.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div><label className="block text-sm font-bold mb-1">Nº Nota</label><input className="w-full border p-3 rounded-lg" value={purchaseForm.invoiceNumber} onChange={e => setPurchaseForm({...purchaseForm, invoiceNumber: e.target.value})} /></div>
                    <div><label className="block text-sm font-bold mb-1">Data</label><input type="date" className="w-full border p-3 rounded-lg" value={purchaseForm.date} onChange={e => setPurchaseForm({...purchaseForm, date: e.target.value})} /></div>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-xl border mb-8 shadow-sm">
                    <h4 className="font-bold text-base mb-4 text-gray-700">Adicionar Itens</h4>
                    <div className="flex flex-wrap md:flex-nowrap gap-3 items-end">
                        <div className="flex-1 min-w-[250px]"><label className="text-xs text-gray-500 font-bold mb-1 block">Item</label><select className="w-full border p-2.5 rounded text-sm bg-white" value={tempPurchaseItem.itemId} onChange={e => setTempPurchaseItem({...tempPurchaseItem, itemId: e.target.value})}><option value="">Selecione...</option>{state.inventory.filter(i => i.type !== 'COMPOSITE').map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
                        <div className="w-28"><label className="text-xs text-gray-500 font-bold mb-1 block">Qtd</label><input type="number" step="0.001" className="w-full border p-2.5 rounded text-sm" value={tempPurchaseItem.quantity} onChange={e => setTempPurchaseItem({...tempPurchaseItem, quantity: parseFloat(e.target.value)})} /></div>
                        <div className="w-36"><label className="text-xs text-gray-500 font-bold mb-1 block">Custo Un (R$)</label><input type="number" step="0.01" className="w-full border p-2.5 rounded text-sm" value={tempPurchaseItem.unitPrice} onChange={e => setTempPurchaseItem({...tempPurchaseItem, unitPrice: parseFloat(e.target.value)})} /></div>
                        <Button onClick={handleAddItemToPurchase} disabled={!tempPurchaseItem.itemId} size="md" className="h-[42px]"><Plus size={18}/> Add</Button>
                    </div>
                </div>

                <div className="overflow-x-auto mb-8 border rounded-xl">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100"><tr><th className="p-3">Item</th><th className="p-3 text-right">Qtd</th><th className="p-3 text-right">Unit</th><th className="p-3 text-right">Total</th><th className="p-3 text-center">X</th></tr></thead>
                        <tbody>
                            {purchaseForm.items.map((item, idx) => (
                                <tr key={idx} className="border-b bg-white"><td className="p-3">{state.inventory.find(i=>i.id===item.inventoryItemId)?.name}</td><td className="p-3 text-right">{item.quantity}</td><td className="p-3 text-right">R$ {item.unitPrice.toFixed(2)}</td><td className="p-3 text-right font-bold">R$ {item.totalPrice.toFixed(2)}</td><td className="p-3 text-center"><button onClick={() => handleRemovePurchaseItem(idx)} className="text-red-500"><Trash2 size={16}/></button></td></tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 font-bold"><tr><td colSpan={3} className="p-3 text-right">Total Produtos:</td><td className="p-3 text-right">R$ {purchaseItemsTotal.toFixed(2)}</td><td></td></tr></tfoot>
                    </table>
                </div>

                <div className="border-t pt-6">
                    <h4 className="font-bold text-lg mb-4">Financeiro</h4>
                    <div className="flex gap-6 items-center mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div><label className="block text-xs font-bold mb-1">Impostos/Frete (R$)</label><input type="number" step="0.01" className="border p-2 rounded w-32 font-bold" value={purchaseForm.taxAmount} onChange={e => setPurchaseForm({...purchaseForm, taxAmount: parseFloat(e.target.value) || 0})} /></div>
                        <div className="flex items-center gap-2 mt-5"><input type="checkbox" checked={purchaseForm.distributeTax} onChange={e => setPurchaseForm({...purchaseForm, distributeTax: e.target.checked})} className="w-5 h-5" /><span className="font-bold text-blue-800">Distribuir no custo unitário?</span></div>
                    </div>
                    <div className="flex items-end gap-4 mb-4">
                        <div><label className="block text-xs font-bold mb-1">Parcelas</label><select className="border p-2 rounded w-24" value={installmentsCount} onChange={e => setInstallmentsCount(parseInt(e.target.value))}>{[1,2,3,4,5,6,12].map(n => <option key={n} value={n}>{n}x</option>)}</select></div>
                        <div><label className="block text-xs font-bold mb-1">1º Vencimento</label><input type="date" className="border p-2 rounded" value={firstDueDate} onChange={e => setFirstDueDate(e.target.value)} /></div>
                        <Button onClick={generateInstallments} variant="secondary" size="sm" className="h-[38px]">Gerar Parcelas</Button>
                    </div>
                    {paymentInstallments.length > 0 && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{paymentInstallments.map((inst, idx) => <div key={idx} className="bg-white border p-3 rounded-lg text-sm flex flex-col gap-1 shadow-sm"><span className="font-bold text-gray-500 text-xs">{idx + 1}ª Parcela</span><input type="date" className="border p-1 rounded text-xs w-full mb-1" value={inst.dueDate.toISOString().split('T')[0]} onChange={(e) => handleInstallmentDateChange(idx, e.target.value)} /><span className="font-bold text-base text-gray-800">R$ {inst.amount.toFixed(2)}</span></div>)}</div>}
                </div>
            </div>
            <div className="flex gap-3 pt-6 border-t mt-4"><Button variant="secondary" onClick={() => setPurchaseModalOpen(false)} className="flex-1 py-3">Cancelar</Button><Button onClick={submitPurchaseEntry} className="flex-1 py-3">Confirmar Entrada</Button></div>
        </Modal>

        {/* MODAL: HISTORICO (PAGE) */}
        <Modal isOpen={purchaseHistoryOpen} onClose={() => setPurchaseHistoryOpen(false)} title="Histórico de Movimentações" variant="page">
            <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100"><tr><th className="p-3">Data</th><th className="p-3">Item</th><th className="p-3">Tipo</th><th className="p-3 text-right">Qtd</th><th className="p-3">Motivo</th></tr></thead>
                    <tbody className="divide-y">
                        {state.inventoryLogs.map(log => (<tr key={log.id}><td className="p-3">{new Date(log.created_at).toLocaleString()}</td><td className="p-3">{state.inventory.find(i => i.id === log.item_id)?.name}</td><td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${log.type === 'IN' ? 'bg-green-100 text-green-700' : log.type === 'OUT' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{log.type}</span></td><td className="p-3 text-right font-mono">{log.quantity}</td><td className="p-3 text-gray-500">{log.reason}</td></tr>))}
                    </tbody>
                </table>
            </div>
        </Modal>

        {/* MODAL: BALANÇO (PAGE) */}
        <Modal isOpen={inventoryModalOpen} onClose={() => setInventoryModalOpen(false)} title="Balanço de Estoque" variant="page">
            <div className="bg-yellow-50 p-4 rounded-xl mb-6 text-sm text-yellow-800 flex items-center gap-2 border border-yellow-200"><AlertTriangle size={20}/>Informe a quantidade real encontrada fisicamente.</div>
            <div className="border rounded-xl overflow-hidden mb-6">
                <table className="w-full text-left text-sm"><thead className="bg-gray-100 sticky top-0"><tr><th className="p-4">Item</th><th className="p-4 text-right">Sistema</th><th className="p-4 text-right">Real</th><th className="p-4 text-right">Dif</th></tr></thead>
                <tbody className="divide-y">{state.inventory.filter(i => i.type !== 'COMPOSITE').map(item => { const diff = (inventoryCounts[item.id] ?? item.quantity) - item.quantity; return (<tr key={item.id}><td className="p-4 font-medium">{item.name}</td><td className="p-4 text-right font-bold text-blue-700">{item.quantity}</td><td className="p-2"><input type="number" step="0.001" className="w-full border border-yellow-300 rounded p-2 text-right font-bold text-lg" value={inventoryCounts[item.id] ?? ''} onChange={e => setInventoryCounts({...inventoryCounts, [item.id]: parseFloat(e.target.value)})} placeholder={item.quantity.toString()} /></td><td className={`p-4 text-right font-bold text-lg ${diff !== 0 ? 'text-red-600' : 'text-gray-400'}`}>{diff > 0 ? `+${diff}` : diff}</td></tr>); })}</tbody></table>
            </div>
            <div className="flex gap-3 pt-4 border-t"><Button variant="secondary" onClick={() => setInventoryModalOpen(false)} className="flex-1 py-3">Cancelar</Button><Button onClick={handleInventorySave} className="flex-1 py-3">Processar Ajustes</Button></div>
        </Modal>
    </div>
  );
};