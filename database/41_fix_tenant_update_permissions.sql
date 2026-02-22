-- 41_fix_tenant_update_permissions.sql

-- 1. Ensure 'saas_admins' table exists for Super Admin management
CREATE TABLE IF NOT EXISTS saas_admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on saas_admins
ALTER TABLE saas_admins ENABLE ROW LEVEL SECURITY;

-- Policy for saas_admins to view/update themselves
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'saas_admins' AND policyname = 'Admins can manage themselves'
    ) THEN
        CREATE POLICY "Admins can manage themselves" ON saas_admins
        FOR ALL
        TO authenticated
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    END IF;
END
$$;

-- 2. Ensure 'plan' column is TEXT to support dynamic plans
ALTER TABLE tenants ALTER COLUMN plan DROP DEFAULT;
ALTER TABLE tenants ALTER COLUMN plan TYPE TEXT USING plan::TEXT;
ALTER TABLE tenants ALTER COLUMN plan SET DEFAULT 'FREE';

-- 3. Ensure 'key' column in 'plans' is TEXT
ALTER TABLE plans ALTER COLUMN key TYPE TEXT USING key::TEXT;

-- 4. Add RLS policies for 'tenants' table
-- We use DO block to check existence before creating to avoid errors

DO $$
BEGIN
    -- Policy for Super Admins (saas_admins)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tenants' AND policyname = 'Super Admins can manage tenants'
    ) THEN
        CREATE POLICY "Super Admins can manage tenants" ON tenants
        FOR ALL
        TO authenticated
        USING (
            EXISTS (SELECT 1 FROM saas_admins WHERE id = auth.uid())
        );
    END IF;

    -- Policy for Tenant Owners (owner_auth_id)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tenants' AND policyname = 'Owners can view own tenant'
    ) THEN
        CREATE POLICY "Owners can view own tenant" ON tenants
        FOR SELECT
        TO authenticated
        USING (
            owner_auth_id = auth.uid() OR 
            id IN (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid())
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tenants' AND policyname = 'Owners can update own tenant'
    ) THEN
        CREATE POLICY "Owners can update own tenant" ON tenants
        FOR UPDATE
        TO authenticated
        USING (
            owner_auth_id = auth.uid()
        )
        WITH CHECK (
            owner_auth_id = auth.uid()
        );
    END IF;
END
$$;
