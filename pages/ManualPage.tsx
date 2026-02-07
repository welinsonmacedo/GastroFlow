import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChefHat, Coffee, DollarSign, Settings, 
  ArrowRight, CheckCircle, Bell, QrCode, 
  Monitor, Smartphone, Play, Check, AlertTriangle,
  ArrowLeft, BookOpen, Users, LayoutDashboard
} from 'lucide-react';

const RoleCard = ({ icon, title, color, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left mb-3
      ${active 
        ? `bg-${color}-50 border-${color}-500 shadow-md` 
        : 'bg-white border-gray-100 hover:bg-gray-50'
      }`}
  >
    <div className={`p-3 rounded-full ${active ? `bg-${color}-500 text-white` : `bg-gray-100 text-gray-500`}`}>
      {icon}
    </div>
    <div>
      <h3 className={`font-bold ${active ? `text-${color}-700` : 'text-gray-700'}`}>{title}</h3>
      <p className="text-xs text-gray-500">Clique para ver o guia</p>
    </div>
    <div className="ml-auto">
      <ArrowRight size={16} className={active ? `text-${color}-500` : 'text-gray-300'} />
    </div>
  </button>
);

const Step = ({ number, title, desc, icon }: any) => (
  <div className="flex gap-4 mb-8 relative">
    <div className="flex flex-col items-center">
      <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 z-10">
        {number}
      </div>
      <div className="w-0.5 h-full bg-slate-200 absolute top-8 bottom-[-10px] -z-0"></div>
    </div>
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex-1">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-bold text-lg text-slate-800">{title}</h4>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
    </div>
  </div>
);

export const ManualPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'WAITER' | 'KITCHEN' | 'CASHIER' | 'ADMIN'>('WAITER');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-80 bg-white border-r border-slate-200 p-6 flex-shrink-0 h-auto md:h-screen overflow-y-auto sticky top-0">
        <div className="flex items-center gap-2 mb-8 text-blue-700 font-extrabold text-xl">
          <Link to="/login" className="p-2 hover:bg-blue-50 rounded-full transition-colors mr-2">
            <ArrowLeft size={20} />
          </Link>
          <BookOpen size={24} /> Manual GastroFlow
        </div>

        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Módulos</div>
          
          <RoleCard 
            icon={<Coffee size={20} />} 
            title="Garçom & Salão" 
            color="orange" 
            active={activeTab === 'WAITER'} 
            onClick={() => setActiveTab('WAITER')}
          />
          
          <RoleCard 
            icon={<Monitor size={20} />} 
            title="Cozinha (KDS)" 
            color="red" 
            active={activeTab === 'KITCHEN'} 
            onClick={() => setActiveTab('KITCHEN')}
          />
          
          <RoleCard 
            icon={<DollarSign size={20} />} 
            title="Caixa & Pagamentos" 
            color="green" 
            active={activeTab === 'CASHIER'} 
            onClick={() => setActiveTab('CASHIER')}
          />
          
          <RoleCard 
            icon={<Settings size={20} />} 
            title="Gestão & Admin" 
            color="blue" 
            active={activeTab === 'ADMIN'} 
            onClick={() => setActiveTab('ADMIN')}
          />
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <h4 className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2">
            <Smartphone size={16} /> App do Cliente
          </h4>
          <p className="text-xs text-blue-600 mb-2">
            O cliente acessa lendo o QR Code da mesa. Ele pode ver o cardápio, fazer pedidos e chamar o garçom sem instalar nada.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        
        {/* --- WAITER SECTION --- */}
        {activeTab === 'WAITER' && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            <header className="mb-10 border-b pb-6">
              <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4">
                <Coffee size={14} /> Módulo Garçom
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-4">Fluxo de Atendimento</h1>
              <p className="text-lg text-slate-500">
                Como abrir mesas, lançar pedidos e gerenciar o salão de forma eficiente.
              </p>
            </header>

            <Step 
              number="1"
              title="Abrir Mesa"
              desc="Na tela inicial, você verá todas as mesas. Mesas cinzas estão LIVRES. Toque em uma mesa livre, digite o nome do cliente (ex: 'João') e o sistema gerará um código de 4 dígitos. Entregue este código ao cliente caso ele queira pedir pelo próprio celular."
              icon={<Smartphone className="text-orange-500" />}
            />

            <Step 
              number="2"
              title="Lançar Pedidos"
              desc="Se o cliente preferir que você anote: Toque em uma mesa OCUPADA (Azul) e selecione 'Fazer Pedido'. Navegue pelas categorias, selecione os itens e adicione observações (ex: 'sem cebola'). Toque em 'Enviar Pedido' para mandar para a cozinha."
              icon={<CheckCircle className="text-blue-500" />}
            />

            <Step 
              number="3"
              title="Acompanhar Entregas"
              desc="No lado direito da tela (ou abaixo no celular), você vê a lista 'Para Servir'. Quando a cozinha finaliza um prato ou o bar prepara uma bebida, o item aparece aqui. Entregue ao cliente e clique em 'Marcar Entregue'."
              icon={<Bell className="text-yellow-500" />}
            />

            <Step 
              number="4"
              title="Atender Chamados"
              desc="Se um cliente chamar pelo app, a mesa ficará VERMELHA e pulsando, e um som tocará. Toque na mesa para confirmar que está indo atender."
              icon={<AlertTriangle className="text-red-500" />}
            />
          </div>
        )}

        {/* --- KITCHEN SECTION --- */}
        {activeTab === 'KITCHEN' && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            <header className="mb-10 border-b pb-6">
              <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4">
                <Monitor size={14} /> Módulo Cozinha (KDS)
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-4">Tela de Produção</h1>
              <p className="text-lg text-slate-500">
                Substitua as impressoras por telas inteligentes. Organize a fila de pedidos e controle o tempo.
              </p>
            </header>

            <div className="bg-slate-900 text-white p-6 rounded-2xl mb-8 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <ChefHat className="text-yellow-500" size={32} />
                <h3 className="text-xl font-bold">Conceito do KDS</h3>
              </div>
              <p className="text-slate-300 mb-4">
                O KDS (Kitchen Display System) organiza os pedidos por ordem de chegada. Não é necessário atualizar a página; os pedidos aparecem em tempo real com um aviso sonoro.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-800 p-3 rounded border-l-4 border-yellow-500">
                  <span className="font-bold text-yellow-500 block mb-1">AMARELO (Piscando)</span>
                  Novo pedido aguardando início.
                </div>
                <div className="bg-slate-800 p-3 rounded border-l-4 border-blue-500">
                  <span className="font-bold text-blue-400 block mb-1">AZUL</span>
                  Pedido em preparo (Fogo).
                </div>
              </div>
            </div>

            <Step 
              number="1"
              title="Iniciar Preparo"
              desc="Quando um pedido chega (cartão piscando), toque em 'INICIAR' no item. Isso muda o status para 'Preparando' e avisa o garçom e o cliente que o prato está sendo feito."
              icon={<Play size={20} />}
            />

            <Step 
              number="2"
              title="Finalizar Prato"
              desc="Assim que o prato estiver pronto para ser levado, toque em 'PRONTO'. O item sumirá da sua tela e aparecerá na lista de entrega do garçom."
              icon={<Check size={20} />}
            />

            <Step 
              number="3"
              title="Concluir Mesa Inteira"
              desc="Para agilizar, você pode clicar em 'CONCLUIR TODOS' no topo do cartão da mesa para marcar todos os itens daquele pedido como prontos de uma vez."
              icon={<CheckCircle size={20} />}
            />
          </div>
        )}

        {/* --- CASHIER SECTION --- */}
        {activeTab === 'CASHIER' && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            <header className="mb-10 border-b pb-6">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4">
                <DollarSign size={14} /> Módulo Caixa
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-4">Fechamento de Contas</h1>
              <p className="text-lg text-slate-500">
                Receba pagamentos, visualize o consumo total e libere as mesas para novos clientes.
              </p>
            </header>

            <Step 
              number="1"
              title="Selecionar Mesa"
              desc="No painel do caixa, a coluna da esquerda mostra todas as mesas ocupadas. Selecione a mesa que deseja fechar para ver o extrato completo de consumo."
              icon={<Users size={20} />}
            />

            <Step 
              number="2"
              title="Conferência"
              desc="Revise os itens consumidos com o cliente. O sistema soma automaticamente todos os pedidos feitos (pelo garçom ou pelo cliente via QR Code) que ainda não foram pagos."
              icon={<LayoutDashboard size={20} />}
            />

            <Step 
              number="3"
              title="Pagamento"
              desc="Escolha a forma de pagamento (Dinheiro, Cartão, Pix). Ao confirmar, o sistema registra a transação no financeiro, muda o status dos pedidos para 'Pago' e libera a mesa automaticamente para o próximo cliente."
              icon={<CheckCircle className="text-green-500" />}
            />

            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <h4 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                <Monitor size={16}/> Dica: Histórico
              </h4>
              <p className="text-sm text-yellow-700">
                Use a aba "Histórico de Vendas" no menu lateral do caixa para ver todas as transações do dia e conferir o total faturado caso precise fazer sangria ou fechamento de turno.
              </p>
            </div>
          </div>
        )}

        {/* --- ADMIN SECTION --- */}
        {activeTab === 'ADMIN' && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            <header className="mb-10 border-b pb-6">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4">
                <Settings size={14} /> Módulo Administrador
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-4">Gestão Completa</h1>
              <p className="text-lg text-slate-500">
                Configure seu cardápio, gerencie a equipe e acompanhe os resultados.
              </p>
            </header>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-5 rounded-xl border hover:shadow-md transition-shadow">
                    <h3 className="font-bold text-blue-700 mb-2 flex items-center gap-2"><Coffee size={18}/> Cardápio</h3>
                    <p className="text-sm text-slate-600">
                        Adicione produtos, fotos, preços e categorias. Use o "arrastar e soltar" para mudar a ordem de exibição no app do cliente.
                    </p>
                </div>
                <div className="bg-white p-5 rounded-xl border hover:shadow-md transition-shadow">
                    <h3 className="font-bold text-blue-700 mb-2 flex items-center gap-2"><QrCode size={18}/> Mesas & QR</h3>
                    <p className="text-sm text-slate-600">
                        Defina quantas mesas seu restaurante tem. O sistema gera automaticamente os QR Codes prontos para imprimir e colar nas mesas.
                    </p>
                </div>
                <div className="bg-white p-5 rounded-xl border hover:shadow-md transition-shadow">
                    <h3 className="font-bold text-blue-700 mb-2 flex items-center gap-2"><Users size={18}/> Funcionários</h3>
                    <p className="text-sm text-slate-600">
                        Cadastre sua equipe. Defina quem é Garçom, Cozinheiro ou Caixa. Cada um terá acesso apenas às telas pertinentes à sua função.
                    </p>
                </div>
                <div className="bg-white p-5 rounded-xl border hover:shadow-md transition-shadow">
                    <h3 className="font-bold text-blue-700 mb-2 flex items-center gap-2"><LayoutDashboard size={18}/> Relatórios</h3>
                    <p className="text-sm text-slate-600">
                        Acompanhe o faturamento diário, veja quais produtos vendem mais e exporte dados para controle contábil.
                    </p>
                </div>
            </div>

            <Step 
              number="!"
              title="Personalização"
              desc="Na aba 'Personalizar', você pode alterar as cores do aplicativo e fazer upload da sua logomarca para que o cardápio digital tenha a cara do seu restaurante."
              icon={<Settings size={20} />}
            />
          </div>
        )}

      </main>
    </div>
  );
};
