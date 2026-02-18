
-- ==============================================================================
-- 28_SECURITY_LOGS.SQL
-- Objetivo: Tabela para auditoria de segurança (DevTools, Ataques, Erros).
-- ==============================================================================

CREATE TABLE security_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL, -- Pode ser null se for na tela de login
    user_id UUID REFERENCES staff(id) ON DELETE SET NULL,     -- Pode ser null se não logado
    
    severity TEXT CHECK (severity IN ('LOW', 'MEDIUM', 'CRITICAL')),
    type TEXT NOT NULL, -- Ex: 'DEV_TOOLS', 'EXTENSION_INJECTION', 'RATE_LIMIT', 'XSS_ATTEMPT'
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_security_tenant ON security_incidents(tenant_id);
CREATE INDEX idx_security_severity ON security_incidents(severity);
CREATE INDEX idx_security_created ON security_incidents(created_at DESC);

-- RLS
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem inserir (para registrar tentativas de ataque anonimas)
-- Apenas Admins podem ler
CREATE POLICY "Enable insert for everyone" ON security_incidents FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable select for admins" ON security_incidents FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.auth_user_id = auth.uid() AND staff.role IN ('ADMIN', 'SUPER_ADMIN'))
    OR 
    EXISTS (SELECT 1 FROM saas_admins WHERE saas_admins.id = auth.uid()) -- Para o Super Admin
);

NOTIFY pgrst, 'reload schema';
