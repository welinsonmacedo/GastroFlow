import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { RestaurantProvider, useRestaurant } from './context/RestaurantContext';
import { SaaSProvider, useSaaS } from './context/SaaSContext';
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
import { InstallPWA } from './components/InstallPWA';
import { ChefHat, Coffee, Monitor, DollarSign, Settings, LogOut, User as UserIcon, Menu, AlertCircle } from 'lucide-react';
import { Role } from './types';
import { getTenantSlug } from './utils/tenant';

// --- Components Helpers ---

interface ProtectedRouteProps {
    children: React.ReactElement;
    allowedRoles?: Role[];
    requiredRoute?: string; // Nova prop para rota específica
}

const ProtectedRestaurantRoute = ({ children, allowedRoles, requiredRoute }: ProtectedRouteProps) => {
    const { state } = useRestaurant();
    
    if (state.isLoading) return <div className="p-10 text-center">Carregando...</div>;

    if (!state.currentUser) {
        return <Navigate to={`/login${window.location.search}`} replace />;
    }

    // 1. Verificação por Permissão Explícita (Nova Lógica)
    if (requiredRoute && state.currentUser.allowedRoutes && state.currentUser.allowedRoutes.length > 0) {
        if (!state.currentUser.allowedRoutes.includes(requiredRoute) && state.currentUser.role !== Role.ADMIN) {
             return <div className="p-10 text-center text-red-500">Acesso Negado: Você não tem permissão para acessar esta tela.</div>;
        }
    }

    // 2. Verificação por Role (Compatibilidade e Admin)
    if (allowedRoles && !allowedRoles.includes(state.currentUser.role)) {
         return <div className="p-10 text-center text-red-500">Acesso Negado: Permissão insuficiente.</div>;
    }
    return children;
};

const ProtectedSaaSRoute = ({ children }: { children: React.ReactElement }) => {
    const { state } = useSaaS();
    if (!state.isAuthenticated) {
        return <Navigate to="/sys-admin" replace />;
    }
    return children;
};

const TenantNavigation = () => {
    const location = useLocation();
    const { state, dispatch } = useRestaurant();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    
    if (location.pathname.startsWith('/client') || location.pathname === '/login') return null;
    if (!state.currentUser) return null;

    // Filtra links baseado nas permissões do usuário
    const allLinks = [
        { to: "/waiter", icon: <Coffee size={20}/>, label: "Garçom" },
        { to: "/kitchen", icon: <Monitor size={20}/>, label: "Cozinha" },
        { to: "/cashier", icon: <DollarSign size={20}/>, label: "Caixa" },
        { to: "/admin", icon: <Settings size={20}/>, label: "Admin" },
    ];

    const navLinks = allLinks.filter(link => {
        // Admin vê tudo
        if (state.currentUser?.role === Role.ADMIN) return true;
        // Outros veem se estiver no allowedRoutes
        return state.currentUser?.allowedRoutes?.includes(link.to);
    });

    const confirmLogout = () => {
        dispatch({ type: 'LOGOUT' });
        setShowLogoutConfirm(false);
    };

    return (
        <>
            {/* LOGOUT CONFIRMATION MODAL */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm transform scale-100 transition-all">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="bg-red-100 p-3 rounded-full mb-3 text-red-600">
                                <LogOut size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Sair do Sistema?</h3>
                            <p className="text-gray-500 text-sm mt-1">Você precisará fazer login novamente para acessar suas funções.</p>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmLogout}
                                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
                            >
                                Sair Agora
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop Navigation (Top Bar) */}
            <div className="hidden md:flex bg-white border-b px-6 py-3 justify-between items-center sticky top-0 z-50 shadow-sm">
                <div className="font-bold text-xl flex items-center gap-2 text-blue-600">
                    {state.theme.logoUrl && <img src={state.theme.logoUrl} className="h-8 w-8 object-contain" />}
                    {!state.theme.logoUrl && <ChefHat />} 
                    {state.theme.restaurantName}
                </div>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                    {navLinks.map(link => (
                        <Link 
                            key={link.to}
                            to={link.to} 
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${location.pathname === link.to ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            {React.cloneElement(link.icon as React.ReactElement<any>, { size: 16 })} {link.label}
                        </Link>
                    ))}
                </div>
                 <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1.5 rounded-full border">
                        <UserIcon size={14} className="text-blue-500" />
                        {state.currentUser.name}
                     </div>
                     <button onClick={() => setShowLogoutConfirm(true)} className="text-red-500 hover:text-red-700" title="Sair">
                        <LogOut size={20} />
                     </button>
                </div>
            </div>

            {/* Mobile Navigation (Bottom Bar) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom pb-1 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="flex justify-around items-center">
                    {navLinks.map(link => (
                        <Link 
                            key={link.to}
                            to={link.to}
                            className={`flex flex-col items-center justify-center py-3 px-2 w-full transition-colors ${location.pathname === link.to ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {link.icon}
                            <span className="text-[10px] font-medium mt-1">{link.label}</span>
                        </Link>
                    ))}
                    <button 
                        onClick={() => setShowLogoutConfirm(true)} 
                        className="flex flex-col items-center justify-center py-3 px-2 w-full text-red-400 hover:text-red-600"
                    >
                        <LogOut size={20} />
                        <span className="text-[10px] font-medium mt-1">Sair</span>
                    </button>
                </div>
            </div>
        </>
    );
}

// --- Main Apps ---

const TenantApp = () => {
    const { state } = useRestaurant();

    if (state.isLoading) return <div className="h-screen flex items-center justify-center">Carregando sistema...</div>;
    
    if (!state.isValidTenant) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
                <h1 className="text-4xl font-bold text-gray-800 mb-4">Restaurante não encontrado</h1>
                <p className="text-gray-500 mb-8">O endereço acessado não corresponde a nenhum restaurante ativo.</p>
                <a href="/" className="text-blue-600 hover:underline">Voltar para Home</a>
            </div>
        );
    }

    return (
        <div className="pb-16 md:pb-0 min-h-screen flex flex-col"> {/* Padding bottom for mobile nav */}
            <TenantNavigation />
            <div className="flex-1 overflow-auto">
                <Routes>
                    <Route path="/" element={<Navigate to={`/login${window.location.search}`} replace />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/client/table/:tableId" element={<ClientApp />} />
                    
                    <Route path="/waiter" element={<ProtectedRestaurantRoute allowedRoles={[Role.WAITER, Role.ADMIN]} requiredRoute="/waiter"><WaiterApp /></ProtectedRestaurantRoute>} />
                    <Route path="/kitchen" element={<ProtectedRestaurantRoute allowedRoles={[Role.KITCHEN, Role.ADMIN]} requiredRoute="/kitchen"><KitchenDisplay /></ProtectedRestaurantRoute>} />
                    <Route path="/cashier" element={<ProtectedRestaurantRoute allowedRoles={[Role.CASHIER, Role.ADMIN]} requiredRoute="/cashier"><CashierDashboard /></ProtectedRestaurantRoute>} />
                    <Route path="/admin" element={<ProtectedRestaurantRoute allowedRoles={[Role.ADMIN]} requiredRoute="/admin"><AdminDashboard /></ProtectedRestaurantRoute>} />
                    <Route path="*" element={<Navigate to={`/login${window.location.search}`} replace />} />
                </Routes>
            </div>
        </div>
    );
};

const SaaSApp = () => {
    return (
        <SaaSProvider>
             <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/register" element={<RegisterRestaurant />} />
                <Route path="/login-owner" element={<OwnerLogin />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                
                {/* Rota específica para o DONO do sistema SaaS */}
                <Route path="/sys-admin" element={<SaaSLogin />} /> 
                <Route path="/dashboard" element={<ProtectedSaaSRoute><SuperAdminDashboard /></ProtectedSaaSRoute>} /> 
                <Route path="*" element={<Navigate to="/" />} />
             </Routes>
        </SaaSProvider>
    );
};

const App: React.FC = () => {
  const tenantSlug = getTenantSlug();

  return (
    <BrowserRouter>
        <InstallPWA />
        {tenantSlug ? (
            <RestaurantProvider>
                <TenantApp />
            </RestaurantProvider>
        ) : (
            <SaaSApp />
        )}
    </BrowserRouter>
  );
};

export default App;