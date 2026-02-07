import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { ChefHat, ArrowLeft, Loader2, CheckCircle, Store, Mail, Lock, User as UserIcon } from 'lucide-react';
import { Button } from '../components/Button';

export const RegisterRestaurant: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [form, setForm] = useState({
        restaurantName: '',
        slug: '',
        ownerName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const autoGenerateSlug = (name: string) => {
        const slug = name.toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/--+/g, '-');
        setForm(prev => ({ ...prev, restaurantName: name, slug }));
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (form.password !== form.confirmPassword) {
            setError("As senhas não coincidem.");
            setLoading(false);
            return;
        }

        try {
            // 1. Criar Usuário no Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: form.email,
                password: form.password,
                options: {
                    data: { name: form.ownerName }
                }
            });

            if (authError) throw authError;

            if (authData.user) {
                // 2. Criar Tenant
                const defaultTheme = {
                    primaryColor: '#2563eb',
                    backgroundColor: '#ffffff',
                    fontColor: '#1f2937',
                    restaurantName: form.restaurantName,
                    logoUrl: ''
                };

                const { data: tenant, error: tenantError } = await supabase.from('tenants').insert({
                    name: form.restaurantName,
                    slug: form.slug,
                    owner_name: form.ownerName,
                    email: form.email,
                    owner_auth_id: authData.user.id,
                    plan: 'FREE',
                    status: 'ACTIVE',
                    theme_config: defaultTheme
                }).select().single();

                if (tenantError) throw tenantError;

                // 3. Criar Staff ADMIN vinculado ao Auth User
                const { error: staffError } = await supabase.from('staff').insert({
                    tenant_id: tenant.id,
                    name: form.ownerName,
                    email: form.email,
                    role: 'ADMIN',
                    pin: '1234', // Pin de backup
                    auth_user_id: authData.user.id
                });

                if (staffError) throw staffError;

                // Sucesso!
                setStep(2);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Erro ao criar conta. Verifique se o Slug já existe ou tente outro email.");
        } finally {
            setLoading(false);
        }
    };

    if (step === 2) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="bg-green-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} className="text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Restaurante Criado!</h2>
                    <p className="text-gray-600 mb-8">
                        Seu acesso ao <strong>{form.restaurantName}</strong> foi configurado. Você já pode acessar o painel administrativo.
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg text-sm text-left mb-6 border">
                        <p className="mb-1"><span className="font-bold">Login:</span> {form.email}</p>
                        <p><span className="font-bold">Link Direto:</span> gastroflow.com/?restaurant={form.slug}</p>
                    </div>
                    <Button onClick={() => window.location.href = `/?restaurant=${form.slug}`} className="w-full">
                        Acessar Meu Restaurante
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <Link to="/" className="absolute top-6 left-6 text-gray-500 flex items-center gap-2 hover:text-blue-600 transition-colors">
                <ArrowLeft size={20} /> Voltar
            </Link>

            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="bg-slate-900 p-6 text-white text-center">
                    <div className="inline-flex items-center justify-center gap-2 bg-slate-800 p-3 rounded-full mb-3">
                         <ChefHat size={24} className="text-blue-400"/>
                    </div>
                    <h1 className="text-2xl font-bold">Cadastre seu Restaurante</h1>
                    <p className="text-slate-400 text-sm">Comece grátis hoje mesmo.</p>
                </div>

                <form onSubmit={handleRegister} className="p-8 space-y-5">
                    
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Store size={16} /> Dados do Negócio
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Restaurante</label>
                            <input 
                                required
                                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ex: Pizzaria do Zé"
                                value={form.restaurantName}
                                onChange={(e) => autoGenerateSlug(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">URL Personalizada (Slug)</label>
                            <div className="flex items-center border rounded-lg overflow-hidden bg-gray-50">
                                <span className="pl-3 pr-1 text-gray-500 text-sm select-none">gastroflow.com/</span>
                                <input 
                                    required
                                    className="flex-1 p-3 bg-transparent focus:outline-none text-blue-600 font-medium"
                                    placeholder="pizzaria-do-ze"
                                    value={form.slug}
                                    onChange={(e) => setForm({...form, slug: e.target.value.toLowerCase().replace(/\s/g, '-')})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4 space-y-4">
                         <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <UserIcon size={16} /> Dados de Acesso (Dono)
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Seu Nome</label>
                            <input 
                                required
                                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Nome completo"
                                value={form.ownerName}
                                onChange={(e) => setForm({...form, ownerName: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                <input 
                                    required
                                    type="email"
                                    className="w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="seu@email.com"
                                    value={form.email}
                                    onChange={(e) => setForm({...form, email: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                    <input 
                                        required
                                        type="password"
                                        className="w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="******"
                                        value={form.password}
                                        onChange={(e) => setForm({...form, password: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar</label>
                                <input 
                                    required
                                    type="password"
                                    className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="******"
                                    value={form.confirmPassword}
                                    onChange={(e) => setForm({...form, confirmPassword: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                            <span className="font-bold">Erro:</span> {error}
                        </div>
                    )}

                    <Button type="submit" disabled={loading} className="w-full py-4 text-lg mt-2">
                        {loading ? <Loader2 className="animate-spin" /> : 'Criar Conta e Restaurante'}
                    </Button>
                    
                    <p className="text-center text-sm text-gray-500">
                        Já tem uma conta? <Link to="/login-owner" className="text-blue-600 hover:underline">Fazer Login</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};