
import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useInventory } from '../../context/InventoryContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { ImageUploader } from '../../components/ImageUploader';
import { Modal } from '../../components/Modal';
import { InventoryItem, InventoryType, Supplier, PurchaseItemInput, PurchaseInstallment } from '../../types';
// Added DollarSign to the imports from lucide-react
import { Plus, Trash2, Edit, ArrowDown, Layers, ClipboardList, FileText, Truck, Star, CheckSquare, Square, Search, MapPin, Phone, User as UserIcon, Archive, AlertTriangle, X, Loader2, Info, Calendar, DollarSign } from 'lucide-react';

export const AdminInventory: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: invState, addInventoryItem, updateInventoryItem, updateStock, processInventoryAdjustment, addSupplier, deleteSupplier, processPurchase } = useInventory();
  const { showAlert, showConfirm } = useUI();
  
  // Modais
  const [editingInventory, setEditingInventory] = useState<Partial<InventoryItem> | null>(null);
  const [stockModal, setStockModal] = useState<{ itemId: string, type: 'IN' | 'OUT', quantity: string, reason: string } | null>(null);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseHistoryOpen, setPurchaseHistoryOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

  // Estados de Entrada de Nota
  const [purchaseForm, setPurchaseForm] = useState({ 
    supplierId: '', 
    invoiceNumber: '', 
    date: new Date().toISOString().split('T')[0], 
    items: [] as PurchaseItemInput[], 
    taxAmount: 0,
    distributeTax: true 
  });
  const [tempPurchaseItem, setTempPurchaseItem] = useState({ itemId: '', quantity: 1, unitPrice: 0 });
  const [paymentInstallments, setPaymentInstallments] = useState<PurchaseInstallment[]>([]);
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().split('T')[0]);

  // Estados de Fornecedor
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({ name: '', phone: '', email: '', cep: '', address: '', city: '', state: '' });
  const [loadingCep, setLoadingCep] = useState(false);
  const [inventoryCounts, setInventoryCounts] = useState<{ [key: string]: number }>({});

  // --- Handlers Fornecedor ---
  const handleCepBlur = async () => {
      const cep = newSupplier.cep?.replace(/\D/g, '');
      if (cep && cep.length === 8) {
          setLoadingCep(true);
          try {
              const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
              const data = await res.json();
              if (!data.erro) {
                  setNewSupplier(prev => ({ ...prev, address: data.logradouro, city: data.localidade, state: data.uf }));
              }
          } catch (e) { console.error(e); } finally { setLoadingCep(false); }
      }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
      e.preventDefault();
      await addSupplier(newSupplier as Supplier);
      setNewSupplier({ name: '', phone: '', email: '', cep: '', address: '', city: '', state: '' });
      showAlert({ title: "Sucesso", message: "Fornecedor cadastrado!", type: 'SUCCESS' });
  };

  // --- Handlers Entrada de Nota ---
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

  const generateInstallments = () => {
      const itemsTotal = purchaseForm.items.reduce((acc, i) => acc + i.totalPrice, 0);
      const grandTotal = itemsTotal + Number(purchaseForm.taxAmount || 0);
      if (grandTotal <= 0) return;

      const count = Math.max(1, Math.min(12, installmentsCount));
      const amountPerInst = grandTotal / count;
      const baseDate = new Date(firstDueDate + 'T12:00:00');
      
      const newInst: PurchaseInstallment[] = [];
      for (let i = 0; i < count; i++) {
          const date = new Date(baseDate);
          date.setMonth(date.getMonth() + i);
          newInst.push({ dueDate: date, amount: parseFloat(amountPerInst.toFixed(2)) });
      }
      
      const sum = newInst.reduce((acc, i) => acc + i.amount, 0);
      const diff = grandTotal - sum;
      if (Math.abs(diff) > 0.001) newInst[newInst.length - 1].amount += diff;

      setPaymentInstallments(newInst);
  };

  const handleProcessPurchase = async () => {
      if(!purchaseForm.supplierId || !purchaseForm.invoiceNumber || purchaseForm.items.length === 0) {
          return showAlert({ title: "Dados Incompletos", message: "Informe fornecedor, nota e pelo menos um item.", type: 'WARNING' });
      }

      const itemsTotal = purchaseForm.items.reduce((acc, i) => acc + i.totalPrice, 0);
      const grandTotal = itemsTotal + Number(purchaseForm.taxAmount || 0);
      let finalInst = paymentInstallments;
      if (finalInst.length === 0) finalInst = [{ dueDate: new Date(purchaseForm.date), amount: grandTotal }];

      await processPurchase({
          ...purchaseForm,
          date: new Date(purchaseForm.date),
          totalAmount: grandTotal,
          installments: finalInst
      });

      setPurchaseModalOpen(false);
      setPurchaseForm({ supplierId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0], items: [], taxAmount: 0, distributeTax: true });
      setPaymentInstallments([]);
      showAlert({ title: "Sucesso", message: "Nota fiscal lançada e estoque atualizado!", type: 'SUCCESS' });
  };

  // --- Handlers Estoque ---
  const handleSaveInventoryItem = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingInventory || !editingInventory.name) return;
      const finalItem: any = { ...editingInventory };
      if (finalItem.id) await updateInventoryItem(finalItem as InventoryItem);
      else await addInventoryItem({ ...finalItem, isExtra: finalItem.isExtra || false } as InventoryItem);
      setEditingInventory(null);
      showAlert({ title: "Sucesso", message: "Item salvo!", type: 'SUCCESS' });
  };

  // Added missing handleStockUpdate function
  const handleStockUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!stockModal) return;
      const qty = parseFloat(stockModal.quantity);
      if (isNaN(qty) || qty <= 0) {
          showAlert({ title: "Erro", message: "Informe uma quantidade válida.", type: 'ERROR' });
          return;
      }
      await updateStock(stockModal.itemId, qty, stockModal.type, stockModal.reason);
      setStockModal(null);
      showAlert({ title: "Sucesso", message: "Movimentação registrada!", type: 'SUCCESS' });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
            <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Archive className="text-orange-500"/> Gestão de Estoque</h2>
                <p className="text-sm text-gray-500">Insumos, controle de compras e balanço.</p>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button onClick={() => setPurchaseHistoryOpen(true)} variant="secondary" className="bg-slate-50 text-slate-700"><FileText size={16}/> Logs</Button>
                <Button onClick={() => setSupplierModalOpen(true)} variant="secondary" className="bg-slate-50 text-slate-700"><Truck size={16}/> Fornecedores</Button>
                <Button onClick={() => setPurchaseModalOpen(true)} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100"><Plus size={16}/> Entrada Nota</Button>
                <Button onClick={() => setInventoryModalOpen(true)} variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-100"><ClipboardList size={16}/> Balanço</Button>
                <Button onClick={() => setEditingInventory({ name: '', unit: 'UN', type: 'INGREDIENT', quantity: 0, minQuantity: 5, costPrice: 0, isExtra: false })}><Plus size={16}/> Novo Insumo</Button>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b">
                        <tr><th className="p-4">Item</th><th className="p-4">Tipo</th><th className="p-4 text-right">Quantidade</th><th className="p-4 text-right">Custo Médio</th><th className="p-4 text-right">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {invState.inventory.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                            {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <Layers className="text-slate-400" size={20}/>}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 flex items-center gap-2">{item.name}{item.isExtra && <span className="bg-amber-100 text-amber-700 text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase">Adicional</span>}</div>
                                            {item.quantity <= item.minQuantity && <span className="text-[9px] text-red-500 font-bold uppercase">Estoque Baixo</span>}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${item.type === 'INGREDIENT' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                        {item.type === 'INGREDIENT' ? 'INSUMO' : 'REVENDA'}
                                    </span>
                                </td>
                                <td className={`p-4 text-right font-mono font-bold text-lg ${item.quantity <= item.minQuantity ? 'text-red-600' : 'text-slate-700'}`}>{item.quantity.toFixed(2)} <span className="text-[10px] text-slate-400">{item.unit}</span></td>
                                <td className="p-4 text-right font-black text-emerald-600">R$ {item.costPrice.toFixed(2)}</td>
                                <td className="p-4 text-right flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingInventory(item)} className="p-2 text-slate-400 hover:text-blue-600"><Edit size={18}/></button>
                                    <button onClick={() => setStockModal({ itemId: item.id, type: 'IN', quantity: '', reason: '' })} className="p-2 text-slate-400 hover:text-green-600"><Plus size={18}/></button>
                                    <button onClick={() => setStockModal({ itemId: item.id, type: 'OUT', quantity: '', reason: '' })} className="p-2 text-slate-400 hover:text-red-600"><ArrowDown size={18}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* MODAL: ENTRADA DE NOTA (ERPFied) */}
        {purchaseModalOpen && (
            <Modal isOpen={purchaseModalOpen} onClose={() => setPurchaseModalOpen(false)} title="Lançamento Profissional de Nota Fiscal" variant="page">
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fornecedor</label>
                            <select className="w-full border-2 p-3 rounded-xl bg-white focus:border-blue-500 outline-none shadow-sm" value={purchaseForm.supplierId} onChange={e => setPurchaseForm({...purchaseForm, supplierId: e.target.value})}>
                                <option value="">Selecione o fornecedor...</option>
                                {invState.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Número da Nota</label>
                            <input className="w-full border-2 p-3 rounded-xl focus:border-blue-500 outline-none" placeholder="000.000.000" value={purchaseForm.invoiceNumber} onChange={e => setPurchaseForm({...purchaseForm, invoiceNumber: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Data de Emissão</label>
                            <input type="date" className="w-full border-2 p-3 rounded-xl focus:border-blue-500 outline-none" value={purchaseForm.date} onChange={e => setPurchaseForm({...purchaseForm, date: e.target.value})} />
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Plus size={16} className="text-blue-600"/> Adicionar Itens</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">Item do Estoque</label>
                                <select className="w-full border-2 p-2.5 rounded-xl bg-white text-sm" value={tempPurchaseItem.itemId} onChange={e => setTempPurchaseItem({...tempPurchaseItem, itemId: e.target.value})}>
                                    <option value="">Selecione um insumo...</option>
                                    {invState.inventory.filter(i=>i.type!=='COMPOSITE').map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">Qtd</label>
                                <input type="number" step="0.001" className="w-full border-2 p-2.5 rounded-xl" value={tempPurchaseItem.quantity} onChange={e => setTempPurchaseItem({...tempPurchaseItem, quantity: parseFloat(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">Preço Un. (R$)</label>
                                <input type="number" step="0.01" className="w-full border-2 p-2.5 rounded-xl" value={tempPurchaseItem.unitPrice} onChange={e => setTempPurchaseItem({...tempPurchaseItem, unitPrice: parseFloat(e.target.value)})} />
                            </div>
                        </div>
                        <Button onClick={handleAddItemToPurchase} variant="secondary" className="mt-4 w-full md:w-auto"><Plus size={16}/> Inserir na Nota</Button>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900 text-white">
                                <tr>
                                    <th className="p-3">Item</th>
                                    <th className="p-3 text-right">Qtd</th>
                                    <th className="p-3 text-right">Preço Un.</th>
                                    <th className="p-3 text-right">Total</th>
                                    <th className="p-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {purchaseForm.items.map((it, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-3 font-bold">{invState.inventory.find(i=>i.id===it.inventoryItemId)?.name}</td>
                                        <td className="p-3 text-right font-mono">{it.quantity}</td>
                                        <td className="p-3 text-right font-mono">R$ {it.unitPrice.toFixed(2)}</td>
                                        <td className="p-3 text-right font-black text-blue-600">R$ {it.totalPrice.toFixed(2)}</td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => setPurchaseForm(prev => ({...prev, items: prev.items.filter((_, i) => i !== idx)}))} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                                {purchaseForm.items.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-slate-400">Nenhum item adicionado ainda.</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t">
                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-800 flex items-center gap-2"><DollarSign size={18} className="text-emerald-600"/> Financeiro (Contas a Pagar)</h4>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Parcelas</label>
                                        <select className="w-full border-2 p-2 rounded-lg bg-white" value={installmentsCount} onChange={e => setInstallmentsCount(parseInt(e.target.value))}>
                                            {[1,2,3,4,5,6,10,12].map(n => <option key={n} value={n}>{n}x</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase">1º Vencimento</label>
                                        <input type="date" className="w-full border-2 p-2 rounded-lg" value={firstDueDate} onChange={e => setFirstDueDate(e.target.value)} />
                                    </div>
                                </div>
                                <Button onClick={generateInstallments} variant="secondary" className="w-full text-xs" size="sm">Calcular Parcelas</Button>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {paymentInstallments.map((inst, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border text-xs">
                                            <span className="font-bold text-slate-400">{idx+1}ª</span>
                                            <span className="font-mono">{inst.dueDate.toLocaleDateString()}</span>
                                            <span className="font-black text-emerald-600">R$ {inst.amount.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-800 flex items-center gap-2"><CheckSquare size={18} className="text-blue-600"/> Resumo e Impostos</h4>
                            <div className="bg-white p-6 rounded-xl border-2 border-blue-50 space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Total Produtos:</span>
                                    <span className="font-bold">R$ {purchaseForm.items.reduce((acc, i) => acc + i.totalPrice, 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Impostos / Frete (+):</span>
                                    <input type="number" step="0.01" className="w-24 border-b-2 text-right font-bold focus:border-blue-500 outline-none" value={purchaseForm.taxAmount} onChange={e => setPurchaseForm({...purchaseForm, taxAmount: parseFloat(e.target.value) || 0})} />
                                </div>
                                <div className="flex items-center gap-2 py-2 border-y">
                                    <input type="checkbox" checked={purchaseForm.distributeTax} onChange={e => setPurchaseForm({...purchaseForm, distributeTax: e.target.checked})} className="w-4 h-4" />
                                    <span className="text-xs font-bold text-slate-600">Distribuir impostos no custo dos produtos?</span>
                                </div>
                                <div className="flex justify-between items-center text-xl font-black pt-2">
                                    <span>TOTAL DA NOTA:</span>
                                    <span className="text-blue-700 font-mono">R$ {(purchaseForm.items.reduce((acc, i) => acc + i.totalPrice, 0) + (purchaseForm.taxAmount || 0)).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6 border-t">
                        <Button variant="secondary" onClick={() => setPurchaseModalOpen(false)} className="flex-1 py-4">Cancelar</Button>
                        <Button onClick={handleProcessPurchase} className="flex-1 py-4 shadow-xl">Confirmar Lançamento</Button>
                    </div>
                </div>
            </Modal>
        )}

        {/* MODAL: FORNECEDORES (ERPFied) */}
        {supplierModalOpen && (
            <Modal isOpen={supplierModalOpen} onClose={() => setSupplierModalOpen(false)} title="Gestão de Fornecedores" variant="page">
                <div className="space-y-8">
                    <form onSubmit={handleAddSupplier} className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Novo Fornecedor</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">Razão Social / Nome Fantasia</label>
                                <input required className="w-full border-2 p-2.5 rounded-xl" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} placeholder="Ex: Distribuidora de Carnes Silva" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">WhatsApp / Telefone</label>
                                <input className="w-full border-2 p-2.5 rounded-xl" value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} placeholder="(00) 00000-0000" />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">CEP</label>
                                <div className="relative">
                                    <input className="w-full border-2 p-2.5 rounded-xl" value={newSupplier.cep} onChange={e => setNewSupplier({...newSupplier, cep: e.target.value})} onBlur={handleCepBlur} placeholder="00000-000" />
                                    {loadingCep && <Loader2 className="absolute right-3 top-3 animate-spin text-blue-500" size={16}/>}
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">Logradouro / Endereço</label>
                                <input className="w-full border-2 p-2.5 rounded-xl" value={newSupplier.address} onChange={e => setNewSupplier({...newSupplier, address: e.target.value})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">E-mail para Pedidos</label>
                                <input type="email" className="w-full border-2 p-2.5 rounded-xl" value={newSupplier.email} onChange={e => setNewSupplier({...newSupplier, email: e.target.value})} />
                            </div>
                            <Button type="submit" className="md:mt-5">Cadastrar Fornecedor</Button>
                        </div>
                    </form>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {invState.suppliers.map(s => (
                            <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-colors group">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-slate-800 leading-tight">{s.name}</h4>
                                        <button onClick={() => deleteSupplier(s.id)} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-2"><Phone size={12}/> {s.phone}</div>
                                    <div className="text-xs text-slate-500 flex items-center gap-2"><MapPin size={12}/> {s.city} - {s.state}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
        )}

        {/* MODAL: LOGS DE MOVIMENTAÇÃO */}
        {purchaseHistoryOpen && (
            <Modal isOpen={purchaseHistoryOpen} onClose={() => setPurchaseHistoryOpen(false)} title="Histórico de Movimentações de Estoque" variant="page">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest">
                            <tr>
                                <th className="p-3">Data/Hora</th>
                                <th className="p-3">Item</th>
                                <th className="p-3">Operação</th>
                                <th className="p-3 text-right">Qtd</th>
                                <th className="p-3">Motivo</th>
                                <th className="p-3">Usuário</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {invState.inventoryLogs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 whitespace-nowrap text-slate-400">{log.created_at.toLocaleString()}</td>
                                    <td className="p-3 font-bold text-slate-700">{invState.inventory.find(i=>i.id===log.item_id)?.name || 'Removido'}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase
                                            ${log.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                                        `}>
                                            {log.type === 'IN' ? 'ENTRADA' : 'SAÍDA'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right font-mono font-bold text-slate-600">{log.quantity}</td>
                                    <td className="p-3 text-slate-500">{log.reason}</td>
                                    <td className="p-3 text-slate-400 italic">{log.user_name}</td>
                                </tr>
                            ))}
                            {invState.inventoryLogs.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-slate-400">Nenhum log encontrado.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Modal>
        )}

        {/* MODAL: BALANÇO DE ESTOQUE */}
        {inventoryModalOpen && (
            <Modal isOpen={inventoryModalOpen} onClose={() => setInventoryModalOpen(false)} title="Inventário (Contagem Física)" variant="page">
                <div className="space-y-6">
                    <div className="bg-amber-50 p-4 rounded-xl border-2 border-dashed border-amber-200 text-amber-800 text-sm flex gap-3">
                        <Info size={20} className="shrink-0"/>
                        <p>Informe a quantidade real contada na prateleira. O sistema ajustará o estoque atual e gerará logs de perda ou sobra automaticamente.</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900 text-white">
                                <tr>
                                    <th className="p-3">Item</th>
                                    <th className="p-3 text-right">Estoque Virtual</th>
                                    <th className="p-3 text-right w-32">Contagem Real</th>
                                    <th className="p-3 text-right">Diferença</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {invState.inventory.filter(i=>i.type!=='COMPOSITE').map(item => {
                                    const real = inventoryCounts[item.id] ?? item.quantity;
                                    const diff = real - item.quantity;
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="p-3 font-bold">{item.name} ({item.unit})</td>
                                            <td className="p-3 text-right font-mono">{item.quantity}</td>
                                            <td className="p-2">
                                                <input type="number" step="0.001" className="w-full border-2 p-1.5 rounded-lg text-right font-bold focus:border-yellow-500 outline-none" value={inventoryCounts[item.id] ?? ''} onChange={e => setInventoryCounts({...inventoryCounts, [item.id]: parseFloat(e.target.value)})} placeholder={item.quantity.toString()} />
                                            </td>
                                            <td className={`p-3 text-right font-black ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-green-600' : 'text-slate-300'}`}>
                                                {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex gap-4 pt-6 border-t">
                        <Button variant="secondary" onClick={() => setInventoryModalOpen(false)} className="flex-1 py-4">Cancelar</Button>
                        <Button onClick={() => { processInventoryAdjustment(Object.keys(inventoryCounts).map(id=>({itemId: id, realQty: inventoryCounts[id]}))); setInventoryModalOpen(false); showAlert({title:"Sucesso", message:"Balanço finalizado!", type:'SUCCESS'}); }} className="flex-1 py-4 shadow-xl">Finalizar Inventário</Button>
                    </div>
                </div>
            </Modal>
        )}

        {/* MODAL: MOVIMENTAÇÃO MANUAL */}
        {stockModal && (
            <Modal isOpen={!!stockModal} onClose={() => setStockModal(null)} title={stockModal.type === 'IN' ? 'Entrada Avulsa' : 'Saída / Perda Manual'} variant="dialog" maxWidth="sm">
                <form onSubmit={handleStockUpdate} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Quantidade</label>
                        <input type="number" step="0.001" className="w-full border-2 p-3 rounded-xl font-bold text-center text-2xl focus:border-blue-500 outline-none" value={stockModal.quantity} onChange={e => setStockModal({...stockModal, quantity: e.target.value})} autoFocus />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Motivo / Justificativa</label>
                        <input className="w-full border-2 p-3 rounded-xl text-sm focus:border-blue-500 outline-none" placeholder="Ex: Ajuste de quebra, Bonificação..." value={stockModal.reason} onChange={e => setStockModal({...stockModal, reason: e.target.value})} />
                    </div>
                    <Button type="submit" className="w-full py-4 text-lg">Confirmar Ajuste</Button>
                </form>
            </Modal>
        )}

        {/* MODAL: CADASTRO DE ITEM (Manteve funcionalidade, poliu UI) */}
        {editingInventory && (
            <Modal isOpen={!!editingInventory} onClose={() => setEditingInventory(null)} title={editingInventory.id ? "Editar Insumo" : "Novo Item de Estoque"} variant="page">
                <form onSubmit={handleSaveInventoryItem} className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex justify-between items-center shadow-inner">
                        <div className="max-w-[80%]">
                            <h4 className="font-black text-slate-800 uppercase tracking-tight">Este item é um adicional de venda?</h4>
                            <p className="text-xs text-slate-500">Marque se ele for aparecer como opcional pago no cardápio (ex: Bacon Extra, Queijo).</p>
                        </div>
                        <button type="button" onClick={() => setEditingInventory({...editingInventory!, isExtra: !editingInventory!.isExtra})} className={`p-3 rounded-xl transition-all ${editingInventory.isExtra ? 'bg-orange-500 text-white shadow-lg' : 'bg-white border text-slate-200'}`}>
                            {editingInventory.isExtra ? <CheckSquare size={28}/> : <Square size={28}/>}
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase px-1">Nome do Item</label>
                            <input required className="w-full border-2 p-3 rounded-xl focus:border-blue-500 outline-none" value={editingInventory.name} onChange={e => setEditingInventory({...editingInventory!, name: e.target.value})} placeholder="Ex: Filé de Frango, Coca-Cola 350ml" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase px-1">Unidade</label>
                            <select className="w-full border-2 p-3 rounded-xl bg-white focus:border-blue-500 outline-none" value={editingInventory.unit} onChange={e => setEditingInventory({...editingInventory!, unit: e.target.value})}>
                                <option value="UN">UN (Unidade)</option>
                                <option value="KG">KG (Quilo)</option>
                                <option value="LT">LT (Litro)</option>
                                <option value="GR">GR (Grama)</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase px-1">Custo Médio Unitário (R$)</label>
                            <input type="number" step="0.01" className="w-full border-2 p-3 rounded-xl font-bold text-emerald-600 focus:border-emerald-500 outline-none" value={editingInventory.costPrice} onChange={e => setEditingInventory({...editingInventory!, costPrice: parseFloat(e.target.value)})} />
                        </div>
                        {!editingInventory.id && (
                             <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Estoque Inicial</label>
                                <input type="number" step="0.001" className="w-full border-2 p-3 rounded-xl font-bold text-blue-600 focus:border-blue-500 outline-none" value={editingInventory.quantity} onChange={e => setEditingInventory({...editingInventory!, quantity: parseFloat(e.target.value)})} />
                             </div>
                        )}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase px-1">Alerta de Estoque Mínimo</label>
                            <input type="number" className="w-full border-2 p-3 rounded-xl font-bold text-red-600 focus:border-red-500 outline-none" value={editingInventory.minQuantity} onChange={e => setEditingInventory({...editingInventory!, minQuantity: parseFloat(e.target.value)})} />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase px-1">Imagem do Produto (Opcional)</label>
                        <ImageUploader value={editingInventory.image || ''} onChange={(val) => setEditingInventory({...editingInventory!, image: val})} />
                    </div>
                    <div className="flex gap-4 pt-6 border-t"><Button type="button" variant="secondary" onClick={() => setEditingInventory(null)} className="flex-1">Cancelar</Button><Button type="submit" className="flex-1">Salvar Insumo</Button></div>
                </form>
            </Modal>
        )}
    </div>
  );
};
