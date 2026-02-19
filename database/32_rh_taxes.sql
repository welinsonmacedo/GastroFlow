
-- ==============================================================================
-- 32_RH_TAXES.SQL
-- Objetivo: Tabela para configurar impostos e descontos de folha de pagamento (RH).
-- ==============================================================================

CREATE TABLE rh_taxes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Ex: "INSS", "Vale Transporte"
    type TEXT CHECK (type IN ('PERCENTAGE', 'FIXED')), -- Porcentagem ou Valor Fixo
    value NUMERIC(10, 2) NOT NULL, -- 11.00 (para 11%) ou 150.00 (reais)
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_rh_taxes_tenant ON rh_taxes(tenant_id);

-- RLS
ALTER TABLE rh_taxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rh_taxes_tenant_isolation" ON rh_taxes
    FOR ALL
    TO authenticated
    USING (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1))
    WITH CHECK (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rh_taxes;

NOTIFY pgrst, 'reload schema';
