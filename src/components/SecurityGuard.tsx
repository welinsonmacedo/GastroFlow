
import React, { useEffect, useState, useRef } from 'react';
import { ShieldAlert, RefreshCcw, Lock } from 'lucide-react';
import { logSecurityIncident } from '../utils/security';
import { supabase } from '../lib/supabase';

export const SecurityGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState('Modo Desenvolvedor Detectado');
  const [securityConfig, setSecurityConfig] = useState({ blockDevTools: true, blockRightClick: true, blockExtensions: true });
  const logSent = useRef(false);

  // Fetch Security Config
  useEffect(() => {
    const fetchConfig = async () => {
        try {
            const { data, error } = await supabase.from('system_settings').select('value').eq('key', 'security_config').single();
            if (data && data.value) {
                setSecurityConfig(data.value);
            }
        } catch (err) {
            console.warn("Using default security config due to fetch error", err);
        }
    };
    fetchConfig();
  }, []);

  // Helper para logar apenas uma vez por refresh para evitar spam
  const handleLog = (reason: string, type: string) => {
      if (!logSent.current) {
          logSecurityIncident({
              type: type,
              severity: 'CRITICAL',
              details: reason
          });
          logSent.current = true;
      }
      setLockReason(reason);
      setIsLocked(true);
  };

  useEffect(() => {
    if (!securityConfig.blockRightClick && !securityConfig.blockDevTools && !securityConfig.blockExtensions) return;

    // 1. Bloquear Botão Direito
    const handleContextMenu = (e: MouseEvent) => {
      if (securityConfig.blockRightClick) {
          e.preventDefault();
          return false;
      }
    };

    // 2. Bloquear Atalhos DevTools
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!securityConfig.blockDevTools) return;

      if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
        (e.metaKey && e.altKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) || 
        (e.ctrlKey && e.key.toUpperCase() === 'U') ||
        (e.metaKey && e.key.toUpperCase() === 'U')
      ) {
        e.preventDefault();
        e.stopPropagation();
        handleLog('Tentativa de Acesso ao DevTools (Teclado)', 'DEV_TOOLS_ATTEMPT');
      }
    };

    // 3. Detectar Automação (WebDriver)
    if (securityConfig.blockDevTools && navigator.webdriver) {
        handleLog('Software de Automação Detectado (Bot)', 'BOT_DETECTED');
    }

    // 4. Detectar Injeção de Extensões via MutationObserver
    const observer = new MutationObserver((mutations) => {
        if (!securityConfig.blockExtensions) return;

        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { 
                    const el = node as HTMLElement;
                    const html = el.outerHTML.toLowerCase();
                    
                    if (html.includes('chrome-extension://') || html.includes('moz-extension://')) {
                        handleLog('Uso de Extensões Proibido (Injeção de Script)', 'EXTENSION_INJECTION');
                    }
                    
                    if (el.hasAttribute('data-gramm') || el.hasAttribute('data-lastpass-root')) {
                        handleLog('Extensão de Terceiros Detectada (Modificação de DOM)', 'EXTENSION_DOM_MOD');
                    }
                }
            });
        });
    });

    if (securityConfig.blockExtensions) {
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'href', 'style', 'class'] 
        });
    }

    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    // Limpa o console
    const clearConsole = setInterval(() => {
        if (process.env.NODE_ENV === 'production' && securityConfig.blockDevTools) {
            console.clear();
        }
    }, 2000);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      observer.disconnect();
      clearInterval(clearConsole);
    };
  }, [securityConfig]);

  if (isLocked) {
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
              Este incidente foi registrado. Desabilite ferramentas não autorizadas para continuar.
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
