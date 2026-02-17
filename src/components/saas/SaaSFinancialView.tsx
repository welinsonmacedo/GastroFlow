
import React from 'react';
import { useSaaS } from '../../context/SaaSContext';

export const SaaSFinancialView: React.FC = () => {
    const { state } = useSaaS();
    
    const activeTenants = state.tenants.filter(t => t.status === 'ACTIVE').length;
    const mrr = state.tenants.reduce((acc, t) => {
        if (t.status === 'INACTIVE') return acc;
        const plan = state.plans.find(p => p.key === t.plan);
        const price = plan ? parseFloat(plan.price.replace('R$', '').replace(',','.').trim()) : 0;
        return acc + (isNaN(price) ? 0 : price);
    }, 0);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-green-500">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">MRR Estimado</p>
                <p className="text-3xl font-black text-gray-800">R$ {mrr.toFixed(2)}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-blue-500">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Clientes Ativos</p>
                <p className="text-3xl font-black text-gray-800">{activeTenants}</p>
            </div>
        </div>
    );
};
