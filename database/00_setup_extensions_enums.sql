
-- ==============================================================================
-- 00_SETUP_EXTENSIONS_ENUMS.SQL
-- Objetivo: Preparar o ambiente do PostgreSQL com extensões e tipos de dados.
-- ==============================================================================

-- Habilita a geração de UUIDs (Identificadores Únicos Universais)
-- Essencial para sistemas distribuídos e segurança (evita ID sequencial previsível).
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --- ENUMS (Tipos de Dados Personalizados) ---

-- Define os papéis de acesso dos usuários
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'WAITER', 'KITCHEN', 'CASHIER');

-- Status de uma mesa no salão
CREATE TYPE table_status AS ENUM ('AVAILABLE', 'OCCUPIED', 'WAITING_PAYMENT', 'CLOSED');

-- Status do ciclo de vida de um pedido
CREATE TYPE order_status AS ENUM ('PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED');

-- Tipos de item de estoque para lógica de baixa
CREATE TYPE inventory_type AS ENUM ('INGREDIENT', 'RESALE', 'COMPOSITE');
-- INGREDIENT: Matéria prima (ex: Farinha) - Não vende direto.
-- RESALE: Revenda (ex: Coca-cola) - Vende e baixa 1:1.
-- COMPOSITE: Produzido (ex: Hamburguer) - Vende e baixa os ingredientes da receita.

-- Métodos de pagamento aceitos
CREATE TYPE payment_method AS ENUM ('CASH', 'CREDIT', 'DEBIT', 'PIX', 'MEAL_VOUCHER');

-- Planos do SaaS
CREATE TYPE saas_plan AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
