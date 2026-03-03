-- RPCs for Restaurant Settings Logic
-- This file moves frontend logic for settings to the backend (Supabase)

-- 1. Update General Business Info
CREATE OR REPLACE FUNCTION public.update_restaurant_business_info(
    p_tenant_id UUID,
    p_updates JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_info JSONB;
    v_admin_pin TEXT;
BEGIN
    -- Validation Logic
    v_admin_pin := p_updates->>'adminPin';
    IF v_admin_pin IS NOT NULL AND length(v_admin_pin) > 0 AND length(v_admin_pin) < 4 THEN
        RAISE EXCEPTION 'O PIN de administrador deve ter pelo menos 4 dígitos.';
    END IF;

    -- Get current business_info
    SELECT business_info INTO v_current_info FROM public.tenants WHERE id = p_tenant_id;
    
    -- Merge updates (shallow merge for top-level fields)
    v_current_info = v_current_info || p_updates;
    
    -- Update the table
    UPDATE public.tenants 
    SET business_info = v_current_info,
        updated_at = NOW()
    WHERE id = p_tenant_id;
END;
$$;

-- 2. Upsert Delivery Method
CREATE OR REPLACE FUNCTION public.upsert_delivery_method(
    p_tenant_id UUID,
    p_method JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_info JSONB;
    v_methods JSONB;
    v_new_methods JSONB := '[]'::JSONB;
    v_item JSONB;
    v_found BOOLEAN := FALSE;
    v_method_id TEXT;
BEGIN
    -- Get current business_info
    SELECT business_info INTO v_current_info FROM public.tenants WHERE id = p_tenant_id;
    
    v_methods := COALESCE(v_current_info->'deliverySettings', '[]'::JSONB);
    v_method_id := p_method->>'id';
    
    -- Logic: If ID exists, update. If not, generate ID and add.
    IF v_method_id IS NULL OR v_method_id = '' THEN
        v_method_id := encode(gen_random_bytes(6), 'hex');
        p_method := p_method || jsonb_build_object('id', v_method_id);
    END IF;

    -- Iterate and replace or append
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_methods)
    LOOP
        IF v_item->>'id' = v_method_id THEN
            v_new_methods := v_new_methods || p_method;
            v_found := TRUE;
        ELSE
            v_new_methods := v_new_methods || v_item;
        END IF;
    END LOOP;
    
    IF NOT v_found THEN
        v_new_methods := v_new_methods || p_method;
    END IF;
    
    -- Update business_info
    v_current_info := v_current_info || jsonb_build_object('deliverySettings', v_new_methods);
    
    UPDATE public.tenants 
    SET business_info = v_current_info,
        updated_at = NOW()
    WHERE id = p_tenant_id;
END;
$$;

-- 3. Delete Delivery Method
CREATE OR REPLACE FUNCTION public.delete_delivery_method(
    p_tenant_id UUID,
    p_method_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_info JSONB;
    v_methods JSONB;
    v_new_methods JSONB := '[]'::JSONB;
    v_item JSONB;
BEGIN
    SELECT business_info INTO v_current_info FROM public.tenants WHERE id = p_tenant_id;
    v_methods := COALESCE(v_current_info->'deliverySettings', '[]'::JSONB);
    
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_methods)
    LOOP
        IF v_item->>'id' != p_method_id THEN
            v_new_methods := v_new_methods || v_item;
        END IF;
    END LOOP;
    
    v_current_info := v_current_info || jsonb_build_object('deliverySettings', v_new_methods);
    
    UPDATE public.tenants 
    SET business_info = v_current_info,
        updated_at = NOW()
    WHERE id = p_tenant_id;
END;
$$;

-- 4. Upsert Payment Method
CREATE OR REPLACE FUNCTION public.upsert_payment_method(
    p_tenant_id UUID,
    p_method JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_info JSONB;
    v_methods JSONB;
    v_new_methods JSONB := '[]'::JSONB;
    v_item JSONB;
    v_found BOOLEAN := FALSE;
    v_method_id TEXT;
BEGIN
    SELECT business_info INTO v_current_info FROM public.tenants WHERE id = p_tenant_id;
    v_methods := COALESCE(v_current_info->'paymentMethods', '[]'::JSONB);
    v_method_id := p_method->>'id';
    
    IF v_method_id IS NULL OR v_method_id = '' THEN
        v_method_id := encode(gen_random_bytes(6), 'hex');
        p_method := p_method || jsonb_build_object('id', v_method_id);
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_methods)
    LOOP
        IF v_item->>'id' = v_method_id THEN
            v_new_methods := v_new_methods || p_method;
            v_found := TRUE;
        ELSE
            v_new_methods := v_new_methods || v_item;
        END IF;
    END LOOP;
    
    IF NOT v_found THEN
        v_new_methods := v_new_methods || p_method;
    END IF;
    
    v_current_info := v_current_info || jsonb_build_object('paymentMethods', v_new_methods);
    
    UPDATE public.tenants 
    SET business_info = v_current_info,
        updated_at = NOW()
    WHERE id = p_tenant_id;
END;
$$;

-- 5. Delete Payment Method
CREATE OR REPLACE FUNCTION public.delete_payment_method(
    p_tenant_id UUID,
    p_method_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_info JSONB;
    v_methods JSONB;
    v_new_methods JSONB := '[]'::JSONB;
    v_item JSONB;
BEGIN
    SELECT business_info INTO v_current_info FROM public.tenants WHERE id = p_tenant_id;
    v_methods := COALESCE(v_current_info->'paymentMethods', '[]'::JSONB);
    
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_methods)
    LOOP
        IF v_item->>'id' != p_method_id THEN
            v_new_methods := v_new_methods || v_item;
        END IF;
    END LOOP;
    
    v_current_info := v_current_info || jsonb_build_object('paymentMethods', v_new_methods);
    
    UPDATE public.tenants 
    SET business_info = v_current_info,
        updated_at = NOW()
    WHERE id = p_tenant_id;
END;
$$;

-- 6. Upsert Expense Category
CREATE OR REPLACE FUNCTION public.upsert_expense_category(
    p_tenant_id UUID,
    p_category JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_info JSONB;
    v_cats JSONB;
    v_new_cats JSONB := '[]'::JSONB;
    v_item JSONB;
    v_found BOOLEAN := FALSE;
    v_cat_id TEXT;
BEGIN
    SELECT business_info INTO v_current_info FROM public.tenants WHERE id = p_tenant_id;
    v_cats := COALESCE(v_current_info->'expenseCategories', '[]'::JSONB);
    v_cat_id := p_category->>'id';
    
    IF v_cat_id IS NULL OR v_cat_id = '' THEN
        v_cat_id := encode(gen_random_bytes(6), 'hex');
        p_category := p_category || jsonb_build_object('id', v_cat_id);
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_cats)
    LOOP
        IF v_item->>'id' = v_cat_id THEN
            v_new_cats := v_new_cats || p_category;
            v_found := TRUE;
        ELSE
            v_new_cats := v_new_cats || v_item;
        END IF;
    END LOOP;
    
    IF NOT v_found THEN
        v_new_cats := v_new_cats || p_category;
    END IF;
    
    v_current_info := v_current_info || jsonb_build_object('expenseCategories', v_new_cats);
    
    UPDATE public.tenants 
    SET business_info = v_current_info,
        updated_at = NOW()
    WHERE id = p_tenant_id;
END;
$$;

-- 7. Delete Expense Category
CREATE OR REPLACE FUNCTION public.delete_expense_category(
    p_tenant_id UUID,
    p_cat_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_info JSONB;
    v_cats JSONB;
    v_new_cats JSONB := '[]'::JSONB;
    v_item JSONB;
BEGIN
    SELECT business_info INTO v_current_info FROM public.tenants WHERE id = p_tenant_id;
    v_cats := COALESCE(v_current_info->'expenseCategories', '[]'::JSONB);
    
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_cats)
    LOOP
        IF v_item->>'id' != p_cat_id THEN
            v_new_cats := v_new_cats || v_item;
        END IF;
    END LOOP;
    
    v_current_info := v_current_info || jsonb_build_object('expenseCategories', v_new_cats);
    
    UPDATE public.tenants 
    SET business_info = v_current_info,
        updated_at = NOW()
    WHERE id = p_tenant_id;
END;
$$;

-- 8. Update Restaurant Theme
CREATE OR REPLACE FUNCTION public.update_restaurant_theme(
    p_tenant_id UUID,
    p_theme JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.tenants 
    SET theme_config = p_theme,
        updated_at = NOW()
    WHERE id = p_tenant_id;
END;
$$;
