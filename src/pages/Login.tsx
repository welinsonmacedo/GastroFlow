
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthProvider'; // Use AuthProvider
import { useRestaurant } from '../context/RestaurantContext';
// @ts-ignore
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

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
        if (authState.currentUser.role === 'CLIENT') {
            navigate('/client/home');
        } else {
            // Redireciona para o seletor de módulos ao logar
            navigate('/modules');
        }
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

          // 1. Tenta identificar o tenant se não houver slug na URL
          let tenantId = '';

          if (currentSlug) {
              const { data: tenantRef } = await supabase.from('tenants').select('id').eq('slug', currentSlug).single();
              if (tenantRef) tenantId = tenantRef.id;
          }

          // 2. Busca staff e tenant se não tiver tenantId ou se quiser garantir o vínculo
          let { data: staffData } = await supabase
            .from('staff')
            .select('*, tenants(id, slug, name), custom_roles(permissions)')
            .eq('auth_user_id', userId)
            .maybeSingle();
          
          // Se não encontrou pelo auth_user_id, tenta pelo email no tenant atual (se houver)
          if (!staffData && userEmail && tenantId) {
               const { data: staffByEmail } = await supabase
                .from('staff')
                .select('*, tenants(id, slug, name), custom_roles(permissions)')
                .eq('tenant_id', tenantId)
                .eq('email', userEmail)
                .is('auth_user_id', null)
                .maybeSingle();

               if (staffByEmail) {
                   const { data: updatedStaff } = await supabase
                    .from('staff')
                    .update({ auth_user_id: userId })
                    .eq('id', staffByEmail.id)
                    .select('*, tenants(id, slug, name), custom_roles(permissions)')
                    .single();
                   if (updatedStaff) staffData = updatedStaff;
               }
          }

          // 3. Se ainda não encontrou staff, pode ser um Owner Legado (direto na tabela tenants)
          if (!staffData) {
              const { data: tenantData } = await supabase
                  .from('tenants')
                  .select('id, slug, name')
                  .eq('owner_auth_id', userId)
                  .limit(1)
                  .maybeSingle();
              
              if (tenantData) {
                  // Se for owner, redireciona para o restaurante dele
                  window.location.href = `/?restaurant=${tenantData.slug}`;
                  return;
              }
          }

          if (staffData) {
              const t = staffData.tenants;
              // @ts-ignore
              const actualSlug = Array.isArray(t) ? t[0]?.slug : t?.slug;
              // @ts-ignore
              const actualTenantId = Array.isArray(t) ? t[0]?.id : t?.id;

              // Se o slug da URL for diferente do slug do staff, redireciona
              if (currentSlug && actualSlug && currentSlug !== actualSlug) {
                  throw new Error("Você não tem permissão para acessar este restaurante.");
              }

              if (!currentSlug && actualSlug) {
                  window.location.href = `/?restaurant=${actualSlug}`;
                  return;
              }

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
                  id: staffData.id, 
                  name: staffData.name, 
                  role: staffData.role,
                  tenant_id: actualTenantId,
                  email: staffData.email, 
                  auth_user_id: staffData.auth_user_id, 
                  customRoleId: staffData.custom_role_id,
                  allowedRoutes: allowedRoutes,
                  allowedFeatures: staffData.custom_roles?.permissions?.allowed_features || []
              });
              return;
          }

          throw new Error("Usuário não encontrado ou sem restaurante vinculado.");

      } catch (err: any) {
          setError(err.message || "Erro de autenticação.");
          if (!isRegistering) await supabase.auth.signOut();
      } finally {
          setLoading(false);
      }
  };

  if (authState.isLoading) return <div>Carregando...</div>;

  const bgUrl = restState.theme.loginBgUrl || restState.globalSettings.loginBgUrl;
  const boxColor = restState.theme.loginBoxColor || restState.globalSettings.loginBoxColor || '#ffffff';

  return (
    <div 
        className="min-h-screen bg-slate-900 flex items-center justify-center p-4"
        style={bgUrl ? {
            backgroundImage: `url(${bgUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
        } : {}}
    >
      <div 
        className="rounded-2xl shadow-xl p-8 w-full max-w-md backdrop-blur-sm"
        style={{ backgroundColor: boxColor }}
      >
        <div className="flex flex-col items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">{restState.theme.restaurantName}</h1>
            <p className="text-gray-500 text-sm">{isRegistering ? 'Criar Senha' : ''}</p>
        </div>
        {successMessage && <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">{successMessage}</div>}
        <form onSubmit={handleAuthAction} className="space-y-4">
            <input type="email" className="w-full border p-3 rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
            <input type="password" className="w-full border p-3 rounded" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} required />
            {isRegistering && <input type="password" className="w-full border p-3 rounded" placeholder="Confirmar Senha" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required />}
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <Button type="submit" disabled={loading} className="w-full py-3">{loading ? <Loader2 className="animate-spin mx-auto"/> : 'Entrar'}</Button>
            
        </form>
      </div>
    </div>
  );
};
