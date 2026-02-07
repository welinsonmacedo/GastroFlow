import React, { useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { Button } from '../components/Button';
import { QRCodeGenerator } from '../components/QRCodeGenerator';
import { ImageUploader } from '../components/ImageUploader';
import { Product, ProductType, Role, User } from '../types';
import { LayoutDashboard, Utensils, QrCode, Printer, ExternalLink, Palette, Eye, EyeOff, Save, Copy, Plus, Users, ShieldCheck, Trash2, Edit, AlertTriangle, FileBarChart, X } from 'lucide-react';
import { getTenantSlug } from '../utils/tenant';

export const AdminDashboard: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PRODUCTS' | 'TABLES' | 'CUSTOMIZATION' | 'STAFF' | 'AUDIT' | 'REPORTS'>('DASHBOARD');
  
  // Theme state
  const [localTheme, setLocalTheme] = useState(state.theme);
  
  // Product state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Staff state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<Partial<User>>({ name: '', role: Role.WAITER, pin: '', email: '' });

  const getTableUrl = (tableId: string) => {
    // Usa o slug do estado, ou fallback para o utilitário
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

  const handleSaveUser = (e: React.FormEvent) => {
      e.preventDefault();
      // Validação: Email agora é obrigatório para login Supabase
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
              alert("Funcionário adicionado! Certifique-se de que ele possua uma conta Supabase Auth com este e-mail.");
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

  // --- Handlers para Mesas ---
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
  
  // --- Dados para Relatórios ---
  const calculateTotalSales = () => state.transactions.reduce((acc, t) => acc + t.amount, 0);
  const calculateSalesByMethod = () => {
      const data: any = {};
      state.transactions.forEach(t => {
          data[t.method] = (data[t.method] || 0) + t.amount;
      });
      return data;
  };
  // Mock para produtos mais vendidos baseados em transações (idealmente seria uma query mais complexa)
  // Como as transactions tem itemsSummary como string, não é preciso, mas vamos tentar extrair algo se possível
  // ou apenas exibir as transações completas.

  return (
    <div className="min-h-screen bg-gray-100 flex">
        {/* Sidebar */}
        <div className="w-64 bg-slate-900 text-white p-6 shrink-0 h-screen sticky top-0 overflow-y-auto print:hidden">
            <h1 className="text-xl font-bold mb-10">Admin Panel</h1>
            <nav className="space-y-2">
                <button onClick={() => setActiveTab('DASHBOARD')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeTab === 'DASHBOARD' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                    <LayoutDashboard size={20} /> Visão Geral
                </button>
                <button onClick={() => setActiveTab('REPORTS')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeTab === 'REPORTS' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                    <FileBarChart size={20} /> Relatórios
                </button>
                <button onClick={() => setActiveTab('PRODUCTS')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeTab === 'PRODUCTS' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                    <Utensils size={20} /> Cardápio
                </button>
                <button onClick={() => setActiveTab('TABLES')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeTab === 'TABLES' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                    <QrCode size={20} /> Mesas & QR
                </button>
                <button onClick={() => setActiveTab('STAFF')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeTab === 'STAFF' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                    <Users size={20} /> Funcionários
                </button>
                <div className="border-t border-slate-700 my-2"></div>
                <button onClick={() => setActiveTab('AUDIT')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeTab === 'AUDIT' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                    <ShieldCheck size={20} /> Auditoria
                </button>
                <button onClick={() => setActiveTab('CUSTOMIZATION')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeTab === 'CUSTOMIZATION' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                    <Palette size={20} /> Personalizar
                </button>
            </nav>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">
            {activeTab === 'DASHBOARD' && (
                <div>
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">Visão Geral</h2>
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
                     <div className="flex justify-between items-center no-print">
                        <h2 className="text-2xl font-bold text-gray-800">Relatórios Gerenciais</h2>
                        <Button onClick={handlePrintReport}><Printer size={16}/> Imprimir Relatório</Button>
                     </div>

                     {/* Vendas */}
                     <div className="bg-white p-6 rounded-xl shadow-sm border">
                         <h3 className="text-lg font-bold mb-4 border-b pb-2">Resumo Financeiro</h3>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             <div>
                                 <p className="text-sm text-gray-500">Vendas Totais</p>
                                 <p className="text-2xl font-bold text-green-600">R$ {calculateTotalSales().toFixed(2)}</p>
                             </div>
                             {Object.entries(calculateSalesByMethod()).map(([method, amount]: any) => (
                                 <div key={method}>
                                     <p className="text-sm text-gray-500">{method}</p>
                                     <p className="text-xl font-bold">R$ {amount.toFixed(2)}</p>
                                 </div>
                             ))}
                         </div>
                     </div>

                     {/* Transações Detalhadas */}
                     <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b">
                            <h3 className="font-bold">Histórico de Transações</h3>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-3">Data</th>
                                    <th className="p-3">Mesa</th>
                                    <th className="p-3">Método</th>
                                    <th className="p-3">Caixa</th>
                                    <th className="p-3 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {state.transactions.map(t => (
                                    <tr key={t.id} className="border-b">
                                        <td className="p-3">{t.timestamp.toLocaleString()}</td>
                                        <td className="p-3">Mesa {t.tableNumber}</td>
                                        <td className="p-3">{t.method}</td>
                                        <td className="p-3">{t.cashierName}</td>
                                        <td className="p-3 text-right font-bold">R$ {t.amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                </div>
            )}

            {activeTab === 'STAFF' && (
                <div>
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">Gerenciar Funcionários</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Form */}
                        <div className="bg-white p-6 rounded-xl shadow-sm h-fit">
                            <h3 className="font-bold mb-4 text-lg">{editingUser ? 'Editar Funcionário' : 'Novo Funcionário'}</h3>
                            <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 mb-4 border border-yellow-100 flex gap-2">
                                <AlertTriangle size={16} className="shrink-0"/>
                                <p>O e-mail é obrigatório para login. O funcionário deve ter uma conta Supabase Auth correspondente.</p>
                            </div>
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

                        {/* List */}
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

                                        {user.role !== Role.ADMIN && (
                                            <button 
                                                onClick={() => { if(window.confirm(`ATENÇÃO: Tem certeza que deseja remover o usuário ${user.name}?`)) dispatch({type: 'DELETE_USER', userId: user.id}) }} 
                                                className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-lg" 
                                                title="Apagar Usuário"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'AUDIT' && (
                <div>
                     <h2 className="text-2xl font-bold mb-6 text-gray-800">Log de Auditoria</h2>
                     <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100 text-gray-600 text-sm">
                                <tr>
                                    <th className="p-4">Data/Hora</th>
                                    <th className="p-4">Usuário</th>
                                    <th className="p-4">Ação</th>
                                    <th className="p-4">Detalhes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {state.auditLogs.map(log => (
                                    <tr key={log.id} className="border-b hover:bg-gray-50 text-sm">
                                        <td className="p-4 text-gray-500">{log.timestamp.toLocaleString()}</td>
                                        <td className="p-4 font-bold">{log.userName}</td>
                                        <td className="p-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs">{log.action}</span></td>
                                        <td className="p-4 text-gray-700">{log.details}</td>
                                    </tr>
                                ))}
                                {state.auditLogs.length === 0 && (
                                    <tr><td colSpan={4} className="p-8 text-center text-gray-400">Nenhum registro encontrado.</td></tr>
                                )}
                            </tbody>
                        </table>
                     </div>
                </div>
            )}

            {activeTab === 'PRODUCTS' && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">Gerenciar Cardápio</h2>
                        <Button onClick={handleAddProduct}>
                            <Plus size={16} /> Adicionar Produto
                        </Button>
                    </div>

                    {/* Editor Modal */}
                    {editingProduct && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto relative">
                                <button 
                                    onClick={() => setEditingProduct(null)} 
                                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X size={24} />
                                </button>

                                <h3 className="text-xl font-bold mb-4 pr-8">{isCreatingNew ? 'Novo Produto' : 'Editar Produto'}</h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium mb-1">Nome</label>
                                            <input className="w-full border p-2 rounded" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Categoria</label>
                                            <select 
                                                className="w-full border p-2 rounded" 
                                                value={editingProduct.category} 
                                                onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                                            >
                                                <option value="Lanches">Lanches</option>
                                                <option value="Pratos Principais">Pratos Principais</option>
                                                <option value="Acompanhamentos">Acompanhamentos</option>
                                                <option value="Bebidas">Bebidas</option>
                                                <option value="Sobremesas">Sobremesas</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Tipo (Produção)</label>
                                            <select 
                                                className="w-full border p-2 rounded" 
                                                value={editingProduct.type} 
                                                onChange={e => setEditingProduct({...editingProduct, type: e.target.value as ProductType})}
                                            >
                                                <option value={ProductType.KITCHEN}>Cozinha</option>
                                                <option value={ProductType.BAR}>Bar</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Foto do Produto</label>
                                        <ImageUploader 
                                            value={editingProduct.image} 
                                            onChange={(val) => setEditingProduct({...editingProduct, image: val})} 
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Preço (R$)</label>
                                            <input type="number" className="w-full border p-2 rounded" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} />
                                        </div>
                                        <div>
                                             <label className="block text-sm font-medium mb-1">Ordem no Menu</label>
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
                    
                    {/* Tabela de Produtos */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4 w-16">Ordem</th>
                                    <th className="p-4 w-16">Foto</th>
                                    <th className="p-4">Nome</th>
                                    <th className="p-4">Categoria</th>
                                    <th className="p-4">Preço</th>
                                    <th className="p-4">Visibilidade</th>
                                    <th className="p-4">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {state.products.sort((a,b) => (a.sortOrder || 99) - (b.sortOrder || 99)).map(product => (
                                    <tr key={product.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4 text-center">{product.sortOrder || 0}</td>
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
                                        <td className="p-4">
                                            <Button size="sm" variant="outline" onClick={() => { setIsCreatingNew(false); setEditingProduct(product); }}>
                                                Editar
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
             {activeTab === 'CUSTOMIZATION' && (
                 <div className="max-w-2xl">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">Personalizar App do Cliente</h2>
                    <div className="bg-white p-6 rounded-xl shadow-sm space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-1">Nome do Restaurante</label>
                            <input type="text" className="w-full border p-2 rounded" value={localTheme.restaurantName} onChange={e => setLocalTheme({...localTheme, restaurantName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Logo</label>
                            <ImageUploader value={localTheme.logoUrl} onChange={(val) => setLocalTheme({...localTheme, logoUrl: val})} />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Cor Primária</label>
                                <div className="flex gap-2">
                                    <input type="color" className="h-10 w-10 cursor-pointer" value={localTheme.primaryColor} onChange={e => setLocalTheme({...localTheme, primaryColor: e.target.value})} />
                                    <input type="text" className="flex-1 border p-2 rounded" value={localTheme.primaryColor} onChange={e => setLocalTheme({...localTheme, primaryColor: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Cor de Fundo</label>
                                <div className="flex gap-2">
                                    <input type="color" className="h-10 w-10 cursor-pointer" value={localTheme.backgroundColor} onChange={e => setLocalTheme({...localTheme, backgroundColor: e.target.value})} />
                                    <input type="text" className="flex-1 border p-2 rounded" value={localTheme.backgroundColor} onChange={e => setLocalTheme({...localTheme, backgroundColor: e.target.value})} />
                                </div>
                            </div>
                         </div>
                         <Button onClick={() => { dispatch({ type: 'UPDATE_THEME', theme: localTheme }); alert('Tema salvo!'); }} className="w-full">
                            <Save size={16} /> Salvar Alterações
                         </Button>
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

                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded-r text-sm text-blue-800">
                        <strong>Como funciona:</strong> O QR Code gera um link <em>exclusivo da mesa</em>. Quando o cliente escaneia, ele verá uma tela de "Mesa Aguardando Liberação". O cardápio só é exibido após o garçom "Abrir a Mesa" e fornecer o código de acesso.
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
                                    <a href={getTableUrl(table.id)} target="_blank" className="flex-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 rounded text-center flex items-center justify-center gap-1 font-medium"><ExternalLink size={12} /> Testar Link</a>
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
  );
};