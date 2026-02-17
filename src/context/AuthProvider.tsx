
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Role } from '../types';
import { supabase } from '../lib/supabase';
import { getTenantSlug } from '../utils/tenant';

interface AuthState {
  currentUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType {
  state: AuthState;
  login: (user: User) => void;
  logout: () => Promise<void>;
  checkPermission: (allowedRoles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    currentUser: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Ref para armazenar o ID da sessão atual no banco de dados
  const sessionLogId = useRef<string | null>(null);
  const heartbeatInterval = useRef<any>(null);

  // --- Lógica de Heartbeat (Presença) ---
  const startHeartbeat = async (tenantId: string, staffId: string) => {
      try {
          // 1. Cria registro de login inicial
          const { data, error } = await supabase.from('system_access_logs').insert({
              tenant_id: tenantId,
              staff_id: staffId,
              login_at: new Date().toISOString(),
              last_seen_at: new Date().toISOString(),
              device_info: navigator.userAgent
          }).select('id').single();

          if (data) {
              sessionLogId.current = data.id;

              // 2. Inicia intervalo para atualizar last_seen_at a cada 2 minutos
              if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
              
              heartbeatInterval.current = setInterval(async () => {
                  if (sessionLogId.current) {
                      await supabase.from('system_access_logs')
                          .update({ last_seen_at: new Date().toISOString() })
                          .eq('id', sessionLogId.current);
                  }
              }, 120000); // 2 minutos
          }
      } catch (err) {
          console.error("Erro ao iniciar heartbeat", err);
      }
  };

  const stopHeartbeat = async () => {
      if (heartbeatInterval.current) {
          clearInterval(heartbeatInterval.current);
          heartbeatInterval.current = null;
      }

      if (sessionLogId.current) {
          // Registra logout
          await supabase.from('system_access_logs')
              .update({ 
                  logout_at: new Date().toISOString(),
                  last_seen_at: new Date().toISOString()
              })
              .eq('id', sessionLogId.current);
          sessionLogId.current = null;
      }
  };

  const loadUserFromSession = async () => {
    const slug = getTenantSlug();
    if (!slug) {
        setState(s => ({ ...s, isLoading: false }));
        return;
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).maybeSingle();
            if (tenant) {
                const { data: staffData } = await supabase
                    .from('staff')
                    .select('*')
                    .eq('auth_user_id', session.user.id)
                    .eq('tenant_id', tenant.id)
                    .maybeSingle();

                if (staffData) {
                    const user: User = {
                        id: staffData.id,
                        name: staffData.name,
                        role: staffData.role,
                        pin: staffData.pin,
                        auth_user_id: staffData.auth_user_id,
                        email: staffData.email,
                        allowedRoutes: staffData.allowed_routes || []
                    };
                    setState({ currentUser: user, isAuthenticated: true, isLoading: false });
                    
                    // Inicia o monitoramento
                    startHeartbeat(tenant.id, staffData.id);
                    return;
                }
            }
        }
    } catch (error) {
        console.error("Auth Load Error", error);
    }
    setState(s => ({ ...s, isLoading: false }));
  };

  useEffect(() => {
    loadUserFromSession();

    // Cleanup ao desmontar (ex: fechar aba)
    return () => {
        if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
    };
  }, []);

  const login = (user: User) => {
    setState({ currentUser: user, isAuthenticated: true, isLoading: false });
    
    // Precisamos do Tenant ID para iniciar o heartbeat. 
    // Como o 'login' manual geralmente vem após verificar o tenant no Login.tsx, podemos buscar ou assumir que o fluxo recarregará.
    // Para simplificar, o reload da página ou a navegação subsequente que dispara 'loadUserFromSession' cuidará disso,
    // mas se quisermos imediato:
    const slug = getTenantSlug();
    if(slug) {
        supabase.from('tenants').select('id').eq('slug', slug).single().then(({data}) => {
            if(data) startHeartbeat(data.id, user.id);
        });
    }
  };

  const logout = async () => {
    await stopHeartbeat(); // Para o monitoramento antes de sair
    await supabase.auth.signOut();
    setState({ currentUser: null, isAuthenticated: false, isLoading: false });
    window.location.href = '/login';
  };

  const checkPermission = (allowedRoles: Role[]) => {
    if (!state.currentUser) return false;
    if (state.currentUser.role === Role.ADMIN) return true;
    return allowedRoles.includes(state.currentUser.role);
  };

  return (
    <AuthContext.Provider value={{ state, login, logout, checkPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
