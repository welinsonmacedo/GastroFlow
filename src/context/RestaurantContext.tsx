
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { RestaurantTheme, PlanLimits, RestaurantBusinessInfo, SystemModule } from '../types';
import { getTenantSlug } from '../utils/tenant';
import { supabase } from '../lib/supabase';

interface RestaurantState {
  isLoading: boolean;
  tenantSlug: string | null;
  tenantId: string | null;
  isValidTenant: boolean;
  isInactiveTenant: boolean;
  isAuthorized: boolean;
  tableId: string | null;
  planLimits: PlanLimits;
  allowedModules: SystemModule[];
  allowedFeatures: string[]; // Adicionado
  activeModule: SystemModule | null;
  theme: RestaurantTheme;
  globalSettings: any; // Added
  businessInfo: RestaurantBusinessInfo;
}

type Action =
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'INIT_DATA'; payload: Partial<RestaurantState> }
  | { type: 'TENANT_NOT_FOUND' }
  | { type: 'TENANT_INACTIVE' } 
  | { type: 'SET_AUTHORIZED'; tenantId: string; tableId: string }
  | { type: 'SET_ACTIVE_MODULE'; module: SystemModule }
  | { type: 'UPDATE_THEME'; theme: RestaurantTheme }
  | { type: 'UPDATE_BUSINESS_INFO'; info: RestaurantBusinessInfo }
  | { type: 'SYNC_REALTIME_DATA'; payload: any }
  | { type: 'UPDATE_PLAN_LIMITS'; limits: PlanLimits }
  | { type: 'UPSERT_DELIVERY_METHOD'; method: any }
  | { type: 'DELETE_DELIVERY_METHOD'; id: string }
  | { type: 'UPSERT_PAYMENT_METHOD'; method: any }
  | { type: 'DELETE_PAYMENT_METHOD'; id: string }
  | { type: 'UPSERT_EXPENSE_CATEGORY'; category: any }
  | { type: 'DELETE_EXPENSE_CATEGORY'; id: string };

const initialState: RestaurantState = {
  isLoading: true,
  tenantSlug: null,
  tenantId: null,
  isValidTenant: false,
  isInactiveTenant: false,
  isAuthorized: false,
  tableId: null,
  planLimits: { 
      maxTables: -1, maxProducts: -1, maxStaff: -1, 
      allowKds: true, allowCashier: true, allowReports: true, 
      allowInventory: true, allowPurchases: true, allowExpenses: true, 
      allowStaff: true, allowTableMgmt: true, allowCustomization: true,
      allowHR: true, allowProductImages: true,
      allowProductExtras: true, allowProductDescription: true,
      allowRawMaterials: true, allowCompositeProducts: true
  },
  allowedModules: ['RESTAURANT'],
  allowedFeatures: [], // Inicializa vazio
  activeModule: null,
  theme: { 
      primaryColor: '#22c55e', 
      backgroundColor: '#fff', 
      fontColor: '#000', 
      logoUrl: '', 
      restaurantName: 'Carregando...',
      fontFamily: 'Inter',
      borderRadius: 'lg',
      buttonStyle: 'fill'
  },
  globalSettings: {},
  businessInfo: {
      paymentMethods: [
          { id: '1', name: 'Dinheiro', type: 'CASH', feePercentage: 0, isActive: true },
          { id: '2', name: 'PIX', type: 'PIX', feePercentage: 0, isActive: true },
          { id: '3', name: 'Cartão de Crédito', type: 'CREDIT', feePercentage: 3.99, isActive: true },
          { id: '4', name: 'Cartão de Débito', type: 'DEBIT', feePercentage: 1.99, isActive: true },
      ],
      expenseCategories: [
          { id: '1', name: 'Fornecedor' },
          { id: '2', name: 'Pessoal' },
          { id: '3', name: 'Aluguel' },
          { id: '4', name: 'Impostos' },
          { id: '5', name: 'Manutenção' },
          { id: '6', name: 'Outros' },
      ]
  }, 
};

const restaurantReducer = (state: RestaurantState, action: Action): RestaurantState => {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, isLoading: action.isLoading };
    case 'TENANT_NOT_FOUND': return { ...state, isLoading: false, isValidTenant: false };
    case 'TENANT_INACTIVE': return { ...state, isLoading: false, isValidTenant: true, isInactiveTenant: true };
    case 'SET_AUTHORIZED': return { ...state, isAuthorized: true, tenantId: action.tenantId, tableId: action.tableId, isLoading: true };
    case 'INIT_DATA': return { ...state, ...action.payload, isLoading: false, isValidTenant: true, isInactiveTenant: false };
    case 'SET_ACTIVE_MODULE': return { ...state, activeModule: action.module };
    case 'UPDATE_THEME': return { ...state, theme: action.theme };
    case 'UPDATE_BUSINESS_INFO': return { ...state, businessInfo: action.info };
    case 'SYNC_REALTIME_DATA': 
        return { 
            ...state, 
            theme: action.payload.theme_config || state.theme,
            businessInfo: action.payload.business_info || state.businessInfo,
            allowedModules: action.payload.allowed_modules || state.allowedModules,
            allowedFeatures: action.payload.allowed_features || state.allowedFeatures,
            isInactiveTenant: action.payload.status === 'INACTIVE',
            // If plan changed, we might need to update limits, but we can't do async here.
            // We'll handle the side effect in the component or use a separate effect.
            // For now, let's just update the tenantId/Slug if needed, though unlikely to change.
        };
    case 'UPDATE_PLAN_LIMITS':
        return { ...state, planLimits: action.limits };
    default: return state;
  }
};

const RestaurantContext = createContext<{
  state: RestaurantState;
  dispatch: (action: any) => Promise<void>;
  setActiveModule: (module: SystemModule) => void;
  authorize: (tenantId: string, tableId: string) => void;
} | undefined>(undefined);

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, localDispatch] = useReducer(restaurantReducer, initialState);

  const authorize = (tenantId: string, tableId: string) => {
    sessionStorage.setItem(`fluxeat_auth_${tenantId}`, tableId);
    localDispatch({ type: 'SET_AUTHORIZED', tenantId, tableId });
  };

  const init = useCallback(async () => {
    const slug = getTenantSlug();
    console.log('RestaurantContext init - slug from getTenantSlug:', slug);
    if (!slug) { localDispatch({ type: 'SET_LOADING', isLoading: false }); return; }

    // Verificar se já existe autorização na sessão
    // Precisamos primeiro do tenantId para verificar a sessão específica
    // Mas como o RLS bloqueia o tenant, vamos tentar carregar o tenantId de forma anônima via RPC se necessário
    // Por enquanto, vamos assumir que se houver um token no sessionStorage, tentamos o carregamento
    
    const storedAuth = Object.keys(sessionStorage).find(key => key.startsWith('fluxeat_auth_'));
    
    // Tenta carregar o restaurante sempre que houver um slug, 
    // independente de estar autorizado para uma mesa ou não.
    // O RLS cuidará de proteger os dados sensíveis.
    
    const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id, slug, status, theme_config, business_info, plan, allowed_modules, allowed_features')
        .eq('slug', slug.trim().toLowerCase())
        .maybeSingle();
    
    console.log('RestaurantContext init - tenant found:', tenant);
    
    if (tenantError) {
        console.error("Erro crítico ao buscar restaurante no banco:", tenantError);
        if (tenantError.code === '401' || tenantError.status === 401) {
            console.error("⚠️ ERRO DE AUTENTICAÇÃO (401): Suas chaves do Supabase podem estar incorretas ou o RLS não permite acesso público à tabela 'tenants'.");
        }
    }

    if (!tenant) { 
        console.warn(`Restaurante não encontrado ou acesso revogado (mesa fechada) para o slug: "${slug}"`);
        
        // Se achávamos que estávamos autorizados mas o tenant sumiu, 
        // é porque a mesa foi fechada ou o código expirou.
        if (state.isAuthorized || storedAuth) {
            sessionStorage.removeItem(storedAuth || '');
            localDispatch({ type: 'SET_LOADING', isLoading: false });
            // Forçamos o recarregamento para mostrar o TableCodeGuard
            window.location.reload(); 
            return;
        }

        localDispatch({ type: 'TENANT_NOT_FOUND' }); 
        return; 
    }
    if (tenant.status === 'INACTIVE') { localDispatch({ type: 'TENANT_INACTIVE' }); return; }

    // Fetch Global Settings
    let globalSettings = {};
    try {
        const { data: configData, error: configError } = await supabase
            .from('saas_config')
            .select('global_settings')
            .eq('id', 1)
            .maybeSingle();
        
        if (configData?.global_settings && !configError) {
            globalSettings = configData.global_settings;
        } else {
            const localSettings = localStorage.getItem('flux_saas_global_settings');
            if (localSettings) {
                globalSettings = JSON.parse(localSettings);
            }
        }
    } catch (e) {
        console.warn("saas_config table might not exist yet:", e);
        const localSettings = localStorage.getItem('flux_saas_global_settings');
        if (localSettings) {
            globalSettings = JSON.parse(localSettings);
        }
    }

    // Busca os limites do plano
    let fetchedLimits = initialState.planLimits;
    if (tenant.plan) {
        const { data: planData } = await supabase.from('plans').select('limits').eq('key', tenant.plan).maybeSingle();
        if (planData && planData.limits) {
            fetchedLimits = { ...initialState.planLimits, ...planData.limits };
        }
    }
    
    const mergedBusinessInfo = {
        ...initialState.businessInfo,
        ...(tenant.business_info || {}),
        paymentMethods: (tenant.business_info?.paymentMethods) || initialState.businessInfo.paymentMethods,
        expenseCategories: (tenant.business_info?.expenseCategories) || initialState.businessInfo.expenseCategories
    };

    // Recupera módulo ativo da sessão se houver
    const storedModule = sessionStorage.getItem(`fluxeat_module_${tenant.id}`);
    const initialActiveModule = storedModule as SystemModule | null;

    const isAuthorized = !!sessionStorage.getItem(`fluxeat_auth_${tenant.id}`);

    localDispatch({
        type: 'INIT_DATA',
        payload: {
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            theme: tenant.theme_config || initialState.theme,
            globalSettings: globalSettings,
            businessInfo: mergedBusinessInfo,
            planLimits: fetchedLimits,
            allowedModules: tenant.allowed_modules || ['RESTAURANT'],
            allowedFeatures: tenant.allowed_features || [], // Carrega do banco
            activeModule: initialActiveModule,
            isAuthorized: isAuthorized,
            tableId: isAuthorized ? sessionStorage.getItem(`fluxeat_auth_${tenant.id}`) : null
        }
    });
    sessionStorage.setItem('fluxeat_tenant_slug', tenant.slug);
  }, []);

  useEffect(() => {
    init();
  }, [init, state.isAuthorized]);

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
              async (payload: any) => {
                  if (payload.new) {
                      localDispatch({ type: 'SYNC_REALTIME_DATA', payload: payload.new });
                      
                      // Fetch new plan limits if plan changed
                      if (payload.new.plan && payload.new.plan !== payload.old.plan) {
                          const { data: planData } = await supabase.from('plans').select('limits').eq('key', payload.new.plan).maybeSingle();
                          if (planData && planData.limits) {
                              localDispatch({ type: 'UPDATE_PLAN_LIMITS', limits: { ...initialState.planLimits, ...planData.limits } });
                          }
                      }
                  }
              }
          )
          .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, [state.tenantId]);

  const setActiveModule = (module: SystemModule) => {
      if (state.tenantId) {
          sessionStorage.setItem(`fluxeat_module_${state.tenantId}`, module);
      }
      localDispatch({ type: 'SET_ACTIVE_MODULE', module });
  };

  const dispatch = async (action: any) => {
    const { tenantId } = state;
    if (!tenantId) return;

    try {
        switch (action.type) {
            case 'UPDATE_THEME': 
                await supabase.rpc('update_restaurant_theme', { p_tenant_id: tenantId, p_theme: action.theme });
                localDispatch(action); 
                break;
            case 'UPDATE_BUSINESS_INFO': 
                await supabase.rpc('update_restaurant_business_info', { p_tenant_id: tenantId, p_updates: action.info });
                localDispatch(action); 
                break;
            case 'UPSERT_DELIVERY_METHOD':
                await supabase.rpc('upsert_delivery_method', { p_tenant_id: tenantId, p_method: action.method });
                break;
            case 'DELETE_DELIVERY_METHOD':
                await supabase.rpc('delete_delivery_method', { p_tenant_id: tenantId, p_method_id: action.id });
                break;
            case 'UPSERT_PAYMENT_METHOD':
                await supabase.rpc('upsert_payment_method', { p_tenant_id: tenantId, p_method: action.method });
                break;
            case 'DELETE_PAYMENT_METHOD':
                await supabase.rpc('delete_payment_method', { p_tenant_id: tenantId, p_method_id: action.id });
                break;
            case 'UPSERT_EXPENSE_CATEGORY':
                await supabase.rpc('upsert_expense_category', { p_tenant_id: tenantId, p_category: action.category });
                break;
            case 'DELETE_EXPENSE_CATEGORY':
                await supabase.rpc('delete_expense_category', { p_tenant_id: tenantId, p_cat_id: action.id });
                break;
            default: break; 
        }
    } catch (error) {
        console.error("Error in RestaurantContext dispatch:", error);
        throw error;
    }
  };

  return (
    <RestaurantContext.Provider value={{ state, dispatch, setActiveModule, authorize }}>
      {state.isLoading ? (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        children
      )}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) throw new Error('useRestaurant must be used within a RestaurantProvider');
  return context;
};
