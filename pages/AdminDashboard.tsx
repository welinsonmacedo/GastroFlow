import React, { useState, useEffect, useCallback } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useUI } from '../context/UIContext';
import { Button } from '../components/Button';
import { QRCodeGenerator } from '../components/QRCodeGenerator';
import { ImageUploader } from '../components/ImageUploader';
import { Product, ProductType, Role, User, InventoryItem, Expense, InventoryType, Supplier, PurchaseItemInput, PurchaseInstallment } from '../types';
import { LayoutDashboard, Utensils, QrCode, Printer, ExternalLink, Palette, Eye, EyeOff, Save, Copy, Plus, Users, ShieldCheck, Trash2, Edit, AlertTriangle, FileBarChart, X, ArrowUp, ArrowDown, LayoutGrid, List as ListIcon, Image as ImageIcon, Calendar, TrendingUp, Search, Loader2, Menu, Activity, CheckSquare, GripVertical, Link as LinkIcon, Share2, Lock, BookOpen, Package, DollarSign, Archive, TrendingDown, RefreshCcw, Layers, ArrowLeft, Truck, FileText, ClipboardList, FileSpreadsheet, PieChart, CreditCard, Info, MapPin, Phone, User as UserIcon } from 'lucide-react';
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
                      // complement: data.complemento // Opcional, às vezes sobrescreve
                  }));
              }
          } catch (error) {
              console.error("Erro ao buscar CEP", error);
          } finally {
              setLoadingCep(false);
          }
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

  const handleInstallmentDateChange = (index: number, newDateStr: string) => {
      const newInstallments = [...paymentInstallments];
      // Create date at noon to avoid timezone rolling back
      newInstallments[index].dueDate = new Date(newDateStr + 'T12:00:00');
      setPaymentInstallments(newInstallments);
  };

  const submitPurchaseEntry = (e: React.FormEvent) => {
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

      dispatch({
          type: 'PROCESS_PURCHASE',
          purchase: {
              ...purchaseForm,
              date: new Date(purchaseForm.date),
              totalAmount: grandTotal,
              installments: finalInstallments
          }
      });

      setPurchaseModalOpen(false);
      setPurchaseForm({ supplierId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0], items: [], taxAmount: 0, distributeTax: true });
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

  // Calculate items total for purchase modal re-render
  const purchaseItemsTotal = purchaseForm.items.reduce((acc, i) => acc + i.totalPrice, 0);

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

            {/* ... DASHBOARD, PRODUCTS, ACCOUNTING (Kept similar to previous) ... */}
            {/* Omitted unchanged tabs for brevity */}
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

            {/* --- INVENTORY TAB (REFACTORED) --- */}
            {activeTab === 'INVENTORY' && planLimits.allowInventory && (
                <div className="space-y-6">
                    {/* Header Actions */}
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
                            <Button onClick={handleInventoryInit} variant="secondary" className="flex items-center gap-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200 text-xs md:text-sm flex-1 md:flex-none"><ClipboardList size={16}/> Inventário</Button>
                            <Button onClick={() => { setEditingInventory({ name: '', unit: 'UN', type: 'INGREDIENT', quantity: 0, minQuantity: 5, costPrice: 0, image: '' }); setInvRecipeStep([]); }} className="text-xs md:text-sm flex-1 md:flex-none"><Plus size={16}/> Novo Item</Button>
                        </div>
                    </div>

                    {/* MODAL FORNECEDORES (UPDATED) */}
                    {supplierModalOpen && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-2xl h-[90vh] flex flex-col">
                                <div className="flex justify-between items-center mb-4 border-b pb-2">
                                    <h3 className="font-bold text-xl">Gerenciar Fornecedores</h3>
                                    <button onClick={() => setSupplierModalOpen(false)}><X size={24}/></button>
                                </div>
                                
                                <form onSubmit={handleAddSupplier} className="bg-gray-50 p-4 rounded-lg border mb-4 space-y-4 overflow-y-auto">
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

                                    {/* Address Section */}
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
                                            {state.suppliers.map(s => (
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
                                            {state.suppliers.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-400">Nenhum fornecedor cadastrado.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ... Other Modals ... */}
                    {/* Reusing existing code structure for Purchase, Inventory, Stock Modals etc. */}
                    {/* Only showing changes for Supplier Modal above */}
                    {purchaseHistoryOpen && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-xl">Histórico de Movimentações</h3>
                                    <button onClick={() => setPurchaseHistoryOpen(false)}><X size={24}/></button>
                                </div>
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
                                            {state.inventoryLogs.map(log => {
                                                const item = state.inventory.find(i => i.id === log.item_id);
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
                                            {state.inventoryLogs.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">Nenhum histórico recente.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {purchaseModalOpen && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
                                <div className="flex justify-between items-center mb-4 shrink-0">
                                    <h3 className="font-bold text-xl">Entrada de Nota Fiscal</h3>
                                    <button onClick={() => setPurchaseModalOpen(false)}><X size={24}/></button>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                        <div>
                                            <label className="block text-xs font-bold mb-1">Fornecedor</label>
                                            <select className="w-full border p-2 rounded" value={purchaseForm.supplierId} onChange={e => setPurchaseForm({...purchaseForm, supplierId: e.target.value})}>
                                                <option value="">Selecione...</option>
                                                {state.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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

                                    {/* Item Entry Area */}
                                    <div className="bg-gray-50 p-4 rounded-lg border mb-6">
                                        <h4 className="font-bold text-sm mb-2 text-gray-700">Adicionar Itens</h4>
                                        <div className="flex flex-wrap md:flex-nowrap gap-2 items-end">
                                            <div className="flex-1 min-w-[200px]">
                                                <label className="text-xs text-gray-500">Item do Estoque</label>
                                                <select className="w-full border p-2 rounded text-sm" value={tempPurchaseItem.itemId} onChange={e => setTempPurchaseItem({...tempPurchaseItem, itemId: e.target.value})}>
                                                    <option value="">Selecione o produto...</option>
                                                    {state.inventory.filter(i => i.type !== 'COMPOSITE').map(i => (
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

                                    {/* Items List - SHOWING TAX DISTRIBUTION */}
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
                                                const invItem = state.inventory.find(i => i.id === item.inventoryItemId);
                                                
                                                // Calculate Effective Cost Visualization
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

                                    {/* Payment & Installments */}
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
                            </div>
                        </div>
                    )}

                    {inventoryModalOpen && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-xl">Contagem de Estoque (Balanço)</h3>
                                    <button onClick={() => setInventoryModalOpen(false)}><X size={24}/></button>
                                </div>
                                <div className="bg-yellow-50 p-3 rounded mb-4 text-sm text-yellow-800 flex items-center gap-2">
                                    <AlertTriangle size={16}/>
                                    Informe a quantidade real encontrada fisicamente. O sistema calculará a diferença automaticamente.
                                </div>
                                
                                <div className="flex-1 overflow-y-auto border rounded-lg">
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
                                            {state.inventory.filter(i => i.type !== 'COMPOSITE').map(item => {
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
                            </div>
                        </div>
                    )}

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

            {/* ... Other Tabs ... */}
        </div>
    </div>
  );
};