import React, { useEffect } from 'react';
import { X, ArrowLeft } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  variant?: 'page' | 'dialog'; // 'page' = Full Content Area, 'dialog' = Centered Popup
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'; // Only for 'dialog' variant
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  variant = 'page',
  maxWidth = 'md' 
}) => {
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  // --- VARIANT: PAGE (Full Screen / Sidebar Aware) ---
  if (variant === 'page') {
    return (
      <div className="fixed inset-0 z-40 bg-gray-100 flex flex-col animate-fade-in md:left-72">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex justify-between items-center shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="md:hidden p-2 -ml-2 text-gray-600">
               <ArrowLeft size={24}/>
            </button>
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-gray-100 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors hidden md:block"
            title="Fechar"
          >
            <X size={20}/>
          </button>
        </div>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border p-6 md:p-8">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // --- VARIANT: DIALOG (Centered Popup) ---
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div 
        className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh] ${sizeClasses[maxWidth]} relative overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b bg-gray-50 shrink-0">
          <h3 className="font-bold text-lg text-gray-800">{title}</h3>
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
};