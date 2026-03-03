
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

-- Tabela para IPs bloqueados
CREATE TABLE IF NOT EXISTS blocked_ips (
    ip TEXT PRIMARY KEY,
    reason TEXT,
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_by UUID -- SuperAdmin ID
);

-- Habilitar RLS
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;

-- Políticas para security_incidents
CREATE POLICY "Allow authenticated insert for security incidents" ON security_incidents FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow superadmins to read security incidents" ON security_incidents FOR SELECT USING (
  auth.uid() IN (SELECT auth_user_id FROM public.saas_admins)
);

-- Políticas para system_settings
CREATE POLICY "Allow read system settings" ON system_settings FOR SELECT USING (true);
CREATE POLICY "Allow superadmins to manage system settings" ON system_settings FOR ALL USING (
  auth.uid() IN (SELECT auth_user_id FROM public.saas_admins)
);

-- Políticas para blocked_ips
CREATE POLICY "Allow read blocked ips" ON blocked_ips FOR SELECT USING (true);
CREATE POLICY "Allow manage blocked ips" ON blocked_ips FOR ALL USING (
  auth.uid() IN (SELECT auth_user_id FROM public.saas_admins)
);

-- Adicionar ao Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE security_incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE system_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE blocked_ips;

-- Inserir configuração inicial de segurança se não existir
INSERT INTO system_settings (key, value) 
VALUES ('security_config', '{"blockDevTools": true, "blockRightClick": true, "blockExtensions": true}')
ON CONFLICT (key) DO NOTHING;
