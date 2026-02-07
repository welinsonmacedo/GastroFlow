import React, { useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useNavigate, Link } from 'react-router-dom';
import { ChefHat, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { Role } from '../types';

export const Login: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = state.users.find(u => u.id === selectedUserId);
    
    if (user && user.pin === pin) {
      dispatch({ type: 'LOGIN', user });
      
      // Redirect based on role within the RESTAURANT context only
      switch (user.role) {
        case Role.ADMIN: navigate('/admin'); break;
        case Role.WAITER: navigate('/waiter'); break;
        case Role.KITCHEN: navigate('/kitchen'); break;
        case Role.CASHIER: navigate('/cashier'); break;
        default: navigate('/waiter'); // Default fallback
      }
    } else {
      setError('Senha incorreta');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
            <div className="p-4 rounded-full text-white mb-4 shadow-lg" style={{backgroundColor: state.theme.primaryColor}}>
                {state.theme.logoUrl ? <img src={state.theme.logoUrl} className="w-10 h-10 object-contain"/> : <ChefHat size={40} />}
            </div>
            <h1 className="text-3xl font-bold text-gray-800">{state.theme.restaurantName}</h1>
            <p className="text-gray-500">Acesso da Equipe</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Selecione o Usuário</label>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                    {state.users.map(user => (
                         <div 
                            key={user.id} 
                            onClick={() => { setSelectedUserId(user.id); setError(''); }}
                            className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all
                                ${selectedUserId === user.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:bg-gray-50'}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold
                                    ${user.role === Role.ADMIN ? 'bg-purple-500' : ''}
                                    ${user.role === Role.WAITER ? 'bg-orange-500' : ''}
                                    ${user.role === Role.KITCHEN ? 'bg-red-500' : ''}
                                    ${user.role === Role.CASHIER ? 'bg-green-500' : ''}
                                `}>
                                    {user.name.charAt(0)}
                                </div>
                                <span className="font-medium text-gray-700">{user.name}</span>
                            </div>
                            <span className="text-xs text-gray-400 uppercase">{user.role}</span>
                        </div>
                    ))}
                    {state.users.length === 0 && (
                        <div className="p-4 text-center text-gray-400 border border-dashed rounded-lg">
                            Nenhum usuário encontrado.
                        </div>
                    )}
                </div>
            </div>

            {selectedUserId && (
                <div className="animate-fade-in">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Senha de Acesso (PIN)</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            type="password" 
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="Digite o PIN"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            autoFocus
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
            )}

            <button 
                type="submit" 
                disabled={!selectedUserId || !pin}
                className="w-full text-white py-3 rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                style={{backgroundColor: state.theme.primaryColor}}
            >
                Entrar
            </button>
        </form>
        
        <div className="mt-6 text-center text-xs text-gray-400">
             <p>PINS Padrão:</p>
             <p>Admin: 1234 | Garçom: 0000</p>
        </div>
      </div>
    </div>
  );
};