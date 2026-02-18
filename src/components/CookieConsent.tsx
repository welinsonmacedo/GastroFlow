
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { ShieldCheck, X } from 'lucide-react';
import { Button } from './Button';

export const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Verifica se o usuário já deu consentimento anteriormente
    const consent = localStorage.getItem('flux_eat_lgpd_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('flux_eat_lgpd_consent', 'accepted');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-fade-in safe-area-bottom">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 md:flex items-center justify-between gap-6 relative">
        <button 
          onClick={() => setIsVisible(false)} 
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 md:hidden"
        >
          <X size={20} />
        </button>

        <div className="flex items-start gap-4 mb-4 md:mb-0">
          <div className="bg-emerald-100 p-3 rounded-full text-emerald-600 shrink-0 hidden md:block">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h4 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
              <ShieldCheck size={20} className="text-emerald-600 md:hidden" /> 
              Sua privacidade importa
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              Utilizamos cookies e dados essenciais para garantir o funcionamento do sistema, 
              melhorar sua experiência e processar seus pedidos. Ao continuar navegando, 
              você concorda com nossa <Link to="/privacy" className="text-blue-600 hover:underline font-bold">Política de Privacidade</Link> e <Link to="/terms" className="text-blue-600 hover:underline font-bold">Termos de Uso</Link>.
            </p>
          </div>
        </div>

        <div className="flex gap-3 shrink-0">
          <Button 
            onClick={handleAccept} 
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-3 rounded-xl shadow-lg w-full md:w-auto whitespace-nowrap"
          >
            Entendi e Concordo
          </Button>
        </div>
      </div>
    </div>
  );
};
