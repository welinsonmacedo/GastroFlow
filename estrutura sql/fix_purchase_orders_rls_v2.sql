BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow purchase order viewing" ON purchase_orders;
DROP POLICY IF EXISTS "Allow purchase order creation" ON purchase_orders;
DROP POLICY IF EXISTS "Allow purchase order updates" ON purchase_orders;
DROP POLICY IF EXISTS "Allow purchase order deletion" ON purchase_orders;

DROP POLICY IF EXISTS "Allow purchase order item viewing" ON purchase_order_items;
DROP POLICY IF EXISTS "Allow purchase order item creation" ON purchase_order_items;
DROP POLICY IF EXISTS "Allow purchase order item updates" ON purchase_order_items;
DROP POLICY IF EXISTS "Allow purchase order item deletion" ON purchase_order_items;

-- Policies for purchase_orders

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

-- Policies for purchase_order_items

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
