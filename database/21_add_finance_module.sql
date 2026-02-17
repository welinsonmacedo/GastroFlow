
-- ==============================================================================
-- 21_ADD_FINANCE_MODULE.SQL
-- Objetivo: Garantir que todos os tenants tenham acesso ao novo módulo FINANCEIRO.
-- ==============================================================================

UPDATE tenants
SET allowed_modules = array_append(allowed_modules, 'FINANCE')
WHERE NOT ('FINANCE' = ANY(allowed_modules));

-- Recarrega o schema
NOTIFY pgrst, 'reload schema';
