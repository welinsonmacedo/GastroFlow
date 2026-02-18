
-- ==============================================================================
-- 29_RH_MODULE.SQL
-- Objetivo: Estrutura para Gestão de Colaboradores, Escalas, Ponto e Pré-Folha.
-- ==============================================================================

-- 1. Extensão para tipos de contrato e status
CREATE TYPE contract_type AS ENUM ('CLT', 'PJ', 'TEMPORARY', 'INTERN', 'FREELANCE');
CREATE TYPE employee_status AS ENUM ('ACTIVE', 'ON_LEAVE', 'TERMINATED', 'VACATION');

-- 2. Expandir a tabela staff com dados de RH (Adicionando colunas se não existirem)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS hire_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS contract_type contract_type DEFAULT 'CLT';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS base_salary NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS benefits_total NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS status employee_status DEFAULT 'ACTIVE';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS document_cpf TEXT;

-- 3. Tabela de Turnos (Templates)
CREATE TABLE rh_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Ex: "Manhã 08-16", "Noite 18-02"
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_minutes INTEGER DEFAULT 60,
    tolerance_minutes INTEGER DEFAULT 15,
    night_shift BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Escalas (Associação Colaborador x Dia x Turno)
CREATE TABLE rh_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES rh_shifts(id) ON DELETE SET NULL,
    work_date DATE NOT NULL,
    is_off_day BOOLEAN DEFAULT false, -- Folga
    notes TEXT,
    UNIQUE(staff_id, work_date)
);

-- 5. Tabela de Ponto Eletrônico
CREATE TABLE rh_time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    clock_in TIMESTAMP WITH TIME ZONE,
    break_start TIMESTAMP WITH TIME ZONE,
    break_end TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    
    entry_type TEXT DEFAULT 'DIGITAL' CHECK (entry_type IN ('DIGITAL', 'MANUAL')),
    justification TEXT, -- Para registros manuais ou atrasos
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    
    latitude TEXT, -- Para ponto via mobile
    longitude TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Histórico de Alterações Salariais (Auditoria)
CREATE TABLE rh_salary_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    old_salary NUMERIC(10, 2),
    new_salary NUMERIC(10, 2),
    change_reason TEXT,
    changed_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Índices
CREATE INDEX idx_rh_shifts_tenant ON rh_shifts(tenant_id);
CREATE INDEX idx_rh_schedules_staff_date ON rh_schedules(staff_id, work_date);
CREATE INDEX idx_rh_time_entries_staff_date ON rh_time_entries(staff_id, entry_date);

-- 8. RLS
ALTER TABLE rh_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_salary_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rh_tenant_isolation" ON rh_shifts FOR ALL TO authenticated USING (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1));
CREATE POLICY "rh_sched_tenant_isolation" ON rh_schedules FOR ALL TO authenticated USING (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1));
CREATE POLICY "rh_time_tenant_isolation" ON rh_time_entries FOR ALL TO authenticated USING (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1));
CREATE POLICY "rh_sal_tenant_isolation" ON rh_salary_history FOR ALL TO authenticated USING (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1));

-- Ativa Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rh_shifts, rh_schedules, rh_time_entries;

NOTIFY pgrst, 'reload schema';
