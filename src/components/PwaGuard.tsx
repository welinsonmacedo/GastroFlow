
import React, { useEffect, useState } from 'react';
// @ts-ignore
import { useLocation } from 'react-router-dom';
import { Download, Smartphone, Share, PlusSquare, Monitor, ChefHat } from 'lucide-react';

export const PwaGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isPWA, setIsPwa] = useState(true);
  const [os, setOS] = useState<'iOS' | 'Android' | 'Desktop'>('Desktop');

  useEffect(() => {
    // Detecta se está rodando em modo Standalone (PWA)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone || 
      document.referrer.includes('android-app://');

    setIsPwa(isStandalone);

    // Detecta Sistema Operacional para mostrar instruções corretas
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setOS('iOS');
    } else if (/android/.test(userAgent)) {
      setOS('Android');
    } else {
      setOS('Desktop');
    }
  }, []);

  // Rotas permitidas no navegador (Login, Cardápio, Documentos Legais)
  const isPublicRoute = 
    location.pathname === '/' || 
    location.pathname === '/login-owner' ||
    location.pathname === '/register' ||
    location.pathname.startsWith('/client/') || 
    location.pathname === '/privacy' || 
    location.pathname === '/terms';

  // Se já for PWA ou estiver em rota pública, renderiza o app normalmente
  if (isPWA || isPublicRoute) {
    return <>{children}</>;
  }

  // Tela de Bloqueio / Instalação
  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans overflow-hidden">
      
      {/* Background Effects */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600 rounded-full blur-[120px] opacity-20 transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-green-600 rounded-full blur-[120px] opacity-20 transform -translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10 text-center animate-fade-in">
        <div className="bg-white/10 p-6 rounded-3xl inline-block mb-8 shadow-2xl backdrop-blur-md border border-white/10">
           <Download size={64} className="text-green-400 animate-bounce-slow" />
        </div>
        
        <h1 className="text-3xl font-black mb-4 tracking-tight">Instale o App</h1>
        <p className="text-slate-300 text-lg mb-8 leading-relaxed">
          Para acessar o painel de gestão, cozinha ou caixa, é necessário utilizar a versão instalada do <strong>Flux Eat</strong>.
        </p>

        <div className="bg-white text-slate-800 rounded-2xl p-6 text-left shadow-lg">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            {os === 'iOS' ? <Smartphone size={20}/> : os === 'Android' ? <Smartphone size={20}/> : <Monitor size={20}/>}
            Como Instalar no {os}
          </h3>

          <div className="space-y-4">
            {os === 'iOS' && (
              <>
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 p-2 rounded-lg text-blue-600"><Share size={24}/></div>
                  <p className="text-sm font-medium">1. Toque no botão <strong>Compartilhar</strong> na barra do navegador.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 p-2 rounded-lg text-slate-800"><PlusSquare size={24}/></div>
                  <p className="text-sm font-medium">2. Selecione <strong>Adicionar à Tela de Início</strong>.</p>
                </div>
              </>
            )}

            {os === 'Android' && (
              <>
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 p-2 rounded-lg text-slate-800">⋮</div>
                  <p className="text-sm font-medium">1. Toque no menu (três pontos) do Chrome.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 p-2 rounded-lg text-green-600"><Smartphone size={24}/></div>
                  <p className="text-sm font-medium">2. Toque em <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</p>
                </div>
              </>
            )}

            {os === 'Desktop' && (
              <>
                 <div className="flex items-center gap-4">
                  <div className="bg-slate-100 p-2 rounded-lg text-slate-800"><Download size={24}/></div>
                  <p className="text-sm font-medium">1. Localize o ícone de instalação na barra de endereço (canto direito).</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 p-2 rounded-lg text-blue-600"><Monitor size={24}/></div>
                  <p className="text-sm font-medium">2. Clique em <strong>Instalar Flux Eat</strong>.</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 opacity-50 text-xs">
          <p>Se você é um cliente acessando o cardápio, use o link da mesa fornecido via QR Code.</p>
        </div>
      </div>
    </div>
  );
};
