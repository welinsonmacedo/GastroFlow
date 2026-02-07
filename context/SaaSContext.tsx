import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { RestaurantTenant, PlanType, Plan } from '../types';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { useUI } from './UIContext';

// Cliente Supabase auxiliar para operações administrativas sem afetar a sessão atual
// Adicionada verificação segura para import.meta.env para evitar erros em alguns ambientes
const env: any = import.meta.env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || '';

interface SaaSState {
  isAuthenticated: boolean; 
  adminName: string | null;
  adminId: string | null;
  adminEmail: string | null;
  tenants: RestaurantTenant[];
  plans: Plan[];
}

type SaaSAction =
  | { type: 'LOGIN_ADMIN'; name: string; id: string; email: string }
  | { type: 'LOGOUT_ADMIN' }
  | { type: 'SET_TENANTS'; payload: RestaurantTenant[] }
  | { type: 'UPDATE_TENANT_STATS'; payload: { id: string; count: number }[] } // Nova action
  | { type: 'SET_PLANS'; payload: Plan[] }
  | { type: 'CREATE_TENANT'; payload: { name: string; slug: string; ownerName: string; email: string; plan: PlanType } }
  | { type: 'UPDATE_TENANT'; payload: { id: string; name: string; slug: string; ownerName: string; email: string } }
  | { type: 'CREATE_TENANT_ADMIN'; payload: { tenantId: string; name: string; email: string; pin: string; password?: string } }
  | { type: 'ADD_TENANT_TO_LIST'; tenant: RestaurantTenant }
  | { type: 'TOGGLE_STATUS'; tenantId: string }
  | { type: 'CHANGE_PLAN'; tenantId: string; plan: PlanType }
  | { type: 'UPDATE_PROFILE'; name: string; email: string }
  | { type: 'UPDATE_PLAN_DETAILS'; plan: Plan };

const initialState: SaaSState = {
  isAuthenticated: false,
  adminName: null,
  adminId: null,
  adminEmail: null,
  tenants: [],
  plans: []
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
            ? { ...t, name: action.payload.name, slug: action.payload.slug, ownerName: action.payload.ownerName, email: action.payload.email } 
            : t
        )
      };
    
    case 'UPDATE_PROFILE':
        return { ...state, adminName: action.name, adminEmail: action.email };

    case 'UPDATE_PLAN_DETAILS':
        return {
            ...state,
            plans: state.plans.map(p => p.id === action.plan.id ? action.plan : p)
        };

    default:
      return state;
  }
};

export const SaaSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(saasReducer, initialState);
  const { showAlert } = useUI();

  // 1. Restaurar Sessão ao Carregar (Persistência)
  useEffect(() => {
      const restoreSession = async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && !state.isAuthenticated) {
              // Se existe uma sessão válida, restaura o estado de login
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

  // 2. Carregar Dados Iniciais (Planos)
  useEffect(() => {
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
                 limits: p.limits || { maxTables: 10, maxProducts: 30, maxStaff: 2, allowKds: false, allowCashier: false }, // Fallback
                 is_popular: p.is_popular,
                 button_text: p.button_text
             }));
             dispatch({ type: 'SET_PLANS', payload: mappedPlans });
         }
    };
    fetchPlans();
  }, []);

  // 3. Carregar Tenants (Depende de Auth) - Refatorado para Resiliência
  useEffect(() => {
    let isMounted = true;

    if (state.isAuthenticated) {
        const fetchTenants = async (retryCount = 0) => {
            try {
                // Passo 1: Busca SIMPLES (Garante que a lista apareça rápido)
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
                        requestCount: 0 // Placeholder inicial
                    }));
                    dispatch({ type: 'SET_TENANTS', payload: mapped });

                    // Passo 2: Busca Estatísticas (Logs) separadamente para não bloquear
                    fetchTenantStats(mapped.map(t => t.id));
                }
            } catch (err: any) {
                console.error(`Erro ao buscar restaurantes (Tentativa ${retryCount + 1}):`, err);
                
                // Retry logic para AbortError ou falhas de rede
                const isAbort = err.name === 'AbortError' || err.message?.includes('AbortError') || err.message?.includes('signal is aborted');
                
                if (isAbort && retryCount < 3 && isMounted) {
                    setTimeout(() => fetchTenants(retryCount + 1), 500);
                }
            }
        };

        const fetchTenantStats = async (tenantIds: string[]) => {
            if (tenantIds.length === 0) return;
            try {
                const { data, error } = await supabase
                    .from('tenants')
                    .select('id, audit_logs(count)');
                
                if (!isMounted) return;

                if (data && !error) {
                    const stats = data.map((t: any) => ({
                        id: t.id,
                        count: (t.audit_logs && t.audit_logs[0] && t.audit_logs[0].count) || 0
                    }));
                    dispatch({ type: 'UPDATE_TENANT_STATS', payload: stats });
                }
            } catch (e) {
                console.warn("Falha ao carregar estatísticas secundárias (não crítico)", e);
            }
        };

        fetchTenants();
    }

    return () => { isMounted = false; };
  }, [state.isAuthenticated]);

  // INACTIVITY LOGOUT TIMER (30 Minutes for CEO/Admin)
  useEffect(() => {
      if (!state.isAuthenticated) return;

      const TIMEOUT_MS = 30 * 60 * 1000; // 30 Minutos
      let timeoutId: any;

      const handleLogout = async () => {
          showAlert({
              title: "Sessão Expirada",
              message: "Sua sessão expirou por inatividade (30min). Por favor, faça login novamente.",
              type: 'WARNING'
          });
          await supabase.auth.signOut();
          dispatch({ type: 'LOGOUT_ADMIN' });
      };

      const resetTimer = () => {
          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = setTimeout(handleLogout, TIMEOUT_MS);
      };

      const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
      events.forEach(event => window.addEventListener(event, resetTimer));

      resetTimer();

      return () => {
          if (timeoutId) clearTimeout(timeoutId);
          events.forEach(event => window.removeEventListener(event, resetTimer));
      };
  }, [state.isAuthenticated, showAlert]);

  // Intercepta ações de mutação para atualizar o Supabase também
  const dispatchWithSideEffects = async (action: SaaSAction) => {
    
    if (action.type === 'CREATE_TENANT') {
        try {
            // 0. Verificar Disponibilidade do Slug
            const { data: existing } = await supabase
                .from('tenants')
                .select('id')
                .eq('slug', action.payload.slug)
                .maybeSingle();
            
            if (existing) {
                showAlert({
                    title: "Endereço Indisponível",
                    message: "O endereço (slug) escolhido já está em uso por outro restaurante. Por favor, tente um nome diferente.",
                    type: 'WARNING'
                });
                return; 
            }

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
                // 2. Criar Staff ADMIN padrão
                await supabase.from('staff').insert({
                    tenant_id: newTenant.id,
                    name: 'Admin',
                    role: 'ADMIN',
                    pin: '1234'
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
                        joinedAt: new Date(newTenant.created_at),
                        requestCount: 0
                    }
                });
            }
        } catch (error: any) {
            console.error("Erro ao criar tenant:", error);
            if (error.code === '23505') {
                 showAlert({
                     title: "Erro de Duplicidade",
                     message: "Este Slug já está cadastrado no sistema.",
                     type: 'ERROR'
                 });
            } else {
                 showAlert({
                     title: "Erro",
                     message: "Erro ao criar restaurante. Verifique o console para mais detalhes.",
                     type: 'ERROR'
                 });
            }
        }
        return;
    }

    if (action.type === 'UPDATE_TENANT') {
        try {
            const { error } = await supabase.from('tenants').update({
                name: action.payload.name,
                slug: action.payload.slug,
                owner_name: action.payload.ownerName,
                email: action.payload.email
            }).eq('id', action.payload.id);

            if (error) throw error;
            dispatch(action); // Atualiza UI
        } catch (error) {
            console.error("Erro ao atualizar tenant:", error);
            showAlert({ title: "Erro", message: "Erro ao atualizar dados do restaurante.", type: 'ERROR' });
        }
        return;
    }

    if (action.type === 'CREATE_TENANT_ADMIN') {
        try {
            let authUserId = null;

            if (action.payload.password) {
                if (!supabaseUrl || !supabaseKey) {
                    throw new Error("Configuração do Supabase (URL/Key) não encontrada para criar usuário Auth.");
                }

                const tempClient: any = createClient(supabaseUrl, supabaseKey, {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                });

                const { data: authData, error: authError } = await tempClient.auth.signUp({
                    email: action.payload.email,
                    password: action.payload.password,
                    options: {
                        data: { name: action.payload.name }
                    }
                });

                if (authError) {
                    console.error("Erro Auth:", authError);
                    showAlert({ title: "Erro Auth", message: `Erro ao criar login Auth: ${authError.message}`, type: 'ERROR' });
                } else if (authData.user) {
                    authUserId = authData.user.id;
                }
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
            
            if (authUserId) {
                showAlert({ title: "Sucesso", message: "Usuário Admin criado com sucesso! Login Auth e PIN configurados.", type: 'SUCCESS' });
            } else {
                showAlert({ title: "Sucesso", message: "Usuário Admin criado apenas localmente (PIN).", type: 'SUCCESS' });
            }

        } catch (error: any) {
             console.error("Erro ao criar admin:", error);
             showAlert({ title: "Erro", message: `Erro ao criar usuário admin: ${error.message}`, type: 'ERROR' });
        }
        return;
    }

    if (action.type === 'UPDATE_PROFILE') {
        if (state.adminId) {
            const { error } = await supabase.auth.updateUser({ 
                email: action.email,
                data: { name: action.name }
            });
            if (!error) dispatch(action);
            
            await supabase.from('saas_admins').update({
                name: action.name,
                email: action.email
            }).eq('id', state.adminId);
        }
        return;
    }
    
    if (action.type === 'UPDATE_PLAN_DETAILS') {
        const { error } = await supabase.from('plans').update({
            name: action.plan.name,
            price: action.plan.price,
            features: action.plan.features,
            limits: action.plan.limits, // Salva os limites no banco
            button_text: action.plan.button_text
        }).eq('id', action.plan.id);

        if (!error) {
            dispatch(action);
        } else {
            console.error("Erro ao atualizar plano", error);
            showAlert({ title: "Erro", message: "Erro ao salvar plano no banco de dados.", type: 'ERROR' });
        }
        return;
    }

    dispatch(action);

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