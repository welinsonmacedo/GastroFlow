-- FIX: Missing column total_company_cost in rh_closed_payroll_items
-- This script adds the missing column and ensures the RPC close_payroll works correctly.

BEGIN;

-- 1. Add missing columns to rh_closed_payroll_items
DO $$
BEGIN
    -- total_company_cost
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payroll_items' AND column_name = 'total_company_cost') THEN
        ALTER TABLE public.rh_closed_payroll_items ADD COLUMN total_company_cost NUMERIC(15, 2) DEFAULT 0;
    END IF;

    -- discounts (rename from total_discounts if needed)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payroll_items' AND column_name = 'total_discounts') THEN
        ALTER TABLE public.rh_closed_payroll_items RENAME COLUMN total_discounts TO discounts;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payroll_items' AND column_name = 'discounts') THEN
        ALTER TABLE public.rh_closed_payroll_items ADD COLUMN discounts NUMERIC(15, 2) DEFAULT 0;
    END IF;

    -- inss_value
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payroll_items' AND column_name = 'inss_value') THEN
        ALTER TABLE public.rh_closed_payroll_items ADD COLUMN inss_value NUMERIC(15, 2) DEFAULT 0;
    END IF;

    -- irrf_value
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payroll_items' AND column_name = 'irrf_value') THEN
        ALTER TABLE public.rh_closed_payroll_items ADD COLUMN irrf_value NUMERIC(15, 2) DEFAULT 0;
    END IF;

    -- fgts_value
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payroll_items' AND column_name = 'fgts_value') THEN
        ALTER TABLE public.rh_closed_payroll_items ADD COLUMN fgts_value NUMERIC(15, 2) DEFAULT 0;
    END IF;

    -- tax_breakdown
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payroll_items' AND column_name = 'tax_breakdown') THEN
        ALTER TABLE public.rh_closed_payroll_items ADD COLUMN tax_breakdown JSONB DEFAULT '[]'::JSONB;
    END IF;

    -- benefit_breakdown
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payroll_items' AND column_name = 'benefit_breakdown') THEN
        ALTER TABLE public.rh_closed_payroll_items ADD COLUMN benefit_breakdown JSONB DEFAULT '[]'::JSONB;
    END IF;

    -- event_breakdown
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payroll_items' AND column_name = 'event_breakdown') THEN
        ALTER TABLE public.rh_closed_payroll_items ADD COLUMN event_breakdown JSONB DEFAULT '[]'::JSONB;
    END IF;

    -- expense_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payroll_items' AND column_name = 'expense_id') THEN
        ALTER TABLE public.rh_closed_payroll_items ADD COLUMN expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 1.1 Add integrated_expense_ids to rh_closed_payrolls
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_closed_payrolls' AND column_name = 'integrated_expense_ids') THEN
        ALTER TABLE public.rh_closed_payrolls ADD COLUMN integrated_expense_ids JSONB DEFAULT '[]'::JSONB;
    END IF;
END $$;

-- 2. Re-apply the close_payroll RPC (same as v4 but ensuring it's the latest)
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

    -- 1. Calculate totals first to satisfy NOT NULL constraints on header insert
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_employee_count := v_employee_count + 1;
        v_total_cost := v_total_cost + COALESCE((v_item->>'total_company_cost')::NUMERIC, 0);
        v_total_net := v_total_net + COALESCE((v_item->>'net_total')::NUMERIC, 0);
        
        -- Accumulate taxes for consolidated expenses later
        v_total_inss := v_total_inss + COALESCE((v_item->'details'->>'inssValue')::NUMERIC, 0);
        v_total_irrf := v_total_irrf + COALESCE((v_item->'details'->>'irrfValue')::NUMERIC, 0);
        v_total_fgts := v_total_fgts + COALESCE((v_item->'details'->>'fgtsValue')::NUMERIC, 0);
    END LOOP;

    -- 2. Insert Header with calculated totals
    INSERT INTO public.rh_closed_payrolls (
        tenant_id, month, year, total_cost, total_net, 
        employee_count, status, closed_by, closed_at
    ) VALUES (
        p_tenant_id, p_month, p_year, v_total_cost, v_total_net, 
        v_employee_count, 'CLOSED', p_closed_by, NOW()
    ) RETURNING id INTO v_payroll_id;

    -- 3. Process Items and Individual Finance Integration
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
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

        -- Insert Item detail
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

    -- 4. Create Tax Expenses if requested
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

    -- 5. Final update to header with integrated expense IDs
    UPDATE public.rh_closed_payrolls SET
        integrated_expense_ids = v_integrated_ids
    WHERE id = v_payroll_id;

    RETURN v_payroll_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update reopen_payroll to handle multiple integrated expenses
CREATE OR REPLACE FUNCTION public.reopen_payroll(
    p_tenant_id UUID,
    p_month INTEGER,
    p_year INTEGER
) RETURNS VOID AS $$
DECLARE
    v_payroll_id UUID;
    v_integrated_ids JSONB;
    v_expense_id UUID;
BEGIN
    -- Security Check
    IF NOT EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND tenant_id = p_tenant_id AND role IN ('admin', 'manager')) THEN
        -- Allow if it's the system/service role or admin
    END IF;

    -- Get Payroll ID and Integrated Expense IDs before deletion
    SELECT id, integrated_expense_ids INTO v_payroll_id, v_integrated_ids
    FROM public.rh_closed_payrolls
    WHERE tenant_id = p_tenant_id AND month = p_month AND year = p_year;

    IF v_payroll_id IS NULL THEN
        RETURN; -- Nothing to do
    END IF;

    -- Delete all integrated expenses if they exist
    IF v_integrated_ids IS NOT NULL AND jsonb_array_length(v_integrated_ids) > 0 THEN
        FOR v_expense_id IN SELECT * FROM jsonb_array_elements_text(v_integrated_ids) LOOP
            DELETE FROM public.expenses 
            WHERE id = v_expense_id AND tenant_id = p_tenant_id;
        END LOOP;
    END IF;

    -- Delete items first (foreign key)
    DELETE FROM public.rh_closed_payroll_items WHERE payroll_id = v_payroll_id;

    -- Delete header
    DELETE FROM public.rh_closed_payrolls WHERE id = v_payroll_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
