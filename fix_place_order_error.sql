-- Fix place_order error by ensuring clients table and client_id column exist
-- and making the place_order function robust.

BEGIN;

-- 1. Create clients table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT,
    phone TEXT,
    cpf TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(auth_user_id)
);

-- 2. Add client_id to orders if it doesn't exist
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id);

-- 3. Update place_order function to be robust
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
    -- Try to find client_id from auth.uid() safely
    BEGIN
        SELECT id INTO v_client_id FROM public.clients WHERE auth_user_id = auth.uid();
    EXCEPTION WHEN undefined_table THEN
        -- Ignore if clients table doesn't exist
        v_client_id := NULL;
    END;

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
        -- Safely extract UUIDs, handling empty strings
        IF v_item->>'productId' IS NOT NULL AND v_item->>'productId' != '' THEN
            BEGIN
                v_product_id := (v_item->>'productId')::UUID;
            EXCEPTION WHEN invalid_text_representation THEN
                v_product_id := NULL;
            END;
        ELSE
            v_product_id := NULL;
        END IF;
        
        IF v_item->>'inventoryItemId' IS NOT NULL AND v_item->>'inventoryItemId' != '' THEN
            BEGIN
                v_inventory_item_id := (v_item->>'inventoryItemId')::UUID;
            EXCEPTION WHEN invalid_text_representation THEN
                v_inventory_item_id := NULL;
            END;
        ELSE
            v_inventory_item_id := NULL;
        END IF;
        
        v_quantity := COALESCE((v_item->>'quantity')::NUMERIC, 1);

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

        v_item_total := COALESCE(v_product_price, 0) * v_quantity;
        v_total_amount := v_total_amount + v_item_total;

        INSERT INTO public.order_items (
            tenant_id, order_id, product_id, inventory_item_id, 
            quantity, notes, status, product_name, 
            product_type, product_price, product_cost_price,
            unit_price, total_price
        ) VALUES (
            p_tenant_id, v_order_id, v_product_id, v_inventory_item_id, 
            v_quantity, COALESCE(v_item->>'notes', ''), 'PENDING', v_product_name, 
            v_product_type, COALESCE(v_product_price, 0), COALESCE(v_cost_price, 0),
            COALESCE(v_product_price, 0), v_item_total
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

COMMIT;
