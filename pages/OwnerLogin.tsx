import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { ChefHat, ArrowLeft, Loader2, Mail, Lock, AlertCircle } from 'lucide-react';
import { Button } from '../components/Button';

export const OwnerLogin: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ email: '', password: '' });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Auth do Supabase
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: form.email,
                password: form.password
            });

            if (authError || !authData.user) {
                throw new Error("Email ou senha incorretos.");
            }

            // 2. Descobrir qual o Tenant deste usuário
            const { data: staffData, error: staffError } = await supabase
                .from('staff')
                .select('tenant_id, tenants(slug)')
                .eq('auth_user_id', authData.user.id)
                .single();

            if (staffError || !staffData) {
                // Tentar ver se é dono direto na tabela tenants (caso legado ou falha no staff)
                const { data: tenantData } = await supabase
                    .from('tenants')
                    .select('slug')
                    .eq('owner_auth_id', authData.user.id)
                    .single();
                
                if (tenantData) {
                    window.location.href = `/?restaurant=${tenantData.slug}`;
                    return;
                }

                throw new Error("Usuário não vinculado a nenhum restaurante.");
            }

            // 3. Redirecionar para a URL do restaurante
            const slug = (staffData.tenants as any).slug;
            if (slug) {
                // Força um reload para garantir que o Contexto pegue o novo Slug e a Sessão Auth
                window.location.href = `/?restaurant=${slug}`;
            } else {
                throw new Error("Erro na configuração do restaurante.");
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Erro ao fazer login.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
            <Link to="/" className="absolute top-6 left-6 text-white flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
                <ArrowLeft size={20} /> Voltar
            </Link>

            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-blue-600 p-4 rounded-full text-white mb-4 shadow-lg">
                        <ChefHat size={40} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">Login GastroFlow</h1>
                    <p className="text-gray-500">Acesso para Donos e Gerentes</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
                            <input 
                                type="email"
                                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="seu@email.com"
                                value={form.email}
                                onChange={(e) => setForm({...form, email: e.target.value})}
                                autoFocus
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
                                value={form.password}
                                onChange={(e) => setForm({...form, password: e.target.value})}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <Button type="submit" disabled={loading} className="w-full py-3 text-lg bg-slate-800 hover:bg-slate-900">
                        {loading ? <Loader2 className="animate-spin" /> : 'Entrar no Painel'}
                    </Button>

                    <div className="text-center pt-4 border-t">
                        <p className="text-sm text-gray-500 mb-2">Não tem uma conta?</p>
                        <Link to="/register" className="text-blue-600 font-bold hover:underline">
                            Cadastrar Restaurante Grátis
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};