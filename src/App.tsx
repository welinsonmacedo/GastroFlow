
import React, { PropsWithChildren, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthProvider'; 
import { RestaurantProvider, useRestaurant } from './context/RestaurantContext';
import { InventoryProvider } from './context/InventoryContext'; 
import { FinanceProvider } from './context/FinanceContext'; 
import { MenuProvider } from './context/MenuContext'; 
import { OrderProvider } from './context/OrderContext'; 
import { StaffProvider } from './context/StaffContext'; 
import { SaaSProvider, useSaaS } from './context/SaaSContext';
import { UIProvider, useUI } from './context/UIContext';
import { ClientApp } from './pages/ClientApp';
import { WaiterApp } from './pages/WaiterApp';
import { KitchenDisplay } from './pages/KitchenDisplay';
import { CashierDashboard } from './pages/CashierDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { SaaSLogin } from './pages/SaaSLogin';
import { RegisterRestaurant } from './pages/RegisterRestaurant';
import { OwnerLogin } from './pages/OwnerLogin';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { ManualPage } from './pages/ManualPage';
import { InstallPWA } from './components/InstallPWA';
import { 
    ChefHat, Coffee, Monitor, DollarSign, Settings, LogOut, User as UserIcon, Lock, 
    Menu, X, LayoutDashboard, Utensils, Package, QrCode, PieChart, Users, Palette, FileText,
    ChevronDown, ChevronUp, Circle
} from 'lucide-react';
import { Role } from './types';
import { getTenantSlug } from './utils/tenant';

interface ProtectedRouteProps {
    allowedRoles?: Role[];
    requiredRoute?: string;
    requiredFeature?: 'allowKds' | 'allowCashier' | 'allowReports';
}

const ProtectedRestaurantRoute = ({ children, allowedRoles, requiredRoute, requiredFeature }: PropsWithChildren<ProtectedRouteProps>) => {
    const { state: authState, checkPermission } = useAuth();
    const { state: restState } = useRestaurant();
    
    if (authState.isLoading || restState.isLoading) return <div className="p-10 text-center">Carregando...</div>;

    if (!authState.isAuthenticated || !authState.currentUser) {
        return <Navigate to={`/login${window.location.search}`} replace />;
    }

    if (requiredFeature && restState.planLimits) {
        if (!restState.planLimits[requiredFeature]) {
            return <div className="p-10 text-center text-orange-500 font-bold">Funcionalidade Bloqueada pelo Plano</div>;
        }
    }

    if (allowedRoles && !checkPermission(allowedRoles)) {
         return <div className="p-10 text-center text-red-500">Acesso Negado.</div>;
    }
    return <>{children}</>;
};

const ProtectedSaaSRoute = ({ children }: PropsWithChildren) => {
    const { state } = useSaaS();
    if (!state.isAuthenticated) {
        return <Navigate to="/sys-admin" replace />;
    }
    return <>{children}</>;
};

const TenantNavigation = ({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (v: boolean) => void }) => {
    const location = useLocation();
    const { state: authState, logout } = useAuth();
    const { state: restState } = useRestaurant();
    const { showConfirm } = useUI();
    const { planLimits } = restState;
    
    // Estado único para controlar qual seção está aberta (exclusividade)
    // Valores: 'APPS', 'ADMIN' ou null (nenhum aberto)
    const [activeSection, setActiveSection] = useState<'APPS' | 'ADMIN' | null>('APPS');

    // Efeito para abrir automaticamente o grupo correto baseado na URL
    useEffect(() => {
        if (location.pathname.startsWith('/admin')) {
            setActiveSection('ADMIN');
        } else if (['/waiter', '/kitchen', '/cashier'].some(path => location.pathname.startsWith(path))) {
            setActiveSection('APPS');
        }
    }, [location.pathname]);
    
    // Lista de rotas onde a Sidebar NÃO deve aparecer
    const hideSidebarRoutes = ['/client', '/login', '/manual', '/waiter', '/kitchen', '/cashier'];
    if (hideSidebarRoutes.some(route => location.pathname.startsWith(route))) return null;

    if (!authState.currentUser) return null;

    const role = authState.currentUser.role;

    // 1. Módulos Operacionais (Apps)
    const appLinks = [
        { to: "/waiter", icon: <Coffee size={20}/>, label: "Garçom", requires: null, roles: [Role.WAITER, Role.ADMIN] },
        { to: "/kitchen", icon: <Monitor size={20}/>, label: "Cozinha", requires: 'allowKds', roles: [Role.KITCHEN, Role.ADMIN] },
        { to: "/cashier", icon: <DollarSign size={20}/>, label: "Caixa", requires: 'allowCashier', roles: [Role.CASHIER, Role.ADMIN] },
    ];

    // 2. Módulos Administrativos (Gestão)
    const adminLinks = [
        { to: "/admin", icon: <LayoutDashboard size={20}/>, label: "Visão Geral", requires: null },
        { to: "/admin/products", icon: <Utensils size={20}/>, label: "Cardápio", requires: null },
        { to: "/admin/inventory", icon: <Package size={20}/>, label: "Estoque", requires: 'allowInventory' },
        { to: "/admin/finance", icon: <DollarSign size={20}/>, label: "Financeiro", requires: 'allowExpenses' }, 
        { to: "/admin/tables", icon: <QrCode size={20}/>, label: "Mesas & QR", requires: 'allowTableMgmt' },
        { to: "/admin/staff", icon: <Users size={20}/>, label: "Equipe", requires: 'allowStaff' },
        { to: "/admin/accounting", icon: <PieChart size={20}/>, label: "DRE & Relatórios", requires: 'allowReports' },
        { to: "/admin/appearance", icon: <Palette size={20}/>, label: "Aparência", requires: 'allowCustomization' },
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
        // Para admin links específicos, apenas ADMIN vê
        if (!link.roles && role !== Role.ADMIN) return false;
        
        return true;
    });

    const visibleAppLinks = filterLinks(appLinks);
    const visibleAdminLinks = filterLinks(adminLinks);

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
        const isActive = location.pathname === link.to || (link.to !== '/admin' && location.pathname.startsWith(link.to));
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

    // Toggle para garantir exclusividade (Acordeão)
    const toggleSection = (section: 'APPS' | 'ADMIN') => {
        setActiveSection(prev => prev === section ? null : section);
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>}

            <aside 
                className={`
                    fixed inset-y-0 left-0 z-50 bg-slate-900 text-white shadow-2xl transition-all duration-300 ease-in-out border-r border-slate-800 overflow-hidden group
                    /* Mobile: Controlado por isOpen, largura total */
                    ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
                    /* Desktop: Sempre fixo no canto, largura fina (w-4) que expande no hover (w-64) */
                    md:translate-x-0 md:w-4 md:hover:w-64
                `}
            >
                {/* Wrapper interno com largura fixa para evitar quebra de texto durante a animação de largura */}
                <div className="w-64 h-full flex flex-col">
                    
                    {/* Header / Logo */}
                    {/* No desktop, opacity-0 por padrão para esconder quando recolhido, opacity-100 no hover */}
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-600 p-2 rounded-lg text-white shadow-lg shadow-green-500/20">
                                {restState.theme.logoUrl ? <img src={restState.theme.logoUrl} className="h-6 w-6 object-contain" /> : <ChefHat size={24} />}
                            </div>
                            <div className="font-black text-lg tracking-tight truncate leading-none w-32">
                                {restState.theme.restaurantName}
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="md:hidden text-slate-400 hover:text-white"><X size={20}/></button>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-4 custom-scrollbar opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 delay-75">
                        
                        {visibleAppLinks.length > 0 && (
                            <div className="space-y-1">
                                <button 
                                    onClick={() => toggleSection('APPS')}
                                    className="w-full flex items-center justify-between px-2 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
                                >
                                    <span>Operação</span>
                                    {activeSection === 'APPS' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                </button>
                                
                                <div className={`space-y-1 overflow-hidden transition-all duration-300 ${activeSection === 'APPS' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    {visibleAppLinks.map(link => <NavItem key={link.to} link={link} />)}
                                </div>
                            </div>
                        )}

                        {visibleAdminLinks.length > 0 && (
                            <div className="space-y-1 pt-2 border-t border-slate-800">
                                <button 
                                    onClick={() => toggleSection('ADMIN')}
                                    className="w-full flex items-center justify-between px-2 mb-2 mt-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
                                >
                                    <span>Gestão</span>
                                    {activeSection === 'ADMIN' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                </button>

                                <div className={`space-y-1 overflow-hidden transition-all duration-300 ${activeSection === 'ADMIN' ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    {visibleAdminLinks.map(link => <NavItem key={link.to} link={link} />)}
                                </div>
                            </div>
                        )}
                    </nav>

                    {/* User Profile Footer */}
                    <div className="p-4 border-t border-slate-800 bg-slate-950/50 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                         <div className="flex items-center gap-3 mb-4 px-2">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-green-500 border border-slate-700">
                                <UserIcon size={20} />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-bold text-white truncate">{authState.currentUser?.name}</p>
                                <p className="text-xs text-slate-500 truncate capitalize">{authState.currentUser?.role?.toLowerCase()}</p>
                            </div>
                         </div>
                         <button 
                            onClick={handleLogoutClick} 
                            className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-white hover:bg-red-500/10 py-2 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider"
                         >
                            <LogOut size={16} /> Sair do Sistema
                         </button>
                    </div>
                </div>
            </aside>
        </>
    );
}

const TenantApp = () => {
    const { state } = useRestaurant();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    if (state.isLoading) return <div className="h-screen flex items-center justify-center">Carregando sistema...</div>;
    
    if (state.isInactiveTenant) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
                <div className="bg-red-100 p-6 rounded-full mb-6 text-red-600 shadow-xl border border-red-200"><Lock size={64} /></div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Acesso Temporariamente Suspenso</h1>
            </div>
        );
    }

    if (!state.isValidTenant) {
        return <div className="h-screen flex items-center justify-center">Restaurante não encontrado.</div>;
    }

    // Rotas onde o Sidebar deve ser oculto
    const hideSidebarRoutes = ['/client', '/login', '/manual', '/waiter', '/kitchen', '/cashier'];
    const isSidebarHidden = hideSidebarRoutes.some(route => location.pathname.startsWith(route));

    return (
        <div className="h-full flex flex-row bg-gray-50 overflow-hidden relative">
            <TenantNavigation isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            
            {/* 
               Ajuste de layout condicional:
               Se a sidebar estiver oculta (Garçom/Cozinha/Caixa), removemos o padding-left (md:pl-4) 
               para que o conteúdo ocupe a tela toda sem espaço em branco.
            */}
            <div className={`flex-1 overflow-hidden relative flex flex-col w-full transition-all ${!isSidebarHidden ? 'md:pl-4' : ''}`}>
                
                {/* Mobile Header Toggle - Só aparece se a sidebar NÃO estiver oculta */}
                {!isSidebarHidden && (
                    <div className="md:hidden bg-white border-b p-4 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-sm">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                            {state.theme.logoUrl && <img src={state.theme.logoUrl} className="h-6 w-6 object-contain" />}
                            <span>{state.theme.restaurantName}</span>
                        </div>
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-100 rounded-lg text-slate-600">
                            <Menu size={24} />
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto">
                    <Routes>
                        <Route path="/" element={<Navigate to={`/login${window.location.search}`} replace />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/manual" element={<ManualPage />} />
                        <Route path="/client/table/:tableId" element={<ClientApp />} />
                        
                        <Route path="/waiter" element={<ProtectedRestaurantRoute allowedRoles={[Role.WAITER, Role.ADMIN]} requiredRoute="/waiter"><WaiterApp /></ProtectedRestaurantRoute>} />
                        <Route path="/kitchen" element={<ProtectedRestaurantRoute allowedRoles={[Role.KITCHEN, Role.ADMIN]} requiredRoute="/kitchen" requiredFeature="allowKds"><KitchenDisplay /></ProtectedRestaurantRoute>} />
                        <Route path="/cashier" element={<ProtectedRestaurantRoute allowedRoles={[Role.CASHIER, Role.ADMIN]} requiredRoute="/cashier" requiredFeature="allowCashier"><CashierDashboard /></ProtectedRestaurantRoute>} />
                        
                        {/* Rota Admin agora captura sub-rotas com "/*" */}
                        <Route path="/admin/*" element={<ProtectedRestaurantRoute allowedRoles={[Role.ADMIN]} requiredRoute="/admin"><AdminDashboard /></ProtectedRestaurantRoute>} />
                        
                        <Route path="*" element={<Navigate to={`/login${window.location.search}`} replace />} />
                    </Routes>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const tenantSlug = getTenantSlug();

  return (
    <BrowserRouter>
        <UIProvider>
            <InstallPWA />
            {tenantSlug ? (
                <AuthProvider>
                    <RestaurantProvider>
                        <MenuProvider>
                            <OrderProvider>
                                <StaffProvider>
                                    <InventoryProvider>
                                        <FinanceProvider>
                                            <TenantApp />
                                        </FinanceProvider>
                                    </InventoryProvider>
                                </StaffProvider>
                            </OrderProvider>
                        </MenuProvider>
                    </RestaurantProvider>
                </AuthProvider>
            ) : (
                <SaaSProvider>
                     <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/register" element={<RegisterRestaurant />} />
                        <Route path="/login-owner" element={<OwnerLogin />} />
                        <Route path="/privacy" element={<PrivacyPolicy />} />
                        <Route path="/terms" element={<TermsOfService />} />
                        <Route path="/sys-admin" element={<SaaSLogin />} /> 
                        <Route path="/dashboard" element={<ProtectedSaaSRoute><SuperAdminDashboard /></ProtectedSaaSRoute>} /> 
                        <Route path="*" element={<Navigate to="/" />} />
                     </Routes>
                </SaaSProvider>
            )}
        </UIProvider>
    </BrowserRouter>
  );
};

export default App;
