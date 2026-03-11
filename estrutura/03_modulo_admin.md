# Módulo Admin (Backoffice)

O Módulo Admin é o painel de controle principal para os donos e gerentes do estabelecimento. Ele centraliza a gestão de todas as operações.

## Estrutura (`src/pages/admin/`)
Contém as páginas acessíveis apenas por usuários com privilégios administrativos dentro de um tenant.

## Principais Componentes e Funções

### `AdminOverview.tsx` / `AdminDashboard.tsx`
- **Função:** Visão geral do negócio.
- **Recursos:** Gráficos de vendas do dia, alertas de estoque baixo, resumo financeiro e atalhos rápidos.

### `AdminSettings.tsx`
- **Função:** Configurações gerais do estabelecimento.
- **Recursos:** Alteração de dados cadastrais, logo, horário de funcionamento, taxas e configurações gerais.

### `AdminMenuAppearance.tsx` & `AdminProducts.tsx`
- **Função:** Gestão do catálogo de produtos e serviços.
- **Recursos:** Criação de categorias, cadastro de itens, upload de fotos, definição de preços, e montagem de combos/adicionais.

### `AdminTables.tsx`
- **Função:** Gestão do espaço físico/serviço.
- **Recursos:** Criação de mesas/locais, definição de setores e geração de QR Codes para autoatendimento.

### `AdminBusinessIntelligence.tsx` & `AdminReports.tsx`
- **Função:** Análise de dados e relatórios avançados.
- **Recursos:** Curva ABC de produtos, relatórios de vendas por período, ticket médio, e performance da equipe.

### `AdminSecurity.tsx`
- **Função:** Controle de acessos e auditoria.
- **Recursos:** Visualização dos logs de auditoria (`audit_logs`) para rastrear ações suspeitas ou erros operacionais.
