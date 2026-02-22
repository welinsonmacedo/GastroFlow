
import React from 'react';
// @ts-ignore
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import { useAuth } from '../context/AuthProvider';
import { 
    DollarSign, TrendingUp, FileText, PieChart, Lightbulb,
    LogOut, Grid, ChefHat
} from 'lucide-react';

// Importando Sub-páginas Financeiras
import { AdminFinance } from './admin/AdminFinance';
import { AdminAccounting } from './admin/AdminAccounting';
import { AdminBusinessIntelligence } from './admin/AdminBusinessIntelligence'; 
import { AdminReports } from './admin/AdminReports';
import { AdminFinancialTips } from './admin/AdminFinancialTips';

export const FinanceDashboard: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: authState, logout } = useAuth();
  const { planLimits, allowedFeatures } = restState;
  const location = useLocation();
  const navigate = useNavigate();

  // Definição das Abas do Módulo Financeiro com Feature Keys
  const tabs = [
    { path: '/finance', label: 'Caixa & Despesas', icon: DollarSign, exact: true, featureKeys: ['finance_expenses', 'fin_dashboard', 'fin_entries', 'fin_exits'] },
    { path: '/finance/dre', label: 'DRE Gerencial', icon: PieChart, required: 'allowReports', featureKeys: ['finance_dre', 'fin_dre'] },
    { path: '/finance/bi', label: 'Inteligência (BI)', icon: TrendingUp, required: 'allowReports', featureKeys: ['finance_bi', 'fin_bi'] },
    { path: '/finance/reports', label: 'Relatórios', icon: FileText, required: 'allowReports', featureKeys: ['finance_reports', 'fin_reports'] },
    { path: '/finance/tips', label: 'Dicas & Insights', icon: Lightbulb, required: 'allowReports', featureKeys: ['finance_tips', 'fin_tips'] },
  ];

  // Filtra abas
  const visibleTabs = tabs.filter(tab => {
      // 1. Checa Limites do Plano
      // We removed strict 'allowReports' check here because PlanManager now sets it correctly based on modules.
      // But just in case, we rely more on featureKeys.
      if (tab.required === 'allowReports' && !planLimits.allowReports) {
          // If allowReports is false, but the specific feature is enabled in allowedFeatures, we should show it.
          // This handles cases where legacy plans might have allowReports=false but new features enabled.
          if (allowedFeatures && allowedFeatures.length > 0) {
             const hasFeature = tab.featureKeys.some(key => allowedFeatures.includes(key));
             if (hasFeature) return true;
          }
          return false;
      }
      
      // 2. Checagem de features (Tenant)
      if (allowedFeatures && allowedFeatures.length > 0) {
          const hasFeature = tab.featureKeys.some(key => allowedFeatures.includes(key));
          if (!hasFeature) return false;
      }

      // 3. Permissões do Usuário (Cargos Personalizados)
      if (authState.currentUser?.role !== 'ADMIN' && authState.currentUser?.customRoleId) {
          const userFeatures = authState.currentUser.allowedFeatures || [];
          const hasUserFeature = tab.featureKeys.some(key => userFeatures.includes(key));
          if (!hasUserFeature) return false;
      }

      return true;
  });

  const handleExitToModules = () => {
      navigate('/modules');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
        
        {/* TOP BAR / HEADER */}
        <header className="bg-emerald-900 text-white shadow-lg shrink-0 z-30">
            <div className="max-w-[1920px] mx-auto">
                
                {/* Linha Superior */}
                <div className="px-6 py-4 flex justify-between items-center border-b border-emerald-800">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/10">
                            {restState.theme.logoUrl ? (
                                <img src={restState.theme.logoUrl} className="h-8 w-8 object-contain" />
                            ) : (
                                <ChefHat size={24} />
                            )}
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-none tracking-tight">{restState.theme.restaurantName}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold bg-emerald-600 px-2 py-0.5 rounded text-white uppercase tracking-widest">
                                    Módulo Financeiro
                                </span>
                                <span className="text-[10px] text-emerald-200">
                                    {authState.currentUser?.name}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleExitToModules}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-800 hover:bg-emerald-700 transition-colors border border-emerald-700"
                        >
                            <Grid size={16} /> Módulos
                        </button>
                        <button 
                            onClick={logout}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white transition-colors border border-red-500/20 hover:border-red-500"
                        >
                            <LogOut size={16} /> Sair
                        </button>
                    </div>
                </div>

                {/* Linha Inferior */}
                <div className="px-6 flex gap-1 overflow-x-auto scrollbar-hide pt-2">
                    {visibleTabs.map(tab => {
                        const isActive = tab.exact 
                            ? location.pathname === tab.path 
                            : location.pathname.startsWith(tab.path);
                        
                        return (
                            <Link 
                                key={tab.path}
                                to={tab.path}
                                className={`
                                    flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap
                                    ${isActive 
                                        ? 'border-emerald-400 text-white bg-white/5 rounded-t-lg' 
                                        : 'border-transparent text-emerald-200 hover:text-white hover:bg-white/5 rounded-t-lg'}
                                `}
                            >
                                <tab.icon size={18} className={isActive ? 'text-emerald-300' : ''} />
                                {tab.label}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </header>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="flex-1 overflow-y-auto bg-gray-50 relative p-4 md:p-8">
            <div className="max-w-[1920px] mx-auto h-full">
                <Routes>
                    <Route path="/" element={<AdminFinance />} />
                    
                    {planLimits.allowReports && (
                        <>
                            <Route path="dre" element={<AdminAccounting />} />
                            <Route path="bi" element={<AdminBusinessIntelligence />} />
                            <Route path="reports" element={<AdminReports />} />
                            <Route path="tips" element={<AdminFinancialTips />} />
                        </>
                    )}

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="" replace />} />
                </Routes>
            </div>
        </main>
    </div>
  );
};
