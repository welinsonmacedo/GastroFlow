import { useState, useEffect } from 'react';
import { ClientHistory } from './ClientHistory';
import { QRScanner } from '../components/QRScanner';
import { Clock, QrCode, LogOut } from 'lucide-react';
import { GlobalLoading } from '../components/GlobalLoading';
import { useAuth } from '@/core/context/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useUI } from '@/core/context/UIContext';

export const ClientHome = () => {
  const [activeTab, setActiveTab] = useState<'history' | 'scan'>('history');
  const [showScanner, setShowScanner] = useState(false);
  const { state: authState, logout } = useAuth();
  const navigate = useNavigate();
  const { showAlert } = useUI();

  useEffect(() => {
    if (!authState.isLoading && !authState.isAuthenticated) {
      navigate('/client/login?redirect=/client/home');
    }
  }, [authState.isLoading, authState.isAuthenticated, navigate]);

  if (authState.isLoading) {
    return <GlobalLoading message="Carregando..." />;
  }

  const handleScanSuccess = (decodedText: string) => {
    setShowScanner(false);
    
    try {
      const url = new URL(decodedText);
      
      // Check if origin matches current window origin
      if (url.origin !== window.location.origin) {
        showAlert({
          title: 'QR Code Inválido',
          message: 'Este QR Code não pertence ao nosso sistema. Por favor, escaneie um código válido.',
          type: 'ERROR'
        });
        return;
      }

      // Check if path matches /client/table/:id
      const path = url.pathname;
      const tableMatch = path.match(/^\/client\/table\/([^/]+)$/);
      
      if (tableMatch && tableMatch[1]) {
        // Valid table URL
        // Navigate to the path + search params
        navigate(path + url.search);
      } else {
        showAlert({
            title: 'QR Code Inválido',
            message: 'Este QR Code não corresponde a uma mesa válida.',
            type: 'ERROR'
        });
      }

    } catch (e) {
      // Not a valid URL
      showAlert({
        title: 'QR Code Inválido',
        message: 'O formato do QR Code não é reconhecido pelo sistema.',
        type: 'ERROR'
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/client/login');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'history' && <ClientHistory isEmbedded={true} />}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-2 flex justify-around items-center z-40 safe-area-bottom">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
            activeTab === 'history' ? 'text-emerald-500 bg-emerald-500/10' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Clock className="w-6 h-6" />
          <span className="text-xs font-medium">Histórico</span>
        </button>

        <button
          onClick={() => setShowScanner(true)}
          className="flex flex-col items-center gap-1 p-2 rounded-xl text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <div className="bg-emerald-500 text-black p-3 rounded-full -mt-8 shadow-lg border-4 border-zinc-900">
            <QrCode className="w-6 h-6" />
          </div>
          <span className="text-xs font-medium">Ler QR Code</span>
        </button>

        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 p-2 rounded-xl text-zinc-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-6 h-6" />
          <span className="text-xs font-medium">Sair</span>
        </button>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black">
          <QRScanner 
            onScanSuccess={handleScanSuccess} 
            onClose={() => setShowScanner(false)} 
          />
        </div>
      )}
    </div>
  );
};
