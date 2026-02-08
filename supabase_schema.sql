
-- ⚠️ ATENÇÃO: RODE ESTE SCRIPT NO "SQL EDITOR" DO SUPABASE ⚠️

-- 1. Alterar tabela de inventory_items para suportar tipos
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='type') THEN
        ALTER TABLE inventory_items ADD COLUMN type TEXT DEFAULT 'INGREDIENT'; -- 'INGREDIENT' (Matéria Prima), 'RESALE' (Revenda), 'COMPOSITE' (Produzido)
    END IF;
END $$;

-- 2. Criar tabela de Receitas do Estoque
CREATE TABLE IF NOT EXISTS inventory_recipes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    parent_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    ingredient_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity NUMERIC(10,3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabelas de CAIXA (NOVO)

-- Sessão de Caixa (Turno)
CREATE TABLE IF NOT EXISTS cash_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    closed_at TIMESTAMP WITH TIME ZONE,
    initial_amount NUMERIC(10,2) NOT NULL DEFAULT 0, -- Fundo de Caixa
    final_amount NUMERIC(10,2), -- Valor conferido no fechamento
    status TEXT DEFAULT 'OPEN', -- 'OPEN', 'CLOSED'
    operator_name TEXT,
    notes TEXT
);

-- Movimentações de Caixa (Sangria / Suprimento)
CREATE TABLE IF NOT EXISTS cash_movements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    session_id UUID REFERENCES cash_sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'BLEED' (Sangria), 'SUPPLY' (Suprimento)
    amount NUMERIC(10,2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    user_name TEXT
);

-- 4. Atualizar Realtime e RLS
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_recipes;
ALTER PUBLICATION supabase_realtime ADD TABLE cash_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE cash_movements;

ALTER TABLE inventory_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access Inventory Recipes" ON inventory_recipes;
CREATE POLICY "Public Access Inventory Recipes" ON inventory_recipes FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access Cash Sessions" ON cash_sessions;
CREATE POLICY "Public Access Cash Sessions" ON cash_sessions FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access Cash Movements" ON cash_movements;
CREATE POLICY "Public Access Cash Movements" ON cash_movements FOR ALL USING (true);
