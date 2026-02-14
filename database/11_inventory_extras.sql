
-- ==============================================================================
-- 11_INVENTORY_EXTRAS.SQL
-- Objetivo: Armazenar as categorias alvo dos adicionais diretamente no estoque.
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'target_categories') THEN
        ALTER TABLE inventory_items ADD COLUMN target_categories TEXT[] DEFAULT '{}';
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
