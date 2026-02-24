
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthProvider'; // Use AuthProvider
import { useRestaurant } from '../context/RestaurantContext';
// @ts-ignore
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Loader2, BookOpen } from 'lucide-react';

import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { getTenantSlug } from '../utils/tenant';

export const Login: React.FC = () => {
  const { state: authState, login } = useAuth(); // Auth
  const { state: restState } = useRestaurant(); // Theme only
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authState.currentUser) {
        // Redireciona para o seletor de módulos ao logar
        navigate('/modules');
    }
  }, [authState.currentUser, navigate]);

  useEffect(() => {
      const params = new URLSearchParams(location.search);
      const emailParam = params.get('email');
      const registerParam = params.get('register');
      if (emailParam) setEmail(emailParam);
      if (registerParam === 'true') setIsRegistering(true);
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
              if (password !== confirmPassword) throw new Error("As senhas não coincidem.");
              const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: emailTrimmed, password });
              if (signUpError) throw signUpError;
              if (signUpData.user && !signUpData.session) {
                  setSuccessMessage("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
                  setIsRegistering(false);
                  setLoading(false);
                  return;
              }
          }

          const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: emailTrimmed, password });
          if (signInError) throw signInError;
          if (!data.user) throw new Error("Erro desconhecido.");

          const userId = data.user.id;
          const userEmail = data.user.email;

          // Busca staff e tenant
          const { data: tenantRef } = await supabase.from('tenants').select('id').eq('slug', currentSlug).single();
          if(tenantRef) {
              let { data: staffData } = await supabase
                .from('staff')
                .select('*, custom_roles(permissions)')
                .eq('auth_user_id', userId)
                .eq('tenant_id', tenantRef.id)
                .maybeSingle();
              
              if (!staffData && userEmail) {
                   const { data: staffByEmail } = await supabase
                    .from('staff')
                    .select('*, custom_roles(permissions)')
                    .eq('tenant_id', tenantRef.id)
                    .eq('email', userEmail)
                    .is('auth_user_id', null)
                    .maybeSingle();

                   if (staffByEmail) {
                       const { data: updatedStaff } = await supabase
                        .from('staff')
                        .update({ auth_user_id: userId })
                        .eq('id', staffByEmail.id)
                        .select('*, custom_roles(permissions)')
                        .single();
                       if (updatedStaff) staffData = updatedStaff;
                   }
              }

              if (staffData) {
                  let allowedRoutes = staffData.allowed_routes || [];
                  
                  
                  if (staffData.custom_roles?.permissions) {
                      if (staffData.custom_roles.permissions.allowed_modules) {
                          allowedRoutes = staffData.custom_roles.permissions.allowed_modules;
                      }
                      
                  } else if (staffData.role === 'ADMIN') {
                      allowedRoutes = ['RESTAURANT', 'SNACKBAR', 'DISTRIBUTOR', 'COMMERCE', 'MANAGER', 'CONFIG', 'FINANCE', 'INVENTORY', 'HR'];
                      
                  } else if (!staffData.custom_role_id && allowedRoutes.length === 0) {
                      if (['WAITER', 'KITCHEN', 'CASHIER'].includes(staffData.role)) {
                          allowedRoutes = ['RESTAURANT'];
                          if (staffData.role === 'CASHIER') allowedRoutes.push('COMMERCE');
                      }
                  }

                  login({
                      id: staffData.id, name: staffData.name, role: staffData.role,
                      tenant_id: tenantRef.id, // Adicionado aqui
                      email: staffData.email, auth_user_id: staffData.auth_user_id, 
                      customRoleId: staffData.custom_role_id,
                      allowedRoutes: allowedRoutes,
                      allowedFeatures: staffData.custom_roles?.permissions?.allowed_features || []
                  });
                  return;
              }
          }
          throw new Error("Usuário não encontrado nesta equipe.");

      } catch (err: any) {
          setError(err.message || "Erro de autenticação.");
          if (!isRegistering) await supabase.auth.signOut();
      } finally {
          setLoading(false);
      }
  };

  if (authState.isLoading) return <div>Carregando...</div>;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">{restState.theme.restaurantName}</h1>
            <p className="text-gray-500 text-sm">{isRegistering ? 'Criar Senha' : 'Acesso Staff'}</p>
        </div>
        {successMessage && <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">{successMessage}</div>}
        <form onSubmit={handleAuthAction} className="space-y-4">
            <input type="email" className="w-full border p-3 rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
            <input type="password" className="w-full border p-3 rounded" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} required />
            {isRegistering && <input type="password" className="w-full border p-3 rounded" placeholder="Confirmar Senha" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required />}
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <Button type="submit" disabled={loading} className="w-full py-3">{loading ? <Loader2 className="animate-spin mx-auto"/> : 'Entrar'}</Button>
            <div className="text-center pt-4 border-t">
                {!isRegistering && (
                    <div className="flex flex-col gap-3">
                        <button type="button" onClick={() => setIsRegistering(true)} className="text-blue-600 text-sm hover:underline">Primeiro Acesso?</button>
                        <Link to="/manual" className="text-slate-500 text-xs hover:text-slate-700 flex items-center justify-center gap-1 transition-colors">
                            <BookOpen size={14} /> Manual do Sistema & Ajuda
                        </Link>
                    </div>
                )}
                {isRegistering && (
                    <button type="button" onClick={() => setIsRegistering(false)} className="text-slate-500 text-sm hover:underline">Voltar para Login</button>
                )}
            </div>
        </form>
      </div>
    </div>
  );
};
