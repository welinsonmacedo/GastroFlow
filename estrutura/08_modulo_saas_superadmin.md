# Módulo SaaS e Super Admin

Este é o módulo de nível mais alto do sistema, invisível para os estabelecimentos. Ele é usado exclusivamente pelos donos do software (SaaS) para gerenciar os clientes (estabelecimentos).

## Estrutura (`src/pages/SuperAdminDashboard.tsx`, `SaaSLogin.tsx`)

## Principais Funcionalidades

### Autenticação Restrita (`SaaSLogin.tsx`)
- Acesso permitido apenas para usuários cadastrados na tabela `saas_admins`.
- Estes usuários têm permissão de RLS para ler e modificar dados de **qualquer** `tenant_id`.

### Gestão de Inquilinos (Tenants)
- **Função:** Controle dos estabelecimentos cadastrados na plataforma.
- **Recursos:**
  - Criação de novos estabelecimentos (onboarding).
  - Suspensão ou bloqueio de contas (ex: por falta de pagamento).
  - Configuração de planos e limites (ex: limite de usuários, módulos ativos).

### Métricas Globais (`SuperAdminDashboard.tsx`)
- **Função:** Visão de performance da plataforma SaaS.
- **Recursos:**
  - Total de estabelecimentos ativos.
  - Receita recorrente mensal (MRR) gerada pelas assinaturas.
  - Volume total de transações processadas pela plataforma.
  - Monitoramento de erros e uso do sistema.

### Suporte e Manutenção
- Capacidade de "impersonar" (entrar como) um estabelecimento específico para prestar suporte técnico, ver exatamente o que o cliente vê e corrigir configurações erradas.
