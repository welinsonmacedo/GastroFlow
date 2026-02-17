
import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { RestaurantTenant, PlanType } from '../../types';
import { Button } from '../Button';
import { Search, Plus, ExternalLink, BarChart2, Unlock, Lock, Link as LinkIcon, Edit } from 'lucide-react';

interface Props {
    onOpenCreate: () => void;
    onOpenEdit: (tenant: RestaurantTenant) => void;
    onOpenLinks: (tenant: RestaurantTenant) => void;
}

export const SaaSRestaurantsView: React.FC<Props> = ({ onOpenCreate, onOpenEdit, onOpenLinks }) => {
    const { state, dispatch } = useSaaS();
    const [filter, setFilter] = useState('');

    const filteredTenants = state.tenants.filter(t => t.name.toLowerCase().includes(filter.toLowerCase()) || t.ownerName.toLowerCase().includes(filter.toLowerCase()));
    const getDemoUrl = (slug: string) => `${window.location.origin}/?restaurant=${slug}`;

    return (
        <>
            <div className="bg-white p-4 rounded-xl shadow-sm border mb-6 flex justify-between items-center">
                <div className="relative w-96">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={filter} onChange={(e) => setFilter(e.target.value)} />
                </div>
                <Button onClick={onOpenCreate}> <Plus size={18} /> Novo Restaurante </Button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 text-sm font-semibold uppercase">
                        <tr>
                            <th className="p-4">Restaurante</th>
                            <th className="p-4">Acesso (Slug)</th>
                            <th className="p-4">Dono</th>
                            <th className="p-4">Plano</th>
                            <th className="p-4">Requisições</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredTenants.map((tenant) => (
                            <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4"><div className="font-bold text-gray-800">{tenant.name}</div><div className="text-xs text-gray-500">{tenant.email}</div></td>
                                <td className="p-4"><a href={getDemoUrl(tenant.slug || 'bistro')} target="_blank" className="text-blue-600 hover:underline text-sm flex items-center gap-1 bg-blue-50 px-2 py-1 rounded w-fit">/{tenant.slug} <ExternalLink size={12} /></a></td>
                                <td className="p-4 text-gray-700">{tenant.ownerName}</td>
                                <td className="p-4">
                                    <select className="border rounded p-1 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={tenant.plan} onChange={(e) => dispatch({ type: 'CHANGE_PLAN', tenantId: tenant.id, plan: e.target.value as PlanType })}>
                                        <option value="FREE">Free</option>
                                        <option value="PRO">Pro</option>
                                        <option value="ENTERPRISE">Enterprise</option>
                                    </select>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2"><BarChart2 size={16} className="text-gray-400" /><span className="font-mono font-bold text-gray-700">{tenant.requestCount || 0}</span></div>
                                </td>
                                <td className="p-4">
                                    <button onClick={() => dispatch({ type: 'TOGGLE_STATUS', tenantId: tenant.id })} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm w-fit ${tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'}`}>
                                        {tenant.status === 'ACTIVE' ? <Unlock size={14}/> : <Lock size={14}/>} {tenant.status === 'ACTIVE' ? 'LIBERADO' : 'BLOQUEADO'}
                                    </button>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => onOpenLinks(tenant)} className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-full transition-colors"><LinkIcon size={20} /></button>
                                        <button onClick={() => onOpenEdit(tenant)} className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-full transition-colors"><Edit size={20} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};
