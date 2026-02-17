
# Flux Eat - Documentação do Sistema

## 1. Visão Geral
O **Flux Eat** é uma plataforma SaaS (Software as a Service) "White-label" para gestão completa de restaurantes. O sistema foi re-arquitetado para operar em **Módulos Independentes**, permitindo que diferentes perfis de funcionários acessem apenas as ferramentas relevantes para suas funções, mantendo a operação organizada e segura.

### Tecnologias Principais
- **Frontend:** React 18, Tailwind CSS, Lucide Icons.
- **Backend/Database:** Supabase (PostgreSQL).
- **Realtime:** Supabase Realtime (Websockets) para sincronização instantânea entre Garçom, Cozinha e Caixa.
- **Autenticação:** Supabase Auth + Sistema de PIN para funcionários.
- **IA:** Integração com Google Gemini (para geração automática de descrições de produtos).

---

## 2. Estrutura de Navegação Modular
Ao fazer login, o usuário é direcionado para o **Seletor de Módulos** (`/modules`). A partir dali, o sistema se divide em 4 ambientes distintos, cada um com seu próprio layout e propósito.

### A. Módulo Restaurante (Operacional)
**Rota:** `/restaurant/*`
**Cor do Tema:** Azul Royal
**Público:** Garçons, Cozinheiros, Operadores de Caixa.
**Foco:** Velocidade e Tempo Real.
- **Salão & Mesas (Waiter):** Mapa de mesas, lançamento de pedidos, status dos pratos.
- **KDS (Kitchen):** Tela de produção para a cozinha, substituindo impressoras.
- **Frente de Caixa (POS):** Abertura/Fechamento de turno, vendas balcão, gestão de delivery e recebimento de pagamentos.

### B. Módulo Gestor (Backoffice)
**Rota:** `/admin/*`
**Cor do Tema:** Roxo
**Público:** Gerentes, Estoquistas.
**Foco:** Cadastros e Controle de Insumos.
- **Visão Geral:** Dashboard operacional (Vendas hoje, Pedidos abertos).
- **Cardápio:** Cadastro de produtos de venda e preços.
- **Estoque:** Gestão de matérias-primas, compras (NF), fornecedores e fichas técnicas.
- **Mesas:** Configuração do layout do salão e geração de QR Codes.

### C. Módulo Financeiro (Controladoria)
**Rota:** `/finance/*`
**Cor do Tema:** Verde Esmeralda
**Público:** Sócios, Financeiro, Contabilidade.
**Foco:** Dinheiro, Lucro e Auditoria.
- **Fluxo de Caixa:** Histórico de sessões de caixa (fechamentos), conferência de valores.
- **Contas a Pagar:** Gestão de despesas, boletos e custos fixos.
- **DRE Gerencial:** Relatório contábil completo (Regime de Caixa ou Competência).
- **Business Intelligence (BI):** Gráficos de evolução, Curva ABC, Ticket Médio e metas.

### D. Módulo Configurações (Sistema)
**Rota:** `/settings/*`
**Cor do Tema:** Cinza/Slate
**Público:** Administradores do Sistema (Donos).
**Foco:** Dados da Empresa e Segurança.
- **Geral:** Dados fiscais (CNPJ), endereço, regras de negócio (taxa de serviço, tempo de carência).
- **Aparência:** Personalização White-label (Logo, Cores, Banner do App do Cliente).
- **Equipe:** Gestão de usuários, cargos e senhas de acesso.

---

## 3. App do Cliente (Cardápio Digital)
Interface pública acessada pelo cliente final via QR Code. Não exige login, apenas autenticação via código da mesa.
- **Rota:** `/client/table/:tableId`
- **Funcionalidades:**
    - Visualização de produtos.
    - Carrinho de compras.
    - Status do pedido em tempo real.
    - Botões de serviço: "Chamar Garçom" e "Pedir a Conta".

---

## 4. Banco de Dados e Segurança

### Multi-tenant (SaaS)
O sistema utiliza **Row Level Security (RLS)** no PostgreSQL. Cada registro no banco possui uma coluna `tenant_id`. As políticas de segurança garantem que um restaurante jamais acesse dados de outro.

### Tabelas Principais
- `tenants`: Clientes SaaS (Restaurantes) e suas configurações globais.
- `staff`: Usuários do sistema e suas permissões (`allowed_routes`).
- `products`: Itens do cardápio (Venda).
- `inventory_items`: Itens do estoque (Insumos/Revenda/Pratos).
- `orders` / `order_items`: Pedidos transacionais.
- `transactions`: Entradas financeiras (Vendas confirmadas).
- `expenses`: Saídas financeiras (Despesas).
- `cash_sessions`: Controle de turnos de caixa.

---

## 5. Regras de Negócio Críticas

1.  **Baixa de Estoque Automática:**
    - Trigger `deduct_inventory_on_order`.
    - Venda de produto com ficha técnica baixa os ingredientes proporcionalmente.
    - Venda de produto de revenda baixa o item diretamente.

2.  **Controle de Caixa:**
    - Vendas no POS exigem uma `cash_session` com status `OPEN`.
    - O fechamento do caixa consolida os valores em dinheiro, mas não afeta o histórico de transações digitais (que vão direto para o DRE).

3.  **Integração Financeira:**
    - Toda venda finalizada (`COMPLETED`) gera uma linha na tabela `transactions`.
    - O DRE cruza `transactions` (Receita) com `expenses` (Despesa) e `order_items` (Custo/CMV) para gerar o lucro líquido.

4.  **Permissões:**
    - O acesso aos módulos é controlado tanto pelo **Plano SaaS** (`PlanLimits`) quanto pelo **Cargo do Usuário** (`Role`).
    - Ex: Um usuário com cargo `WAITER` não consegue acessar o módulo `FINANCE`, mesmo que o plano do restaurante permita.
