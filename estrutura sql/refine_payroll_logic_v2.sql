-- Refinement of Payroll Logic
-- This script standardizes event types and recurring events, and updates the payroll preview.

BEGIN;

-- 1. Standardize rh_recurring_events
DO $$
BEGIN
    -- Rename 'type' to 'event_type_id' if it exists and is not already a UUID
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_recurring_events' AND column_name = 'type') THEN
        ALTER TABLE public.rh_recurring_events ADD COLUMN IF NOT EXISTS event_type_id UUID REFERENCES public.rh_event_types(id);
        
        -- Try to migrate data if 'type' looks like a UUID
        UPDATE public.rh_recurring_events 
        SET event_type_id = type::UUID 
        WHERE event_type_id IS NULL AND type ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        
        -- Drop 'type' after migration
        ALTER TABLE public.rh_recurring_events DROP COLUMN IF EXISTS type;
    END IF;
END $$;

-- 2. Standardize rh_payroll_events
DO $$
BEGIN
    -- Rename 'type' to 'event_type_id' if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_payroll_events' AND column_name = 'type') THEN
        ALTER TABLE public.rh_payroll_events ADD COLUMN IF NOT EXISTS event_type_id UUID REFERENCES public.rh_event_types(id);
        
        -- Try to migrate data if 'type' looks like a UUID
        UPDATE public.rh_payroll_events 
        SET event_type_id = type::UUID 
        WHERE event_type_id IS NULL AND type ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        
        -- Drop 'type' after migration
        ALTER TABLE public.rh_payroll_events DROP COLUMN IF EXISTS type;
    END IF;
END $$;

-- 3. Ensure rh_event_types has calculation_type
ALTER TABLE public.rh_event_types ADD COLUMN IF NOT EXISTS calculation_type TEXT DEFAULT 'FIXED';

-- 4. Fix rh_closed_payroll_items missing column
ALTER TABLE public.rh_closed_payroll_items ADD COLUMN IF NOT EXISTS total_company_cost NUMERIC(10, 2) DEFAULT 0;

-- 5. Update get_payroll_preview to handle recurring events and standardized columns
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
BEGIN
    -- 1. Identify Tenant
    SELECT tenant_id INTO v_tenant_id FROM public.staff WHERE auth_user_id = auth.uid() LIMIT 1;
    IF v_tenant_id IS NULL THEN SELECT id INTO v_tenant_id FROM public.restaurants LIMIT 1; END IF;
    
    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object('payroll', '[]'::JSONB, 'is_closed', FALSE, 'closed_info', NULL);
    END IF;

    -- 2. Check if payroll is closed
    SELECT jsonb_build_object(
        'id', id, 'month', month, 'year', year, 'total_cost', total_cost, 'total_net', total_net, 'employee_count', employee_count, 'closed_at', closed_at, 'closed_by', closed_by
    ) INTO v_closed_info
    FROM public.rh_closed_payrolls
    WHERE tenant_id = v_tenant_id AND month = p_month AND year = p_year;

    IF v_closed_info IS NOT NULL THEN
        v_is_closed := TRUE;
    END IF;

    -- 3. Iterate over active staff
    FOR v_staff IN SELECT * FROM public.staff WHERE tenant_id = v_tenant_id AND status = 'ACTIVE'
    LOOP
        v_base_salary := COALESCE(v_staff.base_salary, 0);
        v_dependents := COALESCE(v_staff.dependents_count, 0);
        v_events_earnings := 0;
        v_events_deductions := 0;
        v_event_breakdown := '[]'::JSONB;

        -- 3.1 Process Recurring Events
        FOR v_event_record IN 
            SELECT 
                et.name,
                et.operation,
                et.calculation_type,
                re.value as raw_value
            FROM public.rh_recurring_events re
            JOIN public.rh_event_types et ON re.event_type_id = et.id
            WHERE re.staff_id = v_staff.id AND re.is_active = true
        LOOP
            IF v_event_record.calculation_type = 'PERCENTAGE' THEN
                v_calc_value := ROUND((v_event_record.raw_value / 100.0) * v_base_salary, 2);
            ELSE
                v_calc_value := v_event_record.raw_value;
            END IF;

            IF v_event_record.operation = '+' THEN
                v_events_earnings := v_events_earnings + v_calc_value;
                v_event_breakdown := v_event_breakdown || jsonb_build_object('name', v_event_record.name, 'value', v_calc_value, 'type', 'CREDIT');
            ELSE
                v_events_deductions := v_events_deductions + v_calc_value;
                v_event_breakdown := v_event_breakdown || jsonb_build_object('name', v_event_record.name, 'value', v_calc_value, 'type', 'DEBIT');
            END IF;
        END LOOP;

        -- 3.2 Process Variable Events
        FOR v_event_record IN 
            SELECT 
                et.name,
                et.operation,
                et.calculation_type,
                pe.value as raw_value
            FROM public.rh_payroll_events pe
            JOIN public.rh_event_types et ON pe.event_type_id = et.id
            WHERE pe.staff_id = v_staff.id AND pe.month = p_month AND pe.year = p_year
        LOOP
            IF v_event_record.calculation_type = 'PERCENTAGE' THEN
                v_calc_value := ROUND((v_event_record.raw_value / 100.0) * v_base_salary, 2);
            ELSE
                v_calc_value := v_event_record.raw_value;
            END IF;

            IF v_event_record.operation = '+' THEN
                v_events_earnings := v_events_earnings + v_calc_value;
                v_event_breakdown := v_event_breakdown || jsonb_build_object('name', v_event_record.name, 'value', v_calc_value, 'type', 'CREDIT');
            ELSE
                v_events_deductions := v_events_deductions + v_calc_value;
                v_event_breakdown := v_event_breakdown || jsonb_build_object('name', v_event_record.name, 'value', v_calc_value, 'type', 'DEBIT');
            END IF;
        END LOOP;

        -- 3.3 Calculate Overtime and DSR
        SELECT * INTO v_overtime_data FROM public.calculate_overtime_and_dsr(v_staff.id, p_month, p_year, v_base_salary);
        
        v_events_earnings := v_events_earnings + (v_overtime_data->>'overtime_50')::NUMERIC + (v_overtime_data->>'overtime_100')::NUMERIC + (v_overtime_data->>'dsr_overtime')::NUMERIC;
        v_event_breakdown := v_event_breakdown || jsonb_build_array(
            jsonb_build_object('name', 'HORAS EXTRAS 50%', 'value', (v_overtime_data->>'overtime_50')::NUMERIC, 'type', 'CREDIT'),
            jsonb_build_object('name', 'DSR SOBRE HORAS EXTRAS', 'value', (v_overtime_data->>'dsr_overtime')::NUMERIC, 'type', 'CREDIT')
        );

        -- 3.4 Totals
        v_gross_total := v_base_salary + v_events_earnings;
        v_inss_value := public.calculate_inss(v_gross_total);
        v_irrf_base := v_gross_total - v_inss_value - (v_dependents * 189.59);
        v_irrf_value := public.calculate_irrf(v_irrf_base);
        v_total_discounts := v_inss_value + v_irrf_value + v_events_deductions;
        v_net_total := v_gross_total - v_total_discounts;

        -- 3.5 Build Item
        v_item := jsonb_build_object(
            'staff_id', v_staff.id,
            'staff_name', v_staff.name,
            'base_salary', v_base_salary,
            'gross_total', v_gross_total,
            'discounts', v_total_discounts,
            'net_total', v_net_total,
            'inss_value', v_inss_value,
            'irrf_value', v_irrf_value,
            'fgts_value', ROUND(v_gross_total * v_fgts_rate, 2),
            'event_breakdown', v_event_breakdown,
            'total_company_cost', v_gross_total + ROUND(v_gross_total * v_fgts_rate, 2)
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

COMMIT;
