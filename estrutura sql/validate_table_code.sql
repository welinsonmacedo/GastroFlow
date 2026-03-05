CREATE OR REPLACE FUNCTION validate_table_code(p_slug TEXT, p_code TEXT)
RETURNS TABLE (
    tenant_id UUID,
    table_id UUID,
    table_number TEXT
) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- 1. Buscar Tenant pelo Slug
    SELECT id INTO v_tenant_id
    FROM tenants
    WHERE slug = p_slug;

    IF v_tenant_id IS NULL THEN
        RETURN;
    END IF;

    -- 2. Buscar Mesa pelo Código e Tenant
    RETURN QUERY
    SELECT 
        t.tenant_id::UUID,
        t.id::UUID as table_id,
        t.number::TEXT as table_number
    FROM restaurant_tables t
    WHERE t.tenant_id = v_tenant_id
      AND t.access_code = p_code;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
