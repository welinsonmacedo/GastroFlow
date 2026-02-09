
import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { ImageUploader } from '../../components/ImageUploader';
import { Modal } from '../../components/Modal';
import { InventoryItem, Supplier, PurchaseItemInput, PurchaseInstallment } from '../../types';
import { Plus, Trash2, Edit, ArrowDown, Info, Layers, ClipboardList, FileText, Truck, X, AlertTriangle, User as UserIcon, Phone, MapPin, Loader2 } from 'lucide-react';

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

  const handleSaveInventoryItem = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingInventory || !editingInventory.name) return;

      const finalItem: any = { ...editingInventory };
      
      // Recalculate cost for composite items
      if (finalItem.type === 'COMPOSITE') {
          finalItem.recipe = invRecipeStep;
          const cost = invRecipeStep.reduce((acc: number, step: any) => {
              const ing = invState.inventory.find(i => i.id === step.ingredientId);
              return acc + ((ing?.costPrice || 0) * step.qty);
          }, 0);
          finalItem.costPrice = cost;
      }

      // Check if ID exists to determine UPDATE or CREATE
      if (finalItem.id) {
          await updateInventoryItem(finalItem as InventoryItem);
          showAlert({ title: "Sucesso", message: "Item atualizado com sucesso!", type: 'SUCCESS' });
      } else {
          await addInventoryItem(finalItem as InventoryItem);
          showAlert({ title: "Sucesso", message: "Item cadastrado no estoque!", type: 'SUCCESS' });
      }

      setEditingInventory(null);
      setInvRecipeStep([]);
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

      setPurchaseForm(prev => ({
          ...prev,
          items: [...prev.items, newItem]
      }));
      setTempPurchaseItem({ itemId: '', quantity: 1, unitPrice: 0 });
  };

  const handleRemovePurchaseItem = (index: number) => {
      setPurchaseForm(prev => ({
          ...prev,
          items: prev.items.filter((_, i) => i !== index)
      }));
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
          newInst.push({
              dueDate: date,
              amount: parseFloat(amountPerInst.toFixed(2))
          });
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
      
      // Se não gerou parcelas, gera uma à vista automaticamente
      let finalInstallments = paymentInstallments;
      if (finalInstallments.length === 0) {
          finalInstallments = [{ amount: grandTotal, dueDate: new Date(purchaseForm.date) }];
      }

      const totalInstallments = finalInstallments.reduce((acc, i) => acc + i.amount, 0);

      if (Math.abs(grandTotal - totalInstallments) > 0.05) {
          showAlert({ 
              title: "Divergência", 
              message: `O valor das parcelas (R$ ${totalInstallments.toFixed(2)}) não bate com o total da nota (R$ ${grandTotal.toFixed(2)}). Gere as parcelas novamente.`, 
              type: 'WARNING' 
          });
          return;
      }

      await processPurchase({
          ...purchaseForm,
          date: new Date(purchaseForm.date),
          totalAmount: grandTotal,
          installments: finalInstallments
      });

      setPurchaseModalOpen(false);
      setPurchaseForm({ supplierId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0], items: [], taxAmount: 0, distributeTax: true });
      setPaymentInstallments([]);
      showAlert({ title: "Sucesso", message: "Nota lançada! Estoque e Financeiro atualizados.", type: 'SUCCESS' });
  };

  const purchaseItemsTotal = purchaseForm.items.reduce((acc, i) => acc + i.totalPrice, 0);

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Estoque</h2>
                <p className="text-sm text-gray-500">Gestão de produtos e insumos.</p>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                {planLimits.allowPurchases && (
                    <>
                        <Button onClick={() => setPurchaseHistoryOpen(true)} variant="outline" className="flex items-center gap-2 text-xs md:text-sm flex-1 md:flex-none"><FileText size={16}/> Histórico</Button>
                        <Button onClick={() => setSupplierModalOpen(true)} variant="outline" className="flex items-center gap-2 text-xs md:text-sm flex-1 md:flex-none"><Truck size={16}/> Fornecedores</Button>
                        <Button onClick={() => setPurchaseModalOpen(true)} variant="secondary" className="flex items-center gap-2 bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 text-xs md:text-sm flex-1 md:flex-none"><FileText size={16}/> Entrada Nota</Button>
                    </>
                )}
                <Button onClick={handleInventoryInit} variant="secondary" className="flex items-center gap-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200 text-xs md:text-sm flex-1 md:flex-none"><ClipboardList size={16}/> Inventário (Balanço)</Button>
                <Button onClick={() => { setEditingInventory({ name: '', unit: 'UN', type: 'INGREDIENT', quantity: 0, minQuantity: 5, costPrice: 0, image: '' }); setInvRecipeStep([]); }} className="text-xs md:text-sm flex-1 md:flex-none"><Plus size={16}/> Novo Item</Button>
            </div>
        </div>

        {/* --- MODAL DE FORNECEDORES --- */}
        <Modal 
            isOpen={supplierModalOpen} 
            onClose={() => setSupplierModalOpen(false)} 
            title="Gerenciar Fornecedores"
            variant="page"
        >
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
                                <input 
                                    placeholder="00000-000" 
                                    className={`border p-2 rounded text-sm w-full ${loadingCep ? 'bg-gray-100' : ''}`}
                                    value={newSupplier.cep} 
                                    onChange={e => setNewSupplier({...newSupplier, cep: formatCEP(e.target.value)})}
                                    onBlur={handleCepBlur}
                                    maxLength={9}
                                />
                                {loadingCep && <Loader2 size={14} className="absolute right-2 top-2.5 animate-spin text-blue-500"/>}
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold mb-1">Rua</label>
                            <input className="border p-2 rounded text-sm w-full bg-gray-50" value={newSupplier.address} onChange={e => setNewSupplier({...newSupplier, address: e.target.value})} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold mb-1">Número</label>
                            <input className="border p-2 rounded text-sm w-full" value={newSupplier.number} onChange={e => setNewSupplier({...newSupplier, number: e.target.value})} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold mb-1">Complemento</label>
                            <input className="border p-2 rounded text-sm w-full" value={newSupplier.complement} onChange={e => setNewSupplier({...newSupplier, complement: e.target.value})} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold mb-1">Cidade</label>
                            <input className="border p-2 rounded text-sm w-full bg-gray-50" value={newSupplier.city} onChange={e => setNewSupplier({...newSupplier, city: e.target.value})} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold mb-1">UF</label>
                            <input className="border p-2 rounded text-sm w-full bg-gray-50" maxLength={2} value={newSupplier.state} onChange={e => setNewSupplier({...newSupplier, state: e.target.value.toUpperCase()})} />
                        </div>
                    </div>
                </div>
                <Button size="sm" type="submit" className="w-full mt-2">Salvar Fornecedor</Button>
            </form>
            <div className="flex-1 overflow-y-auto border-t pt-2">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-gray-600 sticky top-0">
                        <tr>
                            <th className="p-2">Fornecedor</th>
                            <th className="p-2 hidden md:table-cell">CNPJ/IE</th>
                            <th className="p-2">Contato</th>
                            <th className="p-2 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {invState.suppliers.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="p-2">
                                    <div className="font-medium text-gray-800">{s.name}</div>
                                    <div className="text-xs text-gray-500 truncate max-w-[150px]">{s.city ? `${s.city}-${s.state}` : ''}</div>
                                </td>
                                <td className="p-2 hidden md:table-cell">
                                    <div className="text-xs">{s.cnpj || '-'}</div>
                                    <div className="text-[10px] text-gray-400">{s.ie}</div>
                                </td>
                                <td className="p-2">
                                    <div className="text-xs font-bold">{s.contactName}</div>
                                    <div className="text-xs text-gray-500">{s.phone}</div>
                                </td>
                                <td className="p-2 text-right">
                                    <button onClick={() => handleDeleteSupplier(s.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                        {invState.suppliers.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-400">Nenhum fornecedor cadastrado.</td></tr>}
                    </tbody>
                </table>
            </div>
        </Modal>

        {/* --- MODAL HISTÓRICO --- */}
        <Modal 
            isOpen={purchaseHistoryOpen} 
            onClose={() => setPurchaseHistoryOpen(false)} 
            title="Histórico de Movimentações"
            variant="page"
        >
            <div className="flex-1 overflow-y-auto border rounded-lg">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 sticky top-0">
                        <tr>
                            <th className="p-3">Data</th>
                            <th className="p-3">Item</th>
                            <th className="p-3">Tipo</th>
                            <th className="p-3 text-right">Qtd</th>
                            <th className="p-3">Motivo</th>
                            <th className="p-3">Usuário</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {invState.inventoryLogs.map(log => {
                            const item = invState.inventory.find(i => i.id === log.item_id);
                            return (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="p-3 whitespace-nowrap">{log.created_at.toLocaleString()}</td>
                                    <td className="p-3 font-medium">{item?.name || log.item_id.slice(0,8)}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold
                                            ${log.type === 'IN' ? 'bg-green-100 text-green-700' : ''}
                                            ${log.type === 'OUT' ? 'bg-red-100 text-red-700' : ''}
                                            ${log.type === 'SALE' ? 'bg-blue-100 text-blue-700' : ''}
                                            ${log.type === 'LOSS' ? 'bg-red-200 text-red-800' : ''}
                                        `}>
                                            {log.type === 'IN' ? 'ENTRADA' : log.type === 'OUT' ? 'SAÍDA' : log.type === 'SALE' ? 'VENDA' : 'PERDA'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right font-mono">{log.quantity}</td>
                                    <td className="p-3 text-gray-600">{log.reason}</td>
                                    <td className="p-3 text-gray-500 text-xs">{log.user_name}</td>
                                </tr>
                            );
                        })}
                        {invState.inventoryLogs.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">Nenhum histórico recente.</td></tr>}
                    </tbody>
                </table>
            </div>
        </Modal>

        {/* --- MODAL ENTRADA DE NOTA --- */}
        <Modal 
            isOpen={purchaseModalOpen} 
            onClose={() => setPurchaseModalOpen(false)} 
            title="Entrada de Nota Fiscal"
            variant="page"
        >
            <div className="flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-xs font-bold mb-1">Fornecedor</label>
                        <select className="w-full border p-2 rounded" value={purchaseForm.supplierId} onChange={e => setPurchaseForm({...purchaseForm, supplierId: e.target.value})}>
                            <option value="">Selecione...</option>
                            {invState.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1">Número da Nota</label>
                        <input className="w-full border p-2 rounded" value={purchaseForm.invoiceNumber} onChange={e => setPurchaseForm({...purchaseForm, invoiceNumber: e.target.value})} placeholder="Ex: 12345" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1">Data Emissão</label>
                        <input type="date" className="w-full border p-2 rounded" value={purchaseForm.date} onChange={e => setPurchaseForm({...purchaseForm, date: e.target.value})} />
                    </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border mb-6">
                    <h4 className="font-bold text-sm mb-2 text-gray-700">Adicionar Itens</h4>
                    <div className="flex flex-wrap md:flex-nowrap gap-2 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-xs text-gray-500">Item do Estoque</label>
                            <select className="w-full border p-2 rounded text-sm" value={tempPurchaseItem.itemId} onChange={e => setTempPurchaseItem({...tempPurchaseItem, itemId: e.target.value})}>
                                <option value="">Selecione o produto...</option>
                                {invState.inventory.filter(i => i.type !== 'COMPOSITE').map(i => (
                                    <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-24">
                            <label className="text-xs text-gray-500">Qtd</label>
                            <input type="number" step="0.001" className="w-full border p-2 rounded text-sm" value={tempPurchaseItem.quantity} onChange={e => setTempPurchaseItem({...tempPurchaseItem, quantity: parseFloat(e.target.value)})} />
                        </div>
                        <div className="w-32">
                            <label className="text-xs text-gray-500">Custo Unit (R$)</label>
                            <input type="number" step="0.01" className="w-full border p-2 rounded text-sm" value={tempPurchaseItem.unitPrice} onChange={e => setTempPurchaseItem({...tempPurchaseItem, unitPrice: parseFloat(e.target.value)})} />
                        </div>
                        <Button onClick={handleAddItemToPurchase} disabled={!tempPurchaseItem.itemId} size="sm" className="h-9"><Plus size={16}/> Adicionar</Button>
                    </div>
                </div>
                <table className="w-full text-left text-sm mb-6 border">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2">Item</th>
                            <th className="p-2 text-right">Qtd</th>
                            <th className="p-2 text-right">Custo Un. (Nota)</th>
                            <th className="p-2 text-right">Custo Efetivo (c/ Imp)</th>
                            <th className="p-2 text-right">Total</th>
                            <th className="p-2 text-center">Remover</th>
                        </tr>
                    </thead>
                    <tbody>
                        {purchaseForm.items.map((item, idx) => {
                            const invItem = invState.inventory.find(i => i.id === item.inventoryItemId);
                            let effectiveUnitCost = item.unitPrice;
                            const hasTax = purchaseForm.distributeTax && purchaseForm.taxAmount > 0;
                            if (hasTax && purchaseItemsTotal > 0) {
                                const share = (item.totalPrice / purchaseItemsTotal) * purchaseForm.taxAmount;
                                const totalWithTax = item.totalPrice + share;
                                effectiveUnitCost = totalWithTax / item.quantity;
                            }
                            return (
                                <tr key={idx} className="border-b">
                                    <td className="p-2">{invItem?.name}</td>
                                    <td className="p-2 text-right">{item.quantity}</td>
                                    <td className="p-2 text-right text-gray-500">R$ {item.unitPrice.toFixed(2)}</td>
                                    <td className="p-2 text-right font-medium">
                                        {hasTax ? (
                                            <span className="text-blue-600 bg-blue-50 px-1 rounded">
                                                R$ {effectiveUnitCost.toFixed(2)}
                                            </span>
                                        ) : (
                                            <span>-</span>
                                        )}
                                    </td>
                                    <td className="p-2 text-right font-bold">R$ {item.totalPrice.toFixed(2)}</td>
                                    <td className="p-2 text-center">
                                        <button onClick={() => handleRemovePurchaseItem(idx)} className="text-red-500"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold">
                        <tr>
                            <td colSpan={4} className="p-2 text-right">Total Produtos:</td>
                            <td className="p-2 text-right">R$ {purchaseItemsTotal.toFixed(2)}</td>
                            <td></td>
                        </tr>
                        {purchaseForm.taxAmount > 0 && (
                            <tr>
                                <td colSpan={4} className="p-2 text-right text-red-600">+ Impostos/Frete:</td>
                                <td className="p-2 text-right text-red-600">R$ {purchaseForm.taxAmount.toFixed(2)}</td>
                                <td></td>
                            </tr>
                        )}
                        <tr className="bg-slate-100 border-t-2 border-slate-300">
                            <td colSpan={4} className="p-2 text-right text-lg">Total Nota:</td>
                            <td className="p-2 text-right text-lg">R$ {(purchaseItemsTotal + (purchaseForm.taxAmount || 0)).toFixed(2)}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
                <div className="border-t pt-4">
                    <h4 className="font-bold mb-3">Financeiro e Impostos</h4>
                    <div className="flex gap-4 items-center mb-4">
                        <div>
                            <label className="block text-xs font-bold mb-1">Impostos/Frete (R$)</label>
                            <input type="number" step="0.01" className="border p-2 rounded w-32 font-bold" value={purchaseForm.taxAmount} onChange={e => setPurchaseForm({...purchaseForm, taxAmount: parseFloat(e.target.value) || 0})} />
                        </div>
                        <div className="flex items-center gap-2 mt-5 bg-blue-50 p-2 rounded border border-blue-100">
                            <input type="checkbox" checked={purchaseForm.distributeTax} onChange={e => setPurchaseForm({...purchaseForm, distributeTax: e.target.checked})} className="w-4 h-4" />
                            <span className="text-sm font-bold text-blue-800">Distribuir no custo dos itens?</span>
                        </div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg flex items-end gap-4">
                        <div>
                            <label className="block text-xs font-bold mb-1">Parcelas</label>
                            <select className="border p-2 rounded w-20" value={installmentsCount} onChange={e => setInstallmentsCount(parseInt(e.target.value))}>
                                {[1,2,3,4,5,6,12].map(n => <option key={n} value={n}>{n}x</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">1º Vencimento</label>
                            <input type="date" className="border p-2 rounded" value={firstDueDate} onChange={e => setFirstDueDate(e.target.value)} />
                        </div>
                        <Button onClick={generateInstallments} variant="secondary" size="sm" className="h-9">Gerar Parcelas</Button>
                    </div>
                    {paymentInstallments.length > 0 && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {paymentInstallments.map((inst, idx) => (
                                <div key={idx} className="bg-white border p-2 rounded text-sm flex items-center gap-2">
                                    <span className="font-bold text-gray-500 w-6 text-center">{idx + 1}ª</span>
                                    <input 
                                        type="date" 
                                        className="border p-1 rounded text-sm flex-1"
                                        value={inst.dueDate.toISOString().split('T')[0]}
                                        onChange={(e) => handleInstallmentDateChange(idx, e.target.value)}
                                    />
                                    <span className="font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded text-xs">R$ {inst.amount.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex gap-2 pt-4 border-t mt-4 shrink-0 bg-white">
                <Button variant="secondary" onClick={() => setPurchaseModalOpen(false)} className="flex-1">Cancelar</Button>
                <Button onClick={submitPurchaseEntry} className="flex-1">Confirmar Entrada</Button>
            </div>
        </Modal>

        {/* Modal: New/Edit Inventory Item */}
        <Modal 
            isOpen={!!editingInventory} 
            onClose={() => setEditingInventory(null)} 
            title={editingInventory?.id ? 'Editar Item' : 'Novo Item de Estoque'}
            variant="page"
        >
            <form onSubmit={handleSaveInventoryItem} className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700">Tipo do Item</label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                        <button type="button" onClick={() => setEditingInventory(prev => ({...prev!, type: 'INGREDIENT'}))} className={`p-2 rounded border text-xs font-bold ${editingInventory?.type === 'INGREDIENT' ? 'bg-orange-100 border-orange-500 text-orange-700' : 'bg-gray-50'}`}>Matéria Prima</button>
                        <button type="button" onClick={() => setEditingInventory(prev => ({...prev!, type: 'RESALE'}))} className={`p-2 rounded border text-xs font-bold ${editingInventory?.type === 'RESALE' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-gray-50'}`}>Revenda</button>
                        <button type="button" onClick={() => setEditingInventory(prev => ({...prev!, type: 'COMPOSITE'}))} className={`p-2 rounded border text-xs font-bold ${editingInventory?.type === 'COMPOSITE' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'bg-gray-50'}`}>Produzido</button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-xs font-bold">Nome</label>
                        <input required className="w-full border p-2 rounded" value={editingInventory?.name || ''} onChange={e => setEditingInventory(prev => ({...prev!, name: e.target.value}))} placeholder={editingInventory?.type === 'COMPOSITE' ? 'Ex: X-Salada' : 'Ex: Farinha de Trigo'} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold">Unidade</label>
                        <select className="w-full border p-2 rounded" value={editingInventory?.unit || 'UN'} onChange={e => setEditingInventory(prev => ({...prev!, unit: e.target.value}))}>
                            <option value="UN">UN</option>
                            <option value="KG">KG</option>
                            <option value="LT">LT</option>
                            <option value="GR">GR</option>
                        </select>
                    </div>
                    {editingInventory?.type !== 'COMPOSITE' && (
                        <div>
                            <label className="block text-xs font-bold">
                                {editingInventory?.id ? 'Custo Médio (R$)' : 'Custo Inicial (R$)'}
                            </label>
                            <input 
                                type="number" 
                                step="0.01" 
                                className={`w-full border p-2 rounded ${editingInventory?.id ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                value={editingInventory?.costPrice || 0} 
                                onChange={e => setEditingInventory(prev => ({...prev!, costPrice: parseFloat(e.target.value)}))} 
                                disabled={!!editingInventory?.id} // Disable cost editing if exists (managed by purchase)
                            />
                            {editingInventory?.id && (
                                <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
                                    <Info size={10}/> Gerenciado via Notas de Entrada ou Ajuste Manual
                                </p>
                            )}
                        </div>
                    )}
                    {editingInventory?.type !== 'COMPOSITE' && (
                        <div>
                            <label className="block text-xs font-bold">Estoque Atual</label>
                            <input type="number" className="w-full border p-2 rounded bg-gray-50" disabled value={editingInventory?.quantity || 0} />
                            <p className="text-[10px] text-gray-400 mt-1">Use "Ajuste Manual" para alterar</p>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold">Estoque Mínimo</label>
                        <input type="number" className="w-full border p-2 rounded" value={editingInventory?.minQuantity || 0} onChange={e => setEditingInventory(prev => ({...prev!, minQuantity: parseFloat(e.target.value)}))} />
                    </div>
                </div>
                {(editingInventory?.type === 'RESALE' || editingInventory?.type === 'COMPOSITE') && (
                    <div>
                        <label className="block text-xs font-bold mb-1">Foto do Produto (Opcional)</label>
                        <ImageUploader 
                            value={editingInventory?.image || ''} 
                            onChange={(val) => setEditingInventory(prev => ({...prev!, image: val}))} 
                            maxSizeKB={300} 
                        />
                    </div>
                )}
                {editingInventory?.type === 'COMPOSITE' && (
                    <div className="bg-gray-50 p-4 rounded border mt-4">
                        <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><Layers size={14}/> Composição (Ficha Técnica)</h4>
                        <div className="flex gap-2 mb-2">
                            <select className="flex-1 border p-1 text-sm rounded" value={selectedIngredientAdd} onChange={e => setSelectedIngredientAdd(e.target.value)}>
                                <option value="">Adicionar ingrediente...</option>
                                {invState.inventory.filter(i => i.type !== 'COMPOSITE').map(i => (
                                    <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                ))}
                            </select>
                            <button type="button" onClick={handleAddIngredientToRecipe} className="bg-blue-600 text-white px-3 rounded"><Plus size={16}/></button>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {invRecipeStep.map((step, idx) => {
                                const ing = invState.inventory.find(i => i.id === step.ingredientId);
                                return (
                                    <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded border">
                                        <span>{ing?.name}</span>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" step="0.001" 
                                                className="w-16 border p-1 rounded text-right" 
                                                value={step.qty} 
                                                onChange={e => {
                                                    const newSteps = [...invRecipeStep];
                                                    newSteps[idx].qty = parseFloat(e.target.value);
                                                    setInvRecipeStep(newSteps);
                                                }}
                                            />
                                            <span className="text-xs text-gray-500">{ing?.unit}</span>
                                            <button type="button" onClick={() => setInvRecipeStep(invRecipeStep.filter((_, i) => i !== idx))} className="text-red-500"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-2 text-right text-sm font-bold text-gray-600">
                            Custo Estimado: R$ {invRecipeStep.reduce((acc, step) => {
                                const ing = invState.inventory.find(i => i.id === step.ingredientId);
                                return acc + ((ing?.costPrice || 0) * step.qty);
                            }, 0).toFixed(2)}
                        </div>
                    </div>
                )}
                <div className="flex gap-2 pt-4">
                    <Button type="button" variant="secondary" onClick={() => setEditingInventory(null)} className="flex-1">Cancelar</Button>
                    <Button type="submit" className="flex-1">Salvar</Button>
                </div>
            </form>
        </Modal>

        {/* Modal: Manual Stock Adjustment */}
        {stockModal && (
            <Modal isOpen={!!stockModal} onClose={() => setStockModal(null)} title={stockModal.type === 'IN' ? 'Entrada Manual' : 'Saída / Perda'} variant="dialog" maxWidth="sm">
                <form onSubmit={handleStockUpdate} className="space-y-3">
                    <input type="number" step="0.001" placeholder="Quantidade" className="w-full border p-2 rounded" value={stockModal.quantity} onChange={e => setStockModal({...stockModal, quantity: e.target.value})} autoFocus />
                    <input type="text" placeholder="Motivo (Ex: Ajuste, Perda, Doação)" className="w-full border p-2 rounded" value={stockModal.reason} onChange={e => setStockModal({...stockModal, reason: e.target.value})} />
                    <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={() => setStockModal(null)} className="flex-1">Cancelar</Button>
                        <Button type="submit" className="flex-1">Confirmar</Button>
                    </div>
                </form>
            </Modal>
        )}

        {/* Modal: Inventory Count (Balanço) */}
        {inventoryModalOpen && (
            <Modal isOpen={inventoryModalOpen} onClose={() => setInventoryModalOpen(false)} title="Contagem de Estoque (Balanço)" variant="page">
                <div className="bg-yellow-50 p-3 rounded mb-4 text-sm text-yellow-800 flex items-center gap-2">
                    <AlertTriangle size={16}/>
                    Informe a quantidade real encontrada fisicamente. O sistema calculará a diferença automaticamente.
                </div>
                <div className="flex-1 overflow-y-auto border rounded-lg max-h-[60vh]">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10">
                            <tr>
                                <th className="p-3">Item</th>
                                <th className="p-3 text-center">Un</th>
                                <th className="p-3 text-right bg-blue-50">Estoque Sistema</th>
                                <th className="p-3 text-right bg-yellow-50 w-32">Estoque Real</th>
                                <th className="p-3 text-right">Diferença</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {invState.inventory.filter(i => i.type !== 'COMPOSITE').map(item => {
                                const currentQty = item.quantity;
                                const realQty = inventoryCounts[item.id] ?? currentQty;
                                const diff = realQty - currentQty;
                                return (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="p-3 font-medium">{item.name}</td>
                                        <td className="p-3 text-center text-xs text-gray-500">{item.unit}</td>
                                        <td className="p-3 text-right font-bold text-blue-700 bg-blue-50/30">{currentQty}</td>
                                        <td className="p-2 bg-yellow-50/30">
                                            <input 
                                                type="number" 
                                                step="0.001"
                                                className="w-full border border-yellow-300 rounded p-1 text-right font-bold focus:ring-2 focus:ring-yellow-500 outline-none"
                                                value={inventoryCounts[item.id] ?? ''} 
                                                onChange={e => setInventoryCounts({...inventoryCounts, [item.id]: parseFloat(e.target.value)})}
                                                placeholder={currentQty.toString()}
                                            />
                                        </td>
                                        <td className={`p-3 text-right font-bold ${diff < 0 ? 'text-red-600' : (diff > 0 ? 'text-green-600' : 'text-gray-400')}`}>
                                            {diff > 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="flex gap-2 pt-4 border-t mt-4">
                    <Button variant="secondary" onClick={() => setInventoryModalOpen(false)} className="flex-1">Cancelar</Button>
                    <Button onClick={handleInventorySave} className="flex-1">Processar Ajustes</Button>
                </div>
            </Modal>
        )}

        {/* Inventory List Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-gray-50 text-gray-600 text-sm">
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
                        {invState.inventory.map(item => (
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
                                <td className="p-4 text-center text-sm">{item.unit}</td>
                                <td className={`p-4 text-right font-bold ${item.type === 'COMPOSITE' ? 'text-gray-400' : (item.quantity <= item.minQuantity ? 'text-red-600' : 'text-gray-800')}`}>
                                    {item.type === 'COMPOSITE' ? '-' : item.quantity}
                                </td>
                                <td className="p-4 text-right text-sm">R$ {item.costPrice.toFixed(2)}</td>
                                <td className="p-4 flex justify-end gap-2">
                                    <button onClick={() => openEditModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Editar"><Edit size={16}/></button>
                                    {item.type !== 'COMPOSITE' && (
                                        <button onClick={() => setStockModal({ itemId: item.id, type: 'IN', quantity: '', reason: '' })} className="p-2 bg-green-50 text-green-600 rounded hover:bg-green-100" title="Entrada"><Plus size={16}/></button>
                                    )}
                                    {item.type !== 'COMPOSITE' && (
                                        <button onClick={() => setStockModal({ itemId: item.id, type: 'OUT', quantity: '', reason: '' })} className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Saída/Perda"><ArrowDown size={16}/></button>
                                    )}
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