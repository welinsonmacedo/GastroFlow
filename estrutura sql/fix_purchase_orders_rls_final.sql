-- Script to completely reset RLS for purchase_orders and purchase_order_items

BEGIN;

-- 1. Enable RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- 2. Dynamically drop ALL existing policies on these tables to ensure no conflicting or broken policies remain
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    -- Drop all policies for purchase_orders
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'purchase_orders' 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON purchase_orders', pol.policyname); 
    END LOOP; 
    
    -- Drop all policies for purchase_order_items
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'purchase_order_items' 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON purchase_order_items', pol.policyname); 
    END LOOP; 
END $$;

-- 3. Create the correct policies for purchase_orders

-- SELECT
CREATE POLICY "Allow purchase order viewing"
ON purchase_orders FOR SELECT
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid()))
    OR
    (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()))
);

-- INSERT
CREATE POLICY "Allow purchase order creation"
ON purchase_orders FOR INSERT
TO authenticated
WITH CHECK (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid()))
    OR
    (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()))
);

-- UPDATE
CREATE POLICY "Allow purchase order updates"
ON purchase_orders FOR UPDATE
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid()))
    OR
    (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()))
);

-- DELETE
CREATE POLICY "Allow purchase order deletion"
ON purchase_orders FOR DELETE
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid()))
    OR
    (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()))
);

-- 4. Create the correct policies for purchase_order_items

-- SELECT
CREATE POLICY "Allow purchase order item viewing"
ON purchase_order_items FOR SELECT
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid()))
    OR
    (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()))
);

-- INSERT
CREATE POLICY "Allow purchase order item creation"
ON purchase_order_items FOR INSERT
TO authenticated
WITH CHECK (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid()))
    OR
    (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()))
);

-- UPDATE
CREATE POLICY "Allow purchase order item updates"
ON purchase_order_items FOR UPDATE
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid()))
    OR
    (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()))
);

-- DELETE
CREATE POLICY "Allow purchase order item deletion"
ON purchase_order_items FOR DELETE
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid()))
    OR
    (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()))
);

COMMIT;
