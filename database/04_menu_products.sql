
-- ==============================================================================
-- 04_MENU_PRODUCTS.SQL
-- Objetivo: Produtos que aparecem no cardápio digital e POS.
-- ==============================================================================

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Link crucial: Quando vender este produto, qual item de estoque baixar?
    linked_inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
    
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL, -- Preço de Venda
    cost_price NUMERIC(10, 2) DEFAULT 0, -- Custo (cacheado do inventário para relatórios rápidos)
    
    category TEXT NOT NULL, -- Lanches, Bebidas, etc.
    type TEXT DEFAULT 'KITCHEN', -- KITCHEN ou BAR (Define para onde vai a impressão/KDS)
    
    image TEXT,
    is_visible BOOLEAN DEFAULT true, -- Ocultar produto sem deletar
    sort_order INTEGER DEFAULT 0, -- Ordem de exibição
    
    -- Suporte a Adicionais (Extras)
    is_extra BOOLEAN DEFAULT false, 
    linked_extra_ids TEXT[] DEFAULT '{}', -- Array de IDs de outros produtos que são extras deste
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_tenant ON products(tenant_id);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
