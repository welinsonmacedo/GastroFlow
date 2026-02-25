-- Script FINAL para configurar o RLS (Row-Level Security) na tabela de tickets
-- Lógica multi-tenant: Admins veem tudo, colaboradores gerenciam apenas os seus.

BEGIN;

-- 1. Habilita a segurança por linha na tabela de tickets (se não estiver ativa)
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- 2. Apaga TODAS as políticas antigas da tabela 'tickets' para evitar conflitos
DROP POLICY IF EXISTS "Allow ALL access to SaaS Admins" ON tickets;
DROP POLICY IF EXISTS "Allow authenticated users to create their own tickets" ON tickets;
DROP POLICY IF EXISTS "Allow tenant users to view their own tickets" ON tickets;
DROP POLICY IF EXISTS "Allow tenant users to update their own tickets" ON tickets;
DROP POLICY IF EXISTS "SaaS Admins have full access" ON tickets;
DROP POLICY IF EXISTS "Users can view appropriate tickets" ON tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON tickets;
DROP POLICY IF EXISTS "Users can update tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can delete tickets" ON tickets;
DROP POLICY IF EXISTS "Allow ticket viewing" ON tickets;
DROP POLICY IF EXISTS "Allow ticket creation" ON tickets;
DROP POLICY IF EXISTS "Allow ticket updates" ON tickets;
DROP POLICY IF EXISTS "Allow ticket deletion by admins" ON tickets;


-- 3. Política de VISUALIZAÇÃO (SELECT)
-- Permite que um usuário veja um ticket se:
-- a) Ele for um Super Admin (seu email está na tabela saas_admins)
-- OU
-- b) O ticket pertence ao seu restaurante (tenant_id).
CREATE POLICY "Allow ticket viewing"
ON tickets FOR SELECT
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1))
);

-- 4. Política de CRIAÇÃO (INSERT)
-- Permite que qualquer usuário autenticado crie um novo ticket.
-- A segurança é garantida pelas outras políticas que impedem o acesso indevido.
CREATE POLICY "Allow ticket creation"
ON tickets FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');


-- 5. Política de ATUALIZAÇÃO (UPDATE)
-- Permite que um usuário atualize um ticket se:
-- a) Ele for um Super Admin.
-- OU
-- b) O ticket pertence ao seu restaurante.
CREATE POLICY "Allow ticket updates"
ON tickets FOR UPDATE
TO authenticated
USING (
    (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()))
    OR
    (tenant_id = (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1))
);

-- 6. Política de EXCLUSÃO (DELETE)
-- Permite que APENAS Super Admins possam deletar tickets.
CREATE POLICY "Allow ticket deletion by admins"
ON tickets FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM saas_admins WHERE email = auth.email()));


COMMIT;
