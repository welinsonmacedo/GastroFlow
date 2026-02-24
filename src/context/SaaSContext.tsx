
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { RestaurantTenant, PlanType, Plan, SystemModule } from '../types';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { useUI } from './UIContext';

export const uploadImage = async (file: File, path: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    try {
        // Try to upload
        const { error: uploadError } = await supabase.storage
            .from('branding')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('branding')
            .getPublicUrl(filePath);

        return data.publicUrl;
    } catch (e) {
        console.warn("Storage Error, falling back to base64:", e);
        // Fallback to base64 if bucket doesn't exist or RLS fails
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
};

const env: any = import.meta.env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || '';

export interface GlobalSettings {
  moduleSelectorBgUrl?: string;
  loginBgUrl?: string;
  loginBoxColor?: string;
  moduleIcons?: Record<string, string>;
}

export interface SaaSState {
  isAuthenticated: boolean; 
  adminName: string | null;
  adminId: string | null;
  adminEmail: string | null;
  tenants: RestaurantTenant[];
  plans: Plan[];
  globalSettings: GlobalSettings;
}

type SaaSAction =
  | { type: 'LOGIN_ADMIN'; name: string; id: string; email: string }
  | { type: 'LOGOUT_ADMIN' }
  | { type: 'SET_TENANTS'; payload: RestaurantTenant[] }
  | { type: 'UPDATE_TENANT_STATS'; payload: { id: string; count: number }[] }
  | { type: 'SET_PLANS'; payload: Plan[] }
  | { type: 'CREATE_TENANT'; payload: { name: string; slug: string; ownerName: string; email: string; plan: PlanType } }
  | { type: 'UPDATE_TENANT'; payload: { id: string; name: string; slug: string; ownerName: string; email: string; plan?: PlanType; theme?: any } }
  | { type: 'UPDATE_TENANT_MODULES'; tenantId: string; modules: SystemModule[]; features: string[] }
  | { type: 'UPDATE_TENANT_LIMITS'; tenantId: string; limits: any }
  | { type: 'CREATE_TENANT_ADMIN'; payload: { tenantId: string; name: string; email: string; pin: string; password?: string } }
  | { type: 'ADD_TENANT_TO_LIST'; tenant: RestaurantTenant }
  | { type: 'TOGGLE_STATUS'; tenantId: string }
  | { type: 'CHANGE_PLAN'; tenantId: string; plan: PlanType }
  | { type: 'UPDATE_PROFILE'; name: string; email: string }
  | { type: 'UPDATE_GLOBAL_SETTINGS'; settings: GlobalSettings }
  | { type: 'UPDATE_PLAN_DETAILS'; plan: Plan }
  | { type: 'CREATE_PLAN'; plan: Omit<Plan, 'id'> }
  | { type: 'DELETE_PLAN'; planId: string };

const initialState: SaaSState = {
  isAuthenticated: false,
  adminName: null,
  adminId: null,
  adminEmail: null,
  tenants: [],
  plans: [],
  globalSettings: {}
};

const SaaSContext = createContext<{
  state: SaaSState;
  dispatch: (action: SaaSAction) => Promise<void>;
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

    case 'UPDATE_TENANT_STATS':
        return {
            ...state,
            tenants: state.tenants.map(t => {
                const stat = action.payload.find(s => s.id === t.id);
                return stat ? { ...t, requestCount: stat.count } : t;
            })
        };
    
    case 'SET_PLANS':
        return { ...state, plans: action.payload };

    case 'ADD_TENANT_TO_LIST':
      if (state.tenants.some(t => t.id === action.tenant.id)) return state;
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
    
    case 'UPDATE_TENANT':
      return {
        ...state,
        tenants: state.tenants.map(t => 
          t.id === action.payload.id
            ? { 
                ...t, 
                name: action.payload.name, 
                slug: action.payload.slug, 
                ownerName: action.payload.ownerName, 
                email: action.payload.email,
                plan: action.payload.plan || t.plan,
                theme: action.payload.theme || t.theme
              } 
            : t
        )
      };

    case 'UPDATE_TENANT_MODULES':
      return {
          ...state,
          tenants: state.tenants.map(t => 
              t.id === action.tenantId
                  ? { ...t, allowedModules: action.modules, allowedFeatures: action.features }
                  : t
          )
      };

    case 'UPDATE_TENANT_LIMITS':
      return {
          ...state,
          tenants: state.tenants.map(t => 
              t.id === action.tenantId
                  ? { ...t, customLimits: action.limits }
                  : t
          )
      };
    
    case 'UPDATE_PROFILE':
        return { ...state, adminName: action.name, adminEmail: action.email };

    case 'UPDATE_GLOBAL_SETTINGS':
        return { ...state, globalSettings: action.settings };

    case 'UPDATE_PLAN_DETAILS':
        return {
            ...state,
            plans: state.plans.map(p => p.id === action.plan.id ? action.plan : p)
        };

    case 'CREATE_PLAN':
        // Optimistic update, will be replaced by fetch or real ID
        return {
            ...state,
            plans: [...state.plans, { ...action.plan, id: 'temp-' + Date.now() }] 
        };

    case 'DELETE_PLAN':
        return {
            ...state,
            plans: state.plans.filter(p => p.id !== action.planId)
        };

    default:
      return state;
  }
};

export const SaaSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(saasReducer, initialState);
  const { showAlert } = useUI();

  useEffect(() => {
      const restoreSession = async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && !state.isAuthenticated) {
              dispatch({ 
                  type: 'LOGIN_ADMIN', 
                  name: session.user.user_metadata?.name || 'Admin', 
                  id: session.user.id, 
                  email: session.user.email || ''
              });
          }
      };
      restoreSession();
  }, []);

    const fetchPlans = async () => {
         const { data } = await supabase.from('plans').select('*').order('created_at', { ascending: true });
         if(data) {
             const mappedPlans: Plan[] = data.map(p => ({
                 id: p.id,
                 key: p.key as PlanType,
                 name: p.name,
                 price: p.price,
                 period: p.period,
                 features: p.features || [], 
                 limits: { 
                     maxTables: p.limits?.maxTables ?? 10,
                     maxProducts: p.limits?.maxProducts ?? 30,
                     maxStaff: p.limits?.maxStaff ?? 2,
                     allowKds: p.limits?.allowKds ?? false,
                     allowCashier: p.limits?.allowCashier ?? false,
                     allowReports: p.limits?.allowReports ?? false,
                     allowInventory: p.limits?.allowInventory ?? false,
                     allowPurchases: p.limits?.allowPurchases ?? false,
                     allowExpenses: p.limits?.allowExpenses ?? false,
                     allowStaff: p.limits?.allowStaff ?? true,
                     allowTableMgmt: p.limits?.allowTableMgmt ?? true,
                     allowCustomization: p.limits?.allowCustomization ?? true,
                     allowProductImages: p.limits?.allowProductImages ?? true,
                     allowedModules: p.limits?.allowedModules || p.allowed_modules || [],
                     allowedFeatures: p.limits?.allowedFeatures || p.allowed_features || []
                 },
                 is_popular: p.is_popular,
                 button_text: p.button_text
             }));
             dispatch({ type: 'SET_PLANS', payload: mappedPlans });
         }
    };

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (state.isAuthenticated) {
        const fetchTenants = async () => {
            try {
                // Fetch Global Settings
                try {
                    const { data: configData, error: configError } = await supabase
                        .from('saas_config')
                        .select('global_settings')
                        .eq('id', 1)
                        .maybeSingle();
                    
                    if (configData && !configError) {
                        dispatch({ type: 'UPDATE_GLOBAL_SETTINGS', settings: configData.global_settings });
                    } else {
                        const localSettings = localStorage.getItem('flux_saas_global_settings');
                        if (localSettings) {
                            dispatch({ type: 'UPDATE_GLOBAL_SETTINGS', settings: JSON.parse(localSettings) });
                        }
                    }
                } catch (e) {
                    console.warn("saas_config table might not exist yet, using localStorage:", e);
                    const localSettings = localStorage.getItem('flux_saas_global_settings');
                    if (localSettings) {
                        dispatch({ type: 'UPDATE_GLOBAL_SETTINGS', settings: JSON.parse(localSettings) });
                    }
                }

                const { data, error } = await supabase
                    .from('tenants')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!isMounted) return;
                if (error) throw error;

                if (data) {
                    const mapped: RestaurantTenant[] = data.map((t: any) => ({
                        id: t.id,
                        name: t.name,
                        slug: t.slug || '',
                        ownerName: t.owner_name || '',
                        email: t.email || '',
                        status: t.status as 'ACTIVE' | 'INACTIVE',
                        plan: t.plan as PlanType,
                        joinedAt: new Date(t.created_at),
                        requestCount: 0, 
                        businessInfo: t.business_info || {},
                        theme: t.theme_config || {},
                        allowedModules: t.allowed_modules || ['RESTAURANT'],
                        allowedFeatures: t.allowed_features || [],
                        customLimits: t.custom_limits || null
                    }));
                    dispatch({ type: 'SET_TENANTS', payload: mapped });
                    fetchTenantStats(mapped.map(t => t.id));
                }
            } catch (err: any) {
                console.error(`Erro ao buscar restaurantes:`, err);
            }
        };

        const fetchTenantStats = async (tenantIds: string[]) => {
            if (tenantIds.length === 0) return;
            try {
                const { data } = await supabase.from('tenants').select('id, audit_logs(count)');
                if (!isMounted) return;
                if (data) {
                    const stats = data.map((t: any) => ({
                        id: t.id,
                        count: (t.audit_logs && t.audit_logs[0] && t.audit_logs[0].count) || 0
                    }));
                    dispatch({ type: 'UPDATE_TENANT_STATS', payload: stats });
                }
            } catch (e) {
                console.warn("Falha stats", e);
            }
        };

        fetchTenants();

        const channel = supabase.channel('saas_admin_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, fetchTenants)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, fetchPlans)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'saas_config' }, fetchTenants)
            .subscribe();

        return () => { 
            isMounted = false; 
            supabase.removeChannel(channel); 
        };
    }
  }, [state.isAuthenticated]);

  const dispatchWithSideEffects = async (action: SaaSAction) => {
    if (action.type === 'CREATE_TENANT') {
        try {
            const { data: existing } = await supabase.from('tenants').select('id').eq('slug', action.payload.slug).maybeSingle();
            if (existing) {
                showAlert({ title: "Endereço Indisponível", message: "Slug já em uso.", type: 'WARNING' });
                return; 
            }

            const defaultTheme = { primaryColor: '#2563eb', backgroundColor: '#ffffff', fontColor: '#1f2937', restaurantName: action.payload.name, logoUrl: '' };

            const { data: newTenant, error } = await supabase.from('tenants').insert({
                name: action.payload.name,
                slug: action.payload.slug,
                owner_name: action.payload.ownerName,
                email: action.payload.email,
                plan: action.payload.plan,
                status: 'ACTIVE',
                theme_config: defaultTheme,
                allowed_modules: ['RESTAURANT'] 
            }).select().single();

            if (error) throw error;

            if (newTenant) {
                await supabase.from('staff').insert({ tenant_id: newTenant.id, name: 'Admin', role: 'ADMIN', pin: '1234' });
                
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
                        joinedAt: new Date(newTenant.created_at),
                        requestCount: 0,
                        businessInfo: {},
                        allowedModules: ['RESTAURANT'],
                        allowedFeatures: []
                    }
                });
            }
        } catch (error: any) {
            console.error("Erro ao criar tenant:", error);
            showAlert({ title: "Erro", message: "Erro ao criar restaurante.", type: 'ERROR' });
        }
        return;
    }

    if (action.type === 'UPDATE_TENANT') {
        try {
            let plan: string | null = null;
            let allowed_modules: string[] | null = null;
            let allowed_features: string[] | null = null;

            // Se o plano mudou, incluímos as atualizações de plano aqui para evitar race conditions
            if (action.payload.plan) {
                const tenant = state.tenants.find(t => t.id === action.payload.id);
                
                if (tenant && tenant.plan !== action.payload.plan) {
                    plan = action.payload.plan;
                    
                    // Fetch fresh plan data from DB to ensure we have the latest limits/modules
                    const { data: planData } = await supabase.from('plans').select('*').eq('key', action.payload.plan).maybeSingle();

                    if (planData) {
                        const limits = planData.limits || {};
                        allowed_modules = limits.allowedModules || planData.allowed_modules || ['RESTAURANT'];
                        allowed_features = limits.allowedFeatures || planData.allowed_features || [];
                    }
                }
            }

            const { data, error } = await supabase.rpc('update_tenant_by_saas_admin', {
                p_admin_id: state.adminId,
                p_tenant_id: action.payload.id,
                p_name: action.payload.name,
                p_slug: action.payload.slug,
                p_owner_name: action.payload.ownerName,
                p_email: action.payload.email,
                p_plan: plan,
                p_allowed_modules: allowed_modules,
                p_allowed_features: allowed_features
            });

            if (error) throw error;
            if (data && data.success === false) throw new Error(data.error || 'Unknown error');

            // Update theme separately to ensure it works even if RPC doesn't support it yet
            if (action.payload.theme) {
                await supabase.from('tenants').update({ theme_config: action.payload.theme }).eq('id', action.payload.id);
            }

            dispatch(action);
            showAlert({ title: "Sucesso", message: "Restaurante atualizado!", type: 'SUCCESS' });
        } catch (error) {
            console.error("Erro ao atualizar tenant:", error);
            showAlert({ title: "Erro", message: "Erro ao atualizar.", type: 'ERROR' });
            throw error;
        }
        return;
    }

    if (action.type === 'UPDATE_TENANT_MODULES') {
        try {
            const { error } = await supabase.from('tenants').update({
                allowed_modules: action.modules,
                allowed_features: action.features
            }).eq('id', action.tenantId);
            
            if (error) throw error;
            
            dispatch(action);
            showAlert({ title: "Sucesso", message: "Módulos e permissões atualizados!", type: 'SUCCESS' });
        } catch (error) {
            console.error(error);
            showAlert({ title: "Erro", message: "Erro ao atualizar módulos.", type: 'ERROR' });
        }
        return;
    }

    if (action.type === 'UPDATE_TENANT_LIMITS') {
        try {
            const { error } = await supabase.from('tenants').update({
                custom_limits: action.limits
            }).eq('id', action.tenantId);
            
            if (error) throw error;
            
            dispatch(action);
            showAlert({ title: "Sucesso", message: "Limites atualizados!", type: 'SUCCESS' });
        } catch (error) {
            console.error(error);
            showAlert({ title: "Erro", message: "Erro ao atualizar limites.", type: 'ERROR' });
        }
        return;
    }

    if (action.type === 'CREATE_TENANT_ADMIN') {
        try {
            let authUserId = null;
            if (action.payload.password) {
                const tempClient: any = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
                const { data: authData, error: authError } = await tempClient.auth.signUp({
                    email: action.payload.email,
                    password: action.payload.password,
                    options: { data: { name: action.payload.name } }
                });
                if (authError) { showAlert({ title: "Erro Auth", message: authError.message, type: 'ERROR' }); } 
                else if (authData.user) { authUserId = authData.user.id; }
            }
            const { error } = await supabase.from('staff').insert({
                tenant_id: action.payload.tenantId,
                name: action.payload.name,
                email: action.payload.email,
                role: 'ADMIN',
                pin: action.payload.pin,
                auth_user_id: authUserId
            });
            if (error) throw error;
            showAlert({ title: "Sucesso", message: "Admin criado!", type: 'SUCCESS' });
        } catch (error: any) {
             showAlert({ title: "Erro", message: error.message, type: 'ERROR' });
        }
        return;
    }

    if (action.type === 'UPDATE_PROFILE') {
        if (state.adminId) {
            await supabase.auth.updateUser({ email: action.email, data: { name: action.name } });
            await supabase.from('saas_admins').update({ name: action.name, email: action.email }).eq('id', state.adminId);
            dispatch(action);
        }
        return;
    }
    
    if (action.type === 'UPDATE_GLOBAL_SETTINGS') {
        try {
            const { error } = await supabase
                .from('saas_config')
                .upsert({ id: 1, global_settings: action.settings }, { onConflict: 'id' });
            
            if (error) {
                console.warn("Database Error, falling back to localStorage:", error);
                localStorage.setItem('flux_saas_global_settings', JSON.stringify(action.settings));
            }
            
            dispatch(action);
            showAlert({ title: "Sucesso", message: "Configurações globais atualizadas!", type: 'SUCCESS' });
        } catch (error: any) {
            console.error(error);
            // Fallback
            localStorage.setItem('flux_saas_global_settings', JSON.stringify(action.settings));
            dispatch(action);
            showAlert({ title: "Sucesso", message: "Configurações salvas localmente (tabela não encontrada).", type: 'SUCCESS' });
        }
        return;
    }

    if (action.type === 'UPDATE_PLAN_DETAILS') {
        const { error } = await supabase.from('plans').update({
            name: action.plan.name, 
            price: action.plan.price, 
            features: action.plan.features, 
            limits: action.plan.limits, 
            button_text: action.plan.button_text
        }).eq('id', action.plan.id);
        
        if (!error) {
            dispatch(action);
            
            // Propagate changes to all tenants with this plan
            // We update allowed_modules, allowed_features and custom_limits (which stores the plan limits)
            try {
                const { error: propError } = await supabase.from('tenants')
                    .update({
                        allowed_modules: action.plan.limits?.allowedModules || [],
                        allowed_features: action.plan.limits?.allowedFeatures || [],
                        custom_limits: action.plan.limits || {}
                    })
                    .eq('plan', action.plan.key);

                if (propError) {
                    console.error("Erro ao propagar atualizações do plano para os tenants:", propError);
                    showAlert({ title: "Aviso", message: "Plano salvo, mas houve erro ao atualizar alguns clientes.", type: 'WARNING' });
                } else {
                    showAlert({ title: "Sucesso", message: "Plano atualizado e propagado para todos os clientes!", type: 'SUCCESS' });
                }
            } catch (err) {
                console.error("Erro na propagação:", err);
            }
        }
        else showAlert({ title: "Erro", message: "Erro ao salvar plano.", type: 'ERROR' });
        return;
    }

    if (action.type === 'CREATE_PLAN') {
        try {
            const { data, error } = await supabase.from('plans').insert({
                key: action.plan.key,
                name: action.plan.name,
                price: action.plan.price,
                period: action.plan.period,
                features: action.plan.features,
                limits: action.plan.limits,
                button_text: action.plan.button_text,
                is_popular: action.plan.is_popular
            }).select().single();

            if (error) throw error;
            
            // Refresh plans to get the real ID
            const { data: plans } = await supabase.from('plans').select('*').order('created_at', { ascending: true });
            if (plans) {
                 const mappedPlans: Plan[] = plans.map(p => ({
                     id: p.id,
                     key: p.key as PlanType,
                     name: p.name,
                     price: p.price,
                     period: p.period,
                     features: p.features || [],
                     limits: {
                         ...p.limits,
                         allowedModules: p.limits?.allowedModules || p.allowed_modules || [],
                         allowedFeatures: p.limits?.allowedFeatures || p.allowed_features || []
                     },
                     is_popular: p.is_popular,
                     button_text: p.button_text
                 }));
                 dispatch({ type: 'SET_PLANS', payload: mappedPlans });
            }
            showAlert({ title: "Sucesso", message: "Plano criado com sucesso!", type: 'SUCCESS' });
        } catch (error: any) {
            console.error(error);
            showAlert({ title: "Erro", message: "Erro ao criar plano.", type: 'ERROR' });
        }
        return;
    }

    if (action.type === 'DELETE_PLAN') {
        try {
            const { error } = await supabase.from('plans').delete().eq('id', action.planId);
            if (error) throw error;
            dispatch(action);
            showAlert({ title: "Sucesso", message: "Plano removido!", type: 'SUCCESS' });
        } catch (error) {
            showAlert({ title: "Erro", message: "Erro ao remover plano.", type: 'ERROR' });
        }
        return;
    }

    dispatch(action);

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
