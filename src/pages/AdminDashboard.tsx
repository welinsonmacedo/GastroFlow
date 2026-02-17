
import React from 'react';
// @ts-ignore
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import { useAuth } from '../context/AuthProvider';
import { 
    LayoutDashboard, Utensils, Package, QrCode, Palette, 
    DollarSign, TrendingUp, FileText, Settings, 
    LogOut, Grid, User as UserIcon, ChefHat
} from 'lucide-react';

// Importando Sub-páginas
import { AdminOverview } from './admin/AdminOverview';
import { AdminProducts } from './admin/AdminProducts';
import { AdminInventory } from './admin/AdminInventory';
import { AdminTables } from './admin/AdminTables';
import { AdminFinance } from './admin/AdminFinance';
import { AdminSettings } from './admin/AdminSettings';
import { AdminMenuAppearance } from './admin/AdminMenuAppearance'; 
import { AdminAccounting } from './admin/AdminAccounting';
import { AccountingReport } from './admin/AccountingReport'; 
import { AdminFinancialTips } from './admin/AdminFinancialTips';
import { AdminBusinessIntelligence } from './admin/AdminBusinessIntelligence'; 
import { AdminReports } from './admin/AdminReports';

export const AdminDashboard: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: authState, logout } = useAuth();
  const { planLimits } = restState;
  const location = useLocation();
  const navigate = useNavigate();

  // Definição das Abas do Gestor
  const tabs = [
    { path: '/admin', label: 'Visão Geral', icon: LayoutDashboard, exact: true },
    { path: '/admin/products', label: 'Cardápio', icon: Utensils },
    { path: '/admin/tables', label: 'Mesas & QR', icon: QrCode, required: 'allowTableMgmt' },
    { path: '/admin/inventory', label: 'Estoque', icon: Package, required: 'allowInventory' },
    { path: '/admin/finance', label: 'Financeiro', icon: DollarSign, required: 'allowExpenses' }, // Inclui compras/despesas
    { path: '/admin/bi', label: 'Inteligência', icon: TrendingUp, required: 'allowReports' },
    { path: '/admin/reports', label: 'Relatórios', icon: FileText, required: 'allowReports' },
    { path: '/admin/appearance', label: 'Aparência', icon: Palette, required: 'allowCustomization' },
    { path: '/admin/settings', label: 'Configurações', icon: Settings },
  ];

  // Filtra abas baseadas no plano
  const visibleTabs = tabs.filter(tab => {
      if (tab.required === 'allowTableMgmt' && !planLimits.allowTableMgmt) return false;
      if (tab.required === 'allowInventory' && !planLimits.allowInventory) return false;
      if (tab.required === 'allowExpenses' && (!planLimits.allowExpenses && !planLimits.allowPurchases)) return false;
      if (tab.required === 'allowReports' && !planLimits.allowReports) return false;
      if (tab.required === 'allowCustomization' && !planLimits.allowCustomization) return false;
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
                
                {/* Linha Superior: Identidade e Ações */}
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
                                <span className="text-[10px] font-bold bg-blue-600 px-2 py-0.5 rounded text-white uppercase tracking-widest">
                                    Módulo Gestor
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

                {/* Linha Inferior: Abas de Navegação */}
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
                                        ? 'border-blue-500 text-white bg-white/5 rounded-t-lg' 
                                        : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5 rounded-t-lg'}
                                `}
                            >
                                <tab.icon size={18} className={isActive ? 'text-blue-400' : ''} />
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
                    <Route path="products" element={<AdminProducts />} />
                    
                    {planLimits.allowInventory && (
                        <Route path="inventory" element={<AdminInventory />} />
                    )}

                    {planLimits.allowTableMgmt && <Route path="tables" element={<AdminTables />} />}
                    
                    {/* Rota unificada de Financeiro */}
                    {(planLimits.allowExpenses || planLimits.allowPurchases || planLimits.allowReports) && (
                        <Route path="finance" element={<AdminFinance />} />
                    )}
                    
                    {/* BI */}
                    {planLimits.allowReports && (
                        <Route path="bi" element={<AdminBusinessIntelligence />} />
                    )}

                    {/* Relatórios Completos */}
                    {planLimits.allowReports && (
                        <Route path="reports" element={<AdminReports />} />
                    )}
                    
                    {/* Rotas Auxiliares (mantidas para compatibilidade interna) */}
                    {planLimits.allowReports && (
                        <>
                            <Route path="accounting" element={<AdminAccounting />} />
                            <Route path="report" element={<AccountingReport />} /> 
                            <Route path="tips" element={<AdminFinancialTips />} />
                        </>
                    )}

                    {/* Configurações */}
                    {planLimits.allowCustomization && <Route path="appearance" element={<AdminMenuAppearance />} />}
                    <Route path="settings" element={<AdminSettings />} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="" replace />} />
                </Routes>
            </div>
        </main>
    </div>
  );
};
