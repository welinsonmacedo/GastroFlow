CREATE OR REPLACE FUNCTION public.save_payroll_settings(
    p_tenant_id UUID,
    p_settings JSONB
) RETURNS VOID AS $$
BEGIN
    -- Security Check
    IF NOT EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND tenant_id = p_tenant_id) THEN
        RAISE EXCEPTION 'Acesso Negado';
    END IF;

    INSERT INTO public.rh_payroll_settings (
        tenant_id, min_wage, inss_ceiling, irrf_dependent_deduction, fgts_rate,
        valid_from, valid_until,
        vacation_days_entitlement, vacation_sold_days_limit, thirteenth_min_months_worked,
        notice_period_days, notice_period_days_per_year, notice_period_max_days,
        fgts_fine_percent, standard_monthly_hours,
        time_tracking_method, overtime_policy, deduct_delays_from_overtime,
        point_closing_day, absence_logic, integrate_finance
    ) VALUES (
        p_tenant_id,
        COALESCE((p_settings->>'min_wage')::NUMERIC, 1412.00),
        COALESCE((p_settings->>'inss_ceiling')::NUMERIC, 7786.02),
        COALESCE((p_settings->>'irrf_dependent_deduction')::NUMERIC, 189.59),
        COALESCE((p_settings->>'fgts_rate')::NUMERIC, 8.0),
        (p_settings->>'valid_from')::DATE,
        (p_settings->>'valid_until')::DATE,
        COALESCE((p_settings->>'vacation_days_entitlement')::INTEGER, 30),
        COALESCE((p_settings->>'vacation_sold_days_limit')::INTEGER, 10),
        COALESCE((p_settings->>'thirteenth_min_months_worked')::INTEGER, 1),
        COALESCE((p_settings->>'notice_period_days')::INTEGER, 30),
        COALESCE((p_settings->>'notice_period_days_per_year')::INTEGER, 3),
        COALESCE((p_settings->>'notice_period_max_days')::INTEGER, 90),
        COALESCE((p_settings->>'fgts_fine_percent')::NUMERIC, 40.0),
        COALESCE((p_settings->>'standard_monthly_hours')::INTEGER, 220),
        COALESCE(p_settings->>'time_tracking_method', 'PHYSICAL'),
        COALESCE(p_settings->>'overtime_policy', 'PAID_OVERTIME'),
        COALESCE((p_settings->>'deduct_delays_from_overtime')::BOOLEAN, FALSE),
        COALESCE((p_settings->>'point_closing_day')::INTEGER, 30),
        COALESCE(p_settings->'absence_logic', '{"justified": {"deduction": false, "disciplinaryAction": false}, "unjustified": {"deduction": true, "disciplinaryAction": true}}'::JSONB),
        COALESCE((p_settings->>'integrate_finance')::BOOLEAN, TRUE)
    )
    ON CONFLICT (tenant_id) DO UPDATE SET
        min_wage = EXCLUDED.min_wage,
        inss_ceiling = EXCLUDED.inss_ceiling,
        irrf_dependent_deduction = EXCLUDED.irrf_dependent_deduction,
        fgts_rate = EXCLUDED.fgts_rate,
        valid_from = EXCLUDED.valid_from,
        valid_until = EXCLUDED.valid_until,
        vacation_days_entitlement = EXCLUDED.vacation_days_entitlement,
        vacation_sold_days_limit = EXCLUDED.vacation_sold_days_limit,
        thirteenth_min_months_worked = EXCLUDED.thirteenth_min_months_worked,
        notice_period_days = EXCLUDED.notice_period_days,
        notice_period_days_per_year = EXCLUDED.notice_period_days_per_year,
        notice_period_max_days = EXCLUDED.notice_period_max_days,
        fgts_fine_percent = EXCLUDED.fgts_fine_percent,
        standard_monthly_hours = EXCLUDED.standard_monthly_hours,
        time_tracking_method = EXCLUDED.time_tracking_method,
        overtime_policy = EXCLUDED.overtime_policy,
        deduct_delays_from_overtime = EXCLUDED.deduct_delays_from_overtime,
        point_closing_day = EXCLUDED.point_closing_day,
        absence_logic = EXCLUDED.absence_logic,
        integrate_finance = EXCLUDED.integrate_finance,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
