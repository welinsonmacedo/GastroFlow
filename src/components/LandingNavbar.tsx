
import React, { useState } from 'react';
// @ts-ignore
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, MessageCircle } from 'lucide-react';

export const LandingNavbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const whatsappNumber = "5534991448794";
  const defaultMessage = encodeURIComponent("Olá! Gostaria de falar com um consultor sobre o ArloFlux.");
  const location = useLocation();

  const openWhatsApp = () => {
    window.open(`https://wa.me/${whatsappNumber}?text=${defaultMessage}`, '_blank');
  };

  // Helper para rolar suavemente se estiver na home, ou navegar se estiver fora
  const handleNavClick = (id: string) => {
    setIsMobileMenuOpen(false);
    if (location.pathname === '/') {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
    } else {
        window.location.href = `/#${id}`;
    }
  };

  return (
    <nav className="sticky top-0 bg-white/95 backdrop-blur-md z-40 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
              <div className="relative flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
                  <path d="M50 10L15 85H30L50 40L70 85H85L50 10Z" fill="url(#logo-gradient)" />
                  <path d="M20 65C40 55 60 55 80 65" stroke="url(#swoosh-gradient)" strokeWidth="6" strokeLinecap="round" />
                  <circle cx="85" cy="45" r="3" fill="#22c55e" />
                  <circle cx="75" cy="35" r="2" fill="#3b82f6" />
                  <defs>
                    <linearGradient id="logo-gradient" x1="15" y1="10" x2="85" y2="85" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#06b6d4" />
                      <stop offset="1" stopColor="#8b5cf6" />
                    </linearGradient>
                    <linearGradient id="swoosh-gradient" x1="20" y1="65" x2="80" y2="65" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#06b6d4" />
                      <stop offset="1" stopColor="#d946ef" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span className="text-2xl font-black tracking-tighter text-slate-800">
                <span className="text-blue-600">Arlo</span><span className="text-purple-600">Flux</span>
              </span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex gap-8 items-center">
               <button onClick={() => handleNavClick('features')} className="text-sm font-bold text-slate-600 hover:text-green-600 transition-colors">Funcionalidades</button>
               <button onClick={() => handleNavClick('modules')} className="text-sm font-bold text-slate-600 hover:text-green-600 transition-colors">Gestão</button>
               <button onClick={() => handleNavClick('pricing')} className="text-sm font-bold text-slate-600 hover:text-green-600 transition-colors">Planos</button>
               <button onClick={() => handleNavClick('contact')} className="text-sm font-bold text-slate-600 hover:text-green-600 transition-colors">Contato</button>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex gap-4">
              <button 
                onClick={openWhatsApp}
                className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/20"
              >
                <MessageCircle size={18} /> Falar com Consultor
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
             <button onClick={() => handleNavClick('features')} className="text-slate-600 font-medium p-2 hover:bg-gray-50 rounded text-left">Funcionalidades</button>
             <button onClick={() => handleNavClick('modules')} className="text-slate-600 font-medium p-2 hover:bg-gray-50 rounded text-left">Módulos de Gestão</button>
             <button onClick={() => handleNavClick('pricing')} className="text-slate-600 font-medium p-2 hover:bg-gray-50 rounded text-left">Planos e Preços</button>
             <button onClick={() => handleNavClick('contact')} className="text-slate-600 font-medium p-2 hover:bg-gray-50 rounded text-left">Contato</button>
             <button 
                onClick={() => { openWhatsApp(); setIsMobileMenuOpen(false); }}
                className="bg-slate-900 text-white px-4 py-3 rounded-lg font-bold text-center mt-2 flex items-center justify-center gap-2"
             >
                <MessageCircle size={18} /> Falar no WhatsApp
             </button>
          </div>
        )}
    </nav>
  );
};
