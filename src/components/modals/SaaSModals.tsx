
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useSaaS } from '../../context/SaaSContext';
import { RestaurantTenant, PlanType, SystemModule, PlanLimits } from '../../types';
import { ChevronDown, ChevronRight, Check, Copy, Settings } from 'lucide-react';

const MODULE_STRUCTURE = {
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
                        plan: editForm.plan 
                    } 
                });

                if (editForm.status && editForm.status !== tenant.status) {
                    await dispatch({ type: 'TOGGLE_STATUS', tenantId: tenant.id });
                }

                onClose();
            } catch (error) {
                console.error("Failed to update tenant:", error);
                // Modal stays open so user can retry or see error
            }
        }
    };

    if (!tenant) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Gerenciar ${tenant.name}`} variant="dialog" maxWidth="md" onSave={handleUpdate}>
            <div className="space-y-4">
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
                                onChange={e => setEditForm({...editForm, plan: e.target.value})}
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
