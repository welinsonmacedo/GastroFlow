import React, { useState } from 'react';
import { useSaaS } from '../context/SaaSContext';
import { PlanType } from '../types';
import { Button } from '../components/Button';
import { Building2, Users, DollarSign, Activity, Settings, Search, MoreHorizontal, ExternalLink, LogOut, Plus, X, TrendingUp, CreditCard, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type ViewMode = 'RESTAURANTS' | 'FINANCIAL' | 'SETTINGS';

export const SuperAdminDashboard: React.FC = () => {
  const { state, dispatch } = useSaaS();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ViewMode>('RESTAURANTS');
  const [filter, setFilter] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTenantForm, setNewTenantForm] = useState({
      name: '',
      slug: '',
      ownerName: '',
      email: '',
      plan: 'FREE' as PlanType
  });

  // Settings State
  const [settingsForm, setSettingsForm] = useState({
      name: state.adminName || '',
      email: state.adminEmail || '',
      password: ''
  });

  // Derived Metrics
  const filteredTenants = state.tenants.filter(t => 
    t.name.toLowerCase().includes(filter.toLowerCase()) || 
    t.ownerName.toLowerCase().includes(filter.toLowerCase())
  );

  const activeTenants = state.tenants.filter(t => t.status === 'ACTIVE').length;
  
  // Cálculo de MRR (Receita Mensal Recorrente)
  const mrr = state.tenants.reduce((acc, t) => {
    if (t.status === 'INACTIVE') return acc;
    if (t.plan === 'PRO') return acc + 99;
    if (t.plan === 'ENTERPRISE') return acc + 249;
    return acc;
  }, 0);

  const planDistribution = {
      FREE: state.tenants.filter(t => t.plan === 'FREE').length,
      PRO: state.tenants.filter(t => t.plan === 'PRO').length,
      ENTERPRISE: state.tenants.filter(t => t.plan === 'ENTERPRISE').length
  };

  const getDemoUrl = (slug: string) => {
      const baseUrl = window.location.origin + window.location.pathname;
      return `${baseUrl}?restaurant=${slug}`; // Ajuste para funcionar na mesma URL base
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
      
      dispatch({
          type: 'CREATE_TENANT',
          payload: newTenantForm
      });
      setIsModalOpen(false);
      setNewTenantForm({ name: '', slug: '', ownerName: '', email: '', plan: 'FREE' });
      alert("Restaurante criado com sucesso! Um admin padrão (Pin: 1234) foi gerado.");
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
      e.preventDefault();
      dispatch({
          type: 'UPDATE_PROFILE',
          name: settingsForm.name,
          email: settingsForm.email
      });
      alert("Perfil atualizado com sucesso!");
  };

  const autoGenerateSlug = (name: string) => {
      const slug = name.toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
        .replace(/\s+/g, '-')     // Substitui espaços por hífens
        .replace(/--+/g, '-');    // Remove hífens duplicados
      setNewTenantForm(prev => ({ ...prev, name, slug }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
       
       {/* Sidebar */}
       <div className="w-64 bg-slate-900 text-white p-6 sticky top-0 h-screen flex flex-col justify-between shrink-0 z-20">
          <div>
            <div className="text-2xl font-bold mb-10 flex items-center gap-2">
                <Activity className="text-blue-500" /> SaaS Admin
            </div>
            <nav className="space-y-2">
                <button 
                    onClick={() => setActiveView('RESTAURANTS')}
                    className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeView === 'RESTAURANTS' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                    <Building2 size={20} /> Restaurantes
                </button>
                <button 
                    onClick={() => setActiveView('FINANCIAL')}
                    className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeView === 'FINANCIAL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                    <DollarSign size={20} /> Financeiro
                </button>
                <button 
                    onClick={() => setActiveView('SETTINGS')}
                    className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeView === 'SETTINGS' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                    <Settings size={20} /> Configurações
                </button>
            </nav>
          </div>
          
          <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 rounded text-red-400 hover:bg-slate-800 mt-auto">
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
                       {activeView === 'SETTINGS' && 'Configurações do Sistema'}
                   </h1>
                   <p className="text-gray-500">Bem-vindo, {state.adminName}</p>
               </div>
               
               {/* Quick Stats Header */}
               <div className="flex items-center gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-4">
                      <div className="bg-green-100 p-2 rounded-full text-green-600"><Building2 size={20} /></div>
                      <div>
                          <p className="text-xs text-gray-500 uppercase font-bold">Ativos</p>
                          <p className="text-xl font-bold">{activeTenants}</p>
                      </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-4">
                      <div className="bg-blue-100 p-2 rounded-full text-blue-600"><DollarSign size={20} /></div>
                      <div>
                          <p className="text-xs text-gray-500 uppercase font-bold">MRR</p>
                          <p className="text-xl font-bold">R$ {mrr.toFixed(2)}</p>
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
                        <input 
                            type="text" 
                            placeholder="Buscar por nome ou dono..." 
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                    <Button onClick={() => setIsModalOpen(true)}>
                        <Plus size={18} /> Novo Restaurante
                    </Button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-sm font-semibold uppercase">
                            <tr>
                                <th className="p-4">Restaurante</th>
                                <th className="p-4">Acesso (Slug)</th>
                                <th className="p-4">Dono</th>
                                <th className="p-4">Plano</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTenants.map((tenant) => (
                                <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-gray-800">{tenant.name}</div>
                                        <div className="text-xs text-gray-500">{tenant.email}</div>
                                    </td>
                                    <td className="p-4">
                                        <a href={getDemoUrl(tenant.slug || 'bistro')} target="_blank" className="text-blue-600 hover:underline text-sm flex items-center gap-1 bg-blue-50 px-2 py-1 rounded w-fit">
                                            /{tenant.slug || 'slug'} <ExternalLink size={12} />
                                        </a>
                                    </td>
                                    <td className="p-4 text-gray-700">{tenant.ownerName}</td>
                                    <td className="p-4">
                                        <select 
                                            className="border rounded p-1 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={tenant.plan}
                                            onChange={(e) => dispatch({ type: 'CHANGE_PLAN', tenantId: tenant.id, plan: e.target.value as PlanType })}
                                        >
                                            <option value="FREE">Free (R$0)</option>
                                            <option value="PRO">Pro (R$99)</option>
                                            <option value="ENTERPRISE">Enterprise (R$249)</option>
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <button 
                                            onClick={() => dispatch({ type: 'TOGGLE_STATUS', tenantId: tenant.id })}
                                            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border
                                                ${tenant.status === 'ACTIVE' 
                                                    ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' 
                                                    : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'}
                                            `}
                                        >
                                            {tenant.status === 'ACTIVE' ? 'ATIVO' : 'INATIVO'}
                                        </button>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full">
                                            <MoreHorizontal size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredTenants.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400">Nenhum restaurante encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
               </>
           )}

           {/* --- VIEW: FINANCIAL --- */}
           {activeView === 'FINANCIAL' && (
               <div className="space-y-6 animate-fade-in">
                   {/* Cards */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
                           <div className="flex justify-between items-start mb-4">
                               <div>
                                   <p className="text-gray-500 text-sm font-medium">Receita Mensal (MRR)</p>
                                   <h3 className="text-3xl font-bold text-gray-800 mt-1">R$ {mrr.toFixed(2)}</h3>
                               </div>
                               <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
                                   <TrendingUp size={24} />
                               </div>
                           </div>
                           <div className="text-sm text-green-600 flex items-center gap-1">
                               <TrendingUp size={14} /> +12% vs mês anterior
                           </div>
                       </div>

                       <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-100">
                           <div className="flex justify-between items-start mb-4">
                               <div>
                                   <p className="text-gray-500 text-sm font-medium">Ticket Médio (ARPU)</p>
                                   <h3 className="text-3xl font-bold text-gray-800 mt-1">
                                       R$ {(state.tenants.length > 0 ? mrr / state.tenants.length : 0).toFixed(2)}
                                   </h3>
                               </div>
                               <div className="bg-purple-100 p-3 rounded-lg text-purple-600">
                                   <CreditCard size={24} />
                               </div>
                           </div>
                           <p className="text-xs text-gray-400">Média por cliente ativo</p>
                       </div>

                       <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100">
                           <div className="flex justify-between items-start mb-4">
                               <div>
                                   <p className="text-gray-500 text-sm font-medium">Clientes Totais</p>
                                   <h3 className="text-3xl font-bold text-gray-800 mt-1">{state.tenants.length}</h3>
                               </div>
                               <div className="bg-green-100 p-3 rounded-lg text-green-600">
                                   <Users size={24} />
                               </div>
                           </div>
                           <p className="text-xs text-gray-400">{activeTenants} Ativos / {state.tenants.length - activeTenants} Inativos</p>
                       </div>
                   </div>

                   {/* Distribution Chart (Simple Bars) */}
                   <div className="bg-white p-6 rounded-xl shadow-sm border">
                       <h3 className="text-lg font-bold text-gray-800 mb-6">Distribuição de Planos</h3>
                       <div className="space-y-4">
                           <div>
                               <div className="flex justify-between text-sm mb-1">
                                   <span className="font-medium text-gray-700">Enterprise (R$ 249)</span>
                                   <span className="text-gray-500">{planDistribution.ENTERPRISE} clientes</span>
                               </div>
                               <div className="w-full bg-gray-100 rounded-full h-3">
                                   <div 
                                      className="bg-purple-600 h-3 rounded-full transition-all duration-1000" 
                                      style={{ width: `${(planDistribution.ENTERPRISE / state.tenants.length || 0) * 100}%` }}
                                   ></div>
                               </div>
                           </div>
                           
                           <div>
                               <div className="flex justify-between text-sm mb-1">
                                   <span className="font-medium text-gray-700">Pro (R$ 99)</span>
                                   <span className="text-gray-500">{planDistribution.PRO} clientes</span>
                               </div>
                               <div className="w-full bg-gray-100 rounded-full h-3">
                                   <div 
                                      className="bg-blue-600 h-3 rounded-full transition-all duration-1000" 
                                      style={{ width: `${(planDistribution.PRO / state.tenants.length || 0) * 100}%` }}
                                   ></div>
                               </div>
                           </div>

                           <div>
                               <div className="flex justify-between text-sm mb-1">
                                   <span className="font-medium text-gray-700">Free (R$ 0)</span>
                                   <span className="text-gray-500">{planDistribution.FREE} clientes</span>
                               </div>
                               <div className="w-full bg-gray-100 rounded-full h-3">
                                   <div 
                                      className="bg-gray-400 h-3 rounded-full transition-all duration-1000" 
                                      style={{ width: `${(planDistribution.FREE / state.tenants.length || 0) * 100}%` }}
                                   ></div>
                               </div>
                           </div>
                       </div>
                   </div>
               </div>
           )}

           {/* --- VIEW: SETTINGS --- */}
           {activeView === 'SETTINGS' && (
               <div className="max-w-2xl animate-fade-in">
                   <div className="bg-white p-8 rounded-xl shadow-sm border">
                       <div className="flex items-center gap-4 mb-8 border-b pb-6">
                           <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                               <User size={32} />
                           </div>
                           <div>
                               <h2 className="text-xl font-bold text-gray-800">Perfil do Administrador</h2>
                               <p className="text-gray-500 text-sm">Gerencie suas credenciais de acesso ao painel SaaS.</p>
                           </div>
                       </div>

                       <form onSubmit={handleUpdateProfile} className="space-y-6">
                           <div className="grid grid-cols-2 gap-6">
                               <div className="col-span-2">
                                   <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                   <input 
                                      type="text" 
                                      className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                      value={settingsForm.name}
                                      onChange={e => setSettingsForm({...settingsForm, name: e.target.value})}
                                   />
                               </div>
                               <div className="col-span-2">
                                   <label className="block text-sm font-medium text-gray-700 mb-1">E-mail de Acesso</label>
                                   <input 
                                      type="email" 
                                      className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                      value={settingsForm.email}
                                      onChange={e => setSettingsForm({...settingsForm, email: e.target.value})}
                                   />
                               </div>
                               <div className="col-span-2">
                                   <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha (Opcional)</label>
                                   <input 
                                      type="password" 
                                      placeholder="Deixe em branco para manter a atual"
                                      className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                                      value={settingsForm.password}
                                      onChange={e => setSettingsForm({...settingsForm, password: e.target.value})}
                                      disabled // Desativado para esta demo segura, necessitaria lógica de reauth
                                   />
                                   <p className="text-xs text-gray-400 mt-1">Alteração de senha requer re-autenticação (desabilitado nesta demo).</p>
                               </div>
                           </div>
                           
                           <div className="flex justify-end pt-4">
                               <Button type="submit">Salvar Alterações</Button>
                           </div>
                       </form>
                   </div>
               </div>
           )}

       </div>

       {/* --- MODAL: NEW TENANT --- */}
       {isModalOpen && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                   <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                       <h3 className="text-lg font-bold text-gray-800">Novo Restaurante</h3>
                       <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                   </div>
                   
                   <form onSubmit={handleCreateTenant} className="p-6 space-y-4">
                       <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Restaurante</label>
                           <input 
                               type="text" 
                               required
                               className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                               placeholder="Ex: Pizzaria do Zé"
                               value={newTenantForm.name}
                               onChange={(e) => autoGenerateSlug(e.target.value)}
                           />
                       </div>
                       
                       <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                           <div className="flex items-center border rounded-lg overflow-hidden bg-gray-50">
                               <span className="pl-3 pr-1 text-gray-500 text-sm">gastroflow.com/</span>
                               <input 
                                    type="text" 
                                    required
                                    className="flex-1 p-2.5 bg-transparent focus:outline-none text-blue-600 font-medium"
                                    placeholder="pizzaria-do-ze"
                                    value={newTenantForm.slug}
                                    onChange={(e) => setNewTenantForm({...newTenantForm, slug: e.target.value.toLowerCase().replace(/\s/g, '-')})}
                               />
                           </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Dono</label>
                               <input 
                                    type="text" 
                                    required
                                    className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Nome completo"
                                    value={newTenantForm.ownerName}
                                    onChange={(e) => setNewTenantForm({...newTenantForm, ownerName: e.target.value})}
                               />
                           </div>
                           <div>
                               <label className="block text-sm font-medium text-gray-700 mb-1">Email do Dono</label>
                               <input 
                                    type="email" 
                                    className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="email@cliente.com"
                                    value={newTenantForm.email}
                                    onChange={(e) => setNewTenantForm({...newTenantForm, email: e.target.value})}
                               />
                           </div>
                       </div>

                       <div>
                           <label className="block text-sm font-medium text-gray-700 mb-2">Plano Inicial</label>
                           <div className="grid grid-cols-3 gap-3">
                               {['FREE', 'PRO', 'ENTERPRISE'].map((plan) => (
                                   <div 
                                      key={plan}
                                      onClick={() => setNewTenantForm({...newTenantForm, plan: plan as PlanType})}
                                      className={`cursor-pointer border-2 rounded-xl p-3 text-center transition-all
                                        ${newTenantForm.plan === plan ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}
                                      `}
                                   >
                                       <div className="font-bold text-sm">{plan}</div>
                                       <div className="text-xs text-gray-500">
                                           {plan === 'FREE' ? 'R$ 0' : plan === 'PRO' ? 'R$ 99' : 'R$ 249'}
                                       </div>
                                   </div>
                               ))}
                           </div>
                       </div>

                       <div className="pt-4 flex gap-3">
                           <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Cancelar</Button>
                           <Button type="submit" className="flex-1">Criar Restaurante</Button>
                       </div>
                   </form>
               </div>
           </div>
       )}
    </div>
  );
};