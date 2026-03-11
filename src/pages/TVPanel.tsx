import React from 'react';
import { useOrder } from '@/core/context/OrderContext';
import { Bell } from 'lucide-react';

export const TVPanel: React.FC = () => {
    const { state } = useOrder();
    const { serviceCalls, tables } = state;

    const getTableNumber = (tableId: string) => {
        const table = tables.find(t => t.id === tableId);
        return table ? table.number : 'Desconhecida';
    };

    return (
        <div className="h-full bg-slate-900 text-white p-8">
            <h1 className="text-4xl font-bold mb-8 flex items-center gap-4">
                <Bell className="text-yellow-400" size={40} />
                Painel de Chamadas
            </h1>
            
            {serviceCalls.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-2xl text-slate-500">
                    Nenhuma chamada pendente.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {serviceCalls.map((call) => (
                        <div key={call.id} className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700">
                            <div className="text-6xl font-bold text-yellow-400 mb-2">Mesa {getTableNumber(call.tableId)}</div>
                            <div className="text-xl text-slate-300">{call.reason || 'Solicitação de Atendimento'}</div>
                            <div className="text-sm text-slate-500 mt-4">
                                {new Date(call.timestamp).toLocaleTimeString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
