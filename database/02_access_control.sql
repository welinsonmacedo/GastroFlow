
-- ==============================================================================
-- 02_ACCESS_CONTROL.SQL
-- Objetivo: Gerenciar usuários, garçons, cozinheiros e administradores locais.
-- ==============================================================================

CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Vínculo com Supabase Auth (pode ser NULL se o usuário usar apenas PIN local)
    auth_user_id UUID, 
    
    name TEXT NOT NULL,
    email TEXT, -- Opcional para garçons, obrigatório para Admins remotos
    role user_role NOT NULL DEFAULT 'WAITER',
    
    -- Senha numérica simples para terminais POS/KDS
    pin TEXT NOT NULL, 
    
    -- Controle granular de permissões (quais rotas pode acessar)
    allowed_routes TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_staff_tenant ON staff(tenant_id);
CREATE INDEX idx_staff_auth ON staff(auth_user_id);
CREATE INDEX idx_staff_pin ON staff(tenant_id, pin); -- Para login rápido via PIN

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
