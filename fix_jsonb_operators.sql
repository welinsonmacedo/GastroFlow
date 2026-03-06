BEGIN;

-- 1. Fix close_table_internal
CREATE OR REPLACE FUNCTION public.close_table_internal(
    p_tenant_id UUID,
    p_table_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_staff_record RECORD;
    v_new_routes TEXT[];
    v_route_to_remove TEXT;
BEGIN
    UPDATE public.restaurant_tables
    SET status = 'AVAILABLE',
        customer_name = NULL,
        access_code = NULL
    WHERE id = p_table_id AND tenant_id = p_tenant_id;

    v_route_to_remove := 'OPENER:' || p_table_id;
    
    FOR v_staff_record IN 
        SELECT id, allowed_routes 
        FROM public.staff 
        WHERE tenant_id = p_tenant_id 
          AND allowed_routes IS NOT NULL 
          AND jsonb_typeof(allowed_routes) = 'array'
          AND allowed_routes @> to_jsonb(ARRAY[v_route_to_remove])
    LOOP
        SELECT ARRAY_AGG(r) INTO v_new_routes
        FROM jsonb_array_elements_text(v_staff_record.allowed_routes) AS r
        WHERE r != v_route_to_remove;

        UPDATE public.staff
        SET allowed_routes = to_jsonb(COALESCE(v_new_routes, ARRAY[]::TEXT[]))
        WHERE id = v_staff_record.id;
    END LOOP;
END;
$$;

-- 2. Fix open_table
CREATE OR REPLACE FUNCTION public.open_table(
    p_tenant_id UUID,
    p_table_id UUID,
    p_customer_name TEXT DEFAULT NULL,
    p_access_code TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_routes JSONB;
    v_route_to_add TEXT;
    v_is_staff BOOLEAN;
    v_auth_uid UUID;
    v_final_customer_name TEXT;
    v_user_email TEXT;
    v_user_name TEXT;
BEGIN
    v_auth_uid := auth.uid();
    
    IF p_user_id IS NULL THEN
        p_user_id := v_auth_uid;
    END IF;

    IF v_auth_uid IS NOT NULL THEN
        SELECT email, raw_user_meta_data->>'name' 
        INTO v_user_email, v_user_name
        FROM auth.users 
        WHERE id = v_auth_uid;
    END IF;

    v_final_customer_name := COALESCE(NULLIF(p_customer_name, ''), v_user_name, v_user_email, 'Cliente');

    UPDATE public.restaurant_tables
    SET status = 'OCCUPIED',
        customer_name = v_final_customer_name,
        access_code = COALESCE(p_access_code, '')
    WHERE id = p_table_id AND tenant_id = p_tenant_id;

    IF p_user_id IS NOT NULL THEN
        SELECT EXISTS(SELECT 1 FROM public.staff WHERE id = p_user_id AND tenant_id = p_tenant_id) INTO v_is_staff;
        
        IF v_is_staff THEN
            v_route_to_add := 'OPENER:' || p_table_id;
            
            SELECT allowed_routes INTO v_current_routes
            FROM public.staff
            WHERE id = p_user_id AND tenant_id = p_tenant_id;

            IF v_current_routes IS NULL OR jsonb_typeof(v_current_routes) != 'array' THEN
                v_current_routes := '[]'::jsonb;
            END IF;

            IF NOT (v_current_routes @> to_jsonb(ARRAY[v_route_to_add])) THEN
                UPDATE public.staff
                SET allowed_routes = v_current_routes || to_jsonb(ARRAY[v_route_to_add])
                WHERE id = p_user_id AND tenant_id = p_tenant_id;
            END IF;
        END IF;
    END IF;
END;
$$;

-- 3. Fix assign_table
CREATE OR REPLACE FUNCTION public.assign_table(
    p_tenant_id UUID,
    p_table_id UUID,
    p_waiter_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_staff_record RECORD;
    v_new_routes TEXT[];
    v_route_to_manage TEXT;
    v_current_routes JSONB;
BEGIN
    v_route_to_manage := 'TABLE:' || p_table_id;

    FOR v_staff_record IN 
        SELECT id, allowed_routes 
        FROM public.staff 
        WHERE tenant_id = p_tenant_id 
          AND allowed_routes IS NOT NULL 
          AND jsonb_typeof(allowed_routes) = 'array'
          AND allowed_routes @> to_jsonb(ARRAY[v_route_to_manage])
    LOOP
        SELECT ARRAY_AGG(r) INTO v_new_routes
        FROM jsonb_array_elements_text(v_staff_record.allowed_routes) AS r
        WHERE r != v_route_to_manage;

        UPDATE public.staff
        SET allowed_routes = to_jsonb(COALESCE(v_new_routes, ARRAY[]::TEXT[]))
        WHERE id = v_staff_record.id;
    END LOOP;

    IF p_waiter_id IS NOT NULL THEN
        SELECT allowed_routes INTO v_current_routes
        FROM public.staff
        WHERE id = p_waiter_id AND tenant_id = p_tenant_id;

        IF v_current_routes IS NULL OR jsonb_typeof(v_current_routes) != 'array' THEN
            v_current_routes := '[]'::jsonb;
        END IF;

        IF NOT (v_current_routes @> to_jsonb(ARRAY[v_route_to_manage])) THEN
            UPDATE public.staff
            SET allowed_routes = v_current_routes || to_jsonb(ARRAY[v_route_to_manage])
            WHERE id = p_waiter_id AND tenant_id = p_tenant_id;
        END IF;
    END IF;
END;
$$;

-- 4. Fix add_staff
CREATE OR REPLACE FUNCTION public.add_staff(
    p_tenant_id UUID,
    p_max_staff INTEGER,
    p_staff JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_count INTEGER;
    v_new_id UUID;
BEGIN
    IF p_max_staff != -1 THEN
        SELECT COUNT(*) INTO v_current_count
        FROM public.staff
        WHERE tenant_id = p_tenant_id;

        IF v_current_count >= p_max_staff THEN
            RAISE EXCEPTION 'Limite de colaboradores atingido para o seu plano.';
        END IF;
    END IF;

    INSERT INTO public.staff (
        tenant_id,
        name,
        role,
        custom_role_id,
        pin,
        email,
        allowed_routes,
        department,
        hr_job_role_id,
        hire_date,
        contract_type,
        work_model,
        base_salary,
        benefits_total,
        status,
        shift_id,
        phone,
        document_cpf,
        dependents_count,
        created_by,
        birth_date,
        rg_number,
        rg_issuer,
        rg_state,
        address_zip,
        address_street,
        address_number,
        address_complement,
        address_neighborhood,
        address_city,
        address_state,
        pis_pasep,
        ctps_number,
        ctps_series,
        ctps_state,
        marital_status,
        emergency_contact_name,
        emergency_contact_phone,
        fathers_name,
        mothers_name,
        education_level,
        voter_registration,
        bank_name,
        bank_agency,
        bank_account,
        bank_account_type,
        pix_key,
        health_plan_info,
        pension_info,
        transport_voucher_info,
        meal_voucher_info,
        sst_info
    ) VALUES (
        p_tenant_id,
        p_staff->>'name',
        p_staff->>'role',
        (p_staff->>'custom_role_id')::UUID,
        p_staff->>'pin',
        p_staff->>'email',
        COALESCE(p_staff->'allowed_routes', '[]'::jsonb),
        p_staff->>'department',
        (p_staff->>'hr_job_role_id')::UUID,
        (p_staff->>'hire_date')::DATE,
        p_staff->>'contract_type',
        p_staff->>'work_model',
        (p_staff->>'base_salary')::NUMERIC,
        (p_staff->>'benefits_total')::NUMERIC,
        p_staff->>'status',
        (p_staff->>'shift_id')::UUID,
        p_staff->>'phone',
        p_staff->>'document_cpf',
        (p_staff->>'dependents_count')::INTEGER,
        (p_staff->>'created_by')::UUID,
        (p_staff->>'birth_date')::DATE,
        p_staff->>'rg_number',
        p_staff->>'rg_issuer',
        p_staff->>'rg_state',
        p_staff->>'address_zip',
        p_staff->>'address_street',
        p_staff->>'address_number',
        p_staff->>'address_complement',
        p_staff->>'address_neighborhood',
        p_staff->>'address_city',
        p_staff->>'address_state',
        p_staff->>'pis_pasep',
        p_staff->>'ctps_number',
        p_staff->>'ctps_series',
        p_staff->>'ctps_state',
        p_staff->>'marital_status',
        p_staff->>'emergency_contact_name',
        p_staff->>'emergency_contact_phone',
        p_staff->>'fathers_name',
        p_staff->>'mothers_name',
        p_staff->>'education_level',
        p_staff->>'voter_registration',
        p_staff->>'bank_name',
        p_staff->>'bank_agency',
        p_staff->>'bank_account',
        p_staff->>'bank_account_type',
        p_staff->>'pix_key',
        p_staff->'health_plan_info',
        p_staff->'pension_info',
        p_staff->'transport_voucher_info',
        p_staff->'meal_voucher_info',
        p_staff->'sst_info'
    ) RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('success', true, 'id', v_new_id);
END;
$$;

COMMIT;
