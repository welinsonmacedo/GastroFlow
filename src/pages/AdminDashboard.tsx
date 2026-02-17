
import React, { useState } from 'react';
// @ts-ignore
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import { useAuth } from '../context/AuthProvider';
import { useUI } from '../context/UIContext';
import { Role } from '../types';
import { 
    ChefHat, Coffee, Monitor, DollarSign, Settings, LogOut, User as UserIcon, 
    Menu, LayoutDashboard, Utensils, Package, QrCode, Palette, 
    ChevronDown, ChevronUp, ShoppingCart, Smartphone
} from 'lucide-react';

// Importando Sub-páginas
import { AdminOverview } from './admin/AdminOverview';
import { AdminProducts } from './admin/AdminProducts';
import { AdminInventory } from './admin/AdminInventory';
import { AdminTables } from './admin/AdminTables';
import { AdminFinance } from './admin/AdminFinance';
import { AdminSettings } from './admin/AdminSettings';
import { AdminMenuAppearance } from './admin/AdminMenuAppearance'; 
import { AdminPurchaseSuggestions } from './admin/AdminPurchaseSuggestions'; 
import { AdminAccounting } from './admin/AdminAccounting';
import { AccountingReport } from './admin/AccountingReport'; 
import { AdminFinancialTips } from './admin/AdminFinancialTips';

// --- COMPONENTE DE SIDEBAR (Exclusivo do Admin) ---
const AdminSidebar = ({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (v: boolean) => void }) => {
    // @ts-ignore
    const location = useLocation();
    const { state: authState, logout } = useAuth();
    const { state: restState } = useRestaurant();
    const { showConfirm } = useUI();
    const { planLimits } = restState;
    
    // Estados dos grupos do menu
    const [isAppsOpen, setIsAppsOpen] = useState(true);
    const [isQrOpen, setIsQrOpen] = useState(true);
    const [isManagementOpen, setIsManagementOpen] = useState(true);

    if (!authState.currentUser) return null;

    const role = authState.currentUser.role;

    // 1. Módulos Operacionais (Apps)
    const appLinks = [
        { to: "/waiter", icon: <Coffee size={20}/>, label: "Garçom", requires: null, roles: [Role.WAITER, Role.ADMIN] },
        { to: "/kitchen", icon: <Monitor size={20}/>, label: "Cozinha", requires: 'allowKds', roles: [Role.KITCHEN, Role.ADMIN] },
        { to: "/cashier", icon: <DollarSign size={20}/>, label: "Caixa", requires: 'allowCashier', roles: [Role.CASHIER, Role.ADMIN] },
    ];

    // 2. Automação QR (Cardápio e Experiência do Cliente)
    const qrLinks = [
        { to: "/admin/products", icon: <Utensils size={20}/>, label: "Cardápio Digital", requires: null },
        { to: "/admin/appearance", icon: <Palette size={20}/>, label: "Aparência & Marca", requires: 'allowCustomization' },
        { to: "/admin/tables", icon: <QrCode size={20}/>, label: "Mesas & QR", requires: 'allowTableMgmt' },
    ];

    // 3. Gestão (Backoffice)
    const managementLinks = [
        { to: "/admin", icon: <LayoutDashboard size={20}/>, label: "Visão Geral", requires: null },
        { to: "/admin/inventory", icon: <Package size={20}/>, label: "Estoque", requires: 'allowInventory' },
        { to: "/admin/purchases", icon: <ShoppingCart size={20}/>, label: "Sugestão Compras", requires: 'allowInventory' }, 
        { to: "/admin/finance", icon: <DollarSign size={20}/>, label: "Financeiro", requires: 'allowExpenses' }, 
        { to: "/admin/settings", icon: <Settings size={20}/>, label: "Configurações", requires: null },
    ];

    const filterLinks = (links: any[]) => links.filter(link => {
        // Checa limites do plano
        if (link.requires === 'allowKds' && !planLimits.allowKds) return false;
        if (link.requires === 'allowCashier' && !planLimits.allowCashier) return false;
        if (link.requires === 'allowInventory' && !planLimits.allowInventory) return false;
        if (link.requires === 'allowExpenses' && (!planLimits.allowExpenses && !planLimits.allowPurchases)) return false;
        if (link.requires === 'allowTableMgmt' && !planLimits.allowTableMgmt) return false;
        if (link.requires === 'allowStaff' && !planLimits.allowStaff) return false;
        if (link.requires === 'allowReports' && !planLimits.allowReports) return false;
        if (link.requires === 'allowCustomization' && !planLimits.allowCustomization) return false;

        // Checa permissão do usuário
        if ((role as Role) === Role.ADMIN) return true;
        if (link.roles && !link.roles.includes(role)) return false;
        if (!link.roles && role !== Role.ADMIN) return false;
        
        return true;
    });

    const visibleAppLinks = filterLinks(appLinks);
    const visibleQrLinks = filterLinks(qrLinks);
    const visibleManagementLinks = filterLinks(managementLinks);

    const handleLogoutClick = () => {
        showConfirm({
            title: "Sair do Sistema?",
            message: "Você precisará fazer login novamente.",
            type: 'WARNING',
            confirmText: "Sair Agora",
            onConfirm: () => logout()
        });
    };

    const NavItem = ({ link }: { link: any }) => {
        const isActive = location.pathname === link.to || (link.to !== '/admin' && location.pathname.startsWith(link.to) && link.to.startsWith('/admin'));
        const isDashboardActive = link.to === '/admin' && location.pathname === '/admin';
        const finalActive = link.to === '/admin' ? isDashboardActive : isActive;

        return (
            <Link 
                to={link.to} 
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group ${finalActive ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
                <div className={finalActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}>
                    {link.icon}
                </div>
                {link.label}
            </Link>
        );
    };

    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>}

            <aside className={`fixed md:relative top-0 left-0 h-full w-64 bg-slate-900 text-white border-r border-slate-800 shadow-xl z-50 transition-transform duration-300 ease-in-out flex flex-col shrink-0 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-6 border-b border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-600 p-2 rounded-lg text-white shadow-lg shadow-green-500/20">
                            {restState.theme.logoUrl ? <img src={restState.theme.logoUrl} className="h-6 w-6 object-contain" /> : <ChefHat size={24} />}
                        </div>
                        <div className="font-black text-lg tracking-tight truncate leading-none w-32">
                            {restState.theme.restaurantName}
                        </div>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-4 custom-scrollbar">
                    {/* APPS */}
                    {visibleAppLinks.length > 0 && (
                        <div className="space-y-1">
                            <button onClick={() => setIsAppsOpen(!isAppsOpen)} className="w-full flex items-center justify-between px-2 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors">
                                <span>Operação</span> {isAppsOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                            <div className={`space-y-1 overflow-hidden transition-all ${isAppsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                {visibleAppLinks.map(link => <NavItem key={link.to} link={link} />)}
                            </div>
                        </div>
                    )}

                    {/* AUTOMAÇÃO QR (NOVA ABA) */}
                    {visibleQrLinks.length > 0 && (
                        <div className="space-y-1 pt-2 border-t border-slate-800">
                            <button onClick={() => setIsQrOpen(!isQrOpen)} className="w-full flex items-center justify-between px-2 mb-2 mt-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors">
                                <span className="flex items-center gap-1"><Smartphone size={10} /> Automação QR</span> {isQrOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                            <div className={`space-y-1 overflow-hidden transition-all ${isQrOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                {visibleQrLinks.map(link => <NavItem key={link.to} link={link} />)}
                            </div>
                        </div>
                    )}

                    {/* GESTÃO */}
                    {visibleManagementLinks.length > 0 && (
                        <div className="space-y-1 pt-2 border-t border-slate-800">
                            <button onClick={() => setIsManagementOpen(!isManagementOpen)} className="w-full flex items-center justify-between px-2 mb-2 mt-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors">
                                <span>Gestão</span> {isManagementOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                            <div className={`space-y-1 overflow-hidden transition-all ${isManagementOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                {visibleManagementLinks.map(link => <NavItem key={link.to} link={link} />)}
                            </div>
                        </div>
                    )}
                </nav>

                <div className="p-4 border-t border-slate-800 bg-slate-950/50">
                     <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-green-500 border border-slate-700">
                            <UserIcon size={20} />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-white truncate">{authState.currentUser?.name}</p>
                            <p className="text-xs text-slate-500 truncate capitalize">{authState.currentUser?.role?.toLowerCase()}</p>
                        </div>
                     </div>
                     <button onClick={handleLogoutClick} className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-white hover:bg-red-500/10 py-2 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider">
                        <LogOut size={16} /> Sair do Sistema
                     </button>
                </div>
            </aside>
        </>
    );
};

export const AdminDashboard: React.FC = () => {
  const { state } = useRestaurant();
  const { planLimits } = state;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
        <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

        <div className="flex-1 flex flex-col overflow-hidden relative w-full">
            <div className="md:hidden bg-white border-b p-4 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                    {state.theme.logoUrl && <img src={state.theme.logoUrl} className="h-6 w-6 object-contain" />}
                    <span>{state.theme.restaurantName}</span>
                </div>
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-100 rounded-lg text-slate-600">
                    <Menu size={24} />
                </button>
            </div>

            <main className="flex-1 overflow-y-auto bg-gray-50">
                <div className="h-full p-4 md:p-8">
                    <Routes>
                        <Route path="/" element={<AdminOverview />} />
                        <Route path="products" element={<AdminProducts />} />
                        
                        {planLimits.allowInventory && (
                            <>
                                <Route path="inventory" element={<AdminInventory />} />
                                <Route path="purchases" element={<AdminPurchaseSuggestions />} /> 
                            </>
                        )}

                        {planLimits.allowTableMgmt && <Route path="tables" element={<AdminTables />} />}
                        
                        {/* Rota unificada de Financeiro */}
                        {(planLimits.allowExpenses || planLimits.allowPurchases || planLimits.allowReports) && (
                            <Route path="finance" element={<AdminFinance />} />
                        )}
                        
                        {/* Rotas Auxiliares (mantidas para compatibilidade, mas acessadas via Financeiro) */}
                        {planLimits.allowReports && (
                            <>
                                <Route path="accounting" element={<AdminAccounting />} />
                                <Route path="report" element={<AccountingReport />} /> 
                                <Route path="tips" element={<AdminFinancialTips />} />
                            </>
                        )}

                        {/* Rotas de Configuração */}
                        {planLimits.allowCustomization && <Route path="appearance" element={<AdminMenuAppearance />} />}
                        <Route path="settings" element={<AdminSettings />} />

                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="" replace />} />
                    </Routes>
                </div>
            </main>
        </div>
    </div>
  );
};
