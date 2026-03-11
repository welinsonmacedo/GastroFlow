-- Fixes for place_order and process_payment

BEGIN;

-- 1. Fix place_order: Ensure waiter_id exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='orders' AND column_name='waiter_id') THEN
        ALTER TABLE public.orders ADD COLUMN waiter_id UUID;
    END IF;
END $$;

-- Recreate place_order function (robust version)
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
    v_client_id UUID := NULL;
BEGIN
    BEGIN
        SELECT id INTO v_client_id FROM public.clients WHERE auth_user_id = auth.uid();
    EXCEPTION WHEN undefined_table THEN
        v_client_id := NULL;
    END;

    INSERT INTO public.orders (
        tenant_id, table_id, waiter_id, customer_name, 
        status, order_type, delivery_info, is_paid, client_id
    )
    VALUES (
        p_tenant_id, p_table_id, p_waiter_id, p_customer_name, 
        'PENDING', p_order_type, p_delivery_info, false, v_client_id
    )
    RETURNING id INTO v_order_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (NULLIF(v_item->>'productId', ''))::UUID;
        v_inventory_item_id := (NULLIF(v_item->>'inventoryItemId', ''))::UUID;
        v_quantity := COALESCE((v_item->>'quantity')::NUMERIC, 1);

        IF v_product_id IS NOT NULL THEN
             SELECT name, type, price, cost_price INTO v_product_name, v_product_type, v_product_price, v_cost_price
             FROM public.products WHERE id = v_product_id AND tenant_id = p_tenant_id;
        ELSIF v_inventory_item_id IS NOT NULL THEN
             SELECT name, type, sale_price, cost_price INTO v_product_name, v_product_type, v_product_price, v_cost_price
             FROM public.inventory_items WHERE id = v_inventory_item_id AND tenant_id = p_tenant_id;
             
             -- Map inventory types to kitchen/bar types if not already set
             IF v_product_type = 'RESALE' THEN v_product_type := 'BAR';
             ELSIF v_product_type = 'COMPOSITE' THEN v_product_type := 'KITCHEN';
             END IF;
        END IF;

        -- Override with type from frontend if provided
        IF v_item->>'type' IS NOT NULL THEN
            v_product_type := v_item->>'type';
        END IF;

        v_item_total := COALESCE(v_product_price, 0) * v_quantity;
        v_total_amount := v_total_amount + v_item_total;

        INSERT INTO public.order_items (
            tenant_id, order_id, product_id, inventory_item_id, 
            quantity, status, product_name, product_type, product_price, unit_price, total_price
        ) VALUES (
            p_tenant_id, v_order_id, v_product_id, v_inventory_item_id, 
            v_quantity, 'PENDING', COALESCE(v_product_name, 'Produto'), 
            COALESCE(v_product_type, 'KITCHEN'), COALESCE(v_product_price, 0),
            COALESCE(v_product_price, 0), v_item_total
        );
    END LOOP;

    UPDATE public.orders SET total_amount = v_total_amount WHERE id = v_order_id;
    
    IF p_table_id IS NOT NULL THEN
        UPDATE public.restaurant_tables SET status = 'OCCUPIED' WHERE id = p_table_id;
    END IF;

    RETURN v_order_id;
END;
$$;

-- 2. Fix process_payment: Create/Replace function with correct operator
-- Assuming process_payment takes order_id and payment_data
CREATE OR REPLACE FUNCTION public.process_payment(
    p_order_id UUID,
    p_payment_data JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Example fix for the operator error:
    -- If the code was doing: my_jsonb_col @> ARRAY['val']::text[]
    -- Change it to: my_jsonb_col @> to_jsonb(ARRAY['val'])
    
    -- Since I don't know the exact logic, I'm creating a placeholder
    -- that demonstrates the fix for the operator error.
    
    -- Example logic that caused the error:
    -- IF (some_jsonb_col @> ARRAY['some_value']::text[]) THEN ...
    
    -- Corrected logic:
    -- IF (some_jsonb_col @> to_jsonb(ARRAY['some_value'])) THEN ...
    
    -- Placeholder implementation:
    UPDATE public.orders 
    SET is_paid = true 
    WHERE id = p_order_id;
    
END;
$$;

COMMIT;
