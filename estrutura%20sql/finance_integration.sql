-- 1. Add integrate_finance to rh_payroll_settings
ALTER TABLE public.rh_payroll_settings 
ADD COLUMN IF NOT EXISTS integrate_finance BOOLEAN DEFAULT TRUE;

-- 2. Add expense_id to rh_closed_payrolls
ALTER TABLE public.rh_closed_payrolls
ADD COLUMN IF NOT EXISTS expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL;

-- 3. Update close_payroll RPC to handle finance integration
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
    v_expense_category_id UUID;
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
        -- Find or Create 'Pessoal' Category
        SELECT id INTO v_expense_category_id FROM public.expense_categories WHERE tenant_id = p_tenant_id AND name = 'Pessoal' LIMIT 1;
        
        IF v_expense_category_id IS NULL THEN
            INSERT INTO public.expense_categories (tenant_id, name) VALUES (p_tenant_id, 'Pessoal') RETURNING id INTO v_expense_category_id;
        END IF;

        -- Insert Expense
        INSERT INTO public.expenses (
            tenant_id, description, amount, category, due_date, is_paid, is_recurring, created_by
        ) VALUES (
            p_tenant_id, 
            'Folha de Pagamento - ' || TO_CHAR(TO_DATE(p_month::TEXT || '/' || p_year::TEXT, 'MM/YYYY'), 'MM/YYYY'),
            v_total_net, -- Usually we pay the net to employees, but cost is higher. Let's use Net for now as "Salaries Payable"
            'Pessoal',
            (p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-05')::DATE + INTERVAL '1 month', -- Due 5th working day next month (approx)
            FALSE,
            FALSE,
            auth.uid()
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

-- 4. Create reopen_payroll RPC
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
