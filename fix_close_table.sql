-- Helper Function: Close Table Internal
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

-- Close Table RPC
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
