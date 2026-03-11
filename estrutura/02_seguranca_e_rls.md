# Segurança e RLS (Row Level Security)

A segurança do sistema é baseada em múltiplas camadas, focando principalmente no isolamento de dados (Multi-tenant) e controle de acesso baseado em funções (RBAC).

## 1. Autenticação
Gerenciada pelo Supabase Auth. Os usuários fazem login com e-mail e senha. O token JWT gerado contém o `sub` (ID do usuário), que é usado pelo banco de dados para identificar quem está fazendo a requisição.

## 2. RLS (Row Level Security) no PostgreSQL
O RLS é a principal barreira de segurança. Ele garante que, mesmo que um usuário tente fazer uma query direta no banco, ele só verá os dados permitidos.

### Como funciona o isolamento de Tenant:
Quase todas as tabelas possuem a coluna `tenant_id`. As políticas (Policies) do Supabase são configuradas para verificar se o usuário logado tem permissão para acessar aquele `tenant_id`.

**Exemplo de Regra (Policy) Padrão:**
Um usuário pode fazer `SELECT`, `INSERT`, `UPDATE` ou `DELETE` se:
1. Ele for um Super Admin (`saas_admins`).
2. Ele for o dono do restaurante (`tenants.owner_id = auth.uid()`).
3. Ele for um funcionário vinculado àquele restaurante (`staff.auth_user_id = auth.uid()` e `staff.tenant_id = tabela.tenant_id`).

## 3. Controle de Acesso Baseado em Funções (RBAC)
Dentro de um restaurante, os funcionários têm diferentes papéis (`role` na tabela `staff`).
- **Owner / Admin:** Acesso total às configurações, financeiro e RH.
- **Manager (Gerente):** Acesso a relatórios, estoque, e PDV.
- **Cashier (Caixa):** Acesso ao PDV e fechamento de caixa.
- **Waiter (Garçom):** Acesso apenas ao aplicativo de garçom para tirar pedidos.
- **Kitchen (Cozinha):** Acesso apenas ao display da cozinha (KDS).

No frontend, as rotas e botões são protegidos verificando o `role` do usuário logado.

## 4. Auditoria (`audit_logs`)
Todas as ações críticas (exclusão de pedidos, alterações de estoque, modificações na folha de pagamento) são registradas na tabela `audit_logs` através da função `logAudit`. 
Isso garante rastreabilidade total: sabemos exatamente qual usuário alterou qual dado e em que momento.
