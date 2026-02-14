
-- ==============================================================================
-- 10_UPDATE_EXTRAS_SCHEMA.SQL
-- Objetivo: Adicionar suporte para filtrar em quais categorias um adicional aparece.
-- Rode este script no SQL Editor do Supabase.
-- ==============================================================================

-- 1. Adiciona coluna 'target_categories' se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'target_categories') THEN
        ALTER TABLE products ADD COLUMN target_categories TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- 2. Atualiza cache do schema (opcional, mas recomendado)
NOTIFY pgrst, 'reload schema';
