import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Lock, Loader2, Mail, KeyRound } from 'lucide-react';
import { Role } from '../types';
import { supabase } from '../lib/supabase';

export const Login: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const navigate = useNavigate();
  
  // Modos de Login: 'PIN' (para staff rápido) ou 'AUTH' (para admin seguro)
  const [loginMode, setLoginMode] = useState<'PIN' | 'AUTH'>('PIN');
  
  // Estado PIN
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [pin, setPin] = useState('');
  
  // Estado Auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redireciona automaticamente se o usuário já estiver autenticado (ex: vindo do OwnerLogin)
  useEffect(() => {
    if (state.currentUser) {
        switch (state.currentUser.role) {
            case Role.ADMIN: navigate('/admin'); break;
            case Role.WAITER: navigate('/waiter'); break;
            case Role.KITCHEN: navigate('/kitchen'); break;
            case Role.CASHIER: navigate('/cashier'); break;
            default: navigate('/waiter');
        }
    }
  }, [state.currentUser, navigate]);

  if (state.isLoading) {
      return (
          <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
             <div className="text-white flex flex-col items-center">
                 <Loader2 size={40} className="animate-spin mb-4" />
                 <p>Carregando sistema...</p>
             </div>
          </div>
      );
  }

  const handlePinLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = state.users.find(u => u.id === selectedUserId);
    
    if (user && user.pin === pin) {
      performLogin(user);
    } else {
      setError('PIN incorreto. Tente novamente.');
    }
  };

  const handleAuthLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');

      try {
          // Autentica direto no Supabase
          const { data, error } = await supabase.auth.signInWithPassword({
              email,
              password
          });

          if (error || !data.user) throw new Error("Email ou senha inválidos.");

          // Verifica se este usuário autenticado pertence ao restaurante atual
          const staffUser = state.users.find(u => u.auth_user_id === data.user?.id);

          if (staffUser) {
              performLogin(staffUser);
          } else {
              throw new Error("Este usuário não tem permissão de acesso neste restaurante.");
          }

      } catch (err: any) {
          setError(err.message || "Erro de autenticação.");
      } finally {
          setLoading(false);
      }
  };

  const performLogin = (user: any) => {
      dispatch({ type: 'LOGIN', user });
      // Redirecionamento é tratado pelo useEffect ou aqui como fallback
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md transition-all">
        <div className="flex flex-col items-center mb-6">
            <div className="p-4 rounded-full text-white mb-4 shadow-lg transition-transform hover:scale-105" style={{backgroundColor: state.theme.primaryColor}}>
                {state.theme.logoUrl ? <img src={state.theme.logoUrl} className="w-10 h-10 object-contain"/> : <ChefHat size={40} />}
            </div>
            <h1 className="text-2xl font-bold text-gray-800 text-center">{state.theme.restaurantName}</h1>
            <p className="text-gray-500 text-sm">Acesso Restrito</p>
        </div>

        {/* Toggle Login Mode */}
        <div className="flex border-b mb-6">
            <button 
                className={`flex-1 pb-2 text-sm font-medium transition-colors ${loginMode === 'PIN' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                onClick={() => { setLoginMode('PIN'); setError(''); }}
            >
                Acesso Rápido (PIN)
            </button>
            <button 
                className={`flex-1 pb-2 text-sm font-medium transition-colors ${loginMode === 'AUTH' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                onClick={() => { setLoginMode('AUTH'); setError(''); }}
            >
                Email e Senha
            </button>
        </div>

        {loginMode === 'PIN' ? (
            <form onSubmit={handlePinLogin} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Selecione seu Usuário</label>
                    <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                        {state.users.map(user => (
                             <div 
                                key={user.id} 
                                onClick={() => { setSelectedUserId(user.id); setError(''); }}
                                className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all group
                                    ${selectedUserId === user.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:bg-gray-50'}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm
                                        ${user.role === Role.ADMIN ? 'bg-purple-500' : ''}
                                        ${user.role === Role.WAITER ? 'bg-orange-500' : ''}
                                        ${user.role === Role.KITCHEN ? 'bg-red-500' : ''}
                                        ${user.role === Role.CASHIER ? 'bg-green-500' : ''}
                                    `}>
                                        {user.name.charAt(0)}
                                    </div>
                                    <span className="font-medium text-gray-700 group-hover:text-gray-900">{user.name}</span>
                                </div>
                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{user.role}</span>
                            </div>
                        ))}
                        {state.users.length === 0 && (
                            <div className="p-4 text-center text-gray-400 border border-dashed rounded-lg bg-gray-50">
                                Nenhum funcionário cadastrado.
                            </div>
                        )}
                    </div>
                </div>

                {selectedUserId && (
                    <div className="animate-fade-in">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Digite seu PIN</label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                type="password" 
                                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg tracking-widest font-mono"
                                placeholder="****"
                                maxLength={4}
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                )}

                {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded border border-red-100">{error}</p>}

                <button 
                    type="submit" 
                    disabled={!selectedUserId || !pin}
                    className="w-full text-white py-3 rounded-lg font-bold hover:opacity-90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    style={{backgroundColor: state.theme.primaryColor}}
                >
                    Entrar
                </button>
            </form>
        ) : (
            <form onSubmit={handleAuthLogin} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
                        <input 
                            type="email" 
                            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="admin@restaurante.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                        <input 
                            type="password" 
                            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="******"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded border border-red-100">{error}</p>}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full text-white py-3 rounded-lg font-bold hover:opacity-90 transition-all shadow-lg disabled:opacity-70"
                    style={{backgroundColor: state.theme.primaryColor}}
                >
                    {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Autenticar'}
                </button>
                
                <p className="text-center text-xs text-gray-400 mt-4">
                    Utilize as credenciais de cadastro do Supabase Auth.
                </p>
            </form>
        )}
      </div>
    </div>
  );
};