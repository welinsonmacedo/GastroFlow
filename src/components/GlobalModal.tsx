
import React from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { Button } from './Button';

export type ModalType = 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO' | 'CONFIRM';

interface GlobalModalProps {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const GlobalModal: React.FC<GlobalModalProps> = ({
  isOpen,
  type,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar'
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle size={48} className="text-green-500" />;
      case 'ERROR': return <AlertCircle size={48} className="text-red-500" />;
      case 'WARNING': return <AlertTriangle size={48} className="text-yellow-500" />;
      case 'CONFIRM': return <Info size={48} className="text-blue-500" />;
      default: return <Info size={48} className="text-blue-500" />;
    }
  };

  const getConfirmButtonVariant = () => {
      if (type === 'ERROR' || type === 'WARNING') return 'danger';
      if (type === 'SUCCESS') return 'success';
      return 'primary';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
        <div className="p-6 flex flex-col items-center text-center">
          <div className="mb-4 bg-gray-50 p-4 rounded-full">
            {getIcon()}
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">{message}</p>
          
          <div className="flex gap-3 w-full">
            {type === 'CONFIRM' && (
              <Button 
                variant="secondary" 
                onClick={onCancel} 
                className="flex-1"
              >
                {cancelText}
              </Button>
            )}
            <Button 
              variant={getConfirmButtonVariant()} 
              onClick={onConfirm} 
              className="flex-1"
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
