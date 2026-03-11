
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { RestaurantTenant, PlanType, Plan, SystemModule } from '@/types';
import { supabase } from '@/core/api/supabaseClient';
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
        console.error("Storage Error:", e);
        throw new Error("Falha ao fazer upload da imagem. Verifique se o bucket 'branding' existe e está público.");
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
  pwaRequired?: boolean;
  esocialTemplates?: any;
}

export interface SaaSState {
  isAuthenticated: boolean; 
  isLoading: boolean;
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
  | { type: 'DELETE_PLAN'; planId: string }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: SaaSState = {
  isAuthenticated: false,
  isLoading: true,
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

    case 'SET_LOADING':
        return { ...state, isLoading: action.payload };

    default:
      return state;
  }
};

export const SaaSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(saasReducer, initialState);
  const { showAlert } = useUI();

  useEffect(() => {
      const restoreSession = async () => {
          try {
              const { data: { session }, error } = await supabase.auth.getSession();
              
              if (error) {
                  console.error("Session error:", error.message);
                  if (error.message.includes('Refresh Token') || error.message.includes('refresh_token')) {
                      await supabase.auth.signOut();
                  }
              }

              if (session?.user && !state.isAuthenticated) {
                  dispatch({ 
                      type: 'LOGIN_ADMIN', 
                      name: session.user.user_metadata?.name || 'Admin', 
                      id: session.user.id, 
                      email: session.user.email || ''
                  });
              }
          } catch (err) {
              console.error("Failed to restore session:", err);
          }
      };
      restoreSession();

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
          if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
              dispatch({ type: 'LOGOUT_ADMIN' });
          } else if (event === 'SIGNED_IN' && session?.user && !state.isAuthenticated) {
              dispatch({ 
                  type: 'LOGIN_ADMIN', 
                  name: session.user.user_metadata?.name || 'Admin', 
                  id: session.user.id, 
                  email: session.user.email || ''
              });
          }
      });

      return () => {
          subscription.unsubscribe();
      };
  }, []);

    const fetchPlans = async () => {
         const { data } = await supabase.from('plans').select('*').order('created_at', { ascending: true });
         if(data) {
             const mappedPlans: Plan[] = data.map((p: any) => ({
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
                     allowProductExtras: p.limits?.allowProductExtras ?? true,
                     allowProductDescription: p.limits?.allowProductDescription ?? true,
                     allowRawMaterials: p.limits?.allowRawMaterials ?? true,
                     allowCompositeProducts: p.limits?.allowCompositeProducts ?? true,
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

  // Fetch global settings regardless of authentication
  useEffect(() => {
    let isMounted = true;

    const fetchGlobalSettings = async () => {
        try {
            const { data: configData, error: configError } = await supabase
                .from('saas_config')
                .select('global_settings')
                .eq('id', 1)
                .maybeSingle();
            
            if (isMounted && configData && !configError) {
                dispatch({ type: 'UPDATE_GLOBAL_SETTINGS', settings: configData.global_settings });
            } else if (isMounted) {
                const localSettings = localStorage.getItem('flux_saas_global_settings');
                if (localSettings) {
                    dispatch({ type: 'UPDATE_GLOBAL_SETTINGS', settings: JSON.parse(localSettings) });
                }
            }
        } catch (e) {
            console.warn("saas_config table might not exist yet, using localStorage:", e);
            if (isMounted) {
                const localSettings = localStorage.getItem('flux_saas_global_settings');
                if (localSettings) {
                    dispatch({ type: 'UPDATE_GLOBAL_SETTINGS', settings: JSON.parse(localSettings) });
                }
            }
        } finally {
            if (isMounted) {
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        }
    };

    fetchGlobalSettings();

    return () => {
        isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (state.isAuthenticated) {
        const cleanBase64Themes = async () => {
            try {
                // Clean global settings
                const { data: configData } = await supabase.from('saas_config').select('id, global_settings').eq('id', 1).maybeSingle();
                if (configData && configData.global_settings) {
                    let changed = false;
                    let newSettings = { ...configData.global_settings };
                    if (newSettings.loginBgUrl?.startsWith('data:image')) { newSettings.loginBgUrl = ''; changed = true; }
                    if (newSettings.moduleSelectorBgUrl?.startsWith('data:image')) { newSettings.moduleSelectorBgUrl = ''; changed = true; }
                    if (changed) {
                        await supabase.from('saas_config').update({ global_settings: newSettings }).eq('id', 1);
                        console.log("Cleaned base64 from saas_config");
                    }
                }

                // Clean tenants one by one to avoid OOM
                const { data: ids } = await supabase.from('tenants').select('id');
                if (ids) {
                    for (const row of ids) {
                        const { data: tenant } = await supabase.from('tenants').select('theme_config').eq('id', row.id).maybeSingle();
                        if (tenant && tenant.theme_config) {
                            let changed = false;
                            let newTheme = { ...tenant.theme_config };
                            if (newTheme.logoUrl?.startsWith('data:image')) { newTheme.logoUrl = ''; changed = true; }
                            if (newTheme.loginBgUrl?.startsWith('data:image')) { newTheme.loginBgUrl = ''; changed = true; }
                            if (newTheme.moduleSelectorBgUrl?.startsWith('data:image')) { newTheme.moduleSelectorBgUrl = ''; changed = true; }
                            
                            // Check module icons
                            if (newTheme.moduleIcons) {
                                for (const key in newTheme.moduleIcons) {
                                    if (newTheme.moduleIcons[key]?.startsWith('data:image')) {
                                        newTheme.moduleIcons[key] = '';
                                        changed = true;
                                    }
                                }
                            }

                            if (changed) {
                                await supabase.from('tenants').update({ theme_config: newTheme }).eq('id', row.id);
                                console.log(`Cleaned base64 from tenant ${row.id}`);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Error cleaning base64 themes:", e);
            }
        };

        const fetchTenants = async () => {
            try {
                await cleanBase64Themes(); // Run cleanup first
                
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
            const defaultTheme = { primaryColor: '#2563eb', backgroundColor: '#ffffff', fontColor: '#1f2937', restaurantName: action.payload.name, logoUrl: '' };

            const { data, error } = await supabase.rpc('create_tenant_by_saas_admin', {
                p_name: action.payload.name,
                p_slug: action.payload.slug,
                p_owner_name: action.payload.ownerName,
                p_email: action.payload.email,
                p_plan: action.payload.plan,
                p_theme_config: defaultTheme,
                p_allowed_modules: ['RESTAURANT']
            });

            if (error) throw error;
            if (data && data.success === false) {
                showAlert({ title: "Erro", message: data.error || "Erro ao criar restaurante.", type: 'ERROR' });
                return;
            }

            if (data && data.success) {
                dispatch({
                    type: 'ADD_TENANT_TO_LIST',
                    tenant: {
                        id: data.tenant_id,
                        name: action.payload.name,
                        slug: action.payload.slug,
                        ownerName: action.payload.ownerName,
                        email: action.payload.email,
                        status: 'ACTIVE',
                        plan: action.payload.plan,
                        joinedAt: new Date(),
                        requestCount: 0,
                        businessInfo: {},
                        allowedModules: ['RESTAURANT'],
                        allowedFeatures: []
                    }
                });
                showAlert({ title: "Sucesso", message: "Restaurante criado com sucesso!", type: 'SUCCESS' });
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

            if (action.payload.plan) {
                const tenant = state.tenants.find(t => t.id === action.payload.id);
                
                if (tenant && tenant.plan !== action.payload.plan) {
                    plan = action.payload.plan;
                    
                    const { data: planData } = await supabase.from('plans').select('*').eq('key', action.payload.plan).maybeSingle();

                    if (planData) {
                        const limits = planData.limits || {};
                        allowed_modules = limits.allowedModules || planData.allowed_modules || ['RESTAURANT'];
                        allowed_features = limits.allowedFeatures || planData.allowed_features || [];
                    }
                }
            }

            const { data, error } = await supabase.rpc('update_tenant_by_saas_admin', {
                p_admin_id: state.adminId || null,
                p_tenant_id: action.payload.id,
                p_name: action.payload.name,
                p_slug: action.payload.slug,
                p_owner_name: action.payload.ownerName,
                p_email: action.payload.email,
                p_plan: plan,
                p_allowed_modules: allowed_modules,
                p_allowed_features: allowed_features,
                p_theme_config: action.payload.theme || null
            });

            if (error) throw error;
            if (data && data.success === false) throw new Error(data.error || 'Unknown error');

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
            const { error } = await supabase.rpc('update_tenant_modules_by_saas_admin', {
                p_tenant_id: action.tenantId,
                p_modules: action.modules,
                p_features: action.features
            });
            
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
            const { error } = await supabase.rpc('update_tenant_limits_by_saas_admin', {
                p_tenant_id: action.tenantId,
                p_limits: action.limits
            });
            
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
            
            const { error } = await supabase.rpc('create_tenant_admin_by_saas_admin', {
                p_tenant_id: action.payload.tenantId,
                p_name: action.payload.name,
                p_email: action.payload.email,
                p_pin: action.payload.pin,
                p_auth_user_id: authUserId
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
            await supabase.rpc('update_admin_profile_by_saas_admin', {
                p_admin_id: state.adminId,
                p_name: action.name,
                p_email: action.email
            });
            dispatch(action);
        }
        return;
    }
    
    if (action.type === 'UPDATE_GLOBAL_SETTINGS') {
        try {
            const { error } = await supabase.rpc('update_global_settings_by_saas_admin', {
                p_settings: action.settings
            });
            
            if (error) {
                console.warn("Database Error, falling back to localStorage:", error);
                localStorage.setItem('flux_saas_global_settings', JSON.stringify(action.settings));
            }
            
            dispatch(action);
            showAlert({ title: "Sucesso", message: "Configurações globais atualizadas!", type: 'SUCCESS' });
        } catch (error: any) {
            console.error(error);
            localStorage.setItem('flux_saas_global_settings', JSON.stringify(action.settings));
            dispatch(action);
            showAlert({ title: "Sucesso", message: "Configurações salvas localmente (tabela não encontrada).", type: 'SUCCESS' });
        }
        return;
    }

    if (action.type === 'UPDATE_PLAN_DETAILS') {
        const { error } = await supabase.rpc('update_plan_details_by_saas_admin', {
            p_plan_id: action.plan.id,
            p_key: action.plan.key,
            p_name: action.plan.name,
            p_price: action.plan.price,
            p_features: action.plan.features,
            p_limits: action.plan.limits,
            p_button_text: action.plan.button_text
        });
        
        if (!error) {
            dispatch(action);
            showAlert({ title: "Sucesso", message: "Plano atualizado e propagado para todos os clientes!", type: 'SUCCESS' });
        }
        else {
            console.error("RPC Error:", error);
            showAlert({ title: "Erro", message: "Erro ao salvar plano: " + error.message, type: 'ERROR' });
        }
        return;
    }

    if (action.type === 'CREATE_PLAN') {
        try {
            const { error } = await supabase.rpc('create_plan_by_saas_admin', {
                p_key: action.plan.key,
                p_name: action.plan.name,
                p_price: action.plan.price,
                p_period: action.plan.period,
                p_features: action.plan.features,
                p_limits: action.plan.limits,
                p_button_text: action.plan.button_text,
                p_is_popular: action.plan.is_popular
            });

            if (error) throw error;
            
            const { data: plans } = await supabase.from('plans').select('*').order('created_at', { ascending: true });
            if (plans) {
                 const mappedPlans: Plan[] = plans.map((p: any) => ({
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
            const { error } = await supabase.rpc('delete_plan_by_saas_admin', {
                p_plan_id: action.planId
            });
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
        await supabase.rpc('toggle_tenant_status_by_saas_admin', {
            p_tenant_id: action.tenantId
        });
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
