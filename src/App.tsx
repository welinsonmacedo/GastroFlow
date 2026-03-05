
import React, { PropsWithChildren } from 'react';
// @ts-ignore
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthProvider'; 
import { RestaurantProvider, useRestaurant } from './context/RestaurantContext';
import { InventoryProvider } from './context/InventoryContext'; 
import { FinanceProvider } from './context/FinanceContext'; 
import { MenuProvider } from './context/MenuContext'; 
import { OrderProvider } from './context/OrderContext'; 
import { StaffProvider } from './context/StaffContext'; 
import { SaaSProvider, useSaaS } from './context/SaaSContext';
import { UIProvider } from './context/UIContext';
import { isSupabaseConfigured } from './lib/supabase';
import { ClientApp } from './pages/ClientApp';
import { AdminDashboard } from './pages/AdminDashboard';
import { FinanceDashboard } from './pages/FinanceDashboard'; 
import { SettingsDashboard } from './pages/SettingsDashboard';
import { RestaurantDashboard } from './pages/RestaurantDashboard';
import { CommerceDashboard } from './pages/CommerceDashboard'; 
import { InventoryDashboard } from './pages/InventoryDashboard';
import { StaffDashboard } from './pages/StaffDashboard'; 
import { AuditDashboard } from './pages/AuditDashboard';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';

import { Login } from './pages/Login';
import { SaaSLogin } from './pages/SaaSLogin';
import { RegisterRestaurant } from './pages/RegisterRestaurant';
import { OwnerLogin } from './pages/OwnerLogin';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { ManualPage } from './pages/ManualPage';
import { ModuleSelector } from './pages/ModuleSelector';
import { TimeClock } from './pages/TimeClock'; // Nova Importação

import { InstallPWA } from './components/InstallPWA';
import { PwaGuard } from './components/PwaGuard'; 
import { CookieConsent } from './components/CookieConsent'; 
import { Lock } from 'lucide-react';
import { Role } from './types';
import { getTenantSlug } from './utils/tenant';

interface ProtectedRouteProps {
    allowedRoles?: Role[];
    requiredRoute?: string;
    requiredFeature?: 'allowKds' | 'allowCashier' | 'allowReports' | 'allowInventory' | 'allowHR';
}

const ProtectedRestaurantRoute = ({ children, allowedRoles, requiredRoute, requiredFeature }: PropsWithChildren<ProtectedRouteProps>) => {
    const { state: authState, checkPermission } = useAuth();
    const { state: restState } = useRestaurant();
    
    if (authState.isLoading || restState.isLoading) return <div className="h-screen flex items-center justify-center font-bold text-gray-500">Carregando...</div>;

    if (!authState.isAuthenticated || !authState.currentUser) {
        return <Navigate to={`/login${window.location.search}`} replace />;
    }

    // Se a rota for /time-clock, não verifica modulo ativo
    if (requiredRoute !== '/time-clock') {
         if (!restState.activeModule && restState.allowedModules.length > 0) {
             return <Navigate to="/modules" replace />;
        }
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
        const slug = getTenantSlug();
        const hostname = window.location.hostname;
        const search = window.location.search;
        const isConfigured = isSupabaseConfigured();
        
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
                <div className="bg-orange-100 p-6 rounded-full mb-6 text-orange-600 shadow-xl border border-orange-200">
                    <AlertCircle size={64} />
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Restaurante não encontrado</h1>
                <p className="text-gray-500 max-w-md">Não foi possível identificar o restaurante através deste link. Verifique se a URL está correta ou se o restaurante existe.</p>
                
                <div className="mt-6 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-md text-left space-y-4">
                    <div className="flex justify-between items-center border-b pb-2 mb-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Diagnóstico do Sistema</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isConfigured ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {isConfigured ? 'Supabase OK' : 'Supabase Desconectado'}
                        </span>
                    </div>
                    
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Slug Identificado</p>
                        <p className="font-mono text-sm font-bold text-slate-700 bg-gray-50 p-2 rounded border">{slug || '(Nenhum)'}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Hostname</p>
                        <p className="font-mono text-xs text-slate-500 truncate">{hostname}</p>
                    </div>
                    {search && (
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Parâmetros da URL</p>
                            <p className="font-mono text-xs text-slate-500 break-all bg-gray-50 p-2 rounded border">{search}</p>
                        </div>
                    )}
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full max-w-md">
                    <button onClick={() => window.location.reload()} className="flex-1 px-6 py-3 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors shadow-lg">Tentar Novamente</button>
                    <Link to="/login-owner" className="flex-1 px-6 py-3 bg-white text-slate-800 border-2 border-gray-100 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors">Área do Proprietário</Link>
                </div>
                
                <p className="mt-8 text-[10px] text-gray-400 uppercase font-bold tracking-widest">Dica: O link deve conter ?restaurant=seu-slug</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-row bg-gray-50 overflow-hidden relative">
            <div className="flex-1 overflow-hidden relative flex flex-col w-full">
                <div className="flex-1 overflow-y-auto">
                    <Routes>
                        <Route path="/" element={<Navigate to={`/login${window.location.search}`} replace />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/manual" element={<ManualPage />} />
                        
                        <Route path="/client/table/:tableId" element={<ClientApp />} />
                        <Route path="/modules" element={<ModuleSelector />} />
                        
                        {/* Rota para Bater Ponto - Acessível a todos logados */}
                        <Route path="/time-clock" element={<ProtectedRestaurantRoute requiredRoute="/time-clock" requiredFeature="allowHR"><TimeClock /></ProtectedRestaurantRoute>} />
                        
                        <Route path="/restaurant/*" element={<ProtectedRestaurantRoute requiredRoute="/restaurant"><RestaurantDashboard /></ProtectedRestaurantRoute>} />
                        <Route path="/commerce/*" element={<ProtectedRestaurantRoute requiredRoute="/commerce"><CommerceDashboard /></ProtectedRestaurantRoute>} />
                        <Route path="/inventory/*" element={<ProtectedRestaurantRoute requiredRoute="/inventory" requiredFeature="allowInventory"><InventoryDashboard /></ProtectedRestaurantRoute>} />
                        <Route path="/rh/*" element={<ProtectedRestaurantRoute requiredRoute="/rh" requiredFeature="allowHR"><StaffDashboard /></ProtectedRestaurantRoute>} />
                        <Route path="/audit/*" element={<ProtectedRestaurantRoute allowedRoles={[Role.ADMIN]} requiredRoute="/audit"><AuditDashboard /></ProtectedRestaurantRoute>} />

                        <Route path="/admin/*" element={<ProtectedRestaurantRoute allowedRoles={[Role.ADMIN]} requiredRoute="/admin"><AdminDashboard /></ProtectedRestaurantRoute>} />
                        <Route path="/settings/*" element={<ProtectedRestaurantRoute allowedRoles={[Role.ADMIN]} requiredRoute="/settings"><SettingsDashboard /></ProtectedRestaurantRoute>} />
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
        <BrowserRouter>
            <UIProvider>
                <PwaGuard>
                    <CookieConsent />
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
                                <Route path="/" element={<Navigate to="/login-owner" replace />} />
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
                </PwaGuard>
            </UIProvider>
        </BrowserRouter>
  );
};

export default App;
