-- Fix close_payroll RPC to use correct JSON keys (snake_case)

BEGIN;

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
        -- Use COALESCE to prevent NULLs from propagating
        -- Keys are snake_case based on StaffContext.tsx
        v_total_cost := v_total_cost + COALESCE((v_item->>'total_company_cost')::NUMERIC, 0);
        v_total_net := v_total_net + COALESCE((v_item->>'net_total')::NUMERIC, 0);
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

COMMIT;
