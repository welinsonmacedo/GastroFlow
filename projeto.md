# Visão Geral do Projeto - ArloFlux

O **ArloFlux** é um sistema SaaS (Software as a Service) completo de ERP e PDV voltado para o setor gastronômico (restaurantes, lanchonetes, bares e distribuidoras). Ele foi construído com uma arquitetura *multi-tenant* (multilocatário), permitindo que diversos restaurantes utilizem a mesma infraestrutura, cada um com seu próprio subdomínio, banco de dados isolado (via Row Level Security no Supabase) e configurações personalizadas.

Abaixo está o detalhamento completo de cada módulo do sistema, suas funcionalidades e como eles interagem entre si.

---

## 1. Módulo do Cliente (Autoatendimento / Cardápio Digital)
Este módulo é acessado pelo cliente final, geralmente escaneando um QR Code na mesa.

*   **Cardápio Digital Interativo:** Exibe os produtos divididos por categorias. Suporta imagens, descrições e controle de disponibilidade (itens esgotados não podem ser pedidos).
*   **Personalização de Pedidos:** Permite adicionar observações (ex: "sem cebola") e selecionar itens adicionais/extras vinculados ao produto principal.
*   **Carrinho e Checkout:** O cliente revisa o pedido antes de enviar. Existe um "Tempo de Arrependimento" (configurável pelo admin) onde o cliente pode cancelar o pedido logo após o envio.
*   **Chamado de Garçom:** O cliente pode chamar o garçom com um toque, especificando o motivo (ex: "Dúvida", "Limpar Mesa", "Pedir a Conta").
*   **Acompanhamento em Tempo Real:** O cliente vê o status de cada item do seu pedido (Pendente, Preparando, Pronto, Entregue) atualizado em tempo real.
*   **Extrato da Conta:** Visualização do total gasto na mesa a qualquer momento.

---

## 2. Módulo de Salão (App do Garçom)
Focado na agilidade do atendimento, otimizado para uso em tablets e smartphones.

*   **Mapa de Mesas (Grid):** Visão geral de todas as mesas, mostrando o status (Livre, Ocupada, Chamando).
*   **Sistema de Notificações Inteligente:** Alertas visuais e sonoros quando um cliente chama ou quando um prato fica pronto na cozinha.
    *   *Modo Todos:* Todos os garçons recebem o alerta.
    *   *Modo Opener:* Apenas o garçom que abriu a mesa recebe o alerta.
    *   *Modo Assigned:* Mesas são atribuídas a garçons específicos. Possui um "Modo Estrito" para ignorar mesas sem dono.
*   **Lançamento de Pedidos:** O garçom pode lançar pedidos para a mesa, com interface de busca rápida e adição de extras.
*   **Gestão de Entregas na Mesa:** O garçom visualiza o que está pronto na cozinha/bar e marca os itens como "Entregues" assim que os leva à mesa. Regras evitam que bebidas sejam servidas muito antes da comida, se o cliente solicitar.

---

## 3. Módulo de Cozinha (KDS - Kitchen Display System)
Substitui a impressora de comandas por telas interativas nas áreas de produção (Cozinha, Bar, Copa).

*   **Fila de Produção:** Exibe os pedidos em tempo real assim que são feitos pelo cliente ou garçom.
*   **Filtros por Setor:** Pode ser configurado para mostrar apenas itens de "Cozinha" ou apenas itens de "Bar".
*   **Controle de Status:** O cozinheiro altera o status do item de "Pendente" para "Preparando" e, finalmente, para "Pronto".
*   **Temporizadores:** Cada comanda exibe há quanto tempo o pedido foi feito, ajudando a priorizar pratos atrasados.
*   **Alertas Visuais:** Comandas mudam de cor se ultrapassarem o tempo limite de preparo.

---

## 4. Módulo Frente de Caixa (PDV) e Delivery
O coração financeiro operacional do restaurante.

*   **Gestão de Mesas (Caixa):** Permite fechar contas, aplicar descontos, dividir a conta entre várias pessoas e processar pagamentos parciais ou totais.
*   **Venda Balcão (PDV Rápido):** Para clientes que compram diretamente no caixa para levar ou comer no local sem mesa.
*   **Gestão de Delivery:**
    *   Recepção de pedidos para entrega.
    *   Atribuição de entregadores (motoboys próprios ou apps parceiros).
    *   Controle de taxas de entrega (fixa ou porcentagem, repassada ao cliente ou absorvida pelo restaurante).
    *   Acompanhamento do status de despacho.
*   **Controle de Caixa (Sessões):** Abertura e fechamento de caixa, registro de suprimentos (troco inicial) e sangrias (retiradas de dinheiro).

---

## 5. Módulo de Estoque e Compras
Controle rigoroso de insumos e produtos para evitar desperdícios e calcular o custo real.

*   **Tipos de Itens:**
    *   *Insumos/Matéria-prima:* Ingredientes usados nas receitas (ex: Farinha, Queijo).
    *   *Revenda:* Produtos vendidos como são comprados (ex: Lata de Refrigerante).
    *   *Compostos (Fichas Técnicas):* Produtos fabricados no local (ex: Hambúrguer). O sistema dá baixa automática nos insumos da receita quando o produto é vendido.
*   **Gestão de Fornecedores:** Cadastro completo de fornecedores.
*   **Ordens de Compra (Pedidos):** Criação de pedidos para fornecedores, com cálculo automático de impostos (ICMS, IPI, ST, Frete) e rateio no custo do produto.
*   **Sugestões de Compra:** O sistema analisa o estoque mínimo, o estoque atual e o histórico de vendas para sugerir o que precisa ser comprado.
*   **Cálculo de CMV:** Atualização automática do Custo da Mercadoria Vendida (CMV) com base nas últimas compras.

---

## 6. Módulo de Recursos Humanos (RH) e Ponto Eletrônico
Gestão completa da equipe do restaurante.

*   **Cadastro de Funcionários:** Dados pessoais, contratuais (CLT, PJ, Freelancer), modelo de trabalho e salário base.
*   **Controle de Permissões (Cargos):** Definição granular de quais telas e ações cada funcionário pode acessar (ex: Garçom não acessa o Financeiro).
*   **Ponto Eletrônico (Time Clock):**
    *   Registro de entrada, pausas e saída.
    *   *Validação por GPS:* O funcionário só consegue bater o ponto se estiver dentro do raio (em metros) configurado do restaurante.
    *   *Validação por Limite:* Limita a quantidade de batidas por dia para evitar fraudes.
*   **Folha de Pagamento:**
    *   Cálculo automático de horas extras e banco de horas.
    *   Cálculo de impostos e deduções (INSS, IRRF, FGTS) baseado no regime tributário do restaurante.
    *   Lançamento de eventos manuais (gorjetas, bônus, vales, faltas).
    *   Geração de holerites/recibos.

---

## 7. Módulo de Gestão Financeira e Contábil
Visão gerencial da saúde financeira do negócio.

*   **Contas a Pagar e Receber:** Lançamento de despesas fixas (aluguel, luz) e variáveis. Integração automática com as Ordens de Compra do estoque.
*   **DRE (Demonstração do Resultado do Exercício):** Relatório contábil gerado automaticamente cruzando as Vendas (Receitas) com as Despesas, Folha de Pagamento e CMV.
*   **Análise de Margem:** Gráficos mostrando a margem de lucro bruta e líquida.
*   **Categorização:** Classificação de despesas para entender onde o dinheiro está sendo gasto.

---

## 8. Módulo de Configurações e Administração
Onde o dono do restaurante parametriza o sistema.

*   **Aparência (White-label):** Customização de cores primárias, logotipo, fontes e estilo dos botões para que o Cardápio Digital tenha a cara da marca.
*   **Dados Cadastrais:** CNPJ, Endereço, Regime Tributário.
*   **Regras Operacionais:** Configuração do tempo de carência de pedidos, modos de notificação de garçons.
*   **Segurança:** Definição do PIN Administrativo (senha mestra exigida para cancelar pedidos ou reabrir caixas).
*   **Meios de Pagamento:** Cadastro das taxas das maquininhas de cartão para calcular o valor líquido real recebido.

---

## 9. Módulo de Auditoria e Segurança
Focado em rastreabilidade e prevenção de fraudes.

*   **Logs de Acesso:** Registra quem entrou no sistema, horário, endereço IP e dispositivo utilizado.
*   **Logs de Ações:** Registra ações críticas, como cancelamento de pedidos, exclusão de itens, alterações de estoque e estornos financeiros, sempre vinculando ao usuário que realizou a ação.
*   **Proteção de IP:** Bloqueio automático de IPs suspeitos ou tentativas de acesso indevido.

---

## 10. Módulo Super Admin (Gestão SaaS)
Acessado apenas pelos donos do software (ArloFlux), invisível para os restaurantes.

*   **Gestão de Tenants (Inquilinos):** Criação, suspensão e exclusão de restaurantes na plataforma.
*   **Gestão de Planos e Limites:** Definição dos pacotes (ex: Basic, Pro, Premium). Controla limites como: número máximo de mesas, número máximo de produtos, acesso ao KDS, acesso ao RH, etc.
*   **Configurações Globais:** Parametrizações que afetam toda a infraestrutura.
*   **Visão Geral de Faturamento:** Acompanhamento de quantos restaurantes estão ativos e pagantes.

---

### Resumo do Fluxo de Dados
1. O **Admin** configura o cardápio, mesas e equipe.
2. O **Cliente** lê o QR Code, vê o cardápio e faz o pedido.
3. O **Garçom** é notificado se o cliente chamar.
4. A **Cozinha (KDS)** recebe o pedido, prepara e marca como pronto.
5. O **Garçom** é notificado que o prato está pronto e o entrega.
6. O **Estoque** dá baixa automática nos ingredientes usados.
7. O **Caixa** recebe o pagamento e encerra a mesa.
8. O **Financeiro** registra a receita, desconta a taxa do cartão e calcula o lucro baseado no custo dos ingredientes (CMV) e despesas do dia (RH/Contas).
