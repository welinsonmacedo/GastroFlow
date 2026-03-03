-- 1. Create Tenant
CREATE OR REPLACE FUNCTION public.create_tenant_by_saas_admin(
    p_name TEXT,
    p_slug TEXT,
    p_owner_name TEXT,
    p_email TEXT,
    p_plan TEXT,
    p_theme_config JSONB,
    p_allowed_modules TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_id UUID;
    v_new_tenant_id UUID;
BEGIN
    -- Check if slug exists
    SELECT id INTO v_existing_id FROM public.tenants WHERE slug = p_slug;
    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Slug já em uso.');
    END IF;

    INSERT INTO public.tenants (
        name,
        slug,
        owner_name,
        email,
        plan,
        status,
        theme_config,
        allowed_modules
    ) VALUES (
        p_name,
        p_slug,
        p_owner_name,
        p_email,
        p_plan,
        'ACTIVE',
        p_theme_config,
        p_allowed_modules
    ) RETURNING id INTO v_new_tenant_id;

    -- Create default admin staff for the tenant
    INSERT INTO public.staff (
        tenant_id,
        name,
        role,
        pin
    ) VALUES (
        v_new_tenant_id,
        'Admin',
        'ADMIN',
        '1234'
    );

    RETURN jsonb_build_object('success', true, 'tenant_id', v_new_tenant_id);
END;
$$;

-- 2. Update Tenant
CREATE OR REPLACE FUNCTION public.update_tenant_by_saas_admin(
    p_admin_id UUID,
    p_tenant_id UUID,
    p_name TEXT,
    p_slug TEXT,
    p_owner_name TEXT,
    p_email TEXT,
    p_plan TEXT,
    p_allowed_modules TEXT[],
    p_allowed_features TEXT[],
    p_theme_config JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.tenants
    SET name = COALESCE(p_name, name),
        slug = COALESCE(p_slug, slug),
        owner_name = COALESCE(p_owner_name, owner_name),
        email = COALESCE(p_email, email),
        plan = COALESCE(p_plan, plan),
        allowed_modules = COALESCE(p_allowed_modules, allowed_modules),
        allowed_features = COALESCE(p_allowed_features, allowed_features),
        theme_config = COALESCE(p_theme_config, theme_config),
        updated_at = NOW()
    WHERE id = p_tenant_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. Update Tenant Modules
CREATE OR REPLACE FUNCTION public.update_tenant_modules_by_saas_admin(
    p_tenant_id UUID,
    p_modules TEXT[],
    p_features TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.tenants
    SET allowed_modules = p_modules,
        allowed_features = p_features,
        updated_at = NOW()
    WHERE id = p_tenant_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. Update Tenant Limits
CREATE OR REPLACE FUNCTION public.update_tenant_limits_by_saas_admin(
    p_tenant_id UUID,
    p_limits JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.tenants
    SET custom_limits = p_limits,
        updated_at = NOW()
    WHERE id = p_tenant_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. Create Tenant Admin
CREATE OR REPLACE FUNCTION public.create_tenant_admin_by_saas_admin(
    p_tenant_id UUID,
    p_name TEXT,
    p_email TEXT,
    p_pin TEXT,
    p_auth_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.staff (
        tenant_id,
        name,
        email,
        role,
        pin,
        auth_user_id
    ) VALUES (
        p_tenant_id,
        p_name,
        p_email,
        'ADMIN',
        p_pin,
        p_auth_user_id
    );

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. Update Global Settings
CREATE OR REPLACE FUNCTION public.update_global_settings_by_saas_admin(
    p_settings JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.saas_config (id, global_settings)
    VALUES (1, p_settings)
    ON CONFLICT (id) DO UPDATE
    SET global_settings = EXCLUDED.global_settings,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. Update Plan Details
CREATE OR REPLACE FUNCTION public.update_plan_details_by_saas_admin(
    p_plan_id UUID,
    p_key TEXT,
    p_name TEXT,
    p_price NUMERIC,
    p_features TEXT[],
    p_limits JSONB,
    p_button_text TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.plans
    SET name = p_name,
        price = p_price,
        features = p_features,
        limits = p_limits,
        button_text = p_button_text,
        updated_at = NOW()
    WHERE id = p_plan_id;

    -- Propagate limits to tenants
    UPDATE public.tenants
    SET allowed_modules = ARRAY(SELECT jsonb_array_elements_text(p_limits->'allowedModules')),
        allowed_features = ARRAY(SELECT jsonb_array_elements_text(p_limits->'allowedFeatures')),
        custom_limits = p_limits,
        updated_at = NOW()
    WHERE plan = p_key;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 8. Create Plan
CREATE OR REPLACE FUNCTION public.create_plan_by_saas_admin(
    p_key TEXT,
    p_name TEXT,
    p_price NUMERIC,
    p_period TEXT,
    p_features TEXT[],
    p_limits JSONB,
    p_button_text TEXT,
    p_is_popular BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_plan_id UUID;
BEGIN
    INSERT INTO public.plans (
        key,
        name,
        price,
        period,
        features,
        limits,
        button_text,
        is_popular
    ) VALUES (
        p_key,
        p_name,
        p_price,
        p_period,
        p_features,
        p_limits,
        p_button_text,
        p_is_popular
    ) RETURNING id INTO v_new_plan_id;

    RETURN jsonb_build_object('success', true, 'plan_id', v_new_plan_id);
END;
$$;

-- 9. Delete Plan
CREATE OR REPLACE FUNCTION public.delete_plan_by_saas_admin(
    p_plan_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.plans WHERE id = p_plan_id;
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 10. Toggle Tenant Status
CREATE OR REPLACE FUNCTION public.toggle_tenant_status_by_saas_admin(
    p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_status TEXT;
    v_new_status TEXT;
BEGIN
    SELECT status INTO v_current_status FROM public.tenants WHERE id = p_tenant_id;
    
    IF v_current_status = 'ACTIVE' THEN
        v_new_status := 'INACTIVE';
    ELSE
        v_new_status := 'ACTIVE';
    END IF;

    UPDATE public.tenants SET status = v_new_status, updated_at = NOW() WHERE id = p_tenant_id;

    RETURN jsonb_build_object('success', true, 'new_status', v_new_status);
END;
$$;

-- 11. Update Admin Profile
CREATE OR REPLACE FUNCTION public.update_admin_profile_by_saas_admin(
    p_admin_id UUID,
    p_name TEXT,
    p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.saas_admins
    SET name = p_name,
        email = p_email,
        updated_at = NOW()
    WHERE id = p_admin_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 12. Reply to Ticket
CREATE OR REPLACE FUNCTION public.reply_to_ticket_by_saas_admin(
    p_ticket_id UUID,
    p_reply_text TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_messages JSONB;
    v_new_message JSONB;
    v_current_status TEXT;
    v_new_status TEXT;
BEGIN
    SELECT messages, status INTO v_current_messages, v_current_status
    FROM public.tickets
    WHERE id = p_ticket_id;

    IF v_current_messages IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ticket not found');
    END IF;

    v_new_message := jsonb_build_object(
        'sender', 'SUPPORT',
        'text', p_reply_text,
        'timestamp', NOW()
    );

    v_current_messages := v_current_messages || v_new_message;

    IF v_current_status = 'OPEN' THEN
        v_new_status := 'IN_PROGRESS';
    ELSE
        v_new_status := v_current_status;
    END IF;

    UPDATE public.tickets
    SET messages = v_current_messages,
        status = v_new_status,
        updated_at = NOW()
    WHERE id = p_ticket_id;

    RETURN jsonb_build_object('success', true, 'new_status', v_new_status, 'messages', v_current_messages);
END;
$$;

-- 13. Change Ticket Status
CREATE OR REPLACE FUNCTION public.change_ticket_status_by_saas_admin(
    p_ticket_id UUID,
    p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.tickets
    SET status = p_status,
        updated_at = NOW()
    WHERE id = p_ticket_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 14. Unblock IP
CREATE OR REPLACE FUNCTION public.unblock_ip_by_saas_admin(
    p_ip TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.blocked_ips WHERE ip = p_ip;
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 15. Block IP
CREATE OR REPLACE FUNCTION public.block_ip_by_saas_admin(
    p_ip TEXT,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.blocked_ips (ip, reason)
    VALUES (p_ip, p_reason)
    ON CONFLICT (ip) DO NOTHING;
    
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 16. Update Security Config
CREATE OR REPLACE FUNCTION public.update_security_config_by_saas_admin(
    p_config JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.system_settings (key, value)
    VALUES ('security_config', p_config)
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true);
END;
$$;
