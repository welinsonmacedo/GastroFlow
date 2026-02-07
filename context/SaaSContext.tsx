import React, { createContext, useContext, useReducer } from 'react';
import { RestaurantTenant, PlanType } from '../types';
import { MOCK_TENANTS } from '../constants';

interface SaaSState {
  isAuthenticated: boolean; // Novo: Controle de login do dono
  adminName: string | null;
  tenants: RestaurantTenant[];
}

type SaaSAction =
  | { type: 'LOGIN_ADMIN'; name: string }
  | { type: 'LOGOUT_ADMIN' }
  | { type: 'ADD_TENANT'; tenant: RestaurantTenant }
  | { type: 'TOGGLE_STATUS'; tenantId: string }
  | { type: 'CHANGE_PLAN'; tenantId: string; plan: PlanType };

const initialState: SaaSState = {
  isAuthenticated: false,
  adminName: null,
  tenants: MOCK_TENANTS,
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
      return { ...state, isAuthenticated: false, adminName: null };

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

  return (
    <SaaSContext.Provider value={{ state, dispatch }}>
      {children}
    </SaaSContext.Provider>
  );
};

export const useSaaS = () => {
  const context = useContext(SaaSContext);
  if (!context) throw new Error("useSaaS must be used within SaaSProvider");
  return context;
};