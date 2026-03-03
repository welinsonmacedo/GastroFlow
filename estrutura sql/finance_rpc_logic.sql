-- RPCs for Finance Module Logic
-- This file moves frontend logic for finance to the backend (Supabase)

-- 1. Open Cash Session
CREATE OR REPLACE FUNCTION public.open_cash_session(
    p_tenant_id UUID,
    p_initial_amount NUMERIC,
    p_operator_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- Check if there is already an open session for this tenant
    IF EXISTS (SELECT 1 FROM public.cash_sessions WHERE tenant_id = p_tenant_id AND status = 'OPEN') THEN
        RAISE EXCEPTION 'Já existe um caixa aberto para este restaurante.';
    END IF;

    INSERT INTO public.cash_sessions (
        tenant_id, 
        initial_amount, 
        status, 
        operator_name, 
        opened_at
    )
    VALUES (
        p_tenant_id, 
        p_initial_amount, 
        'OPEN', 
        p_operator_name, 
        NOW()
    )
    RETURNING id INTO v_session_id;

    RETURN jsonb_build_object('success', true, 'session_id', v_session_id);
END;
$$;

-- 2. Bleed Cash Register (Sangria)
CREATE OR REPLACE FUNCTION public.bleed_cash_register(
    p_tenant_id UUID,
    p_session_id UUID,
    p_amount NUMERIC,
    p_reason TEXT,
    p_user_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify if session is open
    IF NOT EXISTS (SELECT 1 FROM public.cash_sessions WHERE id = p_session_id AND status = 'OPEN') THEN
        RAISE EXCEPTION 'Não é possível realizar sangria em um caixa fechado.';
    END IF;

    INSERT INTO public.cash_movements (
        tenant_id, 
        session_id, 
        type, 
        amount, 
        reason, 
        user_name, 
        created_at
    )
    VALUES (
        p_tenant_id, 
        p_session_id, 
        'BLEED', 
        p_amount, 
        p_reason, 
        p_user_name, 
        NOW()
    );
END;
$$;

-- 3. Upsert Expense (handles single or recurring)
CREATE OR REPLACE FUNCTION public.upsert_expense(
    p_tenant_id UUID,
    p_expense JSONB,
    p_recurrence_months INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
    v_base_date DATE;
    v_i INTEGER;
BEGIN
    v_id := (p_expense->>'id')::UUID;

    IF v_id IS NULL THEN
        -- If recurrence is requested
        IF p_recurrence_months > 1 THEN
            v_base_date := (p_expense->>'dueDate')::DATE;
            FOR v_i IN 0..(p_recurrence_months - 1) LOOP
                INSERT INTO public.expenses (
                    tenant_id,
                    description,
                    amount,
                    category,
                    due_date,
                    paid_date,
                    is_paid,
                    is_recurring,
                    payment_method,
                    supplier_id
                )
                VALUES (
                    p_tenant_id,
                    p_expense->>'description' || ' (' || (v_i + 1) || '/' || p_recurrence_months || ')',
                    (p_expense->>'amount')::NUMERIC,
                    p_expense->>'category',
                    v_base_date + (v_i || ' month')::INTERVAL,
                    CASE WHEN v_i = 0 AND (p_expense->>'isPaid')::BOOLEAN THEN (p_expense->>'paidDate')::DATE ELSE NULL END,
                    CASE WHEN v_i = 0 THEN (p_expense->>'isPaid')::BOOLEAN ELSE false END,
                    (p_expense->>'isRecurring')::BOOLEAN,
                    p_expense->>'paymentMethod',
                    (p_expense->>'supplierId')::UUID
                );
            END LOOP;
        ELSE
            -- Single insert
            INSERT INTO public.expenses (
                tenant_id,
                description,
                amount,
                category,
                due_date,
                paid_date,
                is_paid,
                is_recurring,
                payment_method,
                supplier_id
            )
            VALUES (
                p_tenant_id,
                p_expense->>'description',
                (p_expense->>'amount')::NUMERIC,
                p_expense->>'category',
                (p_expense->>'dueDate')::DATE,
                (p_expense->>'paidDate')::DATE,
                (p_expense->>'isPaid')::BOOLEAN,
                (p_expense->>'isRecurring')::BOOLEAN,
                p_expense->>'paymentMethod',
                (p_expense->>'supplierId')::UUID
            );
        END IF;
    ELSE
        -- Update existing
        UPDATE public.expenses
        SET description = p_expense->>'description',
            amount = (p_expense->>'amount')::NUMERIC,
            category = p_expense->>'category',
            due_date = (p_expense->>'dueDate')::DATE,
            paid_date = (p_expense->>'paidDate')::DATE,
            is_paid = (p_expense->>'isPaid')::BOOLEAN,
            is_recurring = (p_expense->>'isRecurring')::BOOLEAN,
            payment_method = p_expense->>'paymentMethod',
            supplier_id = (p_expense->>'supplierId')::UUID,
            updated_at = NOW()
        WHERE id = v_id AND tenant_id = p_tenant_id;
    END IF;
END;
$$;

-- 4. Pay Expense
CREATE OR REPLACE FUNCTION public.pay_expense(
    p_tenant_id UUID,
    p_expense_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.expenses
    SET is_paid = true,
        paid_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = p_expense_id AND tenant_id = p_tenant_id;
END;
$$;

-- 5. Delete Expense (with PIN check)
CREATE OR REPLACE FUNCTION public.delete_expense_(
    p_tenant_id UUID,
    p_expense_id UUID,
    p_admin_pin TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_correct_pin TEXT;
BEGIN
    -- Get correct PIN from tenant settings
    SELECT business_info->>'adminPin' INTO v_correct_pin 
    FROM public.tenants 
    WHERE id = p_tenant_id;

    IF v_correct_pin IS NULL OR v_correct_pin = '' THEN
        RAISE EXCEPTION 'Senha mestra não configurada nas Configurações da empresa.';
    END IF;

    IF p_admin_pin != v_correct_pin THEN
        RAISE EXCEPTION 'Senha de administrador incorreta.';
    END IF;

    DELETE FROM public.expenses
    WHERE id = p_expense_id AND tenant_id = p_tenant_id;
END;
$$;

-- 6. Cancel Transaction Secure (with PIN check)
CREATE OR REPLACE FUNCTION public.cancel_transaction_secure(
    p_tenant_id UUID,
    p_transaction_id UUID,
    p_admin_pin TEXT,
    p_user_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_correct_pin TEXT;
    v_order_id UUID;
BEGIN
    -- Get correct PIN from tenant settings
    SELECT business_info->>'adminPin' INTO v_correct_pin 
    FROM public.tenants 
    WHERE id = p_tenant_id;

    IF v_correct_pin IS NULL OR v_correct_pin = '' THEN
        RAISE EXCEPTION 'Senha mestra não configurada nas Configurações da empresa.';
    END IF;

    IF p_admin_pin != v_correct_pin THEN
        RAISE EXCEPTION 'Senha de administrador incorreta.';
    END IF;

    -- Proceed with cancellation logic (similar to existing cancel_transaction)
    UPDATE public.transactions
    SET status = 'VOIDED',
        updated_at = NOW(),
        items_summary = items_summary || ' (ESTORNADO por ' || p_user_name || ' em ' || TO_CHAR(NOW(), 'DD/MM/YY HH24:MI') || ')'
    WHERE id = p_transaction_id AND tenant_id = p_tenant_id
    RETURNING order_id INTO v_order_id;

    -- If there is an associated order, mark it as cancelled too
    IF v_order_id IS NOT NULL THEN
        UPDATE public.orders
        SET status = 'CANCELLED',
            updated_at = NOW()
        WHERE id = v_order_id AND tenant_id = p_tenant_id;
    END IF;
END;
$$;
