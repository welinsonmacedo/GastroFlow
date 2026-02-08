import React, { useState, useEffect, useCallback } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useUI } from '../context/UIContext';
import { Button } from '../components/Button';
import { QRCodeGenerator } from '../components/QRCodeGenerator';
import { ImageUploader } from '../components/ImageUploader';
import { Product, ProductType, Role, User, InventoryItem, Expense, InventoryType, Supplier, PurchaseItemInput, PurchaseInstallment } from '../types';
import { LayoutDashboard, Utensils, QrCode, Printer, ExternalLink, Palette, Eye, EyeOff, Save, Copy, Plus, Users, ShieldCheck, Trash2, Edit, AlertTriangle, FileBarChart, X, ArrowUp, ArrowDown, LayoutGrid, List as ListIcon, Image as ImageIcon, Calendar, TrendingUp, Search, Loader2, Menu, Activity, CheckSquare, GripVertical, Link as LinkIcon, Share2, Lock, BookOpen, Package, DollarSign, Archive, TrendingDown, RefreshCcw, Layers, ArrowLeft, Truck, FileText, ClipboardList, FileSpreadsheet, PieChart, CreditCard, Info } from 'lucide-react';
import { getTenantSlug } from '../utils/tenant';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { showAlert, showConfirm } = useUI();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PRODUCTS' | 'TABLES' | 'CUSTOMIZATION' | 'STAFF' | 'AUDIT' | 'REPORTS' | 'ACCOUNTING' | 'INVENTORY' | 'FINANCE'>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [localTheme, setLocalTheme] = useState(state.theme);

  // --- Inventory State ---
  const [editingInventory, setEditingInventory] = useState<Partial<InventoryItem> | null>(null);
  const [invRecipeStep, setInvRecipeStep] = useState<{ ingredientId: string, qty: number }[]>([]);
  const [selectedIngredientAdd, setSelectedIngredientAdd] = useState('');
  const [stockModal, setStockModal] = useState<{ itemId: string, type: 'IN' | 'OUT', quantity: string, reason: string } | null>(null);
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
  }>({ supplierId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0], items: [], taxAmount: 0, distributeTax: false });
  const [tempPurchaseItem, setTempPurchaseItem] = useState({ itemId: '', quantity: 1, unitPrice: 0 });
  
  // Installments Management
  const [paymentInstallments, setPaymentInstallments] = useState<PurchaseInstallment[]>([]);
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().split('T')[0]);

  // --- Supplier State ---
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({ name: '', contactName: '', phone: '' });

  // --- Menu Product State ---
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState('');
  const [newProductForm, setNewProductForm] = useState<Partial<Product>>({
      price: 0,
      category: 'Lanches',
      type: ProductType.KITCHEN,
      image: '',
      description: '',
      isVisible: true
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  // Staff state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<Partial<User>>({ name: '', role: Role.WAITER, pin: '', email: '', allowedRoutes: [] });

  // Finance State
  const [editingExpense, setEditingExpense] = useState<Partial<Expense> | null>(null);

  // Accounting / Report State
  const [accountingDateStart, setAccountingDateStart] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]); 
  const [accountingDateEnd, setAccountingDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [accountingData, setAccountingData] = useState<any>({ 
      revenue: 0, 
      expenses: 0, 
      netIncome: 0, 
      byMethod: {}, 
      expensesByCategory: {},
      transactionsCount: 0 
  });
  const [loadingAccounting, setLoadingAccounting] = useState(false);

  // Helpers
  const getTableUrl = (tableId: string) => `${window.location.origin}/client/table/${tableId}?restaurant=${state.tenantSlug || getTenantSlug()}`;
  const handlePrint = (tableId: string) => {
    const targetUrl = getTableUrl(tableId);
    const encodedUrl = encodeURIComponent(targetUrl);
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedUrl}&bgcolor=ffffff`;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<html><head><title>Mesa ${tableId}</title></head><body style="text-align:center;"><h1>Mesa ${tableId.replace('t','')}</h1><img src="${qrImageUrl}" onload="window.print();window.close()" /></body></html>`);
      printWindow.document.close();
    }
  };
  
  const copyInviteLink = (userEmail?: string) => {
      if (!userEmail) return showAlert({ title: "Atenção", message: "Sem email cadastrado.", type: 'WARNING' });
      const slug = state.tenantSlug || getTenantSlug();
      const link = `${window.location.origin}/login?restaurant=${slug}&email=${encodeURIComponent(userEmail)}&register=true`;
      navigator.clipboard.writeText(link).then(() => showAlert({ title: "Copiado!", message: "Link copiado.", type: 'SUCCESS' }));
  };

  // --- ACCOUNTING FETCHING ---
  const fetchAccountingData = useCallback(async () => {
      if (!state.tenantId) return;
      setLoadingAccounting(true);
      
      const start = accountingDateStart + ' 00:00:00';
      const end = accountingDateEnd + ' 23:59:59';

      try {
          const { data: trans } = await supabase
            .from('transactions')
            .select('*')
            .eq('tenant_id', state.tenantId)
            .gte('created_at', start)
            .lte('created_at', end);

          const { data: exps } = await supabase
            .from('expenses')
            .select('*')
            .eq('tenant_id', state.tenantId)
            .gte('due_date', accountingDateStart) 
            .lte('due_date', accountingDateEnd);

          const revenue = trans?.reduce((acc, t) => acc + t.amount, 0) || 0;
          const expensesTotal = exps?.reduce((acc, e) => acc + e.amount, 0) || 0;
          
          const byMethod: any = {};
          trans?.forEach(t => {
              byMethod[t.method] = (byMethod[t.method] || 0) + t.amount;
          });

          const expByCat: any = {};
          exps?.forEach(e => {
              expByCat[e.category] = (expByCat[e.category] || 0) + e.amount;
          });

          setAccountingData({
              revenue,
              expenses: expensesTotal,
              netIncome: revenue - expensesTotal,
              byMethod,
              expensesByCategory: expByCat,
              transactionsCount: trans?.length || 0,
              transactionsList: trans || [],
              expensesList: exps || []
          });

      } catch (error) {
          console.error(error);
          showAlert({ title: "Erro", message: "Falha ao carregar dados contábeis.", type: 'ERROR' });
      } finally {
          setLoadingAccounting(false);
      }
  }, [state.tenantId, accountingDateStart, accountingDateEnd]);

  useEffect(() => { 
      if (activeTab === 'ACCOUNTING') fetchAccountingData(); 
  }, [activeTab]); 

  // --- INVENTORY LOGIC ---
  const handleAddIngredientToRecipe = () => {
      if(!selectedIngredientAdd) return;
      const ing = state.inventory.find(i => i.id === selectedIngredientAdd);
      if(ing) {
          setInvRecipeStep([...invRecipeStep, { ingredientId: ing.id, qty: 1 }]);
          setSelectedIngredientAdd('');
      }
  };

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
      showAlert({ title: "Sucesso", message: "Item cadastrado no estoque!", type: 'SUCCESS' });
  };

  const handleStockUpdate = (e: React.FormEvent) => {
      e.preventDefault();
      if(!stockModal) return;
      dispatch({ 
          type: 'UPDATE_STOCK', 
          itemId: stockModal.itemId, 
          operation: stockModal.type, 
          quantity: parseFloat(stockModal.quantity), 
          reason: stockModal.reason 
      });
      setStockModal(null);
      showAlert({ title: "Sucesso", message: "Movimentação registrada!", type: 'SUCCESS' });
  };

  // --- INVENTORY TAKING (ADJUSTMENT) ---
  const handleInventoryInit = () => {
      const initialCounts: {[key:string]: number} = {};
      state.inventory.filter(i => i.type !== 'COMPOSITE').forEach(i => {
          initialCounts[i.id] = i.quantity;
      });
      setInventoryCounts(initialCounts);
      setInventoryModalOpen(true);
  };

  const handleInventorySave = () => {
      const adjustments = Object.keys(inventoryCounts).map(itemId => ({
          itemId,
          realQty: inventoryCounts[itemId]
      }));
      
      dispatch({ type: 'PROCESS_INVENTORY_ADJUSTMENT', adjustments });
      setInventoryModalOpen(false);
      showAlert({ title: "Sucesso", message: "Inventário atualizado com sucesso!", type: 'SUCCESS' });
  };

  // --- SUPPLIER LOGIC ---
  const handleAddSupplier = (e: React.FormEvent) => {
      e.preventDefault();
      if(!newSupplier.name) return;
      dispatch({ type: 'ADD_SUPPLIER', supplier: { ...newSupplier, id: '' } as Supplier });
      setSupplierModalOpen(false);
      setNewSupplier({ name: '', contactName: '', phone: '' });
      showAlert({ title: "Sucesso", message: "Fornecedor adicionado!", type: 'SUCCESS' });
  };

  // --- PURCHASE ENTRY LOGIC ---
  const handleAddItemToPurchase = () => {
      if (!tempPurchaseItem.itemId || tempPurchaseItem.quantity <= 0) return;
      
      const item = state.inventory.find(i => i.id === tempPurchaseItem.itemId);
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

  const submitPurchaseEntry = (e: React.FormEvent) => {
      e.preventDefault();
      if(!purchaseForm.supplierId || !purchaseForm.invoiceNumber || purchaseForm.items.length === 0) {
          showAlert({ title: "Erro", message: "Preencha o fornecedor, número da nota e adicione itens.", type: 'ERROR' });
          return;
      }

      const totalItems = purchaseForm.items.reduce((acc, i) => acc + i.totalPrice, 0);
      const grandTotal = totalItems + Number(purchaseForm.taxAmount || 0);
      const totalInstallments = paymentInstallments.reduce((acc, i) => acc + i.amount, 0);

      if (paymentInstallments.length > 0 && Math.abs(grandTotal - totalInstallments) > 0.05) {
          showAlert({ 
              title: "Divergência", 
              message: `O valor das parcelas (R$ ${totalInstallments.toFixed(2)}) não bate com o total da nota (R$ ${grandTotal.toFixed(2)}). Gere as parcelas novamente.`, 
              type: 'WARNING' 
          });
          return;
      }

      dispatch({
          type: 'PROCESS_PURCHASE',
          purchase: {
              ...purchaseForm,
              date: new Date(purchaseForm.date),
              totalAmount: grandTotal,
              installments: paymentInstallments.length > 0 ? paymentInstallments : [{ amount: grandTotal, dueDate: new Date(purchaseForm.date) }] // Fallback se não gerou parcelas
          }
      });

      setPurchaseModalOpen(false);
      setPurchaseForm({ supplierId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0], items: [], taxAmount: 0, distributeTax: false });
      setPaymentInstallments([]);
      showAlert({ title: "Sucesso", message: "Nota lançada! Estoque e Financeiro atualizados.", type: 'SUCCESS' });
  };

  // --- MENU LOGIC ---
  const handleAddProductToMenu = (e: React.FormEvent) => {
      e.preventDefault();
      if(!selectedStockId) return;
      const stockItem = state.inventory.find(i => i.id === selectedStockId);
      if(!stockItem) return;
      dispatch({
          type: 'ADD_PRODUCT_TO_MENU',
          product: {
              ...newProductForm,
              linkedInventoryItemId: stockItem.id,
              name: stockItem.name,
              costPrice: stockItem.costPrice,
              image: stockItem.image || newProductForm.image, // Auto-fill image from stock if available
              sortOrder: state.products.length + 1
          } as Product
      });
      setMenuModalOpen(false);
      setSelectedStockId('');
      showAlert({ title: "Sucesso", message: "Produto adicionado ao cardápio!", type: 'SUCCESS' });
  };

  const handleUpdateMenuProduct = () => {
      if(editingProduct) {
          dispatch({ type: 'UPDATE_PRODUCT', product: editingProduct });
          setEditingProduct(null);
      }
  };

  const availableForMenu = state.inventory.filter(i => 
      (i.type === 'RESALE' || i.type === 'COMPOSITE') && 
      !state.products.some(p => p.linkedInventoryItemId === i.id)
  );

  const sortedProducts = [...state.products].sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const handleDragStart = (index: number) => setDraggedItemIndex(index);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetIndex: number) => {
      if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;
      const updatedList = [...sortedProducts];
      const [movedItem] = updatedList.splice(draggedItemIndex, 1);
      updatedList.splice(targetIndex, 0, movedItem);
      updatedList.forEach((product, index) => {
          if (product.sortOrder !== (index + 1) * 10) {
               dispatch({ type: 'UPDATE_PRODUCT', product: { ...product, sortOrder: (index + 1) * 10 } });
          }
      });
      setDraggedItemIndex(null);
  };

  // --- STAFF LOGIC ---
  const handleSaveUser = (e: React.FormEvent) => {
      e.preventDefault();
      if(editingUser) dispatch({ type: 'UPDATE_USER', user: { ...editingUser, ...userForm } as User });
      else dispatch({ type: 'ADD_USER', user: { ...userForm, id: Math.random().toString() } as User });
      setEditingUser(null);
      setUserForm({ name: '', role: Role.WAITER, pin: '', email: '', allowedRoutes: [] });
      showAlert({ title: "Sucesso", message: "Usuário salvo!", type: 'SUCCESS' });
  };

  // --- FINANCE LOGIC ---
  const handleSaveExpense = (e: React.FormEvent) => {
      e.preventDefault();
      if(editingExpense) {
          dispatch({ type: 'ADD_EXPENSE', expense: { ...editingExpense, id: Math.random().toString(), isPaid: editingExpense.isPaid || false } as Expense });
          setEditingExpense(null);
          showAlert({ title: "Sucesso", message: "Despesa registrada!", type: 'SUCCESS' });
      }
  };

  const handlePayExpense = (id: string) => {
      showConfirm({
          title: "Dar Baixa",
          message: "Confirmar pagamento desta conta?",
          onConfirm: () => {
              dispatch({ type: 'PAY_EXPENSE', expenseId: id });
              showAlert({ title: "Sucesso", message: "Pagamento registrado.", type: 'SUCCESS' });
          }
      });
  };

  // --- PLAN FEATURES CHECK ---
  const { planLimits } = state;

  return (
    <div className="min-h-screen bg-gray-100 flex relative">
        {/* ... Sidebar and Nav ... */}
        <div className={`bg-slate-900 text-white w-64 p-6 fixed h-full z-50 transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 print:hidden`}>
            <div className="flex justify-between items-center mb-10">
                <h1 className="text-xl font-bold">Admin Panel</h1>
                <button onClick={() => setIsSidebarOpen(false)} className="md:hidden"><X /></button>
            </div>
            <nav className="space-y-2">
                <button onClick={() => setActiveTab('DASHBOARD')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab==='DASHBOARD'?'bg-blue-600':''}`}><LayoutDashboard size={18}/> Dashboard</button>
                
                {planLimits.allowInventory && <button onClick={() => setActiveTab('INVENTORY')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab==='INVENTORY'?'bg-blue-600':''}`}><Package size={18}/> Estoque (Cadastro)</button>}
                
                <button onClick={() => setActiveTab('PRODUCTS')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab==='PRODUCTS'?'bg-blue-600':''}`}><Utensils size={18}/> Cardápio (Venda)</button>
                
                {(planLimits.allowExpenses || planLimits.allowPurchases) && <button onClick={() => setActiveTab('FINANCE')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab==='FINANCE'?'bg-blue-600':''}`}><DollarSign size={18}/> Financeiro</button>}
                
                {planLimits.allowReports && <button onClick={() => setActiveTab('ACCOUNTING')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab==='ACCOUNTING'?'bg-blue-600':''}`}><FileSpreadsheet size={18}/> Contabilidade</button>}
                
                {planLimits.allowStaff && <button onClick={() => setActiveTab('STAFF')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab==='STAFF'?'bg-blue-600':''}`}><Users size={18}/> Equipe</button>}
                
                {planLimits.allowTableMgmt && <button onClick={() => setActiveTab('TABLES')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab==='TABLES'?'bg-blue-600':''}`}><QrCode size={18}/> Mesas QR</button>}
                
                {planLimits.allowCustomization && <button onClick={() => setActiveTab('CUSTOMIZATION')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab==='CUSTOMIZATION'?'bg-blue-600':''}`}><Palette size={18}/> Personalizar</button>}
                
                <Link to="/" className="w-full text-left p-3 rounded flex items-center gap-3 text-red-400 hover:bg-slate-800"><ArrowLeft size={18}/> Sair</Link>
            </nav>
        </div>

        <div className="flex-1 p-4 md:p-8 h-screen overflow-y-auto">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden mb-4 p-2 bg-white rounded shadow print:hidden"><Menu /></button>

            {activeTab === 'DASHBOARD' && (
                <div>
                    <h2 className="text-2xl font-bold mb-6">Visão Geral</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
                            <div className="text-gray-500 text-sm font-bold uppercase">Vendas Hoje</div>
                            <div className="text-3xl font-bold">R$ {state.transactions.reduce((acc, t) => acc + t.amount, 0).toFixed(2)}</div>
                        </div>
                        {planLimits.allowInventory && (
                            <div className="bg-white p-6 rounded-xl shadow border-l-4 border-yellow-500">
                                <div className="text-gray-500 text-sm font-bold uppercase">Estoque Baixo</div>
                                <div className="text-3xl font-bold">{state.inventory.filter(i => i.quantity <= i.minQuantity).length}</div>
                            </div>
                        )}
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-purple-500">
                            <div className="text-gray-500 text-sm font-bold uppercase">Pedidos Abertos</div>
                            <div className="text-3xl font-bold">{state.orders.filter(o => !o.isPaid).length}</div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'PRODUCTS' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Cardápio de Venda</h2>
                            <p className="text-sm text-gray-500">Gerencie os produtos visíveis para o cliente.</p>
                        </div>
                        <Button onClick={() => setMenuModalOpen(true)}><Plus size={16}/> Adicionar Produto</Button>
                    </div>

                    {/* Drag and Drop List */}
                    <div className="bg-white rounded-xl shadow-sm border p-4">
                        {sortedProducts.map((product, index) => (
                            <div 
                                key={product.id} 
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={handleDragOver}
                                onDrop={() => handleDrop(index)}
                                className="flex items-center gap-4 p-3 border-b last:border-0 hover:bg-gray-50 cursor-move"
                            >
                                <GripVertical className="text-gray-400" />
                                <img src={product.image} className="w-10 h-10 rounded object-cover bg-gray-100" />
                                <div className="flex-1">
                                    <div className="font-bold">{product.name}</div>
                                    <div className="text-xs text-gray-500">{product.category}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-blue-600">R$ {product.price.toFixed(2)}</div>
                                    {product.costPrice && <div className="text-xs text-gray-400">Custo: R$ {product.costPrice.toFixed(2)}</div>}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingProduct(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16}/></button>
                                    <button onClick={() => dispatch({type: 'UPDATE_PRODUCT', product: {...product, isVisible: !product.isVisible}})} className={`p-2 rounded ${product.isVisible ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                                        {product.isVisible ? <Eye size={16}/> : <EyeOff size={16}/>}
                                    </button>
                                    <button onClick={() => dispatch({type: 'DELETE_PRODUCT', productId: product.id})} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Modal Add/Edit Product */}
                    {(menuModalOpen || editingProduct) && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-lg">
                                <h3 className="font-bold text-lg mb-4">{editingProduct ? 'Editar Produto' : 'Adicionar ao Cardápio'}</h3>
                                
                                {!editingProduct && (
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold mb-1">Selecione do Estoque (Obrigatório)</label>
                                        <select 
                                            className="w-full border p-2 rounded" 
                                            value={selectedStockId} 
                                            onChange={e => setSelectedStockId(e.target.value)}
                                        >
                                            <option value="">Selecione...</option>
                                            {availableForMenu.map(i => (
                                                <option key={i.id} value={i.id}>{i.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <input 
                                        placeholder="Nome de Exibição" 
                                        className="w-full border p-2 rounded" 
                                        value={editingProduct ? editingProduct.name : newProductForm.name} 
                                        onChange={e => editingProduct ? setEditingProduct({...editingProduct, name: e.target.value}) : setNewProductForm({...newProductForm, name: e.target.value})} 
                                    />
                                    <input 
                                        placeholder="Preço de Venda" 
                                        type="number"
                                        className="w-full border p-2 rounded" 
                                        value={editingProduct ? editingProduct.price : newProductForm.price} 
                                        onChange={e => editingProduct ? setEditingProduct({...editingProduct, price: parseFloat(e.target.value)}) : setNewProductForm({...newProductForm, price: parseFloat(e.target.value)})} 
                                    />
                                    <textarea 
                                        placeholder="Descrição" 
                                        className="w-full border p-2 rounded" 
                                        value={editingProduct ? editingProduct.description : newProductForm.description} 
                                        onChange={e => editingProduct ? setEditingProduct({...editingProduct, description: e.target.value}) : setNewProductForm({...newProductForm, description: e.target.value})} 
                                    />
                                    <select 
                                        className="w-full border p-2 rounded" 
                                        value={editingProduct ? editingProduct.category : newProductForm.category}
                                        onChange={e => editingProduct ? setEditingProduct({...editingProduct, category: e.target.value}) : setNewProductForm({...newProductForm, category: e.target.value})}
                                    >
                                        {['Lanches', 'Pizzas', 'Pratos Principais', 'Acompanhamentos', 'Bebidas', 'Sobremesas'].map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <div>
                                        <label className="block text-xs font-bold mb-1">Imagem</label>
                                        <ImageUploader 
                                            value={editingProduct ? editingProduct.image : newProductForm.image || ''} 
                                            onChange={(val) => editingProduct ? setEditingProduct({...editingProduct, image: val}) : setNewProductForm({...newProductForm, image: val})} 
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <Button variant="secondary" onClick={() => { setMenuModalOpen(false); setEditingProduct(null); }} className="flex-1">Cancelar</Button>
                                    <Button onClick={editingProduct ? handleUpdateMenuProduct : handleAddProductToMenu} className="flex-1">Salvar</Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'ACCOUNTING' && planLimits.allowReports && (
               <div className="space-y-6">
                   <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm gap-4 print:hidden">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Relatório Contábil (DRE)</h2>
                            <p className="text-sm text-gray-500">Extrato financeiro para contabilidade e gestão.</p>
                        </div>
                        <div className="flex flex-col md:flex-row gap-2 items-end">
                            <div><label className="block text-xs font-bold text-gray-500">Início</label><input type="date" className="border p-2 rounded" value={accountingDateStart} onChange={e => setAccountingDateStart(e.target.value)} /></div>
                            <div><label className="block text-xs font-bold text-gray-500">Fim</label><input type="date" className="border p-2 rounded" value={accountingDateEnd} onChange={e => setAccountingDateEnd(e.target.value)} /></div>
                            <Button onClick={fetchAccountingData} disabled={loadingAccounting}>{loadingAccounting ? <Loader2 className="animate-spin" size={16}/> : <RefreshCcw size={16}/>} Atualizar</Button>
                            <Button variant="secondary" onClick={() => window.print()}><Printer size={16}/> Imprimir</Button>
                        </div>
                    </div>
                    
                    <div className="bg-white p-8 rounded-xl shadow-sm border print:border-none print:shadow-none">
                        <h1 className="text-3xl font-bold text-center mb-2 print:block hidden">{state.theme.restaurantName} - Relatório Financeiro</h1>
                        <p className="text-center text-gray-500 mb-8 print:block hidden">Período: {new Date(accountingDateStart).toLocaleDateString()} a {new Date(accountingDateEnd).toLocaleDateString()}</p>

                        <div className="grid grid-cols-3 gap-6 mb-8 text-center">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <span className="block text-gray-500 text-sm uppercase">Receita Bruta</span>
                                <span className="text-2xl font-bold text-green-600">R$ {accountingData.revenue.toFixed(2)}</span>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <span className="block text-gray-500 text-sm uppercase">Despesas</span>
                                <span className="text-2xl font-bold text-red-600">R$ {accountingData.expenses.toFixed(2)}</span>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <span className="block text-blue-600 text-sm uppercase font-bold">Lucro Líquido</span>
                                <span className="text-3xl font-bold text-blue-800">R$ {accountingData.netIncome.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-bold border-b pb-2 mb-4">Receita por Método</h3>
                                <ul className="space-y-2">
                                    {Object.entries(accountingData.byMethod).map(([method, amount]: any) => (
                                        <li key={method} className="flex justify-between">
                                            <span>{method}</span>
                                            <span className="font-mono">R$ {amount.toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold border-b pb-2 mb-4">Despesas por Categoria</h3>
                                <ul className="space-y-2">
                                    {Object.entries(accountingData.expensesByCategory).map(([cat, amount]: any) => (
                                        <li key={cat} className="flex justify-between">
                                            <span>{cat}</span>
                                            <span className="font-mono">R$ {amount.toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
               </div>
            )}

            {/* --- INVENTORY TAB --- */}
            {activeTab === 'INVENTORY' && planLimits.allowInventory && (
                <div className="space-y-6">
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
                                    <Button onClick={() => setPurchaseModalOpen(true)} variant="secondary" className="flex items-center gap-2 bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 text-xs md:text-sm flex-1 md:flex-none"><FileText size={16}/> Entrada</Button>
                                </>
                            )}
                            <Button onClick={handleInventoryInit} variant="secondary" className="flex items-center gap-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200 text-xs md:text-sm flex-1 md:flex-none"><ClipboardList size={16}/> Inventário</Button>
                            <Button onClick={() => { setEditingInventory({ name: '', unit: 'UN', type: 'INGREDIENT', quantity: 0, minQuantity: 5, costPrice: 0, image: '' }); setInvRecipeStep([]); }} className="text-xs md:text-sm flex-1 md:flex-none"><Plus size={16}/> Novo</Button>
                        </div>
                    </div>

                    {/* Modais de Estoque */}
                    {stockModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm">
                                <h3 className="font-bold text-lg mb-4">{stockModal.type === 'IN' ? 'Entrada Manual' : 'Saída / Perda'}</h3>
                                <form onSubmit={handleStockUpdate} className="space-y-3">
                                    <input type="number" step="0.001" placeholder="Quantidade" className="w-full border p-2 rounded" value={stockModal.quantity} onChange={e => setStockModal({...stockModal, quantity: e.target.value})} autoFocus />
                                    <input type="text" placeholder="Motivo (Ex: Ajuste, Perda, Doação)" className="w-full border p-2 rounded" value={stockModal.reason} onChange={e => setStockModal({...stockModal, reason: e.target.value})} />
                                    <div className="flex gap-2">
                                        <Button type="button" variant="secondary" onClick={() => setStockModal(null)} className="flex-1">Cancelar</Button>
                                        <Button type="submit" className="flex-1">Confirmar</Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* MODAL CADASTRO ESTOQUE (ATUALIZADO) */}
                    {editingInventory && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                                <h3 className="font-bold text-lg mb-4">Novo Item de Estoque</h3>
                                <form onSubmit={handleSaveInventoryItem} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700">Tipo do Item</label>
                                        <div className="grid grid-cols-3 gap-2 mt-1">
                                            <button type="button" onClick={() => setEditingInventory({...editingInventory, type: 'INGREDIENT'})} className={`p-2 rounded border text-xs font-bold ${editingInventory.type === 'INGREDIENT' ? 'bg-orange-100 border-orange-500 text-orange-700' : 'bg-gray-50'}`}>Matéria Prima</button>
                                            <button type="button" onClick={() => setEditingInventory({...editingInventory, type: 'RESALE'})} className={`p-2 rounded border text-xs font-bold ${editingInventory.type === 'RESALE' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-gray-50'}`}>Revenda</button>
                                            <button type="button" onClick={() => setEditingInventory({...editingInventory, type: 'COMPOSITE'})} className={`p-2 rounded border text-xs font-bold ${editingInventory.type === 'COMPOSITE' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'bg-gray-50'}`}>Produzido</button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold">Nome</label>
                                            <input required className="w-full border p-2 rounded" value={editingInventory.name} onChange={e => setEditingInventory({...editingInventory, name: e.target.value})} placeholder={editingInventory.type === 'COMPOSITE' ? 'Ex: X-Salada' : 'Ex: Farinha de Trigo'} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold">Unidade</label>
                                            <select className="w-full border p-2 rounded" value={editingInventory.unit} onChange={e => setEditingInventory({...editingInventory, unit: e.target.value})}>
                                                <option value="UN">UN</option>
                                                <option value="KG">KG</option>
                                                <option value="LT">LT</option>
                                                <option value="GR">GR</option>
                                            </select>
                                        </div>
                                        {editingInventory.type !== 'COMPOSITE' && (
                                            <div>
                                                <label className="block text-xs font-bold">
                                                    {editingInventory.id ? 'Custo Médio (R$)' : 'Custo Inicial (R$)'}
                                                </label>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    className={`w-full border p-2 rounded ${editingInventory.id ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                                    value={editingInventory.costPrice} 
                                                    onChange={e => setEditingInventory({...editingInventory, costPrice: parseFloat(e.target.value)})} 
                                                    disabled={!!editingInventory.id} // Disable if editing
                                                />
                                                {editingInventory.id && (
                                                    <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
                                                        <Info size={10}/> Atualizado via Notas de Entrada
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        {editingInventory.type !== 'COMPOSITE' && (
                                            <div>
                                                <label className="block text-xs font-bold">Estoque Inicial</label>
                                                <input type="number" className="w-full border p-2 rounded" value={editingInventory.quantity} onChange={e => setEditingInventory({...editingInventory, quantity: parseFloat(e.target.value)})} />
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-xs font-bold">Estoque Mínimo</label>
                                            <input type="number" className="w-full border p-2 rounded" value={editingInventory.minQuantity} onChange={e => setEditingInventory({...editingInventory, minQuantity: parseFloat(e.target.value)})} />
                                        </div>
                                    </div>

                                    {(editingInventory.type === 'RESALE' || editingInventory.type === 'COMPOSITE') && (
                                        <div>
                                            <label className="block text-xs font-bold mb-1">Foto do Produto (Opcional)</label>
                                            <ImageUploader 
                                                value={editingInventory.image || ''} 
                                                onChange={(val) => setEditingInventory({...editingInventory, image: val})} 
                                                maxSizeKB={300} // Limit to 300KB
                                            />
                                        </div>
                                    )}

                                    {editingInventory.type === 'COMPOSITE' && (
                                        <div className="bg-gray-50 p-4 rounded border mt-4">
                                            <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><Layers size={14}/> Composição</h4>
                                            <div className="flex gap-2 mb-2">
                                                <select className="flex-1 border p-1 text-sm rounded" value={selectedIngredientAdd} onChange={e => setSelectedIngredientAdd(e.target.value)}>
                                                    <option value="">Adicionar ingrediente...</option>
                                                    {state.inventory.filter(i => i.type !== 'COMPOSITE').map(i => (
                                                        <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                                    ))}
                                                </select>
                                                <button type="button" onClick={handleAddIngredientToRecipe} className="bg-blue-600 text-white px-3 rounded"><Plus size={16}/></button>
                                            </div>
                                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                                {invRecipeStep.map((step, idx) => {
                                                    const ing = state.inventory.find(i => i.id === step.ingredientId);
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
                                                Custo: R$ {invRecipeStep.reduce((acc, step) => {
                                                    const ing = state.inventory.find(i => i.id === step.ingredientId);
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
                            </div>
                        </div>
                    )}

                    {/* LISTA DE ESTOQUE */}
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
                                            <td className="p-4 text-center text-sm">{item.unit}</td>
                                            <td className={`p-4 text-right font-bold ${item.type === 'COMPOSITE' ? 'text-gray-400' : (item.quantity <= item.minQuantity ? 'text-red-600' : 'text-gray-800')}`}>
                                                {item.type === 'COMPOSITE' ? '-' : item.quantity}
                                            </td>
                                            <td className="p-4 text-right text-sm">R$ {item.costPrice.toFixed(2)}</td>
                                            <td className="p-4 flex justify-end gap-2">
                                                <button onClick={() => setEditingInventory(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Editar"><Edit size={16}/></button>
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
            )}

            {/* --- FINANCE TAB --- */}
            {activeTab === 'FINANCE' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm">
                        <h2 className="text-2xl font-bold text-gray-800">Financeiro</h2>
                        <Button onClick={() => setEditingExpense({ description: '', amount: 0, category: 'Outros', isPaid: false })}><Plus size={16}/> Nova Despesa</Button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-600 text-sm">
                                <tr>
                                    <th className="p-4">Descrição</th>
                                    <th className="p-4">Categoria</th>
                                    <th className="p-4">Vencimento</th>
                                    <th className="p-4 text-right">Valor</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {state.expenses.map(expense => (
                                    <tr key={expense.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-medium">{expense.description}</td>
                                        <td className="p-4 text-sm">{expense.category}</td>
                                        <td className="p-4 text-sm">{new Date(expense.dueDate).toLocaleDateString()}</td>
                                        <td className="p-4 text-right font-bold">R$ {expense.amount.toFixed(2)}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${expense.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {expense.isPaid ? 'PAGO' : 'PENDENTE'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            {!expense.isPaid && <button onClick={() => handlePayExpense(expense.id)} className="p-2 bg-green-50 text-green-600 rounded" title="Pagar"><CheckSquare size={16}/></button>}
                                            <button onClick={() => dispatch({ type: 'DELETE_EXPENSE', expenseId: expense.id })} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* MODAL EXPENSE */}
                    {editingExpense && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white p-6 rounded-xl w-full max-w-md">
                                <h3 className="font-bold text-lg mb-4">Adicionar Despesa</h3>
                                <form onSubmit={handleSaveExpense} className="space-y-4">
                                    <input required placeholder="Descrição" className="w-full border p-2 rounded" value={editingExpense.description} onChange={e => setEditingExpense({...editingExpense, description: e.target.value})} />
                                    <input required type="number" step="0.01" placeholder="Valor" className="w-full border p-2 rounded" value={editingExpense.amount} onChange={e => setEditingExpense({...editingExpense, amount: parseFloat(e.target.value)})} />
                                    <select className="w-full border p-2 rounded" value={editingExpense.category} onChange={e => setEditingExpense({...editingExpense, category: e.target.value})}>
                                        <option>Fornecedor</option><option>Aluguel</option><option>Energia</option><option>Pessoal</option><option>Outros</option>
                                    </select>
                                    <input type="date" required className="w-full border p-2 rounded" value={editingExpense.dueDate ? new Date(editingExpense.dueDate).toISOString().split('T')[0] : ''} onChange={e => setEditingExpense({...editingExpense, dueDate: new Date(e.target.value)})} />
                                    <div className="flex gap-2">
                                        <Button type="button" variant="secondary" onClick={() => setEditingExpense(null)} className="flex-1">Cancelar</Button>
                                        <Button type="submit" className="flex-1">Salvar</Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- STAFF TAB --- */}
            {activeTab === 'STAFF' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm">
                        <h2 className="text-2xl font-bold">Equipe</h2>
                        <Button onClick={() => setEditingUser({ name: '', role: Role.WAITER, pin: '', id: '', allowedRoutes: [] })}><Plus size={16}/> Novo Usuário</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {state.users.map(u => (
                            <div key={u.id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold">{u.name}</h3>
                                    <p className="text-sm text-gray-500">{u.role}</p>
                                    <p className="text-xs text-blue-600 font-mono mt-1">PIN: {u.pin}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setEditingUser(u); setUserForm(u); }} className="p-2 text-blue-600 bg-blue-50 rounded"><Edit size={16}/></button>
                                    <button onClick={() => dispatch({ type: 'DELETE_USER', userId: u.id })} className="p-2 text-red-600 bg-red-50 rounded"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* MODAL USER */}
                    {editingUser && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white p-6 rounded-xl w-full max-w-sm">
                                <h3 className="font-bold text-lg mb-4">{editingUser.id ? 'Editar' : 'Novo'} Usuário</h3>
                                <form onSubmit={handleSaveUser} className="space-y-4">
                                    <input required placeholder="Nome" className="w-full border p-2 rounded" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} />
                                    <select className="w-full border p-2 rounded" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as Role})}>
                                        <option value="WAITER">Garçom</option>
                                        <option value="KITCHEN">Cozinha</option>
                                        <option value="CASHIER">Caixa</option>
                                        <option value="ADMIN">Gerente</option>
                                    </select>
                                    <input required placeholder="PIN (4 dígitos)" maxLength={4} className="w-full border p-2 rounded" value={userForm.pin} onChange={e => setUserForm({...userForm, pin: e.target.value})} />
                                    
                                    <div className="flex gap-2">
                                        <Button type="button" variant="secondary" onClick={() => setEditingUser(null)} className="flex-1">Cancelar</Button>
                                        <Button type="submit" className="flex-1">Salvar</Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- TABLES TAB --- */}
            {activeTab === 'TABLES' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm">
                        <h2 className="text-2xl font-bold">Mesas & QR Codes</h2>
                        <Button onClick={() => dispatch({ type: 'ADD_TABLE' })}><Plus size={16}/> Adicionar Mesa</Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {state.tables.map(table => (
                            <div key={table.id} className="bg-white p-4 rounded-xl shadow-sm border flex flex-col items-center relative group">
                                <div className="text-2xl font-bold mb-2">Mesa {table.number}</div>
                                <div className="bg-white p-2 border rounded mb-2">
                                    <QRCodeGenerator tableId={table.id} size={100} />
                                </div>
                                <div className="flex gap-2 w-full mt-2">
                                    <button onClick={() => handlePrint(table.id)} className="flex-1 bg-blue-50 text-blue-600 py-1 rounded text-xs font-bold hover:bg-blue-100">Imprimir</button>
                                    <button onClick={() => dispatch({ type: 'DELETE_TABLE', tableId: table.id })} className="p-1 bg-red-50 text-red-600 rounded hover:bg-red-100"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- CUSTOMIZATION TAB --- */}
            {activeTab === 'CUSTOMIZATION' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border space-y-6">
                        <h2 className="text-xl font-bold">Aparência do App</h2>
                        <div>
                            <label className="block text-sm font-bold mb-1">Nome do Restaurante</label>
                            <input className="w-full border p-2 rounded" value={localTheme.restaurantName} onChange={e => setLocalTheme({...localTheme, restaurantName: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Cor Principal</label>
                                <div className="flex gap-2">
                                    <input type="color" className="h-10 w-10 border rounded cursor-pointer" value={localTheme.primaryColor} onChange={e => setLocalTheme({...localTheme, primaryColor: e.target.value})} />
                                    <input className="flex-1 border p-2 rounded uppercase" value={localTheme.primaryColor} onChange={e => setLocalTheme({...localTheme, primaryColor: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Cor de Fundo</label>
                                <div className="flex gap-2">
                                    <input type="color" className="h-10 w-10 border rounded cursor-pointer" value={localTheme.backgroundColor} onChange={e => setLocalTheme({...localTheme, backgroundColor: e.target.value})} />
                                    <input className="flex-1 border p-2 rounded uppercase" value={localTheme.backgroundColor} onChange={e => setLocalTheme({...localTheme, backgroundColor: e.target.value})} />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">Logo URL</label>
                            <ImageUploader value={localTheme.logoUrl} onChange={val => setLocalTheme({...localTheme, logoUrl: val})} />
                        </div>
                        <Button onClick={() => { dispatch({ type: 'UPDATE_THEME', theme: localTheme }); showAlert({ title: "Salvo", message: "Tema atualizado!", type: 'SUCCESS' }); }} className="w-full">Salvar Alterações</Button>
                    </div>

                    {/* Live Preview */}
                    <div className="border-4 border-gray-800 rounded-[2rem] overflow-hidden shadow-2xl h-[600px] relative bg-white">
                        <div className="absolute top-0 w-full h-6 bg-gray-800 flex justify-center"><div className="w-32 h-4 bg-black rounded-b-xl"></div></div>
                        <div className="h-full overflow-y-auto pt-8 pb-4" style={{ backgroundColor: localTheme.backgroundColor, color: localTheme.fontColor }}>
                            <div className="p-4">
                                <div className="flex items-center gap-2 mb-6">
                                    {localTheme.logoUrl ? <img src={localTheme.logoUrl} className="w-10 h-10 rounded-full bg-white p-1 object-contain"/> : <div className="w-10 h-10 rounded-full bg-gray-200"></div>}
                                    <h1 className="font-bold text-lg" style={{ color: localTheme.primaryColor }}>{localTheme.restaurantName}</h1>
                                </div>
                                <div className="h-40 bg-gray-200 rounded-xl mb-6 flex items-center justify-center text-gray-400">Banner</div>
                                <h2 className="font-bold text-lg mb-4">Lanches</h2>
                                <div className="space-y-4">
                                    {[1, 2].map(i => (
                                        <div key={i} className="bg-white p-3 rounded-xl shadow-sm flex gap-3">
                                            <div className="w-20 h-20 bg-gray-100 rounded-lg"></div>
                                            <div className="flex-1">
                                                <div className="h-4 w-3/4 bg-gray-200 rounded mb-2"></div>
                                                <div className="h-3 w-1/2 bg-gray-100 rounded mb-4"></div>
                                                <div className="font-bold" style={{ color: localTheme.primaryColor }}>R$ 25,00</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};