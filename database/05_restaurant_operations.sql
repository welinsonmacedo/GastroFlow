
-- ==============================================================================
-- 05_RESTAURANT_OPERATIONS.SQL
-- Objetivo: Gerenciar o salão, mesas e interações em tempo real.
-- ==============================================================================

CREATE TABLE restaurant_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    number INTEGER NOT NULL,
    status table_status DEFAULT 'AVAILABLE',
    
    -- Dados da sessão atual da mesa
    customer_name TEXT,
    access_code TEXT, -- Código de 4 dígitos para o cliente acessar o cardápio
    active_order_id UUID, -- Link rápido para o pedido aberto
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chamados de Serviço (Ex: "Chamar Garçom" pelo app do cliente)
CREATE TABLE service_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
    
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tables_tenant ON restaurant_tables(tenant_id);
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_calls ENABLE ROW LEVEL SECURITY;
