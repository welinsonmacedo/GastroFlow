
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  variant?: 'page' | 'dialog'; // 'page' = Full Screen (Sidebar Aware), 'dialog' = Popup
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'; // Only for 'dialog'
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  variant = 'page',
  maxWidth = 'md' 
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

  // Renderiza o conteúdo baseado na variante
  const content = variant === 'page' ? (
    // --- VARIANT: PAGE (Sidebar Aware) ---
    // z-[60] para garantir que fique acima da sidebar (z-50) e navbar (z-50)
    <div className="fixed inset-0 z-[60] bg-gray-50 flex flex-col animate-fade-in">
        {/* Header */}
        <div className="bg-white border-b px-4 md:px-6 py-4 flex justify-between items-center shrink-0 shadow-sm safe-area-top relative z-10">
          <div className="flex items-center gap-3">
            {/* Botão Voltar sempre visível e com z-index garantido */}
            <button 
              onClick={onClose} 
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-2 group relative z-20"
              title="Voltar"
            >
               <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform"/>
            </button>
            <h2 className="text-xl font-bold text-gray-800 line-clamp-1">{title}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="hidden md:block p-2 bg-gray-100 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"
            title="Fechar (Esc)"
          >
            <X size={20}/>
          </button>
        </div>

        {/* Content Scrollable Area - Full Height without padding constraints */}
        <div className="flex-1 overflow-y-auto safe-area-bottom">
          <div className="max-w-6xl mx-auto p-4 md:p-8 min-h-full">
            {children}
          </div>
        </div>
    </div>
  ) : (
    // --- VARIANT: DIALOG (Centered Popup) ---
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
      <div 
        className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[95vh] relative overflow-hidden flex-shrink-0
          ${maxWidth === 'sm' ? 'max-w-sm' : ''}
          ${maxWidth === 'md' ? 'max-w-md' : ''}
          ${maxWidth === 'lg' ? 'max-w-lg' : ''}
          ${maxWidth === 'xl' ? 'max-w-xl' : ''}
          ${maxWidth === '2xl' ? 'max-w-2xl' : ''}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b bg-gray-50 shrink-0">
          <div className="flex items-center gap-3">
             <button 
                onClick={onClose} 
                className="p-1 -ml-1 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors"
                title="Voltar"
             >
                <ArrowLeft size={20}/>
             </button>
             <h3 className="font-bold text-lg text-gray-800">{title}</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-200 rounded-full text-gray-500 hover:text-red-500 transition-colors"
          >
            <X size={20}/>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );

  // Usa Portal para renderizar no final do body
  return createPortal(content, document.body);
};
