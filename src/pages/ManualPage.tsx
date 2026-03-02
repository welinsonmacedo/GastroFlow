
import React, { useState } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import { 
  Coffee, DollarSign, Settings, 
  ArrowRight, CheckCircle, Bell, QrCode, 
  Monitor, Smartphone, Play, AlertTriangle,
  ArrowLeft, BookOpen, Users, LayoutDashboard,
  Package, FileText, TrendingUp, Truck, Lock, Calculator, Layers,
  HelpCircle, MessageCircle,
  RefreshCw, ShieldCheck, MousePointerClick
} from 'lucide-react';
import { TicketsClient } from '../components/TicketsClient';

const RoleCard = ({ icon, title, color, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left mb-2
      ${active 
        ? `bg-${color}-50 border-${color}-500 shadow-md` 
        : 'bg-white border-gray-100 hover:bg-gray-50'
      }`}
  >
    <div className={`p-2 rounded-lg shrink-0 ${active ? `bg-${color}-500 text-white` : `bg-gray-100 text-gray-500`}`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <h3 className={`font-bold text-sm truncate ${active ? `text-${color}-700` : 'text-gray-700'}`}>{title}</h3>
    </div>
    <ArrowRight size={16} className={active ? `text-${color}-500` : 'text-gray-300'} />
  </button>
);

const Step = ({ number, title, desc, icon }: any) => (
  <div className="flex gap-4 mb-8 relative group">
    <div className="flex flex-col items-center">
      <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 z-10 shadow-lg group-hover:scale-110 transition-transform">
        {number}
      </div>
      <div className="w-0.5 h-full bg-slate-200 absolute top-8 bottom-[-10px] -z-0"></div>
    </div>
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex-1 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-bold text-lg text-slate-800">{title}</h4>
        {icon && <div className="text-slate-400 bg-slate-50 p-2 rounded-lg">{icon}</div>}
      </div>
      <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
    </div>
  </div>
);

const FaqItem = ({ question, answer }: any) => (
  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm mb-4">
    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
      <HelpCircle size={18} className="text-blue-500" />
      {question}
    </h4>
    <p className="text-slate-600 text-sm leading-relaxed pl-7">{answer}</p>
  </div>
);

type ManualTab = 'WAITER' | 'KITCHEN' | 'CASHIER' | 'INVENTORY' | 'FINANCE' | 'ADMIN' | 'CLIENT' | 'SUPPORT' | 'TICKETS';

export const ManualPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ManualTab>('SUPPORT');
  const { state } = useRestaurant();
  const allowed = state.allowedModules || [];

  const showRestaurant = allowed.includes('RESTAURANT') || allowed.includes('SNACKBAR');
  const showCommerce = allowed.includes('COMMERCE') || allowed.includes('DISTRIBUTOR');
  const showInventory = allowed.includes('INVENTORY');
  const showFinance = allowed.includes('FINANCE');
  const showAdmin = allowed.includes('MANAGER') || allowed.includes('CONFIG');
  const showClient = showRestaurant || showCommerce;

  // Set initial active tab based on what's available
  React.useEffect(() => {
      if (showRestaurant) setActiveTab('WAITER');
      else if (showInventory) setActiveTab('INVENTORY');
      else if (showFinance) setActiveTab('FINANCE');
      else if (showAdmin) setActiveTab('ADMIN');
      else if (showClient) setActiveTab('CLIENT');
      else setActiveTab('SUPPORT');
  }, [showRestaurant, showInventory, showFinance, showAdmin, showClient]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 p-4 flex-shrink-0 h-auto md:h-screen overflow-y-auto sticky top-0 z-20 custom-scrollbar">
        <div className="flex items-center gap-2 mb-6 text-blue-700 font-extrabold text-xl px-2">
          <Link to="/login" className="p-2 hover:bg-blue-50 rounded-full transition-colors mr-1 -ml-2">
            <ArrowLeft size={20} />
          </Link>
          <span>Manual</span>
        </div>

        <div className="space-y-1">
          {(showRestaurant || showCommerce) && (
            <>
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 ml-2 tracking-wider">Operacional</div>
              
              {showRestaurant && (
                <>
                  <RoleCard 
                    icon={<Coffee size={18} />} 
                    title="Garçom & Salão" 
                    color="orange" 
                    active={activeTab === 'WAITER'} 
                    onClick={() => setActiveTab('WAITER')}
                  />
                  
                  <RoleCard 
                    icon={<Monitor size={18} />} 
                    title="Cozinha (KDS)" 
                    color="red" 
                    active={activeTab === 'KITCHEN'} 
                    onClick={() => setActiveTab('KITCHEN')}
                  />
                </>
              )}
              
              <RoleCard 
                icon={<DollarSign size={18} />} 
                title="Frente de Caixa" 
                color="green" 
                active={activeTab === 'CASHIER'} 
                onClick={() => setActiveTab('CASHIER')}
              />
            </>
          )}

          {(showInventory || showFinance || showAdmin) && (
            <>
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 mt-4 ml-2 tracking-wider">Gestão (ERP)</div>

              {showInventory && (
                <RoleCard 
                  icon={<Package size={18} />} 
                  title="Estoque & Fichas" 
                  color="purple" 
                  active={activeTab === 'INVENTORY'} 
                  onClick={() => setActiveTab('INVENTORY')}
                />
              )}

              {showFinance && (
                <RoleCard 
                  icon={<TrendingUp size={18} />} 
                  title="Financeiro & DRE" 
                  color="emerald" 
                  active={activeTab === 'FINANCE'} 
                  onClick={() => setActiveTab('FINANCE')}
                />
              )}
              
              {showAdmin && (
                <RoleCard 
                  icon={<Settings size={18} />} 
                  title="Admin & Config" 
                  color="blue" 
                  active={activeTab === 'ADMIN'} 
                  onClick={() => setActiveTab('ADMIN')}
                />
              )}
            </>
          )}

          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 mt-4 ml-2 tracking-wider">Cliente & Ajuda</div>

          {showClient && (
            <RoleCard 
              icon={<Smartphone size={18} />} 
              title="App do Cliente" 
              color="pink" 
              active={activeTab === 'CLIENT'} 
              onClick={() => setActiveTab('CLIENT')}
            />
          )}

          <RoleCard 
            icon={<HelpCircle size={18} />} 
            title="Suporte & FAQ" 
            color="slate" 
            active={activeTab === 'SUPPORT'} 
            onClick={() => setActiveTab('SUPPORT')}
          />

          <RoleCard 
            icon={<MessageCircle size={18} />} 
            title="Chamados" 
            color="indigo" 
            active={activeTab === 'TICKETS'} 
            onClick={() => setActiveTab('TICKETS')}
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto scroll-smooth">
        
        {/* --- WAITER SECTION --- */}
        {activeTab === 'WAITER' && (
          <div className="max-w-3xl mx-auto animate-fade-in pb-10">
            <header className="mb-10 border-b pb-6">
              <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4">
                <Coffee size={14} /> Operacional
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Garçom & Atendimento</h1>
              <p className="text-lg text-slate-500">
                Gestão de mesas, pedidos e chamados em tempo real.
              </p>
            </header>

            <Step 
              number="1"
              title="Abrir Mesa & Senha"
              desc="Toque em uma mesa LIVRE (Cinza) para abri-la. Digite o nome do cliente. O sistema gerará um código de 4 dígitos. Entregue este código ao cliente caso ele queira fazer pedidos pelo próprio celular via QR Code."
              icon={<Smartphone className="text-orange-500" />}
            />

            <Step 
              number="2"
              title="Lançar Pedidos"
              desc="Para anotar pedidos manualmente: Toque em uma mesa OCUPADA e selecione 'Fazer Pedido'. Você pode buscar produtos, adicionar observações (ex: 'sem gelo') e enviar direto para as telas da cozinha/bar."
              icon={<CheckCircle className="text-blue-500" />}
            />

            <Step 
              number="3"
              title="Drawer 'Para Servir'"
              desc="A barra inferior (celular) ou lateral (tablet) mostra os pratos prontos. Quando a cozinha finaliza um item, ele aparece aqui. Entregue ao cliente e clique em 'Marcar Entregue' para limpar a lista."
              icon={<Bell className="text-yellow-500" />}
            />

            <Step 
              number="4"
              title="Alertas e Chamados"
              desc="Se um cliente solicitar ajuda pelo app dele, a mesa ficará VERMELHA e pulsando no seu painel com um alerta sonoro. Toque na mesa para confirmar o atendimento."
              icon={<AlertTriangle className="text-red-500" />}
            />

            <Step 
              number="5"
              title="Transferência e Junção"
              desc="Para juntar mesas ou trocar clientes de lugar, use a opção 'Ações da Mesa' > 'Transferir'. Selecione a mesa de destino. Todos os pedidos serão movidos."
              icon={<RefreshCw className="text-purple-500" />}
            />
          </div>
        )}

        {/* --- KITCHEN SECTION --- */}
        {activeTab === 'KITCHEN' && (
          <div className="max-w-3xl mx-auto animate-fade-in pb-10">
            <header className="mb-10 border-b pb-6">
              <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4">
                <Monitor size={14} /> Produção
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">KDS (Cozinha)</h1>
              <p className="text-lg text-slate-500">
                Sistema de exibição de pedidos para substituir impressoras.
              </p>
            </header>

            <Step 
              number="1"
              title="Chegada de Pedidos"
              desc="Novos pedidos aparecem automaticamente com som e borda piscante (Amarelo). Os cartões mostram o número da mesa, nome do prato, quantidade e observações em destaque."
              icon={<Bell size={20} />}
            />

            <Step 
              number="2"
              title="Iniciar e Finalizar"
              desc="Toque em 'INICIAR' para indicar que o prato está sendo feito (fica Azul). Ao terminar, toque em 'PRONTO' (Verde). O item sai da sua tela e notifica o garçom para buscar."
              icon={<Play size={20} />}
            />

            <Step 
              number="3"
              title="Monitoramento de Tempo"
              desc="Cada cartão possui um cronômetro. Se um pedido demorar muito (ex: > 20min), o cartão ficará vermelho para alertar a equipe sobre o atraso."
              icon={<Calculator size={20} />}
            />

            <Step 
              number="4"
              title="Histórico de Produção"
              desc="Clicando no ícone de Histórico no topo da tela, você pode ver os últimos pratos finalizados e, se necessário, retorná-los para a produção em caso de erro."
              icon={<RefreshCw size={20} />}
            />
          </div>
        )}

        {/* --- CASHIER SECTION --- */}
        {activeTab === 'CASHIER' && (
          <div className="max-w-3xl mx-auto animate-fade-in pb-10">
            <header className="mb-10 border-b pb-6">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4">
                <DollarSign size={14} /> Frente de Caixa
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Caixa & PDV</h1>
              <p className="text-lg text-slate-500">
                Controle de turno, recebimento de mesas e venda balcão.
              </p>
            </header>

            <Step 
              number="1"
              title="Abertura de Caixa"
              desc="Antes de começar a vender, é necessário abrir o caixa informando o 'Fundo de Troco' (valor em dinheiro físico na gaveta)."
              icon={<Lock size={20} />}
            />

            <Step 
              number="2"
              title="Receber Mesas"
              desc="Na aba 'Mesas', selecione uma mesa ocupada para ver o extrato. Escolha a forma de pagamento (Dinheiro, Pix, Cartão). Isso libera a mesa e registra a venda."
              icon={<QrCode size={20} />}
            />

            <Step 
              number="3"
              title="PDV Balcão (Venda Rápida)"
              desc="Use a aba 'Balcão' para vendas diretas sem abrir mesa (ex: cliente que compra uma água e vai embora). Adicione itens ao carrinho e finalize a venda imediatamente."
              icon={<DollarSign size={20} />}
            />

            <Step 
              number="4"
              title="Sangria e Fechamento"
              desc="Use a aba 'Gestão' para registrar Sangrias (retirada de dinheiro da gaveta). Ao fim do dia, faça o 'Fechar Caixa', informando o valor contado. O sistema mostrará as sobras ou faltas."
              icon={<LayoutDashboard size={20} />}
            />

            <Step 
              number="5"
              title="Delivery"
              desc="Na aba 'Delivery', você gerencia pedidos que chegam por telefone ou iFood (se integrado). Cadastre o cliente, lance o pedido e acompanhe o status até a entrega."
              icon={<Truck size={20} />}
            />
          </div>
        )}

        {/* --- INVENTORY SECTION --- */}
        {activeTab === 'INVENTORY' && (
          <div className="max-w-3xl mx-auto animate-fade-in pb-10">
            <header className="mb-10 border-b pb-6">
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4">
                <Package size={14} /> ERP - Gestão
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Estoque & Fichas</h1>
              <p className="text-lg text-slate-500">
                Controle de insumos, receitas e compras.
              </p>
            </header>

            <div className="bg-white p-6 rounded-xl border border-purple-100 shadow-sm mb-8">
                <h3 className="font-bold text-purple-800 mb-4 flex items-center gap-2"><Layers/> Tipos de Item</h3>
                <div className="space-y-3 text-sm text-slate-600">
                    <p><strong className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded">Matéria Prima:</strong> Ingredientes puros (ex: Farinha, Ovo, Carne Crua). Não aparecem no cardápio de venda.</p>
                    <p><strong className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Revenda:</strong> Produtos comprados prontos para vender (ex: Coca-Cola, Chocolate). Controla estoque unitário.</p>
                    <p><strong className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Produzido (Ficha Técnica):</strong> Pratos feitos na casa (ex: X-Burger). É composto por matérias-primas. Ao vender este item, o sistema baixa o estoque dos ingredientes automaticamente.</p>
                </div>
            </div>

            <Step 
              number="1"
              title="Cadastrar Insumos"
              desc="Vá em Admin > Estoque > Novo Item. Cadastre seus ingredientes (ex: Pão, Carne, Queijo) marcando como 'Matéria Prima' e definindo a unidade (KG, UN)."
              icon={<Package size={20} />}
            />

            <Step 
              number="2"
              title="Criar Ficha Técnica (Receita)"
              desc="Crie um novo item do tipo 'Produzido' (ex: X-Salada). Na seção 'Composição', adicione os ingredientes cadastrados anteriormente e suas quantidades. O sistema calculará o custo do prato (CMV) automaticamente."
              icon={<FileText size={20} />}
            />

            <Step 
              number="3"
              title="Entrada de Notas (Compras)"
              desc="Ao receber mercadoria, vá em 'Entrada Nota'. Selecione o fornecedor e adicione os itens. O sistema atualiza a quantidade em estoque, recalcula o preço de custo médio e cria as parcelas no Contas a Pagar."
              icon={<Truck size={20} />}
            />

            <Step 
              number="4"
              title="Inventário (Balanço)"
              desc="Periodicamente, use a função 'Inventário' para contar o estoque físico. O sistema comparará com o virtual e fará os ajustes de perda/sobra automaticamente."
              icon={<CheckCircle size={20} />}
            />
          </div>
        )}

        {/* --- FINANCE SECTION --- */}
        {activeTab === 'FINANCE' && (
          <div className="max-w-3xl mx-auto animate-fade-in pb-10">
            <header className="mb-10 border-b pb-6">
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4">
                <TrendingUp size={14} /> ERP - Gestão
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Financeiro & Contábil</h1>
              <p className="text-lg text-slate-500">
                Fluxo de caixa, contas a pagar e DRE Gerencial.
              </p>
            </header>

            <Step 
              number="1"
              title="Contas a Pagar"
              desc="Cadastre despesas manuais (Aluguel, Luz, Funcionários) ou automáticas (vindas da Entrada de Notas). Acompanhe os vencimentos e dê baixa quando realizar o pagamento."
              icon={<DollarSign size={20} />}
            />

            <Step 
              number="2"
              title="DRE Gerencial"
              desc="O relatório DRE (Demonstração do Resultado do Exercício) cruza suas Vendas (Receita) com o Custo das Mercadorias (CMV) e Despesas Operacionais para mostrar o Lucro Líquido real do período."
              icon={<FileText size={20} />}
            />

            <Step 
              number="3"
              title="Fluxo de Caixa"
              desc="Visualize quanto entrou em cada método de pagamento (Pix, Cartão, Dinheiro). O sistema separa o que é 'Dinheiro de Gaveta' (físico) do que é 'Dinheiro em Conta' (digital)."
              icon={<TrendingUp size={20} />}
            />
          </div>
        )}

        {/* --- ADMIN SECTION --- */}
        {activeTab === 'ADMIN' && (
          <div className="max-w-3xl mx-auto animate-fade-in pb-10">
            <header className="mb-10 border-b pb-6">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4">
                <Settings size={14} /> Configuração
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Administração Geral</h1>
              <p className="text-lg text-slate-500">
                Cardápio digital, equipe e personalização do sistema.
              </p>
            </header>

            <Step 
              number="1"
              title="Cardápio de Venda"
              desc="Em 'Cardápio', você define quais itens do estoque aparecem para o cliente. Você pode alterar nomes, adicionar fotos atrativas, descrições e ocultar produtos temporariamente sem apagá-los do estoque."
              icon={<BookOpen size={20} />}
            />

            <Step 
              number="2"
              title="Equipe e Acessos"
              desc="Cadastre seus funcionários e defina cargos (Garçom, Cozinheiro, Caixa). Cada cargo tem acesso limitado às suas funções. Gere um link de convite para que eles criem suas próprias senhas."
              icon={<Users size={20} />}
            />

            <Step 
              number="3"
              title="Mesas e QR Code"
              desc="Gerencie o layout das mesas. O sistema gera os QR Codes automaticamente prontos para impressão. Se precisar deletar uma mesa, o QR antigo para de funcionar por segurança."
              icon={<QrCode size={20} />}
            />

            <Step 
              number="4"
              title="Personalização (White Label)"
              desc="Insira sua logomarca, altere as cores do sistema para combinar com sua marca e escolha o layout do cardápio (Lista ou Grade com fotos grandes)."
              icon={<Settings size={20} />}
            />
          </div>
        )}

        {/* --- CLIENT APP SECTION --- */}
        {activeTab === 'CLIENT' && (
          <div className="max-w-3xl mx-auto animate-fade-in pb-10">
            <header className="mb-10 border-b pb-6">
              <div className="inline-flex items-center gap-2 bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4">
                <Smartphone size={14} /> Experiência
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">App do Cliente</h1>
              <p className="text-lg text-slate-500">
                Como seu cliente interage com o cardápio digital na mesa.
              </p>
            </header>

            <Step 
              number="1"
              title="Acesso via QR Code"
              desc="O cliente aponta a câmera do celular para o QR Code da mesa. Não é necessário baixar nenhum aplicativo. O cardápio abre instantaneamente no navegador."
              icon={<QrCode size={20} />}
            />

            <Step 
              number="2"
              title="Navegação e Pedido"
              desc="O cliente navega pelas categorias, vê fotos e descrições. Ao adicionar um item, ele pode personalizar (ex: ponto da carne, adicionais). O carrinho permite revisar antes de confirmar."
              icon={<MousePointerClick size={20} />}
            />

            <Step 
              number="3"
              title="Autenticação de Segurança"
              desc="Para evitar pedidos falsos, o sistema pode pedir o 'Código da Mesa' (4 dígitos) que o garçom fornece ao abrir a mesa. Isso garante que apenas quem está na mesa faça pedidos."
              icon={<ShieldCheck size={20} />}
            />

            <Step 
              number="4"
              title="Chamar Garçom e Conta"
              desc="Botões dedicados permitem chamar o garçom ou pedir a conta diretamente pelo celular, agilizando o atendimento e reduzindo filas no caixa."
              icon={<Bell size={20} />}
            />
          </div>
        )}

        {/* --- SUPPORT SECTION --- */}
        {activeTab === 'SUPPORT' && (
          <div className="max-w-3xl mx-auto animate-fade-in pb-10">
            <header className="mb-10 border-b pb-6">
              <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4">
                <HelpCircle size={14} /> Ajuda
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Suporte & FAQ</h1>
              <p className="text-lg text-slate-500">
                Respostas para problemas comuns e canais de atendimento.
              </p>
            </header>

            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Perguntas Frequentes</h3>
              
              <FaqItem 
                question="O sistema funciona sem internet?"
                answer="O Flux Eat é um sistema em nuvem e requer conexão com a internet para sincronizar pedidos entre Garçom, Cozinha e Caixa. Se a internet cair, você não conseguirá lançar novos pedidos até que ela retorne."
              />

              <FaqItem 
                question="Como reimprimir um QR Code de mesa?"
                answer="Vá em Admin > Mesas. Encontre a mesa desejada e clique no ícone de QR Code. Você pode imprimir apenas aquele ou gerar um PDF com todas as mesas."
              />

              <FaqItem 
                question="Esqueci minha senha de Admin. O que fazer?"
                answer="Na tela de login, clique em 'Recuperar Senha'. Um link de redefinição será enviado para o e-mail cadastrado do proprietário."
              />

              <FaqItem 
                question="O som de notificação não toca."
                answer="Verifique se o volume do dispositivo está alto e se o navegador tem permissão para reproduzir som. Em alguns navegadores, é necessário interagir com a página (clicar em algo) pelo menos uma vez para liberar o áudio."
              />
            </div>

            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <h3 className="text-lg font-bold text-blue-900 mb-2">Precisa de ajuda técnica?</h3>
              <p className="text-blue-700 mb-4 text-sm">Nossa equipe de suporte está disponível para resolver problemas críticos.</p>
              
              <div className="flex flex-col gap-3">
                <a href="#" className="flex items-center gap-3 bg-white p-3 rounded-lg border border-blue-100 text-blue-800 hover:shadow-md transition-all">
                  <div className="bg-blue-100 p-2 rounded-full"><MessageCircle size={18} /></div>
                  <span className="font-medium">Chat Online (WhatsApp)</span>
                </a>
                <a href="mailto:suporte@fluxeat.com" className="flex items-center gap-3 bg-white p-3 rounded-lg border border-blue-100 text-blue-800 hover:shadow-md transition-all">
                  <div className="bg-blue-100 p-2 rounded-full"><HelpCircle size={18} /></div>
                  <span className="font-medium">suporte@fluxeat.com</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* --- TICKETS SECTION --- */}
        {activeTab === 'TICKETS' && (
          <TicketsClient />
        )}

      </main>
    </div>
  );
};
