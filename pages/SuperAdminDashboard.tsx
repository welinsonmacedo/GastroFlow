import React, { useState } from 'react';
import { useSaaS } from '../context/SaaSContext';
import { Plan, PlanType, RestaurantTenant } from '../types';
import { Button } from '../components/Button';
import { Building2, Users, DollarSign, Activity, Settings, Search, MoreHorizontal, ExternalLink, LogOut, Plus, X, List, Edit, Key, Lock, BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type ViewMode = 'RESTAURANTS' | 'FINANCIAL' | 'PLANS' | 'SETTINGS';

export const SuperAdminDashboard: React.FC = () => {
  const { state, dispatch } = useSaaS();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ViewMode>('RESTAURANTS');
  const [filter, setFilter] = useState('');
  
  // Logout Modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Modal State (Create)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTenantForm, setNewTenantForm] = useState({
      name: '',
      slug: '',
      ownerName: '',
      email: '',
      plan: 'FREE' as PlanType
  });

  // Modal State (Edit & Admin Create)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<RestaurantTenant | null>(null);
  const [editTab, setEditTab] = useState<'DETAILS' | 'ADMIN'>('DETAILS');
  const [newAdminForm, setNewAdminForm] = useState({ name: 'Admin', email: '', pin: '1234', password: '' });

  // Settings State
  const [settingsForm, setSettingsForm] = useState({
      name: state.adminName || '',
      email: state.adminEmail || '',
      password: ''
  });
  
  // Plans Edit State
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingFeatures, setEditingFeatures] = useState<string>('');

  // Derived Metrics
  const filteredTenants = state.tenants.filter(t => 
    t.name.toLowerCase().includes(filter.toLowerCase()) || 
    t.ownerName.toLowerCase().includes(filter.toLowerCase())
  );

  const activeTenants = state.tenants.filter(t => t.status === 'ACTIVE').length;
  
  const mrr = state.tenants.reduce((acc, t) => {
    if (t.status === 'INACTIVE') return acc;
    if (t.plan === 'PRO') return acc + 99; // Estimativa
    if (t.plan === 'ENTERPRISE') return acc + 249;
    return acc;
  }, 0);

  const getDemoUrl = (slug: string) => {
      const baseUrl = window.location.origin + window.location.pathname;
      return `${baseUrl}?restaurant=${slug}`;
  };

  const handleLogout = () => {
      dispatch({ type: 'LOGOUT_ADMIN' });
      navigate('/');
  };

  const handleCreateTenant = (e: React.FormEvent) => {
      e.preventDefault();
      if(!newTenantForm.name || !newTenantForm.slug || !newTenantForm.ownerName) {
          alert("Preencha os campos obrigatórios");
          return;
      }
      dispatch({ type: 'CREATE_TENANT', payload: newTenantForm });
      setIsModalOpen(false);
      setNewTenantForm({ name: '', slug: '', ownerName: '', email: '', plan: 'FREE' });
  };

  // --- Handlers para Edição ---

  const openEditModal = (tenant: RestaurantTenant) => {
      setEditingTenant(tenant);
      setEditTab('DETAILS');
      setNewAdminForm({ name: 'Admin', email: tenant.email, pin: '1234', password: '' });
      setIsEditModalOpen(true);
  };

  const handleUpdateTenant = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingTenant) return;
      dispatch({ 
          type: 'UPDATE_TENANT', 
          payload: {
              id: editingTenant.id,
              name: editingTenant.name,
              slug: editingTenant.slug,
              ownerName: editingTenant.ownerName,
              email: editingTenant.email
          } 
      });
      setIsEditModalOpen(false);
      alert("Restaurante atualizado!");
  };

  const handleCreateAdmin = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingTenant) return;
      dispatch({ 
          type: 'CREATE_TENANT_ADMIN', 
          payload: {
              tenantId: editingTenant.id,
              name: newAdminForm.name,
              email: newAdminForm.email,
              pin: newAdminForm.pin,
              password: newAdminForm.password
          } 
      });
      setNewAdminForm({ name: 'Admin', email: '', pin: '1234', password: '' });
      // Mantém modal aberto
  };

  // -----------------------------

  const handleUpdateProfile = (e: React.FormEvent) => {
      e.preventDefault();
      dispatch({ type: 'UPDATE_PROFILE', name: settingsForm.name, email: settingsForm.email });
      alert("Perfil atualizado com sucesso!");
  };
  
  const handleEditPlan = (plan: Plan) => {
      setEditingPlan(plan);
      setEditingFeatures(plan.features.join('\n'));
  }
  
  const handleSavePlan = (e: React.FormEvent) => {
      e.preventDefault();
      if(editingPlan) {
          const featuresArray = editingFeatures.split('\n').filter(line => line.trim() !== '');
          const updatedPlan = { ...editingPlan, features: featuresArray };
          
          dispatch({ type: 'UPDATE_PLAN_DETAILS', plan: updatedPlan });
          setEditingPlan(null);
          alert("Plano atualizado com sucesso!");
      }
  };

  const autoGenerateSlug = (name: string) => {
      const slug = name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-');
      setNewTenantForm(prev => ({ ...prev, name, slug }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
        
       {/* LOGOUT MODAL */}
       {showLogoutConfirm && (
            <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="bg-red-100 p-3 rounded-full mb-3 text-red-600">
                            <LogOut size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">Sair do Painel?</h3>
                        <p className="text-gray-500 text-sm mt-1">Você precisará fazer login novamente.</p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowLogoutConfirm(false)}
                            className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleLogout}
                            className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
                        >
                            Sair Agora
                        </button>
                    </div>
                </div>
            </div>
       )}

       {/* Sidebar */}
       <div className="w-64 bg-slate-900 text-white p-6 sticky top-0 h-screen flex flex-col justify-between shrink-0 z-20">
          <div>
            <div className="text-2xl font-bold mb-10 flex items-center gap-2">
                <Activity className="text-blue-500" /> SaaS Admin
            </div>
            <nav className="space-y-2">
                <button onClick={() => setActiveView('RESTAURANTS')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeView === 'RESTAURANTS' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <Building2 size={20} /> Restaurantes
                </button>
                <button onClick={() => setActiveView('FINANCIAL')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeView === 'FINANCIAL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <DollarSign size={20} /> Financeiro
                </button>
                <button onClick={() => setActiveView('PLANS')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeView === 'PLANS' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <List size={20} /> Planos & Preços
                </button>
                <button onClick={() => setActiveView('SETTINGS')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeView === 'SETTINGS' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <Settings size={20} /> Configurações
                </button>
            </nav>
          </div>
          <button onClick={() => setShowLogoutConfirm(true)} className="flex items-center gap-3 w-full p-3 rounded text-red-400 hover:bg-slate-800 mt-auto">
              <LogOut size={20} /> Sair
          </button>
       </div>

       {/* Main Content */}
       <div className="flex-1 p-8 overflow-y-auto h-screen">
           <header className="flex justify-between items-center mb-8">
               <div>
                   <h1 className="text-3xl font-bold text-gray-800">
                       {activeView === 'RESTAURANTS' && 'Gerenciar Restaurantes'}
                       {activeView === 'FINANCIAL' && 'Painel Financeiro'}
                       {activeView === 'PLANS' && 'Gestão de Planos'}
                       {activeView === 'SETTINGS' && 'Configurações do Sistema'}
                   </h1>
                   <p className="text-gray-500">Bem-vindo, {state.adminName}</p>
               </div>
               
               <div className="flex items-center gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-4">
                      <div className="bg-green-100 p-2 rounded-full text-green-600"><Building2 size={20} /></div>
                      <div>
                          <p className="text-xs text-gray-500 uppercase font-bold">Ativos</p>
                          <p className="text-xl font-bold">{activeTenants}</p>
                      </div>
                  </div>
               </div>
           </header>

           {/* --- VIEW: RESTAURANTS --- */}
           {activeView === 'RESTAURANTS' && (
               <>
                <div className="bg-white p-4 rounded-xl shadow-sm border mb-6 flex justify-between items-center">
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={filter} onChange={(e) => setFilter(e.target.value)} />
                    </div>
                    <Button onClick={() => setIsModalOpen(true)}> <Plus size={18} /> Novo Restaurante </Button>
                </div>
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-sm font-semibold uppercase">
                            <tr>
                                <th className="p-4">Restaurante</th>
                                <th className="p-4">Acesso (Slug)</th>
                                <th className="p-4">Dono</th>
                                <th className="p-4">Plano</th>
                                <th className="p-4">Requisições</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTenants.map((tenant) => (
                                <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4"><div className="font-bold text-gray-800">{tenant.name}</div><div className="text-xs text-gray-500">{tenant.email}</div></td>
                                    <td className="p-4"><a href={getDemoUrl(tenant.slug || 'bistro')} target="_blank" className="text-blue-600 hover:underline text-sm flex items-center gap-1 bg-blue-50 px-2 py-1 rounded w-fit">/{tenant.slug} <ExternalLink size={12} /></a></td>
                                    <td className="p-4 text-gray-700">{tenant.ownerName}</td>
                                    <td className="p-4">
                                        <select className="border rounded p-1 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={tenant.plan} onChange={(e) => dispatch({ type: 'CHANGE_PLAN', tenantId: tenant.id, plan: e.target.value as PlanType })}>
                                            <option value="FREE">Free</option>
                                            <option value="PRO">Pro</option>
                                            <option value="ENTERPRISE">Enterprise</option>
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <BarChart2 size={16} className="text-gray-400" />
                                            <span className="font-mono font-bold text-gray-700">{tenant.requestCount || 0}</span>
                                        </div>
                                    </td>
                                    <td className="p-4"><button onClick={() => dispatch({ type: 'TOGGLE_STATUS', tenantId: tenant.id })} className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{tenant.status === 'ACTIVE' ? 'ATIVO' : 'INATIVO'}</button></td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => openEditModal(tenant)}
                                            className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-full transition-colors"
                                            title="Editar Restaurante"
                                        >
                                            <Edit size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
               </>
           )}

           {/* --- VIEW: PLANS --- */}
           {activeView === 'PLANS' && (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                   {state.plans.map(plan => (
                       <div key={plan.id} className="bg-white rounded-xl shadow-sm border p-6 flex flex-col h-full hover:shadow-md transition-shadow">
                           {editingPlan?.id === plan.id ? (
                               <form onSubmit={handleSavePlan} className="space-y-4 flex-1 flex flex-col">
                                   <div>
                                       <label className="text-xs font-bold text-gray-500 uppercase">Nome do Plano</label>
                                       <input className="w-full border p-2 rounded" value={editingPlan.name} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} />
                                   </div>
                                   <div>
                                       <label className="text-xs font-bold text-gray-500 uppercase">Preço (Display)</label>
                                       <input className="w-full border p-2 rounded" value={editingPlan.price} onChange={e => setEditingPlan({...editingPlan, price: e.target.value})} />
                                   </div>
                                   <div>
                                       <label className="text-xs font-bold text-gray-500 uppercase">Botão CTA</label>
                                       <input className="w-full border p-2 rounded" value={editingPlan.button_text} onChange={e => setEditingPlan({...editingPlan, button_text: e.target.value})} />
                                   </div>
                                   <div className="flex-1">
                                       <label className="text-xs font-bold text-gray-500 uppercase">Funcionalidades</label>
                                       <textarea 
                                          className="w-full border p-2 rounded h-40 text-sm" 
                                          value={editingFeatures}
                                          onChange={e => setEditingFeatures(e.target.value)}
                                          placeholder="Digite uma funcionalidade por linha..."
                                       />
                                       <p className="text-xs text-gray-400">Uma funcionalidade por linha.</p>
                                   </div>
                                   <div className="flex gap-2 pt-4">
                                       <Button type="button" variant="secondary" onClick={() => setEditingPlan(null)} className="flex-1">Cancelar</Button>
                                       <Button type="submit" className="flex-1">Salvar</Button>
                                   </div>
                               </form>
                           ) : (
                               <>
                                   <div className="flex justify-between items-start mb-4">
                                       <h3 className="text-xl font-bold text-gray-800">{plan.name}</h3>
                                       <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono border">{plan.key}</span>
                                   </div>
                                   <div className="text-3xl font-bold text-blue-600 mb-6">{plan.price} <span className="text-sm text-gray-400 font-normal">{plan.period}</span></div>
                                   <div className="flex-1 overflow-y-auto max-h-60 mb-6">
                                       <ul className="space-y-2">
                                           {plan.features.map((feat, i) => (
                                               <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                                   <span className="text-green-500 font-bold">✓</span> {feat}
                                               </li>
                                           ))}
                                       </ul>
                                   </div>
                                   <Button variant="outline" onClick={() => handleEditPlan(plan)} className="w-full mt-auto">
                                       <Edit size={16} /> Editar Detalhes
                                   </Button>
                               </>
                           )}
                       </div>
                   ))}
               </div>
           )}

           {/* --- VIEW: FINANCIAL --- */}
           {activeView === 'FINANCIAL' && (
               <div className="space-y-6 animate-fade-in">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
                           <h3 className="text-3xl font-bold text-gray-800">R$ {mrr.toFixed(2)}</h3>
                           <p className="text-gray-500 text-sm">MRR Estimado</p>
                       </div>
                   </div>
               </div>
           )}

           {/* --- VIEW: SETTINGS --- */}
           {activeView === 'SETTINGS' && (
               <div className="max-w-2xl animate-fade-in">
                   <div className="bg-white p-8 rounded-xl shadow-sm border">
                       <h2 className="text-xl font-bold text-gray-800 mb-6">Perfil do Administrador</h2>
                       <form onSubmit={handleUpdateProfile} className="space-y-6">
                           <div>
                               <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                               <input type="text" className="w-full border p-3 rounded-lg" value={settingsForm.name} onChange={e => setSettingsForm({...settingsForm, name: e.target.value})} />
                           </div>
                           <div>
                               <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                               <input type="email" className="w-full border p-3 rounded-lg" value={settingsForm.email} onChange={e => setSettingsForm({...settingsForm, email: e.target.value})} />
                           </div>
                           <Button type="submit">Salvar Alterações</Button>
                       </form>
                   </div>
               </div>
           )}
       </div>

       {/* --- MODAL: CREATE TENANT --- */}
       {isModalOpen && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                   <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold">Novo Restaurante</h3><button onClick={() => setIsModalOpen(false)}><X size={20} /></button></div>
                   <form onSubmit={handleCreateTenant} className="space-y-4">
                       <input type="text" required className="w-full border p-2.5 rounded-lg" placeholder="Nome" value={newTenantForm.name} onChange={(e) => autoGenerateSlug(e.target.value)} />
                       <input type="text" required className="w-full border p-2.5 rounded-lg" placeholder="Slug" value={newTenantForm.slug} onChange={(e) => setNewTenantForm({...newTenantForm, slug: e.target.value})} />
                       <input type="text" required className="w-full border p-2.5 rounded-lg" placeholder="Dono" value={newTenantForm.ownerName} onChange={(e) => setNewTenantForm({...newTenantForm, ownerName: e.target.value})} />
                       <Button type="submit" className="w-full">Criar</Button>
                   </form>
               </div>
           </div>
       )}

       {/* --- MODAL: EDIT TENANT & ADMIN --- */}
       {isEditModalOpen && editingTenant && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 flex flex-col max-h-[90vh]">
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="text-xl font-bold text-gray-800">Gerenciar {editingTenant.name}</h3>
                       <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                   </div>
                   
                   <div className="flex gap-2 mb-6 border-b">
                       <button 
                         onClick={() => setEditTab('DETAILS')} 
                         className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${editTab === 'DETAILS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                       >
                           Dados Principais
                       </button>
                       <button 
                         onClick={() => setEditTab('ADMIN')} 
                         className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${editTab === 'ADMIN' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                       >
                           Criar Admin
                       </button>
                   </div>

                   <div className="overflow-y-auto flex-1 px-1">
                       {editTab === 'DETAILS' && (
                           <form onSubmit={handleUpdateTenant} className="space-y-4">
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Restaurante</label>
                                   <input className="w-full border p-2.5 rounded-lg" value={editingTenant.name} onChange={(e) => setEditingTenant({...editingTenant, name: e.target.value})} />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Slug (URL)</label>
                                   <input className="w-full border p-2.5 rounded-lg" value={editingTenant.slug} onChange={(e) => setEditingTenant({...editingTenant, slug: e.target.value})} />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Dono</label>
                                   <input className="w-full border p-2.5 rounded-lg" value={editingTenant.ownerName} onChange={(e) => setEditingTenant({...editingTenant, ownerName: e.target.value})} />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email de Contato</label>
                                   <input className="w-full border p-2.5 rounded-lg" value={editingTenant.email} onChange={(e) => setEditingTenant({...editingTenant, email: e.target.value})} />
                               </div>
                               <Button type="submit" className="w-full mt-4">Salvar Alterações</Button>
                           </form>
                       )}

                       {editTab === 'ADMIN' && (
                           <div className="space-y-4">
                               <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-4">
                                   Adicione um usuário com acesso total (ADMIN) para este restaurante. Útil para resetar acesso ou criar contas manuais.
                               </div>
                               <form onSubmit={handleCreateAdmin} className="space-y-4">
                                   <div>
                                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
                                       <input className="w-full border p-2.5 rounded-lg" placeholder="Ex: Gerente" value={newAdminForm.name} onChange={(e) => setNewAdminForm({...newAdminForm, name: e.target.value})} />
                                   </div>
                                   <div>
                                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email (Login)</label>
                                       <input type="email" className="w-full border p-2.5 rounded-lg" placeholder="gerente@restaurante.com" value={newAdminForm.email} onChange={(e) => setNewAdminForm({...newAdminForm, email: e.target.value})} />
                                   </div>
                                   <div>
                                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha (Login Remoto)</label>
                                       <div className="relative">
                                           <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
                                           <input 
                                                type="password" 
                                                className="w-full border p-2.5 pl-10 rounded-lg" 
                                                placeholder="Para acesso via /login-owner" 
                                                value={newAdminForm.password} 
                                                onChange={(e) => setNewAdminForm({...newAdminForm, password: e.target.value})} 
                                           />
                                       </div>
                                   </div>
                                   <div>
                                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">PIN de Acesso (Local)</label>
                                       <div className="relative">
                                           <Key size={16} className="absolute left-3 top-3 text-gray-400" />
                                           <input className="w-full border p-2.5 pl-10 rounded-lg font-mono" placeholder="1234" maxLength={4} value={newAdminForm.pin} onChange={(e) => setNewAdminForm({...newAdminForm, pin: e.target.value})} />
                                       </div>
                                   </div>
                                   <Button type="submit" variant="secondary" className="w-full mt-4 border border-gray-300">
                                       <Plus size={16} /> Criar Usuário Admin
                                   </Button>
                               </form>
                           </div>
                       )}
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};