
import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { ImageUploader } from '../../components/ImageUploader';
import { Modal } from '../../components/Modal';
import { InventoryItem, Supplier, PurchaseItemInput, PurchaseInstallment } from '../../types';
import { Plus, Trash2, Edit, ArrowDown, Info, Layers, ClipboardList, FileText, Truck, X, AlertTriangle, User as UserIcon, Phone, MapPin, Loader2, Calculator, Star, CheckSquare, Square } from 'lucide-react';

export const AdminInventory: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: invState, addInventoryItem, updateInventoryItem, updateStock, processInventoryAdjustment, addSupplier, deleteSupplier, processPurchase } = useInventory();
  const { showAlert, showConfirm } = useUI();
  const { planLimits } = restState;

  // --- Inventory Item State ---
  const [editingInventory, setEditingInventory] = useState<Partial<InventoryItem> | null>(null);
  const [invRecipeStep, setInvRecipeStep] = useState<{ ingredientId: string, qty: number }[]>([]);
  const [selectedIngredientAdd, setSelectedIngredientAdd] = useState('');
  const [stockModal, setStockModal] = useState<{ itemId: string, type: 'IN' | 'OUT', quantity: string, reason: string } | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'INGREDIENTS' | 'EXTRAS'>('ALL');
  
  // --- Inventory Count State ---
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [inventoryCounts, setInventoryCounts] = useState<{ [key: string]: number }>({});
  
  // --- Purchase/Invoice Entry State ---
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseHistoryOpen, setPurchaseHistoryOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState<{
      supplierId: string;
      invoiceNumber: string;
      date: string;
      items: PurchaseItemInput[];
      taxAmount: number;
      distributeTax: boolean;
  }>({ supplierId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0], items: [], taxAmount: 0, distributeTax: true });
  const [tempPurchaseItem, setTempPurchaseItem] = useState({ itemId: '', quantity: 1, unitPrice: 0 });
  
  // Installments Management
  const [paymentInstallments, setPaymentInstallments] = useState<PurchaseInstallment[]>([]);
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().split('T')[0]);

  // --- Supplier State ---
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({ 
      name: '', contactName: '', phone: '', 
      cnpj: '', ie: '', email: '', cep: '', address: '', number: '', complement: '', city: '', state: '' 
  });
  const [loadingCep, setLoadingCep] = useState(false);

  // --- Helpers ---
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

  // --- INVENTORY ITEM HANDLERS ---
  const handleAddIngredientToRecipe = () => {
      if(!selectedIngredientAdd) return;
      const ing = invState.inventory.find(i => i.id === selectedIngredientAdd);
      if(ing) {
          setInvRecipeStep([...invRecipeStep, { ingredientId: ing.id, qty: 1 }]);
          setSelectedIngredientAdd('');
      }
  };

  const calculatedRecipeCost = invRecipeStep.reduce((acc, step) => {
      const ing = invState.inventory.find(i => i.id === step.ingredientId);
      return acc + ((ing?.costPrice || 0) * step.qty);
  }, 0);

  const handleSaveInventoryItem = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingInventory || !editingInventory.name) return;

      const finalItem: any = { ...editingInventory };
      
      if (finalItem.type === 'COMPOSITE') {
          finalItem.recipe = invRecipeStep.map(step => ({
              ingredientId: step.ingredientId,
              quantity: step.qty, 
              ingredientName: '', unit: '', cost: 0
          }));
      }

      try {
          if (finalItem.id) {
              await updateInventoryItem(finalItem as InventoryItem);
              showAlert({ title: "Sucesso", message: "Item atualizado com sucesso!", type: 'SUCCESS' });
          } else {
              await addInventoryItem({ ...finalItem, isExtra: finalItem.isExtra || false } as InventoryItem);
              showAlert({ title: "Sucesso", message: "Item cadastrado no estoque!", type: 'SUCCESS' });
          }
          setEditingInventory(null);
          setInvRecipeStep([]);
      } catch (error) {
          console.error(error);
          showAlert({ title: "Erro", message: "Erro ao salvar item.", type: 'ERROR' });
      }
  };

  const handleStockUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!stockModal) return;
      await updateStock(stockModal.itemId, parseFloat(stockModal.quantity), stockModal.type, stockModal.reason);
      setStockModal(null);
      showAlert({ title: "Sucesso", message: "Movimentação registrada!", type: 'SUCCESS' });
  };

  const handleInventoryInit = () => {
      const initialCounts: {[key:string]: number} = {};
      invState.inventory.filter(i => i.type !== 'COMPOSITE').forEach(i => {
          initialCounts[i.id] = i.quantity;
      });
      setInventoryCounts(initialCounts);
      setInventoryModalOpen(true);
  };

  const handleInventorySave = async () => {
      const adjustments = Object.keys(inventoryCounts).map(itemId => ({
          itemId,
          realQty: inventoryCounts[itemId]
      }));
      await processInventoryAdjustment(adjustments);
      setInventoryModalOpen(false);
      showAlert({ title: "Sucesso", message: "Inventário atualizado com sucesso!", type: 'SUCCESS' });
  };

  const openEditModal = (item: InventoryItem) => {
      setEditingInventory({ ...item });
      if (item.type === 'COMPOSITE' && item.recipe) {
          setInvRecipeStep(item.recipe.map(r => ({ ingredientId: r.ingredientId, qty: r.quantity })));
      } else {
          setInvRecipeStep([]);
      }
  };

  // --- SUPPLIER HANDLERS ---
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
      await addSupplier({ ...newSupplier, id: '' } as Supplier);
      setNewSupplier({ name: '', contactName: '', phone: '', cnpj: '', ie: '', email: '', cep: '', address: '', number: '', complement: '', city: '', state: '' });
      showAlert({ title: "Sucesso", message: "Fornecedor adicionado!", type: 'SUCCESS' });
  };

  const handleDeleteSupplier = (id: string) => {
      showConfirm({
          title: "Excluir Fornecedor",
          message: "Confirma a exclusão deste fornecedor?",
          type: 'WARNING',
          onConfirm: async () => await deleteSupplier(id)
      });
  };

  // --- PURCHASE ENTRY HANDLERS ---
  const handleAddItemToPurchase = () => {
      if (!tempPurchaseItem.itemId || tempPurchaseItem.quantity <= 0) return;
      const item = invState.inventory.find(i => i.id === tempPurchaseItem.itemId);
      if(!item) return;
      const newItem: PurchaseItemInput = {
          inventoryItemId: item.id,
          quantity: Number(tempPurchaseItem.quantity),
          unitPrice: Number(tempPurchaseItem.unitPrice),
          totalPrice: Number(tempPurchaseItem.quantity) * Number(tempPurchaseItem.unitPrice)
      };
      setPurchaseForm(prev => ({ ...prev, items: [...prev.items, newItem] }));
      setTempPurchaseItem({ itemId: '', quantity: 1, unitPrice: 0 });
  };

  const handleRemovePurchaseItem = (index: number) => {
      setPurchaseForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const generateInstallments = () => {
      const itemsTotal = purchaseForm.items.reduce((acc, i) => acc + i.totalPrice, 0);
      const grandTotal = itemsTotal + Number(purchaseForm.taxAmount || 0);
      if (grandTotal <= 0) return;
      const count = Math.max(1, Math.min(12, installmentsCount));
      const amountPerInst = grandTotal / count;
      const baseDate = new Date(firstDueDate);
      const newInst: PurchaseInstallment[] = [];
      for (let i = 0; i < count; i++) {
          const date = new Date(baseDate);
          date.setDate(date.getDate() + (i * 30));
          newInst.push({ dueDate: date, amount: parseFloat(amountPerInst.toFixed(2)) });
      }
      const sum = newInst.reduce((acc, i) => acc + i.amount, 0);
      const diff = grandTotal - sum;
      if (Math.abs(diff) > 0.001) {
          newInst[newInst.length - 1].amount += diff;
      }
      setPaymentInstallments(newInst);
  };

  const handleInstallmentDateChange = (index: number, newDateStr: string) => {
      const newInstallments = [...paymentInstallments];
      newInstallments[index].dueDate = new Date(newDateStr + 'T12:00:00');
      setPaymentInstallments(newInstallments);
  };

  const submitPurchaseEntry = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!purchaseForm.supplierId || !purchaseForm.invoiceNumber || purchaseForm.items.length === 0) {
          showAlert({ title: "Erro", message: "Preencha o fornecedor, número da nota e adicione itens.", type: 'ERROR' });
          return;
      }
      const totalItems = purchaseForm.items.reduce((acc, i) => acc + i.totalPrice, 0);
      const grandTotal = totalItems + Number(purchaseForm.taxAmount || 0);
      let finalInstallments = paymentInstallments;
      if (finalInstallments.length === 0) {
          finalInstallments = [{ amount: grandTotal, dueDate: new Date(purchaseForm.date) }];
      }
      const totalInstallments = finalInstallments.reduce((acc, i) => acc + i.amount, 0);
      if (Math.abs(grandTotal - totalInstallments) > 0.05) {
          showAlert({ title: "Divergência", message: `O valor das parcelas (R$ ${totalInstallments.toFixed(2)}) não bate com o total da nota (R$ ${grandTotal.toFixed(2)}).`, type: 'WARNING' });
          return;
      }
      await processPurchase({ ...purchaseForm, date: new Date(purchaseForm.date), totalAmount: grandTotal, installments: finalInstallments });
      setPurchaseModalOpen(false);
      setPurchaseForm({ supplierId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0], items: [], taxAmount: 0, distributeTax: true });
      setPaymentInstallments([]);
      showAlert({ title: "Sucesso", message: "Nota lançada!", type: 'SUCCESS' });
  };

  const purchaseItemsTotal = purchaseForm.items.reduce((acc, i) => acc + i.totalPrice, 0);

  const displayedInventory = invState.inventory.filter(item => {
      if (filterType === 'INGREDIENTS') return !item.isExtra;
      if (filterType === 'EXTRAS') return item.isExtra;
      return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm gap-4 border">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Estoque de Insumos</h2>
                <p className="text-sm text-gray-500">Gerencie matérias-primas, revendas e adicionais.</p>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                {planLimits.allowPurchases && (
                    <>
                        <Button onClick={() => setPurchaseHistoryOpen(true)} variant="outline" className="flex items-center gap-2 text-xs md:text-sm flex-1 md:flex-none"><FileText size={16}/> Histórico</Button>
                        <Button onClick={() => setSupplierModalOpen(true)} variant="outline" className="flex items-center gap-2 text-xs md:text-sm flex-1 md:flex-none"><Truck size={16}/> Fornecedores</Button>
                        <Button onClick={() => setPurchaseModalOpen(true)} variant="secondary" className="flex items-center gap-2 bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 text-xs md:text-sm flex-1 md:flex-none"><FileText size={16}/> Entrada Nota</Button>
                    </>
                )}
                <Button onClick={handleInventoryInit} variant="secondary" className="flex items-center gap-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200 text-xs md:text-sm flex-1 md:flex-none"><ClipboardList size={16}/> Inventário</Button>
                <Button onClick={() => { setEditingInventory({ name: '', unit: 'UN', type: 'INGREDIENT', quantity: 0, minQuantity: 5, costPrice: 0, image: '', isExtra: false }); setInvRecipeStep([]); }} className="text-xs md:text-sm flex-1 md:flex-none"><Plus size={16}/> Novo Item</Button>
            </div>
        </div>

        {/* Fichas de Filtro Rápidas */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button onClick={() => setFilterType('ALL')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${filterType === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-500 border-gray-200'}`}>Todos os Itens</button>
            <button onClick={() => setFilterType('INGREDIENTS')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${filterType === 'INGREDIENTS' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-500 border-gray-200'}`}>Apenas Insumos</button>
            <button onClick={() => setFilterType('EXTRAS')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${filterType === 'EXTRAS' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-500 border-gray-200'}`}>Apenas Adicionais</button>
        </div>

        {/* --- MODAL FORNECEDORES --- */}
        <Modal isOpen={supplierModalOpen} onClose={() => setSupplierModalOpen(false)} title="Gerenciar Fornecedores" variant="page">
            <form onSubmit={handleAddSupplier} className="bg-gray-50 p-4 rounded-lg border mb-4 space-y-4">
                <h4 className="font-bold text-sm text-blue-700 flex items-center gap-2"><Plus size={14}/> Cadastrar Novo Fornecedor</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold mb-1">Razão Social / Nome Fantasia *</label>
                        <input required placeholder="Ex: Distribuidora Silva LTDA" className="border p-2 rounded text-sm w-full" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1">CNPJ</label>
                        <input placeholder="00.000.000/0000-00" className="border p-2 rounded text-sm w-full" value={newSupplier.cnpj} onChange={e => setNewSupplier({...newSupplier, cnpj: formatCNPJ(e.target.value)})} maxLength={18} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1">Inscrição Estadual</label>
                        <input placeholder="Isento ou Número" className="border p-2 rounded text-sm w-full" value={newSupplier.ie} onChange={e => setNewSupplier({...newSupplier, ie: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1">Nome Contato</label>
                        <div className="relative">
                            <UserIcon size={14} className="absolute left-2 top-2.5 text-gray-400"/>
                            <input placeholder="Ex: João" className="border p-2 pl-7 rounded text-sm w-full" value={newSupplier.contactName} onChange={e => setNewSupplier({...newSupplier, contactName: e.target.value})} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1">Telefone / WhatsApp</label>
                        <div className="relative">
                            <Phone size={14} className="absolute left-2 top-2.5 text-gray-400"/>
                            <input placeholder="(00) 00000-0000" className="border p-2 pl-7 rounded text-sm w-full" value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: formatPhone(e.target.value)})} />
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold mb-1">E-mail</label>
                        <input type="email" placeholder="contato@fornecedor.com" className="border p-2 rounded text-sm w-full" value={newSupplier.email} onChange={e => setNewSupplier({...newSupplier, email: e.target.value})} />
                    </div>
                </div>
                <div className="border-t pt-3 mt-2">
                    <h5 className="text-xs font-bold text-gray-500 mb-2 uppercase flex items-center gap-1"><MapPin size={12}/> Endereço</h5>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold mb-1">CEP</label>
                            <div className="relative">
                                <input placeholder="00000-000" className={`border p-2 rounded text-sm w-full ${loadingCep ? 'bg-gray-100' : ''}`} value={newSupplier.cep} onChange={e => setNewSupplier({...newSupplier, cep: formatCEP(e.target.value)})} onBlur={handleCepBlur} maxLength={9} />
                                {loadingCep && <Loader2 size={14} className="absolute right-2 top-2.5 animate-spin text-blue-500"/>}
                            </div>
                        </div>
                        <div className="md:col-span-2"><label className="block text-xs font-bold mb-1">Rua</label><input className="border p-2 rounded text-sm w-full bg-gray-50" value={newSupplier.address} onChange={e => setNewSupplier({...newSupplier, address: e.target.value})} /></div>
                        <div className="md:col-span-1"><label className="block text-xs font-bold mb-1">Número</label><input className="border p-2 rounded text-sm w-full" value={newSupplier.number} onChange={e => setNewSupplier({...newSupplier, number: e.target.value})} /></div>
                        <div className="md:col-span-1"><label className="block text-xs font-bold mb-1">Complemento</label><input className="border p-2 rounded text-sm w-full" value={newSupplier.complement} onChange={e => setNewSupplier({...newSupplier, complement: e.target.value})} /></div>
                        <div className="md:col-span-2"><label className="block text-xs font-bold mb-1">Cidade</label><input className="border p-2 rounded text-sm w-full bg-gray-50" value={newSupplier.city} onChange={e => setNewSupplier({...newSupplier, city: e.target.value})} /></div>
                        <div className="md:col-span-1"><label className="block text-xs font-bold mb-1">UF</label><input className="border p-2 rounded text-sm w-full bg-gray-50" maxLength={2} value={newSupplier.state} onChange={e => setNewSupplier({...newSupplier, state: e.target.value.toUpperCase()})} /></div>
                    </div>
                </div>
                <Button size="sm" type="submit" className="w-full mt-2">Salvar Fornecedor</Button>
            </form>
            <div className="flex-1 overflow-y-auto border-t pt-2">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-gray-600 sticky top-0">
                        <tr><th className="p-2">Fornecedor</th><th className="p-2 hidden md:table-cell">CNPJ/IE</th><th className="p-2">Contato</th><th className="p-2 text-right">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {invState.suppliers.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="p-2"><div className="font-medium text-gray-800">{s.name}</div><div className="text-xs text-gray-500">{s.city}-{s.state}</div></td>
                                <td className="p-2 hidden md:table-cell"><div className="text-xs">{s.cnpj || '-'}</div></td>
                                <td className="p-2"><div className="text-xs font-bold">{s.contactName}</div><div className="text-xs text-gray-500">{s.phone}</div></td>
                                <td className="p-2 text-right"><button onClick={() => handleDeleteSupplier(s.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Modal>

        {/* --- MODAL CADASTRO/EDIÇÃO ITEM --- */}
        <Modal 
            isOpen={!!editingInventory} 
            onClose={() => { setEditingInventory(null); setInvRecipeStep([]); }} 
            title={editingInventory?.id ? 'Editar Item de Estoque' : 'Novo Item de Estoque'}
            variant="page"
        >
            <form onSubmit={handleSaveInventoryItem} className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${editingInventory?.isExtra ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                            <Star size={20} fill={editingInventory?.isExtra ? 'currentColor' : 'none'} />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-sm">Disponível como Adicional?</h4>
                            <p className="text-[10px] text-slate-500">Se marcado, este item poderá ser oferecido como opcional nos pratos.</p>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => setEditingInventory(prev => ({ ...prev!, isExtra: !prev?.isExtra }))}
                        className={`p-2 rounded-lg transition-colors ${editingInventory?.isExtra ? 'bg-amber-500 text-white' : 'bg-white text-slate-300 border'}`}
                    >
                        {editingInventory?.isExtra ? <CheckSquare size={24}/> : <Square size={24}/>}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Mercadoria</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button type="button" onClick={() => setEditingInventory(prev => ({...prev!, type: 'INGREDIENT'}))} className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 ${editingInventory?.type === 'INGREDIENT' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white'}`}>Matéria Prima</button>
                            <button type="button" onClick={() => setEditingInventory(prev => ({...prev!, type: 'RESALE'}))} className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 ${editingInventory?.type === 'RESALE' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white'}`}>Revenda</button>
                            <button type="button" onClick={() => setEditingInventory(prev => ({...prev!, type: 'COMPOSITE'}))} className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 ${editingInventory?.type === 'COMPOSITE' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-white'}`}>Composto / Ficha</button>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Item</label>
                        <input required className="w-full border p-3 rounded-lg text-sm" value={editingInventory?.name || ''} onChange={e => setEditingInventory(prev => ({...prev!, name: e.target.value}))} placeholder="Ex: Bacon em Cubos ou Molho Especial" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unidade de Medida</label>
                        <select className="w-full border p-3 rounded-lg text-sm bg-white" value={editingInventory?.unit || 'UN'} onChange={e => setEditingInventory(prev => ({...prev!, unit: e.target.value}))}>
                            <option value="UN">UN (Unidade)</option><option value="KG">KG (Quilograma)</option><option value="LT">LT (Litro)</option><option value="GR">GR (Grama)</option><option value="ML">ML (Mililitro)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preço de Custo (R$)</label>
                        <div className="relative">
                            <input type="number" step="0.01" className={`w-full border p-3 rounded-lg text-sm font-bold ${editingInventory?.id && editingInventory.type !== 'COMPOSITE' ? 'bg-gray-100 text-gray-400' : 'text-blue-600'}`} value={editingInventory?.costPrice || 0} onChange={e => setEditingInventory(prev => ({...prev!, costPrice: parseFloat(e.target.value)}))} disabled={!!editingInventory?.id && editingInventory.type !== 'COMPOSITE'} />
                            {editingInventory?.type === 'COMPOSITE' && (
                                <div className="mt-1 text-[10px] text-blue-600 flex justify-between px-1">
                                    <span>Soma Ficha: R$ {calculatedRecipeCost.toFixed(2)}</span>
                                    <button type="button" onClick={() => setEditingInventory(prev => ({...prev!, costPrice: calculatedRecipeCost}))} className="underline font-bold">Aplicar Soma</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {editingInventory?.type !== 'COMPOSITE' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estoque Inicial / Atual</label>
                            <input type="number" className="w-full border p-3 rounded-lg text-sm bg-gray-50" disabled value={editingInventory?.quantity || 0} />
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nível Mínimo Alerta</label>
                        <input type="number" className="w-full border p-3 rounded-lg text-sm" value={editingInventory?.minQuantity || 0} onChange={e => setEditingInventory(prev => ({...prev!, minQuantity: parseFloat(e.target.value)}))} />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Foto de Identificação (Opcional)</label>
                        <ImageUploader value={editingInventory?.image || ''} onChange={(val) => setEditingInventory(prev => ({...prev!, image: val}))} />
                    </div>
                </div>

                {editingInventory?.type === 'COMPOSITE' && (
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                        <h4 className="font-bold text-sm text-slate-700 flex items-center gap-2"><Layers size={18}/> Ficha Técnica / Composição</h4>
                        <div className="flex gap-2">
                            <select className="flex-1 border p-3 rounded-lg text-sm bg-white" value={selectedIngredientAdd} onChange={e => setSelectedIngredientAdd(e.target.value)}>
                                <option value="">Adicionar ingrediente...</option>
                                {invState.inventory.filter(i => i.type !== 'COMPOSITE').map(i => (
                                    <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                ))}
                            </select>
                            <button type="button" onClick={handleAddIngredientToRecipe} className="bg-slate-800 text-white px-4 rounded-lg hover:bg-slate-700"><Plus size={20}/></button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {invRecipeStep.map((step, idx) => {
                                const ing = invState.inventory.find(i => i.id === step.ingredientId);
                                return (
                                    <div key={idx} className="flex justify-between items-center text-sm bg-white p-3 rounded-lg border shadow-sm">
                                        <div className="flex flex-col"><span className="font-bold text-slate-800">{ing?.name}</span><span className="text-[10px] text-slate-400">Custo: R$ {(ing?.costPrice || 0).toFixed(2)} / {ing?.unit}</span></div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1"><input type="number" step="0.001" className="w-20 border p-1.5 rounded-md text-right font-bold text-blue-600" value={step.qty} onChange={e => { const newSteps = [...invRecipeStep]; newSteps[idx].qty = parseFloat(e.target.value); setInvRecipeStep(newSteps); }} /><span className="text-[10px] font-bold text-slate-400">{ing?.unit}</span></div>
                                            <button type="button" onClick={() => setInvRecipeStep(invRecipeStep.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                );
                            })}
                            {invRecipeStep.length === 0 && <div className="text-center py-6 text-gray-400 text-xs italic">Nenhum ingrediente na ficha técnica.</div>}
                        </div>
                    </div>
                )}

                <div className="flex gap-3 pt-6 border-t">
                    <Button type="button" variant="secondary" onClick={() => { setEditingInventory(null); setInvRecipeStep([]); }} className="flex-1">Cancelar</Button>
                    <Button type="submit" className="flex-1">Salvar no Estoque</Button>
                </div>
            </form>
        </Modal>

        {/* --- TABELA LISTAGEM --- */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                    <thead className="bg-gray-50 text-gray-600 text-xs font-bold uppercase">
                        <tr><th className="p-4">Item de Estoque</th><th className="p-4 text-center">Tipo</th><th className="p-4 text-center">Un</th><th className="p-4 text-right">Qtd Atual</th><th className="p-4 text-right">Custo Médio</th><th className="p-4 text-right">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {displayedInventory.map(item => (
                            <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${item.quantity <= item.minQuantity && item.type !== 'COMPOSITE' ? 'bg-red-50/30' : ''}`}>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden border shrink-0">
                                            {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <Layers size={20} className="m-auto text-gray-300 h-full"/>}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800 flex items-center gap-2">
                                                {item.name}
                                                {item.isExtra && <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Star size={8} fill="currentColor"/> ADICIONAL</span>}
                                            </div>
                                            {item.type === 'COMPOSITE' && <div className="text-[10px] text-blue-600 font-medium flex items-center gap-1"><Info size={10}/> {item.recipe?.length || 0} Ingredientes na Ficha</div>}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    {item.type === 'INGREDIENT' && <span className="text-[10px] font-bold px-2 py-1 rounded bg-orange-100 text-orange-700">MATÉRIA PRIMA</span>}
                                    {item.type === 'RESALE' && <span className="text-[10px] font-bold px-2 py-1 rounded bg-blue-100 text-blue-700">REVENDA</span>}
                                    {item.type === 'COMPOSITE' && <span className="text-[10px] font-bold px-2 py-1 rounded bg-purple-100 text-purple-700">COMPOSTO</span>}
                                </td>
                                <td className="p-4 text-center text-xs font-bold text-gray-400">{item.unit}</td>
                                <td className={`p-4 text-right font-mono font-bold ${item.type === 'COMPOSITE' ? 'text-gray-300' : (item.quantity <= item.minQuantity ? 'text-red-600' : 'text-slate-700')}`}>
                                    {item.type === 'COMPOSITE' ? '-' : item.quantity.toFixed(2)}
                                </td>
                                <td className="p-4 text-right text-xs font-bold text-emerald-600">R$ {item.costPrice.toFixed(2)}</td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-1">
                                        <button onClick={() => openEditModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar"><Edit size={16}/></button>
                                        {item.type !== 'COMPOSITE' && (
                                            <button onClick={() => setStockModal({ itemId: item.id, type: 'IN', quantity: '', reason: '' })} className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors" title="Entrada Manual"><Plus size={16}/></button>
                                        )}
                                        {item.type !== 'COMPOSITE' && (
                                            <button onClick={() => setStockModal({ itemId: item.id, type: 'OUT', quantity: '', reason: '' })} className="p-2 text-red-400 hover:bg-red-50 rounded transition-colors" title="Saída / Perda"><ArrowDown size={16}/></button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {displayedInventory.length === 0 && (
                            <tr><td colSpan={6} className="p-20 text-center text-gray-400 italic">Nenhum item encontrado nesta categoria.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};
