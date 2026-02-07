import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { RestaurantTenant, PlanType } from '../types';
import { supabase } from '../lib/supabase';

interface SaaSState {
  isAuthenticated: boolean; 
  adminName: string | null;
  tenants: RestaurantTenant[];
}

type SaaSAction =
  | { type: 'LOGIN_ADMIN'; name: string }
  | { type: 'LOGOUT_ADMIN' }
  | { type: 'SET_TENANTS'; payload: RestaurantTenant[] } // Nova ação
  | { type: 'ADD_TENANT'; tenant: RestaurantTenant }
  | { type: 'TOGGLE_STATUS'; tenantId: string }
  | { type: 'CHANGE_PLAN'; tenantId: string; plan: PlanType };

const initialState: SaaSState = {
  isAuthenticated: false,
  adminName: null,
  tenants: [], // Inicializa vazio, carrega do DB
};

const SaaSContext = createContext<{
  state: SaaSState;
  dispatch: React.Dispatch<SaaSAction>;
} | undefined>(undefined);

const saasReducer = (state: SaaSState, action: SaaSAction): SaaSState => {
  switch (action.type) {
    case 'LOGIN_ADMIN':
      return { ...state, isAuthenticated: true, adminName: action.name };
    
    case 'LOGOUT_ADMIN':
      return { ...state, isAuthenticated: false, adminName: null, tenants: [] };

    case 'SET_TENANTS':
        return { ...state, tenants: action.payload };

    case 'ADD_TENANT':
      return { ...state, tenants: [...state.tenants, action.tenant] };
    
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
    dispatch(action); // Atualiza UI otimisticamente

    if (action.type === 'CHANGE_PLAN') {
        await supabase.from('tenants').update({ plan: action.plan }).eq('id', action.tenantId);
    }
    if (action.type === 'TOGGLE_STATUS') {
        // Precisamos saber o status atual para inverter, mas aqui estamos otimistas.
        // O ideal seria pegar do state.tenants atualizado, mas como dispatch é assíncrono no React batching, 
        // vamos simplificar fazendo a lógica inversa da UI:
        // Essa simplificação assume que o reducer roda antes ou pegamos o dado atual.
        // Melhor: Apenas disparamos update se tivermos o dado.
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