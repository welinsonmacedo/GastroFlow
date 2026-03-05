-- 1. Add integrate_finance to rh_payroll_settings
ALTER TABLE public.rh_payroll_settings 
ADD COLUMN IF NOT EXISTS integrate_finance BOOLEAN DEFAULT TRUE;

-- 2. Add expense_id to rh_closed_payrolls
ALTER TABLE public.rh_closed_payrolls
ADD COLUMN IF NOT EXISTS expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL;

-- 3. Update save_payroll_settings RPC to include integrate_finance
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

-- 4. Update close_payroll RPC to handle finance integration
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
    v_integrate_finance BOOLEAN;
    v_expense_id UUID;
BEGIN
    -- Security Check
    IF NOT EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND tenant_id = p_tenant_id) THEN
        RAISE EXCEPTION 'Acesso Negado';
    END IF;

    -- Check if payroll already closed
    IF EXISTS (SELECT 1 FROM public.rh_closed_payrolls WHERE tenant_id = p_tenant_id AND month = p_month AND year = p_year) THEN
        RAISE EXCEPTION 'Folha já fechada para este período.';
    END IF;

    -- Calculate totals
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_total_cost := v_total_cost + COALESCE((v_item->>'total_company_cost')::NUMERIC, 0);
        v_total_net := v_total_net + COALESCE((v_item->>'net_total')::NUMERIC, 0);
    END LOOP;

    -- Check Finance Integration Setting
    SELECT integrate_finance INTO v_integrate_finance
    FROM public.rh_payroll_settings
    WHERE tenant_id = p_tenant_id;

    -- Create Expense if Integration Enabled
    IF v_integrate_finance IS TRUE THEN
        -- Insert Expense directly using 'Pessoal' as category string
        INSERT INTO public.expenses (
            tenant_id, description, amount, category, due_date, is_paid, is_recurring, payment_method
        ) VALUES (
            p_tenant_id, 
            'Folha de Pagamento - ' || TO_CHAR(TO_DATE(p_month::TEXT || '/' || p_year::TEXT, 'MM/YYYY'), 'MM/YYYY'),
            v_total_net, -- Usually we pay the net to employees
            'Pessoal',
            (p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-05')::DATE + INTERVAL '1 month', -- Due 5th working day next month
            FALSE,
            FALSE,
            'BANK'
        ) RETURNING id INTO v_expense_id;
    END IF;

    -- Insert Header
    INSERT INTO public.rh_closed_payrolls (
        tenant_id, month, year, total_cost, total_net, 
        employee_count, status, closed_by, closed_at, expense_id
    ) VALUES (
        p_tenant_id, p_month, p_year, v_total_cost, v_total_net, 
        jsonb_array_length(p_items), 'CLOSED', p_closed_by, NOW(), v_expense_id
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
        COALESCE((item->>'base_salary')::NUMERIC, 0), 
        COALESCE((item->>'gross_total')::NUMERIC, 0), 
        COALESCE((item->>'net_total')::NUMERIC, 0), 
        COALESCE((item->>'discounts')::NUMERIC, 0),
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

-- 5. Create reopen_payroll RPC
CREATE OR REPLACE FUNCTION public.reopen_payroll(
    p_tenant_id UUID,
    p_month INTEGER,
    p_year INTEGER
) RETURNS VOID AS $$
DECLARE
    v_payroll_id UUID;
    v_expense_id UUID;
BEGIN
    -- Security Check
    IF NOT EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND tenant_id = p_tenant_id) THEN
        RAISE EXCEPTION 'Acesso Negado';
    END IF;

    -- Get Payroll ID and Expense ID
    SELECT id, expense_id INTO v_payroll_id, v_expense_id
    FROM public.rh_closed_payrolls
    WHERE tenant_id = p_tenant_id AND month = p_month AND year = p_year;

    IF v_payroll_id IS NULL THEN
        RAISE EXCEPTION 'Folha não encontrada para este período.';
    END IF;

    -- Delete Expense if exists
    IF v_expense_id IS NOT NULL THEN
        DELETE FROM public.expenses WHERE id = v_expense_id AND tenant_id = p_tenant_id;
    END IF;

    -- Delete Payroll Items
    DELETE FROM public.rh_closed_payroll_items WHERE payroll_id = v_payroll_id;

    -- Delete Payroll Header
    DELETE FROM public.rh_closed_payrolls WHERE id = v_payroll_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
