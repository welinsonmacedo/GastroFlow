
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useSaaS } from '../../context/SaaSContext';
import { RestaurantTenant, PlanType } from '../../types';
import { Check, Copy, Palette, Layout, Image as ImageIcon, Box, Upload, Link as LinkIcon, Loader2 } from 'lucide-react';
import { PERMISSIONS_SCHEMA } from '../../constants';
import { uploadImage } from '../../context/SaaSContext';

export const ImageUploadField = ({ 
    label, 
    value, 
    onChange, 
    path = 'branding' 
}: { 
    label: string, 
    value: string, 
    onChange: (val: string) => void,
    path?: string
}) => {
    const [uploading, setUploading] = useState(false);
    const [mode, setMode] = useState<'URL' | 'UPLOAD'>(value?.startsWith('http') ? 'URL' : 'UPLOAD');

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const url = await uploadImage(file, path);
            onChange(url);
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Falha no upload da imagem.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-gray-500 uppercase">{label}</label>
                <div className="flex gap-1 bg-slate-100 p-0.5 rounded-md">
                    <button 
                        onClick={() => setMode('URL')}
                        className={`p-1 rounded text-[9px] font-bold transition-all ${mode === 'URL' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                    >
                        <LinkIcon size={10} className="inline mr-1" /> URL
                    </button>
                    <button 
                        onClick={() => setMode('UPLOAD')}
                        className={`p-1 rounded text-[9px] font-bold transition-all ${mode === 'UPLOAD' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                    >
                        <Upload size={10} className="inline mr-1" /> UPLOAD
                    </button>
                </div>
            </div>
            
            {mode === 'URL' ? (
                <input 
                    className="w-full border p-2 rounded text-sm" 
                    placeholder="https://..."
                    value={value || ''} 
                    onChange={e => onChange(e.target.value)} 
                />
            ) : (
                <div className="relative">
                    <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden" 
                        id={`upload-${label}`}
                        disabled={uploading}
                    />
                    <label 
                        htmlFor={`upload-${label}`}
                        className={`w-full border-2 border-dashed p-2 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors ${uploading ? 'bg-slate-50 border-slate-200' : 'hover:bg-blue-50 hover:border-blue-200 border-slate-300'}`}
                    >
                        {uploading ? (
                            <Loader2 size={14} className="animate-spin text-blue-600" />
                        ) : (
                            <Upload size={14} className="text-slate-400" />
                        )}
                        <span className="truncate max-w-[150px]">{value ? 'Alterar Imagem' : 'Selecionar Arquivo'}</span>
                    </label>
                    {value && !uploading && (
                        <div className="mt-1 flex items-center gap-2">
                            <img src={value} className="w-8 h-8 rounded border object-cover" />
                            <span className="text-[10px] text-slate-400 truncate flex-1">{value}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const MODULE_STRUCTURE = {
    RESTAURANT: {
        label: "Restaurante",
        description: "Operação completa de salão e cozinha.",
        features: [
            { key: "restaurant_waiter", label: "Salão & Mesas (Garçom)" },
            { key: "restaurant_kds", label: "Cozinha (KDS)" },
            { key: "restaurant_cashier", label: "Caixa Gastronômico" }
        ]
    },
    SNACKBAR: {
        label: "Lanchonete / Fast-food",
        description: "Fluxo rápido: Pedido no Caixa -> Cozinha -> Entrega.",
        features: [
            { key: "snackbar_pos", label: "Caixa Rápido" },
            { key: "snackbar_kds", label: "KDS Simplificado" },
            { key: "snackbar_call_panel", label: "Painel de Chamada (TV)" }
        ]
    },
    DISTRIBUTOR: {
        label: "Distribuidora",
        description: "Venda atacado e rotas de entrega.",
        features: [
            { key: "distributor_sales", label: "Venda Balcão/Telefone" },
            { key: "distributor_routes", label: "Gestão de Rotas" },
            { key: "distributor_inventory", label: "Estoque de Grade" }
        ]
    },
    COMMERCE: {
        label: "Comércio (Varejo)",
        description: "PDV rápido tipo supermercado.",
        features: [
            { key: "commerce_pos", label: "PDV (Caixa Rápido)" },
            { key: "commerce_finance", label: "Financeiro Simplificado" },
            { key: "commerce_reports", label: "Relatórios de Venda" }
        ]
    },
    INVENTORY: {
        label: "Estoque",
        description: "Controle avançado de insumos e compras.",
        features: [
            { key: "inventory_manage", label: "Gestão (Itens, Balanço, Logs)" },
            { key: "inventory_purchases", label: "Compras (Notas Fiscais, Sugestões)" },
            { key: "inventory_suppliers", label: "Gestão de Fornecedores" }
        ]
    },
    HR: {
        label: "RH & Equipe",
        description: "Gestão de ponto, escalas e pré-folha.",
        features: [
            { key: "rh_staff_list", label: "Cadastro de Colaboradores" },
            { key: "rh_attendance", label: "Controle de Ponto" },
            { key: "rh_schedules", label: "Escalas & Turnos" },
            { key: "rh_payroll", label: "Geração de Pré-Folha" }
        ]
    },
    MANAGER: {
        label: "Gestor (Backoffice)",
        description: "Administração geral e cadastros.",
        features: [
            { key: "admin_overview", label: "Visão Geral & Monitoramento Online" },
            { key: "admin_products", label: "Cardápio Digital" },
            { key: "admin_tables", label: "Mesas & QR Code" }
        ]
    },
    FINANCE: {
        label: "Financeiro",
        description: "Controle fiscal, DRE e BI.",
        features: [
            { key: "finance_expenses", label: "Fluxo de Caixa & Despesas" },
            { key: "finance_dre", label: "DRE Gerencial" },
            { key: "finance_bi", label: "Business Intelligence (BI)" },
            { key: "finance_reports", label: "Relatórios Detalhados" },
            { key: "finance_tips", label: "Dicas Financeiras" }
        ]
    },
    CONFIG: {
        label: "Configurações",
        description: "Ajustes do sistema e segurança.",
        features: [
            { key: "config_business", label: "Dados da Empresa" },
            { key: "config_operations", label: "Regras Operacionais" },
            { key: "config_delivery", label: "Config. Delivery & Taxas" },
            { key: "config_finance_settings", label: "Config. Financeira (Pagamentos)" },
            { key: "config_security", label: "Segurança (Senha Mestra)" },
            { key: "config_appearance", label: "Aparência (White-label)" },
            { key: "config_staff", label: "Equipe & Acessos" }
        ]
    }
};

// --- Create Tenant Modal ---
export const SaaSTenantCreateModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { state, dispatch } = useSaaS();
    const [form, setForm] = useState({ name: '', slug: '', ownerName: '', email: '', plan: '' as PlanType });

    const autoGenerateSlug = (name: string) => {
        const slug = name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-');
        setForm(prev => ({ ...prev, name, slug }));
    };

    const handleSubmit = () => {
        if (!form.plan) {
            alert('Selecione um plano');
            return;
        }
        dispatch({ type: 'CREATE_TENANT', payload: form });
        setForm({ name: '', slug: '', ownerName: '', email: '', plan: '' });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Novo Restaurante" variant="dialog" maxWidth="md" onSave={handleSubmit}>
            <div className="space-y-4">
                <input type="text" required className="w-full border p-2.5 rounded-lg" placeholder="Nome" value={form.name} onChange={(e) => autoGenerateSlug(e.target.value)} autoFocus />
                <input type="text" required className="w-full border p-2.5 rounded-lg" placeholder="Slug (URL)" value={form.slug} onChange={(e) => setForm({...form, slug: e.target.value})} />
                <input type="text" required className="w-full border p-2.5 rounded-lg" placeholder="Nome do Dono" value={form.ownerName} onChange={(e) => setForm({...form, ownerName: e.target.value})} />
                <input type="email" required className="w-full border p-2.5 rounded-lg" placeholder="Email do Dono" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
                <select 
                    className="w-full border p-2.5 rounded-lg bg-white" 
                    value={form.plan} 
                    onChange={(e) => setForm({...form, plan: e.target.value})}
                >
                    <option value="" disabled>Selecione um Plano</option>
                    {state.plans.map(p => (
                        <option key={p.id} value={p.key}>{p.name} - {p.price}</option>
                    ))}
                </select>
            </div>
        </Modal>
    );
};

// --- Edit Tenant / Admin Modal ---
interface SaaSEditTenantModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenant: RestaurantTenant | null;
}

export const SaaSEditTenantModal: React.FC<SaaSEditTenantModalProps & { onOpenLinks?: () => void }> = ({ isOpen, onClose, tenant, onOpenLinks }) => {
    const { state, dispatch } = useSaaS();
    const [editForm, setEditForm] = useState<Partial<RestaurantTenant>>({});
    const [activeTab, setActiveTab] = useState<'GENERAL' | 'THEME'>('GENERAL');

    useEffect(() => {
        if(tenant) {
            setEditForm(tenant);
        }
    }, [tenant, isOpen]);

    const handleUpdate = async () => {
        if(tenant) {
            try {
                await dispatch({ 
                    type: 'UPDATE_TENANT', 
                    payload: { 
                        id: tenant.id, 
                        name: editForm.name!, 
                        slug: editForm.slug!, 
                        ownerName: editForm.ownerName!, 
                        email: editForm.email!,
                        plan: editForm.plan,
                        theme: editForm.theme
                    } 
                });

                if (editForm.status && editForm.status !== tenant.status) {
                    await dispatch({ type: 'TOGGLE_STATUS', tenantId: tenant.id });
                }

                onClose();
            } catch (error) {
                console.error("Failed to update tenant:", error);
            }
        }
    };

    if (!tenant) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Gerenciar ${tenant.name}`} variant="dialog" maxWidth="lg" onSave={handleUpdate}>
            <div className="flex gap-6">
                {/* Sidebar Tabs */}
                <div className="w-48 shrink-0 space-y-2">
                    <button 
                        onClick={() => setActiveTab('GENERAL')}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'GENERAL' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        <Layout size={18} /> Geral
                    </button>
                    <button 
                        onClick={() => setActiveTab('THEME')}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'THEME' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        <Palette size={18} /> Aparência
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-h-[400px]">
                    {activeTab === 'GENERAL' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-gray-500 uppercase">Nome</label><input className="w-full border p-2 rounded" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase">Slug</label><input className="w-full border p-2 rounded" value={editForm.slug} onChange={e => setEditForm({...editForm, slug: e.target.value})} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-gray-500 uppercase">Dono</label><input className="w-full border p-2 rounded" value={editForm.ownerName} onChange={e => setEditForm({...editForm, ownerName: e.target.value})} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase">Email</label><input className="w-full border p-2 rounded" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} /></div>
                            </div>
                            
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Configurações Principais</h4>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Plano</label>
                                        <select 
                                            className="w-full border p-2 rounded bg-white font-bold text-blue-600" 
                                            value={editForm.plan || ''} 
                                            onChange={e => setEditForm({...editForm, plan: e.target.value as PlanType})}
                                        >
                                            {state.plans.map(p => (
                                                <option key={p.id} value={p.key}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Status do Cliente</label>
                                        <select 
                                            className={`w-full border p-2 rounded font-bold ${editForm.status === 'ACTIVE' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}
                                            value={editForm.status || 'ACTIVE'} 
                                            onChange={e => setEditForm({...editForm, status: e.target.value as any})}
                                        >
                                            <option value="ACTIVE">ATIVO</option>
                                            <option value="INACTIVE">INATIVO</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Button 
                                        variant="outline" 
                                        className="w-full flex items-center justify-center gap-2"
                                        onClick={() => {
                                            if (onOpenLinks) {
                                                onClose();
                                                onOpenLinks();
                                            }
                                        }}
                                    >
                                        <Copy size={16} /> Central de Links de Acesso
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'THEME' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <ImageIcon size={14} /> Imagens de Fundo
                                    </h4>
                                    <ImageUploadField 
                                        label="Seletor de Módulos"
                                        value={editForm.theme?.moduleSelectorBgUrl || ''}
                                        onChange={val => setEditForm({...editForm, theme: {...(editForm.theme || {}), moduleSelectorBgUrl: val} as any})}
                                    />
                                    <ImageUploadField 
                                        label="Página de Login"
                                        value={editForm.theme?.loginBgUrl || ''}
                                        onChange={val => setEditForm({...editForm, theme: {...(editForm.theme || {}), loginBgUrl: val} as any})}
                                    />
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Cor do Box de Login</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="color"
                                                className="h-9 w-12 border rounded cursor-pointer" 
                                                value={editForm.theme?.loginBoxColor || '#ffffff'} 
                                                onChange={e => setEditForm({...editForm, theme: {...(editForm.theme || {}), loginBoxColor: e.target.value} as any})} 
                                            />
                                            <input 
                                                className="flex-1 border p-2 rounded text-sm" 
                                                value={editForm.theme?.loginBoxColor || '#ffffff'} 
                                                onChange={e => setEditForm({...editForm, theme: {...(editForm.theme || {}), loginBoxColor: e.target.value} as any})} 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Box size={14} /> Ícones dos Módulos (URL)
                                    </h4>
                                    <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3">
                                        {Object.entries(PERMISSIONS_SCHEMA).map(([key, data]) => (
                                            <ImageUploadField 
                                                key={key}
                                                label={data.label}
                                                value={editForm.theme?.moduleIcons?.[key] || ''}
                                                onChange={val => {
                                                    const icons = { ...(editForm.theme?.moduleIcons || {}) };
                                                    icons[key] = val;
                                                    setEditForm({...editForm, theme: {...(editForm.theme || {}), moduleIcons: icons} as any});
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

// --- Tenant Links Modal ---
export const SaaSTenantLinksModal: React.FC<{ isOpen: boolean, onClose: () => void, tenant: RestaurantTenant | null }> = ({ isOpen, onClose, tenant }) => {
    const [copiedLink, setCopiedLink] = useState<string | null>(null);

    if (!tenant) return null;

    const handleCopy = (url: string) => {
        navigator.clipboard.writeText(url);
        setCopiedLink(url);
        setTimeout(() => setCopiedLink(null), 2000);
    };

    const getLinks = () => {
        const origin = window.location.origin;
        const p = `?restaurant=${tenant.slug}`;
        return [
            { name: 'Login (Staff)', url: `${origin}/login${p}` },
            { name: 'Garçom', url: `${origin}/waiter${p}` },
            { name: 'Cozinha', url: `${origin}/kitchen${p}` },
            { name: 'Caixa', url: `${origin}/cashier${p}` },
            { name: 'Admin', url: `${origin}/admin${p}` },
            { name: 'Cliente (Exemplo)', url: `${origin}/client/table/1${p}` },
        ];
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Links de Acesso" variant="dialog" maxWidth="md">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <p className="text-sm text-gray-500 mb-2">{tenant.name} ({tenant.slug})</p>
                {getLinks().map((link, idx) => (
                    <div key={idx} className="bg-gray-50 border p-3 rounded-lg flex justify-between items-center">
                        <div className="overflow-hidden mr-2">
                            <div className="font-bold text-gray-700 text-sm">{link.name}</div>
                            <div className="text-xs text-blue-600 truncate">{link.url}</div>
                        </div>
                        <button onClick={() => handleCopy(link.url)} className={`p-2 rounded border flex items-center gap-1 text-xs font-bold shrink-0 ${copiedLink === link.url ? 'bg-green-100 text-green-700' : 'bg-white'}`}>
                            {copiedLink === link.url ? <Check size={14}/> : <Copy size={14}/>}
                            {copiedLink === link.url ? 'Copiado' : 'Copiar'}
                        </button>
                    </div>
                ))}
            </div>
        </Modal>
    );
};
