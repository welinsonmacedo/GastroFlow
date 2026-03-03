-- Update the generate_recurring_events_for_month logic in StaffContext.tsx
-- We need to update the logic to calculate the value if the event type is PERCENTAGE.

-- Since we cannot modify the React code directly with SQL, we will create a database function 
-- that handles the generation of recurring events, including the percentage calculation.
-- This is cleaner and moves the business logic to the backend as requested.

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
    v_event_type RECORD;
    v_final_value NUMERIC;
    v_exists BOOLEAN;
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
        
        -- Get Event Type details (for calculation type)
        SELECT * INTO v_event_type FROM public.rh_event_types WHERE id = v_rec.event_type_id;

        -- Check if event already exists for this month/year
        SELECT EXISTS (
            SELECT 1 FROM public.rh_payroll_events 
            WHERE staff_id = v_rec.staff_id 
              AND type = v_rec.event_type_id::text -- Assuming type column stores ID
              AND month = p_month 
              AND year = p_year
        ) INTO v_exists;

        IF NOT v_exists THEN
            -- Calculate Value
            IF v_event_type.calculation_type = 'PERCENTAGE' THEN
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
                type, -- Storing the Event Type ID
                description,
                value,
                created_by
            ) VALUES (
                v_tenant_id,
                v_rec.staff_id,
                p_month,
                p_year,
                v_rec.event_type_id::text,
                COALESCE(v_rec.description, v_event_type.name),
                ROUND(v_final_value, 2),
                p_created_by
            );
            
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
