
-- ==============================================================================
-- 15_FIX_CASHIER_RLS.SQL
-- Objetivo: Reforçar as permissões para garantir que a abertura de caixa funcione.
-- Execute este script no SQL Editor do Supabase.
-- ==============================================================================

-- 1. Garante que RLS esteja ativo
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

-- 2. Remove TODAS as políticas anteriores para evitar conflitos
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON cash_sessions;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON cash_movements;
DROP POLICY IF EXISTS "Allow authenticated insert" ON cash_sessions;
DROP POLICY IF EXISTS "Allow authenticated select" ON cash_sessions;
DROP POLICY IF EXISTS "Allow authenticated update" ON cash_sessions;

-- 3. Cria políticas permissivas e explícitas para usuários logados
-- Isso permite que Staff (Caixa, Garçom, Admin) criem e leiam sessões de caixa.

-- Políticas para CASH_SESSIONS
CREATE POLICY "authenticated_insert_sessions"
ON cash_sessions
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_select_sessions"
ON cash_sessions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_update_sessions"
ON cash_sessions
FOR UPDATE
TO authenticated
USING (true);

-- Políticas para CASH_MOVEMENTS
CREATE POLICY "authenticated_all_movements"
ON cash_movements
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Notifica o PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';
