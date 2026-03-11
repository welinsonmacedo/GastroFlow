# Módulo Financeiro

O Módulo Financeiro controla o fluxo de caixa, contas a pagar, contas a receber e a saúde financeira geral do estabelecimento.

## Estrutura (`src/pages/admin/AdminFinance.tsx`, `AdminAccounting.tsx`)

## Principais Funcionalidades

### Fluxo de Caixa (`FinanceDashboard.tsx`)
- **Função:** Visão diária e mensal das finanças.
- **Recursos:** Entradas (vendas), Saídas (despesas, compras de estoque, folha de pagamento) e Saldo atual.

### Contas a Pagar e Despesas (`expenses`)
- **Função:** Gestão de obrigações financeiras.
- **Recursos:**
  - Cadastro de despesas fixas (Aluguel, Energia) e variáveis.
  - Integração com o módulo de Estoque (compras geram contas a pagar).
  - Integração com o módulo de RH (folha de pagamento gera contas a pagar).
  - Controle de vencimentos e status de pagamento.

### Contabilidade e DRE (`AdminAccounting.tsx`, `AccountingReport.tsx`)
- **Função:** Visão contábil e gerencial.
- **Recursos:**
  - Demonstração do Resultado do Exercício (DRE) simplificada.
  - Cálculo de Lucro Bruto e Lucro Líquido.
  - Análise de custos fixos vs. variáveis.

### Gestão de Comissões e Gorjetas (`AdminFinancialTips.tsx`)
- **Função:** Controle do rateio de taxas de serviço ou comissões.
- **Recursos:** Cálculo do valor arrecadado no PDV e distribuição entre a equipe conforme as regras do estabelecimento.
