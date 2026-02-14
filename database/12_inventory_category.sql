
-- ==============================================================================
-- 12_INVENTORY_CATEGORY.SQL
-- Objetivo: Adicionar coluna de categoria aos itens de estoque (Revenda/Produzido).
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'category') THEN
        ALTER TABLE inventory_items ADD COLUMN category TEXT;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
