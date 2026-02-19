
-- ==============================================================================
-- 37_RH_CLOSED_PAYROLLS.SQL
-- Objetivo: Armazenar o histórico imutável de folhas de pagamento fechadas.
-- ==============================================================================

-- Tabela Cabeçalho da Folha (Referência Mês/Ano)
CREATE TABLE rh_closed_payrolls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    month INTEGER NOT NULL, -- 0 a 11
    year INTEGER NOT NULL,
    
    total_cost NUMERIC(15, 2) NOT NULL, -- Custo total para a empresa
    total_net NUMERIC(15, 2) NOT NULL,  -- Total líquido a pagar
    employee_count INTEGER NOT NULL,
    
    status TEXT DEFAULT 'CLOSED', -- Sempre CLOSED ao criar
    closed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_by TEXT, -- Nome do usuário que fechou
    
    UNIQUE(tenant_id, month, year) -- Garante apenas uma folha fechada por mês
);

-- Tabela de Itens da Folha (Detalhe por Funcionário)
CREATE TABLE rh_closed_payroll_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_id UUID NOT NULL REFERENCES rh_closed_payrolls(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL, -- Se funcionario for demitido, mantem histórico
    staff_name TEXT NOT NULL, -- Snapshot do nome
    staff_role TEXT,
    
    base_salary NUMERIC(10, 2) NOT NULL,
    gross_total NUMERIC(10, 2) NOT NULL,
    net_total NUMERIC(10, 2) NOT NULL,
    total_discounts NUMERIC(10, 2) NOT NULL,
    
    -- JSONB para guardar o detalhamento exato (taxas, beneficios, horas extras)
    -- Ex: { "taxBreakdown": [...], "benefitBreakdown": [...], "hoursWorked": 160 }
    details JSONB NOT NULL
);

-- Índices
CREATE INDEX idx_closed_payrolls_date ON rh_closed_payrolls(tenant_id, year, month);
CREATE INDEX idx_closed_items_payroll ON rh_closed_payroll_items(payroll_id);

-- RLS
ALTER TABLE rh_closed_payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_closed_payroll_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rh_closed_tenant" ON rh_closed_payrolls FOR ALL TO authenticated USING (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1));
CREATE POLICY "rh_closed_items_tenant" ON rh_closed_payroll_items FOR ALL TO authenticated USING (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1));

NOTIFY pgrst, 'reload schema';
