
-- 13º Salário
CREATE TABLE IF NOT EXISTS rh_thirteenth_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    installment INTEGER NOT NULL CHECK (installment IN (1, 2)),
    value NUMERIC(10, 2) NOT NULL,
    reference_salary NUMERIC(10, 2) NOT NULL, -- Salário usado como base
    months_worked INTEGER NOT NULL DEFAULT 12, -- Avos
    inss_value NUMERIC(10, 2) DEFAULT 0,
    irrf_value NUMERIC(10, 2) DEFAULT 0,
    fgts_value NUMERIC(10, 2) DEFAULT 0,
    net_value NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Férias (Períodos Aquisitivos)
CREATE TABLE IF NOT EXISTS rh_vacations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    acquisition_start DATE NOT NULL,
    acquisition_end DATE NOT NULL,
    concessive_limit DATE NOT NULL,
    days_vested INTEGER DEFAULT 30, -- Dias de direito (normalmente 30)
    days_taken INTEGER DEFAULT 0, -- Dias já gozados
    days_sold INTEGER DEFAULT 0, -- Dias vendidos (abono)
    days_balance INTEGER GENERATED ALWAYS AS (days_vested - days_taken - days_sold) STORED,
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'SCHEDULED', 'TAKEN', 'EXPIRED', 'PAID_OUT')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agendamento/Gozo de Férias
CREATE TABLE IF NOT EXISTS rh_vacation_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vacation_id UUID REFERENCES rh_vacations(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE, -- Desnormalizado para facilitar queries
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INTEGER NOT NULL,
    sold_days INTEGER DEFAULT 0, -- Abono pecuniário vinculado a este gozo
    
    -- Valores Financeiros
    base_value NUMERIC(10, 2) NOT NULL, -- Valor dos dias de férias
    one_third_value NUMERIC(10, 2) NOT NULL, -- 1/3 Constitucional
    sold_value NUMERIC(10, 2) DEFAULT 0, -- Valor do abono
    sold_one_third_value NUMERIC(10, 2) DEFAULT 0, -- 1/3 do abono
    
    inss_value NUMERIC(10, 2) DEFAULT 0,
    irrf_value NUMERIC(10, 2) DEFAULT 0,
    total_gross NUMERIC(10, 2) NOT NULL,
    total_net NUMERIC(10, 2) NOT NULL,
    
    payment_date DATE,
    status TEXT DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rescisões
CREATE TABLE IF NOT EXISTS rh_terminations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    termination_date DATE NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('DISMISSAL_NO_CAUSE', 'DISMISSAL_CAUSE', 'RESIGNATION', 'AGREEMENT', 'DEATH', 'CONTRACT_END')),
    notice_period_type TEXT NOT NULL CHECK (notice_period_type IN ('WORKED', 'INDEMNIFIED', 'WAIVED', 'NOT_APPLICABLE')),
    notice_days INTEGER DEFAULT 0,
    
    -- Verbas Rescisórias
    balance_salary NUMERIC(10, 2) DEFAULT 0, -- Saldo de Salário
    notice_value NUMERIC(10, 2) DEFAULT 0, -- Aviso Prévio Indenizado
    vacation_proportional_value NUMERIC(10, 2) DEFAULT 0, -- Férias Proporcionais + 1/3
    vacation_expired_value NUMERIC(10, 2) DEFAULT 0, -- Férias Vencidas + 1/3
    thirteenth_proportional_value NUMERIC(10, 2) DEFAULT 0, -- 13º Proporcional
    fgts_fine_value NUMERIC(10, 2) DEFAULT 0, -- Multa FGTS (40%)
    
    -- Deduções
    discounts_value NUMERIC(10, 2) DEFAULT 0,
    
    total_value NUMERIC(10, 2) NOT NULL,
    
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'FINALIZED', 'PAID')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rh_thirteenth_staff ON rh_thirteenth_payments(staff_id);
CREATE INDEX idx_rh_thirteenth_year ON rh_thirteenth_payments(year);
CREATE INDEX idx_rh_vacations_staff ON rh_vacations(staff_id);
CREATE INDEX idx_rh_vacation_schedules_staff ON rh_vacation_schedules(staff_id);
CREATE INDEX idx_rh_terminations_staff ON rh_terminations(staff_id);
