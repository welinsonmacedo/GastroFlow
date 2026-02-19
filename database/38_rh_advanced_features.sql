
-- ==============================================================================
-- 38_RH_ADVANCED_FEATURES.SQL
-- Objetivo: Suporte a Banco de Horas, Jornadas CLT e Eventos Variáveis.
-- ==============================================================================

-- 1. Novos Tipos de Jornada
CREATE TYPE work_model AS ENUM ('44H_WEEKLY', '12X36', 'PART_TIME', 'INTERMITTENT', 'ROTATING');

ALTER TABLE staff ADD COLUMN IF NOT EXISTS work_model work_model DEFAULT '44H_WEEKLY';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bank_hours_balance NUMERIC(10, 2) DEFAULT 0; -- Saldo em horas (pode ser negativo)

-- 2. Tabela de Eventos Variáveis da Folha (Mensal)
CREATE TABLE rh_payroll_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    
    type TEXT NOT NULL, -- 'BONUS', 'COMMISSION', 'DEDUCTION', 'ADVANCE', 'NIGHT_SHIFT', 'INSALUBRITY', 'DANGEROUSNESS'
    description TEXT,
    value NUMERIC(10, 2) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID -- ID do usuário que lançou
);

-- Índices
CREATE INDEX idx_rh_events_period ON rh_payroll_events(tenant_id, year, month, staff_id);

-- RLS
ALTER TABLE rh_payroll_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rh_events_tenant" ON rh_payroll_events FOR ALL TO authenticated USING (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rh_payroll_events;

NOTIFY pgrst, 'reload schema';
