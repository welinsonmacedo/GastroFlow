
import React, { useState } from 'react';
import { useSaaS } from '../context/SaaSContext';
import { useUI } from '../context/UIContext';
import { RestaurantTenant } from '../types';
import { SaaSTenantCreateModal, SaaSEditTenantModal, SaaSTenantLinksModal } from '../components/modals/SaaSModals';
import { Building2, DollarSign, Activity, Settings, LogOut, FileText, List } from 'lucide-react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';

// Importação dos Componentes Modulares
import { SaaSRestaurantsView } from '../components/saas/SaaSRestaurantsView';
import { SaaSPlansView } from '../components/saas/SaaSPlansView';
import { SaaSFinancialView } from '../components/saas/SaaSFinancialView';
import { SaaSContractsView } from '../components/saas/SaaSContractsView';
import { SaaSSettingsView } from '../components/saas/SaaSSettingsView';

type ViewMode = 'RESTAURANTS' | 'FINANCIAL' | 'PLANS' | 'SETTINGS' | 'CONTRACTS';

export const SuperAdminDashboard: React.FC = () => {
  const { state, dispatch } = useSaaS();
  const { showConfirm } = useUI();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ViewMode>('RESTAURANTS');
  
  // Modal States (Mantidos no pai para facilitar o controle global)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<RestaurantTenant | null>(null);

  const activeTenants = state.tenants.filter(t => t.status === 'ACTIVE').length;

  const handleLogout = () => {
      showConfirm({
          title: "Sair do Painel?", message: "Você precisará fazer login novamente.", type: 'WARNING', confirmText: "Sair",
          onConfirm: () => { dispatch({ type: 'LOGOUT_ADMIN' }); navigate('/'); }
      });
  };

  // Handlers passados para os componentes filhos
  const openEditModal = (tenant: RestaurantTenant) => { setSelectedTenant(tenant); setIsEditModalOpen(true); };
  const openLinksModal = (tenant: RestaurantTenant) => { setSelectedTenant(tenant); setIsLinksModalOpen(true); };

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

           {/* --- RENDERIZAÇÃO CONDICIONAL DOS COMPONENTES --- */}

           {activeView === 'RESTAURANTS' && (
               <SaaSRestaurantsView 
                    onOpenCreate={() => setIsCreateModalOpen(true)}
                    onOpenEdit={openEditModal}
                    onOpenLinks={openLinksModal}
               />
           )}

           {activeView === 'CONTRACTS' && <SaaSContractsView />}

           {activeView === 'PLANS' && <SaaSPlansView />}

           {activeView === 'FINANCIAL' && <SaaSFinancialView />}

           {activeView === 'SETTINGS' && <SaaSSettingsView />}

       </div>

       {/* Modais Globais */}
       <SaaSTenantCreateModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
       <SaaSEditTenantModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} tenant={selectedTenant} />
       <SaaSTenantLinksModal isOpen={isLinksModalOpen} onClose={() => setIsLinksModalOpen(false)} tenant={selectedTenant} />
    </div>
  );
};
