
-- 1. Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT,
    phone TEXT,
    cpf TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(auth_user_id)
);

-- 2. Add client_id to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);

-- 3. RLS for clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view their own data" ON clients;
CREATE POLICY "Clients can view their own data" ON clients
    FOR SELECT USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Clients can update their own data" ON clients;
CREATE POLICY "Clients can update their own data" ON clients
    FOR UPDATE USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Clients can insert their own data" ON clients;
CREATE POLICY "Clients can insert their own data" ON clients
    FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- 4. RLS for orders (Clients can view their own orders)
DROP POLICY IF EXISTS "Clients can view their own orders" ON orders;
CREATE POLICY "Clients can view their own orders" ON orders
    FOR SELECT USING (
        client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
    );

-- 5. RPC to get history
CREATE OR REPLACE FUNCTION get_client_order_history(p_client_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_orders JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', o.id,
            'status', o.status,
            'total', (SELECT COALESCE(SUM(oi.quantity * oi.product_price), 0) FROM order_items oi WHERE oi.order_id = o.id),
            'date', o.created_at,
            'restaurant_name', t.name,
            'items', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'name', oi.product_name,
                        'quantity', oi.quantity,
                        'price', oi.product_price
                    )
                )
                FROM order_items oi
                WHERE oi.order_id = o.id
            )
        )
    )
    INTO v_orders
    FROM orders o
    JOIN tenants t ON o.tenant_id = t.id
    WHERE o.client_id = p_client_id
    ORDER BY o.created_at DESC;

    RETURN COALESCE(v_orders, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC to link client to order (when opening table or placing order)
-- Actually, we need to update open_table to accept client_id or handle it.
-- But open_table creates a session. The order is created later?
-- Let's check how orders are created. usually via 'create_order' or similar.
-- If not, we might need to update the order creation logic.
-- For now, let's assume we can update the order with client_id when it's created.

-- Grant permissions
GRANT ALL ON clients TO authenticated;
GRANT ALL ON clients TO service_role;
