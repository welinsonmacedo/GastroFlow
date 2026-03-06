-- RPCs for Restaurant/Order Module Logic
-- This file moves frontend logic for restaurant operations to the backend (Supabase)

-- 1. Helper Function: Close Table Internal
CREATE OR REPLACE FUNCTION public.close_table_internal(
    p_tenant_id UUID,
    p_table_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_staff_record RECORD;
    v_new_routes TEXT[];
    v_route_to_remove TEXT;
BEGIN
    -- Update table status
    UPDATE public.restaurant_tables
    SET status = 'AVAILABLE',
        customer_name = NULL,
        access_code = NULL
    WHERE id = p_table_id AND tenant_id = p_tenant_id;

    -- Cancel unpaid orders for this table
    UPDATE public.orders
    SET status = 'CANCELLED',
        updated_at = NOW()
    WHERE table_id = p_table_id AND tenant_id = p_tenant_id AND is_paid = false AND status != 'CANCELLED';

    -- Clear OPENER routes from staff
    v_route_to_remove := 'OPENER:' || p_table_id;
    
    FOR v_staff_record IN 
        SELECT id, allowed_routes 
        FROM public.staff 
        WHERE tenant_id = p_tenant_id AND allowed_routes @> ARRAY[v_route_to_remove]
    LOOP
        SELECT ARRAY_AGG(r) INTO v_new_routes
        FROM UNNEST(v_staff_record.allowed_routes) AS r
        WHERE r != v_route_to_remove;

        UPDATE public.staff
        SET allowed_routes = COALESCE(v_new_routes, ARRAY[]::TEXT[])
        WHERE id = v_staff_record.id;
    END LOOP;
END;
$$;

-- 2. Process Payment
CREATE OR REPLACE FUNCTION public.process_payment(
    p_tenant_id UUID,
    p_table_id UUID,
    p_amount NUMERIC,
    p_method TEXT,
    p_cashier_name TEXT,
    p_order_id UUID,
    p_specific_order_ids UUID[],
    p_courier_info JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_delivery_info JSONB;
    v_pending_orders_count INTEGER;
    v_items_summary TEXT;
    v_transaction_order_id UUID;
BEGIN
    -- If it's a delivery payment with a specific ID
    IF p_order_id IS NOT NULL THEN
        SELECT delivery_info INTO v_current_delivery_info
        FROM public.orders
        WHERE id = p_order_id AND tenant_id = p_tenant_id;

        IF v_current_delivery_info IS NOT NULL THEN
            v_current_delivery_info := jsonb_set(v_current_delivery_info, '{paymentMethod}', to_jsonb(p_method));
            v_current_delivery_info := jsonb_set(v_current_delivery_info, '{paymentStatus}', '"PAID"');
            
            IF p_courier_info IS NOT NULL AND p_courier_info ? 'id' THEN
                v_current_delivery_info := jsonb_set(v_current_delivery_info, '{courierId}', p_courier_info->'id');
                v_current_delivery_info := jsonb_set(v_current_delivery_info, '{courierName}', p_courier_info->'name');
            END IF;
        END IF;

        UPDATE public.orders
        SET status = 'DELIVERED',
            is_paid = true,
            delivery_info = v_current_delivery_info,
            updated_at = NOW()
        WHERE id = p_order_id AND tenant_id = p_tenant_id;

        UPDATE public.order_items
        SET status = 'DELIVERED',
            updated_at = NOW()
        WHERE order_id = p_order_id AND tenant_id = p_tenant_id;

        v_items_summary := 'Delivery/Pedido #' || SUBSTRING(p_order_id::TEXT FROM 1 FOR 4);
        v_transaction_order_id := p_order_id;

    -- If it's a table payment
    ELSIF p_table_id IS NOT NULL THEN
        IF p_specific_order_ids IS NOT NULL AND array_length(p_specific_order_ids, 1) > 0 THEN
            -- Partial table payment
            UPDATE public.orders
            SET is_paid = true,
                updated_at = NOW()
            WHERE id = ANY(p_specific_order_ids) AND tenant_id = p_tenant_id;

            -- Check if all orders for the table are paid
            SELECT COUNT(*) INTO v_pending_orders_count
            FROM public.orders
            WHERE table_id = p_table_id AND is_paid = false AND status != 'CANCELLED' AND tenant_id = p_tenant_id;

            IF v_pending_orders_count = 0 THEN
                PERFORM public.close_table_internal(p_tenant_id, p_table_id);
            END IF;

            v_items_summary := 'Parcial Mesa (x' || array_length(p_specific_order_ids, 1) || ')';
            IF array_length(p_specific_order_ids, 1) = 1 THEN
                v_transaction_order_id := p_specific_order_ids[1];
            END IF;
        ELSE
            -- Full table payment
            UPDATE public.orders
            SET is_paid = true,
                updated_at = NOW()
            WHERE table_id = p_table_id AND is_paid = false AND tenant_id = p_tenant_id;

            PERFORM public.close_table_internal(p_tenant_id, p_table_id);
            v_items_summary := 'Mesa Completa';
        END IF;
    END IF;

    -- Register financial transaction
    INSERT INTO public.transactions (
        tenant_id,
        table_id,
        order_id,
        amount,
        method,
        items_summary,
        cashier_name,
        created_at
    ) VALUES (
        p_tenant_id,
        p_table_id,
        v_transaction_order_id,
        p_amount,
        p_method,
        v_items_summary,
        p_cashier_name,
        NOW()
    );
END;
$$;

-- 3. Open Table
CREATE OR REPLACE FUNCTION public.open_table(
    p_tenant_id UUID,
    p_table_id UUID,
    p_customer_name TEXT,
    p_access_code TEXT,
    p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_routes TEXT[];
    v_route_to_add TEXT;
BEGIN
    UPDATE public.restaurant_tables
    SET status = 'OCCUPIED',
        customer_name = p_customer_name,
        access_code = p_access_code
    WHERE id = p_table_id AND tenant_id = p_tenant_id;

    IF p_user_id IS NOT NULL THEN
        v_route_to_add := 'OPENER:' || p_table_id;
        
        SELECT allowed_routes INTO v_current_routes
        FROM public.staff
        WHERE id = p_user_id AND tenant_id = p_tenant_id;

        IF v_current_routes IS NULL OR NOT (v_current_routes @> ARRAY[v_route_to_add]) THEN
            UPDATE public.staff
            SET allowed_routes = array_append(COALESCE(allowed_routes, ARRAY[]::TEXT[]), v_route_to_add)
            WHERE id = p_user_id AND tenant_id = p_tenant_id;
        END IF;
    END IF;
END;
$$;

-- 4. Close Table
CREATE OR REPLACE FUNCTION public.close_table(
    p_tenant_id UUID,
    p_table_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM public.close_table_internal(p_tenant_id, p_table_id);
END;
$$;

-- 5. Assign Table
CREATE OR REPLACE FUNCTION public.assign_table(
    p_tenant_id UUID,
    p_table_id UUID,
    p_waiter_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_staff_record RECORD;
    v_new_routes TEXT[];
    v_route_to_manage TEXT;
    v_current_routes TEXT[];
BEGIN
    v_route_to_manage := 'TABLE:' || p_table_id;

    -- 1. Remove from previous owners
    FOR v_staff_record IN 
        SELECT id, allowed_routes 
        FROM public.staff 
        WHERE tenant_id = p_tenant_id AND allowed_routes @> ARRAY[v_route_to_manage]
    LOOP
        SELECT ARRAY_AGG(r) INTO v_new_routes
        FROM UNNEST(v_staff_record.allowed_routes) AS r
        WHERE r != v_route_to_manage;

        UPDATE public.staff
        SET allowed_routes = COALESCE(v_new_routes, ARRAY[]::TEXT[])
        WHERE id = v_staff_record.id;
    END LOOP;

    -- 2. Add to new owner
    IF p_waiter_id IS NOT NULL THEN
        SELECT allowed_routes INTO v_current_routes
        FROM public.staff
        WHERE id = p_waiter_id AND tenant_id = p_tenant_id;

        IF v_current_routes IS NULL OR NOT (v_current_routes @> ARRAY[v_route_to_manage]) THEN
            UPDATE public.staff
            SET allowed_routes = array_append(COALESCE(allowed_routes, ARRAY[]::TEXT[]), v_route_to_manage)
            WHERE id = p_waiter_id AND tenant_id = p_tenant_id;
        END IF;
    END IF;
END;
$$;

-- 6. Add Table
CREATE OR REPLACE FUNCTION public.add_table(
    p_tenant_id UUID,
    p_max_tables INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_count INTEGER;
    v_new_number INTEGER;
BEGIN
    -- Check limits if max_tables is not -1
    IF p_max_tables != -1 THEN
        SELECT COUNT(*) INTO v_current_count
        FROM public.restaurant_tables
        WHERE tenant_id = p_tenant_id;

        IF v_current_count >= p_max_tables THEN
            RAISE EXCEPTION 'Limite de mesas atingido para o seu plano.';
        END IF;
    END IF;

    -- Determine new table number
    SELECT COALESCE(MAX(number), 0) + 1 INTO v_new_number
    FROM public.restaurant_tables
    WHERE tenant_id = p_tenant_id;

    INSERT INTO public.restaurant_tables (
        tenant_id,
        number,
        status
    ) VALUES (
        p_tenant_id,
        v_new_number,
        'AVAILABLE'
    );

    RETURN jsonb_build_object('success', true, 'number', v_new_number);
END;
$$;

-- 7. Add Product (Enforces limits)
CREATE OR REPLACE FUNCTION public.add_product(
    p_tenant_id UUID,
    p_max_products INTEGER,
    p_product JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_count INTEGER;
    v_new_id UUID;
BEGIN
    -- Check limits if max_products is not -1
    IF p_max_products != -1 THEN
        SELECT COUNT(*) INTO v_current_count
        FROM public.products
        WHERE tenant_id = p_tenant_id;

        IF v_current_count >= p_max_products THEN
            RAISE EXCEPTION 'Limite de produtos atingido para o seu plano.';
        END IF;
    END IF;

    INSERT INTO public.products (
        tenant_id,
        name,
        price,
        cost_price,
        category,
        type,
        image,
        description,
        is_visible,
        sort_order,
        linked_inventory_item_id,
        is_extra,
        linked_extra_ids,
        target_categories
    ) VALUES (
        p_tenant_id,
        p_product->>'name',
        (p_product->>'price')::NUMERIC,
        (p_product->>'costPrice')::NUMERIC,
        p_product->>'category',
        p_product->>'type',
        p_product->>'image',
        p_product->>'description',
        COALESCE((p_product->>'isVisible')::BOOLEAN, true),
        (p_product->>'sortOrder')::INTEGER,
        (p_product->>'linkedInventoryItemId')::UUID,
        COALESCE((p_product->>'isExtra')::BOOLEAN, false),
        ARRAY(SELECT jsonb_array_elements_text(p_product->'linkedExtraIds')),
        ARRAY(SELECT jsonb_array_elements_text(p_product->'targetCategories'))
    ) RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('success', true, 'id', v_new_id);
END;
$$;

-- 8. Add Staff (Enforces limits)
CREATE OR REPLACE FUNCTION public.add_staff(
    p_tenant_id UUID,
    p_max_staff INTEGER,
    p_staff JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_count INTEGER;
    v_new_id UUID;
BEGIN
    -- Check limits if max_staff is not -1
    IF p_max_staff != -1 THEN
        SELECT COUNT(*) INTO v_current_count
        FROM public.staff
        WHERE tenant_id = p_tenant_id;

        IF v_current_count >= p_max_staff THEN
            RAISE EXCEPTION 'Limite de colaboradores atingido para o seu plano.';
        END IF;
    END IF;

    INSERT INTO public.staff (
        tenant_id,
        name,
        role,
        custom_role_id,
        pin,
        email,
        allowed_routes,
        department,
        hr_job_role_id,
        hire_date,
        contract_type,
        work_model,
        base_salary,
        benefits_total,
        status,
        shift_id,
        phone,
        document_cpf,
        dependents_count,
        created_by,
        birth_date,
        rg_number,
        rg_issuer,
        rg_state,
        address_zip,
        address_street,
        address_number,
        address_complement,
        address_neighborhood,
        address_city,
        address_state,
        pis_pasep,
        ctps_number,
        ctps_series,
        ctps_state,
        marital_status,
        emergency_contact_name,
        emergency_contact_phone,
        fathers_name,
        mothers_name,
        education_level,
        voter_registration,
        bank_name,
        bank_agency,
        bank_account,
        bank_account_type,
        pix_key,
        health_plan_info,
        pension_info,
        transport_voucher_info,
        meal_voucher_info,
        sst_info
    ) VALUES (
        p_tenant_id,
        p_staff->>'name',
        p_staff->>'role',
        (p_staff->>'custom_role_id')::UUID,
        p_staff->>'pin',
        p_staff->>'email',
        ARRAY(SELECT jsonb_array_elements_text(p_staff->'allowed_routes')),
        p_staff->>'department',
        (p_staff->>'hr_job_role_id')::UUID,
        (p_staff->>'hire_date')::DATE,
        p_staff->>'contract_type',
        p_staff->>'work_model',
        (p_staff->>'base_salary')::NUMERIC,
        (p_staff->>'benefits_total')::NUMERIC,
        p_staff->>'status',
        (p_staff->>'shift_id')::UUID,
        p_staff->>'phone',
        p_staff->>'document_cpf',
        (p_staff->>'dependents_count')::INTEGER,
        (p_staff->>'created_by')::UUID,
        (p_staff->>'birth_date')::DATE,
        p_staff->>'rg_number',
        p_staff->>'rg_issuer',
        p_staff->>'rg_state',
        p_staff->>'address_zip',
        p_staff->>'address_street',
        p_staff->>'address_number',
        p_staff->>'address_complement',
        p_staff->>'address_neighborhood',
        p_staff->>'address_city',
        p_staff->>'address_state',
        p_staff->>'pis_pasep',
        p_staff->>'ctps_number',
        p_staff->>'ctps_series',
        p_staff->>'ctps_state',
        p_staff->>'marital_status',
        p_staff->>'emergency_contact_name',
        p_staff->>'emergency_contact_phone',
        p_staff->>'fathers_name',
        p_staff->>'mothers_name',
        p_staff->>'education_level',
        p_staff->>'voter_registration',
        p_staff->>'bank_name',
        p_staff->>'bank_agency',
        p_staff->>'bank_account',
        p_staff->>'bank_account_type',
        p_staff->>'pix_key',
        p_staff->'health_plan_info',
        p_staff->'pension_info',
        p_staff->'transport_voucher_info',
        p_staff->'meal_voucher_info',
        p_staff->'sst_info'
    ) RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('success', true, 'id', v_new_id);
END;
$$;

-- 9. Upsert Inventory Item (handles item, recipes, and extra product sync)
CREATE OR REPLACE FUNCTION public.upsert_inventory_item(
    p_tenant_id UUID,
    p_item JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
    v_new_id UUID;
    v_recipe_element JSONB;
    v_existing_prod_id UUID;
BEGIN
    v_id := (p_item->>'id')::UUID;

    IF v_id IS NULL THEN
        -- Insert new item
        INSERT INTO public.inventory_items (
            tenant_id,
            name,
            barcode,
            unit,
            quantity,
            min_quantity,
            cost_price,
            sale_price,
            type,
            category,
            description,
            image,
            is_extra,
            target_categories
        ) VALUES (
            p_tenant_id,
            p_item->>'name',
            p_item->>'barcode',
            p_item->>'unit',
            (p_item->>'quantity')::NUMERIC,
            (p_item->>'minQuantity')::NUMERIC,
            (p_item->>'costPrice')::NUMERIC,
            (p_item->>'salePrice')::NUMERIC,
            p_item->>'type',
            p_item->>'category',
            p_item->>'description',
            p_item->>'image',
            COALESCE((p_item->>'isExtra')::BOOLEAN, false),
            ARRAY(SELECT jsonb_array_elements_text(p_item->'targetCategories'))
        ) RETURNING id INTO v_new_id;

        -- Insert recipes if composite
        IF p_item->>'type' = 'COMPOSITE' AND p_item->'recipe' IS NOT NULL THEN
            FOR v_recipe_element IN SELECT * FROM jsonb_array_elements(p_item->'recipe')
            LOOP
                INSERT INTO public.inventory_recipes (
                    tenant_id,
                    parent_item_id,
                    ingredient_item_id,
                    quantity
                ) VALUES (
                    p_tenant_id,
                    v_new_id,
                    (v_recipe_element->>'ingredientId')::UUID,
                    (v_recipe_element->>'quantity')::NUMERIC
                );
            END LOOP;
        END IF;
    ELSE
        -- Update existing item
        v_new_id := v_id;
        UPDATE public.inventory_items
        SET name = p_item->>'name',
            barcode = p_item->>'barcode',
            unit = p_item->>'unit',
            min_quantity = (p_item->>'minQuantity')::NUMERIC,
            cost_price = (p_item->>'costPrice')::NUMERIC,
            sale_price = (p_item->>'salePrice')::NUMERIC,
            type = p_item->>'type',
            category = p_item->>'category',
            description = p_item->>'description',
            image = p_item->>'image',
            is_extra = COALESCE((p_item->>'isExtra')::BOOLEAN, false),
            target_categories = ARRAY(SELECT jsonb_array_elements_text(p_item->'targetCategories')),
            updated_at = NOW()
        WHERE id = v_id AND tenant_id = p_tenant_id;

        -- Update recipes if composite
        IF p_item->>'type' = 'COMPOSITE' THEN
            DELETE FROM public.inventory_recipes WHERE parent_item_id = v_id AND tenant_id = p_tenant_id;
            
            IF p_item->'recipe' IS NOT NULL THEN
                FOR v_recipe_element IN SELECT * FROM jsonb_array_elements(p_item->'recipe')
                LOOP
                    INSERT INTO public.inventory_recipes (
                        tenant_id,
                        parent_item_id,
                        ingredient_item_id,
                        quantity
                    ) VALUES (
                        p_tenant_id,
                        v_id,
                        (v_recipe_element->>'ingredientId')::UUID,
                        (v_recipe_element->>'quantity')::NUMERIC
                    );
                END LOOP;
            END IF;
        END IF;
    END IF;

    -- Sync Extra to Products
    IF COALESCE((p_item->>'isExtra')::BOOLEAN, false) THEN
        SELECT id INTO v_existing_prod_id
        FROM public.products
        WHERE linked_inventory_item_id = v_new_id AND is_extra = true AND tenant_id = p_tenant_id
        LIMIT 1;

        IF v_existing_prod_id IS NOT NULL THEN
            UPDATE public.products
            SET name = p_item->>'name',
                price = (p_item->>'salePrice')::NUMERIC,
                cost_price = (p_item->>'costPrice')::NUMERIC,
                description = p_item->>'description',
                target_categories = ARRAY(SELECT jsonb_array_elements_text(p_item->'targetCategories')),
                type = CASE WHEN p_item->>'type' = 'RESALE' THEN 'BAR' ELSE 'KITCHEN' END,
                image = p_item->>'image',
                updated_at = NOW()
            WHERE id = v_existing_prod_id AND tenant_id = p_tenant_id;
        ELSE
            INSERT INTO public.products (
                tenant_id,
                name,
                price,
                cost_price,
                linked_inventory_item_id,
                description,
                is_extra,
                target_categories,
                category,
                type,
                image,
                is_visible
            ) VALUES (
                p_tenant_id,
                p_item->>'name',
                (p_item->>'salePrice')::NUMERIC,
                (p_item->>'costPrice')::NUMERIC,
                v_new_id,
                p_item->>'description',
                true,
                ARRAY(SELECT jsonb_array_elements_text(p_item->'targetCategories')),
                'Adicionais',
                CASE WHEN p_item->>'type' = 'RESALE' THEN 'BAR' ELSE 'KITCHEN' END,
                p_item->>'image',
                true
            );
        END IF;
    ELSE
        DELETE FROM public.products
        WHERE linked_inventory_item_id = v_new_id AND is_extra = true AND tenant_id = p_tenant_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'id', v_new_id);
END;
$$;

-- 10. Process Inventory Adjustments
CREATE OR REPLACE FUNCTION public.process_inventory_adjustments(
    p_tenant_id UUID,
    p_adjustments JSONB,
    p_user_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_adj JSONB;
    v_item_id UUID;
    v_real_qty NUMERIC;
    v_current_qty NUMERIC;
    v_diff NUMERIC;
    v_type TEXT;
BEGIN
    FOR v_adj IN SELECT * FROM jsonb_array_elements(p_adjustments)
    LOOP
        v_item_id := (v_adj->>'itemId')::UUID;
        v_real_qty := (v_adj->>'realQty')::NUMERIC;

        SELECT quantity INTO v_current_qty
        FROM public.inventory_items
        WHERE id = v_item_id AND tenant_id = p_tenant_id;

        IF v_current_qty IS NOT NULL THEN
            v_diff := v_real_qty - v_current_qty;
            
            IF ABS(v_diff) > 0.0001 THEN
                IF v_diff > 0 THEN
                    v_type := 'IN';
                ELSE
                    v_type := 'OUT';
                END IF;

                -- Call adjust_inventory
                PERFORM public.adjust_inventory(
                    p_tenant_id,
                    v_item_id,
                    v_type,
                    ABS(v_diff),
                    'Ajuste de Balanço',
                    p_user_name
                );
            END IF;
        END IF;
    END LOOP;
END;
$$;
