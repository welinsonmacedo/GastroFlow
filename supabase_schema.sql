-- ATENÇÃO: Rode este script no "SQL Editor" do seu painel Supabase

-- 1. Habilitar UUIDs
create extension if not exists "uuid-ossp";

-- 2. Tabela de Tenants (Restaurantes)
create table tenants (
  id uuid default uuid_generate_v4() primary key,
  slug text unique not null,
  name text not null,
  owner_name text,
  email text,
  plan text default 'FREE', -- 'FREE', 'PRO', 'ENTERPRISE'
  status text default 'ACTIVE', -- 'ACTIVE', 'INACTIVE'
  theme_config jsonb default '{}'::jsonb, -- Armazena cores, logo, etc
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Tabela de Funcionários (Staff)
create table staff (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references tenants(id) on delete cascade not null,
  name text not null,
  role text not null, -- 'ADMIN', 'WAITER', 'KITCHEN', 'CASHIER'
  pin text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Tabela de Produtos
create table products (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references tenants(id) on delete cascade not null,
  name text not null,
  description text,
  price numeric(10,2) not null,
  category text not null,
  type text not null, -- 'KITCHEN', 'BAR'
  image text,
  is_visible boolean default true,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Tabela de Mesas
create table restaurant_tables (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references tenants(id) on delete cascade not null,
  number integer not null,
  status text default 'AVAILABLE', -- 'AVAILABLE', 'OCCUPIED', 'WAITING_PAYMENT'
  customer_name text,
  access_code text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. Tabela de Pedidos (Orders)
create table orders (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references tenants(id) on delete cascade not null,
  table_id uuid references restaurant_tables(id) on delete cascade not null,
  is_paid boolean default false,
  status text default 'PENDING',
  total_amount numeric(10,2) default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 7. Tabela de Itens do Pedido (Order Items)
create table order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references orders(id) on delete cascade not null,
  product_id uuid references products(id) on delete set null,
  product_name text not null, -- Snapshot do nome caso produto seja deletado
  product_price numeric(10,2) not null, -- Snapshot do preço
  product_type text not null,
  quantity integer default 1,
  notes text,
  status text default 'PENDING', -- 'PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 8. Tabela de Transações (Histórico de Vendas)
create table transactions (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references tenants(id) on delete cascade not null,
  table_id uuid references restaurant_tables(id) on delete set null,
  table_number integer,
  amount numeric(10,2) not null,
  method text not null, -- 'CASH', 'CARD', 'PIX'
  items_summary text,
  cashier_name text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- DADOS DE EXEMPLO (SEED)
-- Cria restaurante 'bistro'
INSERT INTO tenants (slug, name, theme_config) 
VALUES ('bistro', 'Bistrô do Chef', '{"primaryColor": "#ea580c", "backgroundColor": "#fff7ed", "fontColor": "#1c1917", "restaurantName": "Bistrô do Chef"}');

-- Pegar ID do tenant criado para inserir o resto (exemplo genérico, na prática o UUID muda)
DO $$
DECLARE
    t_id uuid;
BEGIN
    SELECT id INTO t_id FROM tenants WHERE slug = 'bistro' LIMIT 1;

    -- Funcionários
    INSERT INTO staff (tenant_id, name, role, pin) VALUES 
    (t_id, 'Admin', 'ADMIN', '1234'),
    (t_id, 'Garçom João', 'WAITER', '0000'),
    (t_id, 'Cozinha Maria', 'KITCHEN', '1111'),
    (t_id, 'Caixa Ana', 'CASHIER', '2222');

    -- Produtos
    INSERT INTO products (tenant_id, name, description, price, category, type, image) VALUES
    (t_id, 'Filet Mignon', 'Ao molho madeira.', 65.00, 'Pratos Principais', 'KITCHEN', 'https://picsum.photos/200/200?random=1'),
    (t_id, 'Vinho Tinto', 'Cabernet Sauvignon.', 80.00, 'Bebidas', 'BAR', 'https://picsum.photos/200/200?random=2');

    -- Mesas (10 mesas)
    INSERT INTO restaurant_tables (tenant_id, number) 
    SELECT t_id, i FROM generate_series(1, 10) AS i;

END $$;
