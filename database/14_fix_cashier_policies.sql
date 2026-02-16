
-- ==============================================================================
-- 14_FIX_CASHIER_POLICIES.SQL
-- Objetivo: Corrigir permissões RLS que podem estar impedindo abertura de caixa.
-- ==============================================================================

-- Habilita RLS (caso não esteja)
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas para evitar duplicidade e garantir limpeza
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON cash_sessions;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON cash_movements;

-- Cria políticas permissivas para usuários autenticados (Staff Logado)
-- Isso permite que o Caixa abra/feche turnos e lance sangrias.

-- CASH_SESSIONS
CREATE POLICY "Enable all access for authenticated users" ON cash_sessions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- CASH_MOVEMENTS
CREATE POLICY "Enable all access for authenticated users" ON cash_movements
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Atualiza cache de permissões
NOTIFY pgrst, 'reload schema';
