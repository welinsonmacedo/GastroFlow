# Documentação de Funcionalidades e Módulos do Sistema ArloFlux

Este documento descreve a arquitetura de módulos, abas, arquivos e funções principais do sistema, explicando o propósito de cada componente.

---

## 1. Portal de Seleção de Módulos
**Arquivo:** `src/pages/ModuleSelector.tsx`
**Descrição:** É a tela inicial após o login, onde o usuário escolhe qual módulo do sistema deseja acessar (dependendo das suas permissões e do plano contratado).
**Funcionalidades:**
- Validação de permissões baseada no cargo do usuário (`isModuleAllowed`).
- Redirecionamento para as rotas específicas de cada módulo (`handleSelect`).

---

## 2. Módulo Gestor (Backoffice Operacional)
**Arquivo Principal:** `src/pages/AdminDashboard.tsx` ou `src/pages/RestaurantDashboard.tsx`
**Descrição:** O coração da gestão do restaurante. Permite controlar o salão, cardápio, equipe e configurações básicas.

**Abas e Arquivos:**
- **Monitoramento (`AdminMonitoring.tsx`):** Visão em tempo real das mesas, pedidos em andamento e status da cozinha.
- **Cardápio (`AdminProducts.tsx`):** Cadastro de categorias, produtos, complementos (adicionais) e preços.
- **Aparência (`AdminMenuAppearance.tsx`):** Customização visual do cardápio digital (cores, logo, banners).
- **Equipe (`AdminStaff.tsx`):** Cadastro de usuários do sistema (garçons, caixas, gerentes) e definição de permissões de acesso.
- **Financeiro Rápido (`AdminFinance.tsx`):** Visão simplificada do caixa diário, despesas e receitas operacionais.
- **Relatórios (`AdminReports.tsx`):** Extração de dados de vendas, produtos mais vendidos e comissões.
- **Configurações (`AdminSettings.tsx`):** Configuração de taxas (serviço, entrega), impressoras, formas de pagamento e dados da loja.

---

## 3. Módulo de Estoque (Inventory)
**Arquivo Principal:** `src/pages/InventoryDashboard.tsx`
**Descrição:** Controle completo de insumos, compras e fichas técnicas.

**Abas e Arquivos:**
- **Visão Geral (`InventoryOverview.tsx`):** Dashboard com indicadores de estoque baixo, valor em estoque e movimentações recentes.
- **Insumos (`InventoryItemsView.tsx`):** Cadastro de matérias-primas e produtos de revenda, com definição de estoque mínimo e máximo.
- **Fornecedores (`InventorySuppliersView.tsx`):** Cadastro de fornecedores e histórico de compras.
- **Movimentações (`InventoryTransactionsView.tsx`):** Registro manual de entradas (compras), saídas (perdas/desperdícios) e balanços.
- **Produção & Fichas Técnicas (`InventoryProductionView.tsx`):** Criação de receitas (fichas técnicas) que dão baixa automática nos insumos quando um prato é vendido.
- **Sugestões de Compra (`AdminPurchaseSuggestions.tsx`):** Geração automática de listas de compras baseada no estoque mínimo e histórico de vendas.

---

## 4. Módulo de RH & Equipe (Human Resources)
**Arquivo Principal:** `src/pages/StaffDashboard.tsx`
**Descrição:** Gestão avançada de funcionários, ponto eletrônico e folha de pagamento.

**Abas e Arquivos:**
- **Colaboradores (`StaffList.tsx`):** Cadastro detalhado de funcionários, salários, cargos e dados pessoais.
- **Ponto e Presença (`StaffAttendance.tsx` e `DailyLogTab.tsx`):** Espelho de ponto, aprovação de horas extras e justificativas de faltas.
- **Escalas (`StaffSchedules.tsx`):** Criação de escalas de trabalho e turnos.
- **Folha de Pagamento (`StaffPayroll.tsx` e `SendToPayrollTab.tsx`):** Cálculo de salários, descontos, vales, comissões e geração de holerites/pré-folha.
- **Configurações de RH (`StaffSettings.tsx`):** Definição de regras de horas extras, feriados e políticas da empresa.

---

## 5. Módulo Financeiro (Finance & BI)
**Arquivo Principal:** `src/pages/FinanceDashboard.tsx`
**Descrição:** Gestão financeira avançada, contabilidade e inteligência de negócios.

**Abas e Arquivos:**
- **Contabilidade & DRE (`AdminAccounting.tsx`):** Fluxo de caixa detalhado, plano de contas, DRE (Demonstrativo de Resultados) e conciliação bancária.
- **Business Intelligence (`AdminBusinessIntelligence.tsx`):** Gráficos avançados, análise de lucratividade (CMV), ticket médio e tendências de vendas.
- **Gestão de Gorjetas (`AdminFinancialTips.tsx`):** Rateio de taxas de serviço e gorjetas entre a equipe.

---

## 6. Módulo Operacional (Frente de Loja)
**Descrição:** Interfaces utilizadas na operação diária do restaurante.

**Arquivos:**
- **App do Garçom (`WaiterApp.tsx`):** Interface mobile-first para garçons lançarem pedidos nas mesas e comandas, com suporte a observações e adicionais.
- **Frente de Caixa / PDV (`CashierDashboard.tsx` e `CommercePOS.tsx`):** Tela de fechamento de contas, aplicação de descontos, divisão de contas e emissão de cupons fiscais.
- **Cozinha / KDS (`KitchenDisplay.tsx`):** Tela de exibição de pedidos para a cozinha, com controle de tempo de preparo e status (Pendente, Preparando, Pronto).
- **Ponto Eletrônico (`TimeClock.tsx`):** Interface simples (tablet/totem) para os funcionários baterem o ponto usando PIN ou QR Code.

---

## 7. Módulo do Cliente (Client App)
**Arquivo Principal:** `src/pages/ClientApp.tsx`
**Descrição:** O aplicativo voltado para o consumidor final.
**Funcionalidades:**
- Cardápio digital via QR Code na mesa.
- Pedidos de Delivery e Retirada (Takeaway).
- Carrinho de compras, pagamento online e acompanhamento do status do pedido.

---

## 8. Módulo Super Admin (SaaS CEO)
**Arquivo Principal:** `src/pages/SuperAdminDashboard.tsx`
**Descrição:** Painel exclusivo para os donos do sistema (ArloFlux) gerenciarem os restaurantes assinantes.

**Abas e Arquivos:**
- **Clientes (`RESTAURANTS`):** Gestão de inquilinos (restaurantes cadastrados), bloqueio/desbloqueio e acesso "impersonate" (entrar como o cliente).
- **Contratos (`CONTRACTS`):** Geração de contratos de prestação de serviço em PDF.
- **Financeiro (`FINANCIAL`):** Faturamento do SaaS, MRR (Receita Recorrente Mensal) e inadimplência.
- **Planos (`PlanManager.tsx`):** Criação e edição de planos de assinatura e seus limites de uso.
- **Segurança (`AdminSecurity.tsx`):** Monitoramento de acessos suspeitos e bloqueios de IP.
- **Chamados (`AdminTickets.tsx`):** Resposta aos tickets de suporte abertos pelos clientes.
- **Configurações (`SETTINGS`):** Configurações globais da plataforma (gateways de pagamento do SaaS, e-mails, etc.).

---

## 9. Módulo de Suporte & Auditoria
**Arquivos:**
- **Manual e Ajuda (`ManualPage.tsx`):** Base de conhecimento, tutoriais e FAQ para os usuários do sistema.
- **Chamados do Cliente (`TicketsClient.tsx`):** Interface para o restaurante abrir tickets de suporte técnico e conversar com a equipe do ArloFlux.
- **Auditoria (`AuditDashboard.tsx`):** Registro imutável de todas as ações críticas realizadas no sistema (quem apagou um pedido, quem alterou um preço, etc.) para fins de segurança e compliance.

---

## Resumo do Fluxo de Dados (Contextos)
O sistema utiliza a Context API do React para gerenciar o estado global:
- `SaaSContext.tsx`: Gerencia os dados globais da plataforma e todos os inquilinos.
- `RestaurantContext.tsx`: Gerencia os dados específicos de um restaurante (cardápio, mesas, configurações).
- `OrderContext.tsx`: Gerencia o ciclo de vida dos pedidos (criação, preparo, pagamento).
- `InventoryContext.tsx`: Gerencia o estado do estoque e movimentações.
- `StaffContext.tsx`: Gerencia os dados de RH e ponto.
- `FinanceContext.tsx`: Gerencia as transações financeiras e DRE.
- `AuthProvider.tsx`: Gerencia a autenticação, login e permissões de usuários.
