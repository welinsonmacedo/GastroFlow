import React, { useState, useEffect, useCallback } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useUI } from '../context/UIContext';
import { Button } from '../components/Button';
import { QRCodeGenerator } from '../components/QRCodeGenerator';
import { ImageUploader } from '../components/ImageUploader';
import { Product, ProductType, Role, User, InventoryItem, Expense, InventoryType, Supplier, PurchaseItemInput, PurchaseInstallment } from '../types';
import { LayoutDashboard, Utensils, QrCode, Printer, ExternalLink, Palette, Eye, EyeOff, Save, Copy, Plus, Users, ShieldCheck, Trash2, Edit, AlertTriangle, FileBarChart, X, ArrowUp, ArrowDown, LayoutGrid, List as ListIcon, Image as ImageIcon, Calendar, TrendingUp, Search, Loader2, Menu, Activity, CheckSquare, GripVertical, Link as LinkIcon, Share2, Lock, BookOpen, Package, DollarSign, Archive, TrendingDown, RefreshCcw, Layers, ArrowLeft, Truck, FileText, ClipboardList } from 'lucide-react';
import { getTenantSlug } from '../utils/tenant';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { showAlert, showConfirm } = useUI();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PRODUCTS' | 'TABLES' | 'CUSTOMIZATION' | 'STAFF' | 'AUDIT' | 'REPORTS' | 'INVENTORY' | 'FINANCE'>('DASHBOARD');
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

  // Report State
  const [reportDateStart, setReportDateStart] = useState(new Date().toISOString().split('T')[0]);
  const [reportDateEnd, setReportDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<any>({ transactions: [], topProducts: [], totalSales: 0, salesByMethod: {} });
  const [loadingReport, setLoadingReport] = useState(false);

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
  const handlePrintReport = () => window.print();
  
  const copyInviteLink = (userEmail?: string) => {
      if (!userEmail) return showAlert({ title: "Atenção", message: "Sem email cadastrado.", type: 'WARNING' });
      const slug = state.tenantSlug || getTenantSlug();
      const link = `${window.location.origin}/login?restaurant=${slug}&email=${encodeURIComponent(userEmail)}&register=true`;
      navigator.clipboard.writeText(link).then(() => showAlert({ title: "Copiado!", message: "Link copiado.", type: 'SUCCESS' }));
  };

  // --- REPORT FETCHING ---
  const fetchReportData = useCallback(async () => {
      if (!state.tenantId || !state.planLimits.allowReports) return;
      setLoadingReport(true);
      const start = reportDateStart + ' 00:00:00';
      const end = reportDateEnd + ' 23:59:59';
      try {
          const { data: transactions } = await supabase.from('transactions').select('*').eq('tenant_id', state.tenantId).gte('created_at', start).lte('created_at', end);
          const totalSales = transactions?.reduce((acc, t) => acc + t.amount, 0) || 0;
          setReportData({ transactions: transactions || [], topProducts: [], totalSales, salesByMethod: {} });
      } catch (error) { console.error(error); } finally { setLoadingReport(false); }
  }, [state.tenantId, reportDateStart, reportDateEnd, state.planLimits.allowReports]);

  useEffect(() => { if (activeTab === 'REPORTS') fetchReportData(); }, [activeTab, fetchReportData]);

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

      // Se for composto, monta a receita
      const finalItem: any = { ...editingInventory };
      if (finalItem.type === 'COMPOSITE') {
          finalItem.recipe = invRecipeStep;
          // Calcula custo estimado
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
      // Initialize counts with current system stock
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
          date.setDate(date.getDate() + (i * 30)); // Aproximação +30 dias
          newInst.push({
              dueDate: date,
              amount: parseFloat(amountPerInst.toFixed(2))
          });
      }
      
      // Ajuste de centavos na última parcela
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

      // Validação básica do valor (margem de erro de 1 centavo)
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

  const handleSaveUser = (e: React.FormEvent) => {
      e.preventDefault();
      if(editingUser) dispatch({ type: 'UPDATE_USER', user: { ...editingUser, ...userForm } as User });
      else dispatch({ type: 'ADD_USER', user: { ...userForm, id: Math.random().toString() } as User });
      setEditingUser(null);
      setUserForm({ name: '', role: Role.WAITER, pin: '', email: '', allowedRoutes: [] });
  };

  const handleSaveExpense = (e: React.FormEvent) => {
      e.preventDefault();
      if(editingExpense) dispatch({ type: 'ADD_EXPENSE', expense: { ...editingExpense, id: Math.random().toString(), isPaid: editingExpense.isPaid || false } as Expense });
      setEditingExpense(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex relative">
        <div className={`bg-slate-900 text-white w-64 p-6 fixed h-full z-50 transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
            <div className="flex justify-between items-center mb-10">
                <h1 className="text-xl font-bold">Admin Panel</h1>
                <button onClick={() => setIsSidebarOpen(false)} className="md:hidden"><X /></button>
            </div>
            <nav className="space-y-2">
                <button onClick={() => setActiveTab('DASHBOARD')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab==='DASHBOARD'?'bg-blue-600':''}`}><LayoutDashboard size={18}/> Dashboard</button>
                <button onClick={() => setActiveTab('INVENTORY')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab==='INVENTORY'?'bg-blue-600':''}`}><Package size={18}/> Estoque (Cadastro)</button>
                <button onClick={() => setActiveTab('PRODUCTS')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab==='PRODUCTS'?'bg-blue-600':''}`}><Utensils size={18}/> Cardápio (Venda)</button>
                <button onClick={() => setActiveTab('FINANCE')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab==='FINANCE'?'bg-blue-600':''}`}><DollarSign size={18}/> Financeiro</button>
                <button onClick={() => setActiveTab('STAFF')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab==='STAFF'?'bg-blue-600':''}`}><Users size={18}/> Equipe</button>
                <button onClick={() => setActiveTab('TABLES')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab==='TABLES'?'bg-blue-600':''}`}><QrCode size={18}/> Mesas QR</button>
                <button onClick={() => setActiveTab('CUSTOMIZATION')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab==='CUSTOMIZATION'?'bg-blue-600':''}`}><Palette size={18}/> Personalizar</button>
                <Link to="/" className="w-full text-left p-3 rounded flex items-center gap-3 text-red-400 hover:bg-slate-800"><ArrowLeft size={18}/> Sair</Link>
            </nav>
        </div>

        <div className="flex-1 p-8 h-screen overflow-y-auto">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden mb-4 p-2 bg-white rounded shadow"><Menu /></button>

            {activeTab === 'DASHBOARD' && (
                <div>
                    <h2 className="text-2xl font-bold mb-6">Visão Geral</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
                            <div className="text-gray-500 text-sm font-bold uppercase">Vendas Hoje</div>
                            <div className="text-3xl font-bold">R$ {state.transactions.reduce((acc, t) => acc + t.amount, 0).toFixed(2)}</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-yellow-500">
                            <div className="text-gray-500 text-sm font-bold uppercase">Estoque Baixo</div>
                            <div className="text-3xl font-bold">{state.inventory.filter(i => i.quantity <= i.minQuantity).length}</div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'INVENTORY' && (
                <div className="space-y-6">
                    <div className="flex flex-wrap justify-between items-center bg-white p-6 rounded-xl shadow-sm gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Estoque & Fichas Técnicas</h2>
                            <p className="text-sm text-gray-500">Cadastre aqui TODOS os itens: ingredientes, bebidas e pratos.</p>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => setPurchaseHistoryOpen(true)} variant="outline" className="flex items-center gap-2" title="Histórico de Notas">
                                <FileText size={16}/> Histórico
                            </Button>
                            <Button onClick={() => setSupplierModalOpen(true)} variant="outline" className="flex items-center gap-2">
                                <Truck size={16}/> Fornecedores
                            </Button>
                            <Button onClick={handleInventoryInit} variant="secondary" className="flex items-center gap-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200">
                                <ClipboardList size={16}/> Realizar Inventário
                            </Button>
                            <Button onClick={() => setPurchaseModalOpen(true)} variant="secondary" className="flex items-center gap-2 bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200">
                                <FileText size={16}/> Entrada de Nota
                            </Button>
                            <Button onClick={() => { setEditingInventory({ name: '', unit: 'UN', type: 'INGREDIENT', quantity: 0, minQuantity: 5, costPrice: 0 }); setInvRecipeStep([]); }}>
                                <Plus size={16}/> Novo Item
                            </Button>
                        </div>
                    </div>

                    {/* MODAL INVENTÁRIO (STOCK TAKING) */}
                    {inventoryModalOpen && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                                <div className="flex justify-between items-center mb-4 border-b pb-4">
                                    <div>
                                        <h3 className="font-bold text-lg">Contagem de Estoque (Inventário)</h3>
                                        <p className="text-xs text-gray-500">Ajuste a quantidade real. A diferença será registrada automaticamente.</p>
                                    </div>
                                    <button onClick={() => setInventoryModalOpen(false)}><X size={20}/></button>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-100 text-gray-600 sticky top-0">
                                            <tr>
                                                <th className="p-3 text-left">Item</th>
                                                <th className="p-3 text-center">Unidade</th>
                                                <th className="p-3 text-center bg-blue-50">Qtd Sistema</th>
                                                <th className="p-3 text-center bg-yellow-50 w-32">Contagem Real</th>
                                                <th className="p-3 text-right">Diferença</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {state.inventory.filter(i => i.type !== 'COMPOSITE').map(item => {
                                                const diff = (inventoryCounts[item.id] || 0) - item.quantity;
                                                return (
                                                    <tr key={item.id} className="hover:bg-gray-50">
                                                        <td className="p-3 font-medium">{item.name}</td>
                                                        <td className="p-3 text-center text-gray-500">{item.unit}</td>
                                                        <td className="p-3 text-center font-bold text-blue-700 bg-blue-50/50">{item.quantity}</td>
                                                        <td className="p-3 text-center bg-yellow-50/50">
                                                            <input 
                                                                type="number" 
                                                                className="w-full text-center border border-yellow-300 rounded p-1 font-bold bg-white focus:ring-2 focus:ring-yellow-400 outline-none"
                                                                value={inventoryCounts[item.id]}
                                                                onChange={(e) => setInventoryCounts({...inventoryCounts, [item.id]: parseFloat(e.target.value) || 0})}
                                                            />
                                                        </td>
                                                        <td className={`p-3 text-right font-bold ${diff < 0 ? 'text-red-500' : diff > 0 ? 'text-green-500' : 'text-gray-300'}`}>
                                                            {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="pt-4 border-t flex justify-end gap-2 mt-4">
                                    <Button variant="secondary" onClick={() => setInventoryModalOpen(false)}>Cancelar</Button>
                                    <Button onClick={handleInventorySave}>Salvar Ajustes</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODAL HISTÓRICO DE COMPRAS */}
                    {purchaseHistoryOpen && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                                <div className="flex justify-between items-center mb-4 border-b pb-4">
                                    <h3 className="font-bold text-lg">Histórico de Compras (Fornecedores)</h3>
                                    <button onClick={() => setPurchaseHistoryOpen(false)}><X size={20}/></button>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-100 text-gray-600">
                                            <tr>
                                                <th className="p-3">Data Venc.</th>
                                                <th className="p-3">Descrição / Fornecedor</th>
                                                <th className="p-3 text-right">Valor</th>
                                                <th className="p-3 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {state.expenses.filter(e => e.category === 'Fornecedor').length === 0 && (
                                                <tr><td colSpan={4} className="p-4 text-center text-gray-400">Nenhuma compra registrada.</td></tr>
                                            )}
                                            {state.expenses.filter(e => e.category === 'Fornecedor').map(e => (
                                                <tr key={e.id} className="hover:bg-gray-50">
                                                    <td className="p-3 font-mono">{new Date(e.dueDate).toLocaleDateString()}</td>
                                                    <td className="p-3">{e.description}</td>
                                                    <td className="p-3 text-right font-bold">R$ {e.amount.toFixed(2)}</td>
                                                    <td className="p-3 text-center">
                                                        {e.isPaid ? 
                                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">PAGO</span> : 
                                                            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold">ABERTO</span>
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODAL ENTRADA DE NOTA DE COMPRA */}
                    {purchaseModalOpen && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg flex items-center gap-2"><FileText size={20}/> Entrada de Nota Fiscal</h3>
                                    <button onClick={() => setPurchaseModalOpen(false)}><X size={20}/></button>
                                </div>
                                <form onSubmit={submitPurchaseEntry} className="space-y-6">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold mb-1">Fornecedor</label>
                                            <select required className="w-full border p-2 rounded" value={purchaseForm.supplierId} onChange={e => setPurchaseForm({...purchaseForm, supplierId: e.target.value})}>
                                                <option value="">Selecione...</option>
                                                {state.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold mb-1">Número NF</label>
                                            <input required className="w-full border p-2 rounded" value={purchaseForm.invoiceNumber} onChange={e => setPurchaseForm({...purchaseForm, invoiceNumber: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold mb-1">Data Emissão</label>
                                            <input type="date" required className="w-full border p-2 rounded" value={purchaseForm.date} onChange={e => setPurchaseForm({...purchaseForm, date: e.target.value})} />
                                        </div>
                                    </div>

                                    {/* ITENS DA NOTA */}
                                    <div className="border rounded-lg p-4">
                                        <h4 className="font-bold text-sm mb-3">Itens da Nota</h4>
                                        <div className="flex gap-2 mb-4 items-end">
                                            <div className="flex-1">
                                                <label className="block text-xs text-gray-500 mb-1">Item do Estoque</label>
                                                <select className="w-full border p-2 rounded text-sm" value={tempPurchaseItem.itemId} onChange={e => setTempPurchaseItem({...tempPurchaseItem, itemId: e.target.value})}>
                                                    <option value="">Selecione...</option>
                                                    {state.inventory.filter(i => i.type !== 'COMPOSITE').map(i => (
                                                        <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="w-20">
                                                <label className="block text-xs text-gray-500 mb-1">Qtd</label>
                                                <input type="number" className="w-full border p-2 rounded text-sm" value={tempPurchaseItem.quantity} onChange={e => setTempPurchaseItem({...tempPurchaseItem, quantity: parseFloat(e.target.value)})} />
                                            </div>
                                            <div className="w-24">
                                                <label className="block text-xs text-gray-500 mb-1">Valor Unit.</label>
                                                <input type="number" step="0.01" className="w-full border p-2 rounded text-sm" value={tempPurchaseItem.unitPrice} onChange={e => setTempPurchaseItem({...tempPurchaseItem, unitPrice: parseFloat(e.target.value)})} />
                                            </div>
                                            <Button type="button" onClick={handleAddItemToPurchase} disabled={!tempPurchaseItem.itemId}>
                                                <Plus size={16}/>
                                            </Button>
                                        </div>

                                        <div className="bg-gray-50 rounded border overflow-hidden">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-100 text-xs text-gray-500 uppercase">
                                                    <tr>
                                                        <th className="p-2">Item</th>
                                                        <th className="p-2 text-right">Qtd</th>
                                                        <th className="p-2 text-right">Vl. Unit</th>
                                                        <th className="p-2 text-right">Total</th>
                                                        <th className="p-2"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {purchaseForm.items.map((item, idx) => {
                                                        const invItem = state.inventory.find(i => i.id === item.inventoryItemId);
                                                        return (
                                                            <tr key={idx} className="border-b last:border-0">
                                                                <td className="p-2">{invItem?.name}</td>
                                                                <td className="p-2 text-right">{item.quantity}</td>
                                                                <td className="p-2 text-right">R$ {item.unitPrice.toFixed(2)}</td>
                                                                <td className="p-2 text-right font-bold">R$ {item.totalPrice.toFixed(2)}</td>
                                                                <td className="p-2 text-right">
                                                                    <button type="button" onClick={() => handleRemovePurchaseItem(idx)} className="text-red-500"><Trash2 size={14}/></button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                            {purchaseForm.items.length === 0 && <p className="text-center p-4 text-gray-400 text-xs">Nenhum item adicionado.</p>}
                                        </div>
                                    </div>

                                    {/* FINANCEIRO / PARCELAS / IMPOSTOS */}
                                    <div className="border rounded-lg p-4 bg-blue-50/50">
                                        <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><DollarSign size={16}/> Financeiro e Impostos</h4>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-xs font-bold mb-1 text-gray-600">Valor Impostos (ST, IPI, Frete)</label>
                                                <input 
                                                    type="number" step="0.01" 
                                                    className="w-full border p-2 rounded bg-white" 
                                                    placeholder="0.00"
                                                    value={purchaseForm.taxAmount || ''} 
                                                    onChange={e => setPurchaseForm({...purchaseForm, taxAmount: parseFloat(e.target.value) || 0})}
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 pt-6">
                                                <input 
                                                    type="checkbox" 
                                                    id="distributeTax"
                                                    className="w-4 h-4"
                                                    checked={purchaseForm.distributeTax}
                                                    onChange={e => setPurchaseForm({...purchaseForm, distributeTax: e.target.checked})}
                                                />
                                                <label htmlFor="distributeTax" className="text-sm font-medium text-gray-700 cursor-pointer">
                                                    Distribuir Imposto no Custo Unitário?
                                                </label>
                                            </div>
                                        </div>

                                        <div className="flex items-end gap-3 mb-4 border-t pt-4">
                                            <div>
                                                <label className="block text-xs font-bold mb-1">Parcelas</label>
                                                <select className="border p-2 rounded text-sm w-20" value={installmentsCount} onChange={e => setInstallmentsCount(Number(e.target.value))}>
                                                    {[1,2,3,4,5,6,10,12].map(n => <option key={n} value={n}>{n}x</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold mb-1">1º Vencimento</label>
                                                <input type="date" className="border p-2 rounded text-sm" value={firstDueDate} onChange={e => setFirstDueDate(e.target.value)} />
                                            </div>
                                            <Button type="button" size="sm" onClick={generateInstallments}>Gerar Parcelas</Button>
                                        </div>

                                        {paymentInstallments.length > 0 && (
                                            <div className="space-y-2">
                                                {paymentInstallments.map((inst, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center text-sm">
                                                        <span className="w-8 font-bold text-gray-500">{idx + 1}x</span>
                                                        <input 
                                                            type="date" 
                                                            className="border p-1 rounded" 
                                                            value={inst.dueDate.toISOString().split('T')[0]} 
                                                            onChange={e => {
                                                                const newInst = [...paymentInstallments];
                                                                newInst[idx].dueDate = new Date(e.target.value);
                                                                setPaymentInstallments(newInst);
                                                            }}
                                                        />
                                                        <div className="flex items-center border rounded bg-white px-2">
                                                            <span className="text-gray-500 mr-1">R$</span>
                                                            <input 
                                                                type="number" step="0.01" 
                                                                className="w-24 p-1 outline-none font-bold text-right" 
                                                                value={inst.amount}
                                                                onChange={e => {
                                                                    const newInst = [...paymentInstallments];
                                                                    newInst[idx].amount = parseFloat(e.target.value);
                                                                    setPaymentInstallments(newInst);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className="text-right text-xs text-gray-500 mt-2">
                                                    Total Parcelado: <b>R$ {paymentInstallments.reduce((acc, i) => acc + i.amount, 0).toFixed(2)}</b>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center pt-4 border-t">
                                        <div className="text-lg">
                                            Total da Nota: <span className="font-bold text-blue-600">R$ {(purchaseForm.items.reduce((acc, i) => acc + i.totalPrice, 0) + Number(purchaseForm.taxAmount || 0)).toFixed(2)}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button type="button" variant="secondary" onClick={() => setPurchaseModalOpen(false)}>Cancelar</Button>
                                            <Button type="submit">Processar Entrada</Button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* MODAL FORNECEDORES */}
                    {supplierModalOpen && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg">Gerenciar Fornecedores</h3>
                                    <button onClick={() => setSupplierModalOpen(false)}><X size={20}/></button>
                                </div>
                                
                                <form onSubmit={handleAddSupplier} className="space-y-3 mb-6 border-b pb-6">
                                    <input required className="w-full border p-2 rounded" placeholder="Nome da Empresa" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} />
                                    <input className="w-full border p-2 rounded" placeholder="Nome do Contato" value={newSupplier.contactName} onChange={e => setNewSupplier({...newSupplier, contactName: e.target.value})} />
                                    <input className="w-full border p-2 rounded" placeholder="Telefone / WhatsApp" value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} />
                                    <Button type="submit" className="w-full">Adicionar Fornecedor</Button>
                                </form>

                                <div className="flex-1 overflow-y-auto space-y-2">
                                    {state.suppliers.map(s => (
                                        <div key={s.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                                            <div>
                                                <div className="font-bold">{s.name}</div>
                                                <div className="text-xs text-gray-500">{s.contactName} - {s.phone}</div>
                                            </div>
                                            <button onClick={() => showConfirm({ title: 'Excluir', message: 'Remover fornecedor?', type: 'ERROR', onConfirm: () => dispatch({ type: 'DELETE_SUPPLIER', supplierId: s.id }) })} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                    {state.suppliers.length === 0 && <p className="text-center text-gray-400 text-sm">Nenhum fornecedor cadastrado.</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODAL CADASTRO ESTOQUE */}
                    {editingInventory && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                                <h3 className="font-bold text-lg mb-4">Novo Item de Estoque</h3>
                                <form onSubmit={handleSaveInventoryItem} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700">Tipo do Item</label>
                                        <div className="grid grid-cols-3 gap-2 mt-1">
                                            <button type="button" onClick={() => setEditingInventory({...editingInventory, type: 'INGREDIENT'})} className={`p-2 rounded border text-xs font-bold ${editingInventory.type === 'INGREDIENT' ? 'bg-orange-100 border-orange-500 text-orange-700' : 'bg-gray-50'}`}>Matéria Prima</button>
                                            <button type="button" onClick={() => setEditingInventory({...editingInventory, type: 'RESALE'})} className={`p-2 rounded border text-xs font-bold ${editingInventory.type === 'RESALE' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-gray-50'}`}>Revenda (Coca, Água)</button>
                                            <button type="button" onClick={() => setEditingInventory({...editingInventory, type: 'COMPOSITE'})} className={`p-2 rounded border text-xs font-bold ${editingInventory.type === 'COMPOSITE' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'bg-gray-50'}`}>Produzido (Prato)</button>
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
                                                <option value="UN">UN (Unidade)</option>
                                                <option value="KG">KG (Quilo)</option>
                                                <option value="LT">LT (Litro)</option>
                                            </select>
                                        </div>
                                        {editingInventory.type !== 'COMPOSITE' && (
                                            <div>
                                                <label className="block text-xs font-bold">Custo Unit. (R$)</label>
                                                <input type="number" step="0.01" className="w-full border p-2 rounded" value={editingInventory.costPrice} onChange={e => setEditingInventory({...editingInventory, costPrice: parseFloat(e.target.value)})} />
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

                                    {/* RECEITA (Apenas para Compostos) */}
                                    {editingInventory.type === 'COMPOSITE' && (
                                        <div className="bg-gray-50 p-4 rounded border mt-4">
                                            <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><Layers size={14}/> Composição (Ficha Técnica)</h4>
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
                                                Custo Estimado: R$ {invRecipeStep.reduce((acc, step) => {
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
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-600 text-sm">
                                <tr>
                                    <th className="p-4">Item</th>
                                    <th className="p-4">Tipo</th>
                                    <th className="p-4 text-center">Unidade</th>
                                    <th className="p-4 text-right">Estoque</th>
                                    <th className="p-4 text-right">Custo</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {state.inventory.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-medium">{item.name}</td>
                                        <td className="p-4">
                                            {item.type === 'INGREDIENT' && <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">Matéria Prima</span>}
                                            {item.type === 'RESALE' && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Revenda</span>}
                                            {item.type === 'COMPOSITE' && <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">Prato/Combo</span>}
                                        </td>
                                        <td className="p-4 text-center text-sm">{item.unit}</td>
                                        <td className={`p-4 text-right font-bold ${item.type === 'COMPOSITE' ? 'text-gray-400' : (item.quantity <= item.minQuantity ? 'text-red-600' : 'text-gray-800')}`}>
                                            {item.type === 'COMPOSITE' ? '-' : item.quantity}
                                        </td>
                                        <td className="p-4 text-right text-sm">R$ {item.costPrice.toFixed(2)}</td>
                                        <td className="p-4 flex justify-end gap-2">
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
                    {/* Modal de Movimentação de Estoque */}
                    {stockModal && (
                        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                            <div className="bg-white p-6 rounded-xl w-full max-w-sm">
                                <h3 className="font-bold text-lg mb-4">{stockModal.type === 'IN' ? 'Entrada' : 'Baixa'} de Estoque</h3>
                                <form onSubmit={handleStockUpdate} className="space-y-4">
                                    <input type="number" autoFocus required className="w-full border p-2 rounded text-lg font-bold" value={stockModal.quantity} onChange={e => setStockModal({...stockModal, quantity: e.target.value})} placeholder="Quantidade" />
                                    <input required className="w-full border p-2 rounded" placeholder="Motivo (Compra, Perda...)" value={stockModal.reason} onChange={e => setStockModal({...stockModal, reason: e.target.value})} />
                                    <div className="flex gap-2">
                                        <Button type="button" variant="secondary" onClick={() => setStockModal(null)} className="flex-1">Cancelar</Button>
                                        <Button type="submit" className="flex-1">Confirmar</Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ... Other Tabs remain identical to previous implementation ... */}
            {activeTab === 'PRODUCTS' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Cardápio Digital</h2>
                            <p className="text-sm text-gray-500">Adicione itens do estoque para venda no cardápio.</p>
                        </div>
                        <Button onClick={() => { setMenuModalOpen(true); setSelectedStockId(''); }}>
                            <Plus size={16}/> Adicionar do Estoque
                        </Button>
                    </div>

                    {/* MODAL ADICIONAR AO CARDÁPIO */}
                    {menuModalOpen && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-lg">
                                <h3 className="font-bold text-lg mb-4">Adicionar Item ao Cardápio</h3>
                                <form onSubmit={handleAddProductToMenu} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Selecione o Item do Estoque</label>
                                        <select 
                                            required 
                                            className="w-full border p-2 rounded bg-gray-50" 
                                            value={selectedStockId} 
                                            onChange={e => setSelectedStockId(e.target.value)}
                                        >
                                            <option value="">Selecione...</option>
                                            {availableForMenu.map(i => (
                                                <option key={i.id} value={i.id}>
                                                    {i.name} ({i.type === 'RESALE' ? 'Revenda' : 'Prato'}) - Custo: R$ {i.costPrice.toFixed(2)}
                                                </option>
                                            ))}
                                        </select>
                                        {availableForMenu.length === 0 && <p className="text-xs text-red-500 mt-1">Nenhum item disponível. Cadastre "Revenda" ou "Produzido" no estoque primeiro.</p>}
                                    </div>

                                    {selectedStockId && (
                                        <div className="animate-fade-in space-y-4 border-t pt-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold">Preço de Venda (R$)</label>
                                                    <input required type="number" step="0.01" className="w-full border p-2 rounded font-bold" value={newProductForm.price} onChange={e => setNewProductForm({...newProductForm, price: parseFloat(e.target.value)})} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold">Categoria</label>
                                                    <select className="w-full border p-2 rounded" value={newProductForm.category} onChange={e => setNewProductForm({...newProductForm, category: e.target.value})}>
                                                        <option value="Lanches">Lanches</option>
                                                        <option value="Bebidas">Bebidas</option>
                                                        <option value="Pratos Principais">Pratos Principais</option>
                                                        <option value="Sobremesas">Sobremesas</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold mb-1">Destino (KDS)</label>
                                                <select className="w-full border p-2 rounded" value={newProductForm.type} onChange={e => setNewProductForm({...newProductForm, type: e.target.value as ProductType})}>
                                                    <option value="KITCHEN">Cozinha</option>
                                                    <option value="BAR">Bar</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold mb-1">Imagem</label>
                                                <ImageUploader value={newProductForm.image || ''} onChange={val => setNewProductForm({...newProductForm, image: val})} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold">Descrição (App Cliente)</label>
                                                <textarea className="w-full border p-2 rounded" rows={2} value={newProductForm.description} onChange={e => setNewProductForm({...newProductForm, description: e.target.value})} />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-2 pt-4">
                                        <Button type="button" variant="secondary" onClick={() => setMenuModalOpen(false)} className="flex-1">Cancelar</Button>
                                        <Button type="submit" disabled={!selectedStockId} className="flex-1">Adicionar</Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* MODAL EDITAR PRODUTO */}
                    {editingProduct && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-lg">
                                <h3 className="font-bold text-lg mb-4">Editar: {editingProduct.name}</h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold">Preço de Venda (R$)</label>
                                            <input type="number" step="0.01" className="w-full border p-2 rounded font-bold" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500">Custo (Estoque)</label>
                                            <input disabled className="w-full border p-2 rounded bg-gray-100" value={editingProduct.costPrice?.toFixed(2)} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold">Categoria</label>
                                        <select className="w-full border p-2 rounded" value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}>
                                            <option value="Lanches">Lanches</option>
                                            <option value="Bebidas">Bebidas</option>
                                            <option value="Pratos Principais">Pratos Principais</option>
                                            <option value="Sobremesas">Sobremesas</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1">Imagem</label>
                                        <ImageUploader value={editingProduct.image || ''} onChange={val => setEditingProduct({...editingProduct, image: val})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold">Descrição</label>
                                        <textarea className="w-full border p-2 rounded" rows={2} value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                         <input type="checkbox" checked={editingProduct.isVisible} onChange={e => setEditingProduct({...editingProduct, isVisible: e.target.checked})} />
                                         <label className="text-sm font-bold">Visível no Cardápio</label>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <Button type="button" variant="secondary" onClick={() => setEditingProduct(null)} className="flex-1">Cancelar</Button>
                                        <Button onClick={handleUpdateMenuProduct} className="flex-1">Salvar</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-600 text-sm">
                                <tr>
                                    <th className="p-4 w-10"></th>
                                    <th className="p-4">Produto</th>
                                    <th className="p-4">Categoria</th>
                                    <th className="p-4">Preço Venda</th>
                                    <th className="p-4">Lucro</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {sortedProducts.map((p, idx) => (
                                    <tr 
                                        key={p.id} 
                                        className="hover:bg-gray-50"
                                        draggable
                                        onDragStart={() => handleDragStart(idx)}
                                        onDragOver={handleDragOver}
                                        onDrop={() => handleDrop(idx)}
                                    >
                                        <td className="p-4 text-center cursor-move text-gray-400"><GripVertical size={16}/></td>
                                        <td className="p-4 flex items-center gap-3">
                                            <img src={p.image} className="w-10 h-10 rounded bg-gray-200 object-cover" />
                                            <div>
                                                <div className="font-medium">{p.name}</div>
                                                <div className="text-xs text-gray-500">{p.isVisible ? 'Visível' : 'Oculto'}</div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm"><span className="bg-gray-100 px-2 py-1 rounded">{p.category}</span></td>
                                        <td className="p-4 font-bold text-gray-800">R$ {p.price.toFixed(2)}</td>
                                        <td className="p-4 text-sm text-green-600">R$ {(p.price - (p.costPrice || 0)).toFixed(2)}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setEditingProduct(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16}/></button>
                                                <button onClick={() => {
                                                    showConfirm({ title: "Remover", message: "Remover do cardápio?", type: 'ERROR', onConfirm: () => dispatch({ type: 'DELETE_PRODUCT', productId: p.id }) });
                                                }} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'CUSTOMIZATION' && (
                 <div className="max-w-3xl">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">Personalizar App do Cliente</h2>
                    <div className="bg-white p-6 rounded-xl shadow-sm space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-700 flex items-center gap-2"><Palette size={18} /> Identidade Visual</h3>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Nome do Restaurante</label>
                                    <input type="text" className="w-full border p-2 rounded" value={localTheme.restaurantName} onChange={e => setLocalTheme({...localTheme, restaurantName: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Cor Principal</label>
                                        <div className="flex gap-2 items-center">
                                            <input type="color" className="h-10 w-10 cursor-pointer border rounded" value={localTheme.primaryColor} onChange={e => setLocalTheme({...localTheme, primaryColor: e.target.value})} />
                                            <input type="text" className="flex-1 border p-2 rounded uppercase min-w-0" value={localTheme.primaryColor} onChange={e => setLocalTheme({...localTheme, primaryColor: e.target.value})} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Cor de Fundo</label>
                                        <div className="flex gap-2 items-center">
                                            <input type="color" className="h-10 w-10 cursor-pointer border rounded" value={localTheme.backgroundColor} onChange={e => setLocalTheme({...localTheme, backgroundColor: e.target.value})} />
                                            <input type="text" className="flex-1 border p-2 rounded uppercase min-w-0" value={localTheme.backgroundColor} onChange={e => setLocalTheme({...localTheme, backgroundColor: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-700 flex items-center gap-2"><LayoutGrid size={18} /> Layout</h3>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Estilo do Cardápio</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => setLocalTheme({...localTheme, viewMode: 'LIST'})} className={`flex-1 py-2 border rounded flex items-center justify-center gap-2 ${localTheme.viewMode !== 'GRID' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'hover:bg-gray-50'}`}><ListIcon size={16}/> Lista</button>
                                        <button onClick={() => setLocalTheme({...localTheme, viewMode: 'GRID'})} className={`flex-1 py-2 border rounded flex items-center justify-center gap-2 ${localTheme.viewMode === 'GRID' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'hover:bg-gray-50'}`}><LayoutGrid size={16}/> Grade</button>
                                    </div>
                                </div>
                                <div><label className="block text-sm font-medium mb-1">Logo</label><ImageUploader value={localTheme.logoUrl} onChange={(val) => setLocalTheme({...localTheme, logoUrl: val})} /></div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 flex items-center gap-2"><ImageIcon size={16}/> Banner</label>
                            <ImageUploader value={localTheme.bannerUrl || ''} onChange={(val) => setLocalTheme({...localTheme, bannerUrl: val})} />
                        </div>
                        <div className="pt-4 border-t"><Button onClick={() => { dispatch({ type: 'UPDATE_THEME', theme: localTheme }); showAlert({ title: "Sucesso", message: "Tema salvo!", type: 'SUCCESS' }); }} className="w-full py-3"><Save size={20} /> Salvar</Button></div>
                    </div>
                 </div>
            )}

            {activeTab === 'TABLES' && (
                <div>
                     <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">Mesas & QR Codes</h2>
                        <Button onClick={() => dispatch({ type: 'ADD_TABLE' })}><Plus size={16} /> Nova Mesa</Button>
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {state.tables.map(table => (
                            <div key={table.id} className="bg-white p-6 rounded-xl shadow-sm flex flex-col items-center gap-4 border relative group">
                                <button onClick={() => showConfirm({title: "Excluir Mesa", message: "Confirma?", type: 'ERROR', onConfirm: () => dispatch({ type: 'DELETE_TABLE', tableId: table.id })})} className="absolute top-2 right-2 p-2 text-gray-300 hover:text-red-500 rounded-full"><Trash2 size={16} /></button>
                                <h3 className="text-xl font-bold text-gray-800">Mesa {table.number}</h3>
                                <QRCodeGenerator tableId={table.id} size={150} />
                                <div className="w-full flex gap-1">
                                    <a href={getTableUrl(table.id)} target="_blank" className="flex-1 text-xs bg-blue-50 text-blue-600 py-2 rounded text-center flex items-center justify-center gap-1 font-medium"><ExternalLink size={12} /> Link</a>
                                    <button onClick={() => navigator.clipboard.writeText(getTableUrl(table.id))} className="px-3 bg-gray-100 text-gray-600 rounded text-xs"><Copy size={12} /></button>
                                </div>
                                <Button variant="secondary" size="sm" className="w-full" onClick={() => handlePrint(table.id)}><Printer size={16} /> Imprimir</Button>
                            </div>
                        ))}
                     </div>
                </div>
            )}

            {activeTab === 'STAFF' && (
                <div>
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">Gerenciar Equipe</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="bg-white p-6 rounded-xl shadow-sm h-fit">
                            <h3 className="font-bold mb-4 text-lg">{editingUser ? 'Editar' : 'Novo'} Funcionário</h3>
                            <form onSubmit={handleSaveUser} className="space-y-4">
                                <input required className="w-full border p-2 rounded" placeholder="Nome" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} />
                                <input required type="email" className="w-full border p-2 rounded" placeholder="Email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} />
                                <select className="w-full border p-2 rounded" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as Role})}>
                                    <option value={Role.WAITER}>Garçom</option>
                                    <option value={Role.KITCHEN}>Cozinha</option>
                                    <option value={Role.CASHIER}>Caixa</option>
                                    <option value={Role.ADMIN}>Admin</option>
                                </select>
                                <input type="text" maxLength={4} className="w-full border p-2 rounded" placeholder="PIN" value={userForm.pin} onChange={e => setUserForm({...userForm, pin: e.target.value})} />
                                <div className="flex gap-2">
                                    {editingUser && <Button type="button" variant="secondary" onClick={() => { setEditingUser(null); setUserForm({name:'',role:Role.WAITER,pin:'',email:'',allowedRoutes:[]}); }}>Cancelar</Button>}
                                    <Button className="flex-1" type="submit">Salvar</Button>
                                </div>
                            </form>
                        </div>
                        <div className="lg:col-span-2 space-y-4">
                            {state.users.filter(u => u.role !== Role.SUPER_ADMIN).map(user => (
                                <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between border">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">{user.name.charAt(0)}</div>
                                        <div><div className="font-bold">{user.name}</div><div className="text-xs text-gray-500 uppercase">{user.role}</div></div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => copyInviteLink(user.email)} className="text-green-600 p-2 hover:bg-green-50 rounded"><Share2 size={20}/></button>
                                        <button onClick={() => { setEditingUser(user); setUserForm({name:user.name, email:user.email, role:user.role, pin:user.pin, allowedRoutes:user.allowedRoutes||[]}); }} className="text-blue-500 p-2 hover:bg-blue-50 rounded"><Edit size={20}/></button>
                                        <button onClick={() => showConfirm({title:"Excluir", message:"Confirma?", type:'ERROR', onConfirm:()=>dispatch({type:'DELETE_USER', userId:user.id})})} className="text-red-500 p-2 hover:bg-red-50 rounded"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'FINANCE' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border">
                        <div><h2 className="text-xl font-bold">Contas a Pagar</h2></div>
                        <Button onClick={() => setEditingExpense({ description: '', amount: 0, category: 'Fornecedor', isPaid: false, dueDate: new Date() })}><Plus size={16}/> Nova Despesa</Button>
                    </div>
                    {editingExpense && (
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-200">
                            <form onSubmit={handleSaveExpense} className="grid grid-cols-2 gap-4">
                                <input required className="w-full border p-2 rounded col-span-2" placeholder="Descrição" value={editingExpense.description} onChange={e => setEditingExpense({...editingExpense, description: e.target.value})} />
                                <input required type="number" className="w-full border p-2 rounded" placeholder="Valor" value={editingExpense.amount} onChange={e => setEditingExpense({...editingExpense, amount: parseFloat(e.target.value) as any})} />
                                <input type="date" required className="w-full border p-2 rounded" value={editingExpense.dueDate ? new Date(editingExpense.dueDate).toISOString().split('T')[0] : ''} onChange={e => setEditingExpense({...editingExpense, dueDate: new Date(e.target.value)})} />
                                <div className="col-span-2 flex gap-2"><Button type="button" variant="secondary" onClick={() => setEditingExpense(null)} className="flex-1">Cancelar</Button><Button type="submit" className="flex-1">Salvar</Button></div>
                            </form>
                        </div>
                    )}
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-600 text-sm"><tr><th className="p-4">Vencimento</th><th className="p-4">Descrição</th><th className="p-4">Valor</th><th className="p-4">Status</th><th className="p-4 text-right">Ações</th></tr></thead>
                            <tbody>
                                {state.expenses.map(exp => (
                                    <tr key={exp.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-sm font-mono">{new Date(exp.dueDate).toLocaleDateString()}</td>
                                        <td className="p-4">{exp.description}</td>
                                        <td className="p-4 font-bold">R$ {exp.amount.toFixed(2)}</td>
                                        <td className="p-4">{exp.isPaid ? <span className="text-green-600 font-bold text-xs">PAGO</span> : <span className="text-yellow-600 font-bold text-xs">ABERTO</span>}</td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            {!exp.isPaid && <button onClick={() => dispatch({ type: 'PAY_EXPENSE', expenseId: exp.id })} className="text-blue-600 text-xs font-bold">Pagar</button>}
                                            <button onClick={() => dispatch({ type: 'DELETE_EXPENSE', expenseId: exp.id })} className="text-red-500"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};