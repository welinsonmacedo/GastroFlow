-- 1. Ensure columns exist
ALTER TABLE public.rh_payroll_settings ADD COLUMN IF NOT EXISTS point_closing_day INTEGER DEFAULT 30;

-- 2. Helper Functions for Taxes (ensure they exist)
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
        v_inss := (1412.00 * 0.075) + ((2666.68 - 1412.00) * 0.09) + ((4000.03 - 2666.68) * 0.12) + ((7786.02 - 4000.03) * 0.14);
    END IF;
    RETURN ROUND(v_inss, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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

-- 3. Overtime Calculation (Improved with Shift and Date Range logic)
CREATE OR REPLACE FUNCTION public.calculate_overtime_and_dsr(
    p_staff_id UUID,
    p_month INTEGER,
    p_year INTEGER,
    p_base_salary NUMERIC
)
RETURNS JSONB AS $$
DECLARE
    v_overtime_50 NUMERIC := 0;
    v_overtime_100 NUMERIC := 0;
    v_dsr_overtime NUMERIC := 0;
    v_total_overtime_hours NUMERIC := 0;
    v_settings RECORD;
    v_time_entry RECORD;
    v_shift RECORD;
    v_target_hours NUMERIC := 8; 
    v_hours_worked NUMERIC;
    v_balance NUMERIC;
    v_hourly_rate NUMERIC := p_base_salary / 220.0;
    v_closing_day INTEGER := 30;
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    -- Get Settings
    SELECT * INTO v_settings FROM public.rh_payroll_settings WHERE tenant_id = (SELECT tenant_id FROM public.staff WHERE id = p_staff_id) LIMIT 1;
    IF v_settings IS NOT NULL THEN
        v_closing_day := COALESCE(v_settings.point_closing_day, 30);
    END IF;

    -- Get Shift Target Hours
    SELECT s.* INTO v_shift 
    FROM public.rh_shifts s
    JOIN public.staff st ON st.shift_id = s.id
    WHERE st.id = p_staff_id;

    IF v_shift IS NOT NULL AND v_shift.start_time IS NOT NULL AND v_shift.end_time IS NOT NULL THEN
        v_target_hours := (EXTRACT(EPOCH FROM (v_shift.end_time - v_shift.start_time)) / 3600.0) - (COALESCE(v_shift.break_minutes, 60) / 60.0);
        IF v_target_hours < 0 THEN v_target_hours := v_target_hours + 24; END IF;
    END IF;

    -- Define Date Range based on Closing Day
    IF v_closing_day >= 30 THEN
        v_start_date := make_date(p_year, p_month, 1);
        v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    ELSE
        IF p_month = 1 THEN
            v_start_date := make_date(p_year - 1, 12, v_closing_day + 1);
        ELSE
            v_start_date := make_date(p_year, p_month - 1, v_closing_day + 1);
        END IF;
        v_end_date := make_date(p_year, p_month, v_closing_day);
    END IF;

    FOR v_time_entry IN 
        SELECT * FROM public.rh_time_entries 
        WHERE staff_id = p_staff_id 
        AND entry_date BETWEEN v_start_date AND v_end_date
    LOOP
        IF v_time_entry.clock_in IS NOT NULL AND v_time_entry.clock_out IS NOT NULL THEN
            v_hours_worked := EXTRACT(EPOCH FROM (v_time_entry.clock_out - v_time_entry.clock_in))/3600.0;
            
            IF v_time_entry.break_start IS NOT NULL AND v_time_entry.break_end IS NOT NULL THEN
                 v_hours_worked := v_hours_worked - (EXTRACT(EPOCH FROM (v_time_entry.break_end - v_time_entry.break_start))/3600.0);
            END IF;

            v_balance := v_hours_worked - v_target_hours;
            
            IF v_balance > 0 THEN
                IF EXTRACT(ISODOW FROM v_time_entry.entry_date) = 7 THEN -- Sunday
                     v_overtime_100 := v_overtime_100 + (v_balance * v_hourly_rate * 2.0);
                ELSE
                     v_overtime_50 := v_overtime_50 + (v_balance * v_hourly_rate * 1.5);
                END IF;
            END IF;
        END IF;
    END LOOP;

    -- DSR Calculation (Simplified: 1/6 of overtime value)
    v_dsr_overtime := (v_overtime_50 + v_overtime_100) * 0.1666;

    RETURN jsonb_build_object(
        'overtime_50', ROUND(v_overtime_50, 2),
        'overtime_100', ROUND(v_overtime_100, 2),
        'dsr_overtime', ROUND(v_dsr_overtime, 2)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Main Payroll Preview Function (Consolidated)
DROP FUNCTION IF EXISTS public.get_payroll_preview(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_payroll_preview(INTEGER, INTEGER);

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
    v_dependents INTEGER := 0;
    v_fgts_rate NUMERIC := 0.08;
    
    -- Breakdowns
    v_event_breakdown JSONB;
    v_tax_breakdown JSONB;
    v_benefit_breakdown JSONB;
    
    -- Auxiliaries
    v_event_record RECORD;
    v_calc_value NUMERIC;
    v_overtime_data JSONB;
    v_has_stored_overtime BOOLEAN := FALSE;
BEGIN
    -- 1. Identify Tenant
    SELECT tenant_id INTO v_tenant_id FROM public.staff WHERE auth_user_id = auth.uid() LIMIT 1;
    IF v_tenant_id IS NULL THEN SELECT id INTO v_tenant_id FROM public.restaurants LIMIT 1; END IF;
    
    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object('payroll', '[]'::JSONB, 'is_closed', FALSE, 'closed_info', NULL);
    END IF;

    -- 2. Check if closed
    SELECT jsonb_build_object(
        'id', id, 'month', month, 'year', year, 'total_cost', total_cost, 'total_net', total_net, 'employee_count', employee_count, 'closed_at', closed_at, 'closed_by', closed_by
    ) INTO v_closed_info
    FROM public.rh_closed_payrolls
    WHERE tenant_id = v_tenant_id AND month = p_month AND year = p_year;

    IF v_closed_info IS NOT NULL THEN v_is_closed := TRUE; END IF;

    -- 3. Iterate Staff
    FOR v_staff IN SELECT * FROM public.staff WHERE tenant_id = v_tenant_id AND status = 'ACTIVE'
    LOOP
        v_base_salary := COALESCE(v_staff.base_salary, 0);
        v_dependents := COALESCE(v_staff.dependents_count, 0);
        v_events_earnings := 0;
        v_events_deductions := 0;
        v_event_breakdown := '[]'::JSONB;
        v_has_stored_overtime := FALSE;

        -- Process Events
        FOR v_event_record IN 
            SELECT et.name, et.operation, et.calculation_type, pe.value as raw_value
            FROM public.rh_payroll_events pe
            JOIN public.rh_event_types et ON pe.type::uuid = et.id
            WHERE pe.staff_id = v_staff.id AND pe.month = p_month AND pe.year = p_year
        LOOP
            IF v_event_record.calculation_type = 'PERCENTAGE' THEN
                v_calc_value := ROUND((v_event_record.raw_value / 100.0) * v_base_salary, 2);
            ELSE
                v_calc_value := v_event_record.raw_value;
            END IF;

            -- Check if this is a stored overtime event to avoid duplication
            -- Using ILIKE and wildcards for broader matching
            IF v_event_record.name ILIKE '%H.E.%' OR v_event_record.name ILIKE '%HORAS EXTRAS%' OR v_event_record.name ILIKE '%DSR%' THEN
                v_has_stored_overtime := TRUE;
            END IF;

            IF v_event_record.operation = '+' THEN
                v_events_earnings := v_events_earnings + v_calc_value;
                v_event_breakdown := v_event_breakdown || jsonb_build_object('name', v_event_record.name, 'value', v_calc_value, 'type', 'CREDIT');
            ELSE
                v_events_deductions := v_events_deductions + v_calc_value;
                v_event_breakdown := v_event_breakdown || jsonb_build_object('name', v_event_record.name, 'value', v_calc_value, 'type', 'DEBIT');
            END IF;
        END LOOP;

        -- Overtime Calculation
        IF v_has_stored_overtime THEN
             -- If we found stored overtime events, assume they are authoritative and skip dynamic calculation
             v_overtime_data := '{"overtime_50": 0, "overtime_100": 0, "dsr_overtime": 0}'::JSONB;
        ELSE
             -- Otherwise, calculate dynamically
             BEGIN
                SELECT * INTO v_overtime_data FROM public.calculate_overtime_and_dsr(v_staff.id, p_month, p_year, v_base_salary);
             EXCEPTION WHEN OTHERS THEN
                v_overtime_data := '{"overtime_50": 0, "overtime_100": 0, "dsr_overtime": 0}'::JSONB;
             END;
        END IF;

        -- Final Totals
        v_gross_total := v_base_salary + v_events_earnings + (v_overtime_data->>'overtime_50')::NUMERIC + (v_overtime_data->>'overtime_100')::NUMERIC + (v_overtime_data->>'dsr_overtime')::NUMERIC;
        v_inss_value := public.calculate_inss(v_gross_total);
        v_irrf_base := v_gross_total - v_inss_value - (v_dependents * 189.59);
        v_irrf_value := public.calculate_irrf(v_irrf_base);
        v_total_discounts := v_inss_value + v_irrf_value + v_events_deductions;
        v_net_total := v_gross_total - v_total_discounts;

        -- Add Overtime to Breakdown (Only if calculated dynamically)
        IF (v_overtime_data->>'overtime_50')::NUMERIC > 0 THEN
            v_event_breakdown := v_event_breakdown || jsonb_build_object('name', 'H.E. 50%', 'value', (v_overtime_data->>'overtime_50')::NUMERIC, 'type', 'CREDIT');
        END IF;
        IF (v_overtime_data->>'overtime_100')::NUMERIC > 0 THEN
            v_event_breakdown := v_event_breakdown || jsonb_build_object('name', 'H.E. 100%', 'value', (v_overtime_data->>'overtime_100')::NUMERIC, 'type', 'CREDIT');
        END IF;
        IF (v_overtime_data->>'dsr_overtime')::NUMERIC > 0 THEN
            v_event_breakdown := v_event_breakdown || jsonb_build_object('name', 'DSR s/ H.E.', 'value', (v_overtime_data->>'dsr_overtime')::NUMERIC, 'type', 'CREDIT');
        END IF;

        v_item := jsonb_build_object(
            'staff_id', v_staff.id,
            'staff_name', v_staff.name,
            'base_salary', v_base_salary,
            'overtime_50', (v_overtime_data->>'overtime_50')::NUMERIC,
            'overtime_100', (v_overtime_data->>'overtime_100')::NUMERIC,
            'night_shift_add', 0,
            'bank_hours_balance', COALESCE(v_staff.bank_hours_balance, 0),
            'absences_total', 0,
            'addictionals', 0,
            'events_value', v_events_earnings - v_events_deductions + (v_overtime_data->>'overtime_50')::NUMERIC + (v_overtime_data->>'overtime_100')::NUMERIC + (v_overtime_data->>'dsr_overtime')::NUMERIC,
            'benefits', 0,
            'gross_total', v_gross_total,
            'discounts', v_total_discounts,
            'advances', 0,
            'net_total', v_net_total,
            'hours_worked', 220,
            'employer_charges', 0,
            'total_company_cost', v_gross_total,
            'inss_value', v_inss_value,
            'irrf_value', v_irrf_value,
            'fgts_value', ROUND(v_gross_total * v_fgts_rate, 2),
            'tax_breakdown', jsonb_build_array(
                jsonb_build_object('name', 'INSS', 'value', v_inss_value, 'type', 'EMPLOYEE'),
                jsonb_build_object('name', 'IRRF', 'value', v_irrf_value, 'type', 'EMPLOYEE')
            ),
            'benefit_breakdown', '[]'::JSONB,
            'event_breakdown', v_event_breakdown
        );
        
        v_payroll := v_payroll || v_item;
    END LOOP;

    RETURN jsonb_build_object('payroll', v_payroll, 'is_closed', v_is_closed, 'closed_info', v_closed_info);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
