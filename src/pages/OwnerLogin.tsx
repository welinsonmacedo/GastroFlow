
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { ChefHat, Loader2, Mail, Lock, AlertCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { logSecurityIncident } from '../utils/security';

export const OwnerLogin: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ email: '', password: '' });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const emailTrimmed = form.email.trim();

        try {
            // 1. Autenticação no Supabase Auth (Email/Senha)
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: emailTrimmed,
                password: form.password
            });

            if (authError) {
                logSecurityIncident({
                    type: 'FAILED_LOGIN',
                    severity: 'MEDIUM',
                    details: `Falha de login para o e-mail: ${emailTrimmed}. Motivo: ${authError.message}`
                });
                if (authError.message.includes("Email not confirmed")) {
                    throw new Error("E-mail não confirmado. Verifique sua caixa de entrada antes de acessar.");
                } else if (authError.message.includes("Invalid login credentials")) {
                    throw new Error("E-mail ou senha incorretos.");
                }
                throw authError;
            }

            if (!authData.user) {
                throw new Error("Erro ao obter dados do usuário.");
            }

            const userId = authData.user.id;

            // 2. Descobrir qual o Tenant (Restaurante) deste usuário
            // Query robusta para staff e tenant associado. Usa limit(1) para evitar erro se tiver multiplos vinculos.
            const { data: staffData } = await supabase
                .from('staff')
                .select(`
                    tenant_id, 
                    tenants!inner ( slug, name )
                `)
                .eq('auth_user_id', userId)
                .limit(1)
                .maybeSingle();

            let tenantSlug = '';
            
            // Tenta extrair do staff
            if (staffData && staffData.tenants) {
                 const t = staffData.tenants;
                 // Verifica se é array ou objeto (depende da versão do client, mas usually object com !inner e single)
                 // @ts-ignore 
                 tenantSlug = Array.isArray(t) ? t[0]?.slug : t.slug;
            } 
            
            // Fallback: Verifica se é um Owner Legado (direto na tabela tenants)
            if (!tenantSlug) {
                const { data: tenantData } = await supabase
                    .from('tenants')
                    .select('slug')
                    .eq('owner_auth_id', userId)
                    .limit(1)
                    .maybeSingle();
                
                if (tenantData) {
                    tenantSlug = tenantData.slug;
                }
            }

            if (!tenantSlug) {
                // Se logou no Auth mas não tem restaurante vinculado
                await supabase.auth.signOut();
                throw new Error("Usuário autenticado, mas nenhum restaurante vinculado foi encontrado para este login.");
            }

            // 3. Redirecionar para o ambiente do restaurante
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
                                placeholder="exemplo@fluxeat.com"
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
                                placeholder="••••••"
                                value={form.password}
                                onChange={(e) => setForm({...form, password: e.target.value})}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <Button type="submit" disabled={loading} className="w-full py-3 text-lg bg-slate-900 hover:bg-slate-800">
                        {loading ? <Loader2 className="animate-spin" /> : 'Entrar no Sistema'}
                    </Button>
                </form>
            </div>
        </div>
    );
};
