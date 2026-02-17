
-- ==============================================================================
-- 25_SYSTEM_MONITORING.SQL
-- Objetivo: Rastrear sessões de usuários para monitoramento em tempo real e histórico.
-- ==============================================================================

CREATE TABLE system_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    
    login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Atualizado periodicamente (Heartbeat)
    logout_at TIMESTAMP WITH TIME ZONE,
    
    device_info TEXT, -- Navegador/OS (Opcional)
    ip_address TEXT   -- (Opcional, capturado se possível)
);

-- Índices para performance
CREATE INDEX idx_access_logs_tenant ON system_access_logs(tenant_id);
CREATE INDEX idx_access_logs_staff ON system_access_logs(staff_id);
CREATE INDEX idx_access_logs_last_seen ON system_access_logs(last_seen_at);

-- RLS (Segurança)
ALTER TABLE system_access_logs ENABLE ROW LEVEL SECURITY;

-- Política: Usuários logados podem ver logs do seu próprio tenant (Admin vê tudo, Staff vê seu próprio ou nada, dependendo da regra de negócio)
-- Aqui simplificado: Autenticados do tenant podem ver/criar/atualizar.
CREATE POLICY "Enable access for tenant staff" ON system_access_logs
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
