
import React from 'react';
import { Download, X } from 'lucide-react';
import { usePwa } from '../core/context/PwaContext';

export const InstallPWA: React.FC = () => {
  const { isInstallable, install } = usePwa();
  const [isVisible, setIsVisible] = React.useState(true);

  if (!isInstallable || !isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-fade-in safe-area-bottom">
      <div className="bg-slate-900 text-white rounded-xl shadow-2xl p-4 flex items-center justify-between border border-slate-700 max-w-md mx-auto">
        <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
                <Download size={24} />
            </div>
            <div>
                <h3 className="font-bold text-sm">Instalar ArloFlux</h3>
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
                onClick={install}
                className="bg-blue-600 hover:bg-blue-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
            >
                Instalar
            </button>
        </div>
      </div>
    </div>
  );
};
