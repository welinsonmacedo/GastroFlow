-- 1. TENANTS TABLE
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS & ROLES (Mapping Supabase Auth to Tenants)
CREATE TABLE tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Would reference auth.users(id) in a real Supabase project
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'WAITER', 'CASHIER', 'KITCHEN')),
    UNIQUE(tenant_id, user_id)
);

-- 3. PRODUCTS
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 4. ORDERS
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    table_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PREPARING', 'READY', 'DELIVERED', 'PAID', 'CANCELLED')),
    total DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INT NOT NULL DEFAULT 1,
    price_at_time DECIMAL(10, 2) NOT NULL
);

-- 5. INVENTORY
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL DEFAULT 0,
    min_quantity DECIMAL(10, 3) NOT NULL DEFAULT 5
);

-- 6. AUDIT LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX idx_tenant_users_user_id ON tenant_users(user_id);

-- ==========================================
-- DATABASE LOGIC: AUTOMATIC INVENTORY DEDUCTION
-- ==========================================
CREATE OR REPLACE FUNCTION deduct_inventory_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Assuming a product_ingredients mapping table exists (simplified for example)
    -- In a real scenario, you'd join with product_ingredients.
    -- Here we just do a dummy update to show the trigger works.
    UPDATE inventory_items ii
    SET quantity = ii.quantity - NEW.quantity
    WHERE ii.tenant_id = (SELECT tenant_id FROM orders WHERE id = NEW.order_id)
    AND ii.name = 'Generic Ingredient'; -- Placeholder logic
      
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deduct_inventory
AFTER INSERT ON order_items
FOR EACH ROW EXECUTE FUNCTION deduct_inventory_on_order();

-- ==========================================
-- DATABASE LOGIC: AUDIT LOGS
-- ==========================================
CREATE OR REPLACE FUNCTION log_order_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (tenant_id, user_id, action, entity, entity_id, details)
    VALUES (
        NEW.tenant_id,
        '00000000-0000-0000-0000-000000000000', -- auth.uid() in real supabase
        TG_OP,
        'ORDER',
        NEW.id,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_orders
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION log_order_changes();
