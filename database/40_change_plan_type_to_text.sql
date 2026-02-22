-- 40_change_plan_type_to_text.sql
-- Objetivo: Alterar o tipo das colunas de plano para TEXT para permitir planos dinâmicos criados pelo usuário.

-- 1. Alterar a coluna 'plan' na tabela 'tenants'
-- Primeiro removemos o default que pode depender do enum
ALTER TABLE tenants ALTER COLUMN plan DROP DEFAULT;

-- Convertemos a coluna para TEXT
ALTER TABLE tenants ALTER COLUMN plan TYPE TEXT USING plan::TEXT;

-- Redefinimos o default como string 'FREE'
ALTER TABLE tenants ALTER COLUMN plan SET DEFAULT 'FREE';


-- 2. Alterar a coluna 'key' na tabela 'plans'
ALTER TABLE plans ALTER COLUMN key TYPE TEXT USING key::TEXT;


-- 3. (Opcional) Se quiser remover a restrição do enum, agora é possível.
-- O tipo saas_plan ainda existe no banco, mas não é mais usado nessas colunas.
