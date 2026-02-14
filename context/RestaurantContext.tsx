
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { RestaurantTheme, PlanLimits, RestaurantBusinessInfo } from '../types';
import { getTenantSlug } from '../utils/tenant';
import { supabase } from '../lib/supabase';

// Este contexto agora lida APENAS com a identidade do restaurante
interface RestaurantState {
  isLoading: boolean;
  tenantSlug: string | null;
  tenantId: string | null;
  isValidTenant: boolean;
  isInactiveTenant: boolean;
  planLimits: PlanLimits;
  theme: RestaurantTheme;
  businessInfo: RestaurantBusinessInfo;
}

type Action =
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'INIT_DATA'; payload: Partial<RestaurantState> }
  | { type: 'TENANT_NOT_FOUND' }
  | { type: 'TENANT_INACTIVE' } 
  | { type: 'UPDATE_THEME'; theme: RestaurantTheme }
  | { type: 'UPDATE_BUSINESS_INFO'; info: RestaurantBusinessInfo }
  | { type: 'SYNC_REALTIME_DATA'; payload: any };

const initialState: RestaurantState = {
  isLoading: true,
  tenantSlug: null,
  tenantId: null,
  isValidTenant: false,
  isInactiveTenant: false,
  planLimits: { maxTables: -1, maxProducts: -1, maxStaff: -1, allowKds: true, allowCashier: true, allowReports: true, allowInventory: true, allowPurchases: true, allowExpenses: true, allowStaff: true, allowTableMgmt: true, allowCustomization: true },
  theme: { primaryColor: '#22c55e', backgroundColor: '#fff', fontColor: '#000', logoUrl: '', restaurantName: 'Carregando...' },
  businessInfo: {}, 
};

const restaurantReducer = (state: RestaurantState, action: Action): RestaurantState => {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, isLoading: action.isLoading };
    case 'TENANT_NOT_FOUND': return { ...state, isLoading: false, isValidTenant: false };
    case 'TENANT_INACTIVE': return { ...state, isLoading: false, isValidTenant: true, isInactiveTenant: true };
    case 'INIT_DATA': return { ...state, ...action.payload, isLoading: false, isValidTenant: true, isInactiveTenant: false };
    case 'UPDATE_THEME': return { ...state, theme: action.theme };
    case 'UPDATE_BUSINESS_INFO': return { ...state, businessInfo: action.info };
    case 'SYNC_REALTIME_DATA': 
        return { 
            ...state, 
            theme: action.payload.theme_config || state.theme,
            businessInfo: action.payload.business_info || state.businessInfo,
            isInactiveTenant: action.payload.status === 'INACTIVE'
        };
    default: return state;
  }
};

const RestaurantContext = createContext<{
  state: RestaurantState;
  dispatch: (action: any) => Promise<void>;
} | undefined>(undefined);

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, localDispatch] = useReducer(restaurantReducer, initialState);

  // Função de carga inicial
  const init = useCallback(async () => {
    const slug = getTenantSlug();
    if (!slug) { localDispatch({ type: 'SET_LOADING', isLoading: false }); return; }

    const { data: tenant } = await supabase.from('tenants').select('id, slug, status, theme_config, business_info, plan').eq('slug', slug).maybeSingle();
    
    if (!tenant) { localDispatch({ type: 'TENANT_NOT_FOUND' }); return; }
    if (tenant.status === 'INACTIVE') { localDispatch({ type: 'TENANT_INACTIVE' }); return; }

    localDispatch({
        type: 'INIT_DATA',
        payload: {
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            theme: tenant.theme_config || initialState.theme,
            businessInfo: tenant.business_info || {},
            // Em um cenário real, carregaríamos os limites do plano aqui
        }
    });
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  // Realtime Subscription para Configurações do Restaurante
  useEffect(() => {
      if (!state.tenantId) return;

      const channel = supabase.channel(`restaurant_config:${state.tenantId}`)
          .on(
              'postgres_changes', 
              { 
                  event: 'UPDATE', 
                  schema: 'public', 
                  table: 'tenants', 
                  filter: `id=eq.${state.tenantId}` 
              }, 
              (payload) => {
                  if (payload.new) {
                      localDispatch({ type: 'SYNC_REALTIME_DATA', payload: payload.new });
                  }
              }
          )
          .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, [state.tenantId]);

  const dispatch = async (action: any) => {
    const { tenantId } = state;
    if (!tenantId) return;

    switch (action.type) {
        case 'UPDATE_THEME': 
            await supabase.from('tenants').update({ theme_config: action.theme }).eq('id', tenantId); 
            // O estado local será atualizado pelo Realtime, mas podemos otimizar UI updating optimisticamente se quiser
            localDispatch(action); 
            break;
        case 'UPDATE_BUSINESS_INFO': 
            await supabase.from('tenants').update({ business_info: action.info }).eq('id', tenantId); 
            localDispatch(action); 
            break;
        default: break; 
    }
  };

  return <RestaurantContext.Provider value={{ state, dispatch }}>{children}</RestaurantContext.Provider>;
};

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) throw new Error('useRestaurant must be used within a RestaurantProvider');
  return context;
};
