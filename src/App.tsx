
import React, { PropsWithChildren, useState, useEffect } from 'react';
// @ts-ignore
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
import { ModuleSelector } from './pages/ModuleSelector'; // Nova

import { InstallPWA } from './components/InstallPWA';
import { 
    ChefHat, Coffee, Monitor, DollarSign, Settings, LogOut, User as UserIcon, Lock, 
    Menu, X, ChevronDown, ChevronUp
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
    
    if (authState.isLoading || restState.isLoading) return <div className="h-screen flex items-center justify-center font-bold text-gray-500">Carregando...</div>;

    if (!authState.isAuthenticated || !authState.currentUser) {
        return <Navigate to={`/login${window.location.search}`} replace />;
    }

    // Se não tiver módulo ativo selecionado, manda pro seletor
    if (!restState.activeModule && restState.allowedModules.length > 0) {
         return <Navigate to="/modules" replace />;
    }

    if (requiredFeature && restState.planLimits) {
        if (!restState.planLimits[requiredFeature]) {
            return (
                <div className="h-screen flex flex-col items-center justify-center p-10 text-center">
                    <Lock size={48} className="text-orange-500 mb-4" />
                    <h2 className="text-xl font-bold text-gray-800">Funcionalidade Indisponível</h2>
                    <p className="text-gray-500 mt-2">Seu plano atual não inclui acesso a este módulo.</p>
                </div>
            );
        }
    }

    if (allowedRoles && !checkPermission(allowedRoles)) {
         return (
            <div className="h-screen flex flex-col items-center justify-center p-10 text-center">
                <Lock size={48} className="text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-gray-800">Acesso Negado</h2>
                <p className="text-gray-500 mt-2">Você não tem permissão para acessar esta área.</p>
            </div>
         );
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
    // @ts-ignore
    const location = useLocation();
    const { state: authState, logout } = useAuth();
    const { state: restState } = useRestaurant();
    const { showConfirm } = useUI();
    const { planLimits } = restState;
    
    // Estado para controlar os dropdowns
    const [isAppsOpen, setIsAppsOpen] = useState(true);

    // Se estiver em rota de ADMIN (Gestor) ou cliente/login, não mostra essa sidebar
    if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/client') || location.pathname === '/login' || location.pathname === '/manual' || location.pathname === '/modules') {
        return null;
    }

    if (!authState.currentUser) return null;

    const role = authState.currentUser.role;

    // 1. Módulos Operacionais (Apps)
    const appLinks = [
        { to: "/waiter", icon: <Coffee size={20}/>, label: "Garçom", requires: null, roles: [Role.WAITER, Role.ADMIN] },
        { to: "/kitchen", icon: <Monitor size={20}/>, label: "Cozinha", requires: 'allowKds', roles: [Role.KITCHEN, Role.ADMIN] },
        { to: "/cashier", icon: <DollarSign size={20}/>, label: "Caixa", requires: 'allowCashier', roles: [Role.CASHIER, Role.ADMIN] },
    ];

    const filterLinks = (links: any[]) => links.filter(link => {
        if (link.requires === 'allowKds' && !planLimits.allowKds) return false;
        if (link.requires === 'allowCashier' && !planLimits.allowCashier) return false;
        if ((role as Role) === Role.ADMIN) return true;
        if (link.roles && !link.roles.includes(role)) return false;
        return true;
    });

    const visibleAppLinks = filterLinks(appLinks);

    const handleLogoutClick = () => {
        showConfirm({
            title: "Sair do Sistema?",
            message: "Você precisará fazer login novamente.",
            type: 'WARNING',
            confirmText: "Sair Agora",
            onConfirm: () => logout()
        });
    };
    
    const handleSwitchModule = () => {
        // Redireciona para o seletor de módulos
        window.location.href = '/modules';
    };

    const NavItem = ({ link }: { link: any }) => {
        const isActive = location.pathname.startsWith(link.to);

        return (
            <Link 
                to={link.to} 
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group ${isActive ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
                <div className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}>
                    {link.icon}
                </div>
                {link.label}
            </Link>
        );
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>}

            <aside className={`fixed md:relative top-0 left-0 h-full w-64 bg-slate-900 text-white border-r border-slate-800 shadow-xl z-50 transition-transform duration-300 ease-in-out flex flex-col shrink-0 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                {/* Header / Logo */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between gap-3">
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
                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-4 custom-scrollbar">
                    
                    {visibleAppLinks.length > 0 && (
                        <div className="space-y-1">
                            <button 
                                onClick={() => setIsAppsOpen(!isAppsOpen)}
                                className="w-full flex items-center justify-between px-2 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
                            >
                                <span>Operação</span>
                                {isAppsOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                            
                            <div className={`space-y-1 overflow-hidden transition-all ${isAppsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                {visibleAppLinks.map(link => <NavItem key={link.to} link={link} />)}
                            </div>
                        </div>
                    )}
                </nav>

                {/* User Profile Footer */}
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
                     <div className="flex gap-2">
                        <button 
                            onClick={handleSwitchModule}
                            className="flex-1 flex items-center justify-center gap-1 text-slate-400 hover:text-white hover:bg-white/10 py-2 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider border border-slate-700"
                        >
                            <Settings size={14} /> Módulos
                        </button>
                        <button 
                            onClick={handleLogoutClick} 
                            className="flex-1 flex items-center justify-center gap-1 text-red-400 hover:text-white hover:bg-red-500/10 py-2 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider border border-slate-700"
                        >
                            <LogOut size={14} /> Sair
                        </button>
                     </div>
                </div>
            </aside>
        </>
    );
}

const TenantApp = () => {
    const { state } = useRestaurant();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    // @ts-ignore
    const location = useLocation();

    if (state.isLoading) return <div className="h-screen flex items-center justify-center">Carregando sistema...</div>;
    
    if (state.isInactiveTenant) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
                <div className="bg-red-100 p-6 rounded-full mb-6 text-red-600 shadow-xl border border-red-200"><Lock size={64} /></div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Acesso Temporariamente Suspenso</h1>
                <p className="text-gray-500">Entre em contato com o suporte para regularizar.</p>
            </div>
        );
    }

    if (!state.isValidTenant) {
        return <div className="h-screen flex items-center justify-center text-gray-500">Restaurante não encontrado. Verifique o link.</div>;
    }

    // Verifica se deve mostrar o header mobile da navegação (apenas se não for admin e não for client/login)
    const isOperationalRoute = ['/waiter', '/kitchen', '/cashier'].some(r => location.pathname.startsWith(r));

    return (
        <div className="h-full flex flex-row bg-gray-50 overflow-hidden relative">
            <TenantNavigation isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            
            <div className="flex-1 overflow-hidden relative flex flex-col w-full">
                {/* Mobile Header Toggle (Apenas para rotas operacionais) */}
                {isOperationalRoute && (
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
                        
                        {/* App do Cliente (Cardápio) */}
                        <Route path="/client/table/:tableId" element={<ClientApp />} />
                        
                        {/* Seletor de Módulos (Novo) */}
                        <Route path="/modules" element={<ModuleSelector />} />
                        
                        {/* Apps Operacionais (Protegidos) */}
                        <Route path="/waiter" element={<ProtectedRestaurantRoute allowedRoles={[Role.WAITER, Role.ADMIN]} requiredRoute="/waiter"><WaiterApp /></ProtectedRestaurantRoute>} />
                        <Route path="/kitchen" element={<ProtectedRestaurantRoute allowedRoles={[Role.KITCHEN, Role.ADMIN]} requiredRoute="/kitchen" requiredFeature="allowKds"><KitchenDisplay /></ProtectedRestaurantRoute>} />
                        <Route path="/cashier" element={<ProtectedRestaurantRoute allowedRoles={[Role.CASHIER, Role.ADMIN]} requiredRoute="/cashier" requiredFeature="allowCashier"><CashierDashboard /></ProtectedRestaurantRoute>} />
                        
                        {/* Painel Administrativo (Gestor) */}
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
