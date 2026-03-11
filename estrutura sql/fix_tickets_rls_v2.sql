-- Script to fix RLS for tickets using IN clause

BEGIN;

-- 1. Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow ALL access to SaaS Admins" ON tickets;
DROP POLICY IF EXISTS "Allow tenant users to view their own tickets" ON tickets;
DROP POLICY IF EXISTS "Allow tenant users to create their own tickets" ON tickets;
DROP POLICY IF EXISTS "Allow tenant users to update their own tickets" ON tickets;
DROP POLICY IF EXISTS "Allow tenant users to delete their own tickets" ON tickets;
DROP POLICY IF EXISTS "Enable read access for users based on tenant_id" ON tickets;
DROP POLICY IF EXISTS "Enable insert access for users based on tenant_id" ON tickets;
DROP POLICY IF EXISTS "Enable update access for users based on tenant_id" ON tickets;
DROP POLICY IF EXISTS "Enable delete access for users based on tenant_id" ON tickets;
DROP POLICY IF EXISTS "Allow ticket viewing" ON tickets;
DROP POLICY IF EXISTS "Allow ticket creation" ON tickets;
DROP POLICY IF EXISTS "Allow ticket updates" ON tickets;
DROP POLICY IF EXISTS "Allow ticket deletion by admins" ON tickets;

-- 3. Policies for tickets

-- SELECT
CREATE POLICY "Allow ticket viewing"
ON tickets FOR SELECT
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid()))
);

-- INSERT
CREATE POLICY "Allow ticket creation"
ON tickets FOR INSERT
TO authenticated
WITH CHECK (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid()))
);

-- UPDATE
CREATE POLICY "Allow ticket updates"
ON tickets FOR UPDATE
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid()))
);

-- DELETE
CREATE POLICY "Allow ticket deletion by admins"
ON tickets FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()));

COMMIT;
