
import { createClient } from '@supabase/supabase-js';

declare global {
  interface ImportMeta {
    env: {
      VITE_SUPABASE_URL: string;
      VITE_SUPABASE_ANON_KEY: string;
      [key: string]: any;
    };
  }
}

const env: any = import.meta.env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

export const supabase: any = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export const logAudit = async (tenantId: string, userId: string, userName: string, module: string, action: string, details: any = {}) => {
    try {
        await supabase.from('audit_logs').insert({
            tenant_id: tenantId,
            user_id: userId,
            user_name: userName,
            module,
            action,
            details
        });
    } catch (error) {
        console.error("Erro ao registrar log de auditoria:", error);
    }
};
