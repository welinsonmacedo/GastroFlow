-- Create the rh_recurring_events table
CREATE TABLE IF NOT EXISTS public.rh_recurring_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    value NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE public.rh_recurring_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow recurring events viewing"
ON rh_recurring_events FOR SELECT
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1))
);

CREATE POLICY "Allow recurring events creation"
ON rh_recurring_events FOR INSERT
TO authenticated
WITH CHECK (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1))
);

CREATE POLICY "Allow recurring events updates"
ON rh_recurring_events FOR UPDATE
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1))
);

CREATE POLICY "Allow recurring events deletion"
ON rh_recurring_events FOR DELETE
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1))
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rh_recurring_events_tenant_id ON public.rh_recurring_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rh_recurring_events_staff_id ON public.rh_recurring_events(staff_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rh_recurring_events;
