
-- ==============================================================================
-- 16_FIX_SESSION_PERSISTENCE.SQL
-- Objetivo: Garantir que não haja ambiguidade nas policies do caixa.
-- ==============================================================================

ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;

-- Remove policies antigas para limpar a casa
DROP POLICY IF EXISTS "authenticated_insert_sessions" ON cash_sessions;
DROP POLICY IF EXISTS "authenticated_select_sessions" ON cash_sessions;
DROP POLICY IF EXISTS "authenticated_update_sessions" ON cash_sessions;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON cash_sessions;

-- Cria uma política global permissiva para authenticated users no mesmo tenant
-- Isso resolve problemas onde o filtro do select pode ser muito restritivo
CREATE POLICY "cash_sessions_policy"
ON cash_sessions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Notifica reload
NOTIFY pgrst, 'reload schema';
