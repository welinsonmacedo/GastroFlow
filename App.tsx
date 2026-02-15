
import React, { PropsWithChildren } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthProvider'; 
import { RestaurantProvider, useRestaurant } from './context/RestaurantContext';
import { InventoryProvider } from './context/InventoryContext'; 
import { FinanceProvider } from './context/FinanceContext'; 
import { MenuProvider } from './context/MenuContext'; // NEW
import { OrderProvider } from './context/OrderContext'; // NEW
import { StaffProvider } from './context/StaffContext'; // NEW
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
import { ChefHat, Coffee, Monitor, DollarSign, Settings, LogOut, User as UserIcon, Lock } from 'lucide-react';
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

const TenantNavigation = () => {
    const location = useLocation();
    const { state: authState, logout } = useAuth();
    const { state: restState } = useRestaurant();
    const { showConfirm } = useUI();
    
    if (location.pathname.startsWith('/client') || location.pathname === '/login' || location.pathname === '/manual') return null;
    if (!authState.currentUser) return null;

    const allLinks = [
        { to: "/waiter", icon: <Coffee size={20}/>, label: "Garçom", requires: null },
        { to: "/kitchen", icon: <Monitor size={20}/>, label: "Cozinha", requires: 'allowKds' },
        { to: "/cashier", icon: <DollarSign size={20}/>, label: "Caixa", requires: 'allowCashier' },
        { to: "/admin", icon: <Settings size={20}/>, label: "Admin", requires: null },
    ];

    const navLinks = allLinks.filter(link => {
        if (link.requires === 'allowKds' && !restState.planLimits.allowKds) return false;
        if (link.requires === 'allowCashier' && !restState.planLimits.allowCashier) return false;
        if (authState.currentUser?.role === Role.ADMIN) return true;
        return authState.currentUser?.allowedRoutes?.includes(link.to);
    });

    const handleLogoutClick = () => {
        showConfirm({
            title: "Sair do Sistema?",
            message: "Você precisará fazer login novamente.",
            type: 'WARNING',
            confirmText: "Sair Agora",
            onConfirm: () => logout()
        });
    };

    return (
        <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white h-full border-r border-slate-800 shadow-xl shrink-0 z-50 transition-all">
            {/* Header / Logo */}
            <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                <div className="bg-green-600 p-2 rounded-lg text-white shadow-lg shadow-green-500/20">
                    {restState.theme.logoUrl ? <img src={restState.theme.logoUrl} className="h-6 w-6 object-contain" /> : <ChefHat size={24} />}
                </div>
                <div className="font-black text-lg tracking-tight truncate leading-none">
                    {restState.theme.restaurantName}
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 mb-2">Módulos</p>
                {navLinks.map(link => {
                    const isActive = location.pathname.startsWith(link.to);
                    return (
                        <Link 
                            key={link.to} 
                            to={link.to} 
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group ${isActive ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <div className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}>
                                {link.icon}
                            </div>
                            {link.label}
                        </Link>
                    );
                })}
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
                 <button 
                    onClick={handleLogoutClick} 
                    className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-white hover:bg-red-500/10 py-2 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider"
                 >
                    <LogOut size={16} /> Sair do Sistema
                 </button>
            </div>
        </aside>
    );
}

const TenantApp = () => {
    const { state } = useRestaurant();

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

    // Layout principal agora é flex-row para acomodar a sidebar
    return (
        <div className="h-full flex flex-row bg-gray-50 overflow-hidden">
            <TenantNavigation />
            <div className="flex-1 overflow-hidden relative flex flex-col">
                <Routes>
                    <Route path="/" element={<Navigate to={`/login${window.location.search}`} replace />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/manual" element={<ManualPage />} />
                    <Route path="/client/table/:tableId" element={<ClientApp />} />
                    
                    <Route path="/waiter" element={<ProtectedRestaurantRoute allowedRoles={[Role.WAITER, Role.ADMIN]} requiredRoute="/waiter"><WaiterApp /></ProtectedRestaurantRoute>} />
                    <Route path="/kitchen" element={<ProtectedRestaurantRoute allowedRoles={[Role.KITCHEN, Role.ADMIN]} requiredRoute="/kitchen" requiredFeature="allowKds"><KitchenDisplay /></ProtectedRestaurantRoute>} />
                    <Route path="/cashier" element={<ProtectedRestaurantRoute allowedRoles={[Role.CASHIER, Role.ADMIN]} requiredRoute="/cashier" requiredFeature="allowCashier"><CashierDashboard /></ProtectedRestaurantRoute>} />
                    <Route path="/admin" element={<ProtectedRestaurantRoute allowedRoles={[Role.ADMIN]} requiredRoute="/admin"><AdminDashboard /></ProtectedRestaurantRoute>} />
                    <Route path="*" element={<Navigate to={`/login${window.location.search}`} replace />} />
                </Routes>
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
