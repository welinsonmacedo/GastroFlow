CREATE OR REPLACE FUNCTION public.open_table(
    p_tenant_id UUID,
    p_table_id UUID,
    p_customer_name TEXT DEFAULT NULL,
    p_access_code TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_routes TEXT[];
    v_route_to_add TEXT;
    v_is_staff BOOLEAN;
    v_auth_uid UUID;
    v_final_customer_name TEXT;
    v_user_email TEXT;
    v_user_name TEXT;
BEGIN
    v_auth_uid := auth.uid();
    
    IF p_user_id IS NULL THEN
        p_user_id := v_auth_uid;
    END IF;

    IF v_auth_uid IS NOT NULL THEN
        SELECT email, raw_user_meta_data->>'name' 
        INTO v_user_email, v_user_name
        FROM auth.users 
        WHERE id = v_auth_uid;
    END IF;

    v_final_customer_name := COALESCE(NULLIF(p_customer_name, ''), v_user_name, v_user_email, 'Cliente');

    UPDATE public.restaurant_tables
    SET status = 'OCCUPIED',
        customer_name = v_final_customer_name,
        access_code = COALESCE(p_access_code, '')
    WHERE id = p_table_id AND tenant_id = p_tenant_id;

    IF p_user_id IS NOT NULL THEN
        SELECT EXISTS(SELECT 1 FROM public.staff WHERE id = p_user_id AND tenant_id = p_tenant_id) INTO v_is_staff;
        
        IF v_is_staff THEN
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
    END IF;
END;
$$;
