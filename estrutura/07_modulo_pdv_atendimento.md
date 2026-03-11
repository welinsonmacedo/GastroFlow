# Módulo de Vendas e Operações

Este módulo engloba todas as interfaces de operação diária do estabelecimento, focadas no atendimento ao cliente e produção.

## Estrutura e Interfaces

### 1. Frente de Caixa / PDV (`CommerceDashboard.tsx`)
- **Público:** Operadores de caixa e Gerentes.
- **Função:** Ponto de Venda principal.
- **Recursos:**
  - Abertura e fechamento de caixa.
  - Lançamento rápido de pedidos/vendas.
  - Recebimento de pagamentos (Dinheiro, Cartão, Pix).
  - Fechamento de contas.

### 2. Aplicativo de Atendimento (`WaiterApp.tsx`)
- **Público:** Equipe de atendimento.
- **Função:** Interface mobile para atendimento ao cliente.
- **Recursos:**
  - Mapa de mesas/locais (livres, ocupados, aguardando fechamento).
  - Lançamento de itens na comanda.
  - Adição de observações.
  - Envio direto do pedido para as impressoras/telas de produção.

### 3. Display de Produção / KDS (`KitchenDisplay.tsx`)
- **Público:** Equipe de produção.
- **Função:** Substitui a impressora de papel por telas de produção.
- **Recursos:**
  - Fila de pedidos em tempo real.
  - Separação por praças/setores.
  - Cronômetro de tempo de preparo.
  - Mudança de status (Em preparo -> Pronto).

### 4. Autoatendimento / App do Cliente (`ClientApp.tsx`, `ClientHome.tsx`)
- **Público:** Clientes do estabelecimento.
- **Função:** Cardápio/Catálogo digital interativo.
- **Recursos:**
  - Acesso via QR Code ou link.
  - Visualização dos produtos com fotos e descrições.
  - Realização do pedido diretamente pelo celular do cliente.
  - Acompanhamento do status do pedido e solicitação da conta.
