# Arquitetura e Módulos do Sistema SaaS ERP para Restaurantes

Este documento descreve a arquitetura atual do sistema, detalhando cada módulo, suas responsabilidades, funções principais e como eles se comunicam entre si utilizando React Context API e Supabase.

## Visão Geral da Arquitetura

O sistema é um ERP Multi-Tenant (SaaS) voltado para restaurantes. Ele utiliza:
- **Frontend:** React + TypeScript + Tailwind CSS.
- **Gerenciamento de Estado:** React Context API (um contexto por módulo).
- **Backend/BaaS:** Supabase (PostgreSQL, Auth, Storage, Realtime).
- **Isolamento de Tenants:** Feito através do `tenant_slug` na URL e RLS (Row Level Security) no banco de dados.

A estrutura de pastas principal baseia-se em:
- `/src/context/`: Contém toda a lógica de negócios e estado global de cada módulo.
- `/src/pages/`: Contém as telas (UI) que consomem os contextos.
- `/src/components/`: Componentes visuais reutilizáveis.
- `/src/lib/`: Configurações de infraestrutura (ex: cliente Supabase).
- `/src/utils/`: Funções utilitárias (formatação, impressão, etc).

---

## Módulos do Sistema

### 1. Auth & RBAC (`AuthProvider.tsx`)
**Responsabilidade:** Gerenciar a autenticação de usuários, controle de sessão e permissões baseadas em funções (Role-Based Access Control).
- **Funções Principais:**
  - `login`, `logout`: Autenticação via Supabase Auth.
  - `checkPermission`: Verifica se o usuário logado possui a role necessária (ex: `ADMIN`, `WAITER`, `KITCHEN`, `CASHIER`).
- **Comunicação:** É consumido por quase todos os outros módulos e pelo `App.tsx` (através do `ProtectedRestaurantRoute`) para bloquear ou liberar o acesso às rotas e ações sensíveis.

### 2. SaaS / Super Admin (`SaaSContext.tsx`)
**Responsabilidade:** Gerenciar os restaurantes (tenants), planos de assinatura e faturamento do SaaS.
- **Funções Principais:**
  - `registerRestaurant`: Cria um novo tenant no sistema.
  - `updatePlan`: Altera os limites e módulos permitidos para um restaurante.
  - `uploadImage`: Faz upload de logos e assets do restaurante para o Supabase Storage.
- **Comunicação:** Define os limites (`planLimits`) que são lidos pelo `RestaurantContext` para habilitar ou desabilitar funcionalidades (ex: KDS, PDV, RH) para o restaurante atual.

### 3. Restaurant Admin (`RestaurantContext.tsx`)
**Responsabilidade:** Manter o estado global do restaurante atual (tenant) acessado via URL (`tenant_slug`), configurações da loja e mesas.
- **Funções Principais:**
  - `loadRestaurant`: Busca os dados do restaurante com base no slug da URL.
  - `updateSettings`: Atualiza configurações como taxa de serviço, horários e impressoras.
  - `authorize`: Libera o acesso de um cliente a uma mesa específica via QR Code.
- **Comunicação:** Fornece o `tenant_id` (id do restaurante) para **todos** os outros módulos. Nenhum outro módulo carrega dados sem antes saber qual é o restaurante atual.

### 4. Menu / Commerce (`MenuContext.tsx`)
**Responsabilidade:** Gerenciar categorias, produtos, adicionais e o cardápio digital.
- **Funções Principais:**
  - `loadMenu`: Carrega o cardápio ativo.
  - `createProduct`, `updateProduct`, `deleteProduct`: CRUD de itens do cardápio.
  - `toggleProductStatus`: Pausa ou ativa a venda de um produto.
- **Comunicação:** Fornece os produtos para o `OrderContext` (para criação de pedidos) e para o `InventoryContext` (para vincular fichas técnicas).

### 5. Orders & KDS (`OrderContext.tsx`)
**Responsabilidade:** Gerenciar o ciclo de vida dos pedidos (criação, preparo, entrega e pagamento) e a fila da cozinha (KDS).
- **Funções Principais:**
  - `createOrder`: Registra um novo pedido vinculado a uma mesa ou balcão.
  - `updateOrderStatus`: Move o pedido entre os status (`PENDING` -> `PREPARING` -> `READY` -> `DELIVERED`).
  - `Realtime Subscriptions`: Escuta mudanças no banco de dados via Supabase Realtime para atualizar a tela da cozinha (KDS) instantaneamente.
- **Comunicação:** 
  - Lê produtos do `MenuContext`.
  - Envia dados para o `FinanceContext` quando um pedido é pago.
  - Interage com o `InventoryContext` (via banco de dados/triggers) para dar baixa no estoque.

### 6. Finance / POS (`FinanceContext.tsx`)
**Responsabilidade:** Gerenciar o caixa (abertura/fechamento), pagamentos, gorjetas e relatórios financeiros.
- **Funções Principais:**
  - `openCashier`, `closeCashier`: Controle de turno do caixa.
  - `processPayment`: Registra o pagamento de um pedido ou mesa.
  - `getDailyReport`: Gera o relatório de vendas (Z-Report).
- **Comunicação:** Quando `processPayment` é concluído com sucesso, ele sinaliza o `OrderContext` para alterar o status dos pedidos para `PAID` e liberar a mesa no `RestaurantContext`.

### 7. Inventory (`InventoryContext.tsx`)
**Responsabilidade:** Controle de estoque, fichas técnicas (receitas), fornecedores e alertas de estoque baixo.
- **Funções Principais:**
  - `loadInventory`: Carrega os insumos e quantidades atuais.
  - `adjustStock`: Entrada ou saída manual de mercadorias.
  - `createRecipe`: Vincula ingredientes a um produto do cardápio.
- **Comunicação:** Escuta as vendas do `OrderContext` (geralmente via Triggers no Supabase) para deduzir automaticamente os ingredientes baseados na ficha técnica do produto vendido.

### 8. Staff / HR (`StaffContext.tsx`)
**Responsabilidade:** Gerenciar funcionários, controle de ponto (relógio de ponto) e comissões.
- **Funções Principais:**
  - `clockIn`, `clockOut`: Registra a entrada e saída dos funcionários.
  - `loadStaff`: Lista os funcionários do restaurante.
  - `calculateCommissions`: Calcula a comissão baseada nas vendas (garçons).
- **Comunicação:** Utiliza o `AuthProvider` para identificar qual funcionário está batendo o ponto.

---

## Fluxo de Comunicação (Exemplo Prático)

**Cenário: Cliente faz um pedido via QR Code e paga no Caixa.**

1. **Acesso:** Cliente escaneia o QR Code. O `RestaurantContext` valida o `tenant_slug` e a `table_id`.
2. **Cardápio:** O cliente vê os itens carregados pelo `MenuContext`.
3. **Pedido:** Cliente envia o pedido. O `OrderContext` salva no Supabase.
4. **Cozinha (KDS):** O Supabase Realtime avisa o `OrderContext` dos tablets da cozinha, que exibe o pedido imediatamente.
5. **Estoque:** Um Trigger no Supabase (ou lógica no backend) avisa o `InventoryContext` para deduzir os ingredientes usados no prato.
6. **Pagamento:** O cliente vai ao caixa. O operador usa o `FinanceContext` para processar o pagamento (`processPayment`).
7. **Encerramento:** O `FinanceContext` marca os pedidos como pagos, e o `RestaurantContext` libera a mesa para o próximo cliente.

---

## Monitoramento e Segurança (Edge Functions & RLS)

No Supabase, a segurança principal é feita via **RLS (Row Level Security)** diretamente no banco de dados, garantindo que um usuário só possa ler/escrever dados onde `tenant_id` seja igual ao restaurante dele.

Para integrações externas ou validações estritas de API, utilizamos **Edge Functions** (como a `require-auth`), que interceptam requisições, validam o JWT do usuário e garantem que a requisição é legítima antes de executar lógicas complexas.
