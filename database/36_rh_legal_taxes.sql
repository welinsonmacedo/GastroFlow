
-- ==============================================================================
-- 36_RH_LEGAL_TAXES.SQL
-- Objetivo: Estrutura para cálculo complexo de folha (INSS Progressivo, IRRF, FGTS).
-- ==============================================================================

-- 1. Adicionar campo de Dependentes no Staff (necessário para IRRF)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS dependents_count INTEGER DEFAULT 0;

-- 2. Tabela de Configurações Legais (Vigência)
CREATE TABLE rh_payroll_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    min_wage NUMERIC(10, 2) NOT NULL, -- Salário Mínimo
    inss_ceiling NUMERIC(10, 2) NOT NULL, -- Teto do INSS
    irrf_dependent_deduction NUMERIC(10, 2) NOT NULL, -- Dedução por dependente (ex: 189.59)
    fgts_rate NUMERIC(5, 2) DEFAULT 8.00, -- Alíquota FGTS
    
    valid_from DATE NOT NULL, -- Vigência Início
    valid_until DATE, -- Vigência Fim (Nullable)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Faixas do INSS (Progressivo)
CREATE TABLE rh_inss_brackets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    min_value NUMERIC(10, 2) NOT NULL, -- Faixa Início
    max_value NUMERIC(10, 2), -- Faixa Fim (Null = infinito/teto)
    rate NUMERIC(5, 2) NOT NULL, -- Alíquota (ex: 7.5, 9, 12, 14)
    
    valid_from DATE NOT NULL,
    valid_until DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Faixas do IRRF
CREATE TABLE rh_irrf_brackets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    min_value NUMERIC(10, 2) NOT NULL,
    max_value NUMERIC(10, 2), -- Null = infinito
    rate NUMERIC(5, 2) NOT NULL, -- Alíquota (ex: 0, 7.5, 15, 22.5, 27.5)
    deduction NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Parcela a deduzir
    
    valid_from DATE NOT NULL,
    valid_until DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices e RLS
CREATE INDEX idx_rh_settings_validity ON rh_payroll_settings(tenant_id, valid_from);
ALTER TABLE rh_payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_inss_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_irrf_brackets ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "rh_legal_tenant_isolation_settings" ON rh_payroll_settings FOR ALL TO authenticated USING (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1));
CREATE POLICY "rh_legal_tenant_isolation_inss" ON rh_inss_brackets FOR ALL TO authenticated USING (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1));
CREATE POLICY "rh_legal_tenant_isolation_irrf" ON rh_irrf_brackets FOR ALL TO authenticated USING (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rh_payroll_settings, rh_inss_brackets, rh_irrf_brackets;

NOTIFY pgrst, 'reload schema';
