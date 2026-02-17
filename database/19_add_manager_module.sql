
-- ==============================================================================
-- 19_ADD_MANAGER_MODULE.SQL
-- Objetivo: Garantir que todos os tenants tenham acesso ao novo módulo GESTOR.
-- ==============================================================================

UPDATE tenants
SET allowed_modules = array_append(allowed_modules, 'MANAGER')
WHERE NOT ('MANAGER' = ANY(allowed_modules));

-- Recarrega o schema
NOTIFY pgrst, 'reload schema';
