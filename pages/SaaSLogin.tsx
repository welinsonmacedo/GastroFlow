import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSaaS } from '../context/SaaSContext';
import { Activity, Lock, ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const SaaSLogin: React.FC = () => {
  const navigate = useNavigate();
  const { dispatch } = useSaaS();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isSupabaseConfigured()) {
        setError('Erro de configuração: Variáveis de ambiente do Supabase ausentes.');
        setLoading(false);
        return;
    }

    try {
        // 1. TENTATIVA: Supabase Auth (Usuários registrados no painel Authentication)
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (!authError && authData.user) {
            // Login bem-sucedido via Auth nativo
            const adminName = authData.user.user_metadata?.name || email.split('@')[0];
            dispatch({ type: 'LOGIN_ADMIN', name: adminName });
            navigate('/dashboard');
            return;
        }

        // 2. TENTATIVA: Tabela Customizada 'saas_admins' (Usuários de demonstração/legado)
        // Se o Auth falhar, verificamos se é um usuário da tabela de demo
        const { data, error: dbError } = await supabase
            .from('saas_admins')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .maybeSingle();

        if (dbError) {
            console.error("Erro no banco de dados:", dbError);
            setError('Erro ao conectar com o banco de dados.');
        } else if (data) {
            // Login bem-sucedido via tabela customizada
            dispatch({ type: 'LOGIN_ADMIN', name: data.name });
            navigate('/dashboard');
        } else {
            // Falhou nas duas tentativas
            setError('E-mail ou senha incorretos.');
        }
    } catch (err) {
        console.error("Erro inesperado:", err);
        setError('Ocorreu um erro inesperado ao tentar fazer login.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Link to="/" className="absolute top-6 left-6 text-white flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
         <ArrowLeft size={20} /> Voltar para Home
      </Link>

      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
            <div className="bg-blue-600 p-4 rounded-full text-white mb-4 shadow-lg">
                <Activity size={40} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Painel Master</h1>
            <p className="text-gray-500">Acesso exclusivo administrativo</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                <input 
                    type="email" 
                    className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="admin@gastroflow.com"
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
                        className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-50 flex justify-center"
            >
                {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Acessar Painel'}
            </button>
        </form>
      </div>
    </div>
  );
};
