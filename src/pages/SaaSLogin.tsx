
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useNavigate, Link } from 'react-router-dom';
import { useSaaS } from '../context/SaaSContext';
import { Activity, Lock, ArrowLeft, AlertCircle, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const SaaSLogin: React.FC = () => {
  const navigate = useNavigate();
  const { dispatch } = useSaaS();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [connectionStatus, setConnectionStatus] = useState<'CHECKING' | 'CONNECTED' | 'ERROR'>('CHECKING');

  useEffect(() => {
    let isMounted = true;

    const checkConnection = async () => {
      if (!isSupabaseConfigured()) {
        if (isMounted) setConnectionStatus('ERROR');
        return;
      }

      try {
        const { error } = await supabase.from('tenants').select('count', { count: 'exact', head: true });
        
        if (!isMounted) return;

        if (error) {
          const msg = (error.message || '').toLowerCase();
          const details = (error.details || '').toLowerCase();
          const hint = (error.hint || '').toLowerCase();

          const isAbort = 
              msg.includes('abort') || 
              msg.includes('signal is aborted') ||
              details.includes('abort') ||
              hint.includes('abort');
          
          if (!isAbort) {
             console.error("Erro de conexão Supabase:", error);
             setConnectionStatus('ERROR');
          } else {
             setConnectionStatus('CONNECTED');
          }
        } else {
          setConnectionStatus('CONNECTED');
        }
      } catch (err: any) {
        if (!isMounted) return;
        
        const msg = (err.message || '').toLowerCase();
        const name = (err.name || '').toLowerCase();
        
        if (name.includes('abort') || msg.includes('abort')) {
            setConnectionStatus('CONNECTED'); 
        } else {
            console.error("Exceção de conexão:", err);
            setConnectionStatus('ERROR');
        }
      }
    };

    checkConnection();

    return () => {
        isMounted = false;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (connectionStatus === 'ERROR') {
        console.warn("Tentando login mesmo com status de conexão ERROR");
    }

    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (!authError && authData.user) {
            const adminName = authData.user.user_metadata?.name || email.split('@')[0];
            dispatch({ 
                type: 'LOGIN_ADMIN', 
                name: adminName,
                id: authData.user.id,
                email: authData.user.email || email
            });
            navigate('/dashboard');
            return;
        }

        const { data, error: dbError } = await supabase
            .from('saas_admins')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .maybeSingle();

        if (data) {
            dispatch({ 
                type: 'LOGIN_ADMIN', 
                name: data.name,
                id: data.id,
                email: data.email
            });
            navigate('/dashboard');
        } else {
            setError('Credenciais inválidas ou usuário não encontrado.');
        }
    } catch (err) {
        console.error("Erro inesperado:", err);
        setError('Ocorreu um erro inesperado ao tentar fazer login.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute right-0 top-0 bg-blue-600 w-96 h-96 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute left-0 bottom-0 bg-purple-600 w-96 h-96 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
      </div>

      <Link to="/" className="absolute top-6 left-6 text-white flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity z-10">
         <ArrowLeft size={20} /> Voltar para Home
      </Link>

      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10">
        
        <div className={`absolute top-4 right-4 flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-colors
            ${connectionStatus === 'CONNECTED' ? 'bg-green-50 text-green-700 border-green-200' : ''}
            ${connectionStatus === 'ERROR' ? 'bg-red-50 text-red-700 border-red-200' : ''}
            ${connectionStatus === 'CHECKING' ? 'bg-gray-50 text-gray-600 border-gray-200' : ''}
        `}>
            {connectionStatus === 'CHECKING' && <Loader2 size={12} className="animate-spin" />}
            {connectionStatus === 'CONNECTED' && <Wifi size={14} />}
            {connectionStatus === 'ERROR' && <WifiOff size={14} />}
            
            <span>
                {connectionStatus === 'CHECKING' && 'Conectando...'}
                {connectionStatus === 'CONNECTED' && 'Supabase Online'}
                {connectionStatus === 'ERROR' && 'Supabase Offline'}
            </span>
        </div>

        <div className="flex flex-col items-center mb-8 mt-4">
            <div className="bg-blue-600 p-4 rounded-full text-white mb-4 shadow-lg ring-4 ring-blue-50">
                <Activity size={40} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Painel Master</h1>
            <p className="text-gray-500">Acesso Administrativo SaaS</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                <input 
                    type="email" 
                    className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="admin@fluxeat.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    disabled={loading}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    <input 
                        type="password" 
                        className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-all transform hover:-translate-y-0.5 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex justify-center"
            >
                {loading ? <Loader2 className="animate-spin" /> : 'Acessar Painel'}
            </button>
        </form>
      </div>
    </div>
  );
};
