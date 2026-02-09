
import React, { createContext, useContext, useEffect, useState } from 'react';
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

  const loadUserFromSession = async () => {
    const slug = getTenantSlug();
    if (!slug) {
        setState(s => ({ ...s, isLoading: false }));
        return;
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            // Tenta buscar o staff vinculado a este tenant
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
  }, []);

  const login = (user: User) => {
    setState({ currentUser: user, isAuthenticated: true, isLoading: false });
  };

  const logout = async () => {
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
