
import React, { useState } from 'react';
import { useSaaS } from '../context/SaaSContext';
import { useUI } from '../context/UIContext';
import { Plan, PlanType, RestaurantTenant, PlanLimits } from '../types';
import { Button } from '../components/Button';
import { SaaSTenantCreateModal, SaaSEditTenantModal, SaaSTenantLinksModal } from '../components/modals/SaaSModals';
import { Building2, DollarSign, Activity, Settings, Search, ExternalLink, LogOut, Plus, X, List, Edit, Lock, BarChart2, Unlock, Link as LinkIcon, FileText, Printer, ChevronDown, Edit3, RotateCcw } from 'lucide-react';
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
  const [isEditingContract, setIsEditingContract] = useState(false); // Novo estado para controle de edição

  // Settings State
  const [settingsForm, setSettingsForm] = useState({ name: state.adminName || '', email: state.adminEmail || '', password: '' });
  
  // Plans Edit State
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingFeatures, setEditingFeatures] = useState<string>('');
  const [editingLimits, setEditingLimits] = useState<PlanLimits>({
      maxTables: 10, maxProducts: 30, maxStaff: 2, 
      allowKds: false, allowCashier: false, allowReports: false,
      allowInventory: false, allowPurchases: false, allowExpenses: false,
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
      setEditingLimits(plan.limits || { maxTables: -1, maxProducts: -1, maxStaff: -1, allowKds: true, allowCashier: true, allowReports: true, allowInventory: true, allowPurchases: true, allowExpenses: true, allowStaff: true, allowTableMgmt: true, allowCustomization: true });
  }
  
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
       {/* Sidebar */}
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
       <div className="flex-1 p-8 overflow-y-auto h-screen print:p-0 print:h-auto print:overflow-visible">
           <header className="flex justify-between items-center mb-8 print:hidden">
               <div>
                   <h1 className="text-3xl font-bold text-gray-800">
                       {activeView === 'RESTAURANTS' && 'Gerenciar Restaurantes'}
                       {activeView === 'CONTRACTS' && 'Gerador de Contratos'}
                       {activeView === 'FINANCIAL' && 'Painel Financeiro'}
                       {activeView === 'PLANS' && 'Gestão de Planos'}
                       {activeView === 'SETTINGS' && 'Configurações do Sistema'}
                   </h1>
                   <p className="text-gray-500">Bem-vindo, {state.adminName}</p>
               </div>
               
               {activeView === 'RESTAURANTS' && (
                   <div className="flex items-center gap-4">
                      <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-4">
                          <div className="bg-green-100 p-2 rounded-full text-green-600"><Building2 size={20} /></div>
                          <div>
                              <p className="text-xs text-gray-500 uppercase font-bold">Ativos</p>
                              <p className="text-xl font-bold">{activeTenants}</p>
                          </div>
                      </div>
                   </div>
               )}
           </header>

           {/* --- VIEW: CONTRACTS --- */}
           {activeView === 'CONTRACTS' && (
               <div className="flex flex-col h-full print:block">
                   <div className="bg-white p-6 rounded-xl shadow-sm border mb-6 print:hidden">
                       <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Settings size={18} /> Configuração do Documento</h2>
                       <div className="flex gap-4 items-end">
                           <div className="flex-1">
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Selecione o Cliente</label>
                               <div className="relative">
                                   <select 
                                       className="w-full border p-3 rounded-lg appearance-none bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                       value={selectedContractTenantId}
                                       onChange={(e) => {
                                           setSelectedContractTenantId(e.target.value);
                                           setIsEditingContract(false); // Reseta modo edição ao trocar cliente
                                       }}
                                   >
                                       <option value="">-- Selecione um restaurante --</option>
                                       {state.tenants.map(t => (
                                           <option key={t.id} value={t.id}>{t.name} ({t.ownerName})</option>
                                       ))}
                                   </select>
                                   <ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={16}/>
                               </div>
                           </div>
                           <Button 
                               onClick={() => setIsEditingContract(!isEditingContract)} 
                               variant={isEditingContract ? "secondary" : "outline"}
                               disabled={!selectedContractTenantId} 
                               className={`h-[46px] px-6 transition-all ${isEditingContract ? 'bg-blue-100 text-blue-700 border-blue-200' : ''}`}
                           >
                               {isEditingContract ? <RotateCcw size={18} className="mr-2"/> : <Edit3 size={18} className="mr-2"/>} 
                               {isEditingContract ? 'Encerrar Edição' : 'Editar Texto'}
                           </Button>
                           <Button onClick={() => window.print()} disabled={!selectedContractTenantId} className="h-[46px] px-6">
                               <Printer size={18} className="mr-2"/> Imprimir Contrato
                           </Button>
                       </div>
                       {isEditingContract && <p className="text-xs text-blue-600 mt-2 font-bold animate-pulse">Modo de edição ativo. Clique no texto abaixo para alterar.</p>}
                   </div>

                   {selectedContractTenant ? (
                       <div 
                           key={selectedContractTenantId} // Força re-render ao trocar tenant (reseta edições)
                           contentEditable={isEditingContract}
                           suppressContentEditableWarning={true}
                           className={`bg-white shadow-2xl p-[2cm] max-w-[21cm] min-h-[29.7cm] mx-auto text-justify text-sm leading-relaxed print:shadow-none print:w-full print:max-w-none print:mx-0 print:p-0 transition-all ${isEditingContract ? 'ring-4 ring-blue-200 outline-none cursor-text' : ''}`}
                       >
                           <div className="text-center mb-8">
                               <h1 className="text-xl font-bold uppercase mb-2">Contrato de Licenciamento de Software (SaaS)</h1>
                               <p className="text-xs text-gray-500 font-bold">Nº {selectedContractTenant.id.slice(0,8).toUpperCase()}/{new Date().getFullYear()}</p>
                           </div>

                           <div className="space-y-6">
                               <section>
                                   <h3 className="font-bold uppercase mb-2 text-xs text-gray-900 border-b border-gray-300 pb-1">1. Identificação das Partes</h3>
                                   <p className="mb-2">
                                       <strong>CONTRATADA:</strong> <strong>FLUX EAT TECNOLOGIA LTDA</strong>, inscrita no CNPJ sob o nº 00.000.000/0001-00, com sede em Uberlândia/MG, doravante denominada simplesmente "CONTRATADA".
                                   </p>
                                   <p>
                                       <strong>CONTRATANTE:</strong> <strong>{selectedContractTenant.businessInfo?.restaurantName || selectedContractTenant.name.toUpperCase()}</strong>, 
                                       {selectedContractTenant.businessInfo?.cnpj ? ` inscrita no CNPJ nº ${selectedContractTenant.businessInfo.cnpj},` : ''} 
                                       representada neste ato por <strong>{selectedContractTenant.ownerName.toUpperCase()}</strong>,
                                       {selectedContractTenant.businessInfo?.address ? ` localizada em ${selectedContractTenant.businessInfo.address.street}, ${selectedContractTenant.businessInfo.address.number} - ${selectedContractTenant.businessInfo.address.city}/${selectedContractTenant.businessInfo.address.state},` : ''}
                                       com e-mail de contato <strong>{selectedContractTenant.email}</strong>.
                                   </p>
                               </section>

                               <section>
                                   <h3 className="font-bold uppercase mb-2 text-xs text-gray-900 border-b border-gray-300 pb-1">2. Objeto</h3>
                                   <p>
                                       O presente contrato tem como objeto o licenciamento de uso do software <strong>Flux Eat</strong>, na modalidade SaaS (Software as a Service), para gestão de restaurante, incluindo módulos de cardápio digital, KDS e controle financeiro, conforme as especificações do plano contratado.
                                   </p>
                               </section>

                               <section>
                                   <h3 className="font-bold uppercase mb-2 text-xs text-gray-900 border-b border-gray-300 pb-1">3. Plano e Valores</h3>
                                   <p>
                                       A CONTRATANTE opta pelo plano <strong>{selectedContractPlan?.name.toUpperCase() || selectedContractTenant.plan}</strong>, 
                                       que inclui {selectedContractPlan?.features?.[0] || 'acesso ao sistema'} e demais funcionalidades descritas na proposta comercial.
                                   </p>
                                   <p className="mt-2">
                                       Pela licença de uso, a CONTRATANTE pagará à CONTRATADA o valor mensal de <strong>{selectedContractPlan?.price || 'A DEFINIR'}</strong>.
                                       Os pagamentos deverão ser efetuados via [Boleto/Pix/Cartão] até o dia [Dia] de cada mês.
                                   </p>
                               </section>

                               <section>
                                   <h3 className="font-bold uppercase mb-2 text-xs text-gray-900 border-b border-gray-300 pb-1">4. Vigência e Cancelamento</h3>
                                   <p>
                                       Este contrato entra em vigor na data de sua assinatura e vigorará por prazo indeterminado. Qualquer uma das partes poderá rescindir este contrato mediante aviso prévio de 30 (trinta) dias, sem incidência de multa, desde que não haja pendências financeiras.
                                   </p>
                               </section>

                               <section>
                                   <h3 className="font-bold uppercase mb-2 text-xs text-gray-900 border-b border-gray-300 pb-1">5. Disposições Gerais</h3>
                                   <p>
                                       A CONTRATADA garante a disponibilidade do serviço de 99,5% (SLA) e suporte técnico conforme o plano escolhido. A CONTRATANTE é responsável pela veracidade dos dados inseridos no sistema e pelo sigilo de suas senhas de acesso.
                                   </p>
                               </section>

                               <section className="mt-12 pt-12">
                                   <p className="mb-12">
                                       E, por estarem assim justas e contratadas, as partes assinam o presente instrumento.
                                   </p>
                                   <p className="text-right mb-16">
                                       Uberlândia/MG, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
                                   </p>

                                   <div className="flex justify-between gap-8 pt-8">
                                       <div className="flex-1 border-t border-black text-center pt-2">
                                           <p className="font-bold text-xs uppercase">Flux Eat Tecnologia</p>
                                           <p className="text-[10px] text-gray-500">Contratada</p>
                                       </div>
                                       <div className="flex-1 border-t border-black text-center pt-2">
                                           <p className="font-bold text-xs uppercase">{selectedContractTenant.ownerName}</p>
                                           <p className="text-[10px] text-gray-500">Contratante</p>
                                       </div>
                                   </div>
                               </section>
                           </div>
                       </div>
                   ) : (
                       <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 print:hidden">
                           <FileText size={48} className="mb-4 opacity-20"/>
                           <p>Selecione um cliente acima para gerar o contrato.</p>
                       </div>
                   )}
               </div>
           )}

           {/* --- VIEW: RESTAURANTS --- */}
           {activeView === 'RESTAURANTS' && (
               <>
                <div className="bg-white p-4 rounded-xl shadow-sm border mb-6 flex justify-between items-center">
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={filter} onChange={(e) => setFilter(e.target.value)} />
                    </div>
                    <Button onClick={() => setIsCreateModalOpen(true)}> <Plus size={18} /> Novo Restaurante </Button>
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
                                        <div className="flex items-center gap-2"><BarChart2 size={16} className="text-gray-400" /><span className="font-mono font-bold text-gray-700">{tenant.requestCount || 0}</span></div>
                                    </td>
                                    <td className="p-4">
                                        <button onClick={() => dispatch({ type: 'TOGGLE_STATUS', tenantId: tenant.id })} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm w-fit ${tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'}`}>
                                            {tenant.status === 'ACTIVE' ? <Unlock size={14}/> : <Lock size={14}/>} {tenant.status === 'ACTIVE' ? 'LIBERADO' : 'BLOQUEADO'}
                                        </button>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => openLinksModal(tenant)} className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-full transition-colors"><LinkIcon size={20} /></button>
                                            <button onClick={() => openEditModal(tenant)} className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-full transition-colors"><Edit size={20} /></button>
                                        </div>
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
                                            <div><label className="text-[10px] font-bold text-gray-500">Max Mesas</label><input type="number" className="w-full border p-1 rounded text-sm" value={editingLimits.maxTables} onChange={e => setEditingLimits({...editingLimits, maxTables: parseInt(e.target.value)})} /></div>
                                            <div><label className="text-[10px] font-bold text-gray-500">Max Produtos</label><input type="number" className="w-full border p-1 rounded text-sm" value={editingLimits.maxProducts} onChange={e => setEditingLimits({...editingLimits, maxProducts: parseInt(e.target.value)})} /></div>
                                            <div><label className="text-[10px] font-bold text-gray-500">Max Staff</label><input type="number" className="w-full border p-1 rounded text-sm" value={editingLimits.maxStaff} onChange={e => setEditingLimits({...editingLimits, maxStaff: parseInt(e.target.value)})} /></div>
                                        </div>
                                        <p className="text-[10px] text-gray-400 text-center">-1 significa Ilimitado</p>
                                        <div className="flex flex-col gap-2 pt-2 border-t border-gray-200">
                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editingLimits.allowKds} onChange={e => setEditingLimits({...editingLimits, allowKds: e.target.checked})} /><span className="text-xs font-medium">Permitir KDS</span></label>
                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editingLimits.allowCashier} onChange={e => setEditingLimits({...editingLimits, allowCashier: e.target.checked})} /><span className="text-xs font-medium">Permitir PDV</span></label>
                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editingLimits.allowInventory} onChange={e => setEditingLimits({...editingLimits, allowInventory: e.target.checked})} /><span className="text-xs font-medium">Permitir Estoque</span></label>
                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editingLimits.allowReports} onChange={e => setEditingLimits({...editingLimits, allowReports: e.target.checked})} /><span className="text-xs font-medium">Permitir Relatórios</span></label>
                                        </div>
                                   </div>
                                   <div className="flex-1"><label className="text-xs font-bold text-gray-500 uppercase">Features</label><textarea className="w-full border p-2 rounded h-24 text-sm resize-none" value={editingFeatures} onChange={e => setEditingFeatures(e.target.value)} /></div>
                                   <div className="flex gap-2 pt-2"><Button type="button" variant="secondary" onClick={() => setEditingPlan(null)} className="flex-1 text-xs">Cancelar</Button><Button type="submit" className="flex-1 text-xs">Salvar</Button></div>
                               </form>
                           ) : (
                               <>
                                   <div className="flex justify-between items-start mb-4"><h3 className="text-xl font-bold text-gray-800">{plan.name}</h3><span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono border">{plan.key}</span></div>
                                   <div className="text-3xl font-bold text-blue-600 mb-6">{plan.price} <span className="text-sm text-gray-400 font-normal">{plan.period}</span></div>
                                   <Button variant="outline" onClick={() => handleEditPlan(plan)} className="w-full mt-auto"><Edit size={16} /> Editar Limites & Detalhes</Button>
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
                           <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome</label><input type="text" className="w-full border p-3 rounded-lg" value={settingsForm.name} onChange={e => setSettingsForm({...settingsForm, name: e.target.value})} /></div>
                           <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" className="w-full border p-3 rounded-lg" value={settingsForm.email} onChange={e => setSettingsForm({...settingsForm, email: e.target.value})} /></div>
                           <Button type="submit">Salvar Alterações</Button>
                       </form>
                   </div>
               </div>
           )}
       </div>

       <SaaSTenantCreateModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
       <SaaSEditTenantModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} tenant={selectedTenant} />
       <SaaSTenantLinksModal isOpen={isLinksModalOpen} onClose={() => setIsLinksModalOpen(false)} tenant={selectedTenant} />
    </div>
  );
};
