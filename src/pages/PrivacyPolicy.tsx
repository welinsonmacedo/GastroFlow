
import React from 'react';
import { LandingNavbar } from '../components/LandingNavbar';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto bg-white text-slate-900 font-sans">
      <LandingNavbar />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-extrabold mb-8 text-slate-900">Política de Privacidade</h1>
        <p className="text-slate-500 mb-8">Última atualização: 01 de Janeiro de 2026</p>

        <div className="space-y-8 text-slate-700 leading-relaxed">
            <section>
                <h2 className="text-2xl font-bold mb-4 text-slate-800">1. Introdução</h2>
                <p>
                    O ArloFlux ("nós", "nosso" ou "plataforma") respeita a sua privacidade e está comprometido em proteger os dados pessoais que você compartilha conosco. Esta política descreve como coletamos, usamos e protegemos suas informações ao utilizar nosso sistema de gestão para restaurantes.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold mb-4 text-slate-800">2. Coleta de Dados</h2>
                <p className="mb-2">Coletamos os seguintes tipos de informações:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Informações do Restaurante:</strong> Nome, endereço, e-mail de contato e dados do proprietário necessários para o cadastro e faturamento.</li>
                    <li><strong>Dados de Uso:</strong> Informações sobre como você interage com o sistema, incluindo pedidos processados, itens de menu e registros de transações.</li>
                    <li><strong>Dados de Clientes Finais:</strong> Apenas os dados estritamente necessários para o processamento de pedidos (ex: nome na mesa) são processados temporariamente.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-2xl font-bold mb-4 text-slate-800">3. Uso das Informações</h2>
                <p>Utilizamos seus dados para:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li>Fornecer e manter o serviço ArloFlux operacional.</li>
                    <li>Processar pagamentos e gerenciar assinaturas.</li>
                    <li>Melhorar a experiência do usuário e desenvolver novas funcionalidades.</li>
                    <li>Enviar comunicações importantes sobre atualizações do sistema ou segurança.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-2xl font-bold mb-4 text-slate-800">4. Compartilhamento de Dados</h2>
                <p>
                    Não vendemos seus dados pessoais. Podemos compartilhar informações apenas com prestadores de serviços terceirizados essenciais para a operação (como processadores de pagamento e hospedagem em nuvem), que são obrigados a manter a confidencialidade dos dados.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold mb-4 text-slate-800">5. Segurança</h2>
                <p>
                    Implementamos medidas de segurança robustas, incluindo criptografia e controles de acesso, para proteger suas informações contra acesso não autorizado, alteração ou destruição.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold mb-4 text-slate-800">6. Seus Direitos</h2>
                <p>
                    Você tem o direito de acessar, corrigir ou solicitar a exclusão de seus dados pessoais armazenados em nossa plataforma. Para exercer esses direitos, entre em contato através do nosso suporte.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold mb-4 text-slate-800">7. Contato</h2>
                <p>
                    Se tiver dúvidas sobre esta Política de Privacidade, entre em contato conosco pelo e-mail: privacidade@fluxeat.com.
                </p>
            </section>
        </div>
      </main>

      <footer className="bg-slate-50 border-t border-slate-200 py-8 mt-12">
          <div className="max-w-4xl mx-auto px-4 text-center text-slate-500 text-sm">
              &copy; 2026 ArloFlux Systems. Todos os direitos reservados.
          </div>
      </footer>
    </div>
  );
};
