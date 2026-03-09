
import React from 'react';
// @ts-ignore
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import { useAuth } from '../context/AuthProvider';
import { 
    LayoutDashboard, Utensils, QrCode, Activity,
    LogOut, Grid, ChefHat, BookOpen, Package
} from 'lucide-react';

// Importando Sub-páginas
import { AdminOverview } from './admin/AdminOverview';
import { AdminProducts } from './admin/AdminProducts';
import { AdminTables } from './admin/AdminTables';
import { AdminMonitoring } from './admin/AdminMonitoring';
import { AdminInventory } from './admin/AdminInventory';

export const AdminDashboard: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: authState, logout } = useAuth();
  const { planLimits } = restState;
  const location = useLocation();
  const navigate = useNavigate();

  // Definição das Abas do Gestor
  const tabs = [
    { path: '/admin', label: 'VISAO GERAL', icon: LayoutDashboard, exact: true, featureKeys: ['admin_overview'] },
    { path: '/admin/monitoring', label: 'MONITORAMENTO', icon: Activity, featureKeys: ['admin_monitoring'] }, 
    { path: '/admin/products', label: 'PRODUTOS', icon: Utensils, featureKeys: ['admin_products'] },
    { path: '/admin/inventory', label: 'ESTOQUE', icon: Package, featureKeys: ['admin_inventory'] },
    { path: '/admin/tables', label: 'MESAS & QR CODES', icon: QrCode, featureKeys: ['admin_tables'], required: 'allowTableMgmt' },
  ];

  // Filtra abas
  const visibleTabs = tabs.filter(tab => {
      // 1. Checa Limites do Plano
      if (tab.required === 'allowTableMgmt' && !planLimits.allowTableMgmt) return false;
      
      // 2. Checagem de features granulares (Tenant)
      if (restState.allowedFeatures && restState.allowedFeatures.length > 0) {
          const hasFeature = tab.featureKeys.some(key => restState.allowedFeatures!.includes(key));
          if (!hasFeature) return false;
      }

      // 3. Permissões do Usuário (Cargos Personalizados)
      if (authState.currentUser?.role !== 'ADMIN' && authState.currentUser?.customRoleId) {
          const userFeatures = authState.currentUser.allowedFeatures || [];
          // Se o usuário tem features definidas, ele PRECISA ter a feature da aba
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
                                <span className="text-[10px] font-bold bg-purple-600 px-2 py-0.5 rounded text-white uppercase tracking-widest">
                                    Módulo Gestor
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    {authState.currentUser?.name}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link 
                            to="/manual"
                            target="_blank"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors border border-blue-500/20 hover:border-blue-500"
                        >
                            <BookOpen size={16} /> Ajuda
                        </Link>
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
                                        ? 'border-purple-500 text-white bg-white/5 rounded-t-lg' 
                                        : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5 rounded-t-lg'}
                                `}
                            >
                                <tab.icon size={18} className={isActive ? 'text-purple-400' : ''} />
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
                    <Route path="/" element={<AdminOverview />} />
                    <Route path="monitoring" element={<AdminMonitoring />} />
                    <Route path="products" element={<AdminProducts />} />
                    <Route path="inventory" element={<AdminInventory />} />
                    <Route path="tables" element={<AdminTables />} />
                    
                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="" replace />} />
                </Routes>
            </div>
        </main>
    </div>
  );
};
