import { supabase } from '../../../core/api/supabaseClient';

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  entity: string;
  entity_id: string;
  details: any;
  created_at: string;
}

export const AuditService = {
  async getLogs(tenantId: string, limit = 50): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) throw new Error(error.message);
    return data as AuditLog[];
  }
};
