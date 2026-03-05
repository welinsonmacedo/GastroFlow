-- Fix rh_closed_payroll_items columns and update close_payroll RPC and get_payroll_preview

BEGIN;

-- 1. Fix Columns
DO $$
BEGIN
    -- Handle discounts column (rename total_discounts if exists, or add discounts)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payroll_items' AND column_name = 'total_discounts') THEN
        ALTER TABLE public.rh_closed_payroll_items RENAME COLUMN total_discounts TO discounts;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payroll_items' AND column_name = 'discounts') THEN
        ALTER TABLE public.rh_closed_payroll_items ADD COLUMN discounts NUMERIC(10, 2) DEFAULT 0;
    END IF;

    -- Handle details column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payroll_items' AND column_name = 'details') THEN
        ALTER TABLE public.rh_closed_payroll_items ADD COLUMN details JSONB DEFAULT '{}'::JSONB;
    END IF;

    -- Ensure other columns from rh_schema_sync exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payroll_items' AND column_name = 'inss_value') THEN
        ALTER TABLE public.rh_closed_payroll_items ADD COLUMN inss_value NUMERIC(10, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payroll_items' AND column_name = 'irrf_value') THEN
        ALTER TABLE public.rh_closed_payroll_items ADD COLUMN irrf_value NUMERIC(10, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payroll_items' AND column_name = 'fgts_value') THEN
        ALTER TABLE public.rh_closed_payroll_items ADD COLUMN fgts_value NUMERIC(10, 2) DEFAULT 0;
    END IF;
    
    -- Add breakdown columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payroll_items' AND column_name = 'tax_breakdown') THEN
        ALTER TABLE public.rh_closed_payroll_items ADD COLUMN tax_breakdown JSONB DEFAULT '[]'::JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payroll_items' AND column_name = 'benefit_breakdown') THEN
        ALTER TABLE public.rh_closed_payroll_items ADD COLUMN benefit_breakdown JSONB DEFAULT '[]'::JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payroll_items' AND column_name = 'event_breakdown') THEN
        ALTER TABLE public.rh_closed_payroll_items ADD COLUMN event_breakdown JSONB DEFAULT '[]'::JSONB;
    END IF;

END $$;

-- 2. Update close_payroll RPC to populate all columns
CREATE OR REPLACE FUNCTION public.close_payroll(
    p_tenant_id UUID,
    p_month INTEGER,
    p_year INTEGER,
    p_closed_by TEXT,
    p_items JSONB
) RETURNS UUID AS $$
DECLARE
    v_payroll_id UUID;
    v_total_cost NUMERIC(15,2) := 0;
    v_total_net NUMERIC(15,2) := 0;
    v_item JSONB;
BEGIN
    -- Security Check
    IF NOT EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND tenant_id = p_tenant_id) THEN
        RAISE EXCEPTION 'Acesso Negado';
    END IF;

    -- Calculate totals from JSONB items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_total_cost := v_total_cost + (v_item->>'totalCompanyCost')::NUMERIC;
        v_total_net := v_total_net + (v_item->>'netTotal')::NUMERIC;
    END LOOP;

    -- Insert Header
    INSERT INTO public.rh_closed_payrolls (
        tenant_id, month, year, total_cost, total_net, 
        employee_count, status, closed_by, closed_at
    ) VALUES (
        p_tenant_id, p_month, p_year, v_total_cost, v_total_net, 
        jsonb_array_length(p_items), 'CLOSED', p_closed_by, NOW()
    ) RETURNING id INTO v_payroll_id;

    -- Insert Items
    INSERT INTO public.rh_closed_payroll_items (
        payroll_id, tenant_id, staff_id, staff_name, 
        base_salary, gross_total, net_total, discounts, details,
        inss_value, irrf_value, fgts_value,
        tax_breakdown, benefit_breakdown, event_breakdown
    )
    SELECT 
        v_payroll_id, p_tenant_id, (item->>'staff_id')::UUID, (item->>'staff_name'),
        (item->>'base_salary')::NUMERIC, (item->>'gross_total')::NUMERIC, 
        (item->>'net_total')::NUMERIC, (item->>'discounts')::NUMERIC,
        (item->'details'),
        COALESCE((item->'details'->>'inssValue')::NUMERIC, 0),
        COALESCE((item->'details'->>'irrfValue')::NUMERIC, 0),
        COALESCE((item->'details'->>'fgtsValue')::NUMERIC, 0),
        COALESCE((item->'details'->'taxBreakdown'), '[]'::JSONB),
        COALESCE((item->'details'->'benefitBreakdown'), '[]'::JSONB),
        COALESCE((item->'details'->'eventBreakdown'), '[]'::JSONB)
    FROM jsonb_array_elements(p_items) AS item;

    RETURN v_payroll_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update get_payroll_preview to handle closed payrolls
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
    
    -- Variáveis
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
    
    -- Auxiliares
    v_event_record RECORD;
    v_calc_value NUMERIC;
    v_overtime_data JSONB;
    v_has_stored_overtime BOOLEAN := FALSE;
BEGIN
    -- 1. Identifica Tenant
    SELECT tenant_id INTO v_tenant_id FROM public.staff WHERE auth_user_id = auth.uid() LIMIT 1;
    IF v_tenant_id IS NULL THEN SELECT id INTO v_tenant_id FROM public.restaurants LIMIT 1; END IF;
    
    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object('payroll', '[]'::JSONB, 'is_closed', FALSE, 'closed_info', NULL);
    END IF;

    -- 2. Verifica se está fechada
    SELECT jsonb_build_object(
        'id', id, 'month', month, 'year', year, 'total_cost', total_cost, 'total_net', total_net, 'employee_count', employee_count, 'closed_at', closed_at, 'closed_by', closed_by
    ) INTO v_closed_info
    FROM public.rh_closed_payrolls
    WHERE tenant_id = v_tenant_id AND month = p_month AND year = p_year;

    IF v_closed_info IS NOT NULL THEN
        v_is_closed := TRUE;
        
        -- FETCH FROM CLOSED ITEMS (Snapshot)
        SELECT jsonb_agg(jsonb_build_object(
            'staff_id', staff_id,
            'staff_name', staff_name,
            'base_salary', base_salary,
            'gross_total', gross_total,
            'net_total', net_total,
            'discounts', discounts,
            'total_company_cost', COALESCE(total_company_cost, gross_total),
            'overtime_50', COALESCE((details->>'overtime50')::NUMERIC, 0),
            'overtime_100', COALESCE((details->>'overtime100')::NUMERIC, 0),
            'night_shift_add', COALESCE((details->>'nightShiftAdd')::NUMERIC, 0),
            'events_value', COALESCE((details->>'eventsValue')::NUMERIC, 0),
            'benefits', COALESCE((details->>'benefits')::NUMERIC, 0),
            'inss_value', inss_value,
            'irrf_value', irrf_value,
            'fgts_value', fgts_value,
            'tax_breakdown', tax_breakdown,
            'benefit_breakdown', benefit_breakdown,
            'event_breakdown', event_breakdown,
            'hours_worked', COALESCE((details->>'hoursWorked')::NUMERIC, 220),
            'bank_hours_balance', COALESCE((details->>'bankOfHoursBalance')::NUMERIC, 0)
        )) INTO v_payroll
        FROM public.rh_closed_payroll_items
        WHERE payroll_id = (v_closed_info->>'id')::UUID;
        
        RETURN jsonb_build_object('payroll', COALESCE(v_payroll, '[]'::JSONB), 'is_closed', v_is_closed, 'closed_info', v_closed_info);
    END IF;

    -- 3. Itera Colaboradores (Cálculo em Tempo Real)
    FOR v_staff IN SELECT * FROM public.staff WHERE tenant_id = v_tenant_id AND status = 'ACTIVE'
    LOOP
        v_base_salary := COALESCE(v_staff.base_salary, 0);
        v_dependents := COALESCE(v_staff.dependents_count, 0);
        v_events_earnings := 0;
        v_events_deductions := 0;
        v_event_breakdown := '[]'::JSONB;
        v_has_stored_overtime := FALSE;

        -- Processa Eventos (e verifica duplicidade)
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

            -- Verifica se é evento de hora extra já salvo
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

        -- Cálculo de Horas Extras (Somente se não houver salvo)
        IF v_has_stored_overtime THEN
             v_overtime_data := '{"overtime_50": 0, "overtime_100": 0, "dsr_overtime": 0}'::JSONB;
        ELSE
             BEGIN
                SELECT * INTO v_overtime_data FROM public.calculate_overtime_and_dsr(v_staff.id, p_month, p_year, v_base_salary);
             EXCEPTION WHEN OTHERS THEN
                v_overtime_data := '{"overtime_50": 0, "overtime_100": 0, "dsr_overtime": 0}'::JSONB;
             END;
        END IF;

        -- Totais
        v_gross_total := v_base_salary + v_events_earnings + (v_overtime_data->>'overtime_50')::NUMERIC + (v_overtime_data->>'overtime_100')::NUMERIC + (v_overtime_data->>'dsr_overtime')::NUMERIC;
        v_inss_value := public.calculate_inss(v_gross_total);
        v_irrf_base := v_gross_total - v_inss_value - (v_dependents * 189.59);
        v_irrf_value := public.calculate_irrf(v_irrf_base);
        v_total_discounts := v_inss_value + v_irrf_value + v_events_deductions;
        v_net_total := v_gross_total - v_total_discounts;

        -- Adiciona ao Breakdown se calculado dinamicamente
        IF (v_overtime_data->>'dsr_overtime')::NUMERIC > 0 THEN
            v_event_breakdown := v_event_breakdown || jsonb_build_object('name', 'DSR SOBRE HORAS EXTRAS', 'value', (v_overtime_data->>'dsr_overtime')::NUMERIC, 'type', 'INFO');
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

COMMIT;
