import React, { useState, useEffect, useCallback } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useUI } from '../context/UIContext';
import { Button } from '../components/Button';
import { QRCodeGenerator } from '../components/QRCodeGenerator';
import { ImageUploader } from '../components/ImageUploader';
import { Product, ProductType, Role, User, InventoryItem, Expense } from '../types';
import { LayoutDashboard, Utensils, QrCode, Printer, ExternalLink, Palette, Eye, EyeOff, Save, Copy, Plus, Users, ShieldCheck, Trash2, Edit, AlertTriangle, FileBarChart, X, ArrowUp, ArrowDown, LayoutGrid, List as ListIcon, Image as ImageIcon, Calendar, TrendingUp, Search, Loader2, Menu, Activity, CheckSquare, GripVertical, Link as LinkIcon, Share2, Lock, BookOpen, Package, DollarSign, Archive, TrendingDown, RefreshCcw, Layers } from 'lucide-react';
import { getTenantSlug } from '../utils/tenant';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { showAlert, showConfirm } = useUI();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PRODUCTS' | 'TABLES' | 'CUSTOMIZATION' | 'STAFF' | 'AUDIT' | 'REPORTS' | 'INVENTORY' | 'FINANCE'>('DASHBOARD');
  
  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Theme state
  const [localTheme, setLocalTheme] = useState(state.theme);
  
  // Product state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  
  // Recipe Builder State (For Composite Products)
  const [selectedIngredient, setSelectedIngredient] = useState<string>('');
  const [ingredientQty, setIngredientQty] = useState<number>(1);

  // Staff state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<Partial<User>>({ name: '', role: Role.WAITER, pin: '', email: '', allowedRoutes: [] });

  // Inventory State
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null);
  const [stockModal, setStockModal] = useState<{ itemId: string, type: 'IN' | 'OUT', quantity: string, reason: string } | null>(null);

  // Finance State
  const [editingExpense, setEditingExpense] = useState<Partial<Expense> | null>(null);

  // Report State
  const [reportDateStart, setReportDateStart] = useState(new Date().toISOString().split('T')[0]);
  const [reportDateEnd, setReportDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<{
      transactions: any[];
      topProducts: { name: string; quantity: number; total: number }[];
      totalSales: number;
      salesByMethod: Record<string, number>;
  }>({ transactions: [], topProducts: [], totalSales: 0, salesByMethod: {} });
  const [loadingReport, setLoadingReport] = useState(false);

  const getTableUrl = (tableId: string) => {
    const slug = state.tenantSlug || getTenantSlug();
    return `${window.location.origin}/client/table/${tableId}?restaurant=${slug}`;
  };

  const handlePrint = (tableId: string) => {
    const targetUrl = getTableUrl(tableId);
    const encodedUrl = encodeURIComponent(targetUrl);
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedUrl}&bgcolor=ffffff`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code Mesa ${tableId.replace('t', '')}</title>
            <style>
              body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
              h1 { font-size: 40px; margin-bottom: 20px; }
              img { width: 300px; height: 300px; }
              .footer { margin-top: 20px; font-size: 20px; color: #555; }
              .url { font-size: 12px; margin-top: 10px; color: #999; }
            </style>
          </head>
          <body>
            <h1>Mesa ${tableId.replace('t', '')}</h1>
            <img src="${qrImageUrl}" onload="window.print();window.close()" />
            <div class="footer">Escaneie para ver o cardápio</div>
            <div class="url">${targetUrl}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };
  
  const handlePrintReport = () => {
      window.print();
  };

  const copyInviteLink = (userEmail?: string) => {
      if (!userEmail) {
          showAlert({ title: "Atenção", message: "Este usuário não possui e-mail cadastrado.", type: 'WARNING' });
          return;
      }
      const slug = state.tenantSlug || getTenantSlug();
      const link = `${window.location.origin}/login?restaurant=${slug}&email=${encodeURIComponent(userEmail)}&register=true`;
      
      navigator.clipboard.writeText(link).then(() => {
          showAlert({ title: "Copiado!", message: "Link de primeiro acesso copiado! Envie para o funcionário criar a senha.", type: 'SUCCESS' });
      });
  };

  // --- Report Logic ---
  const fetchReportData = useCallback(async () => {
      if (!state.tenantId) return;
      if (!state.planLimits.allowReports) return;

      setLoadingReport(true);

      const start = reportDateStart + ' 00:00:00';
      const end = reportDateEnd + ' 23:59:59';

      try {
          const { data: transactions } = await supabase
              .from('transactions')
              .select('*')
              .eq('tenant_id', state.tenantId)
              .gte('created_at', start)
              .lte('created_at', end)
              .order('created_at', { ascending: false });

          const { data: paidOrders } = await supabase
              .from('orders')
              .select('id')
              .eq('tenant_id', state.tenantId)
              .eq('is_paid', true)
              .gte('created_at', start)
              .lte('created_at', end);
          
          const orderIds = paidOrders?.map(o => o.id) || [];
          let topProducts: any[] = [];

          if (orderIds.length > 0) {
              const { data: items } = await supabase
                  .from('order_items')
                  .select('product_name, quantity, product_price')
                  .in('order_id', orderIds);

              if (items) {
                  const stats: Record<string, { qty: number, total: number }> = {};
                  items.forEach(item => {
                      if (!stats[item.product_name]) {
                          stats[item.product_name] = { qty: 0, total: 0 };
                      }
                      stats[item.product_name].qty += item.quantity;
                      stats[item.product_name].total += (item.quantity * item.product_price);
                  });

                  topProducts = Object.entries(stats)
                      .map(([name, stat]) => ({ name, quantity: stat.qty, total: stat.total }))
                      .sort((a, b) => b.quantity - a.quantity);
              }
          }

          const totalSales = transactions?.reduce((acc, t) => acc + t.amount, 0) || 0;
          const salesByMethod: Record<string, number> = {};
          transactions?.forEach(t => {
              salesByMethod[t.method] = (salesByMethod[t.method] || 0) + t.amount;
          });

          setReportData({
              transactions: transactions || [],
              topProducts,
              totalSales,
              salesByMethod
          });

      } catch (error) {
          console.error("Erro ao buscar relatório", error);
      } finally {
          setLoadingReport(false);
      }
  }, [state.tenantId, reportDateStart, reportDateEnd, state.planLimits.allowReports]);

  useEffect(() => {
      if (activeTab === 'REPORTS') {
          fetchReportData();
      }
  }, [activeTab, fetchReportData]);

  // --- Inventory Handlers ---
  const handleSaveInventory = (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingInventory) return;
      
      // Aqui só criamos novos itens, edição de qtd é via movimentação
      dispatch({ type: 'ADD_INVENTORY_ITEM', item: editingInventory });
      setEditingInventory(null);
      showAlert({ title: "Sucesso", message: "Item cadastrado!", type: 'SUCCESS' });
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
      showAlert({ title: "Sucesso", message: "Estoque atualizado!", type: 'SUCCESS' });
  };

  // --- Finance Handlers ---
  const handleSaveExpense = (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingExpense?.description || !editingExpense.amount) return;
      
      dispatch({ 
          type: 'ADD_EXPENSE', 
          expense: {
              id: Math.random().toString(), // Temp ID, will be ignored by DB
              description: editingExpense.description,
              amount: parseFloat(editingExpense.amount as any),
              category: editingExpense.category || 'Outros',
              dueDate: new Date(editingExpense.dueDate || new Date()),
              isPaid: editingExpense.isPaid || false
          } 
      });
      setEditingExpense(null);
      showAlert({ title: "Sucesso", message: "Despesa lançada!", type: 'SUCCESS' });
  };

  const handleProductSave = () => {
     if (editingProduct) {
        if (isCreatingNew) {
            dispatch({ type: 'ADD_PRODUCT', product: editingProduct });
        } else {
            dispatch({ type: 'UPDATE_PRODUCT', product: editingProduct });
        }
        setEditingProduct(null);
        setIsCreatingNew(false);
     }
  };

  const handleAddProduct = () => {
      setEditingProduct({
          id: '',
          name: '',
          description: '',
          price: 0,
          costPrice: 0,
          category: 'Lanches',
          type: ProductType.KITCHEN,
          format: 'SIMPLE',
          image: '',
          isVisible: true,
          sortOrder: 0,
          recipe: []
      });
      setIsCreatingNew(true);
  };

  const handleLinkInventoryItem = (invId: string) => {
      const invItem = state.inventory.find(i => i.id === invId);
      if (invItem && editingProduct) {
          setEditingProduct({
              ...editingProduct,
              linkedInventoryItemId: invId,
              name: invItem.name, // Auto-fill name
              costPrice: invItem.costPrice
          });
      }
  };

  const handleAddIngredient = () => {
      if (!selectedIngredient || ingredientQty <= 0) return;
      const invItem = state.inventory.find(i => i.id === selectedIngredient);
      if (invItem && editingProduct) {
          const currentRecipe = editingProduct.recipe || [];
          const newRecipe = [...currentRecipe, {
              inventoryItemId: invItem.id,
              inventoryItemName: invItem.name,
              quantity: ingredientQty,
              unit: invItem.unit,
              cost: invItem.costPrice
          }];
          
          // Recalculate Total Cost
          const totalCost = newRecipe.reduce((sum, item) => sum + ((item.cost || 0) * item.quantity), 0);

          setEditingProduct({
              ...editingProduct,
              recipe: newRecipe,
              costPrice: totalCost
          });
          setSelectedIngredient('');
          setIngredientQty(1);
      }
  };

  const handleRemoveIngredient = (index: number) => {
      if (editingProduct && editingProduct.recipe) {
          const newRecipe = [...editingProduct.recipe];
          newRecipe.splice(index, 1);
          
          const totalCost = newRecipe.reduce((sum, item) => sum + ((item.cost || 0) * item.quantity), 0);

          setEditingProduct({
              ...editingProduct,
              recipe: newRecipe,
              costPrice: totalCost
          });
      }
  };

  // Drag and Drop Handlers
  const handleDragStart = (index: number) => {
      setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (targetIndex: number, sortedList: Product[]) => {
      if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;

      const updatedList = [...sortedList];
      const [movedItem] = updatedList.splice(draggedItemIndex, 1);
      updatedList.splice(targetIndex, 0, movedItem);

      // Re-assign sort orders based on new index
      updatedList.forEach((product, index) => {
          const newSortOrder = (index + 1) * 10;
          if (product.sortOrder !== newSortOrder) {
               dispatch({ type: 'UPDATE_PRODUCT', product: { ...product, sortOrder: newSortOrder } });
          }
      });

      setDraggedItemIndex(null);
  };

  const handleDeleteProduct = (product: Product) => {
      showConfirm({
          title: "Excluir Produto",
          message: `Tem certeza que deseja excluir "${product.name}"? Esta ação não pode ser desfeita.`,
          type: 'ERROR',
          confirmText: "Excluir",
          onConfirm: () => dispatch({ type: 'DELETE_PRODUCT', productId: product.id })
      });
  };

  const handleSaveUser = (e: React.FormEvent) => {
      e.preventDefault();
      if(userForm.name && userForm.email && userForm.role) {
          if (editingUser) {
              dispatch({ 
                  type: 'UPDATE_USER', 
                  user: { 
                      ...editingUser, 
                      name: userForm.name, 
                      role: userForm.role, 
                      pin: userForm.pin || '0000', 
                      email: userForm.email,
                      allowedRoutes: userForm.allowedRoutes
                  } 
              });
              showAlert({ title: "Sucesso", message: "Dados do funcionário atualizados!", type: 'SUCCESS' });
          } else {
              dispatch({ 
                  type: 'ADD_USER', 
                  user: { 
                      id: Math.random().toString(36).substr(2, 9),
                      name: userForm.name,
                      role: userForm.role,
                      pin: userForm.pin || '0000', 
                      email: userForm.email,
                      allowedRoutes: userForm.allowedRoutes
                  } as User
              });
              showAlert({ title: "Sucesso", message: "Funcionário adicionado!", type: 'SUCCESS' });
          }
          setEditingUser(null);
          setUserForm({ name: '', role: Role.WAITER, pin: '', email: '', allowedRoutes: [] });
      } else {
          showAlert({ title: "Erro", message: "Nome e E-mail são obrigatórios.", type: 'ERROR' });
      }
  };

  const startEditUser = (user: User) => {
      setEditingUser(user);
      setUserForm({ 
          name: user.name, 
          role: user.role, 
          pin: user.pin, 
          email: user.email || '',
          allowedRoutes: user.allowedRoutes || []
      });
  };

  const cancelEditUser = () => {
      setEditingUser(null);
      setUserForm({ name: '', role: Role.WAITER, pin: '', email: '', allowedRoutes: [] });
  };

  const toggleRoutePermission = (route: string) => {
      setUserForm(prev => {
          const current = prev.allowedRoutes || [];
          if (current.includes(route)) {
              return { ...prev, allowedRoutes: current.filter(r => r !== route) };
          } else {
              return { ...prev, allowedRoutes: [...current, route] };
          }
      });
  };

  const handleAddTable = () => {
      showConfirm({
          title: "Adicionar Mesa",
          message: "Deseja adicionar uma nova mesa ao restaurante?",
          onConfirm: () => dispatch({ type: 'ADD_TABLE' })
      });
  };

  const handleDeleteTable = (tableId: string) => {
      showConfirm({
          title: "Excluir Mesa",
          message: "Tem certeza que deseja excluir esta mesa? Se houver histórico, ele será mantido nos relatórios.",
          type: 'ERROR',
          confirmText: "Excluir",
          onConfirm: () => dispatch({ type: 'DELETE_TABLE', tableId })
      });
  };
  
  const sortedProducts = [...state.products].sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const Sidebar = () => (
      <div className={`
        bg-slate-900 text-white p-6 shrink-0 h-screen overflow-y-auto print:hidden transition-transform duration-300 z-50
        fixed inset-y-0 left-0 w-64 md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
          <div className="flex justify-between items-center mb-10">
              <h1 className="text-xl font-bold">Admin Panel</h1>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white">
                  <X size={24} />
              </button>
          </div>
          <nav className="space-y-2">
              <button onClick={() => { setActiveTab('DASHBOARD'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeTab === 'DASHBOARD' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                  <LayoutDashboard size={20} /> Visão Geral
              </button>
              
              <button onClick={() => { setActiveTab('PRODUCTS'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeTab === 'PRODUCTS' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                  <Utensils size={20} /> Cardápio
              </button>
              
              {/* ERP BUTTONS */}
              <button onClick={() => { setActiveTab('INVENTORY'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeTab === 'INVENTORY' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                  <Package size={20} /> Estoque
              </button>
              <button onClick={() => { setActiveTab('FINANCE'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeTab === 'FINANCE' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                  <DollarSign size={20} /> Financeiro
              </button>

              <button onClick={() => { setActiveTab('TABLES'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeTab === 'TABLES' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                  <QrCode size={20} /> Mesas & QR
              </button>
              <button onClick={() => { setActiveTab('STAFF'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeTab === 'STAFF' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                  <Users size={20} /> Funcionários
              </button>
              
              {/* FEATURE LOCK UI FOR REPORTS */}
              <div className="relative group">
                  <button 
                    onClick={() => { if(state.planLimits.allowReports) { setActiveTab('REPORTS'); setIsSidebarOpen(false); } }} 
                    className={`flex items-center gap-3 w-full p-3 rounded transition-colors 
                        ${activeTab === 'REPORTS' ? 'bg-blue-600' : 'hover:bg-slate-800'}
                        ${!state.planLimits.allowReports ? 'opacity-50 cursor-not-allowed bg-transparent hover:bg-transparent' : ''}
                    `}
                  >
                      <FileBarChart size={20} /> Relatórios
                      {!state.planLimits.allowReports && <Lock size={14} className="ml-auto text-gray-400" />}
                  </button>
              </div>

              <div className="border-t border-slate-700 my-2"></div>
              <button onClick={() => { setActiveTab('AUDIT'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeTab === 'AUDIT' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                  <ShieldCheck size={20} /> Auditoria
              </button>
              <button onClick={() => { setActiveTab('CUSTOMIZATION'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeTab === 'CUSTOMIZATION' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                  <Palette size={20} /> Personalizar
              </button>
              <div className="border-t border-slate-700 my-2"></div>
              <Link to="/manual" className="flex items-center gap-3 w-full p-3 rounded transition-colors text-gray-400 hover:text-white hover:bg-slate-800">
                  <BookOpen size={20} /> Ajuda / Manual
              </Link>
          </nav>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex relative">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
            <div 
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setIsSidebarOpen(false)}
            />
        )}
        
        <Sidebar />

        {/* Content */}
        <div className="flex-1 h-screen overflow-y-auto">
            {/* Mobile Header for Sidebar Toggle */}
            <div className="md:hidden bg-white p-4 border-b flex items-center justify-between sticky top-0 z-30">
                <div className="font-bold text-lg">Admin</div>
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-gray-100 rounded">
                    <Menu size={24} />
                </button>
            </div>

            <div className="p-4 md:p-8">
                {activeTab === 'DASHBOARD' && (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold mb-6 text-gray-800">Visão Geral (Hoje)</h2>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                                    <div className="text-gray-500 text-sm mb-1 uppercase tracking-wider">Vendas Hoje</div>
                                    <div className="text-3xl font-bold text-gray-800">
                                        R$ {state.transactions.reduce((acc, t) => acc + t.amount, 0).toFixed(2)}
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                                    <div className="text-gray-500 text-sm mb-1 uppercase tracking-wider">Pedidos Ativos</div>
                                    <div className="text-3xl font-bold text-gray-800">{state.orders.length}</div>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-500">
                                    <div className="text-gray-500 text-sm mb-1 uppercase tracking-wider">Itens Baixo Estoque</div>
                                    <div className="text-3xl font-bold text-gray-800">{state.inventory.filter(i => i.quantity <= i.minQuantity).length}</div>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
                                    <div className="text-gray-500 text-sm mb-1 uppercase tracking-wider">Contas a Pagar (Hoje)</div>
                                    <div className="text-3xl font-bold text-gray-800">
                                        R$ {state.expenses
                                            .filter(e => !e.isPaid && new Date(e.dueDate).toDateString() === new Date().toDateString())
                                            .reduce((acc, e) => acc + e.amount, 0).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Online Users Widget */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border">
                            <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-4">
                                <Activity size={20} className="text-green-500" /> Usuários Online Agora
                            </h3>
                            {state.onlineUsers.length === 0 ? (
                                <p className="text-gray-400 text-sm">Nenhum usuário online no momento.</p>
                            ) : (
                                <div className="flex flex-wrap gap-4">
                                    {state.onlineUsers.map(user => (
                                        <div key={user.id} className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100 pr-4">
                                            <div className="relative">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                                                    ${user.role === Role.ADMIN ? 'bg-purple-500' : ''}
                                                    ${user.role === Role.WAITER ? 'bg-orange-500' : ''}
                                                    ${user.role === Role.KITCHEN ? 'bg-red-500' : ''}
                                                    ${user.role === Role.CASHIER ? 'bg-green-500' : ''}
                                                `}>
                                                    {user.name.charAt(0)}
                                                </div>
                                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-gray-800">{user.name}</div>
                                                <div className="text-xs text-gray-500 uppercase">{user.role}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- PRODUCTS MODULE --- */}
                {activeTab === 'PRODUCTS' && (
                <div>
                     <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Gerenciar Cardápio</h2>
                            <p className="text-sm text-gray-500">Adicione produtos do estoque ou crie combinações.</p>
                        </div>
                        <Button onClick={handleAddProduct}>
                            <Plus size={16} /> Novo Item no Cardápio
                        </Button>
                    </div>

                    {editingProduct && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white p-6 rounded-lg w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto relative">
                                <button onClick={() => setEditingProduct(null)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                                <h3 className="text-xl font-bold mb-4 pr-8">{isCreatingNew ? 'Novo Item de Cardápio' : 'Editar Item'}</h3>
                                <div className="space-y-4">
                                    
                                    {/* TYPE SELECTION */}
                                    <div className="bg-gray-50 p-4 rounded-lg border">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tipo de Produto</label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    name="format" 
                                                    checked={editingProduct.format === 'SIMPLE'} 
                                                    onChange={() => setEditingProduct({...editingProduct, format: 'SIMPLE', linkedInventoryItemId: '', recipe: []})}
                                                />
                                                <span className="font-medium">Produto Simples (Revenda)</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    name="format" 
                                                    checked={editingProduct.format === 'COMPOSITE'} 
                                                    onChange={() => setEditingProduct({...editingProduct, format: 'COMPOSITE', linkedInventoryItemId: undefined})}
                                                />
                                                <span className="font-medium">Produto Composto (Receita)</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* SIMPLE PRODUCT LOGIC */}
                                    {editingProduct.format === 'SIMPLE' && (
                                        <div className="animate-fade-in space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Selecione do Estoque</label>
                                                <select 
                                                    className="w-full border p-2 rounded bg-white" 
                                                    value={editingProduct.linkedInventoryItemId || ''} 
                                                    onChange={(e) => handleLinkInventoryItem(e.target.value)}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {state.inventory.map(i => (
                                                        <option key={i.id} value={i.id}>{i.name} (Estoque: {i.quantity} {i.unit})</option>
                                                    ))}
                                                </select>
                                                <p className="text-xs text-gray-500 mt-1">O nome e o custo serão puxados automaticamente.</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* COMPOSITE PRODUCT LOGIC */}
                                    {editingProduct.format === 'COMPOSITE' && (
                                        <div className="animate-fade-in space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Nome do Prato/Combo</label>
                                                <input className="w-full border p-2 rounded" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} placeholder="Ex: X-Salada Especial" />
                                            </div>
                                            
                                            {/* RECIPE BUILDER */}
                                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                                <h4 className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2"><Layers size={16}/> Ficha Técnica (Ingredientes)</h4>
                                                <div className="flex gap-2 mb-3">
                                                    <select 
                                                        className="flex-1 border rounded p-1 text-sm"
                                                        value={selectedIngredient}
                                                        onChange={(e) => setSelectedIngredient(e.target.value)}
                                                    >
                                                        <option value="">Adicionar ingrediente...</option>
                                                        {state.inventory.map(i => (
                                                            <option key={i.id} value={i.id}>{i.name} ({i.unit}) - R${i.costPrice}</option>
                                                        ))}
                                                    </select>
                                                    <input 
                                                        type="number" 
                                                        step="0.001" 
                                                        className="w-20 border rounded p-1 text-sm" 
                                                        placeholder="Qtd"
                                                        value={ingredientQty}
                                                        onChange={(e) => setIngredientQty(parseFloat(e.target.value))}
                                                    />
                                                    <button onClick={handleAddIngredient} className="bg-blue-600 text-white px-3 rounded hover:bg-blue-700"><Plus size={16}/></button>
                                                </div>
                                                
                                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                                    {editingProduct.recipe?.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded text-sm border">
                                                            <span>{item.quantity} {item.unit} - {item.inventoryItemName}</span>
                                                            <button onClick={() => handleRemoveIngredient(idx)} className="text-red-500 hover:text-red-700"><X size={16}/></button>
                                                        </div>
                                                    ))}
                                                    {(!editingProduct.recipe || editingProduct.recipe.length === 0) && <p className="text-xs text-gray-400 text-center">Nenhum ingrediente adicionado.</p>}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* COMMON FIELDS */}
                                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Preço Venda (R$)</label>
                                            <input type="number" step="0.01" className="w-full border p-2 rounded font-bold text-lg" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-500">Custo Total (Calc.)</label>
                                            <input disabled type="number" step="0.01" className="w-full border p-2 rounded bg-gray-100" value={editingProduct.costPrice?.toFixed(2) || 0} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Categoria</label>
                                            <select className="w-full border p-2 rounded" value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}>
                                                <option value="Promocoes">Promoções</option>
                                                <option value="Lanches">Lanches</option>
                                                <option value="Pratos Principais">Pratos Principais</option>
                                                <option value="Acompanhamentos">Acompanhamentos</option>
                                                <option value="Bebidas">Bebidas</option>
                                                <option value="Sobremesas">Sobremesas</option>
                                                <option value="Pizzas">Pizzas</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Destino (KDS)</label>
                                            <select className="w-full border p-2 rounded" value={editingProduct.type} onChange={e => setEditingProduct({...editingProduct, type: e.target.value as ProductType})}>
                                                <option value={ProductType.KITCHEN}>Cozinha</option>
                                                <option value={ProductType.BAR}>Bar</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Foto</label>
                                        <ImageUploader value={editingProduct.image} onChange={(val) => setEditingProduct({...editingProduct, image: val})} />
                                    </div>

                                    <div className="flex items-center gap-2">
                                         <input type="checkbox" id="isVisible" checked={editingProduct.isVisible} onChange={e => setEditingProduct({...editingProduct, isVisible: e.target.checked})} className="w-4 h-4" />
                                         <label htmlFor="isVisible" className="text-sm font-medium cursor-pointer">Visível no Cardápio</label>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Descrição (Cardápio)</label>
                                        <textarea className="w-full border p-2 rounded" rows={2} value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} />
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end gap-2">
                                    <Button variant="secondary" onClick={() => setEditingProduct(null)}>Cancelar</Button>
                                    <Button variant="success" onClick={handleProductSave}>Salvar Produto</Button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4 w-16 text-center"></th>
                                    <th className="p-4 w-16">Foto</th>
                                    <th className="p-4">Nome</th>
                                    <th className="p-4">Formato</th>
                                    <th className="p-4">Preço</th>
                                    <th className="p-4">Lucro</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedProducts.map((product, index) => (
                                    <tr 
                                        key={product.id} 
                                        className={`border-b hover:bg-gray-50 transition-colors ${draggedItemIndex === index ? 'opacity-50 bg-blue-50' : ''}`}
                                        draggable
                                        onDragStart={() => handleDragStart(index)}
                                        onDragOver={handleDragOver}
                                        onDrop={() => handleDrop(index, sortedProducts)}
                                    >
                                        <td className="p-4 text-center cursor-move text-gray-400 hover:text-gray-600" title="Arrastar para reordenar">
                                            <GripVertical size={20} className="mx-auto" />
                                        </td>
                                        <td className="p-4">
                                            <img src={product.image} alt="" className="w-10 h-10 rounded object-cover bg-gray-200" />
                                        </td>
                                        <td className="p-4 font-medium">
                                            {product.name}
                                            <div className="text-[10px] text-gray-400 font-mono">Ordem: {product.sortOrder}</div>
                                        </td>
                                        <td className="p-4">
                                            {product.format === 'COMPOSITE' ? 
                                                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit"><Layers size={12}/> COMPOSTO</span> :
                                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold w-fit">SIMPLES</span>
                                            }
                                        </td>
                                        <td className="p-4 font-bold text-gray-800">R$ {product.price.toFixed(2)}</td>
                                        <td className="p-4 text-sm text-green-600">
                                            R$ {(product.price - (product.costPrice || 0)).toFixed(2)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="outline" onClick={() => { setIsCreatingNew(false); setEditingProduct(product); }}>
                                                    <Edit size={16} />
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="danger" 
                                                    className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200 border"
                                                    onClick={() => handleDeleteProduct(product)}
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ... Other Tabs (INVENTORY, FINANCE, REPORTS, STAFF) stay same ... */}
            {activeTab === 'INVENTORY' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Package size={24}/> Gestão de Estoque</h2>
                                <p className="text-sm text-gray-500">Controle de ingredientes e produtos.</p>
                            </div>
                            <Button onClick={() => setEditingInventory({ id: '', name: '', unit: 'UN', quantity: 0, minQuantity: 5, costPrice: 0 })}>
                                <Plus size={16}/> Novo Item
                            </Button>
                        </div>

                        {editingInventory && (
                            <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-200 animate-fade-in">
                                <h3 className="font-bold text-lg mb-4">Cadastrar Item de Estoque</h3>
                                <form onSubmit={handleSaveInventory} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-500">Nome</label>
                                        <input required className="w-full border p-2 rounded" value={editingInventory.name} onChange={e => setEditingInventory({...editingInventory, name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500">Unidade</label>
                                        <select className="w-full border p-2 rounded" value={editingInventory.unit} onChange={e => setEditingInventory({...editingInventory, unit: e.target.value})}>
                                            <option value="UN">Unidade (UN)</option>
                                            <option value="KG">Quilo (KG)</option>
                                            <option value="LT">Litro (LT)</option>
                                            <option value="CX">Caixa (CX)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500">Preço de Custo</label>
                                        <input type="number" step="0.01" className="w-full border p-2 rounded" value={editingInventory.costPrice} onChange={e => setEditingInventory({...editingInventory, costPrice: parseFloat(e.target.value)})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500">Estoque Inicial</label>
                                        <input type="number" className="w-full border p-2 rounded" value={editingInventory.quantity} onChange={e => setEditingInventory({...editingInventory, quantity: parseFloat(e.target.value)})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500">Alerta Mínimo</label>
                                        <input type="number" className="w-full border p-2 rounded" value={editingInventory.minQuantity} onChange={e => setEditingInventory({...editingInventory, minQuantity: parseFloat(e.target.value)})} />
                                    </div>
                                    <div className="col-span-2 flex gap-2 items-end">
                                        <Button type="button" variant="secondary" onClick={() => setEditingInventory(null)} className="flex-1">Cancelar</Button>
                                        <Button type="submit" className="flex-1">Salvar</Button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {stockModal && (
                            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                                <div className="bg-white p-6 rounded-xl w-full max-w-sm">
                                    <h3 className="font-bold text-lg mb-4">
                                        {stockModal.type === 'IN' ? 'Entrada de Estoque' : 'Saída/Baixa de Estoque'}
                                    </h3>
                                    <form onSubmit={handleStockUpdate} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500">Quantidade</label>
                                            <input type="number" step="0.01" autoFocus required className="w-full border p-2 rounded text-lg font-bold" value={stockModal.quantity} onChange={e => setStockModal({...stockModal, quantity: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500">Motivo</label>
                                            <input required className="w-full border p-2 rounded" placeholder={stockModal.type === 'IN' ? 'Compra, Correção...' : 'Uso, Validade, Perda...'} value={stockModal.reason} onChange={e => setStockModal({...stockModal, reason: e.target.value})} />
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <Button type="button" variant="secondary" onClick={() => setStockModal(null)} className="flex-1">Cancelar</Button>
                                            <Button type="submit" className={`flex-1 ${stockModal.type === 'IN' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>Confirmar</Button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-600 text-sm">
                                    <tr>
                                        <th className="p-4">Item</th>
                                        <th className="p-4 text-center">Unidade</th>
                                        <th className="p-4 text-right">Estoque Atual</th>
                                        <th className="p-4 text-right">Custo Unit.</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {state.inventory.map(item => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-medium">
                                                {item.name}
                                                {item.quantity <= item.minQuantity && (
                                                    <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">BAIXO</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center text-gray-500 text-sm">{item.unit}</td>
                                            <td className={`p-4 text-right font-bold ${item.quantity <= item.minQuantity ? 'text-red-600' : 'text-gray-800'}`}>
                                                {item.quantity}
                                            </td>
                                            <td className="p-4 text-right text-sm">R$ {item.costPrice.toFixed(2)}</td>
                                            <td className="p-4 flex justify-end gap-2">
                                                <button 
                                                    onClick={() => setStockModal({ itemId: item.id, type: 'IN', quantity: '', reason: '' })}
                                                    className="p-2 bg-green-50 text-green-700 rounded hover:bg-green-100 font-bold text-xs flex items-center gap-1"
                                                >
                                                    <Plus size={14}/> Entrada
                                                </button>
                                                <button 
                                                    onClick={() => setStockModal({ itemId: item.id, type: 'OUT', quantity: '', reason: '' })}
                                                    className="p-2 bg-red-50 text-red-700 rounded hover:bg-red-100 font-bold text-xs flex items-center gap-1"
                                                >
                                                    <ArrowDown size={14}/> Saída
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {state.inventory.length === 0 && <div className="p-8 text-center text-gray-400">Nenhum item cadastrado.</div>}
                        </div>
                    </div>
                )}

                {/* --- FINANCE, STAFF, REPORTS sections continue as they were --- */}
                {activeTab === 'FINANCE' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                                <h3 className="text-gray-500 text-xs font-bold uppercase mb-1">Receita Total (Mês)</h3>
                                <p className="text-2xl font-bold text-green-700">R$ {state.transactions.reduce((acc, t) => acc + t.amount, 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
                                <h3 className="text-gray-500 text-xs font-bold uppercase mb-1">Despesas Pagas (Mês)</h3>
                                <p className="text-2xl font-bold text-red-700">
                                    R$ {state.expenses.filter(e => e.isPaid).reduce((acc, e) => acc + e.amount, 0).toFixed(2)}
                                </p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                                <h3 className="text-gray-500 text-xs font-bold uppercase mb-1">Saldo Líquido</h3>
                                <p className="text-2xl font-bold text-blue-700">
                                    R$ {(state.transactions.reduce((acc, t) => acc + t.amount, 0) - state.expenses.filter(e => e.isPaid).reduce((acc, e) => acc + e.amount, 0)).toFixed(2)}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Contas a Pagar</h2>
                                <p className="text-sm text-gray-500">Gerencie suas despesas e fornecedores.</p>
                            </div>
                            <Button onClick={() => setEditingExpense({ description: '', amount: 0, category: 'Fornecedor', isPaid: false, dueDate: new Date() })}>
                                <Plus size={16}/> Nova Despesa
                            </Button>
                        </div>

                        {editingExpense && (
                            <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-200 animate-fade-in">
                                <h3 className="font-bold text-lg mb-4">Lançar Despesa</h3>
                                <form onSubmit={handleSaveExpense} className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-500">Descrição</label>
                                        <input required className="w-full border p-2 rounded" value={editingExpense.description} onChange={e => setEditingExpense({...editingExpense, description: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500">Valor (R$)</label>
                                        <input required type="number" step="0.01" className="w-full border p-2 rounded" value={editingExpense.amount} onChange={e => setEditingExpense({...editingExpense, amount: parseFloat(e.target.value) as any})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500">Categoria</label>
                                        <select className="w-full border p-2 rounded" value={editingExpense.category} onChange={e => setEditingExpense({...editingExpense, category: e.target.value})}>
                                            <option>Fornecedor</option>
                                            <option>Aluguel</option>
                                            <option>Pessoal</option>
                                            <option>Manutenção</option>
                                            <option>Impostos</option>
                                            <option>Outros</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500">Vencimento</label>
                                        <input type="date" required className="w-full border p-2 rounded" 
                                            value={editingExpense.dueDate ? new Date(editingExpense.dueDate).toISOString().split('T')[0] : ''} 
                                            onChange={e => setEditingExpense({...editingExpense, dueDate: new Date(e.target.value)})} 
                                        />
                                    </div>
                                    <div className="flex items-center">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={editingExpense.isPaid} onChange={e => setEditingExpense({...editingExpense, isPaid: e.target.checked})} className="w-5 h-5"/>
                                            <span className="text-sm font-bold">Já foi pago?</span>
                                        </label>
                                    </div>
                                    <div className="col-span-2 flex gap-2 pt-2">
                                        <Button type="button" variant="secondary" onClick={() => setEditingExpense(null)} className="flex-1">Cancelar</Button>
                                        <Button type="submit" className="flex-1">Salvar</Button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-600 text-sm">
                                    <tr>
                                        <th className="p-4">Vencimento</th>
                                        <th className="p-4">Descrição</th>
                                        <th className="p-4">Categoria</th>
                                        <th className="p-4">Valor</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {state.expenses.map(exp => (
                                        <tr key={exp.id} className="hover:bg-gray-50">
                                            <td className="p-4 text-sm font-mono text-gray-500">{new Date(exp.dueDate).toLocaleDateString()}</td>
                                            <td className="p-4 font-medium">{exp.description}</td>
                                            <td className="p-4 text-sm text-gray-500"><span className="bg-gray-100 px-2 py-1 rounded">{exp.category}</span></td>
                                            <td className="p-4 font-bold">R$ {exp.amount.toFixed(2)}</td>
                                            <td className="p-4">
                                                {exp.isPaid ? (
                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold flex items-center w-fit gap-1"><CheckSquare size={12}/> PAGO</span>
                                                ) : (
                                                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-bold flex items-center w-fit gap-1"><AlertTriangle size={12}/> ABERTO</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                {!exp.isPaid && (
                                                    <button 
                                                        onClick={() => dispatch({ type: 'PAY_EXPENSE', expenseId: exp.id })}
                                                        className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded font-bold hover:bg-blue-100 mr-2"
                                                    >
                                                        Pagar
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => {
                                                        showConfirm({ 
                                                            title: "Excluir Despesa", 
                                                            message: "Confirma a exclusão?", 
                                                            type: "ERROR", 
                                                            onConfirm: () => dispatch({ type: 'DELETE_EXPENSE', expenseId: exp.id }) 
                                                        });
                                                    }}
                                                    className="text-gray-400 hover:text-red-500"
                                                >
                                                    <Trash2 size={18}/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {state.expenses.length === 0 && <div className="p-8 text-center text-gray-400">Nenhuma despesa registrada.</div>}
                        </div>
                    </div>
                )}
                
                {/* REPORTS and STAFF sections remain */}
                {activeTab === 'REPORTS' && (
                    <>
                    {!state.planLimits.allowReports ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl shadow-sm border">
                            <div className="bg-orange-100 p-6 rounded-full mb-6 text-orange-600">
                                <Lock size={64} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Funcionalidade Premium</h2>
                            <p className="text-gray-600 max-w-md mb-6">
                                Relatórios avançados estão disponíveis apenas nos planos PRO e ENTERPRISE.
                            </p>
                            <p className="text-sm text-gray-500">Entre em contato com o suporte para fazer um upgrade.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 no-print bg-white p-4 rounded-xl shadow-sm border">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-bold text-gray-800">Relatórios Gerenciais</h2>
                                    <p className="text-xs md:text-sm text-gray-500">Analise o desempenho do seu restaurante por período.</p>
                                </div>
                                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full xl:w-auto">
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border w-full sm:w-auto justify-between">
                                        <Calendar size={16} className="text-gray-500 shrink-0"/>
                                        <input 
                                            type="date" 
                                            value={reportDateStart} 
                                            onChange={(e) => setReportDateStart(e.target.value)} 
                                            className="bg-transparent text-sm outline-none flex-1 min-w-[100px]"
                                        />
                                        <span className="text-gray-400">-</span>
                                        <input 
                                            type="date" 
                                            value={reportDateEnd} 
                                            onChange={(e) => setReportDateEnd(e.target.value)} 
                                            className="bg-transparent text-sm outline-none flex-1 min-w-[100px]"
                                        />
                                    </div>
                                    <Button onClick={fetchReportData} disabled={loadingReport} className="w-full sm:w-auto">
                                        {loadingReport ? <Loader2 className="animate-spin" size={16}/> : <Search size={16}/>} Filtrar
                                    </Button>
                                    <Button variant="secondary" onClick={handlePrintReport} className="w-full sm:w-auto"><Printer size={16}/> Imprimir</Button>
                                </div>
                            </div>

                            {loadingReport ? (
                                <div className="text-center py-20">
                                    <Loader2 size={40} className="animate-spin mx-auto text-blue-600"/>
                                    <p className="text-gray-500 mt-2">Carregando dados...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Resumo Financeiro */}
                                    <div className="bg-white p-6 rounded-xl shadow-sm border print:shadow-none print:border-black">
                                        <h3 className="text-lg font-bold mb-4 border-b pb-2 flex items-center gap-2"><TrendingUp size={20}/> Resumo Financeiro</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <p className="text-sm text-gray-500">Vendas Totais</p>
                                                <p className="text-2xl lg:text-3xl font-bold text-green-600">R$ {reportData.totalSales.toFixed(2)}</p>
                                            </div>
                                            {Object.entries(reportData.salesByMethod).map(([method, amount]: any) => (
                                                <div key={method} className="p-3 bg-gray-50 rounded-lg">
                                                    <p className="text-sm text-gray-500">Via {method}</p>
                                                    <p className="text-xl lg:text-2xl font-bold text-gray-800">R$ {amount.toFixed(2)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Produtos Mais Vendidos */}
                                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden print:shadow-none print:border-black overflow-x-auto">
                                        <div className="p-4 bg-gray-50 border-b print:bg-gray-200">
                                            <h3 className="font-bold flex items-center gap-2"><Utensils size={18}/> Produtos Mais Vendidos</h3>
                                        </div>
                                        <table className="w-full text-left text-sm min-w-[500px]">
                                            <thead className="bg-gray-100 print:bg-gray-50">
                                                <tr>
                                                    <th className="p-3 w-10">#</th>
                                                    <th className="p-3">Produto</th>
                                                    <th className="p-3 text-right">Qtd. Vendida</th>
                                                    <th className="p-3 text-right">Ticket Médio</th>
                                                    <th className="p-3 text-right">Receita Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportData.topProducts.length === 0 && (
                                                    <tr><td colSpan={5} className="p-4 text-center text-gray-500">Nenhum produto vendido neste período.</td></tr>
                                                )}
                                                {reportData.topProducts.map((prod, index) => (
                                                    <tr key={prod.name} className="border-b">
                                                        <td className="p-3 font-bold text-gray-500">{index + 1}</td>
                                                        <td className="p-3 font-medium">{prod.name}</td>
                                                        <td className="p-3 text-right">{prod.quantity}</td>
                                                        <td className="p-3 text-right text-gray-500">R$ {(prod.total / (prod.quantity || 1)).toFixed(2)}</td>
                                                        <td className="p-3 text-right font-bold text-green-700">R$ {prod.total.toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Transações Detalhadas */}
                                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden print:shadow-none print:border-black break-before-page overflow-x-auto">
                                        <div className="p-4 bg-gray-50 border-b print:bg-gray-200">
                                            <h3 className="font-bold flex items-center gap-2"><ListIcon size={18}/> Histórico de Transações</h3>
                                        </div>
                                        <table className="w-full text-left text-sm min-w-[600px]">
                                            <thead className="bg-gray-100 print:bg-gray-50">
                                                <tr>
                                                    <th className="p-3">Data</th>
                                                    <th className="p-3">Mesa</th>
                                                    <th className="p-3">Método</th>
                                                    <th className="p-3">Caixa</th>
                                                    <th className="p-3 text-right">Valor</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportData.transactions.length === 0 && (
                                                    <tr><td colSpan={5} className="p-4 text-center text-gray-500">Nenhuma transação encontrada.</td></tr>
                                                )}
                                                {reportData.transactions.map(t => (
                                                    <tr key={t.id} className="border-b">
                                                        <td className="p-3">{new Date(t.created_at).toLocaleString()}</td>
                                                        <td className="p-3">Mesa {t.table_number}</td>
                                                        <td className="p-3">{t.method}</td>
                                                        <td className="p-3">{t.cashier_name}</td>
                                                        <td className="p-3 text-right font-bold">R$ {t.amount.toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    </>
                )}

            {activeTab === 'STAFF' && (
                <div>
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">Gerenciar Funcionários</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="bg-white p-6 rounded-xl shadow-sm h-fit">
                            <h3 className="font-bold mb-4 text-lg">{editingUser ? 'Editar Funcionário' : 'Novo Funcionário'}</h3>
                            <form onSubmit={handleSaveUser} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Nome</label>
                                    <input required className="w-full border p-2 rounded" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Email (Login)</label>
                                    <input required type="email" className="w-full border p-2 rounded" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} placeholder="email@exemplo.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Função Principal</label>
                                    <select className="w-full border p-2 rounded" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as Role})}>
                                        <option value={Role.WAITER}>Garçom</option>
                                        <option value={Role.KITCHEN}>Cozinha</option>
                                        <option value={Role.CASHIER}>Caixa</option>
                                        <option value={Role.ADMIN}>Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">PIN (Autorização Interna)</label>
                                    <input type="text" maxLength={4} className="w-full border p-2 rounded" value={userForm.pin} onChange={e => setUserForm({...userForm, pin: e.target.value})} placeholder="Opcional para login" />
                                </div>
                                
                                <div className="bg-gray-50 p-3 rounded-lg border">
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><CheckSquare size={16}/> Telas Permitidas</label>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={userForm.allowedRoutes?.includes('/waiter')} onChange={() => toggleRoutePermission('/waiter')} className="w-4 h-4" />
                                            <span className="text-sm">App Garçom</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={userForm.allowedRoutes?.includes('/kitchen')} onChange={() => toggleRoutePermission('/kitchen')} className="w-4 h-4" />
                                            <span className="text-sm">Tela Cozinha (KDS)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={userForm.allowedRoutes?.includes('/cashier')} onChange={() => toggleRoutePermission('/cashier')} className="w-4 h-4" />
                                            <span className="text-sm">Frente de Caixa</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={userForm.allowedRoutes?.includes('/admin')} onChange={() => toggleRoutePermission('/admin')} className="w-4 h-4" />
                                            <span className="text-sm">Painel Admin</span>
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">Selecione quais áreas este usuário pode acessar.</p>
                                </div>

                                <div className="flex gap-2">
                                    {editingUser && (
                                        <Button type="button" variant="secondary" onClick={cancelEditUser}>Cancelar</Button>
                                    )}
                                    <Button className="flex-1" type="submit">{editingUser ? 'Salvar Alterações' : 'Cadastrar'}</Button>
                                </div>
                            </form>
                        </div>
                        <div className="lg:col-span-2 space-y-4">
                            {state.users.filter(u => u.role !== Role.SUPER_ADMIN).map(user => (
                                <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between border border-gray-100 gap-4">
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0
                                            ${user.role === Role.ADMIN ? 'bg-purple-500' : ''}
                                            ${user.role === Role.WAITER ? 'bg-orange-500' : ''}
                                            ${user.role === Role.KITCHEN ? 'bg-red-500' : ''}
                                            ${user.role === Role.CASHIER ? 'bg-green-500' : ''}
                                        `}>
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800">{user.name}</div>
                                            <div className="text-xs text-gray-500 flex flex-col gap-1">
                                                <span className="uppercase font-semibold">{user.role}</span>
                                                <span>{user.email || 'Sem e-mail'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-1 flex-wrap justify-center">
                                        {user.allowedRoutes?.map(route => (
                                            <span key={route} className="text-[10px] bg-gray-100 px-2 py-1 rounded border border-gray-200 text-gray-600 font-mono">
                                                {route}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => copyInviteLink(user.email)} 
                                            className="text-green-600 hover:text-green-800 p-2 bg-green-50 rounded-lg" 
                                            title="Copiar Link de Convite (Primeiro Acesso)"
                                        >
                                            <Share2 size={20} />
                                        </button>
                                        <button onClick={() => startEditUser(user)} className="text-blue-500 hover:text-blue-700 p-2 bg-blue-50 rounded-lg" title="Editar">
                                            <Edit size={20} />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                showConfirm({
                                                    title: "Excluir Funcionário",
                                                    message: `Tem certeza que deseja excluir ${user.name}?`,
                                                    type: 'ERROR',
                                                    confirmText: "Excluir",
                                                    onConfirm: () => dispatch({type: 'DELETE_USER', userId: user.id})
                                                });
                                            }}
                                            className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors" 
                                            title="Excluir Funcionário"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    </div>
  );
};