import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, CheckCircle, Smartphone, BarChart3, ShieldCheck, MessageCircle, ArrowRight, Star, Send } from 'lucide-react';
import { useSaaS } from '../context/SaaSContext';

export const LandingPage: React.FC = () => {
  const { state } = useSaaS();
  const whatsappNumber = "5534991448794";
  const defaultMessage = encodeURIComponent("Olá! Gostaria de conhecer melhor os planos do GastroFlow.");

  const openWhatsApp = () => {
    window.open(`https://wa.me/${whatsappNumber}?text=${defaultMessage}`, '_blank');
  };

  // Se os planos ainda não foram carregados do DB, usa um fallback visual ou espera
  const displayPlans = state.plans.length > 0 ? state.plans : [
      { id: '1', name: 'Starter', price: 'Carregando...', features: [], is_popular: false, button_text: '...', period: '' }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      
      {/* --- Floating WhatsApp Button --- */}
      <button 
        onClick={openWhatsApp}
        className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-110 flex items-center gap-2 animate-bounce-slow"
        title="Falar no WhatsApp"
      >
        <MessageCircle size={28} />
      </button>

      {/* --- Navbar --- */}
      <nav className="sticky top-0 bg-white/90 backdrop-blur-md z-40 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2 text-blue-700 font-extrabold text-2xl tracking-tighter">
              <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                <ChefHat size={24} /> 
              </div>
              GastroFlow
            </div>
            <div className="hidden md:flex gap-8 items-center">
               <a href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Funcionalidades</a>
               <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Planos</a>
               <a href="#contact" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Contato</a>
            </div>
            <div className="flex gap-4">
              <Link to="/login" className="hidden md:block text-slate-600 hover:text-blue-700 px-3 py-2 font-semibold text-sm transition-colors">
                Área do Cliente
              </Link>
              <button 
                onClick={openWhatsApp}
                className="bg-slate-900 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-slate-800 transition-all flex items-center gap-2"
              >
                <MessageCircle size={16} /> Falar com Consultor
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <div className="relative bg-slate-900 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-sm font-medium text-blue-400 tracking-wide uppercase">O sistema nº 1 para restaurantes</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight mb-8 leading-tight">
            Automatize seu restaurante <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Venda mais, trabalhe menos.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl leading-relaxed">
            Elimine erros na cozinha, agilize o atendimento com QR Code e tenha controle total do seu caixa em uma única plataforma intuitiva.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
             <button 
                onClick={openWhatsApp}
                className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-500 shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
             >
                <MessageCircle size={20} /> Experimentar Grátis
             </button>
             <a 
                href="#contact"
                className="bg-white/10 backdrop-blur-sm text-white border border-white/20 px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition-all flex items-center justify-center gap-2"
             >
                Solicitar Demonstração <ArrowRight size={20} />
             </a>
          </div>

          <div className="mt-12 flex gap-8 text-slate-500 text-sm font-medium">
             <div className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Sem taxa de adesão</div>
             <div className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Suporte 24/7</div>
             <div className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Cancelamento grátis</div>
          </div>
        </div>
      </div>

      {/* --- Features --- */}
      <div id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <h2 className="text-blue-600 font-bold tracking-wide uppercase text-sm mb-2">Funcionalidades</h2>
                <p className="text-3xl sm:text-4xl font-extrabold text-slate-900">Tecnologia de ponta a ponta</p>
                <p className="mt-4 text-slate-500 max-w-2xl mx-auto">Tudo o que você precisa para operar com eficiência máxima, do pedido à entrega.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                <FeatureCard 
                    icon={<Smartphone className="text-blue-600" size={32}/>}
                    title="Cardápio Digital QR"
                    desc="Seus clientes leem o QR Code, fazem o pedido e ele aparece direto na cozinha. Reduza garçons e aumente o ticket médio."
                />
                <FeatureCard 
                    icon={<BarChart3 className="text-purple-600" size={32}/>}
                    title="KDS (Tela de Cozinha)"
                    desc="Substitua as impressoras barulhentas por telas organizadas. Acompanhe o tempo de preparo e elimine erros."
                />
                <FeatureCard 
                    icon={<ShieldCheck className="text-green-600" size={32}/>}
                    title="Gestão Financeira"
                    desc="Fechamento de caixa, relatórios de vendas, controle de estoque e auditoria de funcionários em tempo real."
                />
            </div>
        </div>
      </div>

      {/* --- Lead Form Section --- */}
      <div id="contact" className="py-24 bg-slate-50 border-y border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
                <div className="bg-blue-700 p-8 md:w-2/5 flex flex-col justify-between text-white">
                    <div>
                        <h3 className="text-2xl font-bold mb-4">Vamos crescer juntos?</h3>
                        <p className="text-blue-100 mb-6">Preencha o formulário e um especialista entrará em contato para liberar seu acesso demonstração.</p>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-2"><Star size={18} className="fill-yellow-400 text-yellow-400"/> Satisfação Garantida</li>
                            <li className="flex items-center gap-2"><Star size={18} className="fill-yellow-400 text-yellow-400"/> +500 Restaurantes</li>
                        </ul>
                    </div>
                    <div className="mt-8">
                        <p className="text-sm text-blue-200 uppercase font-bold mb-2">Contato Direto</p>
                        <p className="text-xl font-bold">(34) 99144-8794</p>
                    </div>
                </div>

                <div className="p-8 md:w-3/5">
                    <ContactForm whatsappNumber={whatsappNumber} />
                </div>
            </div>
        </div>
      </div>

      {/* --- Pricing --- */}
      <div id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-extrabold text-slate-900">Planos flexíveis</h2>
                <p className="mt-4 text-slate-500">Comece pequeno e cresça com a gente.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {displayPlans.map(plan => (
                    <PricingCard 
                        key={plan.id}
                        title={plan.name} 
                        price={plan.price} 
                        period={plan.period}
                        features={plan.features}
                        isPopular={plan.is_popular}
                        cta={plan.button_text}
                        onClick={openWhatsApp}
                    />
                ))}
            </div>
        </div>
      </div>

      {/* --- Footer --- */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
         <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 font-bold text-white text-xl">
                 <ChefHat className="text-blue-500"/> GastroFlow
            </div>
            <div className="text-sm">
                &copy; 2024 GastroFlow Systems. Todos os direitos reservados.
            </div>
            <div className="flex gap-4">
                <a href="#" className="hover:text-white transition-colors">Termos</a>
                <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            </div>
         </div>
      </footer>
    </div>
  );
};

// --- Sub Components ---

const ContactForm: React.FC<{whatsappNumber: string}> = ({ whatsappNumber }) => {
    const [formData, setFormData] = useState({ name: '', restaurant: '', phone: '' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const text = `Olá! Meu nome é ${formData.name}, do restaurante ${formData.restaurant}. Meu telefone é ${formData.phone}. Gostaria de uma demonstração do sistema.`;
        window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Seu Nome</label>
                <input 
                    required
                    type="text" 
                    className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Ex: João Silva"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Restaurante</label>
                <input 
                    required
                    type="text" 
                    className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Ex: Bistrô do João"
                    value={formData.restaurant}
                    onChange={e => setFormData({...formData, restaurant: e.target.value})}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp / Telefone</label>
                <input 
                    required
                    type="tel" 
                    className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                />
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 mt-2">
                <Send size={18} /> Solicitar Acesso
            </button>
        </form>
    );
};

const FeatureCard: React.FC<{icon: React.ReactNode, title: string, desc: string}> = ({ icon, title, desc }) => (
    <div className="p-8 bg-slate-50 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 group">
        <div className="mb-6 p-4 bg-white rounded-xl w-fit shadow-sm group-hover:bg-blue-50 transition-colors">{icon}</div>
        <h3 className="text-xl font-bold mb-3 text-slate-900">{title}</h3>
        <p className="text-slate-600 leading-relaxed">{desc}</p>
    </div>
);

const PricingCard: React.FC<{title: string, price: string, period: string, features: string[], isPopular?: boolean, cta: string, onClick: () => void}> = ({ title, price, period, features, isPopular, cta, onClick }) => (
    <div className={`p-8 rounded-2xl border flex flex-col h-full relative ${isPopular ? 'bg-white border-blue-200 shadow-2xl scale-105 z-10' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
        {isPopular && (
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                Mais Escolhido
            </div>
        )}
        <h3 className={`text-lg font-bold mb-2 ${isPopular ? 'text-blue-600' : 'text-slate-500'}`}>{title}</h3>
        <div className="mb-6">
            <span className="text-4xl font-extrabold text-slate-900">{price}</span>
            {period && <span className="text-sm font-medium text-slate-400"> {period}</span>}
        </div>
        <ul className="space-y-4 mb-8 flex-1">
            {features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                    <CheckCircle size={18} className={isPopular ? 'text-blue-500' : 'text-slate-400'} /> 
                    <span className="text-slate-700">{f}</span>
                </li>
            ))}
        </ul>
        <button 
            onClick={onClick}
            className={`w-full py-3 rounded-xl font-bold transition-all shadow-md ${isPopular ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg' : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
        >
            {cta}
        </button>
    </div>
);
