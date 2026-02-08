-- ⚠️ ATENÇÃO: RODE ESTE SCRIPT NO "SQL EDITOR" DO SUPABASE ⚠️

-- 1. Alterar tabela de inventory_items para suportar tipos
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='type') THEN
        ALTER TABLE inventory_items ADD COLUMN type TEXT DEFAULT 'INGREDIENT'; -- 'INGREDIENT' (Matéria Prima), 'RESALE' (Revenda), 'COMPOSITE' (Produzido)
    END IF;
END $$;

-- 2. Criar tabela de Receitas do Estoque (Substitui a lógica anterior de product_ingredients)
-- Isso define COMO um item de estoque do tipo 'COMPOSITE' é feito.
CREATE TABLE IF NOT EXISTS inventory_recipes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    parent_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE, -- O produto final (ex: Hamburguer)
    ingredient_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE, -- O ingrediente (ex: Carne)
    quantity NUMERIC(10,3) NOT NULL, -- Quanto usa (ex: 0.200 kg)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Atualizar Realtime e RLS
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_recipes;

ALTER TABLE inventory_recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Inventory Recipes" ON inventory_recipes;
CREATE POLICY "Public Access Inventory Recipes" ON inventory_recipes FOR ALL USING (true);
