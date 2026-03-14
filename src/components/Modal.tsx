
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  variant?: 'page' | 'dialog'; // 'page' = 100% Fullscreen, 'dialog' = Floating Window (98%)
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full'; 
  onSave?: () => void; // Ação opcional para o botão de salvar no header
  saveLabel?: string;
  disabled?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  variant = 'page',
  maxWidth = 'md',
  onSave,
  saveLabel,
  disabled
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  // Renderiza o conteúdo como uma JANELA DE SISTEMA
  const maxWidthClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-full'
  };

  const content = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in overflow-hidden">
      <div 
        className={`
          flex flex-col bg-slate-50 shadow-2xl overflow-hidden relative
          ${variant === 'page' ? 'w-full h-full rounded-none' : `w-[98vw] h-[95vh] rounded-xl border border-slate-600/50 ${maxWidthClasses[maxWidth] || 'max-w-4xl'}`}
        `}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* --- BARRA DE TÍTULO DA JANELA (WINDOW HEADER) --- */}
        <div 
          className="h-10 bg-slate-200 border-b border-slate-300 flex justify-between items-center px-3 shrink-0 select-none cursor-default"
          onDoubleClick={(e) => {
             // Simula maximizar/restaurar se fosse desktop app real
             e.preventDefault();
          }}
        >
          {/* Título e Ícone */}
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <div className="w-3 h-3 bg-slate-400 rounded-full"></div>
            <span className="uppercase tracking-wide">{title}</span>
          </div>

          {/* Controles da Janela (Window Controls) */}
          <div className="flex items-center gap-1">
             {/* Botão Salvar (Ação) */}
             {onSave && (
                <button 
                    onClick={onSave}
                    className={`h-6 flex items-center justify-center gap-1 px-2 hover:bg-slate-300 text-slate-600 rounded transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={saveLabel || "Salvar / Confirmar"}
                    disabled={disabled}
                >
                    <Save size={14} strokeWidth={2.5} />
                    {saveLabel && <span className="text-[10px] font-bold uppercase">{saveLabel}</span>}
                </button>
             )}
             
             {/* Botão Fechar (Funcional) */}
             <button 
                onClick={onClose} 
                className="w-10 h-6 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded transition-colors ml-1 shadow-sm"
                title="Fechar (Esc)"
             >
                <X size={14} strokeWidth={3} />
             </button>
          </div>
        </div>

        {/* --- ÁREA DE CONTEÚDO (SCROLLABLE) --- */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 custom-scrollbar relative">
           <div className={`min-h-full ${variant === 'page' ? 'p-4 md:p-6' : 'p-4 md:p-6'} max-w-[1920px] mx-auto`}>
              {children}
           </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
