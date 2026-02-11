
-- ==============================================================================
-- 01_SAAS_CORE.SQL
-- Objetivo: Gerenciar a estrutura Multi-tenant (Vários Restaurantes).
-- ==============================================================================

-- Tabela de Planos (Define limites e recursos do sistema)
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key saas_plan NOT NULL UNIQUE, -- 'FREE', 'PRO', etc.
    name TEXT NOT NULL,
    price TEXT NOT NULL, -- Ex: "R$ 99,00"
    period TEXT NOT NULL, -- Ex: "/mês"
    features TEXT[] DEFAULT '{}', -- Lista de features para marketing
    limits JSONB DEFAULT '{}', -- JSON com limites técnicos (max_tables, allow_kds, etc.)
    is_popular BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Tenants (Restaurantes/Clientes do SaaS)
-- Esta é a tabela mais importante. O 'id' dela será FK em quase todas as outras.
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- Nome do Restaurante
    slug TEXT NOT NULL UNIQUE, -- Identificador na URL (gastroflow.com/slug-do-restaurante)
    owner_name TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    plan saas_plan DEFAULT 'FREE',
    
    -- Vínculo com o usuário dono no Supabase Auth (opcional, pois pode ser gerido via staff)
    owner_auth_id UUID, 
    
    -- Configurações visuais (Logo, Cores) salvas como JSON para flexibilidade
    theme_config JSONB DEFAULT '{ "primaryColor": "#2563eb", "backgroundColor": "#ffffff" }',
    
    -- Dados fiscais e de contato do estabelecimento
    business_info JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_owner ON tenants(owner_auth_id);

-- Segurança: Habilita RLS (Row Level Security)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
