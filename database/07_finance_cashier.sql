
-- ==============================================================================
-- 07_FINANCE_CASHIER.SQL
-- Objetivo: Controle de fluxo de caixa (gaveta) e contas a pagar (DRE).
-- ==============================================================================

-- Despesas / Contas a Pagar
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- Fornecedor, Aluguel, Pessoal...
    amount NUMERIC(10, 2) NOT NULL,
    
    due_date DATE NOT NULL, -- Vencimento
    paid_date DATE, -- Data do Pagamento
    is_paid BOOLEAN DEFAULT false,
    
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    
    payment_method TEXT DEFAULT 'BANK', -- 'CASH' (Gaveta) ou 'BANK' (Conta)
    is_recurring BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessões de Caixa (Turnos)
CREATE TABLE cash_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    
    initial_amount NUMERIC(10, 2) NOT NULL, -- Fundo de troco
    final_amount NUMERIC(10, 2), -- Valor contado no fechamento
    
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    operator_name TEXT
);

-- Movimentações de Caixa (Sangrias e Suprimentos)
CREATE TABLE cash_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
    
    type TEXT CHECK (type IN ('BLEED', 'SUPPLY')), -- Sangria ou Suprimento
    amount NUMERIC(10, 2) NOT NULL,
    reason TEXT,
    user_name TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_expenses_tenant_date ON expenses(tenant_id, due_date);
CREATE INDEX idx_cash_sessions_tenant ON cash_sessions(tenant_id, status);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
