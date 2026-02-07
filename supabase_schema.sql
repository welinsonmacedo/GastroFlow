-- ⚠️ ATENÇÃO: RODE ESTE SCRIPT NO "SQL EDITOR" DO SUPABASE ⚠️
-- Este script configura o banco de dados e HABILITA O REALTIME automaticamente.

-- 1. LIMPEZA (Cuidado: Isso apaga dados existentes para recriar a estrutura correta)
DROP TABLE IF EXISTS service_calls CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS restaurant_tables CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS saas_admins CASCADE;
DROP TABLE IF EXISTS plans CASCADE;

-- 2. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. TABELAS

-- Plans (Planos do Sistema)
CREATE TABLE plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL, -- 'FREE', 'PRO', 'ENTERPRISE'
    name TEXT NOT NULL,
    price TEXT NOT NULL,
    period TEXT DEFAULT '/mês',
    features JSONB DEFAULT '[]'::jsonb, -- Texto para exibir na Landing Page
    limits JSONB DEFAULT '{}'::jsonb,   -- Configurações reais (max_tables, max_products, modules...)
    is_popular BOOLEAN DEFAULT FALSE,
    button_text TEXT DEFAULT 'Assinar Agora',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tenants (Restaurantes)
CREATE TABLE tenants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    owner_name TEXT,
    email TEXT,
    owner_auth_id UUID, -- Vinculo com auth.users do dono
    plan TEXT DEFAULT 'FREE', -- 'FREE', 'PRO', 'ENTERPRISE'
    status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'INACTIVE'
    theme_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- SaaS Admins (Super Admins do Sistema)
CREATE TABLE saas_admins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Legacy/Demo only
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Staff (Funcionários)
CREATE TABLE staff (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    auth_user_id UUID, -- Vinculo com auth.users para login via Supabase
    name TEXT NOT NULL,
    email TEXT, -- Email para login/convite
    role TEXT NOT NULL, -- 'ADMIN', 'WAITER', 'KITCHEN', 'CASHIER'
    pin TEXT NOT NULL,
    allowed_routes JSONB DEFAULT '[]'::jsonb, -- Permissões granulares
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Products (Produtos)
CREATE TABLE products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    category TEXT NOT NULL,
    type TEXT NOT NULL, -- 'KITCHEN', 'BAR'
    image TEXT,
    is_visible BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tables (Mesas)
CREATE TABLE restaurant_tables (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    number INTEGER NOT NULL,
    status TEXT DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'OCCUPIED', 'WAITING_PAYMENT'
    customer_name TEXT,
    access_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Service Calls (Chamados de Garçom)
CREATE TABLE service_calls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    table_id UUID REFERENCES restaurant_tables(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'RESOLVED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Orders (Pedidos - Cabeçalho)
CREATE TABLE orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    table_id UUID REFERENCES restaurant_tables(id) ON DELETE CASCADE NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'PENDING',
    total_amount NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Order Items (Itens do Pedido)
CREATE TABLE order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL, -- Redundante mas útil para Filtros Realtime
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    product_price NUMERIC(10,2) NOT NULL,
    product_type TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Transactions (Histórico Financeiro)
CREATE TABLE transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
    table_number INTEGER,
    amount NUMERIC(10,2) NOT NULL,
    method TEXT NOT NULL, -- 'CASH', 'CARD', 'PIX'
    items_summary TEXT,
    cashier_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Audit Logs (Auditoria)
CREATE TABLE audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    user_name TEXT,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. HABILITAR REALTIME (A PARTE MAIS IMPORTANTE)
-- Estes comandos dizem ao Supabase para enviar eventos para o App quando houver mudanças.

-- Remove publicações anteriores para evitar duplicidade
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;

ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE service_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE plans;
ALTER PUBLICATION supabase_realtime ADD TABLE tenants; -- Para atualizar temas/configurações

-- 5. POLÍTICAS DE SEGURANÇA (RLS)
-- Habilita RLS em todas as tabelas
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_calls ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso (Simplificadas para este MVP)
CREATE POLICY "Public Access" ON plans FOR ALL USING (true);
CREATE POLICY "Public Access" ON tenants FOR ALL USING (true);
CREATE POLICY "Public Access" ON saas_admins FOR ALL USING (true);
CREATE POLICY "Public Access" ON staff FOR ALL USING (true);
CREATE POLICY "Public Access" ON products FOR ALL USING (true);
CREATE POLICY "Public Access" ON restaurant_tables FOR ALL USING (true);
CREATE POLICY "Public Access" ON orders FOR ALL USING (true);
CREATE POLICY "Public Access" ON order_items FOR ALL USING (true);
CREATE POLICY "Public Access" ON transactions FOR ALL USING (true);
CREATE POLICY "Public Access" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Public Access" ON service_calls FOR ALL USING (true);

-- 6. DADOS INICIAIS (CONFIGURAÇÃO DO SISTEMA)
-- Apenas dados essenciais para o sistema funcionar (Planos e Super Admin padrão)

-- Seed SaaS Admin (Dono do SaaS)
INSERT INTO saas_admins (name, email, password) VALUES ('Super Admin', 'admin@gastroflow.com', 'admin');

-- Seed Plans (Planos disponíveis)
-- Agora com a coluna LIMITS populada
INSERT INTO plans (key, name, price, features, limits, is_popular, button_text) VALUES 
('FREE', 'Starter', 'Grátis', 
 '["Até 5 mesas", "Cardápio Digital QR", "1 Usuário Admin", "Suporte por Email"]'::jsonb, 
 '{"maxTables": 5, "maxProducts": 20, "maxStaff": 1, "allowKds": false, "allowCashier": false}'::jsonb,
 FALSE, 'Começar Agora'),

('PRO', 'Profissional', 'R$ 99', 
 '["Mesas Ilimitadas", "KDS (Tela Cozinha)", "Relatórios Financeiros", "5 Usuários", "Suporte Prioritário"]'::jsonb, 
 '{"maxTables": -1, "maxProducts": -1, "maxStaff": 5, "allowKds": true, "allowCashier": true}'::jsonb,
 TRUE, 'Assinar Pro'),

('ENTERPRISE', 'Enterprise', 'Sob Consulta', 
 '["Múltiplas Filiais", "API de Integração", "Gerente de Contas", "Usuários Ilimitados", "Treinamento Equipe"]'::jsonb, 
 '{"maxTables": -1, "maxProducts": -1, "maxStaff": -1, "allowKds": true, "allowCashier": true}'::jsonb,
 FALSE, 'Falar com Consultor');
