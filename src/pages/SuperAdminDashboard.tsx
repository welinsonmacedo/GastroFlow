
import React, { useState } from 'react';
import { useSaaS } from '../context/SaaSContext';
import { useUI } from '../context/UIContext';
import { Plan, PlanType, RestaurantTenant, PlanLimits } from '../types';
import { Button } from '../components/Button';
import { SaaSTenantCreateModal, SaaSEditTenantModal, SaaSTenantLinksModal } from '../components/modals/SaaSModals';
import { Building2, DollarSign, Activity, Settings, Search, ExternalLink, LogOut, Plus, X, List, Edit, Lock, BarChart2, Unlock, Link as LinkIcon, FileText, Printer, ChevronDown, Edit3, RotateCcw } from 'lucide-react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';

type ViewMode = 'RESTAURANTS' | 'FINANCIAL' | 'PLANS' | 'SETTINGS' | 'CONTRACTS';

export const SuperAdminDashboard: React.FC = () => {
  const { state, dispatch } = useSaaS();
  const { showAlert, showConfirm } = useUI();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ViewMode>('RESTAURANTS');
  const [filter, setFilter] = useState('');
  
  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<RestaurantTenant | null>(null);

  // Contract Generator State
  const [selectedContractTenantId, setSelectedContractTenantId] = useState('');
  const [isEditingContract, setIsEditingContract] = useState(false); 

  // Settings State
  const [settingsForm, setSettingsForm] = useState({ name: state.adminName || '', email: state.adminEmail || '', password: '' });
  
  // Plans Edit State
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingFeatures, setEditingFeatures] = useState<string>('');
  const [editingLimits, setEditingLimits] = useState<PlanLimits>({
      maxTables: 10, maxProducts: 30, maxStaff: 2, 
      allowKds: false, allowPos: false, allowDelivery: false, allowCashControl: false,
      allowReports: false, allowInventory: false, allowPurchases: false, allowExpenses: false,
      allowStaff: true, allowTableMgmt: true, allowCustomization: true
  });

  // Derived Metrics
  const filteredTenants = state.tenants.filter(t => t.name.toLowerCase().includes(filter.toLowerCase()) || t.ownerName.toLowerCase().includes(filter.toLowerCase()));
  const activeTenants = state.tenants.filter(t => t.status === 'ACTIVE').length;
  const mrr = state.tenants.reduce((acc, t) => {
    if (t.status === 'INACTIVE') return acc;
    const plan = state.plans.find(p => p.key === t.plan);
    const price = plan ? parseFloat(plan.price.replace('R$', '').replace(',','.').trim()) : 0;
    return acc + (isNaN(price) ? 0 : price);
  }, 0);

  const getDemoUrl = (slug: string) => `${window.location.origin}/?restaurant=${slug}`;

  const handleLogout = () => {
      showConfirm({
          title: "Sair do Painel?", message: "Você precisará fazer login novamente.", type: 'WARNING', confirmText: "Sair",
          onConfirm: () => { dispatch({ type: 'LOGOUT_ADMIN' }); navigate('/'); }
      });
  };

  const openEditModal = (tenant: RestaurantTenant) => { setSelectedTenant(tenant); setIsEditModalOpen(true); };
  const openLinksModal = (tenant: RestaurantTenant) => { setSelectedTenant(tenant); setIsLinksModalOpen(true); };

  const handleUpdateProfile = (e: React.FormEvent) => {
      e.preventDefault();
      dispatch({ type: 'UPDATE_PROFILE', name: settingsForm.name, email: settingsForm.email });
      showAlert({ title: "Sucesso", message: "Perfil atualizado com sucesso!", type: 'SUCCESS' });
  };
  
  const handleEditPlan = (plan: Plan) => {
      setEditingPlan(plan);
      setEditingFeatures(plan.features.join('\n'));
      setEditingLimits(plan.limits || { 
          maxTables: -1, maxProducts: -1, maxStaff: -1, 
          allowKds: true, allowPos: true, allowDelivery: true, allowCashControl: true,
          allowReports: true, allowInventory: true, allowPurchases: true, allowExpenses: true, 
          allowStaff: true, allowTableMgmt: true, allowCustomization: true 
      });
  };
  
  const handleSavePlan = (e: React.FormEvent) => {
      e.preventDefault();
      if(editingPlan) {
          const updatedPlan: Plan = { ...editingPlan, features: editingFeatures.split('\n').filter(l => l.trim() !== ''), limits: editingLimits };
          dispatch({ type: 'UPDATE_PLAN_DETAILS', plan: updatedPlan });
          setEditingPlan(null);
          showAlert({ title: "Sucesso", message: "Plano atualizado!", type: 'SUCCESS' });
      }
  };

  const selectedContractTenant = state.tenants.find(t => t.id === selectedContractTenantId);
  const selectedContractPlan = selectedContractTenant ? state.plans.find(p => p.key === selectedContractTenant.plan) : null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
       {/* Sidebar - Mantido igual */}
       <div className="w-64 bg-slate-900 text-white p-6 sticky top-0 h-screen flex flex-col justify-between shrink-0 z-20 print:hidden">
          <div>
            <div className="text-2xl font-bold mb-10 flex items-center gap-2">
                <Activity className="text-blue-500" /> SaaS Admin
            </div>
            <nav className="space-y-2">
                <button onClick={() => setActiveView('RESTAURANTS')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeView === 'RESTAURANTS' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Building2 size={20} /> Restaurantes</button>
                <button onClick={() => setActiveView('CONTRACTS')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeView === 'CONTRACTS' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><FileText size={20} /> Contratos</button>
                <button onClick={() => setActiveView('FINANCIAL')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeView === 'FINANCIAL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><DollarSign size={20} /> Financeiro</button>
                <button onClick={() => setActiveView('PLANS')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeView === 'PLANS' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><List size={20} /> Planos & Preços</button>
                <button onClick={() => setActiveView('SETTINGS')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeView === 'SETTINGS' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Settings size={20} /> Configurações</button>
            </nav>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 rounded text-red-400 hover:bg-slate-800 mt-auto"><LogOut size={20} /> Sair</button>
       </div>

       {/* Main Content */}
       <div className="flex-1 p-8 overflow-y-auto h-screen print:p-0 print:h-auto print:overflow-visible bg-slate-100 print:bg-white">
           {/* ... Header e outras Views (Restaurantes, Contratos, etc.) ... */}

           {/* --- VIEW: PLANS --- */}
           {activeView === 'PLANS' && (
               <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in">
                   {state.plans.map(plan => (
                       <div key={plan.id} className="bg-white rounded-xl shadow-sm border p-6 flex flex-col h-full hover:shadow-md transition-shadow">
                           {editingPlan?.id === plan.id ? (
                               <form onSubmit={handleSavePlan} className="space-y-4 flex-1 flex flex-col">
                                   <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-xs font-bold text-gray-500 uppercase">Nome</label><input className="w-full border p-2 rounded text-sm" value={editingPlan.name} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} /></div>
                                        <div><label className="text-xs font-bold text-gray-500 uppercase">Preço</label><input className="w-full border p-2 rounded text-sm" value={editingPlan.price} onChange={e => setEditingPlan({...editingPlan, price: e.target.value})} /></div>
                                   </div>
                                   <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
                                        <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1"><Settings size={12}/> Limites do Plano</h4>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-500">Max Mesas</label>
                                                <input type="number" className="w-full border p-1 rounded text-sm" value={editingLimits.maxTables} onChange={(e) => setEditingLimits({...editingLimits, maxTables: parseInt(e.target.value)})} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-500">Max Produtos</label>
                                                <input type="number" className="w-full border p-1 rounded text-sm" value={editingLimits.maxProducts} onChange={(e) => setEditingLimits({...editingLimits, maxProducts: parseInt(e.target.value)})} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-500">Max Staff</label>
                                                <input type="number" className="w-full border p-1 rounded text-sm" value={editingLimits.maxStaff} onChange={(e) => setEditingLimits({...editingLimits, maxStaff: parseInt(e.target.value)})} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <label className="flex items-center gap-2 font-bold text-gray-700 col-span-2 border-b pb-1 mb-1">Módulos Operacionais</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" checked={editingLimits.allowKds} onChange={(e) => setEditingLimits({...editingLimits, allowKds: e.target.checked})} /> KDS (Cozinha)</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" checked={editingLimits.allowPos} onChange={(e) => setEditingLimits({...editingLimits, allowPos: e.target.checked})} /> PDV (Balcão)</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" checked={editingLimits.allowDelivery} onChange={(e) => setEditingLimits({...editingLimits, allowDelivery: e.target.checked})} /> Delivery</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" checked={editingLimits.allowCashControl} onChange={(e) => setEditingLimits({...editingLimits, allowCashControl: e.target.checked})} /> Controle Caixa (Turno)</label>
                                            
                                            <label className="flex items-center gap-2 font-bold text-gray-700 col-span-2 border-b pb-1 mb-1 mt-2">Módulos de Gestão</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" checked={editingLimits.allowInventory} onChange={(e) => setEditingLimits({...editingLimits, allowInventory: e.target.checked})} /> Estoque</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" checked={editingLimits.allowExpenses} onChange={(e) => setEditingLimits({...editingLimits, allowExpenses: e.target.checked})} /> Financeiro</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" checked={editingLimits.allowReports} onChange={(e) => setEditingLimits({...editingLimits, allowReports: e.target.checked})} /> Relatórios</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" checked={editingLimits.allowCustomization} onChange={(e) => setEditingLimits({...editingLimits, allowCustomization: e.target.checked})} /> Whitelabel</label>
                                        </div>
                                   </div>
                                   <div className="flex gap-2 mt-auto">
                                       <Button type="button" variant="secondary" onClick={() => setEditingPlan(null)} className="flex-1">Cancelar</Button>
                                       <Button type="submit" className="flex-1">Salvar</Button>
                                   </div>
                               </form>
                           ) : (
                               <>
                                   <div className="flex justify-between items-start mb-4">
                                       <div>
                                           <h3 className="font-bold text-lg text-gray-800">{plan.name}</h3>
                                           <p className="text-2xl font-black text-blue-600">{plan.price}</p>
                                       </div>
                                       {plan.is_popular && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Popular</span>}
                                   </div>
                                   <ul className="space-y-2 mb-6 flex-1">
                                       {plan.features.map((feat, i) => (
                                           <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                               <span className="text-green-500 mt-0.5">✔</span> {feat}
                                           </li>
                                       ))}
                                       {plan.limits && (
                                            <li className="text-xs text-gray-400 mt-2 border-t pt-2">
                                                Limites: {plan.limits.maxTables === -1 ? '∞' : plan.limits.maxTables} mesas
                                            </li>
                                       )}
                                   </ul>
                                   <Button variant="outline" onClick={() => handleEditPlan(plan)} className="w-full">Editar Plano</Button>
                                </>
                           )}
                       </div>
                   ))}
               </div>
           )}

           {/* --- Outras Views (Restaurantes, Financeiro, Settings) são renderizadas aqui se selecionadas --- */}
           {activeView === 'RESTAURANTS' && (
               /* ... código existente da view de restaurantes ... */
               <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center">
                        <div className="relative w-96">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border rounded-lg" value={filter} onChange={(e) => setFilter(e.target.value)} />
                        </div>
                        <Button onClick={() => setIsCreateModalOpen(true)}> <Plus size={18} /> Novo Restaurante </Button>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-sm font-semibold uppercase">
                            <tr>
                                <th className="p-4">Restaurante</th>
                                <th className="p-4">Plano</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTenants.map((tenant) => (
                                <tr key={tenant.id}>
                                    <td className="p-4">
                                        <div className="font-bold text-gray-800">{tenant.name}</div>
                                        <div className="text-xs text-gray-500">{tenant.ownerName}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">{tenant.plan}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{tenant.status}</span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => openLinksModal(tenant)} className="p-2 bg-gray-100 rounded hover:bg-gray-200"><LinkIcon size={16}/></button>
                                            <button onClick={() => openEditModal(tenant)} className="p-2 bg-gray-100 rounded hover:bg-gray-200"><Edit size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
               </div>
           )}

           {/* ... Outras views ... */}
       </div>

       {/* Modais */}
       <SaaSTenantCreateModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
       <SaaSEditTenantModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} tenant={selectedTenant} />
       <SaaSTenantLinksModal isOpen={isLinksModalOpen} onClose={() => setIsLinksModalOpen(false)} tenant={selectedTenant} />
    </div>
  );
};
