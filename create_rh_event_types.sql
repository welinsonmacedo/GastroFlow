-- Create the rh_event_types table
CREATE TABLE IF NOT EXISTS public.rh_event_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('+', '-')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE public.rh_event_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow event types viewing"
ON rh_event_types FOR SELECT
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1))
);

CREATE POLICY "Allow event types creation"
ON rh_event_types FOR INSERT
TO authenticated
WITH CHECK (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1))
);

CREATE POLICY "Allow event types updates"
ON rh_event_types FOR UPDATE
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1))
);

CREATE POLICY "Allow event types deletion"
ON rh_event_types FOR DELETE
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1))
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rh_event_types_tenant_id ON public.rh_event_types(tenant_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rh_event_types;
