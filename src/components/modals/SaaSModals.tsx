
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useSaaS } from '../../context/SaaSContext';
import { RestaurantTenant, PlanType } from '../../types';
import { X, Check, Copy } from 'lucide-react';

// --- Create Tenant Modal ---
export const SaaSTenantCreateModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { dispatch } = useSaaS();
    const [form, setForm] = useState({ name: '', slug: '', ownerName: '', email: '', plan: 'FREE' as PlanType });

    const autoGenerateSlug = (name: string) => {
        const slug = name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-');
        setForm(prev => ({ ...prev, name, slug }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        dispatch({ type: 'CREATE_TENANT', payload: form });
        setForm({ name: '', slug: '', ownerName: '', email: '', plan: 'FREE' });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Novo Restaurante" variant="dialog" maxWidth="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" required className="w-full border p-2.5 rounded-lg" placeholder="Nome" value={form.name} onChange={(e) => autoGenerateSlug(e.target.value)} autoFocus />
                <input type="text" required className="w-full border p-2.5 rounded-lg" placeholder="Slug (URL)" value={form.slug} onChange={(e) => setForm({...form, slug: e.target.value})} />
                <input type="text" required className="w-full border p-2.5 rounded-lg" placeholder="Nome do Dono" value={form.ownerName} onChange={(e) => setForm({...form, ownerName: e.target.value})} />
                <input type="email" required className="w-full border p-2.5 rounded-lg" placeholder="Email do Dono" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
                <Button type="submit" className="w-full">Criar Restaurante</Button>
            </form>
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
    const [tab, setTab] = useState<'DETAILS' | 'ADMIN'>('DETAILS');
    const [editForm, setEditForm] = useState<Partial<RestaurantTenant>>({});
    const [adminForm, setAdminForm] = useState({ name: 'Admin', email: '', pin: '1234', password: '' });

    useEffect(() => {
        if(tenant) {
            setEditForm(tenant);
            setAdminForm({ name: 'Admin', email: tenant.email, pin: '1234', password: '' });
        }
    }, [tenant, isOpen]);

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if(tenant) {
            dispatch({ 
                type: 'UPDATE_TENANT', 
                payload: { id: tenant.id, name: editForm.name!, slug: editForm.slug!, ownerName: editForm.ownerName!, email: editForm.email! } 
            });
            onClose();
        }
    };

    const handleCreateAdmin = (e: React.FormEvent) => {
        e.preventDefault();
        if(tenant) {
            dispatch({ type: 'CREATE_TENANT_ADMIN', payload: { tenantId: tenant.id, ...adminForm } });
            setAdminForm({ name: 'Admin', email: '', pin: '1234', password: '' });
        }
    };

    if (!tenant) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Gerenciar ${tenant.name}`} variant="dialog" maxWidth="md">
            <div className="flex border-b mb-4">
                <button onClick={() => setTab('DETAILS')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${tab === 'DETAILS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>Detalhes</button>
                <button onClick={() => setTab('ADMIN')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${tab === 'ADMIN' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>Criar Admin</button>
            </div>

            {tab === 'DETAILS' && (
                <form onSubmit={handleUpdate} className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Nome</label><input className="w-full border p-2 rounded" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Slug</label><input className="w-full border p-2 rounded" value={editForm.slug} onChange={e => setEditForm({...editForm, slug: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Dono</label><input className="w-full border p-2 rounded" value={editForm.ownerName} onChange={e => setEditForm({...editForm, ownerName: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Email</label><input className="w-full border p-2 rounded" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} /></div>
                    <Button type="submit" className="w-full mt-2">Salvar</Button>
                </form>
            )}

            {tab === 'ADMIN' && (
                <form onSubmit={handleCreateAdmin} className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-xs text-yellow-800 mb-2"><p className="font-bold">Atenção:</p><p>Isso criará um novo usuário ADMIN.</p></div>
                    <input type="text" placeholder="Nome" className="w-full border p-2 rounded" value={adminForm.name} onChange={e => setAdminForm({...adminForm, name: e.target.value})} required />
                    <input type="email" placeholder="Email" className="w-full border p-2 rounded" value={adminForm.email} onChange={e => setAdminForm({...adminForm, email: e.target.value})} required />
                    <input type="text" placeholder="PIN" className="w-full border p-2 rounded" value={adminForm.pin} onChange={e => setAdminForm({...adminForm, pin: e.target.value})} required />
                    <input type="password" placeholder="Senha (Opcional)" className="w-full border p-2 rounded" value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} />
                    <Button type="submit" className="w-full mt-2">Criar Administrador</Button>
                </form>
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
