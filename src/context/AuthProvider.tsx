
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Role } from '../types';
import { supabase } from '../lib/supabase';
import { getTenantSlug } from '../utils/tenant';
import { checkRateLimit } from '../utils/security';

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

  const sessionLogId = useRef<string | null>(null);
  const heartbeatInterval = useRef<any>(null);

  const startHeartbeat = async (tenantId: string, staffId: string) => {
      try {
          const { data, error } = await supabase.from('system_access_logs').insert({
              tenant_id: tenantId,
              staff_id: staffId,
              login_at: new Date().toISOString(),
              last_seen_at: new Date().toISOString(),
              device_info: navigator.userAgent
          }).select('id').single();

          if (data) {
              sessionLogId.current = data.id;
              if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
              heartbeatInterval.current = setInterval(async () => {
                  if (sessionLogId.current) {
                      await supabase.from('system_access_logs')
                          .update({ last_seen_at: new Date().toISOString() })
                          .eq('id', sessionLogId.current);
                  }
              }, 120000); 
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
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error("Session error:", error.message);
            if (error.message.includes('Refresh Token') || error.message.includes('refresh_token')) {
                await supabase.auth.signOut();
            }
        }

        if (session?.user) {
            const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).maybeSingle();
            if (tenant) {
                const { data: staffData } = await supabase
                    .from('staff')
                    .select('*, custom_roles(permissions)')
                    .eq('auth_user_id', session.user.id)
                    .eq('tenant_id', tenant.id)
                    .maybeSingle();

                if (staffData) {
                    let allowedRoutes = staffData.allowed_routes || [];
                    let allowedFeatures = [];
                    
                    // Se tiver cargo personalizado, sobrepõe com as permissões do cargo
                    if (staffData.custom_roles?.permissions) {
                        if (staffData.custom_roles.permissions.allowed_modules) {
                            allowedRoutes = staffData.custom_roles.permissions.allowed_modules;
                        }
                        if (staffData.custom_roles.permissions.allowed_features) {
                            allowedFeatures = staffData.custom_roles.permissions.allowed_features;
                        }
                    } else if (staffData.role === 'ADMIN') {
                        // Admin vê tudo por padrão se não tiver restrição explícita
                        allowedRoutes = ['RESTAURANT', 'SNACKBAR', 'DISTRIBUTOR', 'COMMERCE', 'MANAGER', 'CONFIG', 'FINANCE', 'INVENTORY', 'HR'];
                        // Para admin, as features são controladas pelo plano (restState), 
                        // mas vamos inicializar vazio para não restringir aqui
                        allowedFeatures = []; 
                    } else if (!staffData.custom_role_id && allowedRoutes.length === 0) {
                        // Defaults para cargos padrão se não houver rotas definidas
                        if (['WAITER', 'KITCHEN', 'CASHIER'].includes(staffData.role)) {
                            allowedRoutes = ['RESTAURANT'];
                            if (staffData.role === 'CASHIER') allowedRoutes.push('COMMERCE');
                        }
                    }

                    const user: User = {
                        id: staffData.id,
                        name: staffData.name,
                        role: staffData.role,
                        tenant_id: tenant.id, // Adicionado aqui
                        auth_user_id: staffData.auth_user_id,
                        email: staffData.email,
                        customRoleId: staffData.custom_role_id,
                        allowedRoutes: allowedRoutes,
                        allowedFeatures: allowedFeatures
                    };
                    setState({ currentUser: user, isAuthenticated: true, isLoading: false });
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
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string) => {
        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            await stopHeartbeat();
            setState({ currentUser: null, isAuthenticated: false, isLoading: false });
        } else if (event === 'TOKEN_REFRESHED') {
            // Token was successfully refreshed
        }
    });

    return () => {
        if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
        subscription.unsubscribe();
    };
  }, []);

  const login = (user: User) => {
    // RATE LIMIT NO LOGIN MANUAL
    if (!checkRateLimit('login_attempt', 5, 60000)) {
        alert("Muitas tentativas de login. Aguarde um minuto.");
        return;
    }

    setState({ currentUser: user, isAuthenticated: true, isLoading: false });
    
    const slug = getTenantSlug();
    if(slug) {
        supabase.from('tenants').select('id').eq('slug', slug).single().then(({data}: {data: any}) => {
            if(data) startHeartbeat(data.id, user.id);
        });
    }
  };

  const logout = async () => {
    await stopHeartbeat(); 
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
