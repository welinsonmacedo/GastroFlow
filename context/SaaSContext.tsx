
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { RestaurantTenant, PlanType } from '../types';
import { supabase } from '../lib/supabase';

interface SaaSState {
  isAuthenticated: boolean; 
  adminName: string | null;
  adminId: string | null;
  adminEmail: string | null;
  tenants: RestaurantTenant[];
}

type SaaSAction =
  | { type: 'LOGIN_ADMIN'; name: string; id: string; email: string }
  | { type: 'LOGOUT_ADMIN' }
  | { type: 'SET_TENANTS'; payload: RestaurantTenant[] }
  | { type: 'CREATE_TENANT'; payload: { name: string; slug: string; ownerName: string; email: string; plan: PlanType } }
  | { type: 'ADD_TENANT_TO_LIST'; tenant: RestaurantTenant }
  | { type: 'TOGGLE_STATUS'; tenantId: string }
  | { type: 'CHANGE_PLAN'; tenantId: string; plan: PlanType }
  | { type: 'UPDATE_PROFILE'; name: string; email: string };

const initialState: SaaSState = {
  isAuthenticated: false,
  adminName: null,
  adminId: null,
  adminEmail: null,
  tenants: [],
};

const SaaSContext = createContext<{
  state: SaaSState;
  dispatch: React.Dispatch<SaaSAction>;
} | undefined>(undefined);

const saasReducer = (state: SaaSState, action: SaaSAction): SaaSState => {
  switch (action.type) {
    case 'LOGIN_ADMIN':
      return { 
          ...state, 
          isAuthenticated: true, 
          adminName: action.name,
          adminId: action.id,
          adminEmail: action.email
      };
    
    case 'LOGOUT_ADMIN':
      return { ...state, isAuthenticated: false, adminName: null, adminId: null, adminEmail: null, tenants: [] };

    case 'SET_TENANTS':
        return { ...state, tenants: action.payload };

    case 'ADD_TENANT_TO_LIST':
      return { ...state, tenants: [action.tenant, ...state.tenants] };
    
    case 'TOGGLE_STATUS':
      return {
        ...state,
        tenants: state.tenants.map(t => 
          t.id === action.tenantId 
            ? { ...t, status: t.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } 
            : t
        )
      };

    case 'CHANGE_PLAN':
      return {
        ...state,
        tenants: state.tenants.map(t => 
          t.id === action.tenantId 
            ? { ...t, plan: action.plan } 
            : t
        )
      };
    
    case 'UPDATE_PROFILE':
        return { ...state, adminName: action.name, adminEmail: action.email };

    default:
      return state;
  }
};

export const SaaSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(saasReducer, initialState);

  // Efeito para carregar tenants reais ao logar
  useEffect(() => {
    if (state.isAuthenticated) {
        const fetchTenants = async () => {
            const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
            if (data && !error) {
                const mapped: RestaurantTenant[] = data.map(t => ({
                    id: t.id,
                    name: t.name,
                    slug: t.slug || '',
                    ownerName: t.owner_name || '',
                    email: t.email || '',
                    status: t.status as 'ACTIVE' | 'INACTIVE',
                    plan: t.plan as PlanType,
                    joinedAt: new Date(t.created_at)
                }));
                dispatch({ type: 'SET_TENANTS', payload: mapped });
            }
        };
        fetchTenants();
    }
  }, [state.isAuthenticated]);

  // Intercepta ações de mutação para atualizar o Supabase também
  const dispatchWithSideEffects = async (action: SaaSAction) => {
    
    if (action.type === 'CREATE_TENANT') {
        try {
            // 1. Criar Tenant
            const defaultTheme = {
                primaryColor: '#2563eb',
                backgroundColor: '#ffffff',
                fontColor: '#1f2937',
                restaurantName: action.payload.name,
                logoUrl: ''
            };

            const { data: newTenant, error } = await supabase.from('tenants').insert({
                name: action.payload.name,
                slug: action.payload.slug,
                owner_name: action.payload.ownerName,
                email: action.payload.email,
                plan: action.payload.plan,
                status: 'ACTIVE',
                theme_config: defaultTheme
            }).select().single();

            if (error) throw error;

            if (newTenant) {
                // 2. Criar Staff ADMIN padrão para o tenant conseguir logar
                await supabase.from('staff').insert({
                    tenant_id: newTenant.id,
                    name: 'Admin',
                    role: 'ADMIN',
                    pin: '1234' // Pin padrão
                });

                // 3. Atualizar UI
                dispatch({
                    type: 'ADD_TENANT_TO_LIST',
                    tenant: {
                        id: newTenant.id,
                        name: newTenant.name,
                        slug: newTenant.slug,
                        ownerName: newTenant.owner_name,
                        email: newTenant.email,
                        status: newTenant.status,
                        plan: newTenant.plan,
                        joinedAt: new Date(newTenant.created_at)
                    }
                });
            }
        } catch (error) {
            console.error("Erro ao criar tenant:", error);
            alert("Erro ao criar restaurante. Verifique se o SLUG já existe.");
        }
        return; // Retorna para não chamar o dispatch default com payload incorreto
    }

    if (action.type === 'UPDATE_PROFILE') {
        if (state.adminId) {
            // Se for login via Supabase Auth
            const { error } = await supabase.auth.updateUser({ 
                email: action.email,
                data: { name: action.name }
            });
            if (!error) dispatch(action);
            
            // Fallback para tabela saas_admins (legado/demo)
            await supabase.from('saas_admins').update({
                name: action.name,
                email: action.email
            }).eq('id', state.adminId);
        }
        return;
    }

    // Default dispatcher para outras ações
    dispatch(action);

    // Side effects pós-dispatch otimista
    if (action.type === 'CHANGE_PLAN') {
        await supabase.from('tenants').update({ plan: action.plan }).eq('id', action.tenantId);
    }
    if (action.type === 'TOGGLE_STATUS') {
        const tenant = state.tenants.find(t => t.id === action.tenantId);
        if (tenant) {
            const newStatus = tenant.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
            await supabase.from('tenants').update({ status: newStatus }).eq('id', action.tenantId);
        }
    }
  };

  return (
    <SaaSContext.Provider value={{ state, dispatch: dispatchWithSideEffects }}>
      {children}
    </SaaSContext.Provider>
  );
};

export const useSaaS = () => {
  const context = useContext(SaaSContext);
  if (!context) throw new Error("useSaaS must be used within SaaSProvider");
  return context;
};
