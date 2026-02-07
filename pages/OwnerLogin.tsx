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
            // 1. Autenticação no Supabase Auth (Email/Senha)
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: form.email,
                password: form.password
            });

            if (authError || !authData.user) {
                throw new Error("Credenciais inválidas. Verifique seu e-mail e senha.");
            }

            const userId = authData.user.id;

            // 2. Descobrir qual o Tenant (Restaurante) deste usuário
            // Buscamos na tabela 'staff' onde o auth_user_id corresponde ao usuário logado.
            // A query traz também os dados da tabela 'tenants' relacionada.
            const { data: staffData, error: staffError } = await supabase
                .from('staff')
                .select('tenant_id, tenants ( slug, name )')
                .eq('auth_user_id', userId)
                .maybeSingle();

            // Se não encontrou staff, tenta verificar se é um "Dono Legado" direto na tabela tenants (fallback)
            let tenantSlug = '';
            
            if (staffData && staffData.tenants) {
                // @ts-ignore - Supabase join types inferidos
                tenantSlug = staffData.tenants.slug;
            } else {
                // Fallback: Verifica owner_auth_id direto na tabela tenants
                const { data: tenantData } = await supabase
                    .from('tenants')
                    .select('slug')
                    .eq('owner_auth_id', userId)
                    .maybeSingle();
                
                if (tenantData) {
                    tenantSlug = tenantData.slug;
                }
            }

            if (!tenantSlug) {
                // Se logou no Auth mas não tem restaurante vinculado
                await supabase.auth.signOut();
                throw new Error("Usuário autenticado, mas nenhum restaurante vinculado foi encontrado.");
            }

            // 3. Redirecionar para o ambiente do restaurante
            // O App.tsx vai detectar o parâmetro ?restaurant=slug e carregar o contexto correto
            window.location.href = `/?restaurant=${tenantSlug}`;

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Ocorreu um erro ao tentar fazer login.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorativo */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute right-0 top-0 bg-blue-600 w-96 h-96 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute left-0 bottom-0 bg-purple-600 w-96 h-96 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
            </div>

            <Link to="/" className="absolute top-6 left-6 text-white flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity z-10">
                <ArrowLeft size={20} /> Voltar para Home
            </Link>

            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md z-10">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-blue-600 p-4 rounded-full text-white mb-4 shadow-lg ring-4 ring-blue-50">
                        <ChefHat size={40} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">Minha Conta</h1>
                    <p className="text-gray-500">Gerencie seu restaurante</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">E-mail Cadastrado</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
                            <input 
                                type="email"
                                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="exemplo@gastroflow.com"
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
                                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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

                    <Button type="submit" disabled={loading} className="w-full py-3 text-lg bg-slate-900 hover:bg-slate-800">
                        {loading ? <Loader2 className="animate-spin" /> : 'Entrar no Sistema'}
                    </Button>

                    <div className="text-center pt-4 border-t">
                        <p className="text-sm text-gray-500 mb-2">Ainda não é cliente?</p>
                        <Link to="/register" className="text-blue-600 font-bold hover:underline">
                            Criar Restaurante Grátis
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};