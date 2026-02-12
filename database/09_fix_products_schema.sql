
-- ==============================================================================
-- 09_FIX_PRODUCTS_SCHEMA.SQL
-- Objetivo: Garantir que a tabela 'products' tenha colunas para suporte a Adicionais.
-- Rode este script no SQL Editor do Supabase para corrigir o erro 400.
-- ==============================================================================

-- 1. Adiciona coluna 'is_extra' se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_extra') THEN
        ALTER TABLE products ADD COLUMN is_extra BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Adiciona coluna 'linked_extra_ids' se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'linked_extra_ids') THEN
        ALTER TABLE products ADD COLUMN linked_extra_ids TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- 3. Atualiza cache do schema (opcional, mas recomendado)
NOTIFY pgrst, 'reload schema';
