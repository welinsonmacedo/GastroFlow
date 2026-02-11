
-- ==============================================================================
-- 08_AUTOMATIONS_TRIGGERS.SQL
-- Objetivo: Lógica de negócio no banco de dados (Performance e Integridade).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TRIGGER: BAIXA DE ESTOQUE AUTOMÁTICA
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION deduct_inventory_on_order() RETURNS TRIGGER AS $$
DECLARE
    v_linked_item_id UUID;
    v_item_type TEXT;
    r_recipe RECORD;
BEGIN
    -- Busca o ID do item de estoque vinculado ao produto vendido
    SELECT linked_inventory_item_id INTO v_linked_item_id
    FROM products
    WHERE id = NEW.product_id;

    -- Se não houver vínculo (ex: Taxa de serviço), ignora
    IF v_linked_item_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Descobre se é um item simples ou composto (prato)
    SELECT type INTO v_item_type
    FROM inventory_items
    WHERE id = v_linked_item_id;

    IF v_item_type = 'COMPOSITE' THEN
        -- Se for Prato, baixa cada ingrediente da receita proporcionalmente
        FOR r_recipe IN 
            SELECT ingredient_item_id, quantity 
            FROM inventory_recipes 
            WHERE parent_item_id = v_linked_item_id
        LOOP
            UPDATE inventory_items
            SET quantity = quantity - (r_recipe.quantity * NEW.quantity)
            WHERE id = r_recipe.ingredient_item_id;
            
            -- Opcional: Inserir log de 'SALE' na inventory_logs aqui
        END LOOP;
    ELSE
        -- Se for Revenda/Simples, baixa o item direto
        UPDATE inventory_items
        SET quantity = quantity - NEW.quantity
        WHERE id = v_linked_item_id;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Loga erro mas não trava a venda
        RAISE WARNING 'Erro ao baixar estoque para item %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplica o trigger na tabela order_items
DROP TRIGGER IF EXISTS trg_deduct_stock ON order_items;
CREATE TRIGGER trg_deduct_stock
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION deduct_inventory_on_order();


-- ------------------------------------------------------------------------------
-- 2. FUNÇÃO RPC: PROCESSAR VENDA BALCÃO (Transação Atômica)
-- ------------------------------------------------------------------------------
-- Recebe JSON do front-end e cria Pedido + Itens + Transação em uma única chamada.

CREATE OR REPLACE FUNCTION process_pos_sale(
    p_tenant_id UUID,
    p_customer_name TEXT,
    p_total_amount NUMERIC,
    p_method TEXT,
    p_items JSONB -- [{ "productId": "...", "quantity": 1, "notes": "" }]
) RETURNS JSONB AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_quantity NUMERIC;
    v_notes TEXT;
    v_product_name TEXT;
    v_product_type TEXT;
    v_product_price NUMERIC;
    v_cost_price NUMERIC;
BEGIN
    -- 1. Criar Pedido (Já marcado como Pago/Entregue)
    INSERT INTO orders (tenant_id, status, is_paid, customer_name)
    VALUES (p_tenant_id, 'DELIVERED', true, p_customer_name)
    RETURNING id INTO v_order_id;

    -- 2. Loop nos itens do JSON
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'productId')::UUID;
        v_quantity := (v_item->>'quantity')::NUMERIC;
        v_notes := COALESCE(v_item->>'notes', '');

        -- Busca dados atuais do produto para congelar no pedido
        SELECT name, type, price, cost_price 
        INTO v_product_name, v_product_type, v_product_price, v_cost_price
        FROM products
        WHERE id = v_product_id;

        -- Fallback de segurança
        IF v_product_name IS NULL THEN
            v_product_name := 'Item Removido';
            v_product_price := 0;
        END IF;

        -- Insere Item (Isso vai disparar o Trigger de Estoque acima)
        INSERT INTO order_items (
            tenant_id, order_id, product_id, quantity, notes, status, 
            product_name, product_type, product_price, product_cost_price
        )
        VALUES (
            p_tenant_id, v_order_id, v_product_id, v_quantity, v_notes, 'DELIVERED',
            v_product_name, v_product_type, v_product_price, v_cost_price
        );
    END LOOP;

    -- 3. Registrar Financeiro
    INSERT INTO transactions (tenant_id, order_id, amount, method, created_at, items_summary)
    VALUES (p_tenant_id, v_order_id, p_total_amount, p_method, NOW(), 'Venda Balcão (PDV)');

    RETURN jsonb_build_object('success', true, 'order_id', v_order_id);

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 3. FUNÇÃO RPC: FECHAR CAIXA
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION close_cash_session(
    p_session_id UUID,
    p_final_amount NUMERIC
) RETURNS VOID AS $$
BEGIN
    UPDATE cash_sessions
    SET status = 'CLOSED',
        closed_at = NOW(),
        final_amount = p_final_amount
    WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissões
GRANT EXECUTE ON FUNCTION process_pos_sale TO authenticated;
GRANT EXECUTE ON FUNCTION process_pos_sale TO service_role;
GRANT EXECUTE ON FUNCTION close_cash_session TO authenticated;
GRANT EXECUTE ON FUNCTION close_cash_session TO service_role;

-- ------------------------------------------------------------------------------
-- 4. REALTIME PUBLICATION
-- ------------------------------------------------------------------------------
-- Permite que o Supabase envie updates via WebSocket para o Front-end

ALTER PUBLICATION supabase_realtime ADD TABLE 
    orders, 
    order_items, 
    restaurant_tables, 
    service_calls, 
    transactions,
    inventory_items,
    staff;
