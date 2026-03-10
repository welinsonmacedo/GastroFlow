
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { RestaurantTheme, PlanLimits, RestaurantBusinessInfo, SystemModule } from '@/types';
import { getTenantSlug } from '@/core/tenant/tenantResolver';
import { supabase } from '@/core/api/supabaseClient';

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
  | { type: 'UPDATE_GLOBAL_SETTINGS'; settings: any }
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
    case 'UPDATE_GLOBAL_SETTINGS': return { ...state, globalSettings: action.settings };
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
    sessionStorage.setItem(`arloflux_auth_${tenantId}`, tableId);
    localDispatch({ type: 'SET_AUTHORIZED', tenantId, tableId });
  };

  const init = useCallback(async () => {
    console.log('RestaurantContext: Starting init...');
    
    // Safety timeout for the entire init process
    const timeoutId = setTimeout(() => {
        console.warn("RestaurantContext: init process timed out (15s)");
        localDispatch({ type: 'SET_LOADING', isLoading: false });
    }, 15000);

    try {
        const slug = getTenantSlug();
        console.log('RestaurantContext: slug identified:', slug);
        
        if (!slug) { 
            console.log('RestaurantContext: No slug found, stopping init.');
            clearTimeout(timeoutId);
            localDispatch({ type: 'SET_LOADING', isLoading: false }); 
            return; 
        }

        // Helper function for timed queries
        const timedQuery = async (promise: Promise<any>, timeoutMs: number = 5000) => {
            return Promise.race([
                promise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), timeoutMs))
            ]);
        };

        // 0. Connection Test
        console.log('RestaurantContext: Testing Supabase connection...');
        try {
            const { error: testError } = await timedQuery(supabase.from('tenants').select('id').limit(1), 3000);
            if (testError) {
                console.warn('RestaurantContext: Supabase connection test warning:', testError);
            } else {
                console.log('RestaurantContext: Supabase connection test successful.');
            }
        } catch (e) {
            console.error('RestaurantContext: Supabase connection test failed (timeout or error):', e);
        }

        // 1. Tenant Query
        console.log(`RestaurantContext: Querying tenants table for slug: "${slug.trim().toLowerCase()}"`);
        
        let tenant = null;
        try {
            const { data: tenants, error: tenantError } = await timedQuery(
                supabase
                    .from('tenants')
                    .select('id, slug, status, theme_config, business_info, plan, allowed_modules, allowed_features')
                    .eq('slug', slug.trim().toLowerCase())
            );
            
            console.log('RestaurantContext: Tenant query response:', { 
                count: tenants?.length, 
                error: tenantError,
                data: tenants ? 'Data received' : 'No data'
            });
            
            if (tenantError) {
                console.error("RestaurantContext: Error querying tenants:", tenantError);
            }
            
            tenant = tenants && tenants.length > 0 ? tenants[0] : null;
        } catch (e) {
            console.error("RestaurantContext: Tenant query timed out or failed:", e);
        }

        console.log('RestaurantContext: Tenant object resolved:', tenant);

        if (!tenant) { 
            console.warn(`RestaurantContext: Tenant not found or query failed for slug: "${slug}"`);
            const storedAuth = Object.keys(sessionStorage).find(key => key.startsWith('arloflux_auth_'));
            
            if (state.isAuthorized || storedAuth) {
                console.log('RestaurantContext: Found stale auth, clearing and reloading...');
                sessionStorage.removeItem(storedAuth || '');
                clearTimeout(timeoutId);
                localDispatch({ type: 'SET_LOADING', isLoading: false });
                window.location.reload(); 
                return;
            }

            clearTimeout(timeoutId);
            localDispatch({ type: 'TENANT_NOT_FOUND' }); 
            return; 
        }

        if (tenant.status === 'INACTIVE') { 
            console.log('RestaurantContext: Tenant is inactive.');
            clearTimeout(timeoutId);
            localDispatch({ type: 'TENANT_INACTIVE' }); 
            return; 
        }

        // 2. Fetch Global Settings
        console.log('RestaurantContext: Fetching global settings...');
        let globalSettings = {};
        try {
            const { data: configData, error: configError } = await timedQuery(
                supabase
                    .from('saas_config')
                    .select('global_settings')
                    .eq('id', 1),
                3000
            );
            
            console.log('RestaurantContext: Global settings response:', { configData, configError });
            
            if (configData && configData.length > 0 && !configError) {
                globalSettings = configData[0].global_settings;
            } else {
                const localSettings = localStorage.getItem('flux_saas_global_settings');
                if (localSettings) globalSettings = JSON.parse(localSettings);
            }
        } catch (e) {
            console.warn("RestaurantContext: saas_config fetch failed or timed out:", e);
            const localSettings = localStorage.getItem('flux_saas_global_settings');
            if (localSettings) globalSettings = JSON.parse(localSettings);
        }

        // 3. Busca os limites do plano
        console.log('RestaurantContext: Fetching plan limits for:', tenant.plan);
        let fetchedLimits = initialState.planLimits;
        if (tenant.plan) {
            try {
                const { data: plans, error: planError } = await timedQuery(
                    supabase.from('plans').select('limits').eq('key', tenant.plan),
                    3000
                );
                console.log('RestaurantContext: Plan limits response:', { plans, planError });
                if (plans && plans.length > 0) {
                    fetchedLimits = { ...initialState.planLimits, ...plans[0].limits };
                }
            } catch (e) {
                console.error("RestaurantContext: Error fetching plan limits:", e);
            }
        }
        
        console.log('RestaurantContext: Preparing final data...');
        const mergedBusinessInfo = {
            ...initialState.businessInfo,
            ...(tenant.business_info || {}),
            paymentMethods: (tenant.business_info?.paymentMethods) || initialState.businessInfo.paymentMethods,
            expenseCategories: (tenant.business_info?.expenseCategories) || initialState.businessInfo.expenseCategories
        };

        const storedModule = sessionStorage.getItem(`arloflux_module_${tenant.id}`);
        const initialActiveModule = storedModule as SystemModule | null;
        const isAuthorized = !!sessionStorage.getItem(`arloflux_auth_${tenant.id}`);

        console.log('RestaurantContext: Dispatching INIT_DATA...');
        clearTimeout(timeoutId);
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
                allowedFeatures: tenant.allowed_features || [],
                activeModule: initialActiveModule,
                isAuthorized: isAuthorized,
                tableId: isAuthorized ? sessionStorage.getItem(`arloflux_auth_${tenant.id}`) : null
            }
        });
        sessionStorage.setItem('arloflux_tenant_slug', tenant.slug);
        console.log('RestaurantContext: Init completed successfully.');
    } catch (error) {
        console.error("RestaurantContext: CRITICAL ERROR during init:", error);
        clearTimeout(timeoutId);
        localDispatch({ type: 'SET_LOADING', isLoading: false });
    }
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

  useEffect(() => {
      const channel = supabase.channel('global_saas_config')
          .on(
              'postgres_changes',
              {
                  event: '*',
                  schema: 'public',
                  table: 'saas_config',
                  filter: 'id=eq.1'
              },
              (payload: any) => {
                  if (payload.new && payload.new.global_settings) {
                      localDispatch({ type: 'UPDATE_GLOBAL_SETTINGS', settings: payload.new.global_settings });
                  }
              }
          )
          .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, []);

  const setActiveModule = (module: SystemModule) => {
      if (state.tenantId) {
          sessionStorage.setItem(`arloflux_module_${state.tenantId}`, module);
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
