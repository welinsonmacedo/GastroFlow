import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChefHat, Lock, Loader2, Mail, AlertCircle, UserPlus, ArrowLeft } from 'lucide-react';
import { Role } from '../types';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { getTenantSlug } from '../utils/tenant';

export const Login: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isRegistering, setIsRegistering] = useState(false); // Alternar entre Login e Cadastro de Senha
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // Apenas para cadastro
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
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

  // Efeito para processar parâmetros de URL (Link de Convite)
  useEffect(() => {
      const params = new URLSearchParams(location.search);
      const emailParam = params.get('email');
      const registerParam = params.get('register');

      if (emailParam) {
          setEmail(emailParam);
      }
      
      if (registerParam === 'true') {
          setIsRegistering(true);
      }
  }, [location.search]);

  const handleAuthAction = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      setSuccessMessage('');

      const emailTrimmed = email.trim();

      try {
          const currentSlug = getTenantSlug();

          if (isRegistering) {
              // --- FLUXO DE CADASTRO (PRIMEIRO ACESSO) ---
              if (password !== confirmPassword) throw new Error("As senhas não coincidem.");
              
              const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                  email: emailTrimmed,
                  password
              });

              if (signUpError) throw signUpError;
              
              if (signUpData.user && !signUpData.session) {
                  setSuccessMessage("Conta criada! Verifique seu e-mail para confirmar o cadastro antes de logar.");
                  setIsRegistering(false); // Volta para login
                  setLoading(false);
                  return;
              }

              // Se o auto-confirm estiver ligado, ele já loga direto e cai no fluxo abaixo
          }

          // --- FLUXO DE LOGIN ---
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
              email: emailTrimmed,
              password
          });

          if (signInError) {
              if (signInError.message.includes("Invalid login credentials")) {
                  throw new Error("E-mail ou senha incorretos. Se este é seu primeiro acesso, clique em 'Criar Senha'.");
              } else if (signInError.message.includes("Email not confirmed")) {
                   throw new Error("E-mail não confirmado. Verifique sua caixa de entrada.");
              }
              throw signInError;
          }

          if (!data.user) throw new Error("Erro desconhecido na autenticação.");

          const userId = data.user.id;
          const userEmail = data.user.email;

          // 2. Tenta encontrar o staff vinculado pelo ID (Cenário Ideal)
          let { data: staffData } = await supabase
              .from('staff')
              .select('*, tenants!inner(slug)')
              .eq('auth_user_id', userId)
              .eq('tenants.slug', currentSlug)
              .maybeSingle();

          // 3. Vínculo Automático (Auto-Link)
          // Se não achou pelo ID, tenta achar pelo EMAIL neste restaurante e atualiza o registro.
          if (!staffData && userEmail) {
               // Busca primeiro o tenantId correto baseado no slug atual para garantir segurança
               const { data: tenantRef } = await supabase.from('tenants').select('id').eq('slug', currentSlug).single();
               
               if (tenantRef) {
                   const { data: staffByEmail } = await supabase
                        .from('staff')
                        .select('*')
                        .eq('tenant_id', tenantRef.id)
                        .eq('email', userEmail)
                        .is('auth_user_id', null) // Só vincula se estiver livre
                        .maybeSingle();

                   if (staffByEmail) {
                       // Realiza o vínculo
                       const { data: updatedStaff, error: updateError } = await supabase
                           .from('staff')
                           .update({ auth_user_id: userId })
                           .eq('id', staffByEmail.id)
                           .select('*, tenants!inner(slug)')
                           .single();
                       
                       if (!updateError && updatedStaff) {
                           staffData = updatedStaff;
                       }
                   }
               }
          }

          if (staffData) {
              // Sucesso: Login válido neste restaurante
              dispatch({ type: 'LOGIN', user: {
                  id: staffData.id,
                  name: staffData.name,
                  role: staffData.role,
                  pin: staffData.pin,
                  email: staffData.email,
                  auth_user_id: staffData.auth_user_id
              }});
              return; // O useEffect vai redirecionar
          }

          // 4. Se chegou aqui, o usuário existe no Auth, mas não neste restaurante.
          // Vamos tentar redirecionar para o restaurante correto dele.
          const { data: otherTenantData } = await supabase
              .from('staff')
              .select('tenants ( slug )')
              .eq('auth_user_id', userId)
              .limit(1)
              .maybeSingle();
          
          let targetSlug = '';
          if (otherTenantData && otherTenantData.tenants) {
               // @ts-ignore
               targetSlug = Array.isArray(otherTenantData.tenants) ? otherTenantData.tenants[0]?.slug : otherTenantData.tenants.slug;
          }

          if (targetSlug && targetSlug !== currentSlug) {
              window.location.href = `/?restaurant=${targetSlug}`;
              return;
          }

          // Se for um novo registro sem vínculo prévio na tabela staff
          if (isRegistering) {
             throw new Error("Conta criada, mas seu usuário não foi encontrado na equipe deste restaurante. Peça ao gerente para cadastrar seu e-mail no painel.");
          }

          throw new Error("Usuário autenticado, mas sem permissão de acesso neste restaurante.");

      } catch (err: any) {
          console.error(err);
          setError(err.message || "Erro de autenticação.");
          if (!isRegistering) await supabase.auth.signOut();
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
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md transition-all border border-gray-100 relative">
        
        {isRegistering && (
            <button 
                onClick={() => { setIsRegistering(false); setError(''); }} 
                className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm"
            >
                <ArrowLeft size={16} /> Voltar
            </button>
        )}

        <div className="flex flex-col items-center mb-6 mt-2">
            <div className="p-4 rounded-full text-white mb-4 shadow-lg transition-transform hover:scale-105" style={{backgroundColor: state.theme.primaryColor}}>
                {state.theme.logoUrl ? <img src={state.theme.logoUrl} className="w-10 h-10 object-contain"/> : <ChefHat size={40} />}
            </div>
            <h1 className="text-2xl font-bold text-gray-800 text-center">{state.theme.restaurantName}</h1>
            <p className="text-gray-500 text-sm">
                {isRegistering ? 'Criar Senha de Acesso' : 'Acesso Administrativo & Staff'}
            </p>
        </div>

        {successMessage && (
            <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-4 flex items-center gap-3 border border-green-200">
                <div className="bg-green-100 p-1 rounded-full"><AlertCircle size={16}/></div>
                <p className="text-sm">{successMessage}</p>
            </div>
        )}

        <form onSubmit={handleAuthAction} className="space-y-4">
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
                        placeholder={isRegistering ? "Crie uma senha segura" : "Sua senha"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                    />
                </div>
            </div>

            {isRegistering && (
                <div className="animate-fade-in">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                        <input 
                            type="password" 
                            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Repita a senha"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>
                </div>
            )}

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
                {loading ? <Loader2 className="animate-spin mx-auto" /> : (isRegistering ? 'Cadastrar e Entrar' : 'Entrar')}
            </Button>
            
            {!isRegistering && (
                <div className="text-center mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2">Foi cadastrado pelo gerente, mas não tem senha?</p>
                    <button 
                        type="button"
                        onClick={() => { setIsRegistering(true); setError(''); }}
                        className="text-sm font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 mx-auto"
                    >
                        <UserPlus size={16} /> Primeiro Acesso / Criar Senha
                    </button>
                </div>
            )}
        </form>
      </div>
    </div>
  );
};