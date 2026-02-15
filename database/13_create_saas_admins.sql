
-- ==============================================================================
-- 13_CREATE_SAAS_ADMINS.SQL
-- Objetivo: Tabela para gerenciar super administradores do painel SaaS.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS saas_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL, -- Recomendado hash, mas para fallback simples texto plano pode ser usado temporariamente (cuidado em produção!)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir um admin padrão (Mude a senha em produção!)
INSERT INTO saas_admins (name, email, password)
VALUES ('Super Admin', 'admin@fluxeat.com', 'admin123')
ON CONFLICT (email) DO NOTHING;

ALTER TABLE saas_admins ENABLE ROW LEVEL SECURITY;

-- Política de leitura (apenas para check de login no backend ou função RPC, aqui simplificado para público se necessário, ou restrito)
-- Idealmente, use função RPC para login seguro. Para desenvolvimento:
CREATE POLICY "Public Read for Login" ON saas_admins FOR SELECT USING (true);
