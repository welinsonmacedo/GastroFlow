-- Add audit columns to RH tables if missing
BEGIN;

-- rh_payroll_events
ALTER TABLE public.rh_payroll_events ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.rh_payroll_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- rh_recurring_events
ALTER TABLE public.rh_recurring_events ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.rh_recurring_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- rh_event_types
ALTER TABLE public.rh_event_types ADD COLUMN IF NOT EXISTS created_by UUID;
-- updated_at already exists in create_rh_event_types.sql

-- staff
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

COMMIT;
