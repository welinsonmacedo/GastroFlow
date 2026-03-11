# Módulo de Estoque e Compras

Responsável por garantir que o estabelecimento nunca fique sem insumos e que o custo das mercadorias vendidas (CMV) seja calculado corretamente.

## Estrutura (`src/pages/admin/inventory/` e `AdminInventory.tsx`)

## Principais Funcionalidades

### Gestão de Insumos (`AdminInventory.tsx`)
- **Função:** Cadastro de matérias-primas e produtos de revenda.
- **Recursos:** 
  - Definição de unidade de medida (Kg, L, Unidade).
  - Configuração de estoque mínimo e máximo.
  - Custo médio e último custo de compra.
  - Ficha técnica (vinculação de insumos aos produtos vendidos para baixa automática).

### Ordens de Compra (`AdminPurchaseOrders.tsx`)
- **Função:** Gerenciamento de pedidos aos fornecedores.
- **Recursos:**
  - Criação de pedidos manuais ou automáticos (baseados no estoque mínimo).
  - Controle de status (Pendente, Aprovado, Recebido, Cancelado).
  - Ao marcar como "Recebido", o sistema automaticamente alimenta o estoque e pode gerar uma despesa no módulo financeiro (`linked_expense_id`).

### Sugestões de Compra (`AdminPurchaseSuggestions.tsx`)
- **Função:** Inteligência de compras.
- **Recursos:** O sistema analisa o estoque atual vs. estoque mínimo e sugere uma lista de compras otimizada, que pode ser convertida em uma Ordem de Compra com um clique.

### Movimentações e Inventário
- **Função:** Ajustes manuais e contagem de estoque.
- **Recursos:** Registro de perdas, desperdícios, entrada manual de notas fiscais e balanço periódico.
