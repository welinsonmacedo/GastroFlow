-- Final HR Database Fixes
BEGIN;

-- 1. Fix rh_payroll_events
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_payroll_events' AND column_name = 'amount') THEN
        ALTER TABLE public.rh_payroll_events RENAME COLUMN amount TO value;
    END IF;
END $$;

ALTER TABLE public.rh_payroll_events ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.rh_payroll_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Fix rh_recurring_events
ALTER TABLE public.rh_recurring_events ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.rh_recurring_events ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.rh_recurring_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Fix rh_event_types
ALTER TABLE public.rh_event_types ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.rh_event_types ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Fix rh_job_roles
ALTER TABLE public.rh_job_roles ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.rh_job_roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. Fix rh_shifts
ALTER TABLE public.rh_shifts ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.rh_shifts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 6. Fix rh_time_entries
ALTER TABLE public.rh_time_entries ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.rh_time_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 7. Fix rh_contract_templates
ALTER TABLE public.rh_contract_templates ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.rh_contract_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 8. Fix rh_closed_payrolls
ALTER TABLE public.rh_closed_payrolls ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.rh_closed_payrolls ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 9. Fix rh_vacation_periods
ALTER TABLE public.rh_vacation_periods ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.rh_vacation_periods ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 10. Fix rh_vacation_schedules
ALTER TABLE public.rh_vacation_schedules ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.rh_vacation_schedules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 11. Fix rh_thirteenth_payments
ALTER TABLE public.rh_thirteenth_payments ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.rh_thirteenth_payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 12. Fix rh_terminations
ALTER TABLE public.rh_terminations ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.rh_terminations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 13. Enable RLS and set policies for all RH tables
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'rh_event_types', 'rh_recurring_events', 'rh_time_entries', 
        'rh_job_roles', 'rh_shifts', 'rh_payroll_events', 
        'rh_contract_templates', 'rh_closed_payrolls', 
        'rh_vacation_periods', 'rh_vacation_schedules', 
        'rh_thirteenth_payments', 'rh_terminations'
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

COMMIT;
