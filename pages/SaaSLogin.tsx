import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSaaS } from '../context/SaaSContext';
import { Activity, Lock, ArrowLeft } from 'lucide-react';

export const SaaSLogin: React.FC = () => {
  const navigate = useNavigate();
  const { dispatch } = useSaaS();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mock simples de autenticação do Dono
    if (email === 'admin@gastroflow.com' && password === 'admin') {
      dispatch({ type: 'LOGIN_ADMIN', name: 'CEO GastroFlow' });
      navigate('/dashboard');
    } else {
      setError('Credenciais inválidas. (Dica: admin@gastroflow.com / admin)');
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
                    />
                </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button 
                type="submit" 
                className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors shadow-lg"
            >
                Acessar Painel
            </button>
        </form>
      </div>
    </div>
  );
};