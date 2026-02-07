-- ⚠️ ATENÇÃO: RODE ESTE SCRIPT NO "SQL EDITOR" DO SUPABASE ⚠️

-- 1. LIMPEZA (Cuidado: Isso apaga dados existentes para recriar a estrutura correta)
DROP TABLE IF EXISTS service_calls CASCADE; -- Nova tabela
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
    features JSONB DEFAULT '[]'::jsonb,
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

-- Service Calls (Chamados de Garçom) -- NOVA TABELA
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
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL, -- Redundante mas útil para RLS e Filtros Realtime
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

-- 4. CONFIGURAÇÃO DE REALTIME E RLS

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE plans;
ALTER PUBLICATION supabase_realtime ADD TABLE service_calls; -- Add Realtime

-- Habilitar RLS (Row Level Security) em todas as tabelas
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

-- Criar Políticas Permissivas (Public Access) para evitar erro 403
-- Em produção, estas políticas devem ser restritas. Para este MVP, liberamos o acesso.

CREATE POLICY "Public Access Plans" ON plans FOR ALL USING (true);
CREATE POLICY "Public Access Tenants" ON tenants FOR ALL USING (true);
CREATE POLICY "Public Access SaaS Admins" ON saas_admins FOR ALL USING (true);
CREATE POLICY "Public Access Staff" ON staff FOR ALL USING (true);
CREATE POLICY "Public Access Products" ON products FOR ALL USING (true);
CREATE POLICY "Public Access Tables" ON restaurant_tables FOR ALL USING (true);
CREATE POLICY "Public Access Orders" ON orders FOR ALL USING (true);
CREATE POLICY "Public Access Order Items" ON order_items FOR ALL USING (true);
CREATE POLICY "Public Access Transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Public Access Audit Logs" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Public Access Service Calls" ON service_calls FOR ALL USING (true);

-- 5. SEED DATA (Dados Iniciais)

DO $$
DECLARE
    t_id_bistro UUID;
    t_id_burger UUID;
    t_id_pizza UUID;
BEGIN
    -- Seed SaaS Admin (CEO)
    INSERT INTO saas_admins (name, email, password) VALUES ('CEO GastroFlow', 'admin@gastroflow.com', 'admin');

    -- Seed Plans
    INSERT INTO plans (key, name, price, features, is_popular, button_text) VALUES 
    ('FREE', 'Starter', 'Grátis', '["Até 5 mesas", "Cardápio Digital QR", "1 Usuário Admin", "Suporte por Email"]'::jsonb, FALSE, 'Começar Agora'),
    ('PRO', 'Profissional', 'R$ 99', '["Mesas Ilimitadas", "KDS (Tela Cozinha)", "Relatórios Financeiros", "5 Usuários", "Suporte Prioritário"]'::jsonb, TRUE, 'Assinar Pro'),
    ('ENTERPRISE', 'Enterprise', 'Sob Consulta', '["Múltiplas Filiais", "API de Integração", "Gerente de Contas", "Usuários Ilimitados", "Treinamento Equipe"]'::jsonb, FALSE, 'Falar com Consultor');

    -- --- RESTAURANTE 1: BISTRÔ DO CHEF ---
    INSERT INTO tenants (slug, name, email, theme_config, plan) 
    VALUES ('bistro', 'Bistrô do Chef', 'bistro@demo.com', '{"primaryColor": "#ea580c", "backgroundColor": "#fff7ed", "fontColor": "#1c1917", "restaurantName": "Bistrô do Chef", "logoUrl": "https://cdn-icons-png.flaticon.com/512/1996/1996068.png"}', 'PRO')
    RETURNING id INTO t_id_bistro;

    -- Staff Bistrô
    INSERT INTO staff (tenant_id, name, email, role, pin) VALUES 
    (t_id_bistro, 'Admin', 'admin@bistro.com', 'ADMIN', '1234'),
    (t_id_bistro, 'Garçom Carlos', 'carlos@bistro.com', 'WAITER', '0000'),
    (t_id_bistro, 'Chef Jacquin', 'jacquin@bistro.com', 'KITCHEN', '1111'),
    (t_id_bistro, 'Ana Caixa', 'ana@bistro.com', 'CASHIER', '2222');

    -- Produtos Bistrô
    INSERT INTO products (tenant_id, name, description, price, category, type, image, sort_order) VALUES
    (t_id_bistro, 'Filet Mignon', 'Ao molho madeira com purê rústico.', 65.00, 'Pratos Principais', 'KITCHEN', 'https://images.unsplash.com/photo-1558030006-45067198d286?auto=format&fit=crop&w=500&q=60', 1),
    (t_id_bistro, 'Salmão Grelhado', 'Com legumes sauté.', 58.00, 'Pratos Principais', 'KITCHEN', 'https://images.unsplash.com/photo-1467003909585-2f8a7270028d?auto=format&fit=crop&w=500&q=60', 2),
    (t_id_bistro, 'Vinho Tinto', 'Cabernet Sauvignon (Taça).', 25.00, 'Bebidas', 'BAR', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=500&q=60', 3),
    (t_id_bistro, 'Petit Gateau', 'Com sorvete de baunilha.', 22.00, 'Sobremesas', 'KITCHEN', 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?auto=format&fit=crop&w=500&q=60', 4);

    -- Mesas Bistrô (10 mesas)
    INSERT INTO restaurant_tables (tenant_id, number) 
    SELECT t_id_bistro, i FROM generate_series(1, 10) AS i;


    -- --- RESTAURANTE 2: BURGER KINGO ---
    INSERT INTO tenants (slug, name, email, theme_config, plan) 
    VALUES ('burger', 'Burger Kingo', 'burger@demo.com', '{"primaryColor": "#dc2626", "backgroundColor": "#fef2f2", "fontColor": "#1f2937", "restaurantName": "Burger Kingo", "logoUrl": "https://cdn-icons-png.flaticon.com/512/3075/3075977.png"}', 'ENTERPRISE')
    RETURNING id INTO t_id_burger;

    -- Staff Burger
    INSERT INTO staff (tenant_id, name, email, role, pin) VALUES 
    (t_id_burger, 'Gerente', 'gerente@burger.com', 'ADMIN', '1234'),
    (t_id_burger, 'Atendente', NULL, 'WAITER', '0000'),
    (t_id_burger, 'Chapeiro', NULL, 'KITCHEN', '1111');

    -- Produtos Burger
    INSERT INTO products (tenant_id, name, description, price, category, type, image, sort_order) VALUES
    (t_id_burger, 'X-Bacon', 'Hambúrguer artesanal, muito bacon e cheddar.', 28.00, 'Lanches', 'KITCHEN', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=60', 1),
    (t_id_burger, 'Batata Frita', 'Crocante com sal.', 12.00, 'Acompanhamentos', 'KITCHEN', 'https://images.unsplash.com/photo-1630384060421-a431e4fb2a28?auto=format&fit=crop&w=500&q=60', 2),
    (t_id_burger, 'Milkshake Morango', 'Cremoso e gelado.', 18.00, 'Bebidas', 'BAR', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=500&q=60', 3);

    -- Mesas Burger (20 mesas)
    INSERT INTO restaurant_tables (tenant_id, number) 
    SELECT t_id_burger, i FROM generate_series(1, 20) AS i;
    
    
    -- --- RESTAURANTE 3: PIZZARIA EXPRESS ---
    INSERT INTO tenants (slug, name, email, theme_config, plan) 
    VALUES ('pizza', 'Pizzaria Express', 'pizza@demo.com', '{"primaryColor": "#16a34a", "backgroundColor": "#f0fdf4", "fontColor": "#1f2937", "restaurantName": "Pizzaria Express", "logoUrl": "https://cdn-icons-png.flaticon.com/512/3132/3132693.png"}', 'FREE')
    RETURNING id INTO t_id_pizza;
    
    INSERT INTO staff (tenant_id, name, role, pin) VALUES (t_id_pizza, 'Dono', 'ADMIN', '1234');
    
    INSERT INTO products (tenant_id, name, description, price, category, type, image, sort_order) VALUES
    (t_id_pizza, 'Pizza Calabresa', 'Molho, mussarela e calabresa.', 45.00, 'Pizzas', 'KITCHEN', 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=500&q=60', 1);
    
    INSERT INTO restaurant_tables (tenant_id, number) SELECT t_id_pizza, i FROM generate_series(1, 15) AS i;

END $$;