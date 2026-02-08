-- ⚠️ ATENÇÃO: RODE ESTE SCRIPT NO "SQL EDITOR" DO SUPABASE ⚠️
-- Este script MANTÉM os dados existentes e ADICIONA as novas estruturas de ERP.

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. NOVAS TABELAS (ERP MODULES)

-- Fornecedores
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL, -- Referência lógica, sem FK constraint rígida para evitar erros se tenants forem deletados manualmente
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Estoque (Ingredientes ou Produtos de Revenda)
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'UN', -- 'KG', 'LT', 'UN', 'CX'
    quantity NUMERIC(10,3) DEFAULT 0,
    min_quantity NUMERIC(10,3) DEFAULT 5, -- Estoque mínimo para alerta
    cost_price NUMERIC(10,2) DEFAULT 0, -- Preço de custo médio
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Histórico de Estoque (Entradas e Saídas)
CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'IN' (Entrada), 'OUT' (Saída/Perda), 'SALE' (Venda - Futuro)
    quantity NUMERIC(10,3) NOT NULL,
    reason TEXT,
    user_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Despesas (Contas a Pagar)
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    category TEXT DEFAULT 'Outros', -- 'Aluguel', 'Fornecedor', 'Manutenção', 'Pessoal'
    due_date DATE NOT NULL,
    paid_date DATE, -- Se null, está em aberto
    is_paid BOOLEAN DEFAULT FALSE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Adicionar coluna de custo aos produtos existentes (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='cost_price') THEN
        ALTER TABLE products ADD COLUMN cost_price NUMERIC(10,2) DEFAULT 0;
    END IF;
END $$;

-- Adicionar coluna de formato aos produtos (Simples, Composto, Ingrediente)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='format') THEN
        ALTER TABLE products ADD COLUMN format TEXT DEFAULT 'SIMPLE'; -- 'SIMPLE', 'COMPOSITE', 'INGREDIENT'
    END IF;
END $$;

-- Adicionar vínculo direto com item de estoque (Para produtos simples: 1 Coca Lata (Prod) = 1 Coca Lata (Estoque))
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='linked_inventory_item_id') THEN
        ALTER TABLE products ADD COLUMN linked_inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Tabela de Receita Técnica (Para produtos compostos: 1 Hamburguer = 0.2kg Carne + 1 Pão)
CREATE TABLE IF NOT EXISTS product_ingredients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity NUMERIC(10,3) NOT NULL, -- Quantidade necessária do ingrediente
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. ATUALIZAR REALTIME
-- Adiciona as novas tabelas à publicação realtime existente
ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE product_ingredients;

-- 4. POLÍTICAS DE SEGURANÇA (RLS)
-- Habilita RLS nas novas tabelas
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;

-- Cria políticas permissivas (igual ao restante do MVP)
DROP POLICY IF EXISTS "Public Access Suppliers" ON suppliers;
CREATE POLICY "Public Access Suppliers" ON suppliers FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access Inventory" ON inventory_items;
CREATE POLICY "Public Access Inventory" ON inventory_items FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access Inventory Logs" ON inventory_logs;
CREATE POLICY "Public Access Inventory Logs" ON inventory_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access Expenses" ON expenses;
CREATE POLICY "Public Access Expenses" ON expenses FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access Product Ingredients" ON product_ingredients;
CREATE POLICY "Public Access Product Ingredients" ON product_ingredients FOR ALL USING (true);
