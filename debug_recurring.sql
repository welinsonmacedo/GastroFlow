CREATE OR REPLACE FUNCTION public.debug_recurring_events(p_month INTEGER, p_year INTEGER)
RETURNS TABLE (
    staff_id UUID,
    recurring_type TEXT,
    event_type_id UUID,
    calculation_type TEXT,
    base_salary NUMERIC,
    value NUMERIC,
    final_value NUMERIC
) AS $$
DECLARE
    v_tenant_id UUID;
    v_rec RECORD;
    v_staff RECORD;
    v_event_type RECORD;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM public.staff WHERE auth_user_id = auth.uid() LIMIT 1;
    IF v_tenant_id IS NULL THEN SELECT id INTO v_tenant_id FROM public.restaurants LIMIT 1; END IF;

    FOR v_rec IN SELECT * FROM public.rh_recurring_events WHERE tenant_id = v_tenant_id AND is_active = TRUE LOOP
        SELECT * INTO v_staff FROM public.staff WHERE id = v_rec.staff_id;
        
        -- Try to find event type by ID stored in 'type' column
        SELECT * INTO v_event_type FROM public.rh_event_types WHERE id::text = v_rec.type::text;
        
        staff_id := v_rec.staff_id;
        recurring_type := v_rec.type;
        event_type_id := v_event_type.id;
        calculation_type := v_event_type.calculation_type;
        base_salary := v_staff.base_salary;
        value := v_rec.value;
        
        IF UPPER(v_event_type.calculation_type) = 'PERCENTAGE' THEN
            final_value := (COALESCE(v_staff.base_salary, 0) * v_rec.value) / 100;
        ELSE
            final_value := v_rec.value;
        END IF;
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
