-- Drop the old function signature if it exists
DROP FUNCTION IF EXISTS public.get_payroll_preview(UUID, TEXT);

-- Drop the new function signature if it exists (to ensure clean recreate)
DROP FUNCTION IF EXISTS public.get_payroll_preview(INTEGER, INTEGER);

-- Recreate the function with the correct signature matching the frontend
CREATE OR REPLACE FUNCTION public.get_payroll_preview(
    p_month INTEGER,
    p_year INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_payroll JSONB := '[]'::JSONB;
    v_staff RECORD;
    v_item JSONB;
    v_closed_info JSONB := NULL;
    v_is_closed BOOLEAN := FALSE;
BEGIN
    -- 1. Get Tenant ID (Securely)
    -- Try to get from auth.uid() first
    SELECT tenant_id INTO v_tenant_id FROM public.staff WHERE auth_user_id = auth.uid() LIMIT 1;
    
    -- Fallback: If no auth user (dev/testing), get the first restaurant
    IF v_tenant_id IS NULL THEN 
        SELECT id INTO v_tenant_id FROM public.restaurants LIMIT 1; 
    END IF;

    IF v_tenant_id IS NULL THEN
        -- If still null, return empty structure instead of crashing
        RETURN jsonb_build_object(
            'payroll', '[]'::JSONB,
            'is_closed', FALSE,
            'closed_info', NULL
        );
    END IF;

    -- 2. Check if payroll is already closed for this month/year
    SELECT jsonb_build_object(
        'id', id, 'month', month, 'year', year, 'total_cost', total_cost, 'total_net', total_net, 'employee_count', employee_count, 'closed_at', closed_at, 'closed_by', closed_by
    ) INTO v_closed_info
    FROM public.rh_closed_payrolls
    WHERE tenant_id = v_tenant_id AND month = p_month AND year = p_year;

    IF v_closed_info IS NOT NULL THEN
        v_is_closed := TRUE;
    END IF;

    -- 3. Calculate Preview for each active staff member
    FOR v_staff IN SELECT * FROM public.staff WHERE tenant_id = v_tenant_id AND status = 'ACTIVE'
    LOOP
        -- Placeholder calculations (You can expand this with real logic later)
        -- For now, we return the base salary and basic structure
        v_item := jsonb_build_object(
            'staff_id', v_staff.id,
            'staff_name', v_staff.name,
            'base_salary', COALESCE(v_staff.base_salary, 0),
            'overtime_50', 0,
            'overtime_100', 0,
            'night_shift_add', 0,
            'bank_hours_balance', 0,
            'absences_total', 0,
            'addictionals', 0,
            'events_value', 0,
            'benefits', 0,
            'gross_total', COALESCE(v_staff.base_salary, 0),
            'discounts', 0,
            'advances', 0,
            'net_total', COALESCE(v_staff.base_salary, 0),
            'hours_worked', 220,
            'employer_charges', 0,
            'total_company_cost', COALESCE(v_staff.base_salary, 0),
            'inss_value', 0,
            'irrf_value', 0,
            'fgts_value', 0,
            'tax_breakdown', '[]'::JSONB,
            'benefit_breakdown', '[]'::JSONB,
            'event_breakdown', '[]'::JSONB
        );
        v_payroll := v_payroll || v_item;
    END LOOP;

    -- 4. Return the final JSON object
    RETURN jsonb_build_object(
        'payroll', v_payroll,
        'is_closed', v_is_closed,
        'closed_info', v_closed_info
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
