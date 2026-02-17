
-- ==============================================================================
-- 22_ADD_BARCODE_SUPPORT.SQL
-- Objetivo: Adicionar código de barras ao estoque e habilitar módulo de comércio.
-- ==============================================================================

-- 1. Adicionar coluna barcode
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'barcode') THEN
        ALTER TABLE inventory_items ADD COLUMN barcode TEXT;
    END IF;
END $$;

-- Índice para busca rápida no PDV
CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory_items(barcode);

-- 2. Garantir que COMMERCE esteja disponível nos módulos permitidos
UPDATE tenants
SET allowed_modules = array_append(allowed_modules, 'COMMERCE')
WHERE NOT ('COMMERCE' = ANY(allowed_modules));

NOTIFY pgrst, 'reload schema';
