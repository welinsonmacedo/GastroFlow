
-- 1. Adicionar coluna de custo histórico para DRE retroativo
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_cost_price NUMERIC DEFAULT 0;

-- 2. Atualizar Função RPC de Venda PDV para incluir o Custo (CMV)
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
    v_product_cost NUMERIC;
BEGIN
    -- 1. Criar Pedido (Header)
    INSERT INTO orders (tenant_id, status, is_paid, customer_name)
    VALUES (p_tenant_id, 'DELIVERED', true, p_customer_name)
    RETURNING id INTO v_order_id;

    -- 2. Inserir Itens capturando o CUSTO ATUAL do estoque
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'productId')::UUID;
        v_quantity := (v_item->>'quantity')::NUMERIC;
        v_notes := COALESCE(v_item->>'notes', '');

        SELECT name, type, price, COALESCE(cost_price, 0) INTO v_product_name, v_product_type, v_product_price, v_product_cost
        FROM products
        WHERE id = v_product_id;

        IF v_product_name IS NULL THEN
            v_product_name := 'Produto Desconhecido';
            v_product_type := 'KITCHEN';
            v_product_price := 0;
            v_product_cost := 0;
        END IF;

        INSERT INTO order_items (tenant_id, order_id, product_id, quantity, notes, status, product_name, product_type, product_price, product_cost_price)
        VALUES (
            p_tenant_id, v_order_id, v_product_id, v_quantity, v_notes, 'DELIVERED',
            v_product_name, v_product_type, v_product_price, v_product_cost
        );
    END LOOP;

    -- 3. Registrar Transação Financeira
    INSERT INTO transactions (tenant_id, order_id, amount, method, created_at, items_summary)
    VALUES (p_tenant_id, v_order_id, p_total_amount, p_method, NOW(), 'Venda Balcão (PDV)');

    RETURN jsonb_build_object('success', true, 'order_id', v_order_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
