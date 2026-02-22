-- 44_system_settings.sql
-- Objetivo: Criar tabela para configurações globais do sistema (ex: travas de segurança).

CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID -- Pode ser null se for system init
);

-- Habilitar RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Política de Leitura: Pública (necessário para o SecurityGuard funcionar em todas as telas)
CREATE POLICY "Public read settings" ON system_settings FOR SELECT USING (true);

-- Política de Escrita: Apenas Super Admins
CREATE POLICY "Super Admins update settings" ON system_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM saas_admins WHERE id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM saas_admins WHERE id = auth.uid())
);

-- Inserir configuração padrão de segurança
INSERT INTO system_settings (key, value, description)
VALUES (
    'security_config', 
    '{"blockDevTools": true, "blockRightClick": true, "blockExtensions": true}'::jsonb,
    'Configurações globais de segurança do frontend'
) ON CONFLICT (key) DO NOTHING;
