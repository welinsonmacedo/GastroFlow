
-- ==============================================================================
-- 33_RH_BENEFITS.SQL
-- Objetivo: Tabela para configurar benefícios globais (ex: Vale Transporte, VA).
-- ==============================================================================

CREATE TABLE rh_benefits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Ex: "Vale Refeição", "Plano de Saúde"
    type TEXT CHECK (type IN ('PERCENTAGE', 'FIXED')), -- Porcentagem do Salário ou Valor Fixo
    value NUMERIC(10, 2) NOT NULL, 
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_rh_benefits_tenant ON rh_benefits(tenant_id);

-- RLS
ALTER TABLE rh_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rh_benefits_tenant_isolation" ON rh_benefits
    FOR ALL
    TO authenticated
    USING (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1))
    WITH CHECK (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rh_benefits;

NOTIFY pgrst, 'reload schema';
