
import React, { useEffect, useState } from 'react';
import { ShieldAlert, RefreshCcw, Lock } from 'lucide-react';

export const SecurityGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState('Modo Desenvolvedor Detectado');

  useEffect(() => {
    // 1. Bloquear Botão Direito (Menu de Contexto)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 2. Bloquear Atalhos de Teclado do DevTools e Inspeção
    const handleKeyDown = (e: KeyboardEvent) => {
      // Lista de teclas proibidas
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U (Source)
      if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
        (e.metaKey && e.altKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) || // Mac
        (e.ctrlKey && e.key.toUpperCase() === 'U') ||
        (e.metaKey && e.key.toUpperCase() === 'U')
      ) {
        e.preventDefault();
        e.stopPropagation();
        setLockReason('Tentativa de Acesso ao DevTools');
        setIsLocked(true); // Trava o sistema imediatamente
      }
    };

    // 3. Detectar Automação (WebDriver)
    if (navigator.webdriver) {
        setLockReason('Software de Automação Detectado');
        setIsLocked(true);
    }

    // 4. Detectar Injeção de Extensões via MutationObserver
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // ELEMENT_NODE
                    const el = node as HTMLElement;
                    // Verifica se o elemento inserido tem origem em extensões
                    // Extensões costumam injetar scripts, iframes ou estilos com src/href apontando para chrome-extension:// ou moz-extension://
                    const html = el.outerHTML.toLowerCase();
                    if (html.includes('chrome-extension://') || html.includes('moz-extension://')) {
                        setLockReason('Uso de Extensões Proibido');
                        setIsLocked(true);
                    }
                    
                    // Verifica atributos específicos de extensões conhecidas (ex: Grammarly, LastPass injetam atributos no body ou inputs)
                    if (el.hasAttribute('data-gramm') || el.hasAttribute('data-lastpass-root')) {
                        // Opcional: Bloquear ou apenas limpar. Para "Proibir", bloqueamos.
                        setLockReason('Extensão de Terceiros Detectada');
                        setIsLocked(true);
                    }
                }
            });
        });
    });

    // Observa o documento inteiro por injeções
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'href', 'style', 'class'] // Filtra atributos que extensões costumam alterar
    });

    // Adiciona os Event Listeners
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    // Limpa o console para dificultar leitura de logs anteriores se abrir
    const clearConsole = setInterval(() => {
        if (process.env.NODE_ENV === 'production') {
            console.clear();
        }
    }, 2000);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      observer.disconnect();
      clearInterval(clearConsole);
    };
  }, []);

  if (isLocked) {
    // Remove todo o conteúdo da aplicação (children) e mostra apenas esta tela
    return (
      <div className="fixed inset-0 z-[99999] bg-red-700 flex flex-col items-center justify-center text-white p-8 text-center font-sans h-screen w-screen overflow-hidden">
        <div className="bg-white/10 p-8 rounded-full mb-8 animate-pulse shadow-2xl border-4 border-white/20">
            <ShieldAlert size={100} />
        </div>
        <h1 className="text-4xl md:text-6xl font-black mb-6 uppercase tracking-tighter drop-shadow-lg">Acesso Proibido</h1>
        
        <div className="bg-white/10 p-6 rounded-2xl max-w-2xl border border-white/10 backdrop-blur-sm">
            <h2 className="text-xl font-bold mb-2 flex items-center justify-center gap-2">
                <Lock size={20} /> Violação de Segurança
            </h2>
            <p className="text-lg md:text-xl font-medium leading-relaxed opacity-90">
              {lockReason}.
            </p>
            <p className="mt-4 text-sm font-bold bg-black/20 p-2 rounded text-white/80">
              O sistema detectou ferramentas não autorizadas. Desabilite extensões e ferramentas de desenvolvedor para continuar.
            </p>
        </div>

        <button 
            onClick={() => window.location.reload()} 
            className="mt-10 flex items-center gap-3 bg-white text-red-700 px-8 py-5 rounded-2xl font-black text-lg hover:scale-105 hover:shadow-2xl transition-all uppercase tracking-widest"
        >
            <RefreshCcw size={24} strokeWidth={3} /> Recarregar Sistema
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
