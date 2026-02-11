
-- ==============================================================================
-- 03_INVENTORY_SUPPLIERS.SQL
-- Objetivo: Controle completo de cadeia de suprimentos e engenharia de cardápio.
-- ==============================================================================

-- Fornecedores
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    cnpj TEXT,
    ie TEXT, -- Inscrição Estadual
    -- Endereço
    cep TEXT,
    address TEXT,
    number TEXT,
    complement TEXT,
    city TEXT,
    state TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itens de Estoque (Pode ser matéria prima ou produto final)
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    unit TEXT NOT NULL, -- UN, KG, LT, GR
    type inventory_type NOT NULL DEFAULT 'INGREDIENT',
    
    quantity NUMERIC(10, 4) DEFAULT 0, -- Permite casas decimais para KG/LT
    min_quantity NUMERIC(10, 4) DEFAULT 5, -- Ponto de recompra (alerta)
    cost_price NUMERIC(10, 2) DEFAULT 0, -- Custo médio ponderado
    
    image TEXT, -- URL da imagem (útil se for um item de revenda)
    is_extra BOOLEAN DEFAULT false, -- Se é um adicional (ex: Bacon Extra)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ficha Técnica (Receitas)
-- Relaciona um item COMPOSITE (Pai) com seus INGREDIENTS (Filhos)
CREATE TABLE inventory_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    parent_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    ingredient_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    
    quantity NUMERIC(10, 4) NOT NULL, -- Quanto deste ingrediente vai na receita?
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Logs de Auditoria de Estoque (Kardex)
CREATE TABLE inventory_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    
    type TEXT CHECK (type IN ('IN', 'OUT', 'SALE', 'LOSS')), -- Entrada, Saída, Venda, Perda
    quantity NUMERIC(10, 4) NOT NULL,
    reason TEXT, -- Ex: "Nota Fiscal 123", "Quebra", "Venda Pedido #50"
    user_name TEXT DEFAULT 'Sistema',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_inventory_tenant ON inventory_items(tenant_id);
CREATE INDEX idx_logs_tenant_date ON inventory_logs(tenant_id, created_at DESC);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
