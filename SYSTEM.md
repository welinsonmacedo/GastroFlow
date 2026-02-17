
# Flux Eat - Documentação do Sistema

## 1. Visão Geral
O **Flux Eat** é uma plataforma SaaS (Software as a Service) "White-label" para gestão completa de restaurantes. O sistema opera em tempo real, integrando o atendimento ao cliente (Cardápio Digital), operação de salão (Garçom), produção (Cozinha/KDS) e gestão administrativa (Backoffice/Financeiro).

### Tecnologias Principais
- **Frontend:** React 18, Tailwind CSS, Lucide Icons.
- **Backend/Database:** Supabase (PostgreSQL).
- **Realtime:** Supabase Realtime (Websockets) para sincronização instantânea entre Garçom, Cozinha e Caixa.
- **Autenticação:** Supabase Auth + Sistema de PIN para funcionários.
- **IA:** Integração com Google Gemini (para geração automática de descrições de produtos).

---

## 2. Estrutura Multi-tenant (SaaS)
O sistema foi desenhado para hospedar múltiplos restaurantes em uma única instância, garantindo isolamento e segurança.

- **Identificação:** Cada restaurante possui um `slug` único na URL (ex: `fluxeat.com/?restaurant=pizzaria-ze`).
- **Isolamento de Dados:** Utiliza **Row Level Security (RLS)** no PostgreSQL. Cada tabela possui uma coluna `tenant_id`, garantindo que um restaurante nunca acesse dados de outro.
- **Super Admin:** Painel exclusivo (`/dashboard`) para gestão de assinaturas, criação de restaurantes, planos (Free, Pro, Enterprise) e geração de contratos.

---

## 3. Modularidade e Planos
O sistema é **100% modular**. Cada funcionalidade principal é controlada por "flags" de permissão (`PlanLimits`) definidas no plano do restaurante. Isso permite vender planos escalonados (ex: Plano Básico sem Estoque, Plano Pro com tudo).

**Flags de Controle:**
*   `allowKds`: Ativa o módulo de Cozinha (Tela KDS).
*   `allowCashier`: Ativa a Frente de Caixa (PDV) e Delivery.
*   `allowInventory`: Ativa a Gestão de Estoque, Fichas Técnicas e Compras.
*   `allowExpenses`: Ativa o Financeiro (Contas a Pagar).
*   `allowReports`: Ativa relatórios avançados (DRE, BI, Curva ABC).
*   `allowStaff`: Permite gestão de usuários/equipe.
*   `allowTableMgmt`: Permite criar/editar mesas e gerar QR Codes.
*   `allowCustomization`: Permite alterar cores, logo e layout do cardápio.
*   **Limites Numéricos:** `maxTables`, `maxProducts`, `maxStaff`.

---

## 4. Módulos do Sistema

### A. App do Cliente (Cardápio Digital)
Interface pública acessada pelo cliente final via QR Code.
- **Acesso:** Validação via QR Code da mesa + PIN de segurança (opcional).
- **Funcionalidades:**
    - Visualização de produtos por categoria e busca.
    - Adição de itens ao carrinho com observações e adicionais.
    - Status do pedido em tempo real (Fila -> Preparando -> Pronto).
    - Botões de serviço: "Chamar Garçom" e "Pedir a Conta".
    - **Timer de Arrependimento:** Lógica de carência configurável (ex: 2 min) antes de enviar para cozinha.

### B. App do Garçom
Ferramenta móvel para os atendentes.
- **Acesso:** Controlado por permissão de usuário (`WAITER` ou `ADMIN`).
- **Mapa de Mesas:** Visualização gráfica do status (Livre, Ocupada, Chamando, Pagamento Pendente).
- **Notificações:** Alerta sonoro quando um cliente chama ou um prato fica pronto.
- **Operação:**
    - Abertura de mesas.
    - Lançamento de pedidos em nome da mesa.
    - Recebimento de pagamentos parciais ou totais (integrado ao Financeiro).

### C. KDS (Kitchen Display System)
Substitui impressoras na cozinha. **Depende de `allowKds`**.
- **Acesso:** Perfil `KITCHEN`.
- **Interface:** Quadro de pedidos tipo Kanban ou Lista.
- **Fluxo:** Pendente -> Preparando -> Pronto.
- **Alertas:** Cards mudam de cor se o tempo de preparo exceder o limite.
- **Wake Lock:** Mantém a tela do dispositivo sempre ligada.

### D. Frente de Caixa (POS) & Delivery
Hub financeiro operacional. **Depende de `allowCashier`**.
- **Controle de Turno:** Abertura (Fundo de Troco), Sangria e Fechamento de caixa.
- **Venda Balcão:** PDV rápido para clientes sem mesa (Takeaway).
- **Gestão de Mesas:** Visualização centralizada de todas as contas.
- **Módulo Delivery:**
    - Cadastro de pedidos (Telefone/WhatsApp/App).
    - Gestão de taxas de entrega e métodos (Frota própria, iFood, Retirada).
    - Monitor de entregas (Kanban).
- **Pagamentos:** Lançamento de recebimentos (Dinheiro, Pix, Cartão) que alimentam o DRE.

### E. Painel Administrativo (Gestão)
#### 1. Visão Geral
- Dashboard com KPIs vitais: Vendas do dia, Pedidos abertos, Alertas de estoque.

#### 2. Cardápio & Produtos
- Cadastro de produtos de venda.
- Configuração de Adicionais/Extras.
- Integração com IA para gerar descrições.

#### 3. Estoque (Inventário Avançado) - *Depende de `allowInventory`*
- **Tipos de Item:**
  - **Matéria Prima:** Insumos puros (ex: Farinha). Não vende.
  - **Revenda:** Compra e vende (ex: Refrigerante). Baixa 1:1.
  - **Produzido (Composto):** Pratos feitos na casa. Possui **Ficha Técnica**. A venda baixa os ingredientes proporcionalmente.
- **Compras:** Entrada de Notas Fiscais e gestão de Fornecedores.
- **Balanço:** Ferramenta para contagem física e ajuste de estoque.
- **Sugestão de Compras:** Algoritmo baseado no estoque mínimo e velocidade de vendas.

#### 4. Financeiro - *Depende de `allowExpenses` / `allowReports`*
- **Contas a Pagar:** Gestão de despesas operacionais.
- **DRE Gerencial:** Relatório completo de Demonstração do Resultado.
  - Receita Bruta - Impostos - Taxas = Receita Líquida.
  - Receita Líquida - CMV = Lucro Bruto.
  - Lucro Bruto - Despesas = **EBITDA / Lucro Líquido**.
- **Business Intelligence (BI):** Gráficos de evolução, Curva ABC de produtos e previsões.

#### 5. Configurações
- **Aparência:** Personalização White-label (*Depende de `allowCustomization`*).
- **Regras:** Tempo de carência, Senha Mestra.
- **Equipe:** Gestão de usuários e cargos (*Depende de `allowStaff`*).

---

## 5. Regras de Negócio Críticas

1.  **Baixa de Estoque Automática:**
    - Executada via *Database Trigger* (`deduct_inventory_on_order`) no PostgreSQL.
    - Ao inserir um item no pedido:
        - Se for **Revenda**: Baixa a quantidade do item vinculado.
        - Se for **Composto**: Busca a receita na tabela `inventory_recipes` e baixa cada ingrediente proporcionalmente.

2.  **Ciclo de Vida do Pedido:**
    - Pedidos nascem como `PENDING`.
    - Se cancelado dentro do tempo de carência, não aparece na cozinha.
    - O status final `DELIVERED` com `is_paid = true` consolida a transação financeira.

3.  **Controle de Caixa:**
    - O sistema bloqueia vendas no POS se não houver uma `cash_session` aberta com status `OPEN`.
    - Sangrias e Fechamentos geram registros de auditoria.

4.  **Segurança e Estorno:**
    - Cancelamento de vendas pagas ou fechamento de conta exige a **Senha Mestra** (Admin PIN).
    - O estorno de uma venda restaura automaticamente o estoque dos itens envolvidos.

---

## 6. Banco de Dados (Schema Resumido)

- `tenants`: Clientes SaaS (Restaurantes) e suas configurações.
- `staff`: Usuários do sistema (Garçons, Cozinheiros, Admins).
- `products`: Itens do cardápio (Venda).
- `inventory_items`: Itens do estoque (Insumos/Revenda/Pratos).
- `inventory_recipes`: Relacionamento Prato -> Ingredientes.
- `orders` / `order_items`: Pedidos e seus detalhes.
- `transactions`: Entradas financeiras (Vendas).
- `expenses`: Saídas financeiras (Contas).
- `cash_sessions` / `cash_movements`: Controle de turno de caixa.
- `suppliers`: Cadastro de fornecedores.
- `service_calls`: Solicitações de atendimento.
