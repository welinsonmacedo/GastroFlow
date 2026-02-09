
-- ⚠️ ATENÇÃO: RODE ESTE SCRIPT NO "SQL EDITOR" DO SUPABASE ⚠️

-- 1. DROP para garantir limpeza de versões antigas incompatíveis
DROP FUNCTION IF EXISTS process_pos_sale(UUID, TEXT, NUMERIC, TEXT, JSONB);
DROP TRIGGER IF EXISTS trg_deduct_stock ON order_items;
DROP FUNCTION IF EXISTS deduct_inventory_on_order();

-- 2. Recriar Trigger de Estoque (Mais Robusto)
CREATE OR REPLACE FUNCTION deduct_inventory_on_order() RETURNS TRIGGER AS $$
DECLARE
    v_linked_item_id UUID;
    v_item_type TEXT;
    r_recipe RECORD;
    v_stock_qty NUMERIC;
BEGIN
    -- Verificar se product_id existe e buscar link
    SELECT linked_inventory_item_id INTO v_linked_item_id
    FROM products
    WHERE id = NEW.product_id;

    -- Se não tiver link com estoque, ignora (ex: Taxa de serviço)
    IF v_linked_item_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Descobrir tipo do item
    SELECT type, quantity INTO v_item_type, v_stock_qty
    FROM inventory_items
    WHERE id = v_linked_item_id;

    IF v_item_type IS NULL THEN
        RETURN NEW; -- Item não encontrado no estoque, segue vida
    END IF;

    IF v_item_type = 'COMPOSITE' THEN
        -- Baixar ingredientes da receita
        FOR r_recipe IN 
            SELECT ingredient_item_id, quantity 
            FROM inventory_recipes 
            WHERE parent_item_id = v_linked_item_id
        LOOP
            UPDATE inventory_items
            SET quantity = quantity - (r_recipe.quantity * NEW.quantity)
            WHERE id = r_recipe.ingredient_item_id;
        END LOOP;
    ELSE
        -- Baixar item direto (Revenda/Ingrediente)
        UPDATE inventory_items
        SET quantity = quantity - NEW.quantity
        WHERE id = v_linked_item_id;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Se der erro no estoque, NÃO TRAVA a venda, apenas loga (em produção) e segue
        RAISE WARNING 'Erro ao baixar estoque para item %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reaplicar Trigger
CREATE TRIGGER trg_deduct_stock
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION deduct_inventory_on_order();


-- 3. Recriar Função RPC de Venda (Transação Atômica) com CORREÇÃO DO PRODUCT_PRICE
CREATE OR REPLACE FUNCTION process_pos_sale(
    p_tenant_id UUID,
    p_customer_name TEXT,
    p_total_amount NUMERIC,
    p_method TEXT,
    p_items JSONB -- Espera um Array JSON: [{ "productId": "...", "quantity": 1, "notes": "" }]
) RETURNS JSONB AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_quantity NUMERIC;
    v_notes TEXT;
    v_product_name TEXT;
    v_product_type TEXT;
    v_product_price NUMERIC; -- Nova variável para preço
BEGIN
    -- 1. Criar Pedido (Header)
    INSERT INTO orders (tenant_id, status, is_paid, customer_name)
    VALUES (p_tenant_id, 'DELIVERED', true, p_customer_name)
    RETURNING id INTO v_order_id;

    -- 2. Inserir Itens (Loop no JSON)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Extrair valores com segurança
        v_product_id := (v_item->>'productId')::UUID;
        v_quantity := (v_item->>'quantity')::NUMERIC;
        v_notes := COALESCE(v_item->>'notes', '');

        -- Buscar dados do produto (Nome, Tipo e Preço) para preencher colunas NOT NULL
        SELECT name, type, price INTO v_product_name, v_product_type, v_product_price
        FROM products
        WHERE id = v_product_id;

        -- Fallback de segurança se produto foi deletado
        IF v_product_name IS NULL THEN
            v_product_name := 'Produto Desconhecido';
            v_product_type := 'KITCHEN';
            v_product_price := 0;
        END IF;

        INSERT INTO order_items (tenant_id, order_id, product_id, quantity, notes, status, product_name, product_type, product_price)
        VALUES (
            p_tenant_id, 
            v_order_id, 
            v_product_id, 
            v_quantity, 
            v_notes, 
            'DELIVERED',
            v_product_name,
            v_product_type,
            v_product_price
        );
    END LOOP;

    -- 3. Registrar Transação Financeira
    INSERT INTO transactions (tenant_id, order_id, amount, method, created_at, items_summary)
    VALUES (p_tenant_id, v_order_id, p_total_amount, p_method, NOW(), 'Venda Balcão (PDV)');

    -- Retorno de Sucesso
    RETURN jsonb_build_object('success', true, 'order_id', v_order_id);

EXCEPTION
    WHEN OTHERS THEN
        -- Retorno de Erro formatado
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Garantir Permissões
ALTER FUNCTION process_pos_sale(UUID, TEXT, NUMERIC, TEXT, JSONB) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION process_pos_sale(UUID, TEXT, NUMERIC, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION process_pos_sale(UUID, TEXT, NUMERIC, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION process_pos_sale(UUID, TEXT, NUMERIC, TEXT, JSONB) TO anon;

-- 5. Publicar Tabelas no Realtime (Garante que o Front atualize)
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_items;
