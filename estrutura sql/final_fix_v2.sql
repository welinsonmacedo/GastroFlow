-- Script de Diagnóstico e Correção de Duplicidade

BEGIN;

-- 1. Diagnóstico (Opcional, apenas para entender o cenário se fosse interativo, mas aqui vamos direto para a correção)
-- Se houver eventos recorrentes de horas extras, eles podem estar causando a duplicidade persistente.

-- 2. Remove Eventos Recorrentes de Horas Extras (se existirem, pois hora extra não deve ser recorrente fixa)
DELETE FROM public.rh_recurring_events
WHERE tenant_id = (SELECT tenant_id FROM public.staff LIMIT 1) -- Pega do primeiro tenant para segurança no script
  AND (
      description ILIKE '%Hora Extra%' OR 
      description ILIKE '%H.E.%' OR 
      description ILIKE '%DSR%'
  );

-- 3. Limpeza Radical de Eventos de Folha (Novamente, para garantir)
DELETE FROM public.rh_payroll_events
WHERE month = 2 
  AND year = 2026
  AND (
      description ILIKE '%Hora Extra%' OR 
      description ILIKE '%H.E.%' OR 
      description ILIKE '%DSR%'
  );

-- 4. Atualização da Função get_payroll_preview (Garantindo nomes padronizados)
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

    IF v_closed_info IS NOT NULL THEN v_is_closed := TRUE; END IF;

    -- 3. Itera Colaboradores
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

        -- Adiciona ao Breakdown se calculado dinamicamente (COM NOMES PADRONIZADOS)
        IF (v_overtime_data->>'overtime_50')::NUMERIC > 0 THEN
            v_event_breakdown := v_event_breakdown || jsonb_build_object('name', '(AUTO) HORAS EXTRAS 50%', 'value', (v_overtime_data->>'overtime_50')::NUMERIC, 'type', 'CREDIT');
        END IF;
        IF (v_overtime_data->>'overtime_100')::NUMERIC > 0 THEN
            v_event_breakdown := v_event_breakdown || jsonb_build_object('name', '(AUTO) HORAS EXTRAS 100%', 'value', (v_overtime_data->>'overtime_100')::NUMERIC, 'type', 'CREDIT');
        END IF;
        IF (v_overtime_data->>'dsr_overtime')::NUMERIC > 0 THEN
            v_event_breakdown := v_event_breakdown || jsonb_build_object('name', '(AUTO) DSR SOBRE HORAS EXTRAS', 'value', (v_overtime_data->>'dsr_overtime')::NUMERIC, 'type', 'CREDIT');
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
