-- Fix for Restaurant Ordering System
-- This script ensures schema consistency, fixes RPC signatures, and grants necessary permissions.

BEGIN;

-- 1. Ensure schema consistency for orders and order_items
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'DINE_IN';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_info JSONB DEFAULT NULL;

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_id UUID;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS inventory_item_id UUID;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_type TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_price NUMERIC(10,2);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_cost_price NUMERIC(10,2);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Grant permissions to anon for customer menu and ordering
-- This is critical for the ClientApp (customer menu) to work.
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.menu_categories TO anon;
GRANT SELECT ON public.restaurant_tables TO anon;
GRANT SELECT ON public.orders TO anon;
GRANT SELECT ON public.order_items TO anon;

-- Also grant to authenticated for waiter/POS apps
GRANT SELECT ON public.products TO authenticated;
GRANT SELECT ON public.menu_categories TO authenticated;
GRANT SELECT ON public.restaurant_tables TO authenticated;
GRANT SELECT ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;

-- Grant execute on RPCs
GRANT EXECUTE ON FUNCTION public.place_order TO anon;
GRANT EXECUTE ON FUNCTION public.place_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_pos_sale TO anon;
GRANT EXECUTE ON FUNCTION public.process_pos_sale TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_payment TO anon;
GRANT EXECUTE ON FUNCTION public.process_payment TO authenticated;

-- 3. Update place_order to match frontend signature and use products table
-- The frontend sends: p_tenant_id, p_table_id, p_order_type, p_delivery_info, p_items
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
BEGIN
    -- Create the order
    INSERT INTO public.orders (
        tenant_id, table_id, waiter_id, customer_name, 
        status, order_type, delivery_info, is_paid
    )
    VALUES (
        p_tenant_id, p_table_id, p_waiter_id, p_customer_name, 
        'PENDING', p_order_type, p_delivery_info, false
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

-- 4. Update process_pos_sale to match frontend signature
-- The frontend sends: p_tenant_id, p_customer_name, p_method, p_items, p_cashier_name
CREATE OR REPLACE FUNCTION public.process_pos_sale(
    p_tenant_id UUID,
    p_customer_name TEXT,
    p_method TEXT,
    p_items JSONB,
    p_cashier_name TEXT DEFAULT 'Sistema'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_inventory_item_id UUID;
    v_quantity NUMERIC;
    v_notes TEXT;
    v_product_name TEXT;
    v_product_type TEXT;
    v_product_price NUMERIC;
    v_cost_price NUMERIC;
    v_total_amount NUMERIC := 0;
BEGIN
    -- Create Order first (status DELIVERED and is_paid true)
    INSERT INTO public.orders (tenant_id, status, is_paid, customer_name, order_type)
    VALUES (p_tenant_id, 'DELIVERED', true, p_customer_name, 'PDV')
    RETURNING id INTO v_order_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'productId')::UUID;
        v_inventory_item_id := (v_item->>'inventoryItemId')::UUID;
        v_quantity := (v_item->>'quantity')::NUMERIC;
        v_notes := COALESCE(v_item->>'notes', '');

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

        IF v_product_name IS NULL THEN
            v_product_name := 'Produto Desconhecido'; v_product_type := 'KITCHEN'; v_product_price := 0; v_cost_price := 0;
        END IF;

        v_total_amount := v_total_amount + (v_product_price * v_quantity);

        INSERT INTO public.order_items (
            tenant_id, order_id, product_id, inventory_item_id, 
            quantity, notes, status, product_name, 
            product_type, product_price, product_cost_price,
            unit_price, total_price
        )
        VALUES (
            p_tenant_id, v_order_id, v_product_id, v_inventory_item_id, 
            v_quantity, v_notes, 'DELIVERED', v_product_name, 
            v_product_type, v_product_price, v_cost_price,
            v_product_price, (v_product_price * v_quantity)
        );
    END LOOP;

    -- Update order total
    UPDATE public.orders SET total_amount = v_total_amount WHERE id = v_order_id;

    -- Register financial transaction
    INSERT INTO public.transactions (
        tenant_id, order_id, amount, method, created_at, 
        items_summary, status, cashier_name
    )
    VALUES (
        p_tenant_id, v_order_id, v_total_amount, p_method, NOW(), 
        'Venda Balcão (PDV)', 'COMPLETED', p_cashier_name
    );

    RETURN jsonb_build_object('success', true, 'order_id', v_order_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. Ensure RLS policies allow anon access where needed
-- For products, categories, tables, etc.
DROP POLICY IF EXISTS "Allow anon viewing products" ON public.products;
CREATE POLICY "Allow anon viewing products" ON public.products FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon viewing categories" ON public.menu_categories;
CREATE POLICY "Allow anon viewing categories" ON public.menu_categories FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon viewing tables" ON public.restaurant_tables;
CREATE POLICY "Allow anon viewing tables" ON public.restaurant_tables FOR SELECT TO anon USING (true);

-- For orders and items, anon should be able to see their own if we had a session, 
-- but for now let's allow viewing by tenant_id if we want to be simple, 
-- or just allow all for now to fix the blocker.
DROP POLICY IF EXISTS "Allow anon viewing orders" ON public.orders;
CREATE POLICY "Allow anon viewing orders" ON public.orders FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon viewing items" ON public.order_items;
CREATE POLICY "Allow anon viewing items" ON public.order_items FOR SELECT TO anon USING (true);

COMMIT;
