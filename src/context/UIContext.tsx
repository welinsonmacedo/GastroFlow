
import React, { createContext, useContext, useState, useCallback } from 'react';
import { GlobalModal, ModalType } from '../components/GlobalModal';

interface AlertOptions {
  title: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
}

interface ConfirmOptions {
  title: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
}

interface UIContextType {
  showAlert: (options: AlertOptions) => void;
  showConfirm: (options: ConfirmOptions) => void;
  closeAlert: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    type: ModalType;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    type: 'INFO',
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const close = useCallback(() => setIsOpen(false), []);

  const showAlert = useCallback(({ title, message, type = 'INFO', confirmText = 'OK' }: AlertOptions) => {
    setModalConfig({
      type,
      title,
      message,
      confirmText,
      onConfirm: close,
      onCancel: close,
    });
    setIsOpen(true);
  }, [close]);

  const showConfirm = useCallback(({ 
    title, 
    message, 
    onConfirm, 
    type = 'CONFIRM', 
    confirmText = 'Confirmar', 
    cancelText = 'Cancelar' 
  }: ConfirmOptions) => {
    setModalConfig({
      type,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        onConfirm();
        close();
      },
      onCancel: close,
    });
    setIsOpen(true);
  }, [close]);

  return (
    <UIContext.Provider value={{ showAlert, showConfirm, closeAlert: close }}>
      {children}
      <GlobalModal
        isOpen={isOpen}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
        onCancel={modalConfig.onCancel}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
      />
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within a UIProvider');
  return context;
};
