
-- ==============================================================================
-- 26_ADD_INVENTORY_DESCRIPTION.SQL
-- Objetivo: Adicionar campo de descrição aos itens de estoque.
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'description') THEN
        ALTER TABLE inventory_items ADD COLUMN description TEXT;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
