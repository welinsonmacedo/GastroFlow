-- 43_rpc_update_tenant_admin.sql
-- Objetivo: Permitir atualização de tenant por Admin (Auth ou Fallback) via RPC para contornar limitações de RLS.

CREATE OR REPLACE FUNCTION update_tenant_by_saas_admin(
    p_admin_id UUID,
    p_tenant_id UUID,
    p_name TEXT,
    p_slug TEXT,
    p_owner_name TEXT,
    p_email TEXT,
    p_plan TEXT,
    p_allowed_modules TEXT[],
    p_allowed_features TEXT[]
) RETURNS JSONB AS $$
DECLARE
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    -- 1. Check if authorized via Supabase Auth
    IF auth.uid() IS NOT NULL THEN
        -- Check if Super Admin (in saas_admins with auth.uid)
        SELECT EXISTS (SELECT 1 FROM saas_admins WHERE id = auth.uid()) INTO v_is_authorized;
        
        -- Or check if Tenant Owner (in staff)
        IF NOT v_is_authorized THEN
            SELECT EXISTS (
                SELECT 1 FROM staff 
                WHERE auth_user_id = auth.uid() 
                AND tenant_id = p_tenant_id 
                AND role IN ('ADMIN', 'SUPER_ADMIN')
            ) INTO v_is_authorized;
        END IF;
    END IF;

    -- 2. Fallback: Check if authorized via p_admin_id (for legacy/fallback login)
    IF NOT v_is_authorized AND p_admin_id IS NOT NULL THEN
        SELECT EXISTS (SELECT 1 FROM saas_admins WHERE id = p_admin_id) INTO v_is_authorized;
    END IF;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;

    -- 3. Perform Update
    UPDATE tenants
    SET 
        name = COALESCE(p_name, name),
        slug = COALESCE(p_slug, slug),
        owner_name = COALESCE(p_owner_name, owner_name),
        email = COALESCE(p_email, email),
        plan = COALESCE(p_plan, plan),
        allowed_modules = COALESCE(p_allowed_modules, allowed_modules),
        allowed_features = COALESCE(p_allowed_features, allowed_features),
        custom_limits = CASE WHEN p_plan IS NOT NULL THEN NULL ELSE custom_limits END
    WHERE id = p_tenant_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_tenant_by_saas_admin TO authenticated;
GRANT EXECUTE ON FUNCTION update_tenant_by_saas_admin TO anon;
GRANT EXECUTE ON FUNCTION update_tenant_by_saas_admin TO service_role;
