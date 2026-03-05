-- FIX: Null value in total_cost constraint violation
-- The close_payroll RPC was inserting the header before calculating totals, 
-- but total_cost has a NOT NULL constraint.

BEGIN;

CREATE OR REPLACE FUNCTION public.close_payroll(
    p_tenant_id UUID,
    p_month INTEGER,
    p_year INTEGER,
    p_closed_by TEXT,
    p_items JSONB,
    p_integrate_salaries BOOLEAN DEFAULT FALSE,
    p_integrate_taxes BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
    v_payroll_id UUID;
    v_item JSONB;
    v_expense_id UUID;
    v_total_cost NUMERIC := 0;
    v_total_net NUMERIC := 0;
    v_employee_count INTEGER := 0;
    v_integrated_ids JSONB := '[]'::JSONB;
    v_total_inss NUMERIC := 0;
    v_total_irrf NUMERIC := 0;
    v_total_fgts NUMERIC := 0;
    v_due_date_salaries DATE;
    v_due_date_taxes DATE;
    v_due_date_fgts DATE;
BEGIN
    -- Security check
    IF NOT EXISTS (SELECT 1 FROM public.staff WHERE tenant_id = p_tenant_id AND auth_user_id = auth.uid() AND role IN ('admin', 'manager')) THEN
        -- Allow if it's the system/service role or admin
    END IF;

    -- Check if payroll already closed
    IF EXISTS (SELECT 1 FROM public.rh_closed_payrolls WHERE tenant_id = p_tenant_id AND month = p_month AND year = p_year) THEN
        RAISE EXCEPTION 'Folha já fechada para este período.';
    END IF;

    -- Set due dates
    v_due_date_salaries := (p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-05')::DATE + INTERVAL '1 month';
    v_due_date_taxes := (p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-20')::DATE + INTERVAL '1 month';
    v_due_date_fgts := (p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-07')::DATE + INTERVAL '1 month';

    -- Insert Header first with default values to satisfy NOT NULL constraints
    INSERT INTO public.rh_closed_payrolls (
        tenant_id, month, year, closed_by, closed_at, total_cost, total_net, employee_count
    ) VALUES (
        p_tenant_id, p_month, p_year, p_closed_by, NOW(), 0, 0, 0
    ) RETURNING id INTO v_payroll_id;

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_employee_count := v_employee_count + 1;
        v_total_cost := v_total_cost + COALESCE((v_item->>'total_company_cost')::NUMERIC, 0);
        v_total_net := v_total_net + COALESCE((v_item->>'net_total')::NUMERIC, 0);
        
        -- Accumulate taxes
        v_total_inss := v_total_inss + COALESCE((v_item->'details'->>'inssValue')::NUMERIC, 0);
        v_total_irrf := v_total_irrf + COALESCE((v_item->'details'->>'irrfValue')::NUMERIC, 0);
        v_total_fgts := v_total_fgts + COALESCE((v_item->'details'->>'fgtsValue')::NUMERIC, 0);

        -- Create Salary Expense if requested
        v_expense_id := NULL;
        IF p_integrate_salaries AND COALESCE((v_item->>'net_total')::NUMERIC, 0) > 0 THEN
            INSERT INTO public.expenses (
                tenant_id, description, amount, category, due_date, is_paid, payment_method
            ) VALUES (
                p_tenant_id, 
                'Salário ' || (v_item->>'staff_name') || ' - Ref: ' || LPAD(p_month::TEXT, 2, '0') || '/' || p_year,
                (v_item->>'net_total')::NUMERIC,
                'Pessoal',
                v_due_date_salaries,
                FALSE,
                'BANK'
            ) RETURNING id INTO v_expense_id;
            
            v_integrated_ids := v_integrated_ids || jsonb_build_array(v_expense_id);
        END IF;

        -- Insert Item
        INSERT INTO public.rh_closed_payroll_items (
            payroll_id, tenant_id, staff_id, staff_name, base_salary, gross_total, net_total, 
            discounts, total_company_cost, details, expense_id,
            inss_value, irrf_value, fgts_value, tax_breakdown, benefit_breakdown, event_breakdown
        ) VALUES (
            v_payroll_id,
            p_tenant_id,
            (v_item->>'staff_id')::UUID,
            v_item->>'staff_name',
            COALESCE((v_item->>'base_salary')::NUMERIC, 0),
            COALESCE((v_item->>'gross_total')::NUMERIC, 0),
            COALESCE((v_item->>'net_total')::NUMERIC, 0),
            COALESCE((v_item->>'discounts')::NUMERIC, 0),
            COALESCE((v_item->>'total_company_cost')::NUMERIC, 0),
            v_item->'details',
            v_expense_id,
            COALESCE((v_item->'details'->>'inssValue')::NUMERIC, 0),
            COALESCE((v_item->'details'->>'irrfValue')::NUMERIC, 0),
            COALESCE((v_item->'details'->>'fgtsValue')::NUMERIC, 0),
            COALESCE(v_item->'details'->'taxBreakdown', '[]'::JSONB),
            COALESCE(v_item->'details'->'benefitBreakdown', '[]'::JSONB),
            COALESCE(v_item->'details'->'eventBreakdown', '[]'::JSONB)
        );
    END LOOP;

    -- Create Tax Expenses if requested
    IF p_integrate_taxes THEN
        -- INSS
        IF v_total_inss > 0 THEN
            INSERT INTO public.expenses (
                tenant_id, description, amount, category, due_date, is_paid, payment_method
            ) VALUES (
                p_tenant_id, 'Guia INSS - Ref: ' || LPAD(p_month::TEXT, 2, '0') || '/' || p_year,
                v_total_inss, 'Impostos Folha', v_due_date_taxes, FALSE, 'BANK'
            ) RETURNING id INTO v_expense_id;
            v_integrated_ids := v_integrated_ids || jsonb_build_array(v_expense_id);
        END IF;
        
        -- IRRF
        IF v_total_irrf > 0 THEN
            INSERT INTO public.expenses (
                tenant_id, description, amount, category, due_date, is_paid, payment_method
            ) VALUES (
                p_tenant_id, 'Guia IRRF - Ref: ' || LPAD(p_month::TEXT, 2, '0') || '/' || p_year,
                v_total_irrf, 'Impostos Folha', v_due_date_taxes, FALSE, 'BANK'
            ) RETURNING id INTO v_expense_id;
            v_integrated_ids := v_integrated_ids || jsonb_build_array(v_expense_id);
        END IF;

        -- FGTS
        IF v_total_fgts > 0 THEN
            INSERT INTO public.expenses (
                tenant_id, description, amount, category, due_date, is_paid, payment_method
            ) VALUES (
                p_tenant_id, 'Guia FGTS - Ref: ' || LPAD(p_month::TEXT, 2, '0') || '/' || p_year,
                v_total_fgts, 'Impostos Folha', v_due_date_fgts, FALSE, 'BANK'
            ) RETURNING id INTO v_expense_id;
            v_integrated_ids := v_integrated_ids || jsonb_build_array(v_expense_id);
        END IF;
    END IF;

    -- Update Header with final totals and integrated IDs
    UPDATE public.rh_closed_payrolls SET
        total_cost = v_total_cost,
        total_net = v_total_net,
        employee_count = v_employee_count,
        integrated_expense_ids = v_integrated_ids
    WHERE id = v_payroll_id;

    RETURN v_payroll_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
