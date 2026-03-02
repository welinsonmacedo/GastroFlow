-- Script to fix RLS for HR tables and ensure staff visibility
BEGIN;

-- 1. Ensure RLS is enabled on core tables
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow tenant viewing" ON public.restaurants;
DROP POLICY IF EXISTS "Allow staff viewing" ON public.staff;
DROP POLICY IF EXISTS "Allow event types viewing" ON public.rh_event_types;
DROP POLICY IF EXISTS "Allow event types creation" ON public.rh_event_types;
DROP POLICY IF EXISTS "Allow event types updates" ON public.rh_event_types;
DROP POLICY IF EXISTS "Allow event types deletion" ON public.rh_event_types;

-- 3. Policies for restaurants (tenants)
CREATE POLICY "Allow tenant viewing"
ON public.restaurants FOR SELECT
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (id IN (SELECT tenant_id FROM public.staff WHERE auth_user_id = auth.uid()))
);

-- 4. Policies for staff
-- This is critical: if users can't see their own staff record, 
-- other RLS policies using subqueries on staff will fail.
CREATE POLICY "Allow staff viewing"
ON public.staff FOR SELECT
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (auth_user_id = auth.uid())
    OR
    (tenant_id IN (SELECT tenant_id FROM public.staff WHERE auth_user_id = auth.uid()))
);

-- 5. Policies for rh_event_types
CREATE POLICY "Allow event types viewing"
ON public.rh_event_types FOR SELECT
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM public.staff WHERE auth_user_id = auth.uid()))
);

CREATE POLICY "Allow event types creation"
ON public.rh_event_types FOR INSERT
TO authenticated
WITH CHECK (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM public.staff WHERE auth_user_id = auth.uid()))
);

CREATE POLICY "Allow event types updates"
ON public.rh_event_types FOR UPDATE
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM public.staff WHERE auth_user_id = auth.uid()))
);

CREATE POLICY "Allow event types deletion"
ON public.rh_event_types FOR DELETE
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM public.staff WHERE auth_user_id = auth.uid()))
);

-- 6. Also fix other RH tables
ALTER TABLE public.rh_payroll_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_recurring_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow payroll events viewing" ON public.rh_payroll_events;
DROP POLICY IF EXISTS "Allow payroll events creation" ON public.rh_payroll_events;
DROP POLICY IF EXISTS "Allow job roles viewing" ON public.rh_job_roles;
DROP POLICY IF EXISTS "Allow job roles management" ON public.rh_job_roles;
DROP POLICY IF EXISTS "Allow shifts viewing" ON public.rh_shifts;
DROP POLICY IF EXISTS "Allow shifts management" ON public.rh_shifts;
DROP POLICY IF EXISTS "Allow recurring events viewing" ON public.rh_recurring_events;
DROP POLICY IF EXISTS "Allow recurring events creation" ON public.rh_recurring_events;

-- Payroll Events
CREATE POLICY "Allow payroll events viewing" ON public.rh_payroll_events FOR SELECT TO authenticated USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email())) OR (tenant_id IN (SELECT tenant_id FROM public.staff WHERE auth_user_id = auth.uid()))
);
CREATE POLICY "Allow payroll events creation" ON public.rh_payroll_events FOR INSERT TO authenticated WITH CHECK (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email())) OR (tenant_id IN (SELECT tenant_id FROM public.staff WHERE auth_user_id = auth.uid()))
);

-- Job Roles
CREATE POLICY "Allow job roles viewing" ON public.rh_job_roles FOR SELECT TO authenticated USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email())) OR (tenant_id IN (SELECT tenant_id FROM public.staff WHERE auth_user_id = auth.uid()))
);
CREATE POLICY "Allow job roles management" ON public.rh_job_roles FOR ALL TO authenticated USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email())) OR (tenant_id IN (SELECT tenant_id FROM public.staff WHERE auth_user_id = auth.uid()))
);

-- Shifts
CREATE POLICY "Allow shifts viewing" ON public.rh_shifts FOR SELECT TO authenticated USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email())) OR (tenant_id IN (SELECT tenant_id FROM public.staff WHERE auth_user_id = auth.uid()))
);
CREATE POLICY "Allow shifts management" ON public.rh_shifts FOR ALL TO authenticated USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email())) OR (tenant_id IN (SELECT tenant_id FROM public.staff WHERE auth_user_id = auth.uid()))
);

-- Recurring Events
CREATE POLICY "Allow recurring events viewing" ON public.rh_recurring_events FOR SELECT TO authenticated USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email())) OR (tenant_id IN (SELECT tenant_id FROM public.staff WHERE auth_user_id = auth.uid()))
);
CREATE POLICY "Allow recurring events creation" ON public.rh_recurring_events FOR INSERT TO authenticated WITH CHECK (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email())) OR (tenant_id IN (SELECT tenant_id FROM public.staff WHERE auth_user_id = auth.uid()))
);

COMMIT;
