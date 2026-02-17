
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
    ChevronDown, ChevronUp, ShoppingCart, Smartphone, Database, Wifi, TrendingUp, FileText
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
import { AdminReports } from './admin/AdminReports'; // Nova importação

// --- COMPONENTE DE SIDEBAR (Exclusivo do Admin) ---
const AdminSidebar = ({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (v: boolean) => void }) => {
    // @ts-ignore
    const location = useLocation();
    const { state: authState, logout } = useAuth();
    const { state: restState } = useRestaurant();
    const { showConfirm } = useUI();
    const { planLimits } = restState;
    
    // Estado único para controlar qual seção está aberta (Accordion)
    const [openSection, setOpenSection] = useState<'APPS' | 'QR' | 'MANAGEMENT' | null>('APPS');

    if (!authState.currentUser) return null;

    const role = authState.currentUser.role;

    const toggleSection = (section: 'APPS' | 'QR' | 'MANAGEMENT') => {
        setOpenSection(prev => prev === section ? null : section);
    };

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
        { to: "/admin/finance", icon: <DollarSign size={20}/>, label: "Financeiro", requires: 'allowExpenses' }, 
        { to: "/admin/bi", icon: <TrendingUp size={20}/>, label: "Inteligência", requires: 'allowReports' },
        { to: "/admin/reports", icon: <FileText size={20}/>, label: "Relatórios", requires: 'allowReports' }, // Novo Link
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
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group whitespace-nowrap ${finalActive ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
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

            <aside className={`
                fixed top-0 left-0 h-full bg-slate-900 text-white border-r border-slate-800 shadow-xl z-50
                transition-all duration-300 ease-in-out
                w-64
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0 md:w-6 md:hover:w-64 md:overflow-hidden group
            `}>
                <div className="w-64 h-full flex flex-col">
                    <div className="p-6 border-b border-slate-800 flex items-center justify-center shrink-0">
                        <div className="bg-green-600 p-3 rounded-xl text-white shadow-lg shadow-green-500/20">
                            {restState.theme.logoUrl ? <img src={restState.theme.logoUrl} className="h-8 w-8 object-contain" /> : <ChefHat size={32} />}
                        </div>
                    </div>

                    <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-4 custom-scrollbar">
                        {/* APPS */}
                        {visibleAppLinks.length > 0 && (
                            <div className="space-y-1">
                                <button onClick={() => toggleSection('APPS')} className="w-full flex items-center justify-between px-2 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors whitespace-nowrap">
                                    <span>Operação</span> {openSection === 'APPS' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                </button>
                                <div className={`space-y-1 overflow-hidden transition-all duration-300 ${openSection === 'APPS' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    {visibleAppLinks.map(link => <NavItem key={link.to} link={link} />)}
                                </div>
                            </div>
                        )}

                        {/* AUTOMAÇÃO QR */}
                        {visibleQrLinks.length > 0 && (
                            <div className="space-y-1 pt-2 border-t border-slate-800">
                                <button onClick={() => toggleSection('QR')} className="w-full flex items-center justify-between px-2 mb-2 mt-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors whitespace-nowrap">
                                    <span className="flex items-center gap-1"><Smartphone size={10} /> Automação QR</span> {openSection === 'QR' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                </button>
                                <div className={`space-y-1 overflow-hidden transition-all duration-300 ${openSection === 'QR' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    {visibleQrLinks.map(link => <NavItem key={link.to} link={link} />)}
                                </div>
                            </div>
                        )}

                        {/* GESTÃO */}
                        {visibleManagementLinks.length > 0 && (
                            <div className="space-y-1 pt-2 border-t border-slate-800">
                                <button onClick={() => toggleSection('MANAGEMENT')} className="w-full flex items-center justify-between px-2 mb-2 mt-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors whitespace-nowrap">
                                    <span>Gestão</span> {openSection === 'MANAGEMENT' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                </button>
                                <div className={`space-y-1 overflow-hidden transition-all duration-300 ${openSection === 'MANAGEMENT' ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    {visibleManagementLinks.map(link => <NavItem key={link.to} link={link} />)}
                                </div>
                            </div>
                        )}
                    </nav>

                    <div className="p-4 border-t border-slate-800 bg-slate-950/50 shrink-0">
                         <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-center gap-2 bg-slate-900 py-2 rounded-lg border border-slate-800 whitespace-nowrap">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Sistema Online</span>
                            </div>

                            <button onClick={handleLogoutClick} className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-white hover:bg-red-500/10 py-3 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                                <LogOut size={16} /> Sair
                            </button>
                         </div>
                    </div>
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

        <div className="flex-1 flex flex-col overflow-hidden relative w-full md:ml-6 transition-all duration-300">
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
                            <Route path="inventory" element={<AdminInventory />} />
                        )}

                        {planLimits.allowTableMgmt && <Route path="tables" element={<AdminTables />} />}
                        
                        {/* Rota unificada de Financeiro */}
                        {(planLimits.allowExpenses || planLimits.allowPurchases || planLimits.allowReports) && (
                            <Route path="finance" element={<AdminFinance />} />
                        )}
                        
                        {/* Nova Rota: Business Intelligence */}
                        {planLimits.allowReports && (
                            <Route path="bi" element={<AdminBusinessIntelligence />} />
                        )}

                        {/* Nova Rota: Relatórios Completos */}
                        {planLimits.allowReports && (
                            <Route path="reports" element={<AdminReports />} />
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
