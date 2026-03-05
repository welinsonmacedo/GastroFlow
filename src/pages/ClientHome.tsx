import { useState, useEffect } from 'react';
import { ClientHistory } from './ClientHistory';
import { QRScanner } from '../components/QRScanner';
import { Clock, QrCode, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const ClientHome = () => {
  const [activeTab, setActiveTab] = useState<'history' | 'scan'>('history');
  const [showScanner, setShowScanner] = useState(false);
  const { state: authState, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authState.isLoading && !authState.isAuthenticated) {
      navigate('/client/login?redirect=/client/home');
    }
  }, [authState.isLoading, authState.isAuthenticated, navigate]);

  if (authState.isLoading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Carregando...</div>;
  }

  const handleScanSuccess = (decodedText: string) => {
    setShowScanner(false);
    // The decoded text is expected to be the full URL or just the table ID
    // Example: https://app.com/client/table/123
    // Or just: 123
    
    let tableId = decodedText;
    
    // Check if it's a URL
    try {
      const url = new URL(decodedText);
      // Extract table ID from URL path
      // Assuming path is /client/table/:tableId
      const parts = url.pathname.split('/');
      const tableIndex = parts.indexOf('table');
      if (tableIndex !== -1 && parts[tableIndex + 1]) {
        tableId = parts[tableIndex + 1];
      }
    } catch (e) {
      // Not a URL, assume it's the ID
    }

    if (tableId) {
      navigate(`/client/table/${tableId}`);
    } else {
      alert('QR Code inválido. Tente novamente.');
    }
  };

  const handleLogout = async () => {
    await signOut();
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
