-- 46_ensure_custom_limits.sql

-- 1. Ensure column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tenants' 
        AND column_name = 'custom_limits'
    ) THEN
        ALTER TABLE tenants ADD COLUMN custom_limits JSONB DEFAULT NULL;
    END IF;
END
$$;

-- 2. Recreate RPC function to ensure it references the column correctly
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
    -- Authorization logic...
    IF auth.uid() IS NOT NULL THEN
        SELECT EXISTS (SELECT 1 FROM saas_admins WHERE id = auth.uid()) INTO v_is_authorized;
        IF NOT v_is_authorized THEN
            SELECT EXISTS (
                SELECT 1 FROM staff 
                WHERE auth_user_id = auth.uid() 
                AND tenant_id = p_tenant_id 
                AND role IN ('ADMIN', 'SUPER_ADMIN')
            ) INTO v_is_authorized;
        END IF;
    END IF;

    IF NOT v_is_authorized AND p_admin_id IS NOT NULL THEN
        SELECT EXISTS (SELECT 1 FROM saas_admins WHERE id = p_admin_id) INTO v_is_authorized;
    END IF;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;

    -- Update
    UPDATE tenants
    SET 
        name = COALESCE(p_name, name),
        slug = COALESCE(p_slug, slug),
        owner_name = COALESCE(p_owner_name, owner_name),
        email = COALESCE(p_email, email),
        plan = COALESCE(p_plan, plan),
        allowed_modules = COALESCE(p_allowed_modules, allowed_modules),
        allowed_features = COALESCE(p_allowed_features, allowed_features),
        -- If plan changes, reset custom_limits. Otherwise keep it.
        custom_limits = CASE WHEN p_plan IS NOT NULL THEN NULL ELSE custom_limits END
    WHERE id = p_tenant_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
