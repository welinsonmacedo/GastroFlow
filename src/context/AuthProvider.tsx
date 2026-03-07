
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
  refreshSession: () => Promise<void>;
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
  const isFetchingSession = useRef(false);

  const startHeartbeat = async (tenantId: string, staffId: string) => {
      try {
          const { data } = await supabase.from('system_access_logs').insert({
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
    if (isFetchingSession.current) {
        console.log('AuthProvider: loadUserFromSession already running, skipping.');
        return;
    }
    isFetchingSession.current = true;

    console.log('AuthProvider: Starting loadUserFromSession...');
    setState(s => ({ ...s, isLoading: true }));
    
    // Safety timeout for auth loading
    const timeoutId = setTimeout(() => {
        console.warn("AuthProvider: loadUserFromSession timed out (10s)");
        setState(s => ({ ...s, isLoading: false }));
        isFetchingSession.current = false;
    }, 10000);

    const slug = getTenantSlug();
    console.log('AuthProvider: slug identified:', slug);
    
    try {
        // IP Blocking Check (Server-side via Edge Function)
        const functionUrl = 'https://mxzlaggtufxeirgcgbhn.supabase.co/functions/v1/bright-responder';
        
        const checkIp = async () => {
            try {
                console.log('AuthProvider: Running IP check...');
                const controller = new AbortController();
                const ipTimeout = setTimeout(() => controller.abort(), 2000);
                const ipResponse = await fetch(functionUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                    },
                    signal: controller.signal
                });
                clearTimeout(ipTimeout);
                
                if (ipResponse && ipResponse.status === 403) {
                    console.warn('AuthProvider: IP blocked, signing out...');
                    await supabase.auth.signOut();
                    window.location.href = '/blocked';
                }
            } catch (err: any) {
                console.log('AuthProvider: IP check skipped or failed:', err.message);
            }
        };
        
        checkIp();

        console.log('AuthProvider: Fetching session...');
        
        // Use Promise.race to prevent getSession from hanging indefinitely
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{data: {session: null}, error: Error}>((_, reject) => {
            setTimeout(() => reject(new Error('Session fetch timeout')), 5000);
        });

        let sessionData;
        try {
            sessionData = await Promise.race([sessionPromise, timeoutPromise]);
        } catch (err: any) {
            console.warn('AuthProvider: getSession timed out or failed:', err.message);
            // If it times out, we assume no session and clear the state
            clearTimeout(timeoutId);
            setState(s => ({ ...s, isLoading: false }));
            isFetchingSession.current = false;
            return;
        }

        const { data: { session }, error: sessionError } = sessionData;
        console.log('AuthProvider: Session response:', { hasSession: !!session, error: sessionError });
        
        if (sessionError) {
            console.error("AuthProvider: Session error:", sessionError.message);
            if (sessionError.message.includes('Refresh Token') || sessionError.message.includes('refresh_token')) {
                await supabase.auth.signOut();
            }
            clearTimeout(timeoutId);
            setState(s => ({ ...s, isLoading: false }));
            isFetchingSession.current = false;
            return;
        }

        if (!session?.user) {
            console.log('AuthProvider: No active session found.');
            clearTimeout(timeoutId);
            setState(s => ({ ...s, isLoading: false }));
            isFetchingSession.current = false;
            return;
        }

        if (session?.user) {
            console.log('AuthProvider: User found in session:', session.user.id);
            // Primeiro verifica se é CLIENTE
            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .select('*')
                .eq('auth_user_id', session.user.id)
                .maybeSingle();

            console.log('AuthProvider: Client query result:', { isClient: !!clientData, error: clientError });

            if (clientData) {
                const user: User = {
                    id: clientData.id,
                    name: clientData.name,
                    role: Role.CLIENT,
                    tenant_id: '', 
                    auth_user_id: session.user.id,
                    email: session.user.email,
                    phone: clientData.phone,
                    documentCpf: clientData.cpf
                };
                console.log('AuthProvider: Authenticated as CLIENT.');
                clearTimeout(timeoutId);
                setState({ currentUser: user, isAuthenticated: true, isLoading: false });
                isFetchingSession.current = false;
                return;
            }

            // Se não for cliente, verifica STAFF
            console.log('AuthProvider: Querying staff for user:', session.user.id);
            
            let staffQuery = supabase
                .from('staff')
                .select('*, tenants(id, slug, name), custom_roles(permissions)')
                .eq('auth_user_id', session.user.id);
            
            // Se tiver slug, filtra pelo tenant específico para garantir segurança
            if (slug) {
                const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).maybeSingle();
                if (tenant) {
                    staffQuery = staffQuery.eq('tenant_id', tenant.id);
                }
            }

            const { data: staffData, error: staffError } = await staffQuery.maybeSingle();
            console.log('AuthProvider: Staff query result:', { hasStaff: !!staffData, error: staffError });

            if (staffData) {
                const t = staffData.tenants;
                // @ts-ignore
                const actualTenantId = Array.isArray(t) ? t[0]?.id : t?.id;
                // @ts-ignore
                const actualSlug = Array.isArray(t) ? t[0]?.slug : t?.slug;

                // Se logou sem slug mas encontrou um, redireciona para manter consistência
                if (!slug && actualSlug) {
                    window.location.href = `/?restaurant=${actualSlug}`;
                    isFetchingSession.current = false;
                    return;
                }

                let allowedRoutes = staffData.allowed_routes || [];
                let allowedFeatures = [];
                
                if (staffData.custom_roles?.permissions) {
                    if (staffData.custom_roles.permissions.allowed_modules) {
                        allowedRoutes = staffData.custom_roles.permissions.allowed_modules;
                    }
                    if (staffData.custom_roles.permissions.allowed_features) {
                        allowedFeatures = staffData.custom_roles.permissions.allowed_features;
                    }
                } else if (staffData.role === 'ADMIN') {
                    allowedRoutes = ['RESTAURANT', 'SNACKBAR', 'DISTRIBUTOR', 'COMMERCE', 'MANAGER', 'CONFIG', 'FINANCE', 'INVENTORY', 'HR'];
                    allowedFeatures = []; 
                } else if (!staffData.custom_role_id && allowedRoutes.length === 0) {
                    if (['WAITER', 'KITCHEN', 'CASHIER'].includes(staffData.role)) {
                        allowedRoutes = ['RESTAURANT'];
                        if (staffData.role === 'CASHIER') allowedRoutes.push('COMMERCE');
                    }
                }

                const user: User = {
                    id: staffData.id,
                    name: staffData.name,
                    role: staffData.role,
                    tenant_id: actualTenantId,
                    auth_user_id: staffData.auth_user_id,
                    email: staffData.email,
                    customRoleId: staffData.custom_role_id,
                    allowedRoutes: allowedRoutes,
                    allowedFeatures: allowedFeatures
                };
                console.log('AuthProvider: Authenticated as STAFF.');
                clearTimeout(timeoutId);
                setState({ currentUser: user, isAuthenticated: true, isLoading: false });
                startHeartbeat(actualTenantId, staffData.id);
                isFetchingSession.current = false;
                return;
            } else {
                // Fallback para Owner Legado
                const { data: tenantData } = await supabase
                    .from('tenants')
                    .select('id, slug, name')
                    .eq('owner_auth_id', session.user.id)
                    .limit(1)
                    .maybeSingle();
                
                if (tenantData) {
                    console.log('AuthProvider: Authenticated as LEGACY OWNER.');
                    window.location.href = `/?restaurant=${tenantData.slug}`;
                    isFetchingSession.current = false;
                    return;
                }
                console.warn('AuthProvider: User is in session but not found in staff or tenants table.');
            }
        }
    } catch (error) {
        console.error("AuthProvider: CRITICAL ERROR during loadUserFromSession:", error);
    }
    clearTimeout(timeoutId);
    setState(s => ({ ...s, isLoading: false }));
    isFetchingSession.current = false;
  };

  useEffect(() => {
    loadUserFromSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string) => {
        if (event === 'SIGNED_IN') {
            await loadUserFromSession();
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
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
    setState({ currentUser: user, isAuthenticated: true, isLoading: false });
    
    const slug = getTenantSlug();
    if(slug) {
        supabase.from('tenants').select('id').eq('slug', slug).single().then(({data}: {data: any}) => {
            if(data) startHeartbeat(data.id, user.id);
        });
    }
  };

  const logout = async () => {
    try {
        await stopHeartbeat(); 
    } catch (e) {
        console.warn("Error stopping heartbeat on logout:", e);
    }

    try {
        await supabase.auth.signOut();
    } catch (e) {
        console.warn("Error signing out:", e);
    }
    
    setState({ currentUser: null, isAuthenticated: false, isLoading: false });
    
    // Preserve the tenant slug in the URL when logging out
    const slug = getTenantSlug();
    if (slug) {
        window.location.href = `/login?restaurant=${slug}`;
    } else {
        window.location.href = '/login';
    }
  };

  const checkPermission = (allowedRoles: Role[]) => {
    if (!state.currentUser) return false;
    if (state.currentUser.role === Role.ADMIN) return true;
    return allowedRoles.includes(state.currentUser.role);
  };

  return (
    <AuthContext.Provider value={{ state, login, logout, checkPermission, refreshSession: loadUserFromSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
