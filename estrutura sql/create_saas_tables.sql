-- Script para criar as tabelas do módulo SaaS Administrativo que podem estar faltando

BEGIN;

-- 1. Tabela de Configurações Globais do SaaS (White-label, etc)
CREATE TABLE IF NOT EXISTS saas_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    global_settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insere a configuração padrão se não existir
INSERT INTO saas_config (id, global_settings) 
VALUES (1, '{"primaryColor": "#2563eb", "backgroundColor": "#f8fafc", "fontColor": "#1e293b", "logoUrl": "", "systemName": "Flux Eat"}')
ON CONFLICT (id) DO NOTHING;

-- 2. Tabela de Administradores do SaaS (Fallback de Login)
CREATE TABLE IF NOT EXISTS saas_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Planos do SaaS
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    price TEXT NOT NULL,
    period TEXT DEFAULT 'Mensal',
    features JSONB DEFAULT '[]'::jsonb,
    limits JSONB DEFAULT '{}'::jsonb,
    is_popular BOOLEAN DEFAULT false,
    button_text TEXT DEFAULT 'Contratar',
    allowed_modules JSONB DEFAULT '[]'::jsonb,
    allowed_features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Tickets (Suporte entre Cliente e SaaS)
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    tenant_name TEXT,
    subject TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'OPEN',
    messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
