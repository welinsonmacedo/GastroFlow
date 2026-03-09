
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { User, Lock, Phone, FileText, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { Role } from '../types';
import { GlobalLoading } from '../components/GlobalLoading';

export const ClientLogin = () => {
  const { state: authState, refreshSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    cpf: ''
  });

  const redirectUrl = new URLSearchParams(location.search).get('redirect') || '/client/home';

  useEffect(() => {
    if (authState.isAuthenticated && authState.currentUser?.role === Role.CLIENT) {
      navigate(redirectUrl);
    }
  }, [authState.isAuthenticated, authState.currentUser, navigate, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });
        if (error) throw error;

        if (data.user) {
            const { data: client } = await supabase
                .from('clients')
                .select('id')
                .eq('auth_user_id', data.user.id)
                .maybeSingle();

            if (!client) {
                // Tenta criar perfil de cliente automaticamente
                const name = data.user.user_metadata?.name || formData.email.split('@')[0];
                
                const { error: createError } = await supabase
                    .from('clients')
                    .insert({
                        auth_user_id: data.user.id,
                        name: name
                    });
                
                if (createError) {
                    console.error("Erro ao criar perfil de cliente:", createError);
                    await supabase.auth.signOut();
                    throw new Error("Perfil de cliente incompleto. Por favor, faça o cadastro novamente preenchendo todos os dados.");
                }
            }
        }
      } else {
        const { error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
              phone: formData.phone,
              cpf: formData.cpf
            }
          }
        });

        if (authError) throw authError;
        
        // A criação do perfil 'clients' agora é feita via Trigger no banco de dados
        // (estrutura sql/fix_client_signup_trigger.sql) para evitar erro de RLS
      }

      await refreshSession();
      navigate(redirectUrl);
    } catch (err: any) {
      console.error('Erro de autenticação:', err);
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            {isLogin ? 'Bem-vindo de volta' : 'Criar Conta'}
          </h1>
          <p className="text-zinc-400">
            {isLogin
              ? 'Entre para acessar seus pedidos e histórico'
              : 'Cadastre-se para fazer pedidos e acompanhar seu histórico'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Seu nome"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">CPF</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={formData.cpf}
                    onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
              <input
                type="password"
                required
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="******"
                minLength={6}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-zinc-400 hover:text-white text-sm transition-colors"
          >
            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
          </button>
        </div>
      </motion.div>
      {loading && <GlobalLoading message={isLogin ? 'Entrando...' : 'Criando conta...'} />}
    </div>
  );
};
