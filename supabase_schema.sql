
-- ⚠️ ATENÇÃO: RODE ESTE SCRIPT NO "SQL EDITOR" DO SUPABASE ⚠️

-- ==============================================================================
-- 1. ESTRUTURA BASE (Tabelas Necessárias se não existirem)
-- ==============================================================================

-- Garantir colunas em inventory_items
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='type') THEN
        ALTER TABLE inventory_items ADD COLUMN type TEXT DEFAULT 'INGREDIENT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='image') THEN
        ALTER TABLE inventory_items ADD COLUMN image TEXT;
    END IF;
END $$;

-- Garantir colunas em products
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='linked_inventory_item_id') THEN
        ALTER TABLE products ADD COLUMN linked_inventory_item_id UUID REFERENCES inventory_items(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='cost_price') THEN
        ALTER TABLE products ADD COLUMN cost_price NUMERIC(10,2) DEFAULT 0;
    END IF;
END $$;

-- Tabela de Receitas (Ficha Técnica)
CREATE TABLE IF NOT EXISTS inventory_recipes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    parent_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    ingredient_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity NUMERIC(10,3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Sessão de Caixa
CREATE TABLE IF NOT EXISTS cash_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    closed_at TIMESTAMP WITH TIME ZONE,
    initial_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    final_amount NUMERIC(10,2),
    difference NUMERIC(10,2), -- Diferença calculada no backend
    status TEXT DEFAULT 'OPEN',
    operator_name TEXT,
    notes TEXT
);

-- Movimentações de Caixa
CREATE TABLE IF NOT EXISTS cash_movements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    session_id UUID REFERENCES cash_sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL, 
    amount NUMERIC(10,2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    user_name TEXT
);

-- ==============================================================================
-- 2. TRIGGER DE ESTOQUE INTELIGENTE (A "Mágica" do Estoque)
-- ==============================================================================
-- Esta função baixa o estoque automaticamente quando um item de pedido é inserido.
-- Ela suporta produtos simples (Revenda) e compostos (Receitas).

CREATE OR REPLACE FUNCTION deduct_inventory_on_order() RETURNS TRIGGER AS $$
DECLARE
    v_linked_item_id UUID;
    v_item_type TEXT;
    r_recipe RECORD;
BEGIN
    -- 1. Descobrir qual item de estoque está ligado a este produto
    SELECT linked_inventory_item_id INTO v_linked_item_id
    FROM products
    WHERE id = NEW.product_id;

    IF v_linked_item_id IS NOT NULL THEN
        -- 2. Descobrir o tipo do item (Ingrediente, Revenda, Composto)
        SELECT type INTO v_item_type
        FROM inventory_items
        WHERE id = v_linked_item_id;

        IF v_item_type = 'COMPOSITE' THEN
            -- 3. Se for Composto (Prato), baixar cada ingrediente da receita
            FOR r_recipe IN 
                SELECT ingredient_item_id, quantity 
                FROM inventory_recipes 
                WHERE parent_item_id = v_linked_item_id
            LOOP
                UPDATE inventory_items
                SET quantity = quantity - (r_recipe.quantity * NEW.quantity)
                WHERE id = r_recipe.ingredient_item_id;
                
                -- Log de auditoria de estoque (Opcional, mas profissional)
                INSERT INTO inventory_logs (tenant_id, item_id, type, quantity, reason, user_name)
                VALUES (NEW.tenant_id, r_recipe.ingredient_item_id, 'SALE', (r_recipe.quantity * NEW.quantity), 'Venda Automática (Receita)', 'Sistema');
            END LOOP;
        ELSE
            -- 4. Se for Revenda (Bebida, etc), baixar o item direto
            UPDATE inventory_items
            SET quantity = quantity - NEW.quantity
            WHERE id = v_linked_item_id;

            INSERT INTO inventory_logs (tenant_id, item_id, type, quantity, reason, user_name)
            VALUES (NEW.tenant_id, v_linked_item_id, 'SALE', NEW.quantity, 'Venda Direta', 'Sistema');
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar o Trigger
DROP TRIGGER IF EXISTS trg_deduct_stock ON order_items;
CREATE TRIGGER trg_deduct_stock
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION deduct_inventory_on_order();


-- ==============================================================================
-- 3. VIEWS (Relatórios Rápidos e Leves)
-- ==============================================================================

-- View Financeira (DRE Simplificado)
-- Agrega receitas e despesas por dia para relatórios instantâneos
CREATE OR REPLACE VIEW view_finance_dre AS
SELECT 
    t.tenant_id,
    DATE(t.created_at) as date,
    SUM(t.amount) as revenue,
    COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.tenant_id = t.tenant_id AND DATE(e.due_date) = DATE(t.created_at)), 0) as expenses,
    (SUM(t.amount) - COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.tenant_id = t.tenant_id AND DATE(e.due_date) = DATE(t.created_at)), 0)) as net_income,
    COUNT(t.id) as transactions_count
FROM transactions t
GROUP BY t.tenant_id, DATE(t.created_at);

-- ==============================================================================
-- 4. RPCs (Funções de Negócio Atômicas)
-- ==============================================================================

-- Fechar Caixa (Cálculo Seguro no Servidor)
CREATE OR REPLACE FUNCTION close_cash_session(
    p_session_id UUID,
    p_final_amount NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_initial NUMERIC;
    v_sales_cash NUMERIC;
    v_bleeds NUMERIC;
    v_supplies NUMERIC;
    v_expected NUMERIC;
    v_diff NUMERIC;
BEGIN
    -- Obter dados da sessão
    SELECT initial_amount INTO v_initial FROM cash_sessions WHERE id = p_session_id;
    
    -- Somar vendas em DINHEIRO (CASH) vinculadas a esta sessão (por data/hora)
    -- Simplificação: Assume vendas baseadas no horário de abertura da sessão até agora
    SELECT COALESCE(SUM(amount), 0) INTO v_sales_cash 
    FROM transactions 
    WHERE tenant_id = (SELECT tenant_id FROM cash_sessions WHERE id = p_session_id)
      AND method = 'CASH'
      AND created_at >= (SELECT opened_at FROM cash_sessions WHERE id = p_session_id);

    -- Somar Sangrias e Suprimentos
    SELECT COALESCE(SUM(amount), 0) INTO v_bleeds FROM cash_movements WHERE session_id = p_session_id AND type = 'BLEED';
    SELECT COALESCE(SUM(amount), 0) INTO v_supplies FROM cash_movements WHERE session_id = p_session_id AND type = 'SUPPLY';

    -- Calcular Esperado
    v_expected := v_initial + v_sales_cash + v_supplies - v_bleeds;
    v_diff := p_final_amount - v_expected;

    -- Atualizar Sessão
    UPDATE cash_sessions 
    SET status = 'CLOSED',
        closed_at = NOW(),
        final_amount = p_final_amount,
        difference = v_diff
    WHERE id = p_session_id;

    RETURN jsonb_build_object('success', true, 'expected', v_expected, 'difference', v_diff);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Processar Venda PDV (Transação Completa)
CREATE OR REPLACE FUNCTION process_pos_sale(
    p_tenant_id UUID,
    p_customer_name TEXT,
    p_total_amount NUMERIC,
    p_method TEXT,
    p_items JSONB -- Array de objetos {productId, quantity, notes}
) RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
BEGIN
    -- 1. Criar Pedido
    INSERT INTO orders (tenant_id, status, is_paid, customer_name)
    VALUES (p_tenant_id, 'DELIVERED', true, p_customer_name)
    RETURNING id INTO v_order_id;

    -- 2. Inserir Itens (O Trigger de Estoque vai rodar aqui automaticamente!)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO order_items (tenant_id, order_id, product_id, quantity, notes, status, product_type)
        VALUES (
            p_tenant_id, 
            v_order_id, 
            (v_item->>'productId')::UUID, 
            (v_item->>'quantity')::NUMERIC, 
            v_item->>'notes', 
            'DELIVERED',
            'KITCHEN' -- Default, idealmente viria do JSON
        );
    END LOOP;

    -- 3. Registrar Transação Financeira
    INSERT INTO transactions (tenant_id, order_id, amount, method, created_at, items_summary)
    VALUES (p_tenant_id, v_order_id, p_total_amount, p_method, NOW(), 'Venda Balcão (PDV)');

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissões RLS (Segurança)
ALTER TABLE inventory_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access Inventory Recipes" ON inventory_recipes;
CREATE POLICY "Public Access Inventory Recipes" ON inventory_recipes FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access Cash Sessions" ON cash_sessions;
CREATE POLICY "Public Access Cash Sessions" ON cash_sessions FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access Cash Movements" ON cash_movements;
CREATE POLICY "Public Access Cash Movements" ON cash_movements FOR ALL USING (true);

-- Publicações Realtime para o Frontend reagir
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_recipes;
ALTER PUBLICATION supabase_realtime ADD TABLE cash_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE cash_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
