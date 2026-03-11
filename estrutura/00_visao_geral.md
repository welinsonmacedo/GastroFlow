# Visão Geral do Sistema

Este documento fornece uma visão geral da arquitetura e estrutura do sistema ERP completo para restaurantes e comércios em geral (SaaS Multi-tenant).

## Arquitetura Principal
O sistema é construído utilizando uma arquitetura moderna baseada em:
- **Frontend:** React (com Vite), TypeScript, Tailwind CSS para estilização.
- **Backend/Database:** Supabase (PostgreSQL), utilizando Row Level Security (RLS) para isolamento de dados entre inquilinos (tenants).
- **Autenticação:** Supabase Auth.

## Estrutura de Diretórios Principal (`/src`)
- `/components`: Componentes visuais reutilizáveis (Botões, Modais, Tabelas, etc).
- `/context` ou `/core/context`: Gerenciadores de estado global da aplicação (React Context API).
- `/hooks` ou `/core/hooks`: Hooks customizados para abstrair a lógica de negócios e chamadas ao banco de dados.
- `/pages`: Componentes de páginas que representam as rotas da aplicação.
- `/services` ou `/core/api`: Configurações de clientes de API (ex: cliente do Supabase).

## Modelo Multi-Tenant
O sistema atende a múltiplos estabelecimentos em uma única base de dados. O isolamento é garantido pela coluna `tenant_id` presente em quase todas as tabelas do banco de dados. 
As políticas de segurança (RLS) do PostgreSQL garantem que um usuário só possa ler e modificar dados onde o `tenant_id` corresponda ao estabelecimento ao qual ele pertence.
