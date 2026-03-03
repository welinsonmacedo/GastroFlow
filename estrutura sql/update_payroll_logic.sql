-- 1. Fix column name in rh_payroll_events to match frontend (value instead of amount)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_payroll_events' AND column_name = 'amount') THEN
        ALTER TABLE public.rh_payroll_events RENAME COLUMN amount TO value;
    END IF;
END $$;

-- 2. Create Helper Functions for Taxes

-- INSS Calculation (2024 Progressive Table)
CREATE OR REPLACE FUNCTION public.calculate_inss(p_salary NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
    v_inss NUMERIC := 0;
    v_salary NUMERIC := p_salary;
BEGIN
    IF v_salary <= 1412.00 THEN
        v_inss := v_salary * 0.075;
    ELSIF v_salary <= 2666.68 THEN
        v_inss := (1412.00 * 0.075) + ((v_salary - 1412.00) * 0.09);
    ELSIF v_salary <= 4000.03 THEN
        v_inss := (1412.00 * 0.075) + ((2666.68 - 1412.00) * 0.09) + ((v_salary - 2666.68) * 0.12);
    ELSIF v_salary <= 7786.02 THEN
        v_inss := (1412.00 * 0.075) + ((2666.68 - 1412.00) * 0.09) + ((4000.03 - 2666.68) * 0.12) + ((v_salary - 4000.03) * 0.14);
    ELSE
        -- Teto
        v_inss := (1412.00 * 0.075) + ((2666.68 - 1412.00) * 0.09) + ((4000.03 - 2666.68) * 0.12) + ((7786.02 - 4000.03) * 0.14);
    END IF;
    
    RETURN ROUND(v_inss, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- IRRF Calculation (2024 Progressive Table)
CREATE OR REPLACE FUNCTION public.calculate_irrf(p_base NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
    v_irrf NUMERIC := 0;
BEGIN
    IF p_base <= 2259.20 THEN
        v_irrf := 0;
    ELSIF p_base <= 2826.65 THEN
        v_irrf := (p_base * 0.075) - 169.44;
    ELSIF p_base <= 3751.05 THEN
        v_irrf := (p_base * 0.15) - 381.44;
    ELSIF p_base <= 4664.68 THEN
        v_irrf := (p_base * 0.225) - 662.77;
    ELSE
        v_irrf := (p_base * 0.275) - 896.00;
    END IF;
    
    IF v_irrf < 0 THEN v_irrf := 0; END IF;
    
    RETURN ROUND(v_irrf, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Update get_payroll_preview to use real data
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
    
    -- Calculation Variables
    v_base_salary NUMERIC;
    v_events_earnings NUMERIC;
    v_events_deductions NUMERIC;
    v_gross_total NUMERIC;
    v_inss_value NUMERIC;
    v_irrf_base NUMERIC;
    v_irrf_value NUMERIC;
    v_total_discounts NUMERIC;
    v_net_total NUMERIC;
    v_dependents INTEGER := 0; -- Default 0 if not found
    
    -- Breakdowns
    v_event_breakdown JSONB;
    v_tax_breakdown JSONB;
BEGIN
    -- 1. Get Tenant ID
    SELECT tenant_id INTO v_tenant_id FROM public.staff WHERE auth_user_id = auth.uid() LIMIT 1;
    IF v_tenant_id IS NULL THEN SELECT id INTO v_tenant_id FROM public.restaurants LIMIT 1; END IF;
    
    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object('payroll', '[]'::JSONB, 'is_closed', FALSE, 'closed_info', NULL);
    END IF;

    -- 2. Check Closed Status
    SELECT jsonb_build_object(
        'id', id, 'month', month, 'year', year, 'total_cost', total_cost, 'total_net', total_net, 'employee_count', employee_count, 'closed_at', closed_at, 'closed_by', closed_by
    ) INTO v_closed_info
    FROM public.rh_closed_payrolls
    WHERE tenant_id = v_tenant_id AND month = p_month AND year = p_year;

    IF v_closed_info IS NOT NULL THEN
        v_is_closed := TRUE;
    END IF;

    -- 3. Iterate Staff
    FOR v_staff IN SELECT * FROM public.staff WHERE tenant_id = v_tenant_id AND status = 'ACTIVE'
    LOOP
        v_base_salary := COALESCE(v_staff.base_salary, 0);
        v_dependents := COALESCE(v_staff.dependents_count, 0); -- Assuming column exists, else 0

        -- Calculate Events (Earnings & Deductions)
        -- We join rh_payroll_events with rh_event_types to get the operation (+/-)
        -- Assuming 'type' column in rh_payroll_events stores the UUID of the event type
        
        SELECT 
            COALESCE(SUM(CASE WHEN et.operation = '+' THEN pe.value ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN et.operation = '-' THEN pe.value ELSE 0 END), 0),
            jsonb_agg(jsonb_build_object(
                'name', et.name,
                'value', pe.value,
                'type', CASE WHEN et.operation = '+' THEN 'CREDIT' ELSE 'DEBIT' END
            ))
        INTO v_events_earnings, v_events_deductions, v_event_breakdown
        FROM public.rh_payroll_events pe
        LEFT JOIN public.rh_event_types et ON pe.type::uuid = et.id
        WHERE pe.staff_id = v_staff.id 
          AND pe.month = p_month 
          AND pe.year = p_year;

        IF v_event_breakdown IS NULL THEN v_event_breakdown := '[]'::JSONB; END IF;

        -- Gross Total
        v_gross_total := v_base_salary + v_events_earnings;

        -- Calculate Taxes
        v_inss_value := public.calculate_inss(v_gross_total);
        
        v_irrf_base := v_gross_total - v_inss_value - (v_dependents * 189.59);
        v_irrf_value := public.calculate_irrf(v_irrf_base);
        
        -- Total Discounts
        v_total_discounts := v_inss_value + v_irrf_value + v_events_deductions;
        
        -- Net Total
        v_net_total := v_gross_total - v_total_discounts;

        -- Tax Breakdown
        v_tax_breakdown := jsonb_build_array(
            jsonb_build_object('name', 'INSS', 'value', v_inss_value, 'type', 'EMPLOYEE'),
            jsonb_build_object('name', 'IRRF', 'value', v_irrf_value, 'type', 'EMPLOYEE')
        );

        -- Build Item
        v_item := jsonb_build_object(
            'staff_id', v_staff.id,
            'staff_name', v_staff.name,
            'base_salary', v_base_salary,
            'overtime_50', 0, -- Placeholder
            'overtime_100', 0, -- Placeholder
            'night_shift_add', 0, -- Placeholder
            'bank_hours_balance', 0,
            'absences_total', 0,
            'addictionals', 0,
            'events_value', v_events_earnings - v_events_deductions, -- Net events value for display
            'benefits', 0,
            'gross_total', v_gross_total,
            'discounts', v_total_discounts,
            'advances', 0,
            'net_total', v_net_total,
            'hours_worked', 220,
            'employer_charges', 0,
            'total_company_cost', v_gross_total, -- Simplified
            'inss_value', v_inss_value,
            'irrf_value', v_irrf_value,
            'fgts_value', v_gross_total * 0.08, -- FGTS 8%
            'tax_breakdown', v_tax_breakdown,
            'benefit_breakdown', '[]'::JSONB,
            'event_breakdown', v_event_breakdown
        );
        
        v_payroll := v_payroll || v_item;
    END LOOP;

    RETURN jsonb_build_object(
        'payroll', v_payroll,
        'is_closed', v_is_closed,
        'closed_info', v_closed_info
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
