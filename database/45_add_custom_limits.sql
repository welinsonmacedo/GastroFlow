-- 45_add_custom_limits.sql
-- Objetivo: Adicionar coluna custom_limits para permitir limites personalizados por tenant.

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
