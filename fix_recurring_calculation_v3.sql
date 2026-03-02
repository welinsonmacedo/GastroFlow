CREATE OR REPLACE FUNCTION public.generate_recurring_events(
    p_month INTEGER,
    p_year INTEGER,
    p_created_by UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_tenant_id UUID;
    v_count INTEGER := 0;
    v_rec RECORD;
    v_staff RECORD;
    v_event_type JSONB;
    v_final_value NUMERIC;
    v_exists BOOLEAN;
    v_calc_type TEXT;
BEGIN
    -- 1. Get Tenant ID from user
    SELECT tenant_id INTO v_tenant_id FROM public.staff WHERE auth_user_id = auth.uid() LIMIT 1;
    IF v_tenant_id IS NULL THEN SELECT id INTO v_tenant_id FROM public.restaurants LIMIT 1; END IF;
    
    IF v_tenant_id IS NULL THEN RETURN 0; END IF;

    -- 2. Iterate over active recurring events for this tenant
    FOR v_rec IN 
        SELECT re.* 
        FROM public.rh_recurring_events re
        WHERE re.tenant_id = v_tenant_id AND re.is_active = TRUE
    LOOP
        -- Get Staff details (for base salary)
        SELECT * INTO v_staff FROM public.staff WHERE id = v_rec.staff_id;
        
        -- Get Event Type details as JSONB to handle column name variations
        SELECT to_jsonb(et) INTO v_event_type FROM public.rh_event_types et WHERE et.id::text = v_rec.type::text;

        -- Check if event already exists for this month/year
        SELECT EXISTS (
            SELECT 1 FROM public.rh_payroll_events 
            WHERE staff_id = v_rec.staff_id 
              AND type = v_rec.type 
              AND month = p_month 
              AND year = p_year
        ) INTO v_exists;

        IF NOT v_exists THEN
            -- Determine Calculation Type (handle snake_case and camelCase)
            v_calc_type := COALESCE(v_event_type->>'calculation_type', v_event_type->>'calculationType');

            -- Calculate Value
            IF UPPER(v_calc_type) = 'PERCENTAGE' THEN
                -- Value stored in recurring event is the percentage (e.g., 10 for 10%)
                v_final_value := (COALESCE(v_staff.base_salary, 0) * v_rec.value) / 100;
            ELSE
                -- Fixed Value
                v_final_value := v_rec.value;
            END IF;

            -- Insert Payroll Event
            INSERT INTO public.rh_payroll_events (
                tenant_id,
                staff_id,
                month,
                year,
                type, 
                description,
                value,
                created_by
            ) VALUES (
                v_tenant_id,
                v_rec.staff_id,
                p_month,
                p_year,
                v_rec.type,
                COALESCE(v_rec.description, v_event_type->>'name'),
                ROUND(v_final_value, 2),
                p_created_by
            );
            
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
