
-- ==============================================================================
-- 06_ORDERS_SALES.SQL
-- Objetivo: Núcleo transacional. Pedidos e itens vendidos.
-- ==============================================================================

-- Cabeçalho do Pedido
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL, -- Null se for venda balcão
    customer_name TEXT, -- "Cliente Balcão" ou nome da mesa
    
    status order_status DEFAULT 'PENDING',
    is_paid BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itens do Pedido (Linhas da nota)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL, -- Venda direta do estoque
    
    -- Snapshot dos dados no momento da venda (se o produto mudar preço depois, o histórico não muda)
    product_name TEXT NOT NULL,
    product_price NUMERIC(10, 2) NOT NULL,
    product_cost_price NUMERIC(10, 2) DEFAULT 0,
    product_type TEXT DEFAULT 'KITCHEN',
    
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    notes TEXT, -- "Sem cebola"
    status order_status DEFAULT 'PENDING', -- Controle individual por item no KDS
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transações Financeiras (Entradas de Vendas)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    table_id UUID, -- Opcional, para histórico
    
    amount NUMERIC(10, 2) NOT NULL,
    method payment_method NOT NULL,
    
    items_summary TEXT, -- Resumo rápido: "Mesa 10" ou "Coca, X-Burger"
    cashier_name TEXT,
    status TEXT DEFAULT 'COMPLETED', -- COMPLETED, CANCELLED
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices pesados para relatórios
CREATE INDEX idx_orders_tenant_date ON orders(tenant_id, created_at);
CREATE INDEX idx_transactions_tenant_date ON transactions(tenant_id, created_at);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
