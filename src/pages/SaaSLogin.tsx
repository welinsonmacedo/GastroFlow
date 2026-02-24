
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { useSaaS } from '../context/SaaSContext';
import { Activity, Lock, AlertCircle, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { logSecurityIncident } from '../utils/security';

export const SaaSLogin: React.FC = () => {
  const navigate = useNavigate();
  const { dispatch } = useSaaS();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estado da conexão
  const [connectionStatus, setConnectionStatus] = useState<'CHECKING' | 'CONNECTED' | 'ERROR'>('CHECKING');

  // Verifica conexão ao montar o componente
  useEffect(() => {
    let isMounted = true;

    const checkConnection = async () => {
      if (!isSupabaseConfigured()) {
        if (isMounted) setConnectionStatus('ERROR');
        return;
      }

      try {
        // Tenta um ping simples no banco
        const { error } = await supabase.from('tenants').select('count', { count: 'exact', head: true });
        
        if (!isMounted) return;

        if (error) {
          // Normaliza strings para verificação insensível a case
          const msg = (error.message || '').toLowerCase();
          const details = (error.details || '').toLowerCase();
          const hint = (error.hint || '').toLowerCase();

          // Ignora erros de cancelamento (AbortError) comuns
          const isAbort = 
              msg.includes('abort') || 
              msg.includes('signal is aborted') ||
              details.includes('abort') ||
              hint.includes('abort');
          
          if (!isAbort) {
             console.error("Erro de conexão Supabase:", error);
             setConnectionStatus('ERROR');
          } else {
             // Se foi abortado, mas não é erro de rede crítico, assumimos conectado ou tentamos novamente depois
             // Para UX, mantemos como conectado para não bloquear o login se for apenas um glitch de montagem
             setConnectionStatus('CONNECTED');
          }
        } else {
          setConnectionStatus('CONNECTED');
        }
      } catch (err: any) {
        if (!isMounted) return;
        
        // Verifica AbortError no catch também
        const msg = (err.message || '').toLowerCase();
        const name = (err.name || '').toLowerCase();
        
        if (name.includes('abort') || msg.includes('abort')) {
            setConnectionStatus('CONNECTED'); // Assume OK se foi cancelado localmente
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

    // Permite tentar login mesmo se o check falhou, pois pode ser falso negativo, 
    // mas avisa se estiver explicitamente offline
    if (connectionStatus === 'ERROR') {
        // Não bloqueia totalmente, mas avisa
        console.warn("Tentando login mesmo com status de conexão ERROR");
    }

    try {
        // 1. TENTATIVA PRINCIPAL: Supabase Auth (Painel Authentication)
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

        // 2. FALLBACK: Tabela Customizada 'saas_admins'
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
            // Se falhou no Auth e na Tabela
            logSecurityIncident({
                type: 'FAILED_LOGIN_SAAS',
                severity: 'CRITICAL',
                details: `Falha de login no painel SaaS para o e-mail: ${email}`
            });
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
      {/* Background Decorativo */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute right-0 top-0 bg-blue-600 w-96 h-96 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute left-0 bottom-0 bg-purple-600 w-96 h-96 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10">
        
        {/* Indicador de Status Supabase */}
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
