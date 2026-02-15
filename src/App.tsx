
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
import { InstallPWA } from './components/InstallPWA';
import { Lock } from 'lucide-react';
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

    return (
        <div className="h-full flex flex-col bg-gray-50 overflow-hidden relative">
            <div className="flex-1 overflow-hidden relative flex flex-col w-full">
                <div className="flex-1 overflow-y-auto">
                    <Routes>
                        <Route path="/" element={<Navigate to={`/login${window.location.search}`} replace />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/manual" element={<ManualPage />} />
                        <Route path="/client/table/:tableId" element={<ClientApp />} />
                        
                        {/* ROTAS OPERACIONAIS - SEM SIDEBAR (Acessadas diretamente) */}
                        <Route path="/waiter" element={<ProtectedRestaurantRoute allowedRoles={[Role.WAITER, Role.ADMIN]} requiredRoute="/waiter"><WaiterApp /></ProtectedRestaurantRoute>} />
                        <Route path="/kitchen" element={<ProtectedRestaurantRoute allowedRoles={[Role.KITCHEN, Role.ADMIN]} requiredRoute="/kitchen" requiredFeature="allowKds"><KitchenDisplay /></ProtectedRestaurantRoute>} />
                        <Route path="/cashier" element={<ProtectedRestaurantRoute allowedRoles={[Role.CASHIER, Role.ADMIN]} requiredRoute="/cashier" requiredFeature="allowCashier"><CashierDashboard /></ProtectedRestaurantRoute>} />
                        
                        {/* ROTA ADMIN - COM SIDEBAR (AdminDashboard contém o layout com sidebar) */}
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
