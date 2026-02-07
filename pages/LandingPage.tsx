import React from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, CheckCircle, Smartphone, BarChart3, Globe, ShieldCheck } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b sticky top-0 bg-white z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-2xl">
              <ChefHat size={32} /> GastroFlow
            </div>
            <div className="flex gap-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900 px-3 py-2 font-medium">
                Entrar
              </Link>
              <button className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Experimentar Grátis
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
              A revolução digital para o seu restaurante
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Cardápio QR Code, Pedidos na Cozinha (KDS), Gestão de Garçons e Caixa. Tudo em um único sistema, simples e rápido.
            </p>
            <div className="flex justify-center gap-4">
               <Link to="/login" className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all">
                  Acessar Sistema
               </Link>
               <button className="bg-white text-blue-600 border border-blue-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors">
                  Ver Planos
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <h2 className="text-blue-600 font-bold tracking-wide uppercase text-sm">Funcionalidades</h2>
                <p className="mt-2 text-3xl font-extrabold text-gray-900">Tudo que você precisa para crescer</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                <FeatureCard 
                    icon={<Smartphone className="text-blue-500" size={40}/>}
                    title="Cardápio Digital QR"
                    desc="Seus clientes fazem pedidos direto pelo celular. Sem filas, sem espera e com fotos incríveis."
                />
                <FeatureCard 
                    icon={<BarChart3 className="text-purple-500" size={40}/>}
                    title="Gestão em Tempo Real"
                    desc="Acompanhe vendas, pedidos na cozinha e produtividade dos garçons em tempo real."
                />
                <FeatureCard 
                    icon={<ShieldCheck className="text-green-500" size={40}/>}
                    title="Controle Total"
                    desc="Auditoria de ações, níveis de acesso (Garçom, Cozinha, Caixa) e segurança financeira."
                />
            </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-extrabold">Planos para todos os tamanhos</h2>
                <p className="mt-4 text-slate-400">Escolha o melhor plano para o seu negócio.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
                <PricingCard 
                    title="Starter" 
                    price="R$ 0" 
                    features={['Até 5 mesas', 'Cardápio Digital', '1 Usuário']}
                />
                <PricingCard 
                    title="Pro" 
                    price="R$ 99" 
                    isPopular 
                    features={['Mesas Ilimitadas', 'KDS (Cozinha)', 'Gestão de Estoque', '5 Usuários']}
                />
                <PricingCard 
                    title="Enterprise" 
                    price="R$ 249" 
                    features={['Múltiplas Filiais', 'API de Integração', 'Suporte 24/7', 'Usuários Ilimitados']}
                />
            </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white py-12 border-t">
         <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
            <div className="flex items-center justify-center gap-2 mb-4 font-bold text-gray-800 text-xl">
                 <ChefHat /> GastroFlow
            </div>
            <p>&copy; 2024 GastroFlow Systems. Todos os direitos reservados.</p>
         </div>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{icon: React.ReactNode, title: string, desc: string}> = ({ icon, title, desc }) => (
    <div className="p-8 bg-gray-50 rounded-2xl hover:shadow-lg transition-shadow border border-gray-100">
        <div className="mb-4">{icon}</div>
        <h3 className="text-xl font-bold mb-2 text-gray-800">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{desc}</p>
    </div>
);

const PricingCard: React.FC<{title: string, price: string, features: string[], isPopular?: boolean}> = ({ title, price, features, isPopular }) => (
    <div className={`p-8 rounded-2xl border ${isPopular ? 'bg-blue-600 border-blue-600 text-white transform scale-105 shadow-xl' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <div className="text-4xl font-bold mb-6">{price} <span className="text-sm font-normal opacity-70">/mês</span></div>
        <ul className="space-y-4 mb-8">
            {features.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                    <CheckCircle size={18} className={isPopular ? 'text-blue-200' : 'text-blue-500'} /> {f}
                </li>
            ))}
        </ul>
        <button className={`w-full py-3 rounded-lg font-bold transition-colors ${isPopular ? 'bg-white text-blue-600 hover:bg-gray-100' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>
            Começar Agora
        </button>
    </div>
);