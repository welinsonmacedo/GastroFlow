
import React from 'react';
// @ts-ignore
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import { useAuth } from '../context/AuthProvider';
import { 
    Palette, Users, SlidersHorizontal, LogOut, Grid, ChefHat, 
    Building2, Bike, DollarSign, ShieldCheck, FileText, Settings, Clock
} from 'lucide-react';

// Importando Sub-páginas
import { AdminSettings } from './admin/AdminSettings';
import { AdminMenuAppearance } from './admin/AdminMenuAppearance'; 
import { AdminStaff } from './admin/AdminStaff';

export const SettingsDashboard: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: authState, logout } = useAuth();
  const { planLimits, allowedFeatures } = restState;
  const location = useLocation();
  const navigate = useNavigate();

  // Definição das Abas do Módulo Configurações (Agora separadas)
  const tabs = [
    { path: '/settings', label: 'Dados da Empresa', icon: Building2, exact: true, featureKeys: ['config_business', 'config_general'] },
    { path: '/settings/operations', label: 'Regras & Operação', icon: SlidersHorizontal, featureKeys: ['config_operations', 'config_general'] },
    { path: '/settings/delivery', label: 'Delivery', icon: Bike, required: 'allowCashier', featureKeys: ['config_delivery', 'config_general'] },
    { path: '/settings/finance-config', label: 'Financeiro', icon: DollarSign, required: 'allowExpenses', featureKeys: ['config_finance_settings', 'config_general'] },
    { path: '/settings/security', label: 'Segurança', icon: ShieldCheck, featureKeys: ['config_security', 'config_general'] },
    { path: '/settings/time-clock', label: 'Ponto Eletrônico', icon: Clock, required: 'allowHR', featureKeys: ['config_operations', 'config_general'] },
    { path: '/settings/appearance', label: 'Aparência & Marca', icon: Palette, required: 'allowCustomization', featureKeys: ['config_appearance', 'config_general'] },
    { path: '/settings/staff', label: 'Equipe & Acessos', icon: Users, required: 'allowStaff', featureKeys: ['config_staff', 'config_general'] },
  ];

  // Filtra abas
  const visibleTabs = tabs.filter(tab => {
      // 1. Checa Limites do Plano
      if (tab.required === 'allowCustomization' && !planLimits.allowCustomization) return false;
      if (tab.required === 'allowStaff' && !planLimits.allowStaff) return false;
      if (tab.required === 'allowCashier' && !planLimits.allowCashier) return false;
      if (tab.required === 'allowExpenses' && !planLimits.allowExpenses && !planLimits.allowCashier) return false; // Finance config needed for cashier too
      
      // 2. Checa Features Granulares (Tenant)
      if (allowedFeatures && allowedFeatures.length > 0) {
          const hasFeature = tab.featureKeys.some(key => allowedFeatures.includes(key));
          if (!hasFeature) return false;
      }

      // 3. Permissões do Usuário (Cargos Personalizados)
      if (authState.currentUser?.role !== 'ADMIN' && authState.currentUser?.customRoleId) {
          const userFeatures = authState.currentUser.allowedFeatures || [];
          if (userFeatures.length > 0) {
              const hasUserFeature = tab.featureKeys.some(key => userFeatures.includes(key));
              if (!hasUserFeature) return false;
          }
      }

      return true;
  });

  const handleExitToModules = () => {
      navigate('/modules');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
        
        {/* TOP BAR / HEADER */}
        <header className="bg-slate-900 text-white shadow-lg shrink-0 z-30">
            <div className="max-w-[1920px] mx-auto">
                
                {/* Linha Superior */}
                <div className="px-6 py-4 flex justify-between items-center border-b border-slate-800">
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
                                <span className="text-[10px] font-bold bg-gray-600 px-2 py-0.5 rounded text-white uppercase tracking-widest">
                                    Configurações
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    {authState.currentUser?.name}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleExitToModules}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
                        >
                            <Grid size={16} /> Módulos
                        </button>
                        <button 
                            onClick={logout}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors border border-red-500/20 hover:border-red-500"
                        >
                            <LogOut size={16} /> Sair
                        </button>
                    </div>
                </div>

                {/* Linha Inferior (Abas) */}
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
                                        ? 'border-gray-400 text-white bg-white/5 rounded-t-lg' 
                                        : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5 rounded-t-lg'}
                                `}
                            >
                                <tab.icon size={18} className={isActive ? 'text-gray-300' : ''} />
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
                    {/* Renderiza o AdminSettings passando a view correta via props */}
                    <Route path="/" element={<AdminSettings view="BUSINESS" />} />
                    <Route path="operations" element={<AdminSettings view="RULES" />} />
                    <Route path="delivery" element={<AdminSettings view="DELIVERY" />} />
                    <Route path="finance-config" element={<AdminSettings view="FINANCE_CONFIG" />} />
                    <Route path="security" element={<AdminSettings view="SECURITY" />} />
                    <Route path="time-clock" element={<AdminSettings view="TIME_CLOCK" />} />
                    
                    {planLimits.allowCustomization && <Route path="appearance" element={<AdminMenuAppearance />} />}
                    {planLimits.allowStaff && <Route path="staff" element={<AdminStaff />} />}

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="" replace />} />
                </Routes>
            </div>
        </main>
    </div>
  );
};
