
import React from 'react';
// @ts-ignore
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import { useAuth } from '../context/AuthProvider';
import { 
    Package, ShoppingCart, Truck, LogOut, Grid, ChefHat, 
    ClipboardList, Archive, PlusCircle, FileInput, Scale
} from 'lucide-react';

// Importando Sub-páginas de Estoque
import { AdminInventory } from './admin/AdminInventory';
import { AdminPurchaseSuggestions } from './admin/AdminPurchaseSuggestions';

export const InventoryDashboard: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: authState, logout } = useAuth();
  const { planLimits, allowedFeatures } = restState;
  const location = useLocation();
  const navigate = useNavigate();

  // Definição das Abas do Módulo Estoque
  const tabs = [
    { path: '/inventory', label: 'Itens', icon: Package, exact: true, featureKeys: ['inventory_manage', 'distributor_inventory'] },
    { path: '/inventory/new', label: 'Novo Item', icon: PlusCircle, featureKeys: ['inventory_manage', 'distributor_inventory'] },
    { path: '/inventory/entry', label: 'Entrada Nota', icon: FileInput, featureKeys: ['inventory_purchases'] },
    { path: '/inventory/count', label: 'Balanço', icon: Scale, featureKeys: ['inventory_manage', 'distributor_inventory'] },
    { path: '/inventory/purchases', label: 'Sugestões', icon: ShoppingCart, featureKeys: ['inventory_purchases'] },
    { path: '/inventory/suppliers', label: 'Fornecedores', icon: Truck, featureKeys: ['inventory_suppliers'] },
    { path: '/inventory/logs', label: 'Logs', icon: ClipboardList, featureKeys: ['inventory_manage', 'distributor_inventory'] },
  ];

  // Filtra abas
  const visibleTabs = tabs.filter(tab => {
      // 1. Checa Limites do Plano
      if (!planLimits.allowInventory) return false;
      
      // 2. Checa Features Granulares (Tenant)
      if (allowedFeatures && allowedFeatures.length > 0) {
          const hasTenantFeature = tab.featureKeys.some(key => allowedFeatures.includes(key));
          if (!hasTenantFeature) return false;
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
        <header className="bg-orange-900 text-white shadow-lg shrink-0 z-30">
            <div className="max-w-[1920px] mx-auto">
                
                {/* Linha Superior */}
                <div className="px-6 py-4 flex justify-between items-center border-b border-orange-800">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/10">
                            {restState.theme.logoUrl ? (
                                <img src={restState.theme.logoUrl} className="h-8 w-8 object-contain" />
                            ) : (
                                <Archive size={24} />
                            )}
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-none tracking-tight">{restState.theme.restaurantName}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold bg-orange-600 px-2 py-0.5 rounded text-white uppercase tracking-widest">
                                    Módulo Estoque
                                </span>
                                <span className="text-[10px] text-orange-200">
                                    {authState.currentUser?.name}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleExitToModules}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-orange-800 hover:bg-orange-700 transition-colors border border-orange-700"
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
                                        ? 'border-orange-400 text-white bg-white/5 rounded-t-lg' 
                                        : 'border-transparent text-orange-200 hover:text-white hover:bg-white/5 rounded-t-lg'}
                                `}
                            >
                                <tab.icon size={18} className={isActive ? 'text-orange-300' : ''} />
                                {tab.label}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </header>

        {/* CONTEÚDO PRINCIPAL - Alterado para overflow-hidden para garantir h-full real */}
        <main className="flex-1 overflow-hidden bg-gray-50 relative p-4 md:p-8">
            <div className="max-w-[1920px] mx-auto h-full">
                <Routes>
                    <Route path="/" element={<AdminInventory view="ITEMS" />} />
                    <Route path="new" element={<AdminInventory view="NEW_ITEM" />} />
                    <Route path="entry" element={<AdminInventory view="ENTRY" />} />
                    <Route path="count" element={<AdminInventory view="COUNT" />} />
                    <Route path="suppliers" element={<AdminInventory view="SUPPLIERS" />} />
                    <Route path="logs" element={<AdminInventory view="LOGS" />} />
                    
                    <Route path="purchases" element={<AdminPurchaseSuggestions />} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="" replace />} />
                </Routes>
            </div>
        </main>
    </div>
  );
};
