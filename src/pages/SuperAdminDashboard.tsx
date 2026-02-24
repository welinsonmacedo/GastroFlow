
import React, { useState, useEffect } from 'react';
import { useSaaS } from '../context/SaaSContext';
import { useUI } from '../context/UIContext';
import { RestaurantTenant } from '../types';
import { Button } from '../components/Button';
import { SaaSTenantCreateModal, SaaSEditTenantModal, SaaSTenantLinksModal, ImageUploadField } from '../components/modals/SaaSModals';
import { Building2, DollarSign, Activity, Settings, Search, LogOut, Plus, List, Edit, FileText, Printer, ChevronDown, Edit3, RotateCcw, ShieldAlert, MessageCircle, Box, ImageIcon, Link as LinkIcon } from 'lucide-react';
import { PERMISSIONS_SCHEMA } from '../constants';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { PlanManager } from './admin/super/PlanManager';
import { AdminSecurity } from './admin/AdminSecurity';
import { AdminTickets } from './admin/super/AdminTickets';
import { logSecurityIncident } from '../utils/security';

type ViewMode = 'RESTAURANTS' | 'FINANCIAL' | 'PLANS' | 'SETTINGS' | 'CONTRACTS' | 'SECURITY' | 'TICKETS';

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
  const [globalThemeForm, setGlobalThemeForm] = useState(state.globalSettings);
  const [settingsTab, setSettingsTab] = useState<'PROFILE' | 'THEME'>('PROFILE');

  useEffect(() => {
    if (state.globalSettings && Object.keys(state.globalSettings).length > 0) {
      setGlobalThemeForm(state.globalSettings);
    }
  }, [state.globalSettings]);
  
  // Plans Edit State



  // Derived Metrics (Fixed MRR Calculation)
  const filteredTenants = state.tenants.filter(t => t.name.toLowerCase().includes(filter.toLowerCase()) || t.ownerName.toLowerCase().includes(filter.toLowerCase()));
  const activeTenants = state.tenants.filter(t => t.status === 'ACTIVE').length;
  
  const mrr = state.tenants.reduce((acc, t) => {
    if (t.status === 'INACTIVE') return acc;
    const plan = state.plans.find(p => p.key === t.plan);
    if (!plan) return acc;
    
    // Remove tudo que não é número ou vírgula/ponto, substitui vírgula por ponto
    const cleanPrice = plan.price.replace(/[^\d,.-]/g, '').replace(',','.');
    const price = parseFloat(cleanPrice);
    
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
      logSecurityIncident({
          type: 'SUPER_ADMIN_PROFILE_UPDATED',
          severity: 'MEDIUM',
          details: `Perfil do Super Admin atualizado: Nome=${settingsForm.name}, Email=${settingsForm.email}`
      });
      showAlert({ title: "Sucesso", message: "Perfil atualizado com sucesso!", type: 'SUCCESS' });
  };
  
  

  const selectedContractTenant = state.tenants.find(t => t.id === selectedContractTenantId);
  const selectedContractPlan = selectedContractTenant ? state.plans.find(p => p.key === selectedContractTenant.plan) : null;

  return (
    <div className="min-h-screen bg-slate-50 flex print:block print:bg-white">
       {/* Sidebar */}
       <div className="w-64 bg-slate-900 text-white p-6 sticky top-0 h-screen flex flex-col justify-between shrink-0 z-20 print:hidden">
          <div>
            <div className="text-2xl font-bold mb-10 flex items-center gap-2">
                <Activity className="text-blue-500" /> SaaS Admin
            </div>
            <nav className="space-y-2">
                <button onClick={() => setActiveView('RESTAURANTS')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeView === 'RESTAURANTS' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Building2 size={20} /> Clientes</button>
                <button onClick={() => setActiveView('CONTRACTS')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeView === 'CONTRACTS' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><FileText size={20} /> Contratos</button>
                <button onClick={() => setActiveView('FINANCIAL')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeView === 'FINANCIAL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><DollarSign size={20} /> Financeiro</button>
                <button onClick={() => setActiveView('PLANS')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeView === 'PLANS' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><List size={20} /> Planos & Preços</button>
                <button onClick={() => setActiveView('SECURITY')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeView === 'SECURITY' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><ShieldAlert size={20} /> Segurança</button>
                <button onClick={() => setActiveView('TICKETS')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeView === 'TICKETS' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><MessageCircle size={20} /> Chamados</button>
                <button onClick={() => setActiveView('SETTINGS')} className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${activeView === 'SETTINGS' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Settings size={20} /> Configurações</button>
            </nav>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 rounded text-red-400 hover:bg-slate-800 mt-auto"><LogOut size={20} /> Sair</button>
       </div>

       {/* Main Content */}
       <div className="flex-1 p-0 h-screen overflow-hidden bg-slate-100 print:h-auto print:overflow-visible print:bg-white">
           {activeView !== 'SECURITY' && activeView !== 'TICKETS' && (
                <div className="p-8 pb-0 print:hidden">
                    <header className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">
                                {activeView === 'RESTAURANTS' && 'Gerenciar Clientes'}
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
                </div>
           )}

           {activeView === 'SECURITY' && <AdminSecurity />}
           {activeView === 'TICKETS' && <AdminTickets />}

           {activeView !== 'SECURITY' && activeView !== 'TICKETS' && (
               <div className="p-8 pt-0 overflow-y-auto h-[calc(100vh-120px)] print:p-0 print:h-auto print:overflow-visible">
                    {/* --- VIEW: CONTRACTS --- */}
                    {activeView === 'CONTRACTS' && (
                        <div className="flex flex-col h-full print:block items-center">
                            <div className="bg-white p-6 rounded-xl shadow-sm border mb-6 print:hidden w-full max-w-4xl">
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
                                                    setIsEditingContract(false);
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
                                <div className="space-y-8 print:space-y-0">
                                    {/* PAGE 1 */}
                                    <div 
                                        key={`${selectedContractTenantId}-p1`}
                                        contentEditable={isEditingContract}
                                        suppressContentEditableWarning={true}
                                        className={`bg-white shadow-2xl p-[2cm] w-[21cm] min-h-[29.7cm] mx-auto text-justify text-sm leading-relaxed print:shadow-none print:w-full print:max-w-none print:mx-0 print:p-0 transition-all ${isEditingContract ? 'ring-4 ring-blue-200 outline-none cursor-text' : ''}`}
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
                                                    {selectedContractTenant.businessInfo?.address?.street ? ` localizada em ${selectedContractTenant.businessInfo.address.street}, ${selectedContractTenant.businessInfo.address.number || ''} - ${selectedContractTenant.businessInfo.address.city || ''}/${selectedContractTenant.businessInfo.address.state || ''},` : ''}
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
                                                <h3 className="font-bold uppercase mb-2 text-xs text-gray-900 border-b border-gray-300 pb-1">3. Plano e Escopo de Uso</h3>
                                                <p>
                                                    A CONTRATANTE opta pelo plano <strong>{selectedContractPlan?.name.toUpperCase() || selectedContractTenant.plan}</strong>.
                                                    A licença de software concede direito de uso das seguintes funcionalidades e limites operacionais:
                                                </p>
                                                
                                                <ul className="list-disc pl-5 my-3 text-xs space-y-1">
                                                    {(selectedContractPlan?.features || []).map((feature, idx) => (
                                                        <li key={idx}>{feature}</li>
                                                    ))}

                                                    {selectedContractPlan?.limits && (
                                                        <>
                                                            <li><strong>Capacidade de Mesas:</strong> {selectedContractPlan.limits.maxTables === -1 ? 'Ilimitada' : `${selectedContractPlan.limits.maxTables} mesas simultâneas`}</li>
                                                            <li><strong>Contas de Staff (Usuários):</strong> {selectedContractPlan.limits.maxStaff === -1 ? 'Ilimitadas' : `Até ${selectedContractPlan.limits.maxStaff} usuários`}</li>
                                                            
                                                            {/* Modules */}
                                                            <li><strong>Módulo KDS (Cozinha):</strong> {selectedContractPlan.limits.allowKds ? 'Incluso' : 'Não contratado'}</li>
                                                            <li><strong>Frente de Caixa (PDV):</strong> {selectedContractPlan.limits.allowCashier ? 'Incluso' : 'Não contratado'}</li>
                                                            <li><strong>Controle de Estoque:</strong> {selectedContractPlan.limits.allowInventory ? 'Incluso' : 'Não contratado'}</li>
                                                            <li><strong>Gestão Financeira:</strong> {selectedContractPlan.limits.allowExpenses ? 'Incluso' : 'Não contratado'}</li>
                                                            <li><strong>RH & Ponto:</strong> {selectedContractPlan.limits.allowHR ? 'Incluso' : 'Não contratado'}</li>
                                                        </>
                                                    )}
                                                </ul>
                                            </section>

                                            <section>
                                                <h3 className="font-bold uppercase mb-2 text-xs text-gray-900 border-b border-gray-300 pb-1">4. Obrigações da Contratada</h3>
                                                <p>
                                                    A CONTRATADA obriga-se a manter o software disponível por 99% do tempo mensal, prestar suporte técnico via e-mail e chat em horário comercial, e garantir a segurança e backup dos dados inseridos pela CONTRATANTE na plataforma.
                                                </p>
                                            </section>

                                            <section>
                                                <h3 className="font-bold uppercase mb-2 text-xs text-gray-900 border-b border-gray-300 pb-1">5. Obrigações da Contratante</h3>
                                                <p>
                                                    A CONTRATANTE obriga-se a utilizar o software de acordo com as leis vigentes, manter seus dados de acesso em sigilo, efetuar os pagamentos pontualmente e fornecer as informações necessárias para a correta configuração do sistema.
                                                </p>
                                            </section>
                                        </div>
                                    </div>

                                    {/* PAGE 2 */}
                                    <div 
                                        key={`${selectedContractTenantId}-p2`}
                                        contentEditable={isEditingContract}
                                        suppressContentEditableWarning={true}
                                        className={`bg-white shadow-2xl p-[2cm] w-[21cm] min-h-[29.7cm] mx-auto text-justify text-sm leading-relaxed print:shadow-none print:w-full print:max-w-none print:mx-0 print:p-0 transition-all page-break ${isEditingContract ? 'ring-4 ring-blue-200 outline-none cursor-text' : ''}`}
                                    >
                                        <div className="space-y-6">
                                            <section>
                                                <h3 className="font-bold uppercase mb-2 text-xs text-gray-900 border-b border-gray-300 pb-1">6. Pagamento e Cobrança</h3>
                                                <p>
                                                    Pela licença de uso, a CONTRATANTE pagará à CONTRATADA o valor mensal de <strong>{selectedContractPlan?.price || 'A DEFINIR'}</strong>.
                                                    Os pagamentos deverão ser efetuados via Boleto, Pix ou Cartão de Crédito até o dia 10 de cada mês. O atraso no pagamento implicará em multa de 2% e juros de 1% ao mês.
                                                </p>
                                            </section>

                                            <section>
                                                <h3 className="font-bold uppercase mb-2 text-xs text-gray-900 border-b border-gray-300 pb-1">7. Propriedade Intelectual</h3>
                                                <p>
                                                    A CONTRATADA é a única titular de todos os direitos de propriedade intelectual sobre o software Flux Eat. Este contrato concede apenas uma licença de uso, não transferindo qualquer direito de propriedade ou código-fonte à CONTRATANTE.
                                                </p>
                                            </section>

                                            <section>
                                                <h3 className="font-bold uppercase mb-2 text-xs text-gray-900 border-b border-gray-300 pb-1">8. Privacidade e LGPD</h3>
                                                <p>
                                                    As partes comprometem-se a cumprir a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). A CONTRATADA atuará como operadora dos dados inseridos pela CONTRATANTE, que é a controladora dos dados de seus clientes e funcionários.
                                                </p>
                                            </section>

                                            <section>
                                                <h3 className="font-bold uppercase mb-2 text-xs text-gray-900 border-b border-gray-300 pb-1">9. Vigência e Rescisão</h3>
                                                <p>
                                                    Este contrato entra em vigor na data de sua assinatura e vigorará por prazo indeterminado. Qualquer uma das partes poderá rescindir este contrato mediante aviso prévio de 30 (trinta) dias, sem incidência de multa, desde que não haja pendências financeiras.
                                                </p>
                                            </section>

                                            <section>
                                                <h3 className="font-bold uppercase mb-2 text-xs text-gray-900 border-b border-gray-300 pb-1">10. Disposições Gerais</h3>
                                                <p>
                                                    Qualquer alteração neste contrato deverá ser feita por termo aditivo. A tolerância de qualquer das partes quanto ao descumprimento de obrigações não importará em renúncia ou novação.
                                                </p>
                                            </section>

                                            <section>
                                                <h3 className="font-bold uppercase mb-2 text-xs text-gray-900 border-b border-gray-300 pb-1">11. Foro</h3>
                                                <p>
                                                    As partes elegem o foro da Comarca de Uberlândia/MG para dirimir quaisquer dúvidas ou controvérsias oriundas deste contrato, com exclusão de qualquer outro, por mais privilegiado que seja.
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
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 print:hidden min-h-[400px]">
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
                                <Button onClick={() => setIsCreateModalOpen(true)}> <Plus size={18} /> Novo Cliente </Button>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-gray-600 text-sm font-semibold uppercase">
                                        <tr><th className="p-4">Cliente</th><th className="p-4">Dono</th><th className="p-4">Plano</th><th className="p-4">Status</th><th className="p-4 text-right">Ações</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredTenants.map((tenant) => (
                                            <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4"><div className="font-bold text-gray-800">{tenant.name}</div><div className="text-xs text-gray-500">{tenant.slug}</div></td>
                                                <td className="p-4 text-gray-700">{tenant.ownerName}</td>
                                                <td className="p-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">{tenant.plan}</span></td>
                                                <td className="p-4">
                                                    <button 
                                                        onClick={() => {
                                                            dispatch({ type: 'TOGGLE_STATUS', tenantId: tenant.id });
                                                            logSecurityIncident({
                                                                type: 'TENANT_STATUS_CHANGED',
                                                                severity: 'CRITICAL',
                                                                details: `Status do inquilino ${tenant.name} alterado pelo painel rápido.`
                                                            });
                                                        }}
                                                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                                                    >
                                                        <div className={`w-2 h-2 rounded-full ${tenant.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                        {tenant.status === 'ACTIVE' ? 'ATIVO' : 'INATIVO'}
                                                    </button>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => openLinksModal(tenant)} className="p-2 bg-gray-100 rounded hover:bg-gray-200 text-blue-600" title="Links de Acesso"><LinkIcon size={16}/></button>
                                                        <button onClick={() => openEditModal(tenant)} className="p-2 bg-gray-100 rounded hover:bg-gray-200 text-slate-600" title="Editar / Configurar"><Edit size={16}/></button>
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
                    {activeView === 'PLANS' && <PlanManager />}

                    {/* --- VIEW: FINANCIAL --- */}
                    {activeView === 'FINANCIAL' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-green-500">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">MRR Estimado</p>
                                <p className="text-3xl font-black text-gray-800">R$ {mrr.toFixed(2)}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-blue-500">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Clientes Ativos</p>
                                <p className="text-3xl font-black text-gray-800">{activeTenants}</p>
                            </div>
                        </div>
                    )}

                    {/* --- VIEW: SETTINGS --- */}
                    {activeView === 'SETTINGS' && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div className="flex gap-4 mb-2">
                                <button 
                                    onClick={() => setSettingsTab('PROFILE')}
                                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${settingsTab === 'PROFILE' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border hover:bg-slate-50'}`}
                                >
                                    Meu Perfil
                                </button>
                                <button 
                                    onClick={() => setSettingsTab('THEME')}
                                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${settingsTab === 'THEME' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border hover:bg-slate-50'}`}
                                >
                                    Aparência Global (Default)
                                </button>
                            </div>

                            {settingsTab === 'PROFILE' ? (
                                <div className="bg-white p-8 rounded-xl shadow-sm border">
                                    <h2 className="text-2xl font-bold mb-6">Meu Perfil</h2>
                                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nome</label>
                                            <input className="w-full border p-3 rounded-lg" value={settingsForm.name} onChange={e => setSettingsForm({...settingsForm, name: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email</label>
                                            <input className="w-full border p-3 rounded-lg" value={settingsForm.email} onChange={e => setSettingsForm({...settingsForm, email: e.target.value})} />
                                        </div>
                                        <Button type="submit" className="w-full py-3">Atualizar Perfil</Button>
                                    </form>
                                </div>
                            ) : (
                                <div className="bg-white p-8 rounded-xl shadow-sm border">
                                    <h2 className="text-2xl font-bold mb-2">Aparência Global</h2>
                                    <p className="text-sm text-slate-500 mb-8">Estas configurações serão usadas como padrão para todos os restaurantes que não tiverem customização própria.</p>
                                    
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <ImageIcon size={14} /> Imagens de Fundo Padrão
                                            </h4>
                                            <ImageUploadField 
                                                label="Seletor de Módulos"
                                                value={globalThemeForm.moduleSelectorBgUrl || ''}
                                                onChange={val => setGlobalThemeForm({...globalThemeForm, moduleSelectorBgUrl: val})}
                                            />
                                            <ImageUploadField 
                                                label="Página de Login"
                                                value={globalThemeForm.loginBgUrl || ''}
                                                onChange={val => setGlobalThemeForm({...globalThemeForm, loginBgUrl: val})}
                                            />
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-500 uppercase">Cor do Box de Login</label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="color"
                                                        className="h-9 w-12 border rounded cursor-pointer" 
                                                        value={globalThemeForm.loginBoxColor || '#ffffff'} 
                                                        onChange={e => setGlobalThemeForm({...globalThemeForm, loginBoxColor: e.target.value})} 
                                                    />
                                                    <input 
                                                        className="flex-1 border p-2 rounded text-sm" 
                                                        value={globalThemeForm.loginBoxColor || '#ffffff'} 
                                                        onChange={e => setGlobalThemeForm({...globalThemeForm, loginBoxColor: e.target.value})} 
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Box size={14} /> Ícones dos Módulos Padrão
                                            </h4>
                                            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4">
                                                {Object.entries(PERMISSIONS_SCHEMA).map(([key, data]) => (
                                                    <ImageUploadField 
                                                        key={key}
                                                        label={data.label}
                                                        value={globalThemeForm.moduleIcons?.[key] || ''}
                                                        onChange={val => {
                                                            const icons = { ...(globalThemeForm.moduleIcons || {}) };
                                                            icons[key] = val;
                                                            setGlobalThemeForm({...globalThemeForm, moduleIcons: icons});
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-6 border-t">
                                        <Button 
                                            className="w-full py-3"
                                            onClick={() => dispatch({ type: 'UPDATE_GLOBAL_SETTINGS', settings: globalThemeForm })}
                                        >
                                            Salvar Configurações Globais
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
               </div>
           )}

       </div>

       {/* Modais */}
       <SaaSTenantCreateModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
       <SaaSEditTenantModal 
           isOpen={isEditModalOpen} 
           onClose={() => setIsEditModalOpen(false)} 
           tenant={selectedTenant} 
           onOpenLinks={() => {
               if (selectedTenant) {
                   setIsLinksModalOpen(true);
               }
           }}
       />
       <SaaSTenantLinksModal isOpen={isLinksModalOpen} onClose={() => setIsLinksModalOpen(false)} tenant={selectedTenant} />
    </div>
  );
};
