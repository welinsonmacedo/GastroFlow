import { createClient } from '@supabase/supabase-js';
import { environment, isSupabaseConfigured } from '../config/environment';
import { logger } from '../logger/logger';

export { isSupabaseConfigured };

if (!isSupabaseConfigured()) {
  logger.error('⚠️ SUPABASE NÃO CONFIGURADO CORRETAMENTE!');
  logger.info('Verifique se as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão definidas.');
} else {
  logger.info('✅ Supabase: Chaves detectadas. Iniciando cliente...');
}

export const supabase: any = createClient(
  environment.supabaseUrl || 'https://placeholder.supabase.co',
  environment.supabaseAnonKey || 'placeholder-key'
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
    logger.error("Erro ao registrar log de auditoria:", error);
  }
};
