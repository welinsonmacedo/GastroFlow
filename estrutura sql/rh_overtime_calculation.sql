-- Função para calcular horas extras e DSR
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
    v_target_hours NUMERIC := 8; -- Exemplo, deveria vir de rh_shifts
    v_hours_worked NUMERIC;
    v_balance NUMERIC;
    v_daily_value NUMERIC := p_base_salary / 220.0; -- Exemplo, deveria vir de rh_payroll_settings
BEGIN
    SELECT * INTO v_settings FROM public.rh_payroll_settings WHERE tenant_id = (SELECT tenant_id FROM public.staff WHERE id = p_staff_id) LIMIT 1;
    
    FOR v_time_entry IN 
        SELECT * FROM public.rh_time_entries 
        WHERE staff_id = p_staff_id 
        AND EXTRACT(MONTH FROM entry_date) = p_month 
        AND EXTRACT(YEAR FROM entry_date) = p_year
    LOOP
        -- Lógica simplificada de cálculo de horas extras
        IF v_time_entry.clock_in IS NOT NULL AND v_time_entry.clock_out IS NOT NULL THEN
            v_hours_worked := EXTRACT(EPOCH FROM (v_time_entry.clock_out - v_time_entry.clock_in))/3600.0;
            v_balance := v_hours_worked - v_target_hours;
            IF v_balance > 0 THEN
                v_total_overtime_hours := v_total_overtime_hours + v_balance;
                v_overtime_50 := v_overtime_50 + (v_balance * v_daily_value * 1.5);
            END IF;
        END IF;
    END LOOP;

    -- DSR sobre horas extras (simplificado: 1/6 das horas extras)
    v_dsr_overtime := v_overtime_50 * 0.1666;

    RETURN jsonb_build_object(
        'overtime_50', ROUND(v_overtime_50, 2),
        'overtime_100', ROUND(v_overtime_100, 2),
        'dsr_overtime', ROUND(v_dsr_overtime, 2)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
