
import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { useUI } from '../../context/UIContext';
import { Plan, PlanLimits } from '../../types';
import { Button } from '../Button';
import { Settings } from 'lucide-react';

export const SaaSPlansView: React.FC = () => {
    const { state, dispatch } = useSaaS();
    const { showAlert } = useUI();
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [editingFeatures, setEditingFeatures] = useState<string>('');
    const [editingLimits, setEditingLimits] = useState<PlanLimits>({
        maxTables: 10, maxProducts: 30, maxStaff: 2, 
        allowKds: false, allowPos: false, allowDelivery: false, allowCashControl: false,
        allowReports: false, allowInventory: false, allowPurchases: false, allowExpenses: false,
        allowStaff: true, allowTableMgmt: true, allowCustomization: true
    });

    const handleEditPlan = (plan: Plan) => {
        setEditingPlan(plan);
        setEditingFeatures(plan.features.join('\n'));
        setEditingLimits(plan.limits || { 
            maxTables: -1, maxProducts: -1, maxStaff: -1, 
            allowKds: true, allowPos: true, allowDelivery: true, allowCashControl: true,
            allowReports: true, allowInventory: true, allowPurchases: true, allowExpenses: true, 
            allowStaff: true, allowTableMgmt: true, allowCustomization: true 
        });
    };

    const handleSavePlan = (e: React.FormEvent) => {
        e.preventDefault();
        if(editingPlan) {
            const updatedPlan: Plan = { ...editingPlan, features: editingFeatures.split('\n').filter(l => l.trim() !== ''), limits: editingLimits };
            dispatch({ type: 'UPDATE_PLAN_DETAILS', plan: updatedPlan });
            setEditingPlan(null);
            showAlert({ title: "Sucesso", message: "Plano atualizado!", type: 'SUCCESS' });
        }
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in">
            {state.plans.map(plan => (
                <div key={plan.id} className="bg-white rounded-xl shadow-sm border p-6 flex flex-col h-full hover:shadow-md transition-shadow">
                    {editingPlan?.id === plan.id ? (
                        <form onSubmit={handleSavePlan} className="space-y-4 flex-1 flex flex-col">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-gray-500 uppercase">Nome</label><input className="w-full border p-2 rounded text-sm" value={editingPlan.name} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase">Preço</label><input className="w-full border p-2 rounded text-sm" value={editingPlan.price} onChange={e => setEditingPlan({...editingPlan, price: e.target.value})} /></div>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
                                <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1"><Settings size={12}/> Limites do Plano</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    <div><label className="text-[10px] font-bold text-gray-500">Max Mesas</label><input type="number" className="w-full border p-1 rounded text-sm" value={editingLimits.maxTables} onChange={(e) => setEditingLimits({...editingLimits, maxTables: parseInt(e.target.value)})} /></div>
                                    <div><label className="text-[10px] font-bold text-gray-500">Max Produtos</label><input type="number" className="w-full border p-1 rounded text-sm" value={editingLimits.maxProducts} onChange={(e) => setEditingLimits({...editingLimits, maxProducts: parseInt(e.target.value)})} /></div>
                                    <div><label className="text-[10px] font-bold text-gray-500">Max Staff</label><input type="number" className="w-full border p-1 rounded text-sm" value={editingLimits.maxStaff} onChange={(e) => setEditingLimits({...editingLimits, maxStaff: parseInt(e.target.value)})} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <label className="flex items-center gap-2 font-bold text-gray-700 col-span-2 border-b pb-1 mb-1">Módulos Operacionais</label>
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={editingLimits.allowKds} onChange={(e) => setEditingLimits({...editingLimits, allowKds: e.target.checked})} /> KDS (Cozinha)</label>
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={editingLimits.allowPos} onChange={(e) => setEditingLimits({...editingLimits, allowPos: e.target.checked})} /> PDV (Balcão)</label>
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={editingLimits.allowDelivery} onChange={(e) => setEditingLimits({...editingLimits, allowDelivery: e.target.checked})} /> Delivery</label>
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={editingLimits.allowCashControl} onChange={(e) => setEditingLimits({...editingLimits, allowCashControl: e.target.checked})} /> Controle Caixa</label>
                                    
                                    <label className="flex items-center gap-2 font-bold text-gray-700 col-span-2 border-b pb-1 mb-1 mt-2">Módulos de Gestão</label>
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={editingLimits.allowInventory} onChange={(e) => setEditingLimits({...editingLimits, allowInventory: e.target.checked})} /> Estoque</label>
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={editingLimits.allowExpenses} onChange={(e) => setEditingLimits({...editingLimits, allowExpenses: e.target.checked})} /> Financeiro</label>
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={editingLimits.allowReports} onChange={(e) => setEditingLimits({...editingLimits, allowReports: e.target.checked})} /> Relatórios</label>
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={editingLimits.allowCustomization} onChange={(e) => setEditingLimits({...editingLimits, allowCustomization: e.target.checked})} /> Whitelabel</label>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-auto">
                                <Button type="button" variant="secondary" onClick={() => setEditingPlan(null)} className="flex-1">Cancelar</Button>
                                <Button type="submit" className="flex-1">Salvar</Button>
                            </div>
                        </form>
                    ) : (
                        <>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">{plan.name}</h3>
                                    <p className="text-2xl font-black text-blue-600">{plan.price}</p>
                                </div>
                                {plan.is_popular && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Popular</span>}
                            </div>
                            <ul className="space-y-2 mb-6 flex-1">
                                {plan.features.map((feat, i) => (
                                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                        <span className="text-green-500 mt-0.5">✔</span> {feat}
                                    </li>
                                ))}
                                {plan.limits && (
                                    <li className="text-xs text-gray-400 mt-2 border-t pt-2">
                                        Limites: {plan.limits.maxTables === -1 ? '∞' : plan.limits.maxTables} mesas
                                    </li>
                                )}
                            </ul>
                            <Button variant="outline" onClick={() => handleEditPlan(plan)} className="w-full">Editar Plano</Button>
                        </>
                    )}
                </div>
            ))}
        </div>
    );
};
