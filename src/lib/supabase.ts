
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

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('Sua_Url') || supabaseAnonKey.includes('Sua_Chave')) {
  console.error('⚠️ SUPABASE NÃO CONFIGURADO CORRETAMENTE!');
  console.info('Verifique se as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão definidas no ambiente.');
} else {
  console.log('✅ Supabase: Chaves detectadas. Iniciando cliente...');
}

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('Sua_Url'));
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
