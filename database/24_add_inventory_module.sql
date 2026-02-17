
-- ==============================================================================
-- 24_ADD_INVENTORY_MODULE.SQL
-- Objetivo: Garantir que todos os tenants tenham acesso ao novo módulo ESTOQUE.
-- ==============================================================================

UPDATE tenants
SET allowed_modules = array_append(allowed_modules, 'INVENTORY')
WHERE NOT ('INVENTORY' = ANY(allowed_modules));

-- Recarrega o schema
NOTIFY pgrst, 'reload schema';
