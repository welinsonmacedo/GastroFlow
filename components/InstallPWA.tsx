
import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      // Previne o mini-infobar padrão do Chrome
      e.preventDefault();
      // Salva o evento para disparar depois
      setDeferredPrompt(e);
      // Mostra o botão customizado
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Mostra o prompt nativo
    deferredPrompt.prompt();

    // Espera a escolha do usuário
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Limpa o prompt, pois ele só pode ser usado uma vez
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-fade-in safe-area-bottom">
      <div className="bg-slate-900 text-white rounded-xl shadow-2xl p-4 flex items-center justify-between border border-slate-700 max-w-md mx-auto">
        <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
                <Download size={24} />
            </div>
            <div>
                <h3 className="font-bold text-sm">Instalar Flux Eat</h3>
                <p className="text-xs text-slate-400">Adicione à tela inicial para acesso rápido.</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsVisible(false)}
                className="p-2 text-slate-400 hover:text-white"
            >
                <X size={20} />
            </button>
            <button 
                onClick={handleInstallClick}
                className="bg-blue-600 hover:bg-blue-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
            >
                Instalar
            </button>
        </div>
      </div>
    </div>
  );
};
