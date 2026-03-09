# Documentação do Sistema: Módulos e Arquitetura

Este documento descreve a arquitetura completa do sistema de gestão para restaurantes, detalhando cada módulo, suas funções principais e como eles se comunicam entre si.

## Visão Geral da Arquitetura

O sistema é uma plataforma **SaaS (Software as a Service) multi-tenant**. Isso significa que uma única instância do sistema atende a múltiplos restaurantes (tenants), mantendo os dados de cada um isolados de forma segura. 

A aplicação é construída em **React** no frontend e utiliza **Supabase** (PostgreSQL + Auth + Realtime) no backend. O estado global é gerenciado através de múltiplos `Contexts` (React Context API), onde cada contexto representa o núcleo lógico de um módulo.

---

## 1. Módulo SaaS (Super Admin)
Responsável por gerenciar a plataforma como um todo, controlando os restaurantes clientes, planos de assinatura e limites de uso.

*   **Arquivos Principais**: `SaaSContext.tsx`, `SuperAdminDashboard.tsx`, `SaaSLogin.tsx`, `RegisterRestaurant.tsx`.
*   **Funções Principais**:
    *   `login()`: Autentica o dono da plataforma (Super Admin).
    *   `registerTenant()`: Cria um novo ambiente isolado para um novo restaurante cliente.
    *   `updatePlanLimits()`: Define quais módulos (ex: KDS, Estoque, RH) o restaurante tem direito de acessar com base na sua assinatura.
    *   `suspendTenant()`: Bloqueia o acesso de um restaurante por inadimplência.
*   **Comunicação**: É o módulo "Pai". Ele injeta o `tenantSlug` (identificador do restaurante) na URL. Sem a validação deste módulo, nenhum outro módulo do restaurante é carregado.

---

## 2. Módulo de Autenticação e Autorização (Auth)
Gerencia a identidade dos usuários e garante que cada um acesse apenas o que tem permissão (RBAC - Role Based Access Control).

*   **Arquivos Principais**: `AuthProvider.tsx`, `Login.tsx`, `ClientLogin.tsx`.
*   **Funções Principais**:
    *   `signIn(email, password)`: Autentica o usuário junto ao Supabase Auth.
    *   `signOut()`: Encerra a sessão local e remota.
    *   `checkPermission(allowedRoles)`: Função utilitária que verifica se o `currentUser` possui a role necessária (ex: `ADMIN`, `WAITER`, `CASHIER`, `KITCHEN`) para renderizar uma página ou componente.
*   **Comunicação**: Envolve quase todas as rotas do sistema através do componente `ProtectedRestaurantRoute`. Fornece o objeto `currentUser` para que módulos como Auditoria e Pedidos saibam "quem" está executando a ação.

---

## 3. Módulo de Gestão do Restaurante (Admin)
O painel de controle do dono ou gerente do restaurante. Onde as configurações globais do estabelecimento são definidas.

*   **Arquivos Principais**: `RestaurantContext.tsx`, `AdminDashboard.tsx`, `SettingsDashboard.tsx`.
*   **Funções Principais**:
    *   `updateRestaurantInfo()`: Altera dados cadastrais (nome, logo, endereço, horário de funcionamento).
    *   `manageTables()`: Criação, edição e exclusão de mesas, além da geração dos QR Codes para autoatendimento.
    *   `toggleModules()`: Permite ao gerente ativar ou desativar módulos internos (ex: ligar o módulo de RH) desde que o Módulo SaaS permita.
*   **Comunicação**: Fornece as configurações globais (ex: taxa de serviço, se aceita pedidos via QR code) para o Módulo de Pedidos (Commerce) e Módulo Financeiro.

---

## 4. Módulo de Cardápio e Pedidos (Commerce / Menu / Order)
O coração operacional do sistema. Gerencia o que é vendido e o fluxo de compra.

*   **Arquivos Principais**: `MenuContext.tsx`, `OrderContext.tsx`, `CommerceDashboard.tsx`, `ClientApp.tsx`, `WaiterApp.tsx`.
*   **Funções Principais**:
    *   `createCategory() / createProduct()`: Gestão do catálogo de produtos e seus complementos (adicionais).
    *   `placeOrder(items, tableId)`: Registra um novo pedido. Pode ser disparado pelo cliente (via QR Code) ou pelo garçom.
    *   `updateOrderStatus(orderId, status)`: Move o pedido pelo funil (`PENDING` -> `PREPARING` -> `READY` -> `DELIVERED`).
*   **Comunicação**: 
    *   Envia os dados em tempo real para o **Módulo de Cozinha (KDS)** quando um pedido é feito.
    *   Envia o total consumido para o **Módulo Financeiro** para fechamento de conta.
    *   (Opcional) Dispara gatilhos para o **Módulo de Estoque** para dar baixa nos ingredientes.

---

## 5. Módulo de Cozinha (KDS - Kitchen Display System)
Interface dedicada para a equipe de preparo (cozinha/bar).

*   **Arquivos Principais**: `KitchenDisplay.tsx`.
*   **Funções Principais**:
    *   `fetchActiveOrders()`: Escuta em tempo real (via Supabase Realtime) pedidos que entram com status `PENDING`.
    *   `markAsPreparing(orderId)`: O cozinheiro assume o pedido, mudando o status e notificando o salão.
    *   `markAsReady(orderId)`: O prato está pronto. Dispara um alerta visual para o garçom retirar.
*   **Comunicação**: Consome diretamente os dados do `OrderContext` e interage com o `UIContext` para emitir alertas sonoros/visuais de novos pedidos.

---

## 6. Módulo Financeiro e PDV (Finance / Cashier)
Responsável pelo recebimento, fluxo de caixa e saúde financeira do negócio.

*   **Arquivos Principais**: `FinanceContext.tsx`, `FinanceDashboard.tsx`, `CashierDashboard.tsx`.
*   **Funções Principais**:
    *   `processPayment(tableId, amount, method)`: Registra o pagamento (Dinheiro, Cartão, PIX) de uma mesa ou comanda.
    *   `closeTable(tableId)`: Após o pagamento total, encerra a sessão da mesa, liberando-a para novos clientes.
    *   `registerExpense()`: Registra contas a pagar (luz, água, fornecedores).
    *   `generateFinancialReport()`: Compila receitas e despesas para gerar o DRE (Demonstrativo do Resultado do Exercício).
*   **Comunicação**: Recebe ordens de pagamento do `OrderContext`. Envia dados de despesas de folha de pagamento gerados pelo `Módulo de RH`.

---

## 7. Módulo de Estoque (Inventory)
Controle físico de insumos e produtos acabados para evitar desperdícios e rupturas.

*   **Arquivos Principais**: `InventoryContext.tsx`, `InventoryDashboard.tsx`.
*   **Funções Principais**:
    *   `addItem(name, unit, minQuantity)`: Cadastra um novo insumo no almoxarifado.
    *   `registerTransaction(itemId, type, quantity)`: Registra uma entrada (compra) ou saída (uso, perda, validade).
    *   `checkLowStock()`: Varre o estoque e gera alertas para itens que atingiram a quantidade mínima.
*   **Comunicação**: Fornece o Custo da Mercadoria Vendida (CMV) para o **Módulo Financeiro**. Pode ser integrado ao **Módulo de Pedidos** para realizar a "baixa técnica" (descontar 200g de carne automaticamente ao vender um hambúrguer).

---

## 8. Módulo de Recursos Humanos (Staff / RH)
Gestão da equipe, controle de jornada e cálculo de folha.

*   **Arquivos Principais**: `StaffContext.tsx`, `StaffDashboard.tsx`, `TimeClock.tsx`, `payrollService.ts`.
*   **Funções Principais**:
    *   `registerEmployee()`: Cadastra os dados do funcionário, cargo e salário/hora.
    *   `clockIn(employeeId) / clockOut(employeeId)`: Bate o ponto eletrônico, registrando a hora exata de entrada e saída.
    *   `calculatePayroll(month)`: Usa o `payrollService` para somar as horas trabalhadas, calcular horas extras e gerar o valor a ser pago.
*   **Comunicação**: Interage com o **Módulo Auth** para criar as credenciais de login do funcionário. Envia o total da folha de pagamento para o **Módulo Financeiro** como uma despesa.

---

## 9. Módulo de Auditoria (Audit)
O "olho que tudo vê" do sistema. Focado em segurança e rastreabilidade.

*   **Arquivos Principais**: `AuditDashboard.tsx` (e gatilhos no banco de dados).
*   **Funções Principais**:
    *   `logAction(userId, action, details)`: Registra eventos críticos. Exemplo: cancelamento de itens, estorno de pagamentos, reabertura de mesas.
    *   `fetchLogs(filters)`: Permite ao administrador buscar o histórico de ações por usuário, data ou tipo de evento.
*   **Comunicação**: É um módulo passivo. Ele "escuta" as ações executadas nos módulos **Financeiro**, **Pedidos** e **Admin** e grava o histórico de forma imutável.

---

## Exemplo de Fluxo de Comunicação Completo (Jornada do Cliente)

1. **Acesso**: O cliente escaneia o QR Code da Mesa 05. O `Módulo Admin` valida o QR Code e o `Módulo Auth` cria uma sessão anônima para o cliente.
2. **Pedido**: O cliente visualiza o cardápio (`Módulo Menu`) e faz o pedido de um Hambúrguer (`Módulo Order`).
3. **Preparo**: O pedido surge imediatamente na tela da cozinha (`Módulo KDS`). O cozinheiro clica em "Preparando".
4. **Estoque (Opcional)**: O sistema detecta a venda do Hambúrguer e desconta pão e carne do `Módulo de Estoque`.
5. **Entrega**: O cozinheiro marca como "Pronto". O garçom recebe um alerta no celular, pega o prato e entrega na mesa.
6. **Pagamento**: O cliente vai ao caixa. O `Módulo Financeiro` puxa o total da Mesa 05 do `Módulo Order`, processa o pagamento via PIX e chama a função `closeTable()` do `Módulo Admin` para liberar a mesa.
7. **Registro**: Toda a transação financeira e o fechamento da mesa são gravados silenciosamente pelo `Módulo de Auditoria`.
