
-- Tabela para logs de incidentes de segurança
CREATE TABLE IF NOT EXISTS security_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'CRITICAL')),
    details TEXT,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID, -- Pode ser nulo se for um ataque não autenticado
    user_agent TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para configurações globais do sistema
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para security_incidents
-- Apenas SuperAdmins (ou service_role) devem ler. 
-- Inserção deve ser permitida para qualquer um (para registrar ataques), mas com cautela.
CREATE POLICY "Allow anonymous insert for security incidents" ON security_incidents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow superadmins to read security incidents" ON security_incidents FOR SELECT USING (true); -- Ajustar conforme lógica de SuperAdmin

-- Políticas para system_settings
CREATE POLICY "Allow read system settings" ON system_settings FOR SELECT USING (true);
CREATE POLICY "Allow superadmins to manage system settings" ON system_settings FOR ALL USING (true); -- Ajustar conforme lógica de SuperAdmin

-- Adicionar ao Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE security_incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE system_settings;

-- Inserir configuração inicial de segurança se não existir
INSERT INTO system_settings (key, value) 
VALUES ('security_config', '{"blockDevTools": true, "blockRightClick": true, "blockExtensions": true}')
ON CONFLICT (key) DO NOTHING;
