
import React, { useEffect } from 'react';
// @ts-ignore
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import { useAuth } from '../context/AuthProvider';
import { 
    DollarSign, ShoppingCart, BarChart3,
    LogOut, Grid, Store, Lock, History, Truck
} from 'lucide-react';
import { Role } from '../types';

// Importando Sub-páginas
import { AdminFinance } from './admin/AdminFinance';
import { AdminReports } from './admin/AdminReports';
import { CommercePOS } from './commerce/CommercePOS';
import { CommerceHistoryView } from './commerce/CommerceHistoryView';

export const CommerceDashboard: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: authState, logout } = useAuth();
  const { planLimits, allowedFeatures } = restState;
  const location = useLocation();
  const navigate = useNavigate();

  const userRole = authState.currentUser?.role;

  // Definição das Abas
  const tabs = [
    { 
        path: '/commerce/pos', 
        label: 'PDV (Caixa)', 
        icon: ShoppingCart, 
        roles: [Role.ADMIN, Role.CASHIER],
        required: 'allowCashier',
        featureKeys: ['commerce_pos', 'distributor_sales', 'snackbar_pos']
    },
    { 
        path: '/commerce/history', 
        label: 'Histórico', 
        icon: History, 
        roles: [Role.ADMIN, Role.CASHIER],
        required: 'allowCashier',
        featureKeys: ['commerce_pos', 'distributor_sales', 'snackbar_pos']
    },
    { 
        path: '/commerce/routes', 
        label: 'Rotas', 
        icon: Truck, 
        roles: [Role.ADMIN],
        required: null,
        featureKeys: ['distributor_routes']
    },


  ];

  // Filtra abas
  const visibleTabs = tabs.filter(tab => {
      // 1. Plano
      if (tab.required === 'allowCashier' && !planLimits.allowCashier) return false;
      if (tab.required === 'allowExpenses' && !planLimits.allowExpenses) return false;
      if (tab.required === 'allowReports' && !planLimits.allowReports) return false;
      
      // 2. Features Granulares (Tenant + User)
      if (allowedFeatures && allowedFeatures.length > 0) {
          const hasTenantFeature = tab.featureKeys.some(key => allowedFeatures.includes(key));
          if (!hasTenantFeature) return false;
      }

      // 3. Permissões do Usuário (Cargos Personalizados)
      if (authState.currentUser?.role !== 'ADMIN' && authState.currentUser?.customRoleId) {
          const userFeatures = authState.currentUser.allowedFeatures || [];
          const hasUserFeature = tab.featureKeys.some(key => userFeatures.includes(key));
          if (!hasUserFeature) return false;
          
          // Se o usuário tem um cargo personalizado e a feature está permitida, 
          // ignoramos o check de Role fixo abaixo.
          return true;
      }
      
      // 4. Permissão Usuário (Role)
      if (userRole === Role.ADMIN) return true;
      if (tab.roles && userRole && !tab.roles.includes(userRole)) return false;
      
      return true;
  });

  // Redireciona
  useEffect(() => {
      if (location.pathname === '/commerce' && visibleTabs.length > 0) {
          navigate(visibleTabs[0].path, { replace: true });
      }
  }, [location.pathname, visibleTabs, navigate]);

  const handleExitToModules = () => {
      navigate('/modules');
  };

  if (visibleTabs.length === 0) {
      return (
          <div className="h-screen flex flex-col items-center justify-center text-slate-500 bg-gray-50">
              <Lock size={48} className="mb-4 text-indigo-500"/>
              <h2 className="text-xl font-bold">Acesso Restrito</h2>
              <p>Você não tem permissão para acessar nenhuma função deste módulo.</p>
              <button onClick={handleExitToModules} className="mt-4 text-indigo-600 underline">Voltar</button>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
        
        {/* TOP BAR / HEADER */}
        <header className="bg-indigo-700 text-white shadow-lg shrink-0 z-30">
            <div className="max-w-[1920px] mx-auto">
                
                {/* Linha Superior */}
                <div className="px-6 py-4 flex justify-between items-center border-b border-indigo-600">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/10">
                            {restState.theme.logoUrl ? (
                                <img src={restState.theme.logoUrl} className="h-8 w-8 object-contain" />
                            ) : (
                                <Store size={24} />
                            )}
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-none tracking-tight">{restState.theme.restaurantName}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded text-white uppercase tracking-widest">
                                    Varejo / Comércio
                                </span>
                                <span className="text-[10px] text-indigo-100">
                                    {authState.currentUser?.name}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleExitToModules}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-800 hover:bg-indigo-600 transition-colors border border-indigo-600"
                        >
                            <Grid size={16} /> Módulos
                        </button>
                        <button 
                            onClick={logout}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-red-500/20 text-red-100 hover:bg-red-500 hover:text-white transition-colors border border-red-500/20 hover:border-red-500"
                        >
                            <LogOut size={16} /> Sair
                        </button>
                    </div>
                </div>

                {/* Linha Inferior */}
                <div className="px-6 flex gap-1 overflow-x-auto scrollbar-hide pt-2">
                    {visibleTabs.map(tab => {
                        const isActive = location.pathname.startsWith(tab.path);
                        
                        return (
                            <Link 
                                key={tab.path}
                                to={tab.path}
                                className={`
                                    flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap
                                    ${isActive 
                                        ? 'border-white text-white bg-white/10 rounded-t-lg' 
                                        : 'border-transparent text-indigo-200 hover:text-white hover:bg-white/5 rounded-t-lg'}
                                `}
                            >
                                <tab.icon size={18} className={isActive ? 'text-white' : 'text-indigo-300'} />
                                {tab.label}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </header>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="flex-1 overflow-hidden bg-gray-50 relative">
            <div className="h-full w-full">
                <Routes>
                    <Route path="pos" element={<div className="h-full p-4 md:p-6"><CommercePOS /></div>} />
                    <Route path="history" element={<div className="h-full p-4 md:p-6 overflow-y-auto"><CommerceHistoryView /></div>} />
                    <Route path="routes" element={<div className="h-full flex items-center justify-center text-2xl font-bold text-gray-400">Gestão de Rotas (Em Breve)</div>} />
                    
                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="pos" replace />} />
                </Routes>
            </div>
        </main>
    </div>
  );
};
