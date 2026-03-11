-- Script to fix RLS for purchase_orders and purchase_order_items using IN clause

BEGIN;

-- 1. Enable RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow ALL access to SaaS Admins" ON purchase_orders;
DROP POLICY IF EXISTS "Allow tenant users to view their own orders" ON purchase_orders;
DROP POLICY IF EXISTS "Allow tenant users to create their own orders" ON purchase_orders;
DROP POLICY IF EXISTS "Allow tenant users to update their own orders" ON purchase_orders;
DROP POLICY IF EXISTS "Allow tenant users to delete their own orders" ON purchase_orders;
DROP POLICY IF EXISTS "Enable read access for users based on tenant_id" ON purchase_orders;
DROP POLICY IF EXISTS "Enable insert access for users based on tenant_id" ON purchase_orders;
DROP POLICY IF EXISTS "Enable update access for users based on tenant_id" ON purchase_orders;
DROP POLICY IF EXISTS "Enable delete access for users based on tenant_id" ON purchase_orders;
DROP POLICY IF EXISTS "Allow purchase order viewing" ON purchase_orders;
DROP POLICY IF EXISTS "Allow purchase order creation" ON purchase_orders;
DROP POLICY IF EXISTS "Allow purchase order updates" ON purchase_orders;
DROP POLICY IF EXISTS "Allow purchase order deletion" ON purchase_orders;


DROP POLICY IF EXISTS "Allow ALL access to SaaS Admins" ON purchase_order_items;
DROP POLICY IF EXISTS "Allow tenant users to view their own items" ON purchase_order_items;
DROP POLICY IF EXISTS "Allow tenant users to create their own items" ON purchase_order_items;
DROP POLICY IF EXISTS "Allow tenant users to update their own items" ON purchase_order_items;
DROP POLICY IF EXISTS "Allow tenant users to delete their own items" ON purchase_order_items;
DROP POLICY IF EXISTS "Enable read access for items based on tenant_id" ON purchase_order_items;
DROP POLICY IF EXISTS "Enable insert access for items based on tenant_id" ON purchase_order_items;
DROP POLICY IF EXISTS "Enable update access for items based on tenant_id" ON purchase_order_items;
DROP POLICY IF EXISTS "Enable delete access for items based on tenant_id" ON purchase_order_items;
DROP POLICY IF EXISTS "Allow purchase order item viewing" ON purchase_order_items;
DROP POLICY IF EXISTS "Allow purchase order item creation" ON purchase_order_items;
DROP POLICY IF EXISTS "Allow purchase order item updates" ON purchase_order_items;
DROP POLICY IF EXISTS "Allow purchase order item deletion" ON purchase_order_items;

-- 3. Policies for purchase_orders

-- SELECT
CREATE POLICY "Allow purchase order viewing"
ON purchase_orders FOR SELECT
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid()))
);

-- INSERT
CREATE POLICY "Allow purchase order creation"
ON purchase_orders FOR INSERT
TO authenticated
WITH CHECK (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid()))
);

-- UPDATE
CREATE POLICY "Allow purchase order updates"
ON purchase_orders FOR UPDATE
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid()))
);

-- DELETE
CREATE POLICY "Allow purchase order deletion"
ON purchase_orders FOR DELETE
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid()))
);

-- 4. Policies for purchase_order_items

-- SELECT
CREATE POLICY "Allow purchase order item viewing"
ON purchase_order_items FOR SELECT
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid()))
);

-- INSERT
CREATE POLICY "Allow purchase order item creation"
ON purchase_order_items FOR INSERT
TO authenticated
WITH CHECK (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid()))
);

-- UPDATE
CREATE POLICY "Allow purchase order item updates"
ON purchase_order_items FOR UPDATE
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid()))
);

-- DELETE
CREATE POLICY "Allow purchase order item deletion"
ON purchase_order_items FOR DELETE
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id IN (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid()))
);

COMMIT;
