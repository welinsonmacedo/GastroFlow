
-- Fix get_client_order_history to use correct tables and handle auth_user_id
-- This version joins with 'tenants' for restaurant name and uses 'order_items' directly.

CREATE OR REPLACE FUNCTION get_client_order_history(p_client_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_orders JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', o.id,
            'status', o.status,
            'total', o.total_amount,
            'date', o.created_at,
            'restaurant_name', t.name,
            'items', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'name', oi.product_name,
                        'quantity', oi.quantity,
                        'price', oi.unit_price
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
    WHERE o.client_id = (SELECT id FROM clients WHERE auth_user_id = p_client_id LIMIT 1)
    ORDER BY o.created_at DESC;

    RETURN COALESCE(v_orders, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_client_order_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_order_history TO anon;
