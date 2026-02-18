
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
import { AdminDashboard } from './pages/AdminDashboard';
import { FinanceDashboard } from './pages/FinanceDashboard'; 
import { SettingsDashboard } from './pages/SettingsDashboard';
import { RestaurantDashboard } from './pages/RestaurantDashboard';
import { CommerceDashboard } from './pages/CommerceDashboard'; 
import { InventoryDashboard } from './pages/InventoryDashboard'; // Novo
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { SaaSLogin } from './pages/SaaSLogin';
import { RegisterRestaurant } from './pages/RegisterRestaurant';
import { OwnerLogin } from './pages/OwnerLogin';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { ManualPage } from './pages/ManualPage';
import { ModuleSelector } from './pages/ModuleSelector';

import { InstallPWA } from './components/InstallPWA';
import { SecurityGuard } from './components/SecurityGuard'; // Importação do Guarda
import { Lock } from 'lucide-react';
import { Role } from './types';
import { getTenantSlug } from './utils/tenant';

interface ProtectedRouteProps {
    allowedRoles?: Role[];
    requiredRoute?: string;
    requiredFeature?: 'allowKds' | 'allowCashier' | 'allowReports' | 'allowInventory';
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

const TenantApp = () => {
    const { state } = useRestaurant();
    
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

    return (
        <div className="h-full flex flex-row bg-gray-50 overflow-hidden relative">
            <div className="flex-1 overflow-hidden relative flex flex-col w-full">
                <div className="flex-1 overflow-y-auto">
                    <Routes>
                        <Route path="/" element={<Navigate to={`/login${window.location.search}`} replace />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/manual" element={<ManualPage />} />
                        
                        {/* App do Cliente (Cardápio) */}
                        <Route path="/client/table/:tableId" element={<ClientApp />} />
                        
                        {/* Seletor de Módulos */}
                        <Route path="/modules" element={<ModuleSelector />} />
                        
                        {/* Módulo Restaurante (Operacional) */}
                        <Route path="/restaurant/*" element={<ProtectedRestaurantRoute requiredRoute="/restaurant"><RestaurantDashboard /></ProtectedRestaurantRoute>} />
                        
                        {/* Módulo Comércio (Varejo) */}
                        <Route path="/commerce/*" element={<ProtectedRestaurantRoute requiredRoute="/commerce"><CommerceDashboard /></ProtectedRestaurantRoute>} />
                        
                        {/* Módulo Estoque (Novo) */}
                        <Route path="/inventory/*" element={<ProtectedRestaurantRoute requiredRoute="/inventory" requiredFeature="allowInventory"><InventoryDashboard /></ProtectedRestaurantRoute>} />

                        {/* Painel Administrativo (Gestor) */}
                        <Route path="/admin/*" element={<ProtectedRestaurantRoute allowedRoles={[Role.ADMIN]} requiredRoute="/admin"><AdminDashboard /></ProtectedRestaurantRoute>} />

                        {/* Painel de Configurações */}
                        <Route path="/settings/*" element={<ProtectedRestaurantRoute allowedRoles={[Role.ADMIN]} requiredRoute="/settings"><SettingsDashboard /></ProtectedRestaurantRoute>} />

                        {/* Painel Financeiro */}
                        <Route path="/finance/*" element={<ProtectedRestaurantRoute allowedRoles={[Role.ADMIN]} requiredRoute="/finance"><FinanceDashboard /></ProtectedRestaurantRoute>} />
                        
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
    <SecurityGuard>
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
    </SecurityGuard>
  );
};

export default App;
