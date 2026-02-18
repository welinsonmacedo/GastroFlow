
-- ==============================================================================
-- 30_CUSTOM_ROLES.SQL
-- Objetivo: Permitir a criação de cargos dinâmicos com permissões granulares.
-- ==============================================================================

-- 1. Tabela de Cargos Personalizados
CREATE TABLE custom_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Permissões JSONB: { "allowed_modules": ["INVENTORY", "FINANCE"], "allowed_features": ["inventory_add", "finance_view"] }
    permissions JSONB DEFAULT '{}', 
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Adicionar vínculo na tabela Staff
-- O usuário pode ter um 'role' (ENUM legado/sistema) OU um 'custom_role_id'.
-- Se custom_role_id estiver preenchido, ele tem precedência nas regras de negócio.
ALTER TABLE staff ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES custom_roles(id) ON DELETE SET NULL;

-- 3. Índices e RLS
CREATE INDEX idx_custom_roles_tenant ON custom_roles(tenant_id);

ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for tenant staff" ON custom_roles
    FOR ALL
    TO authenticated
    USING (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1))
    WITH CHECK (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE custom_roles;

NOTIFY pgrst, 'reload schema';
