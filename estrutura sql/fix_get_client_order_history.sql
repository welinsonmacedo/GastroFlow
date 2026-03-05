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
            'restaurant_name', r.name,
            'items', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'name', mi.name,
                        'quantity', oi.quantity,
                        'price', oi.unit_price
                    )
                )
                FROM order_items oi
                JOIN menu_items mi ON oi.menu_item_id = mi.id
                WHERE oi.order_id = o.id
            )
        )
    )
    INTO v_orders
    FROM orders o
    JOIN restaurants r ON o.tenant_id = r.id
    WHERE o.client_id = (SELECT id FROM clients WHERE auth_user_id = p_client_id LIMIT 1)
    ORDER BY o.created_at DESC;

    RETURN COALESCE(v_orders, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
