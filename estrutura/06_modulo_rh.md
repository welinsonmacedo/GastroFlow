# Módulo de Recursos Humanos (RH)

O Módulo de RH gerencia a equipe do estabelecimento, desde o cadastro até o cálculo da folha de pagamento e controle de ponto.

## Estrutura (`src/pages/admin/rh/`, `AdminStaff.tsx`, `TimeClock.tsx`)

## Principais Funcionalidades

### Gestão de Colaboradores (`AdminStaff.tsx`)
- **Função:** Cadastro e controle da equipe.
- **Recursos:**
  - Dados pessoais e de contato.
  - Definição de cargo (`role`) e permissões de acesso ao sistema.
  - Salário base e tipo de contratação.

### Controle de Ponto (`TimeClock.tsx`)
- **Função:** Registro de jornada de trabalho.
- **Recursos:**
  - Interface simplificada para o funcionário registrar Entrada, Pausa, Retorno e Saída.
  - Cálculo automático de horas trabalhadas e horas extras.

### Folha de Pagamento e Eventos
- **Função:** Cálculo da remuneração mensal.
- **Recursos:**
  - Lançamento de eventos manuais (Adiantamentos, Faltas, Bônus).
  - Eventos recorrentes (Vale Transporte, Plano de Saúde).
  - Fechamento da folha: consolida salário base + horas extras + eventos + comissões/gorjetas.
  - Integração com o Financeiro: O fechamento da folha gera automaticamente uma despesa a pagar no módulo financeiro.
