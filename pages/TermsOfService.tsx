import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <nav className="sticky top-0 bg-white/90 backdrop-blur-md z-40 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors font-medium">
                <ArrowLeft size={20} /> Voltar para Home
            </Link>
            <div className="flex items-center gap-2 font-bold text-blue-700">
                <FileText /> GastroFlow
            </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-extrabold mb-8 text-slate-900">Termos de Uso</h1>
        <p className="text-slate-500 mb-8">Última atualização: 01 de Janeiro de 2026</p>

        <div className="space-y-8 text-slate-700 leading-relaxed">
            <section>
                <h2 className="text-2xl font-bold mb-4 text-slate-800">1. Aceitação dos Termos</h2>
                <p>
                    Ao acessar ou utilizar a plataforma GastroFlow, você concorda em cumprir estes Termos de Uso e todas as leis e regulamentos aplicáveis. Se você não concordar com algum destes termos, está proibido de usar ou acessar este site.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold mb-4 text-slate-800">2. Descrição do Serviço</h2>
                <p>
                    O GastroFlow é um software como serviço (SaaS) destinado à gestão de restaurantes, oferecendo funcionalidades como cardápio digital, sistema de pedidos (KDS) e gestão financeira. Reservamo-nos o direito de modificar ou descontinuar qualquer aspecto do serviço a qualquer momento.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold mb-4 text-slate-800">3. Contas e Responsabilidade</h2>
                <p>
                    Você é responsável por manter a confidencialidade das credenciais da sua conta e por todas as atividades que ocorram sob sua conta. Você concorda em notificar-nos imediatamente sobre qualquer uso não autorizado de sua conta. O GastroFlow não se responsabiliza por perdas decorrentes do uso não autorizado de sua conta.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold mb-4 text-slate-800">4. Assinaturas e Pagamentos</h2>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Alguns serviços são oferecidos mediante pagamento de assinatura (Planos Pro e Enterprise).</li>
                    <li>Os pagamentos são recorrentes e cobrados antecipadamente.</li>
                    <li>O cancelamento pode ser feito a qualquer momento, interrompendo a renovação automática para o ciclo seguinte, sem reembolso do período já pago.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-2xl font-bold mb-4 text-slate-800">5. Uso Proibido</h2>
                <p>Você concorda em não:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li>Usar o serviço para qualquer finalidade ilegal.</li>
                    <li>Tentar violar a segurança do sistema ou acessar dados de outros usuários.</li>
                    <li>Revender ou explorar comercialmente o serviço sem autorização expressa.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-2xl font-bold mb-4 text-slate-800">6. Limitação de Responsabilidade</h2>
                <p>
                    Em nenhuma circunstância o GastroFlow ou seus fornecedores serão responsáveis por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucro, ou devido a interrupção dos negócios) decorrentes do uso ou da incapacidade de usar nossos serviços.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold mb-4 text-slate-800">7. Alterações nos Termos</h2>
                <p>
                    O GastroFlow pode revisar estes termos de serviço a qualquer momento, sem aviso prévio. Ao usar este site, você concorda em ficar vinculado à versão atual desses Termos de Uso.
                </p>
            </section>
        </div>
      </main>

      <footer className="bg-slate-50 border-t border-slate-200 py-8 mt-12">
          <div className="max-w-4xl mx-auto px-4 text-center text-slate-500 text-sm">
              &copy; 2026 GastroFlow Systems. Todos os direitos reservados.
          </div>
      </footer>
    </div>
  );
};