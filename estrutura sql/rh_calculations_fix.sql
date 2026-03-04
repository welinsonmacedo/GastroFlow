-- Refatoração de Cálculos de RH para o Backend (Supabase)
-- 1. Garante que rh_event_types tenha calculation_type
-- 2. Atualiza get_payroll_preview para lidar com porcentagens
-- 3. Implementa lógica de faltas/DSR no backend via trigger

BEGIN;

-- 1. Ajuste na tabela rh_event_types
ALTER TABLE public.rh_event_types ADD COLUMN IF NOT EXISTS calculation_type TEXT DEFAULT 'FIXED';

-- 2. Atualização da função get_payroll_preview
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
    
    -- Variáveis de Cálculo
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
    
    -- Auxiliares para cálculo de eventos
    v_event_record RECORD;
    v_calc_value NUMERIC;
BEGIN
    -- 1. Identifica o Tenant
    SELECT tenant_id INTO v_tenant_id FROM public.staff WHERE auth_user_id = auth.uid() LIMIT 1;
    IF v_tenant_id IS NULL THEN SELECT id INTO v_tenant_id FROM public.restaurants LIMIT 1; END IF;
    
    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object('payroll', '[]'::JSONB, 'is_closed', FALSE, 'closed_info', NULL);
    END IF;

    -- 2. Verifica se a folha está fechada
    SELECT jsonb_build_object(
        'id', id, 'month', month, 'year', year, 'total_cost', total_cost, 'total_net', total_net, 'employee_count', employee_count, 'closed_at', closed_at, 'closed_by', closed_by
    ) INTO v_closed_info
    FROM public.rh_closed_payrolls
    WHERE tenant_id = v_tenant_id AND month = p_month AND year = p_year;

    IF v_closed_info IS NOT NULL THEN
        v_is_closed := TRUE;
    END IF;

    -- 3. Itera sobre os colaboradores ativos
    FOR v_staff IN SELECT * FROM public.staff WHERE tenant_id = v_tenant_id AND status = 'ACTIVE'
    LOOP
        v_base_salary := COALESCE(v_staff.base_salary, 0);
        v_dependents := COALESCE(v_staff.dependents_count, 0);
        v_events_earnings := 0;
        v_events_deductions := 0;
        v_event_breakdown := '[]'::JSONB;

        -- Processa Eventos Variáveis e Recorrentes
        FOR v_event_record IN 
            SELECT 
                et.name,
                et.operation,
                et.calculation_type,
                pe.value as raw_value
            FROM public.rh_payroll_events pe
            JOIN public.rh_event_types et ON pe.type::uuid = et.id
            WHERE pe.staff_id = v_staff.id 
              AND pe.month = p_month 
              AND pe.year = p_year
        LOOP
            -- Calcula o valor real se for porcentagem
            IF v_event_record.calculation_type = 'PERCENTAGE' THEN
                v_calc_value := ROUND((v_event_record.raw_value / 100.0) * v_base_salary, 2);
            ELSE
                v_calc_value := v_event_record.raw_value;
            END IF;

            -- Acumula totais
            IF v_event_record.operation = '+' THEN
                v_events_earnings := v_events_earnings + v_calc_value;
                v_event_breakdown := v_event_breakdown || jsonb_build_object(
                    'name', v_event_record.name,
                    'value', v_calc_value,
                    'type', 'CREDIT'
                );
            ELSE
                v_events_deductions := v_events_deductions + v_calc_value;
                v_event_breakdown := v_event_breakdown || jsonb_build_object(
                    'name', v_event_record.name,
                    'value', v_calc_value,
                    'type', 'DEBIT'
                );
            END IF;
        END LOOP;

        -- Totais
        v_gross_total := v_base_salary + v_events_earnings;
        v_inss_value := public.calculate_inss(v_gross_total);
        v_irrf_base := v_gross_total - v_inss_value - (v_dependents * 189.59);
        v_irrf_value := public.calculate_irrf(v_irrf_base);
        v_total_discounts := v_inss_value + v_irrf_value + v_events_deductions;
        v_net_total := v_gross_total - v_total_discounts;

        -- Breakdowns de Impostos e Benefícios
        v_tax_breakdown := jsonb_build_array(
            jsonb_build_object('name', 'INSS', 'value', v_inss_value, 'type', 'EMPLOYEE'),
            jsonb_build_object('name', 'IRRF', 'value', v_irrf_value, 'type', 'EMPLOYEE')
        );
        
        -- Benefícios (Simplificado para o exemplo, pode ser expandido)
        v_benefit_breakdown := '[]'::JSONB;

        -- Monta o objeto do colaborador
        DECLARE
            v_overtime_data JSONB;
        BEGIN
            SELECT * INTO v_overtime_data FROM public.calculate_overtime_and_dsr(v_staff.id, p_month, p_year, v_base_salary);
            
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
                'gross_total', v_gross_total + (v_overtime_data->>'overtime_50')::NUMERIC + (v_overtime_data->>'overtime_100')::NUMERIC + (v_overtime_data->>'dsr_overtime')::NUMERIC,
                'discounts', v_total_discounts,
                'advances', 0,
                'net_total', v_net_total + (v_overtime_data->>'overtime_50')::NUMERIC + (v_overtime_data->>'overtime_100')::NUMERIC + (v_overtime_data->>'dsr_overtime')::NUMERIC,
                'hours_worked', 220,
                'employer_charges', 0,
                'total_company_cost', v_gross_total + (v_overtime_data->>'overtime_50')::NUMERIC + (v_overtime_data->>'overtime_100')::NUMERIC + (v_overtime_data->>'dsr_overtime')::NUMERIC,
                'inss_value', v_inss_value,
                'irrf_value', v_irrf_value,
                'fgts_value', ROUND(v_gross_total * v_fgts_rate, 2),
                'tax_breakdown', v_tax_breakdown,
                'benefit_breakdown', v_benefit_breakdown,
                'event_breakdown', v_event_breakdown || jsonb_build_array(
                    jsonb_build_object('name', 'HORAS EXTRAS 50%', 'value', (v_overtime_data->>'overtime_50')::NUMERIC, 'type', 'CREDIT'),
                    jsonb_build_object('name', 'DSR SOBRE HORAS EXTRAS', 'value', (v_overtime_data->>'dsr_overtime')::NUMERIC, 'type', 'CREDIT')
                )
            );
        END;
        
        v_payroll := v_payroll || v_item;
    END LOOP;

    RETURN jsonb_build_object(
        'payroll', v_payroll,
        'is_closed', v_is_closed,
        'closed_info', v_closed_info
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Lógica de Faltas Automática no Backend
CREATE OR REPLACE FUNCTION public.handle_time_entry_absences()
RETURNS TRIGGER AS $$
DECLARE
    v_base_salary NUMERIC;
    v_daily_value NUMERIC;
    v_settings RECORD;
    v_logic JSONB;
    v_month INTEGER;
    v_year INTEGER;
    v_event_type_id UUID;
BEGIN
    -- Só processa se o status for falta
    IF NEW.status NOT IN ('ABSENT', 'JUSTIFIED_ABSENCE') THEN
        RETURN NEW;
    END IF;

    -- Busca salário e configurações
    SELECT base_salary INTO v_base_salary FROM public.staff WHERE id = NEW.staff_id;
    SELECT * INTO v_settings FROM public.rh_payroll_settings WHERE tenant_id = NEW.tenant_id LIMIT 1;
    
    IF v_base_salary IS NULL OR v_settings IS NULL THEN
        RETURN NEW;
    END IF;

    v_month := EXTRACT(MONTH FROM NEW.entry_date);
    v_year := EXTRACT(YEAR FROM NEW.entry_date);
    v_daily_value := ROUND(v_base_salary / 30.0, 2);

    -- Identifica a lógica
    IF NEW.status = 'JUSTIFIED_ABSENCE' THEN
        v_logic := v_settings.absence_logic->'justified';
    ELSE
        v_logic := v_settings.absence_logic->'unjustified';
    END IF;

    -- Se a lógica prevê desconto
    IF (v_logic->>'deduction')::BOOLEAN THEN
        -- Busca ou cria um tipo de evento para "Faltas"
        SELECT id INTO v_event_type_id FROM public.rh_event_types 
        WHERE tenant_id = NEW.tenant_id AND name ILIKE '%Falta%' AND operation = '-' LIMIT 1;
        
        IF v_event_type_id IS NULL THEN
            INSERT INTO public.rh_event_types (tenant_id, name, operation, calculation_type)
            VALUES (NEW.tenant_id, 'Faltas', '-', 'FIXED')
            RETURNING id INTO v_event_type_id;
        END IF;

        -- Insere o evento de desconto
        INSERT INTO public.rh_payroll_events (tenant_id, staff_id, month, year, type, description, value)
        VALUES (
            NEW.tenant_id, 
            NEW.staff_id, 
            v_month, 
            v_year, 
            v_event_type_id::text, 
            'Falta ' || CASE WHEN NEW.status = 'JUSTIFIED_ABSENCE' THEN 'Justificada' ELSE 'Injustificada' END || ' - ' || NEW.entry_date,
            v_daily_value
        );

        -- Se for injustificada e tiver desconto de DSR
        IF NEW.status = 'ABSENT' AND (v_logic->>'dsrDeduction')::BOOLEAN THEN
             INSERT INTO public.rh_payroll_events (tenant_id, staff_id, month, year, type, description, value)
             VALUES (
                NEW.tenant_id, 
                NEW.staff_id, 
                v_month, 
                v_year, 
                v_event_type_id::text, 
                'Desconto DSR (Falta Injustificada) - Ref: ' || NEW.entry_date,
                v_daily_value
             );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para rh_time_entries
DROP TRIGGER IF EXISTS trg_handle_absences ON public.rh_time_entries;
CREATE TRIGGER trg_handle_absences
AFTER INSERT OR UPDATE OF status ON public.rh_time_entries
FOR EACH ROW
EXECUTE FUNCTION public.handle_time_entry_absences();

COMMIT;
