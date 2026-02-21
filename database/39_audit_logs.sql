
-- ==============================================================================
-- 39_AUDIT_LOGS.SQL
-- Objetivo: Tabela central de auditoria para todos os módulos do sistema.
-- ==============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    user_name TEXT, -- Nome do usuário no momento da ação (redundância para performance/histórico)
    
    module TEXT NOT NULL, -- 'INVENTORY', 'FINANCE', 'HR', 'RESTAURANT', 'COMMERCE', 'CONFIG', etc.
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', etc.
    details JSONB DEFAULT '{}', -- Dados antes/depois ou descrição detalhada
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_module ON audit_logs(module);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- RLS (Segurança)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Política: Apenas ADM do tenant pode ver os logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff 
            WHERE staff.auth_user_id = auth.uid() 
            AND staff.tenant_id = audit_logs.tenant_id
            AND staff.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Função auxiliar para inserir logs (pode ser chamada via RPC ou Trigger)
CREATE OR REPLACE FUNCTION log_audit(
    p_tenant_id UUID,
    p_user_id UUID,
    p_user_name TEXT,
    p_module TEXT,
    p_action TEXT,
    p_details JSONB DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (tenant_id, user_id, user_name, module, action, details)
    VALUES (p_tenant_id, p_user_id, p_user_name, p_module, p_action, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
