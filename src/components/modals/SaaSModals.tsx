
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useSaaS } from '../../context/SaaSContext';
import { RestaurantTenant, PlanType, SystemModule } from '../../types';
import { ChevronDown, ChevronRight, Check, Copy } from 'lucide-react';

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
    const { dispatch } = useSaaS();
    const [form, setForm] = useState({ name: '', slug: '', ownerName: '', email: '', plan: 'FREE' as PlanType });

    const autoGenerateSlug = (name: string) => {
        const slug = name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-');
        setForm(prev => ({ ...prev, name, slug }));
    };

    const handleSubmit = () => {
        dispatch({ type: 'CREATE_TENANT', payload: form });
        setForm({ name: '', slug: '', ownerName: '', email: '', plan: 'FREE' });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Novo Restaurante" variant="dialog" maxWidth="md" onSave={handleSubmit}>
            <div className="space-y-4">
                <input type="text" required className="w-full border p-2.5 rounded-lg" placeholder="Nome" value={form.name} onChange={(e) => autoGenerateSlug(e.target.value)} autoFocus />
                <input type="text" required className="w-full border p-2.5 rounded-lg" placeholder="Slug (URL)" value={form.slug} onChange={(e) => setForm({...form, slug: e.target.value})} />
                <input type="text" required className="w-full border p-2.5 rounded-lg" placeholder="Nome do Dono" value={form.ownerName} onChange={(e) => setForm({...form, ownerName: e.target.value})} />
                <input type="email" required className="w-full border p-2.5 rounded-lg" placeholder="Email do Dono" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
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

export const SaaSEditTenantModal: React.FC<SaaSEditTenantModalProps> = ({ isOpen, onClose, tenant }) => {
    const { dispatch } = useSaaS();
    const [tab, setTab] = useState<'DETAILS' | 'MODULES' | 'ADMIN'>('DETAILS');
    const [editForm, setEditForm] = useState<Partial<RestaurantTenant>>({});
    const [adminForm, setAdminForm] = useState({ name: 'Admin', email: '', pin: '1234', password: '' });
    
    const [selectedModules, setSelectedModules] = useState<SystemModule[]>([]);
    const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
    const [expandedModules, setExpandedModules] = useState<SystemModule[]>([]);

    useEffect(() => {
        if(tenant) {
            setEditForm(tenant);
            setAdminForm({ name: 'Admin', email: tenant.email, pin: '1234', password: '' });
            setSelectedModules(tenant.allowedModules || ['RESTAURANT']);
            
            if (!tenant.allowedFeatures || tenant.allowedFeatures.length === 0) {
                const autoFeatures: string[] = [];
                (tenant.allowedModules || ['RESTAURANT']).forEach(mod => {
                    // @ts-ignore
                    const features = MODULE_STRUCTURE[mod]?.features || [];
                    features.forEach((f: any) => autoFeatures.push(f.key));
                });
                setSelectedFeatures(autoFeatures);
            } else {
                setSelectedFeatures(tenant.allowedFeatures);
            }
        }
    }, [tenant, isOpen]);

    const handleUpdate = () => {
        if(tenant) {
             dispatch({ 
                type: 'UPDATE_TENANT', 
                payload: { id: tenant.id, name: editForm.name!, slug: editForm.slug!, ownerName: editForm.ownerName!, email: editForm.email! } 
            });
            onClose();
        }
    };
    
    const toggleModule = (mod: SystemModule) => {
        if (selectedModules.includes(mod)) {
            setSelectedModules(selectedModules.filter(m => m !== mod));
            // @ts-ignore
            const moduleFeats = MODULE_STRUCTURE[mod].features.map((f: any) => f.key);
            setSelectedFeatures(selectedFeatures.filter(f => !moduleFeats.includes(f)));
            setExpandedModules(expandedModules.filter(m => m !== mod));
        } else {
            setSelectedModules([...selectedModules, mod]);
            // @ts-ignore
            const moduleFeats = MODULE_STRUCTURE[mod].features.map((f: any) => f.key);
            setSelectedFeatures([...selectedFeatures, ...moduleFeats]);
            setExpandedModules([...expandedModules, mod]);
        }
    };

    const toggleFeature = (featureKey: string, moduleKey: SystemModule) => {
        if (selectedFeatures.includes(featureKey)) {
            setSelectedFeatures(selectedFeatures.filter(f => f !== featureKey));
        } else {
            setSelectedFeatures([...selectedFeatures, featureKey]);
            if (!selectedModules.includes(moduleKey)) {
                setSelectedModules([...selectedModules, moduleKey]);
            }
        }
    };

    const toggleExpand = (mod: SystemModule) => {
        if (expandedModules.includes(mod)) {
            setExpandedModules(expandedModules.filter(m => m !== mod));
        } else {
            setExpandedModules([...expandedModules, mod]);
        }
    };
    
    const handleSaveModules = async () => {
         if(!tenant) return;
         dispatch({
             type: 'UPDATE_TENANT_MODULES',
             tenantId: tenant.id,
             modules: selectedModules,
             features: selectedFeatures
         });
         onClose();
    };

    const handleCreateAdmin = () => {
        if(tenant) {
            dispatch({ type: 'CREATE_TENANT_ADMIN', payload: { tenantId: tenant.id, ...adminForm } });
            setAdminForm({ name: 'Admin', email: '', pin: '1234', password: '' });
            // Admin creation doesn't close modal usually, but with single save button, it implies closure or reset
            onClose(); 
        }
    };

    const handleMainSave = () => {
        if (tab === 'DETAILS') handleUpdate();
        else if (tab === 'MODULES') handleSaveModules();
        else if (tab === 'ADMIN') handleCreateAdmin();
    };

    if (!tenant) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Gerenciar ${tenant.name}`} variant="dialog" maxWidth="md" onSave={handleMainSave}>
            <div className="flex border-b mb-4 overflow-x-auto">
                <button onClick={() => setTab('DETAILS')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${tab === 'DETAILS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>Detalhes</button>
                <button onClick={() => setTab('MODULES')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${tab === 'MODULES' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>Módulos & Permissões</button>
                <button onClick={() => setTab('ADMIN')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${tab === 'ADMIN' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>Criar Admin</button>
            </div>

            {tab === 'DETAILS' && (
                <div className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Nome</label><input className="w-full border p-2 rounded" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Slug</label><input className="w-full border p-2 rounded" value={editForm.slug} onChange={e => setEditForm({...editForm, slug: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Dono</label><input className="w-full border p-2 rounded" value={editForm.ownerName} onChange={e => setEditForm({...editForm, ownerName: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Email</label><input className="w-full border p-2 rounded" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} /></div>
                </div>
            )}
            
            {tab === 'MODULES' && (
                <div className="space-y-4 h-[60vh] overflow-y-auto pr-2">
                    <p className="text-sm text-gray-500">Selecione os módulos e funcionalidades disponíveis.</p>
                    <div className="space-y-2">
                        {Object.entries(MODULE_STRUCTURE).map(([modKey, modData]) => {
                            const isSelected = selectedModules.includes(modKey as SystemModule);
                            const isExpanded = expandedModules.includes(modKey as SystemModule);

                            return (
                                <div key={modKey} className={`border rounded-lg ${isSelected ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'}`}>
                                    <div className="flex items-center justify-between p-3">
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="checkbox" 
                                                checked={isSelected} 
                                                onChange={() => toggleModule(modKey as SystemModule)} 
                                                className="w-5 h-5 text-blue-600 rounded cursor-pointer" 
                                            />
                                            <div className="cursor-pointer" onClick={() => toggleExpand(modKey as SystemModule)}>
                                                <span className="font-bold text-slate-800 block">{modData.label}</span>
                                                <span className="text-xs text-gray-400">{modData.description}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => toggleExpand(modKey as SystemModule)} className="text-gray-400 hover:text-gray-600">
                                            {isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                                        </button>
                                    </div>
                                    
                                    {isExpanded && (
                                        <div className="px-3 pb-3 pt-0 ml-8 border-l-2 border-gray-100 space-y-2">
                                            {modData.features.map(feat => (
                                                <label key={feat.key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedFeatures.includes(feat.key)} 
                                                        onChange={() => toggleFeature(feat.key, modKey as SystemModule)}
                                                        className="w-4 h-4 text-blue-500 rounded"
                                                    />
                                                    <span className="text-sm text-gray-700">{feat.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {tab === 'ADMIN' && (
                <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-xs text-yellow-800 mb-2"><p className="font-bold">Atenção:</p><p>Isso criará um novo usuário ADMIN.</p></div>
                    <input type="text" placeholder="Nome" className="w-full border p-2 rounded" value={adminForm.name} onChange={e => setAdminForm({...adminForm, name: e.target.value})} required />
                    <input type="email" placeholder="Email" className="w-full border p-2 rounded" value={adminForm.email} onChange={e => setAdminForm({...adminForm, email: e.target.value})} required />
                    <input type="text" placeholder="PIN" className="w-full border p-2 rounded" value={adminForm.pin} onChange={e => setAdminForm({...adminForm, pin: e.target.value})} required />
                    <input type="password" placeholder="Senha (Opcional)" className="w-full border p-2 rounded" value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} />
                </div>
            )}
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
