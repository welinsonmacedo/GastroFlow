-- Update place_order to support client_id from auth
-- This ensures that orders placed by authenticated clients are linked to their profile.

CREATE OR REPLACE FUNCTION public.place_order(
    p_tenant_id UUID,
    p_table_id UUID,
    p_order_type TEXT DEFAULT 'DINE_IN',
    p_delivery_info JSONB DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::JSONB,
    p_customer_name TEXT DEFAULT NULL,
    p_waiter_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_total_amount NUMERIC(10,2) := 0;
    v_item_total NUMERIC(10,2);
    v_product_id UUID;
    v_inventory_item_id UUID;
    v_quantity NUMERIC;
    v_product_name TEXT;
    v_product_type TEXT;
    v_product_price NUMERIC;
    v_cost_price NUMERIC;
    v_client_id UUID;
BEGIN
    -- Try to find client_id from auth.uid()
    -- This works because the function is SECURITY DEFINER, but auth.uid() returns the caller's ID.
    -- If the caller is a client, we find their record.
    SELECT id INTO v_client_id FROM public.clients WHERE auth_user_id = auth.uid();

    -- Create the order
    INSERT INTO public.orders (
        tenant_id, table_id, waiter_id, customer_name, 
        status, order_type, delivery_info, is_paid, client_id
    )
    VALUES (
        p_tenant_id, p_table_id, p_waiter_id, p_customer_name, 
        'PENDING', p_order_type, p_delivery_info, false, v_client_id
    )
    RETURNING id INTO v_order_id;

    -- Process items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'productId')::UUID;
        v_inventory_item_id := (v_item->>'inventoryItemId')::UUID;
        v_quantity := (v_item->>'quantity')::NUMERIC;

        IF v_product_id IS NOT NULL THEN
             SELECT name, type, price, cost_price INTO v_product_name, v_product_type, v_product_price, v_cost_price
             FROM public.products WHERE id = v_product_id AND tenant_id = p_tenant_id;
        ELSIF v_inventory_item_id IS NOT NULL THEN
             SELECT name, 'RESALE', sale_price, cost_price INTO v_product_name, v_product_type, v_product_price, v_cost_price
             FROM public.inventory_items WHERE id = v_inventory_item_id AND tenant_id = p_tenant_id;
        END IF;

        IF v_product_name IS NULL THEN
            v_product_name := 'Produto Desconhecido'; 
            v_product_type := 'KITCHEN'; 
            v_product_price := 0; 
            v_cost_price := 0;
        END IF;

        v_item_total := v_product_price * v_quantity;
        v_total_amount := v_total_amount + v_item_total;

        INSERT INTO public.order_items (
            tenant_id, order_id, product_id, inventory_item_id, 
            quantity, notes, status, product_name, 
            product_type, product_price, product_cost_price,
            unit_price, total_price
        ) VALUES (
            p_tenant_id, v_order_id, v_product_id, v_inventory_item_id, 
            v_quantity, COALESCE(v_item->>'notes', ''), 'PENDING', v_product_name, 
            v_product_type, v_product_price, v_cost_price,
            v_product_price, v_item_total
        );
    END LOOP;

    -- Update order total
    UPDATE public.orders SET total_amount = v_total_amount WHERE id = v_order_id;
    
    -- Update table status if applicable
    IF p_table_id IS NOT NULL THEN
        UPDATE public.restaurant_tables SET status = 'OCCUPIED' WHERE id = p_table_id;
    END IF;

    RETURN v_order_id;
END;
$$;
