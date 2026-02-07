import React, { useState, useEffect, useCallback } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { Button } from '../components/Button';
import { QRCodeGenerator } from '../components/QRCodeGenerator';
import { ImageUploader } from '../components/ImageUploader';
import { Product, ProductType, Role, User } from '../types';
import { LayoutDashboard, Utensils, QrCode, Printer, ExternalLink, Palette, Eye, EyeOff, Save, Copy, Plus, Users, ShieldCheck, Trash2, Edit, AlertTriangle, FileBarChart, X, ArrowUp, ArrowDown, LayoutGrid, List as ListIcon, Image as ImageIcon, Calendar, TrendingUp, Search, Loader2, Menu } from 'lucide-react';
import { getTenantSlug } from '../utils/tenant';
import { supabase } from '../lib/supabase';

export const AdminDashboard: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PRODUCTS' | 'TABLES' | 'CUSTOMIZATION' | 'STAFF' | 'AUDIT' | 'REPORTS'>('DASHBOARD');
  
  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Theme state
  const [localTheme, setLocalTheme] = useState(state.theme);
  
  // Product state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Staff state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<Partial<User>>({ name: '', role: Role.WAITER, pin: '', email: '' });

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

  // --- Report Logic ---
  const fetchReportData = useCallback(async () => {
      if (!state.tenantId) return;
      setLoadingReport(true);

      const start = reportDateStart + ' 00:00:00';
      const end = reportDateEnd + ' 23:59:59';

      try {
          // 1. Fetch Transactions (Financeiro)
          const { data: transactions } = await supabase
              .from('transactions')
              .select('*')
              .eq('tenant_id', state.tenantId)
              .gte('created_at', start)
              .lte('created_at', end)
              .order('created_at', { ascending: false });

          // 2. Fetch Order Items (Produtos) - via Orders Pagas
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
  }, [state.tenantId, reportDateStart, reportDateEnd]);

  useEffect(() => {
      if (activeTab === 'REPORTS') {
          fetchReportData();
      }
  }, [activeTab, fetchReportData]);

  const handleAddProduct = () => {
      setIsCreatingNew(true);
      setEditingProduct({
          id: Math.random().toString(36).substr(2, 9),
          name: '',
          description: '',
          price: 0,
          category: 'Lanches',
          type: ProductType.KITCHEN,
          image: '',
          isVisible: true,
          sortOrder: state.products.length + 1
      });
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

  const handleMoveProduct = (index: number, direction: 'UP' | 'DOWN', sortedList: Product[]) => {
      const targetIndex = direction === 'UP' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= sortedList.length) return;

      const current = sortedList[index];
      const target = sortedList[targetIndex];

      let currentOrder = current.sortOrder || 0;
      let targetOrder = target.sortOrder || 0;

      if (currentOrder === targetOrder) {
          currentOrder = (index + 1) * 10;
          targetOrder = (targetIndex + 1) * 10;
      }

      dispatch({ type: 'UPDATE_PRODUCT', product: { ...current, sortOrder: targetOrder } });
      dispatch({ type: 'UPDATE_PRODUCT', product: { ...target, sortOrder: currentOrder } });
  };

  const handleDeleteProduct = (product: Product) => {
      if (window.confirm(`Tem certeza que deseja excluir "${product.name}"?`)) {
          dispatch({ type: 'DELETE_PRODUCT', productId: product.id });
      }
  };

  const handleSaveUser = (e: React.FormEvent) => {
      e.preventDefault();
      if(userForm.name && userForm.email && userForm.role) {
          if (editingUser) {
              dispatch({ 
                  type: 'UPDATE_USER', 
                  user: { ...editingUser, name: userForm.name, role: userForm.role, pin: userForm.pin || '0000', email: userForm.email } 
              });
              alert("Dados do funcionário atualizados!");
          } else {
              dispatch({ 
                  type: 'ADD_USER', 
                  user: { 
                      id: Math.random().toString(36).substr(2, 9),
                      name: userForm.name,
                      role: userForm.role,
                      pin: userForm.pin || '0000',
                      email: userForm.email
                  } as User
              });
              alert("Funcionário adicionado!");
          }
          setEditingUser(null);
          setUserForm({ name: '', role: Role.WAITER, pin: '', email: '' });
      } else {
          alert("Nome e E-mail são obrigatórios.");
      }
  };

  const startEditUser = (user: User) => {
      setEditingUser(user);
      setUserForm({ name: user.name, role: user.role, pin: user.pin, email: user.email || '' });
  };

  const cancelEditUser = () => {
      setEditingUser(null);
      setUserForm({ name: '', role: Role.WAITER, pin: '', email: '' });
  };

  const handleAddTable = () => {
      if(window.confirm('Adicionar uma nova mesa?')) {
          dispatch({ type: 'ADD_TABLE' });
      }
  };

  const handleDeleteTable = (tableId: string) => {
      if(window.confirm('Tem certeza que deseja excluir esta mesa?')) {
          dispatch({ type: 'DELETE_TABLE', tableId });
      }
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
              <button onClick={() => { setActiveTab('REPORTS'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeTab === 'REPORTS' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                  <FileBarChart size={20} /> Relatórios
              </button>
              <button onClick={() => { setActiveTab('PRODUCTS'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeTab === 'PRODUCTS' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                  <Utensils size={20} /> Cardápio
              </button>
              <button onClick={() => { setActiveTab('TABLES'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeTab === 'TABLES' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                  <QrCode size={20} /> Mesas & QR
              </button>
              <button onClick={() => { setActiveTab('STAFF'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeTab === 'STAFF' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                  <Users size={20} /> Funcionários
              </button>
              <div className="border-t border-slate-700 my-2"></div>
              <button onClick={() => { setActiveTab('AUDIT'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeTab === 'AUDIT' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                  <ShieldCheck size={20} /> Auditoria
              </button>
              <button onClick={() => { setActiveTab('CUSTOMIZATION'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeTab === 'CUSTOMIZATION' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                  <Palette size={20} /> Personalizar
              </button>
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
                            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
                                <div className="text-gray-500 text-sm mb-1 uppercase tracking-wider">Funcionários</div>
                                <div className="text-3xl font-bold text-gray-800">{state.users.length}</div>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'REPORTS' && (
                <div className="space-y-8">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print bg-white p-4 rounded-xl shadow-sm border">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Relatórios Gerenciais</h2>
                            <p className="text-sm text-gray-500">Analise o desempenho do seu restaurante por período.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border">
                                <Calendar size={16} className="text-gray-500"/>
                                <input 
                                    type="date" 
                                    value={reportDateStart} 
                                    onChange={(e) => setReportDateStart(e.target.value)} 
                                    className="bg-transparent text-sm outline-none"
                                />
                                <span className="text-gray-400">-</span>
                                <input 
                                    type="date" 
                                    value={reportDateEnd} 
                                    onChange={(e) => setReportDateEnd(e.target.value)} 
                                    className="bg-transparent text-sm outline-none"
                                />
                            </div>
                            <Button onClick={fetchReportData} disabled={loadingReport}>
                                {loadingReport ? <Loader2 className="animate-spin" size={16}/> : <Search size={16}/>} Filtrar
                            </Button>
                            <Button variant="secondary" onClick={handlePrintReport}><Printer size={16}/> Imprimir</Button>
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
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Vendas Totais</p>
                                        <p className="text-3xl font-bold text-green-600">R$ {reportData.totalSales.toFixed(2)}</p>
                                    </div>
                                    {Object.entries(reportData.salesByMethod).map(([method, amount]: any) => (
                                        <div key={method}>
                                            <p className="text-sm text-gray-500">Via {method}</p>
                                            <p className="text-xl font-bold">R$ {amount.toFixed(2)}</p>
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
                                    <label className="block text-sm font-medium mb-1">Função</label>
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
                                <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between border border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
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
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => startEditUser(user)} className="text-blue-500 hover:text-blue-700 p-2 bg-blue-50 rounded-lg" title="Editar">
                                            <Edit size={20} />
                                        </button>
                                        <button 
                                            onClick={() => { if(window.confirm(`Tem certeza que deseja excluir o funcionário ${user.name}?`)) dispatch({type: 'DELETE_USER', userId: user.id}) }} 
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
            
            {activeTab === 'PRODUCTS' && (
                <div>
                     <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Gerenciar Cardápio</h2>
                            <p className="text-sm text-gray-500">Adicione produtos e organize a ordem de exibição.</p>
                        </div>
                        <Button onClick={handleAddProduct}>
                            <Plus size={16} /> Adicionar
                        </Button>
                    </div>

                    {editingProduct && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto relative">
                                <button onClick={() => setEditingProduct(null)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                                <h3 className="text-xl font-bold mb-4 pr-8">{isCreatingNew ? 'Novo Produto' : 'Editar Produto'}</h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium mb-1">Nome</label>
                                            <input className="w-full border p-2 rounded" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
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
                                            <label className="block text-sm font-medium mb-1">Tipo (Produção)</label>
                                            <select className="w-full border p-2 rounded" value={editingProduct.type} onChange={e => setEditingProduct({...editingProduct, type: e.target.value as ProductType})}>
                                                <option value={ProductType.KITCHEN}>Cozinha</option>
                                                <option value={ProductType.BAR}>Bar</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Foto do Produto</label>
                                        <ImageUploader value={editingProduct.image} onChange={(val) => setEditingProduct({...editingProduct, image: val})} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Preço (R$)</label>
                                            <input type="number" className="w-full border p-2 rounded" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} />
                                        </div>
                                        <div>
                                             <label className="block text-sm font-medium mb-1">Ordem (Manual)</label>
                                             <input type="number" className="w-full border p-2 rounded" value={editingProduct.sortOrder} onChange={e => setEditingProduct({...editingProduct, sortOrder: parseInt(e.target.value)})} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                         <input type="checkbox" id="isVisible" checked={editingProduct.isVisible} onChange={e => setEditingProduct({...editingProduct, isVisible: e.target.checked})} className="w-4 h-4" />
                                         <label htmlFor="isVisible" className="text-sm font-medium cursor-pointer">Visível no Cardápio</label>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Descrição</label>
                                        <textarea className="w-full border p-2 rounded" rows={3} value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} />
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end gap-2">
                                    <Button variant="secondary" onClick={() => setEditingProduct(null)}>Cancelar</Button>
                                    <Button variant="success" onClick={handleProductSave}>Salvar</Button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4 w-24 text-center">Ordem</th>
                                    <th className="p-4 w-16">Foto</th>
                                    <th className="p-4">Nome</th>
                                    <th className="p-4">Categoria</th>
                                    <th className="p-4">Preço</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedProducts.map((product, index) => (
                                    <tr key={product.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-1">
                                                <div className="flex flex-col gap-1">
                                                    <button 
                                                        onClick={() => handleMoveProduct(index, 'UP', sortedProducts)} 
                                                        disabled={index === 0}
                                                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                                                    >
                                                        <ArrowUp size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleMoveProduct(index, 'DOWN', sortedProducts)} 
                                                        disabled={index === sortedProducts.length - 1}
                                                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                                                    >
                                                        <ArrowDown size={14} />
                                                    </button>
                                                </div>
                                                <span className="text-sm font-mono w-6 text-center">{product.sortOrder}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <img src={product.image} alt="" className="w-10 h-10 rounded object-cover bg-gray-200" />
                                        </td>
                                        <td className="p-4 font-medium">{product.name}</td>
                                        <td className="p-4"><span className="px-2 py-1 bg-gray-100 rounded text-sm">{product.category}</span></td>
                                        <td className="p-4">R$ {product.price.toFixed(2)}</td>
                                        <td className="p-4">
                                            <div className={`flex items-center gap-1 text-sm font-medium ${product.isVisible ? 'text-green-600' : 'text-gray-400'}`}>
                                                {product.isVisible ? <><Eye size={16}/> Visível</> : <><EyeOff size={16}/> Oculto</>}
                                            </div>
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
            
            {activeTab === 'CUSTOMIZATION' && (
                 <div className="max-w-3xl">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">Personalizar App do Cliente</h2>
                    <div className="bg-white p-6 rounded-xl shadow-sm space-y-8">
                        {/* Customization Form */}
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
                                <h3 className="font-bold text-gray-700 flex items-center gap-2"><LayoutGrid size={18} /> Layout e Imagens</h3>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Estilo do Cardápio</label>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setLocalTheme({...localTheme, viewMode: 'LIST'})}
                                            className={`flex-1 py-2 border rounded flex items-center justify-center gap-2 ${localTheme.viewMode !== 'GRID' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'hover:bg-gray-50'}`}
                                        >
                                            <ListIcon size={16}/> Lista (Padrão)
                                        </button>
                                        <button 
                                            onClick={() => setLocalTheme({...localTheme, viewMode: 'GRID'})}
                                            className={`flex-1 py-2 border rounded flex items-center justify-center gap-2 ${localTheme.viewMode === 'GRID' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'hover:bg-gray-50'}`}
                                        >
                                            <LayoutGrid size={16}/> Grade (Fotos)
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Logo do Restaurante</label>
                                    <ImageUploader value={localTheme.logoUrl} onChange={(val) => setLocalTheme({...localTheme, logoUrl: val})} />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 flex items-center gap-2"><ImageIcon size={16}/> Imagem de Capa (Banner)</label>
                            <p className="text-xs text-gray-500 mb-2">Aparece no topo do cardápio digital.</p>
                            <ImageUploader value={localTheme.bannerUrl || ''} onChange={(val) => setLocalTheme({...localTheme, bannerUrl: val})} />
                        </div>

                        <div className="pt-4 border-t">
                            <Button onClick={() => { dispatch({ type: 'UPDATE_THEME', theme: localTheme }); alert('Tema salvo com sucesso!'); }} className="w-full py-3 text-lg">
                                <Save size={20} /> Salvar Personalização
                            </Button>
                        </div>
                    </div>
                 </div>
            )}
             {activeTab === 'TABLES' && (
                <div>
                     <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Mesas & QR Codes</h2>
                            <p className="text-sm text-gray-500">Gerencie a quantidade de mesas e imprima os QR Codes.</p>
                        </div>
                        <Button onClick={handleAddTable}>
                            <Plus size={16} /> Nova Mesa
                        </Button>
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {state.tables.map(table => (
                            <div key={table.id} className="bg-white p-6 rounded-xl shadow-sm flex flex-col items-center gap-4 border border-gray-100 relative group">
                                <button 
                                    onClick={() => handleDeleteTable(table.id)}
                                    className="absolute top-2 right-2 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                    title="Excluir Mesa"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <h3 className="text-xl font-bold text-gray-800">Mesa {table.number}</h3>
                                <QRCodeGenerator tableId={table.id} size={150} />
                                <div className="w-full flex gap-1">
                                    <a href={getTableUrl(table.id)} target="_blank" className="flex-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 rounded text-center flex items-center justify-center gap-1 font-medium"><ExternalLink size={12} /> Link</a>
                                    <button onClick={() => navigator.clipboard.writeText(getTableUrl(table.id))} className="px-3 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded text-xs flex items-center justify-center" title="Copiar Link"><Copy size={12} /></button>
                                </div>
                                <Button variant="secondary" size="sm" className="w-full" onClick={() => handlePrint(table.id)}><Printer size={16} /> Imprimir</Button>
                            </div>
                        ))}
                     </div>
                </div>
            )}
            </div>
        </div>
    </div>
  );
};