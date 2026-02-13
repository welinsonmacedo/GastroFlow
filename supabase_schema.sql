
-- ⚠️ ATENÇÃO: RODE ESTE SCRIPT NO "SQL EDITOR" DO SUPABASE ⚠️

-- 1. LIMPEZA DE FUNÇÕES ANTIGAS E TRIGGERS (Prevenção de conflito com estorno via código)
DROP TRIGGER IF EXISTS trg_restore_stock_on_cancel ON orders;
DROP FUNCTION IF EXISTS restore_inventory_on_cancellation();

-- Mantemos o trigger de BAIXA na venda, pois vendas são frequentes e automáticas.
DROP TRIGGER IF EXISTS trg_deduct_stock ON order_items;
DROP FUNCTION IF EXISTS deduct_inventory_on_order();

-- 2. Adicionar coluna de Dados da Empresa na tabela tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_info JSONB DEFAULT '{}';

-- 3. Recriar Trigger de Estoque (APENAS BAIXA NA VENDA)
CREATE OR REPLACE FUNCTION deduct_inventory_on_order() RETURNS TRIGGER AS $$
DECLARE
    v_linked_item_id UUID;
    v_item_type TEXT;
    r_recipe RECORD;
BEGIN
    SELECT linked_inventory_item_id INTO v_linked_item_id FROM products WHERE id = NEW.product_id;
    IF v_linked_item_id IS NULL THEN RETURN NEW; END IF;

    SELECT type INTO v_item_type FROM inventory_items WHERE id = v_linked_item_id;

    IF v_item_type = 'COMPOSITE' THEN
        FOR r_recipe IN SELECT ingredient_item_id, quantity FROM inventory_recipes WHERE parent_item_id = v_linked_item_id LOOP
            UPDATE inventory_items SET quantity = quantity - (r_recipe.quantity * NEW.quantity) WHERE id = r_recipe.ingredient_item_id;
        END LOOP;
    ELSE
        UPDATE inventory_items SET quantity = quantity - NEW.quantity WHERE id = v_linked_item_id;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Erro ao baixar estoque: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_deduct_stock
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION deduct_inventory_on_order();

-- 4. Recriar Função RPC de Venda
CREATE OR REPLACE FUNCTION process_pos_sale(
    p_tenant_id UUID,
    p_customer_name TEXT,
    p_total_amount NUMERIC,
    p_method TEXT,
    p_items JSONB 
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
BEGIN
    INSERT INTO orders (tenant_id, status, is_paid, customer_name)
    VALUES (p_tenant_id, 'DELIVERED', true, p_customer_name)
    RETURNING id INTO v_order_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'productId')::UUID;
        v_quantity := (v_item->>'quantity')::NUMERIC;
        v_notes := COALESCE(v_item->>'notes', '');

        SELECT name, type, price INTO v_product_name, v_product_type, v_product_price
        FROM products WHERE id = v_product_id;

        IF v_product_name IS NULL THEN
            v_product_name := 'Produto Desconhecido'; v_product_type := 'KITCHEN'; v_product_price := 0;
        END IF;

        INSERT INTO order_items (tenant_id, order_id, product_id, quantity, notes, status, product_name, product_type, product_price)
        VALUES (p_tenant_id, v_order_id, v_product_id, v_quantity, v_notes, 'DELIVERED', v_product_name, v_product_type, v_product_price);
    END LOOP;

    INSERT INTO transactions (tenant_id, order_id, amount, method, created_at, items_summary)
    VALUES (p_tenant_id, v_order_id, p_total_amount, p_method, NOW(), 'Venda Balcão (PDV)');

    RETURN jsonb_build_object('success', true, 'order_id', v_order_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Função RPC: Fechar Caixa
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

-- 6. Garantir Permissões
GRANT EXECUTE ON FUNCTION process_pos_sale TO authenticated;
GRANT EXECUTE ON FUNCTION process_pos_sale TO service_role;
GRANT EXECUTE ON FUNCTION process_pos_sale TO anon;
GRANT EXECUTE ON FUNCTION close_cash_session TO authenticated;
GRANT EXECUTE ON FUNCTION close_cash_session TO service_role;

-- 7. ATIVAÇÃO REALTIME (Garante que as tabelas sejam "ouvidas" pelo Front-end)
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_recipes;
ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;
