
import React, { useEffect } from 'react';
// @ts-ignore
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import { useAuth } from '../context/AuthProvider';
import { 
    Coffee, Monitor, DollarSign, LogOut, Grid, ChefHat, Lock,
    QrCode, Utensils, Palette
} from 'lucide-react';
import { Role } from '../types';

// Importando Apps Operacionais
import { WaiterApp } from './WaiterApp';
import { KitchenDisplay } from './KitchenDisplay';
import { CashierDashboard } from './CashierDashboard';

// Importando Componentes de Gestão (Reutilizados do Admin)
import { AdminTables } from './admin/AdminTables';
import { AdminProducts } from './admin/AdminProducts';
import { AdminMenuAppearance } from './admin/AdminMenuAppearance';

export const RestaurantDashboard: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: authState, logout } = useAuth();
  const { planLimits, allowedFeatures } = restState; // Pega features
  const location = useLocation();
  const navigate = useNavigate();

  const userRole = authState.currentUser?.role;

  // Definição das Abas Operacionais com Feature Key
  const tabs = [
    { 
        path: '/restaurant/waiter', 
        label: 'Salão & Mesas', 
        icon: Coffee, 
        roles: [Role.ADMIN, Role.WAITER, Role.CASHIER], 
        required: null,
        featureKeys: ['restaurant_waiter']
    },
    { 
        path: '/restaurant/kitchen', 
        label: 'Cozinha (KDS)', 
        icon: Monitor, 
        roles: [Role.ADMIN, Role.KITCHEN],
        required: 'allowKds',
        featureKeys: ['restaurant_kds', 'snackbar_kds']
    },
    { 
        path: '/restaurant/cashier', 
        label: 'Caixa & Delivery', 
        icon: DollarSign, 
        roles: [Role.ADMIN, Role.CASHIER],
        required: 'allowCashier',
        featureKeys: ['restaurant_cashier', 'snackbar_pos']
    },
    { 
        path: '/restaurant/panel', 
        label: 'Painel TV', 
        icon: Monitor, 
        roles: [Role.ADMIN, Role.WAITER, Role.CASHIER],
        required: null,
        featureKeys: ['snackbar_call_panel']
    },
    // Novas Abas Adicionadas
    { 
        path: '/restaurant/tables', 
        label: 'Cadastro Mesas', 
        icon: QrCode, 
        roles: [Role.ADMIN],
        required: 'allowTableMgmt',
        featureKeys: ['admin_tables']
    },
    { 
        path: '/restaurant/menu', 
        label: 'Cardápio', 
        icon: Utensils, 
        roles: [Role.ADMIN],
        required: null,
        featureKeys: ['admin_products']
    },
    { 
        path: '/restaurant/appearance', 
        label: 'Aparência', 
        icon: Palette, 
        roles: [Role.ADMIN],
        required: 'allowCustomization',
        featureKeys: ['config_appearance']
    },
  ];

  // Filtra abas
  const visibleTabs = tabs.filter(tab => {
      // 1. Checa Limites do Plano
      if (tab.required === 'allowKds' && !planLimits.allowKds) return false;
      if (tab.required === 'allowCashier' && !planLimits.allowCashier) return false;
      if (tab.required === 'allowTableMgmt' && !planLimits.allowTableMgmt) return false;
      if (tab.required === 'allowCustomization' && !planLimits.allowCustomization) return false;
      
      // 2. Checa Features Granulares (Tenant + User)
      /* 
      // Desabilitado temporariamente para evitar conflitos com planos mal configurados
      if (allowedFeatures && allowedFeatures.length > 0) {
          const hasTenantFeature = tab.featureKeys.some(key => allowedFeatures.includes(key));
          if (!hasTenantFeature) return false;
      }
      */

      // 3. Permissões do Usuário (Cargos Personalizados)
      if (authState.currentUser?.role !== 'ADMIN' && authState.currentUser?.customRoleId) {
          const userFeatures = authState.currentUser.allowedFeatures || [];
          const hasUserFeature = tab.featureKeys.some(key => userFeatures.includes(key));
          if (!hasUserFeature) return false;
          
          // Se o usuário tem um cargo personalizado e a feature está permitida, 
          // ignoramos o check de Role fixo abaixo.
          return true;
      }
      
      // 4. Checa Permissão do Usuário (Role)
      if (userRole === Role.ADMIN) return true; 
      if (tab.roles && userRole && !tab.roles.includes(userRole)) return false;
      
      return true;
  });

  // Redireciona
  useEffect(() => {
      if (location.pathname === '/restaurant' && visibleTabs.length > 0) {
          navigate(visibleTabs[0].path, { replace: true });
      }
  }, [location.pathname, visibleTabs, navigate]);

  const handleExitToModules = () => {
      navigate('/modules');
  };

  if (visibleTabs.length === 0) {
      return (
          <div className="h-screen flex flex-col items-center justify-center text-slate-500 bg-gray-50">
              <Lock size={48} className="mb-4 text-red-500"/>
              <h2 className="text-xl font-bold">Acesso Restrito</h2>
              <p>Você não tem permissão para acessar nenhuma função deste módulo.</p>
              <button onClick={handleExitToModules} className="mt-4 text-blue-600 underline">Voltar</button>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
        
        {/* TOP BAR / HEADER */}
        <header className="bg-blue-700 text-white shadow-lg shrink-0 z-30">
            <div className="max-w-[1920px] mx-auto">
                <div className="px-6 py-4 flex justify-between items-center border-b border-blue-600">
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
                                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded text-white uppercase tracking-widest">
                                    Módulo Restaurante
                                </span>
                                <span className="text-[10px] text-blue-100">
                                    {authState.currentUser?.name}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleExitToModules}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-blue-800 hover:bg-blue-600 transition-colors border border-blue-600"
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
                                        : 'border-transparent text-blue-200 hover:text-white hover:bg-white/5 rounded-t-lg'}
                                `}
                            >
                                <tab.icon size={18} className={isActive ? 'text-white' : 'text-blue-300'} />
                                {tab.label}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </header>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="flex-1 overflow-y-auto bg-gray-50 relative p-4 md:p-8">
            <div className="h-full w-full max-w-[1920px] mx-auto">
                <Routes>
                    <Route path="waiter" element={<WaiterApp />} />
                    
                    {planLimits.allowKds && (
                        <Route path="kitchen" element={<KitchenDisplay />} />
                    )}

                    {planLimits.allowCashier && (
                        <Route path="cashier" element={<CashierDashboard />} />
                    )}

                    <Route path="panel" element={<div className="h-full flex items-center justify-center text-2xl font-bold text-gray-400">Painel de Chamada (Em Breve)</div>} />

                    {/* Novas Rotas para Admin dentro do Módulo Restaurante */}
                    {planLimits.allowTableMgmt && (
                        <Route path="tables" element={<AdminTables />} />
                    )}

                    <Route path="menu" element={<AdminProducts />} />
                    
                    {planLimits.allowCustomization && (
                        <Route path="appearance" element={<AdminMenuAppearance />} />
                    )}

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="waiter" replace />} />
                </Routes>
            </div>
        </main>
    </div>
  );
};
