
-- ==============================================================================
-- 18_ADD_MODULES_COLUMN.SQL
-- Objetivo: Suporte a múltiplos módulos (Restaurante, Lanchonete, etc).
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'allowed_modules') THEN
        ALTER TABLE tenants ADD COLUMN allowed_modules TEXT[] DEFAULT '{"RESTAURANT"}';
    END IF;
END $$;

-- Atualiza todos os tenants existentes para terem o módulo Restaurante por padrão
UPDATE tenants SET allowed_modules = '{"RESTAURANT"}' WHERE allowed_modules IS NULL OR array_length(allowed_modules, 1) IS NULL;

NOTIFY pgrst, 'reload schema';
