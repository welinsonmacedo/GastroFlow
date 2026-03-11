# Core e Contextos (Fundamentos do Sistema)

A camada "Core" é o coração da aplicação frontend. Ela gerencia o estado global, a comunicação com o banco de dados e as regras de negócio transversais.

## 1. Cliente da API (`src/core/api/supabaseClient.ts`)
Responsável por inicializar a conexão com o Supabase usando as variáveis de ambiente.
- **`supabase`**: Instância principal do cliente.
- **`logAudit`**: Função utilitária global para registrar ações importantes no sistema (Auditoria). Salva quem fez o que, quando e em qual módulo.

## 2. Contextos Globais (`src/context/` ou `src/core/context/`)
Utilizam a Context API do React para prover dados para toda a árvore de componentes sem a necessidade de "prop drilling".

### `AuthProvider`
- **Função:** Gerencia o estado de autenticação do usuário atual.
- **Responsabilidades:** Login, Logout, escutar mudanças de sessão do Supabase, e armazenar os dados do usuário logado (`currentUser`).

### `RestaurantContext`
- **Função:** Gerencia o estado do restaurante (tenant) atual.
- **Responsabilidades:** Armazenar o `tenantId` ativo, carregar configurações específicas do restaurante (nome, logo, preferências), e prover essas informações para os módulos que precisam filtrar dados.

### `InventoryContext`
- **Função:** Gerencia o estado global do estoque.
- **Responsabilidades:** Buscar itens, calcular níveis de estoque, e prover funções para criar/editar/excluir itens de inventário.

### `StaffContext`
- **Função:** Gerencia os dados de Recursos Humanos.
- **Responsabilidades:** Listar funcionários, gerenciar eventos de folha de pagamento e prover dados para o módulo de RH.

## 3. Hooks Customizados (`src/hooks/`)
Encapsulam a lógica de interação com o banco de dados.
- Exemplo: **`usePurchaseOrders`**: Contém as funções `savePurchaseOrder`, `updatePurchaseOrder`, `deletePurchaseOrder` e `fetchPurchaseOrderItems`. Ele abstrai as queries complexas do Supabase e aciona o `logAudit` automaticamente.
