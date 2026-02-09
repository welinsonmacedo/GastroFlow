
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, CheckCircle, Smartphone, BarChart3, ShieldCheck, MessageCircle, ArrowRight, Star, Send, Menu, X, LogIn, Zap, Monitor, LayoutDashboard, QrCode, MonitorPlay, PieChart, TrendingUp, ListChecks, Package, Users, DollarSign, Truck, Settings } from 'lucide-react';
import { useSaaS } from '../context/SaaSContext';
import { Plan } from '../types';

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-shadow flex flex-col items-center text-center h-full">
    <div className="bg-slate-50 p-4 rounded-full mb-6">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
    <p className="text-slate-500 leading-relaxed">{desc}</p>
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
    const message = encodeURIComponent(`Olá! Me chamo ${form.name}, do restaurante ${form.restaurant}. Gostaria de mais informações. Meu contato: ${form.phone}`);
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Seu Nome</label>
        <input 
          required 
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Ex: João Silva"
          value={form.name}
          onChange={e => setForm({...form, name: e.target.value})}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Restaurante</label>
        <input 
          required 
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="(00) 00000-0000"
          value={form.phone}
          onChange={e => setForm({...form, phone: e.target.value})}
        />
      </div>
      <button 
        type="submit" 
        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 mt-4"
      >
        <Send size={18} /> Solicitar Contato
      </button>
    </form>
  );
};

const PricingCard: React.FC<{ plan: Plan, onClick: () => void }> = ({ plan, onClick }) => {
    // Gera lista de features baseada nos LIMITES ativados no painel do CEO
    const dynamicFeatures = [];
    
    if (plan.limits?.allowTableMgmt) dynamicFeatures.push("Gestão de Mesas & QR Code");
    if (plan.limits?.allowKds) dynamicFeatures.push("KDS (Tela de Cozinha)");
    if (plan.limits?.allowCashier) dynamicFeatures.push("Frente de Caixa (PDV)");
    if (plan.limits?.allowInventory) dynamicFeatures.push("Controle de Estoque & Fichas");
    if (plan.limits?.allowPurchases) dynamicFeatures.push("Gestão de Compras & Fornecedores");
    if (plan.limits?.allowExpenses) dynamicFeatures.push("Financeiro (Contas a Pagar)");
    if (plan.limits?.allowStaff) dynamicFeatures.push("Gestão de Equipe & Permissões");
    if (plan.limits?.allowCustomization) dynamicFeatures.push("App Personalizável (White Label)");
    if (plan.limits?.allowReports) dynamicFeatures.push("Relatórios Gerenciais");

    // Limites numéricos
    const limitsDesc = [
        plan.limits?.maxTables === -1 ? "Mesas Ilimitadas" : `Até ${plan.limits?.maxTables} Mesas`,
        plan.limits?.maxProducts === -1 ? "Produtos Ilimitados" : `Até ${plan.limits?.maxProducts} Produtos`,
        plan.limits?.maxStaff === -1 ? "Equipe Ilimitada" : `Até ${plan.limits?.maxStaff} Funcionários`,
    ];

    // Combina tudo
    const allFeatures = [...limitsDesc, ...dynamicFeatures, ...(plan.features || [])];
    // Remove duplicatas simples
    const uniqueFeatures = Array.from(new Set(allFeatures));

    return (
      <div className={`relative bg-white rounded-2xl p-8 border flex flex-col ${plan.is_popular ? 'border-blue-500 shadow-2xl scale-105 z-10' : 'border-slate-200 shadow-sm'}`}>
        {plan.is_popular && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
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
          className={`w-full py-4 rounded-xl font-bold transition-all ${plan.is_popular ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          {plan.button_text}
        </button>
      </div>
    );
};

export const LandingPage: React.FC = () => {
  const { state } = useSaaS();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const whatsappNumber = "5534991448794";
  const defaultMessage = encodeURIComponent("Olá! Gostaria de conhecer melhor os planos do GastroFlow.");

  const openWhatsApp = () => {
    window.open(`https://wa.me/${whatsappNumber}?text=${defaultMessage}`, '_blank');
  };

  // Se os planos ainda não foram carregados do DB, usa um fallback visual ou espera
  const displayPlans = state.plans.length > 0 ? state.plans : [
      { id: '1', key: 'FREE', name: 'Carregando...', price: '...', features: [], is_popular: false, button_text: '...', period: '', limits: { maxTables:0, maxProducts:0, maxStaff:0, allowKds:false, allowCashier:false } }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 relative">
      
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
            {/* Logo */}
            <div className="flex items-center gap-2 text-blue-700 font-extrabold text-xl md:text-2xl tracking-tighter cursor-pointer" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
              <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                <ChefHat size={24} /> 
              </div>
              GastroFlow
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex gap-8 items-center">
               <a href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Funcionalidades</a>
               <a href="#modules" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Gestão</a>
               <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Planos</a>
               <a href="#contact" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Contato</a>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex gap-4">
              <Link to="/login-owner" className="text-slate-600 hover:text-blue-700 px-3 py-2 font-semibold text-sm transition-colors flex items-center gap-2">
                <LogIn size={16} /> Área do Cliente
              </Link>
              <button 
                onClick={openWhatsApp}
                className="bg-slate-900 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-slate-800 transition-all flex items-center gap-2"
              >
                <MessageCircle size={16} /> Falar com Consultor
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600 p-2">
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b shadow-xl animate-fade-in flex flex-col p-4 gap-4 z-50">
             <Link 
                to="/login-owner" 
                className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg font-bold text-center flex items-center justify-center gap-2 border border-blue-100"
                onClick={() => setIsMobileMenuOpen(false)}
             >
                <LogIn size={18} /> Acessar Área do Cliente
             </Link>
             <hr className="border-slate-100" />
             <a href="#features" className="text-slate-600 font-medium p-2 hover:bg-gray-50 rounded" onClick={() => setIsMobileMenuOpen(false)}>Funcionalidades</a>
             <a href="#modules" className="text-slate-600 font-medium p-2 hover:bg-gray-50 rounded" onClick={() => setIsMobileMenuOpen(false)}>Módulos de Gestão</a>
             <a href="#pricing" className="text-slate-600 font-medium p-2 hover:bg-gray-50 rounded" onClick={() => setIsMobileMenuOpen(false)}>Planos e Preços</a>
             <a href="#contact" className="text-slate-600 font-medium p-2 hover:bg-gray-50 rounded" onClick={() => setIsMobileMenuOpen(false)}>Contato</a>
             <button 
                onClick={() => { openWhatsApp(); setIsMobileMenuOpen(false); }}
                className="bg-slate-900 text-white px-4 py-3 rounded-lg font-bold text-center mt-2 flex items-center justify-center gap-2"
             >
                <MessageCircle size={18} /> Falar no WhatsApp
             </button>
          </div>
        )}
      </nav>

      {/* --- Hero Section --- */}
      <div className="relative bg-slate-900 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-xs md:text-sm font-medium text-blue-400 tracking-wide uppercase">O sistema nº 1 para restaurantes</span>
          </div>

          <h1 className="text-3xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight mb-8 leading-tight">
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

          <div className="mt-12 flex flex-wrap justify-center gap-4 sm:gap-8 text-slate-500 text-sm font-medium">
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
                    desc="Fechamento de caixa, relatórios de vendas, auditoria de funcionários e gestão de lucros em tempo real."
                />
            </div>
        </div>
      </div>

      {/* --- NEW: VISUAL MODULES SHOWCASE (FIGURES) --- */}
      <div id="modules" className="py-24 bg-slate-50 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row gap-12 items-center mb-16">
                  <div className="md:w-1/2">
                      <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4">
                          <LayoutDashboard size={14} /> Sistema Modular
                      </div>
                      <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6">
                          Gestão Completa e Integrada
                      </h2>
                      <p className="text-lg text-slate-600 leading-relaxed">
                          Não é apenas um cardápio digital. O GastroFlow é um ERP completo modular. Você ativa apenas o que precisa, mantendo o sistema limpo e eficiente.
                      </p>
                  </div>
                  <div className="md:w-1/2 grid grid-cols-2 gap-4">
                      {/* Visual Cards representing the modules */}
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
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32">
            
            {/* Block 1: QR Code Illustration */}
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
                <div className="lg:w-1/2 relative flex justify-center items-center group w-full">
                    {/* Background Blob */}
                    <div className="absolute inset-0 bg-blue-100 rounded-full blur-3xl opacity-60 scale-90 group-hover:scale-100 transition-transform duration-1000"></div>
                    {/* Phone Mockup Illustration */}
                    <div className="relative bg-white rounded-[3rem] border-8 border-slate-900 shadow-2xl h-[450px] w-[260px] flex flex-col overflow-hidden transform group-hover:-translate-y-2 transition-transform duration-500 max-w-full">
                        {/* Notch */}
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-6 w-32 bg-slate-900 rounded-b-xl z-20"></div>
                        {/* Screen Content */}
                        <div className="bg-slate-50 flex-1 flex flex-col items-center justify-center p-6 relative">
                            <div className="absolute top-10 w-16 h-2 bg-slate-200 rounded-full mb-8"></div>
                            <QrCode size={120} className="text-slate-900 mb-6" strokeWidth={1.5} />
                            <div className="w-full h-3 bg-blue-100 rounded-full mb-2"></div>
                            <div className="w-2/3 h-3 bg-slate-200 rounded-full mb-8"></div>
                            <button className="bg-blue-600 text-white rounded-lg px-6 py-2 text-sm font-bold shadow-lg shadow-blue-200">Ver Cardápio</button>
                        </div>
                    </div>
                </div>
                <div className="lg:w-1/2">
                    <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4">
                        <Zap size={14} /> Autoatendimento
                    </div>
                    <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6">O cliente pede, você fatura.</h3>
                    <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                        Esqueça cardápios de papel engordurados. Com nosso sistema de QR Code, seu cliente acessa fotos reais dos pratos, personaliza o pedido e envia direto para a produção.
                    </p>
                    <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle className="text-green-500" size={20}/> Cardápio sempre atualizado</li>
                        <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle className="text-green-500" size={20}/> Aumento de 20% no ticket médio</li>
                        <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle className="text-green-500" size={20}/> Redução na fila de espera</li>
                    </ul>
                </div>
            </div>

            {/* Block 2: KDS Illustration (Reverse Layout) */}
            <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-24">
                <div className="lg:w-1/2 relative flex justify-center items-center group w-full">
                    <div className="absolute inset-0 bg-purple-100 rounded-full blur-3xl opacity-60 scale-90 group-hover:scale-100 transition-transform duration-1000"></div>
                    {/* Monitor Illustration */}
                    <div className="relative bg-slate-900 rounded-2xl p-2 shadow-2xl w-full max-w-md transform group-hover:-translate-y-2 transition-transform duration-500">
                        <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 h-[280px] relative flex">
                            {/* Sidebar */}
                            <div className="w-16 bg-slate-900 border-r border-slate-700 flex flex-col items-center py-4 gap-4">
                                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center"><ChefHat size={16} className="text-white"/></div>
                                <div className="w-8 h-8 bg-slate-700 rounded-lg"></div>
                                <div className="w-8 h-8 bg-slate-700 rounded-lg"></div>
                            </div>
                            {/* Main KDS Area */}
                            <div className="flex-1 p-4 flex gap-3 overflow-hidden">
                                <div className="w-1/2 bg-slate-700 rounded-lg p-2 border-l-4 border-yellow-500">
                                    <div className="flex justify-between mb-2">
                                        <div className="w-12 h-3 bg-slate-500 rounded"></div>
                                        <div className="w-8 h-3 bg-slate-600 rounded"></div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="w-full h-2 bg-slate-600 rounded"></div>
                                        <div className="w-2/3 h-2 bg-slate-600 rounded"></div>
                                        <div className="w-3/4 h-2 bg-yellow-900/50 rounded border border-yellow-700/50"></div>
                                    </div>
                                </div>
                                <div className="w-1/2 bg-slate-700 rounded-lg p-2 border-l-4 border-green-500 opacity-75">
                                    <div className="flex justify-between mb-2">
                                        <div className="w-12 h-3 bg-slate-500 rounded"></div>
                                        <div className="w-8 h-3 bg-green-900 text-green-400 text-[8px] flex items-center justify-center font-bold px-1 rounded">PRONTO</div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="w-full h-2 bg-slate-600 rounded"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Monitor Stand */}
                        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-slate-800 rounded-b-lg"></div>
                        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-40 h-2 bg-slate-900 rounded-full shadow-lg"></div>
                    </div>
                </div>
                <div className="lg:w-1/2">
                    <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4">
                        <MonitorPlay size={14} /> KDS - Tela de Cozinha
                    </div>
                    <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6">Cozinha sem caos, pratos no ponto.</h3>
                    <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                        Chega de gritaria e papeizinhos perdidos. O KDS organiza os pedidos por ordem de chegada e tempo de preparo, garantindo que nada atrase.
                    </p>
                    <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle className="text-green-500" size={20}/> Zero erros de comunicação</li>
                        <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle className="text-green-500" size={20}/> Alertas de atraso</li>
                        <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle className="text-green-500" size={20}/> Sustentável e econômico</li>
                    </ul>
                </div>
            </div>

        </div>
      </div>

      {/* --- Lead Form Section --- */}
      <div id="contact" className="py-24 bg-slate-50 border-y border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-slate-100">
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
                        plan={plan}
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
                &copy; 2026 GastroFlow Systems. Todos os direitos reservados.
            </div>
            <div className="flex gap-4">
                <Link to="/terms" className="hover:text-white transition-colors">Termos</Link>
                <Link to="/privacy" className="hover:text-white transition-colors">Privacidade</Link>
            </div>
         </div>
      </footer>
    </div>
  );
};
