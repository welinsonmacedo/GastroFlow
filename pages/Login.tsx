import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Lock, Loader2, Mail, AlertCircle } from 'lucide-react';
import { Role } from '../types';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';

export const Login: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redireciona automaticamente se o usuário já estiver autenticado no contexto
  useEffect(() => {
    if (state.currentUser) {
        const role = state.currentUser.role;
        if (role === Role.ADMIN) navigate('/admin');
        else if (role === Role.WAITER) navigate('/waiter');
        else if (role === Role.KITCHEN) navigate('/kitchen');
        else if (role === Role.CASHIER) navigate('/cashier');
        else navigate('/waiter');
    }
  }, [state.currentUser, navigate]);

  const handleAuthLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');

      try {
          // 1. Autentica no Supabase Auth
          const { data, error } = await supabase.auth.signInWithPassword({
              email,
              password
          });

          if (error || !data.user) throw new Error("Email ou senha inválidos.");

          // 2. Verifica vínculo com o restaurante atual
          const userId = data.user.id;
          
          // Verifica se o usuário existe na tabela 'staff' deste tenant
          // Nota: Usamos maybeSingle direto no banco para garantir dados frescos, 
          // caso o state.users ainda não tenha carregado via realtime.
          const { data: localStaff } = await supabase
              .from('staff')
              .select('*')
              .eq('tenant_id', state.tenantId)
              .eq('auth_user_id', userId)
              .maybeSingle();

          if (localStaff) {
              // Sucesso: O usuário pertence a este restaurante.
              // O listener onAuthStateChange no Context vai pegar o evento de login,
              // mas disparamos aqui para feedback imediato na UI se necessário.
              dispatch({ type: 'LOGIN', user: {
                  id: localStaff.id,
                  name: localStaff.name,
                  role: localStaff.role,
                  pin: localStaff.pin,
                  email: localStaff.email,
                  auth_user_id: localStaff.auth_user_id
              }});
              return;
          }

          // 3. Se não pertence a este, tenta redirecionar para o correto
          const { data: correctTenantData } = await supabase
              .from('staff')
              .select('tenants ( slug )')
              .eq('auth_user_id', userId)
              .maybeSingle();
          
          let targetSlug = '';
          if (correctTenantData && correctTenantData.tenants) {
               // @ts-ignore
               targetSlug = Array.isArray(correctTenantData.tenants) ? correctTenantData.tenants[0]?.slug : correctTenantData.tenants.slug;
          }

          if (targetSlug && targetSlug !== state.tenantSlug) {
              // Redireciona
              window.location.href = `/?restaurant=${targetSlug}`;
              return;
          }

          throw new Error("Usuário autenticado, mas sem permissão de acesso neste restaurante.");

      } catch (err: any) {
          console.error(err);
          setError(err.message || "Erro de autenticação.");
          await supabase.auth.signOut(); // Limpa sessão inválida
      } finally {
          setLoading(false);
      }
  };

  if (state.isLoading) {
      return (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center">
             <div className="text-white flex flex-col items-center">
                 <Loader2 size={40} className="animate-spin mb-4" />
                 <p>Carregando sistema...</p>
             </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md transition-all border border-gray-100">
        
        <div className="flex flex-col items-center mb-8">
            <div className="p-4 rounded-full text-white mb-4 shadow-lg transition-transform hover:scale-105" style={{backgroundColor: state.theme.primaryColor}}>
                {state.theme.logoUrl ? <img src={state.theme.logoUrl} className="w-10 h-10 object-contain"/> : <ChefHat size={40} />}
            </div>
            <h1 className="text-2xl font-bold text-gray-800 text-center">{state.theme.restaurantName}</h1>
            <p className="text-gray-500 text-sm">Acesso Administrativo & Staff</p>
        </div>

        <form onSubmit={handleAuthLogin} className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    <input 
                        type="email" 
                        className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="usuario@restaurante.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    <input 
                        type="password" 
                        className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <Button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 text-lg font-bold shadow-md hover:shadow-lg transition-all"
                style={{backgroundColor: state.theme.primaryColor}}
            >
                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Entrar'}
            </Button>
            
            <p className="text-center text-xs text-gray-400 mt-4">
                Login seguro via Supabase Auth.
            </p>
        </form>
      </div>
    </div>
  );
};