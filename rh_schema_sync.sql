-- Comprehensive HR Schema Sync and Fixes
BEGIN;

-- 1. Table: rh_payroll_settings
CREATE TABLE IF NOT EXISTS public.rh_payroll_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    min_wage NUMERIC(10, 2) DEFAULT 1412.00,
    inss_ceiling NUMERIC(10, 2) DEFAULT 7786.02,
    irrf_dependent_deduction NUMERIC(10, 2) DEFAULT 189.59,
    fgts_rate NUMERIC(5, 2) DEFAULT 8.00,
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    vacation_days_entitlement INTEGER DEFAULT 30,
    vacation_sold_days_limit INTEGER DEFAULT 10,
    thirteenth_min_months_worked INTEGER DEFAULT 1,
    notice_period_days INTEGER DEFAULT 30,
    notice_period_days_per_year INTEGER DEFAULT 3,
    notice_period_max_days INTEGER DEFAULT 90,
    fgts_fine_percent NUMERIC(5, 2) DEFAULT 40.00,
    standard_monthly_hours INTEGER DEFAULT 220,
    time_tracking_method TEXT DEFAULT 'DIGITAL',
    overtime_policy TEXT DEFAULT 'PAID_OVERTIME',
    deduct_delays_from_overtime BOOLEAN DEFAULT TRUE,
    absence_logic JSONB DEFAULT '{"justified": {"deduction": false, "disciplinaryAction": false}, "unjustified": {"deduction": true, "disciplinaryAction": true, "dsrDeduction": true}}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table: rh_inss_brackets
CREATE TABLE IF NOT EXISTS public.rh_inss_brackets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    min_value NUMERIC(10, 2) NOT NULL,
    max_value NUMERIC(10, 2),
    rate NUMERIC(5, 2) NOT NULL,
    valid_from DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table: rh_irrf_brackets
CREATE TABLE IF NOT EXISTS public.rh_irrf_brackets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    min_value NUMERIC(10, 2) NOT NULL,
    max_value NUMERIC(10, 2),
    rate NUMERIC(5, 2) NOT NULL,
    deduction NUMERIC(10, 2) NOT NULL,
    valid_from DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table: rh_taxes
CREATE TABLE IF NOT EXISTS public.rh_taxes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('PERCENTAGE', 'FIXED')),
    value NUMERIC(10, 2) NOT NULL,
    payer_type TEXT NOT NULL CHECK (payer_type IN ('EMPLOYEE', 'EMPLOYER')),
    calculation_basis TEXT NOT NULL CHECK (calculation_basis IN ('GROSS_TOTAL', 'BASE_SALARY')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Table: rh_benefits
CREATE TABLE IF NOT EXISTS public.rh_benefits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('PERCENTAGE', 'FIXED')),
    value NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Table: rh_payroll_entries (Monthly variable data)
CREATE TABLE IF NOT EXISTS public.rh_payroll_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    month TEXT NOT NULL, -- YYYY-MM
    overtime_hours NUMERIC(10, 2) DEFAULT 0,
    missing_hours NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Table: rh_closed_payroll_items
CREATE TABLE IF NOT EXISTS public.rh_closed_payroll_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    payroll_id UUID NOT NULL REFERENCES public.rh_closed_payrolls(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    staff_name TEXT NOT NULL,
    base_salary NUMERIC(10, 2) NOT NULL,
    gross_total NUMERIC(10, 2) NOT NULL,
    discounts NUMERIC(10, 2) NOT NULL,
    net_total NUMERIC(10, 2) NOT NULL,
    inss_value NUMERIC(10, 2) DEFAULT 0,
    irrf_value NUMERIC(10, 2) DEFAULT 0,
    fgts_value NUMERIC(10, 2) DEFAULT 0,
    tax_breakdown JSONB DEFAULT '[]'::JSONB,
    benefit_breakdown JSONB DEFAULT '[]'::JSONB,
    event_breakdown JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Table: rh_staff_warnings
CREATE TABLE IF NOT EXISTS public.rh_staff_warnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('VERBAL', 'FORMAL')),
    content TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Fix rh_recurring_events 'type' column and missing columns
ALTER TABLE public.rh_recurring_events ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.rh_recurring_events ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.rh_recurring_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 9.1 Fix rh_vacations missing columns
ALTER TABLE public.rh_vacations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.rh_vacations ADD COLUMN IF NOT EXISTS created_by UUID;

-- 10. Fix rh_payroll_events 'amount' to 'value'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_payroll_events' AND column_name = 'amount') THEN
        ALTER TABLE public.rh_payroll_events RENAME COLUMN amount TO value;
    END IF;
END $$;

-- 11. Enable RLS and set policies for ALL RH tables
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'rh_event_types', 'rh_recurring_events', 'rh_time_entries', 
        'rh_job_roles', 'rh_shifts', 'rh_payroll_events', 
        'rh_contract_templates', 'rh_closed_payrolls', 
        'rh_vacations', 'rh_vacation_schedules', 
        'rh_thirteenth_payments', 'rh_terminations',
        'rh_payroll_settings', 'rh_inss_brackets', 'rh_irrf_brackets',
        'rh_taxes', 'rh_benefits', 'rh_payroll_entries',
        'rh_closed_payroll_items', 'rh_staff_warnings'
    ];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow %s viewing" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow %s management" ON public.%I', t, t);
        
        EXECUTE format('CREATE POLICY "Allow %s viewing" ON public.%I FOR SELECT TO authenticated USING (
            (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email())) 
            OR (tenant_id IN (SELECT tenant_id FROM public.staff WHERE auth_user_id = auth.uid()))
        )', t, t);
        
        EXECUTE format('CREATE POLICY "Allow %s management" ON public.%I FOR ALL TO authenticated USING (
            (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email())) 
            OR (tenant_id IN (SELECT tenant_id FROM public.staff WHERE auth_user_id = auth.uid()))
        )', t, t);
    END LOOP;
END $$;

-- 12. Add to Realtime Publication
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'rh_event_types', 'rh_recurring_events', 'rh_time_entries', 
        'rh_job_roles', 'rh_shifts', 'rh_payroll_events', 
        'rh_contract_templates', 'rh_closed_payrolls', 
        'rh_vacations', 'rh_vacation_schedules', 
        'rh_thirteenth_payments', 'rh_terminations',
        'rh_payroll_settings', 'rh_inss_brackets', 'rh_irrf_brackets',
        'rh_taxes', 'rh_benefits', 'rh_payroll_entries',
        'rh_closed_payroll_items', 'rh_staff_warnings'
    ];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        EXCEPTION WHEN OTHERS THEN
            -- Table might already be in publication
            NULL;
        END;
    END LOOP;
END $$;

COMMIT;
