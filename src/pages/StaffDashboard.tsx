
import React, { useEffect, useState } from 'react';
// @ts-ignore
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import { useAuth } from '../context/AuthProvider';
import { 
    Users, Clock, Calendar, FileText, BarChart3, 
    LogOut, Grid, ChefHat, UserPlus, Timer, Settings, Download
} from 'lucide-react';
import { Role } from '../types';

// Sub-páginas RH
import { StaffList } from './admin/rh/StaffList';
import { StaffSchedules } from './admin/rh/StaffSchedules';
import { StaffPayroll } from './admin/rh/StaffPayroll';
import { StaffAttendance } from './admin/rh/StaffAttendance';
import { StaffSettings } from './admin/rh/StaffSettings'; // Nova Importação

export const StaffDashboard: React.FC = () => {
  const { state: restState } = useRestaurant();
  const { state: authState, logout } = useAuth();
  const { planLimits, allowedFeatures } = restState;
  const location = useLocation();
  const navigate = useNavigate();

  const userRole = authState.currentUser?.role;

  // Definição das Abas RH
  const tabs = [
    { 
        path: '/rh', 
        label: 'Colaboradores', 
        icon: Users, 
        exact: true,
        featureKey: 'rh_staff_list'
    },
    { 
        path: '/rh/attendance', 
        label: 'Controle de Ponto', 
        icon: Timer, 
        featureKey: 'rh_attendance'
    },
    { 
        path: '/rh/schedules', 
        label: 'Escalas & Turnos', 
        icon: Calendar, 
        featureKey: 'rh_schedules'
    },
    { 
        path: '/rh/payroll', 
        label: 'Pré-Folha (💰)', 
        icon: FileText, 
        featureKey: 'rh_payroll'
    },
    { 
        path: '/rh/settings', 
        label: 'Configurações', 
        icon: Settings, 
        featureKey: 'rh_payroll' // Usa a mesma feature key da folha por enquanto ou criar nova
    },
  ];

  const visibleTabs = tabs.filter(tab => {
      // 1. Checa Limites do Plano
      if (!planLimits.allowHR && userRole !== Role.ADMIN) return false;
      
      // 2. Checagem de features (Tenant)
      if (allowedFeatures && allowedFeatures.length > 0) {
          if (!allowedFeatures.includes(tab.featureKey)) return false;
      }

      // 3. Permissões do Usuário (Cargos Personalizados)
      if (authState.currentUser?.role !== 'ADMIN' && authState.currentUser?.customRoleId) {
          const userFeatures = authState.currentUser.allowedFeatures || [];
          if (userFeatures.length > 0) {
              if (!userFeatures.includes(tab.featureKey)) return false;
          }
      }

      return true;
  });

  useEffect(() => {
      if (location.pathname === '/rh' && visibleTabs.length > 0) {
          // navigate(visibleTabs[0].path, { replace: true });
      }
  }, [location.pathname, visibleTabs, navigate]);

  const handleExitToModules = () => navigate('/modules');

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
        
        <header className="bg-pink-700 text-white shadow-lg shrink-0 z-30">
            <div className="max-w-[1920px] mx-auto">
                <div className="px-6 py-4 flex justify-between items-center border-b border-pink-600">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/10">
                            {restState.theme.logoUrl ? (
                                <img src={restState.theme.logoUrl} className="h-8 w-8 object-contain" />
                            ) : (
                                <Users size={24} />
                            )}
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-none tracking-tight">{restState.theme.restaurantName}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded text-white uppercase tracking-widest">
                                    Módulo RH & Equipe
                                </span>
                                <span className="text-[10px] text-pink-100">
                                    {authState.currentUser?.name}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={handleExitToModules} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-pink-800 hover:bg-pink-600 transition-colors border border-pink-600">
                            <Grid size={16} /> Módulos
                        </button>
                        <button onClick={logout} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-red-500/20 text-red-100 hover:bg-red-500 hover:text-white transition-colors border border-red-500/20 hover:border-red-500">
                            <LogOut size={16} /> Sair
                        </button>
                    </div>
                </div>

                <div className="px-6 flex gap-1 overflow-x-auto scrollbar-hide pt-2">
                    {visibleTabs.map(tab => {
                        const isActive = tab.exact 
                            ? location.pathname === tab.path 
                            : location.pathname.startsWith(tab.path);
                        
                        return (
                            <Link key={tab.path} to={tab.path} className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${isActive ? 'border-white text-white bg-white/10 rounded-t-lg' : 'border-transparent text-pink-200 hover:text-white hover:bg-white/5 rounded-t-lg'}`}>
                                <tab.icon size={18} className={isActive ? 'text-white' : 'text-pink-300'} />
                                {tab.label}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50 relative p-4 md:p-8">
            <div className="h-full w-full max-w-[1920px] mx-auto">
                <Routes>
                    <Route path="/" element={<StaffList />} />
                    <Route path="/attendance" element={<StaffAttendance />} />
                    <Route path="/schedules" element={<StaffSchedules />} />
                    <Route path="/payroll" element={<StaffPayroll />} />
                    <Route path="/settings" element={<StaffSettings />} />
                    <Route path="*" element={<Navigate to="" replace />} />
                </Routes>
            </div>
        </main>
    </div>
  );
};
