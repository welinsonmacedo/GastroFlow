
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, CheckCircle, Smartphone, BarChart3, ShieldCheck, MessageCircle, ArrowRight, Star, Send, LogIn, Zap, MonitorPlay, LayoutDashboard, QrCode, Package, Users, DollarSign, Truck } from 'lucide-react';
import { useSaaS } from '../context/SaaSContext';
import { Plan } from '../types';
import { LandingNavbar } from '../components/LandingNavbar';

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-shadow flex flex-col items-center text-center h-full">
    <div className="bg-green-50 p-4 rounded-full mb-4 md:mb-6">
      {icon}
    </div>
    <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-3">{title}</h3>
    <p className="text-slate-500 text-sm md:text-base leading-relaxed">{desc}</p>
  </div>
);

const ModuleCard = ({ icon, title, items, colorClass }: { icon: React.ReactNode, title: string, items: string[], colorClass: string }) => (
    <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 flex flex-col h-full hover:-translate-y-1 transition-transform duration-300">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorClass} text-white shadow-lg`}>
            {icon}
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-3">{title}</h3>
        <ul className="space-y-2">
            {items.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                    <div className={`w-1.5 h-1.5 rounded-full ${colorClass}`}></div>
                    {item}
                </li>
            ))}
        </ul>
    </div>
);

const ContactForm = ({ whatsappNumber }: { whatsappNumber: string }) => {
  const [form, setForm] = useState({ name: '', restaurant: '', phone: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = encodeURIComponent(`Olá! Me chamo ${form.name}, do restaurante ${form.restaurant}. Gostaria de mais informações sobre o Flux Eat. Meu contato: ${form.phone}`);
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Seu Nome</label>
        <input 
          required 
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
          placeholder="Ex: João Silva"
          value={form.name}
          onChange={e => setForm({...form, name: e.target.value})}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Restaurante</label>
        <input 
          required 
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
          placeholder="Ex: Bistro do João"
          value={form.restaurant}
          onChange={e => setForm({...form, restaurant: e.target.value})}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp / Telefone</label>
        <input 
          required 
          type="tel"
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
          placeholder="(00) 00000-0000"
          value={form.phone}
          onChange={e => setForm({...form, phone: e.target.value})}
        />
      </div>
      <button 
        type="submit" 
        className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2 mt-4"
      >
        <Send size={18} /> Solicitar Contato
      </button>
    </form>
  );
};

const PricingCard: React.FC<{ plan: Plan, onClick: () => void }> = ({ plan, onClick }) => {
    const dynamicFeatures = [];
    if (plan.limits?.allowTableMgmt) dynamicFeatures.push("Gestão de Mesas & QR Code");
    if (plan.limits?.allowKds) dynamicFeatures.push("KDS (Tela de Cozinha)");
    if (plan.limits?.allowCashier) dynamicFeatures.push("Frente de Caixa (PDV)");
    if (plan.limits?.allowInventory) dynamicFeatures.push("Controle de Estoque & Fichas");
    if (plan.limits?.allowPurchases) dynamicFeatures.push("Gestão de Compras");
    if (plan.limits?.allowExpenses) dynamicFeatures.push("Financeiro (DRE)");
    if (plan.limits?.allowStaff) dynamicFeatures.push("Gestão de Equipe");
    
    const limitsDesc = [
        plan.limits?.maxTables === -1 ? "Mesas Ilimitadas" : `Até ${plan.limits?.maxTables} Mesas`,
        plan.limits?.maxProducts === -1 ? "Produtos Ilimitados" : `Até ${plan.limits?.maxProducts} Produtos`,
    ];

    const allFeatures = [...limitsDesc, ...dynamicFeatures, ...(plan.features || [])];
    const uniqueFeatures = Array.from(new Set(allFeatures));

    return (
      <div className={`relative bg-white rounded-2xl p-8 border flex flex-col ${plan.is_popular ? 'border-green-500 shadow-2xl scale-100 md:scale-105 z-10' : 'border-slate-200 shadow-sm'}`}>
        {plan.is_popular && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg whitespace-nowrap">
            Mais Popular
          </div>
        )}
        <div className="text-center mb-8">
          <h3 className="text-lg font-bold text-slate-600 mb-2">{plan.name}</h3>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
            <span className="text-slate-500 text-sm">{plan.period}</span>
          </div>
        </div>
        <ul className="space-y-4 mb-8 flex-1">
          {uniqueFeatures.map((feature: string, idx: number) => (
            <li key={idx} className="flex items-start gap-3 text-sm text-slate-600">
              <CheckCircle className="text-green-500 shrink-0" size={18} />
              {feature}
            </li>
          ))}
        </ul>
        <button 
          onClick={onClick}
          className={`w-full py-4 rounded-xl font-bold transition-all ${plan.is_popular ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-500/30' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          {plan.button_text}
        </button>
      </div>
    );
};

export const LandingPage: React.FC = () => {
  const { state } = useSaaS();
  const whatsappNumber = "5534991448794";
  const defaultMessage = encodeURIComponent("Olá! Gostaria de conhecer melhor os planos do Flux Eat.");

  const openWhatsApp = () => {
    window.open(`https://wa.me/${whatsappNumber}?text=${defaultMessage}`, '_blank');
  };

  const displayPlans = state.plans.length > 0 ? state.plans : [
      { id: '1', key: 'FREE', name: 'Plano Start', price: 'Grátis', features: ['Até 10 Mesas', 'Cardápio Digital'], is_popular: false, button_text: 'Começar Agora', period: 'sempre', limits: { maxTables:10, maxProducts:30, maxStaff:2, allowKds:false, allowCashier:false } }
  ];

  return (
    <div className="h-full overflow-y-auto bg-white font-sans text-slate-900 relative overflow-x-hidden">
      
      {/* --- Floating WhatsApp Button --- */}
      <button 
        onClick={openWhatsApp}
        className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-110 flex items-center gap-2 animate-bounce-slow"
        title="Falar no WhatsApp"
      >
        <MessageCircle size={28} />
      </button>

      {/* --- Navbar (Reutilizável) --- */}
      <LandingNavbar />

      {/* --- Hero Section --- */}
      <div className="relative bg-slate-900 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#22c55e 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-500 rounded-full blur-[120px] opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-green-500 rounded-full blur-[120px] opacity-20 transform -translate-x-1/2 translate-y-1/2"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-32 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6 md:mb-8 shadow-xl">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs md:text-sm font-bold text-green-400 tracking-wide uppercase">Sistema nº 1 para Restaurantes</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6 md:mb-8 leading-tight">
            Automatize seu restaurante com <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">
              Flux Eat
            </span>
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-slate-300 mb-8 md:mb-10 max-w-2xl font-medium tracking-tight">
            Onde gestão e vendas acontecem sem parar.
          </p>
          <p className="text-slate-400 mb-8 md:mb-10 max-w-xl text-sm leading-relaxed px-2">
            Elimine erros na cozinha, agilize o atendimento com QR Code e tenha controle total do seu caixa em uma única plataforma intuitiva.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center px-4 sm:px-0">
             <button 
                onClick={openWhatsApp}
                className="w-full sm:w-auto bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-green-500 shadow-lg shadow-green-600/25 transition-all flex items-center justify-center gap-2 hover:scale-105"
             >
                <MessageCircle size={20} /> Experimentar Grátis
             </button>
             <a 
                href="#contact"
                className="w-full sm:w-auto bg-white/5 backdrop-blur-md text-white border border-white/10 px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2"
             >
                Ver Demonstração <ArrowRight size={20} />
             </a>
          </div>

          <div className="mt-12 md:mt-16 flex flex-wrap justify-center gap-4 sm:gap-12 text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-wider px-2">
             <div className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Instalação Imediata</div>
             <div className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Suporte Humanizado</div>
             <div className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Sem Fidelidade</div>
          </div>
        </div>
      </div>

      {/* --- Features --- */}
      <div id="features" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 md:mb-16">
                <h2 className="text-green-600 font-bold tracking-wide uppercase text-sm mb-2">Funcionalidades</h2>
                <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900">Tecnologia de ponta a ponta</p>
                <p className="mt-4 text-slate-500 max-w-2xl mx-auto text-sm md:text-base">Tudo o que você precisa para operar com eficiência máxima, do pedido à entrega.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                <FeatureCard 
                    icon={<Smartphone className="text-green-600" size={32}/>}
                    title="Cardápio Digital QR"
                    desc="Seus clientes leem o QR Code, fazem o pedido e ele aparece direto na cozinha. Reduza garçons e aumente o ticket médio."
                />
                <FeatureCard 
                    icon={<BarChart3 className="text-blue-600" size={32}/>}
                    title="KDS (Tela de Cozinha)"
                    desc="Substitua as impressoras barulhentas por telas organizadas. Acompanhe o tempo de preparo e elimine erros."
                />
                <FeatureCard 
                    icon={<ShieldCheck className="text-emerald-600" size={32}/>}
                    title="Gestão Financeira"
                    desc="Fechamento de caixa, relatórios de vendas, auditoria de funcionários e gestão de lucros em tempo real."
                />
            </div>
        </div>
      </div>

      {/* --- NEW: VISUAL MODULES SHOWCASE (FIGURES) --- */}
      <div id="modules" className="py-16 md:py-24 bg-slate-50 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center mb-8 md:mb-16">
                  <div className="md:w-1/2 text-center md:text-left">
                      <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4">
                          <LayoutDashboard size={14} /> Sistema Modular
                      </div>
                      <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-4 md:mb-6">
                          Gestão Completa e Integrada
                      </h2>
                      <p className="text-base md:text-lg text-slate-600 leading-relaxed">
                          Não é apenas um cardápio digital. O <strong>Flux Eat</strong> é um ERP completo modular. Você ativa apenas o que precisa, mantendo o sistema limpo e eficiente.
                      </p>
                  </div>
                  <div className="md:w-1/2 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <ModuleCard 
                          icon={<Package size={24} />}
                          title="Estoque & Fichas"
                          colorClass="bg-orange-500"
                          items={["Controle de Insumos", "Ficha Técnica de Pratos", "Baixa Automática", "Alertas de Nível Mínimo"]}
                      />
                      <ModuleCard 
                          icon={<DollarSign size={24} />}
                          title="Financeiro"
                          colorClass="bg-green-600"
                          items={["Contas a Pagar", "Fluxo de Caixa", "DRE Simplificado", "Gestão de Lucro"]}
                      />
                      <ModuleCard 
                          icon={<Truck size={24} />}
                          title="Compras"
                          colorClass="bg-blue-600"
                          items={["Gestão de Fornecedores", "Entrada de Nota Fiscal", "Histórico de Preços", "Sugestão de Compra"]}
                      />
                      <ModuleCard 
                          icon={<Users size={24} />}
                          title="Equipe"
                          colorClass="bg-purple-600"
                          items={["Controle de Acesso", "Metas e Comissões", "Auditoria de Ações", "Escala de Trabalho"]}
                      />
                  </div>
              </div>
          </div>
      </div>

      {/* --- Visual Showcase Section (Illustrations) --- */}
      <div className="py-16 md:py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20 md:space-y-32">
            
            {/* Block 1: QR Code Illustration */}
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
                <div className="lg:w-1/2 relative flex justify-center items-center group w-full">
                    {/* Background Blob */}
                    <div className="absolute inset-0 bg-green-100 rounded-full blur-3xl opacity-60 scale-75 md:scale-90 group-hover:scale-100 transition-transform duration-1000"></div>
                    {/* Phone Mockup Illustration */}
                    <div className="relative bg-white rounded-[2.5rem] md:rounded-[3rem] border-4 md:border-8 border-slate-900 shadow-2xl h-[400px] md:h-[450px] w-[220px] md:w-[260px] flex flex-col overflow-hidden transform hover:-translate-y-2 transition-transform duration-500 max-w-full z-10">
                        {/* Notch */}
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-5 w-24 md:h-6 md:w-32 bg-slate-900 rounded-b-xl z-20"></div>
                        {/* Screen Content */}
                        <div className="bg-slate-50 flex-1 flex flex-col items-center justify-center p-6 relative">
                            <div className="absolute top-10 w-16 h-2 bg-slate-200 rounded-full mb-8"></div>
                            <QrCode size={100} className="text-slate-900 mb-6 md:size-[120px]" strokeWidth={1.5} />
                            <div className="w-full h-3 bg-green-100 rounded-full mb-2"></div>
                            <div className="w-2/3 h-3 bg-slate-200 rounded-full mb-8"></div>
                            <button className="bg-green-600 text-white rounded-lg px-6 py-2 text-sm font-bold shadow-lg shadow-green-200">Ver Cardápio</button>
                        </div>
                    </div>
                </div>
                <div className="lg:w-1/2 text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4">
                        <Zap size={14} /> Autoatendimento
                    </div>
                    <h3 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-4 md:mb-6">O cliente pede, você fatura.</h3>
                    <p className="text-base md:text-lg text-slate-600 mb-6 leading-relaxed">
                        Esqueça cardápios de papel engordurados. Com nosso sistema de QR Code, seu cliente acessa fotos reais dos pratos, personaliza o pedido e envia direto para a produção.
                    </p>
                    <ul className="space-y-3 inline-block text-left">
                        <li className="flex items-center gap-3 text-slate-700 font-medium text-sm md:text-base"><CheckCircle className="text-green-500 shrink-0" size={20}/> Cardápio sempre atualizado</li>
                        <li className="flex items-center gap-3 text-slate-700 font-medium text-sm md:text-base"><CheckCircle className="text-green-500 shrink-0" size={20}/> Aumento de 20% no ticket médio</li>
                        <li className="flex items-center gap-3 text-slate-700 font-medium text-sm md:text-base"><CheckCircle className="text-green-500 shrink-0" size={20}/> Redução na fila de espera</li>
                    </ul>
                </div>
            </div>

            {/* Block 2: KDS Illustration (Reverse Layout on Desktop) */}
            <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-24">
                <div className="lg:w-1/2 relative flex justify-center items-center group w-full">
                    <div className="absolute inset-0 bg-blue-100 rounded-full blur-3xl opacity-60 scale-90 group-hover:scale-100 transition-transform duration-1000"></div>
                    {/* Monitor Illustration */}
                    <div className="relative bg-slate-900 rounded-xl md:rounded-2xl p-2 shadow-2xl w-full max-w-[320px] md:max-w-md transform hover:-translate-y-2 transition-transform duration-500 z-10">
                        <div className="bg-slate-800 rounded-lg md:rounded-xl overflow-hidden border border-slate-700 h-[200px] md:h-[280px] relative flex">
                            {/* Sidebar */}
                            <div className="w-12 md:w-16 bg-slate-900 border-r border-slate-700 flex flex-col items-center py-4 gap-4">
                                <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-600 rounded-lg flex items-center justify-center"><ChefHat size={16} className="text-white"/></div>
                                <div className="w-6 h-6 md:w-8 md:h-8 bg-slate-700 rounded-lg"></div>
                                <div className="w-6 h-6 md:w-8 md:h-8 bg-slate-700 rounded-lg"></div>
                            </div>
                            {/* Main KDS Area */}
                            <div className="flex-1 p-3 md:p-4 flex gap-2 md:gap-3 overflow-hidden">
                                <div className="w-1/2 bg-slate-700 rounded-lg p-2 border-l-4 border-yellow-500">
                                    <div className="flex justify-between mb-2">
                                        <div className="w-10 md:w-12 h-2 md:h-3 bg-slate-500 rounded"></div>
                                        <div className="w-6 md:w-8 h-2 md:h-3 bg-slate-600 rounded"></div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="w-full h-1.5 md:h-2 bg-slate-600 rounded"></div>
                                        <div className="w-2/3 h-1.5 md:h-2 bg-slate-600 rounded"></div>
                                        <div className="w-3/4 h-1.5 md:h-2 bg-yellow-900/50 rounded border border-yellow-700/50"></div>
                                    </div>
                                </div>
                                <div className="w-1/2 bg-slate-700 rounded-lg p-2 border-l-4 border-green-500 opacity-75">
                                    <div className="flex justify-between mb-2">
                                        <div className="w-10 md:w-12 h-2 md:h-3 bg-slate-500 rounded"></div>
                                        <div className="w-6 md:w-8 h-2 md:h-3 bg-green-900 text-green-400 text-[6px] md:text-[8px] flex items-center justify-center font-bold px-1 rounded">PRONTO</div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="w-full h-1.5 md:h-2 bg-slate-600 rounded"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Monitor Stand */}
                        <div className="absolute -bottom-4 md:-bottom-6 left-1/2 transform -translate-x-1/2 w-16 md:w-24 h-4 md:h-6 bg-slate-800 rounded-b-lg"></div>
                        <div className="absolute -bottom-5 md:-bottom-8 left-1/2 transform -translate-x-1/2 w-32 md:w-40 h-1.5 md:h-2 bg-slate-900 rounded-full shadow-lg"></div>
                    </div>
                </div>
                <div className="lg:w-1/2 text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4">
                        <MonitorPlay size={14} /> KDS - Tela de Cozinha
                    </div>
                    <h3 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-4 md:mb-6">Cozinha sem caos, pratos no ponto.</h3>
                    <p className="text-base md:text-lg text-slate-600 mb-6 leading-relaxed">
                        Chega de gritaria e papeizinhos perdidos. O KDS organiza os pedidos por ordem de chegada e tempo de preparo, garantindo que nada atrase.
                    </p>
                    <ul className="space-y-3 inline-block text-left">
                        <li className="flex items-center gap-3 text-slate-700 font-medium text-sm md:text-base"><CheckCircle className="text-green-500 shrink-0" size={20}/> Zero erros de comunicação</li>
                        <li className="flex items-center gap-3 text-slate-700 font-medium text-sm md:text-base"><CheckCircle className="text-green-500 shrink-0" size={20}/> Alertas de atraso</li>
                        <li className="flex items-center gap-3 text-slate-700 font-medium text-sm md:text-base"><CheckCircle className="text-green-500 shrink-0" size={20}/> Sustentável e econômico</li>
                    </ul>
                </div>
            </div>

        </div>
      </div>

      {/* --- Lead Form Section --- */}
      <div id="contact" className="py-16 md:py-24 bg-slate-50 border-y border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-slate-100">
                <div className="bg-slate-900 p-8 md:w-2/5 flex flex-col justify-between text-white">
                    <div>
                        <h3 className="text-2xl font-bold mb-4">Vamos crescer juntos?</h3>
                        <p className="text-slate-400 mb-6 text-sm">Preencha o formulário e um especialista entrará em contato para liberar seu acesso demonstração.</p>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-2"><Star size={18} className="fill-yellow-400 text-yellow-400"/> Satisfação Garantida</li>
                            <li className="flex items-center gap-2"><Star size={18} className="fill-yellow-400 text-yellow-400"/> +500 Restaurantes</li>
                        </ul>
                    </div>
                    <div className="mt-8">
                        <p className="text-sm text-slate-500 uppercase font-bold mb-2">Contato Direto</p>
                        <p className="text-xl font-bold text-green-400">(34) 99144-8794</p>
                    </div>
                </div>

                <div className="p-6 md:p-8 md:w-3/5">
                    <ContactForm whatsappNumber={whatsappNumber} />
                </div>
            </div>
        </div>
      </div>

      {/* --- Pricing --- */}
      <div id="pricing" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 md:mb-16">
                <h2 className="text-3xl font-extrabold text-slate-900">Planos flexíveis</h2>
                <p className="mt-4 text-slate-500">Comece pequeno e cresça com o Flux Eat.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {displayPlans.map(plan => (
                    <PricingCard 
                        key={plan.id}
                        plan={plan}
                        onClick={openWhatsApp}
                    />
                ))}
            </div>
        </div>
      </div>

      {/* --- Footer --- */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
         <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 font-bold text-white text-xl">
                 <ChefHat className="text-green-500"/> Flux Eat
            </div>
            <div className="text-sm">
                &copy; 2026 Flux Eat Systems. Todos os direitos reservados.
            </div>
            <div className="flex gap-4 justify-center md:justify-end">
                <Link to="/terms" className="hover:text-white transition-colors">Termos</Link>
                <Link to="/privacy" className="hover:text-white transition-colors">Privacidade</Link>
            </div>
         </div>
      </footer>
    </div>
  );
};
