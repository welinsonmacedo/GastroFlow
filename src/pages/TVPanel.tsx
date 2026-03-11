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

    // Agrupar chamadas por mesa e ordenar as chamadas de cada mesa
    const groupedCalls = serviceCalls.reduce((acc, call) => {
        if (!acc[call.tableId]) {
            acc[call.tableId] = [];
        }
        acc[call.tableId].push(call);
        return acc;
    }, {} as Record<string, typeof serviceCalls>);

    Object.keys(groupedCalls).forEach(tableId => {
        groupedCalls[tableId].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    });

    return (
        <div className="h-full bg-slate-900 text-white p-8">
            <h1 className="text-4xl font-bold mb-8 flex items-center gap-4">
                <Bell className="text-yellow-400" size={40} />
                Painel de Chamadas
            </h1>
            
            {Object.keys(groupedCalls).length === 0 ? (
                <div className="h-64 flex items-center justify-center text-2xl text-slate-500">
                    Nenhuma chamada pendente.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(groupedCalls).map(([tableId, calls]) => (
                        <div key={tableId} className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700">
                            <div className="text-4xl font-bold text-yellow-400 mb-4">Mesa {getTableNumber(tableId)}</div>
                            <div className="space-y-3">
                                {calls.slice(0, 2).map((call, index) => (
                                    <div key={call.id} className={`p-3 rounded-lg ${index === 0 ? 'bg-slate-700' : 'bg-slate-900/50'}`}>
                                        <div className="text-lg font-medium text-slate-200">{call.reason || 'Solicitação de Atendimento'}</div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {new Date(call.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
