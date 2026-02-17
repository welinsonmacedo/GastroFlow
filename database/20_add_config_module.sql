
-- ==============================================================================
-- 20_ADD_CONFIG_MODULE.SQL
-- Objetivo: Garantir que todos os tenants tenham acesso ao novo módulo CONFIGURAÇÕES.
-- ==============================================================================

UPDATE tenants
SET allowed_modules = array_append(allowed_modules, 'CONFIG')
WHERE NOT ('CONFIG' = ANY(allowed_modules));

-- Recarrega o schema
NOTIFY pgrst, 'reload schema';
