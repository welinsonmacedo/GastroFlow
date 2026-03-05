-- Update open_table to handle non-staff users (clients) gracefully
-- If p_user_id is not a staff member, do not attempt to update staff permissions.

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
    v_is_staff BOOLEAN;
BEGIN
    UPDATE public.restaurant_tables
    SET status = 'OCCUPIED',
        customer_name = p_customer_name,
        access_code = p_access_code
    WHERE id = p_table_id AND tenant_id = p_tenant_id;

    IF p_user_id IS NOT NULL THEN
        -- Check if user is staff
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
