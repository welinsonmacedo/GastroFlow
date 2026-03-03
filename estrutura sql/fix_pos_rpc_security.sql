-- Unificação e Segurança da Lógica de PDV
-- Este script garante que o cálculo de preços e total ocorra apenas no servidor.

CREATE OR REPLACE FUNCTION public.process_pos_sale(
    p_tenant_id UUID,
    p_customer_name TEXT,
    p_method TEXT,
    p_items JSONB 
) RETURNS JSONB AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_inventory_item_id UUID;
    v_quantity NUMERIC;
    v_notes TEXT;
    v_product_name TEXT;
    v_product_type TEXT;
    v_product_price NUMERIC;
    v_cost_price NUMERIC;
    v_total_accumulated NUMERIC := 0;
    v_item_total NUMERIC;
BEGIN
    -- 1. Cria o Pedido (Status DELIVERED e Pago)
    INSERT INTO public.orders (tenant_id, status, is_paid, customer_name, order_type)
    VALUES (p_tenant_id, 'DELIVERED', true, COALESCE(p_customer_name, 'Consumidor Final'), 'PDV')
    RETURNING id INTO v_order_id;

    -- 2. Processa os itens e calcula o total real no servidor
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'productId')::UUID;
        v_inventory_item_id := (v_item->>'inventoryItemId')::UUID;
        v_quantity := (v_item->>'quantity')::NUMERIC;
        v_notes := COALESCE(v_item->>'notes', '');

        -- Busca dados reais do banco para evitar manipulação de preço pelo front
        IF v_product_id IS NOT NULL THEN
             SELECT name, type, price, cost_price INTO v_product_name, v_product_type, v_product_price, v_cost_price
             FROM public.products WHERE id = v_product_id AND tenant_id = p_tenant_id;
        ELSIF v_inventory_item_id IS NOT NULL THEN
             SELECT name, 'RESALE', sale_price, cost_price INTO v_product_name, v_product_type, v_product_price, v_cost_price
             FROM public.inventory_items WHERE id = v_inventory_item_id AND tenant_id = p_tenant_id;
        END IF;

        IF v_product_name IS NULL THEN
            CONTINUE; -- Pula itens inválidos
        END IF;

        v_item_total := v_product_price * v_quantity;
        v_total_accumulated := v_total_accumulated + v_item_total;

        -- Insere o item do pedido
        INSERT INTO public.order_items (
            tenant_id, order_id, product_id, inventory_item_id, 
            quantity, notes, status, product_name, 
            product_type, product_price, product_cost_price
        )
        VALUES (
            p_tenant_id, v_order_id, v_product_id, v_inventory_item_id, 
            v_quantity, v_notes, 'DELIVERED', v_product_name, 
            v_product_type, v_product_price, v_cost_price
        );
    END LOOP;

    -- 3. Atualiza o total do pedido com o valor calculado no servidor
    UPDATE public.orders SET total_amount = v_total_accumulated WHERE id = v_order_id;

    -- 4. Registra a transação financeira
    INSERT INTO public.transactions (
        tenant_id, order_id, amount, method, 
        created_at, items_summary, status
    )
    VALUES (
        p_tenant_id, v_order_id, v_total_accumulated, p_method, 
        NOW(), 'Venda Balcão (PDV)', 'COMPLETED'
    );

    RETURN jsonb_build_object(
        'success', true, 
        'order_id', v_order_id, 
        'total', v_total_accumulated
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garante permissões
GRANT EXECUTE ON FUNCTION public.process_pos_sale TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_pos_sale TO service_role;
