import React, { useState } from 'react';
import { useSaaS } from '../context/SaaSContext';
import { PlanType } from '../types';
import { Button } from '../components/Button';
import { Building2, Users, DollarSign, Activity, Settings, Search, MoreHorizontal, ExternalLink, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SuperAdminDashboard: React.FC = () => {
  const { state, dispatch } = useSaaS();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('');

  const filteredTenants = state.tenants.filter(t => 
    t.name.toLowerCase().includes(filter.toLowerCase()) || 
    t.ownerName.toLowerCase().includes(filter.toLowerCase())
  );

  const activeTenants = state.tenants.filter(t => t.status === 'ACTIVE').length;
  const totalRevenue = state.tenants.reduce((acc, t) => {
    if (t.status === 'INACTIVE') return acc;
    if (t.plan === 'PRO') return acc + 99;
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

  return (
    <div className="min-h-screen bg-slate-50 flex">
       {/* Sidebar */}
       <div className="w-64 bg-slate-900 text-white p-6 sticky top-0 h-screen flex flex-col justify-between">
          <div>
            <div className="text-2xl font-bold mb-10 flex items-center gap-2">
                <Activity className="text-blue-500" /> SaaS Admin
            </div>
            <nav className="space-y-2">
                <button className="flex items-center gap-3 w-full p-3 rounded bg-blue-600 text-white">
                    <Building2 size={20} /> Restaurantes
                </button>
                <button className="flex items-center gap-3 w-full p-3 rounded text-slate-400 hover:bg-slate-800">
                    <DollarSign size={20} /> Financeiro
                </button>
                <button className="flex items-center gap-3 w-full p-3 rounded text-slate-400 hover:bg-slate-800">
                    <Settings size={20} /> Configurações
                </button>
            </nav>
          </div>
          
          <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 rounded text-red-400 hover:bg-slate-800 mt-auto">
              <LogOut size={20} /> Sair
          </button>
       </div>

       {/* Content */}
       <div className="flex-1 p-8 overflow-y-auto">
           <header className="flex justify-between items-center mb-8">
               <div>
                   <h1 className="text-3xl font-bold text-gray-800">Painel de Controle</h1>
                   <p className="text-gray-500">Bem-vindo, {state.adminName}</p>
               </div>
               <div className="flex items-center gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-4">
                      <div className="bg-green-100 p-2 rounded-full text-green-600"><Building2 /></div>
                      <div>
                          <p className="text-xs text-gray-500 uppercase font-bold">Ativos</p>
                          <p className="text-xl font-bold">{activeTenants}</p>
                      </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-4">
                      <div className="bg-blue-100 p-2 rounded-full text-blue-600"><DollarSign /></div>
                      <div>
                          <p className="text-xs text-gray-500 uppercase font-bold">MRR (Mensal)</p>
                          <p className="text-xl font-bold">R$ {totalRevenue.toFixed(2)}</p>
                      </div>
                  </div>
               </div>
           </header>

           {/* Filters */}
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
               <Button onClick={() => alert("Funcionalidade de cadastro manual de tenant")}>+ Novo Restaurante</Button>
           </div>

           {/* Table */}
           <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
               <table className="w-full text-left">
                   <thead className="bg-gray-50 text-gray-600 text-sm font-semibold uppercase">
                       <tr>
                           <th className="p-4">Restaurante</th>
                           <th className="p-4">Link Demo</th>
                           <th className="p-4">Dono</th>
                           <th className="p-4">Plano</th>
                           <th className="p-4">Status</th>
                           <th className="p-4 text-right">Ações</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                       {filteredTenants.map((tenant, idx) => {
                           const slugs = ['bistro', 'burger', 'pizza'];
                           const slug = slugs[idx] || 'bistro';
                           
                           return (
                           <tr key={tenant.id} className="hover:bg-gray-50">
                               <td className="p-4">
                                   <div className="font-bold text-gray-800">{tenant.name}</div>
                                   <div className="text-xs text-gray-500">{tenant.email}</div>
                               </td>
                               <td className="p-4">
                                   <a href={getDemoUrl(slug)} target="_blank" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                                      {slug}.gastroflow <ExternalLink size={12} />
                                   </a>
                               </td>
                               <td className="p-4 text-gray-700">{tenant.ownerName}</td>
                               <td className="p-4">
                                   <select 
                                      className="border rounded p-1 text-sm bg-white"
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
                                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors
                                        ${tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}
                                      `}
                                   >
                                       {tenant.status === 'ACTIVE' ? 'ATIVO' : 'INATIVO'}
                                   </button>
                               </td>
                               <td className="p-4 text-right">
                                   <button className="text-gray-400 hover:text-gray-600">
                                       <MoreHorizontal />
                                   </button>
                               </td>
                           </tr>
                       )})}
                   </tbody>
               </table>
           </div>
       </div>
    </div>
  );
};