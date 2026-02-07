import React from 'react';
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
import { ChefHat, Coffee, Monitor, DollarSign, Settings, LogOut, User as UserIcon } from 'lucide-react';
import { Role } from './types';
import { getTenantSlug } from './utils/tenant';

// --- Components Helpers ---

const ProtectedRestaurantRoute = ({ children, allowedRoles }: { children: React.ReactElement, allowedRoles?: Role[] }) => {
    const { state } = useRestaurant();
    
    if (state.isLoading) return <div className="p-10 text-center">Carregando...</div>;

    if (!state.currentUser) {
        return <Navigate to="/login" replace />;
    }
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
    
    if (location.pathname.startsWith('/client') || location.pathname === '/login') return null;
    if (!state.currentUser) return null;

    return (
        <div className="bg-white border-b px-6 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm">
            <div className="font-bold text-xl flex items-center gap-2 text-blue-600">
                {state.theme.logoUrl && <img src={state.theme.logoUrl} className="h-8 w-8 object-contain" />}
                {!state.theme.logoUrl && <ChefHat />} 
                {state.theme.restaurantName}
            </div>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                <Link to="/waiter" className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${location.pathname === '/waiter' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
                    <Coffee size={16}/> Garçom
                </Link>
                <Link to="/kitchen" className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${location.pathname === '/kitchen' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
                    <Monitor size={16}/> Cozinha
                </Link>
                <Link to="/cashier" className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${location.pathname === '/cashier' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
                    <DollarSign size={16}/> Caixa
                </Link>
                <Link to="/admin" className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${location.pathname === '/admin' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
                    <Settings size={16}/> Admin
                </Link>
            </div>
             <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1.5 rounded-full border">
                    <UserIcon size={14} className="text-blue-500" />
                    {state.currentUser.name}
                 </div>
                 <button onClick={() => dispatch({ type: 'LOGOUT' })} className="text-red-500 hover:text-red-700" title="Sair">
                    <LogOut size={20} />
                 </button>
            </div>
        </div>
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
        <>
            <TenantNavigation />
            <Routes>
                <Route path="/" element={<Navigate to="/login" />} />
                <Route path="/login" element={<Login />} />
                <Route path="/client/table/:tableId" element={<ClientApp />} />
                
                <Route path="/waiter" element={<ProtectedRestaurantRoute allowedRoles={[Role.WAITER, Role.ADMIN]}><WaiterApp /></ProtectedRestaurantRoute>} />
                <Route path="/kitchen" element={<ProtectedRestaurantRoute allowedRoles={[Role.KITCHEN, Role.ADMIN]}><KitchenDisplay /></ProtectedRestaurantRoute>} />
                <Route path="/cashier" element={<ProtectedRestaurantRoute allowedRoles={[Role.CASHIER, Role.ADMIN]}><CashierDashboard /></ProtectedRestaurantRoute>} />
                <Route path="/admin" element={<ProtectedRestaurantRoute allowedRoles={[Role.ADMIN]}><AdminDashboard /></ProtectedRestaurantRoute>} />
            </Routes>
        </>
    );
};

const SaaSApp = () => {
    return (
        <SaaSProvider>
             <Routes>
                <Route path="/" element={<LandingPage />} />
                {/* Rota específica para o DONO do sistema */}
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