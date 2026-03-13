import React from 'react';
import { useOrder } from '../core/context/OrderContext';
import { useInventory } from '../core/context/InventoryContext';
import { useFinance } from '../core/context/FinanceContext';
import { Bell, CheckCircle, Clock } from 'lucide-react';

export const WaiterPanel: React.FC = () => {
    const { state: orderState, dispatch, resolveCall } = useOrder();
    const { state: invState } = useInventory();
    const { state: finState } = useFinance();

    const createOrder = async () => {
        try {
            await dispatch({ 
                type: 'PLACE_ORDER', 
                params: { 
                    tableId: '1', 
                    items: [], 
                    orderType: 'DINE_IN' 
                } 
            });
        } catch (error) {
            console.error("Erro ao criar pedido:", error);
        }
    };

    const handleResolveCall = async (callId: string) => {
        try {
            await resolveCall(callId);
        } catch (error) {
            console.error("Erro ao resolver chamado:", error);
        }
    };

    return (
        <div className="p-6 bg-white rounded-3xl shadow-xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Painel do Garçom</h1>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Sincronização em Tempo Real Ativa</p>
                </div>
                <button 
                    onClick={createOrder} 
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                >
                    Novo Pedido
                </button>
            </div>

            {/* Chamados Ativos (Real-time) */}
            {orderState.serviceCalls.length > 0 && (
                <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-2 mb-4">
                        <Bell className="text-red-500 animate-bounce" size={20} />
                        <h3 className="text-sm font-black text-red-600 uppercase tracking-widest">Chamados Ativos ({orderState.serviceCalls.length})</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {orderState.serviceCalls.map(call => {
                            const table = orderState.tables.find(t => t.id === call.tableId);
                            return (
                                <div key={call.id} className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl flex justify-between items-center shadow-sm shadow-red-100">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-red-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg">
                                            {table?.number || '?'}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Mesa {table?.number}</p>
                                            <p className="text-xs font-bold text-red-700">{call.reason || 'Chamando Garçom'}</p>
                                            <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-red-400">
                                                <Clock size={10} />
                                                {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleResolveCall(call.id)}
                                        className="bg-white text-red-600 p-2 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100"
                                        title="Atender Chamado"
                                    >
                                        <CheckCircle size={20} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Coluna Pedidos */}
                <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b pb-2">Pedidos Recentes</h3>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {orderState.orders.length === 0 && <p className="text-xs text-gray-400 italic">Nenhum pedido encontrado.</p>}
                        {orderState.orders.slice(0, 10).map(order => (
                            <div key={order.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                                <div>
                                    <p className="font-black text-slate-700 text-sm">Pedido #{order.id.slice(0, 4)}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Mesa {order.tableId || 'Balcão'}</p>
                                </div>
                                <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-tighter ${
                                    order.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 
                                    order.status === 'READY' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                    {order.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Coluna Estoque */}
                <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b pb-2">Status Estoque</h3>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {invState.inventory.slice(0, 10).map(item => (
                            <div key={item.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                                <div>
                                    <p className="font-black text-slate-700 text-sm truncate max-w-[120px]">{item.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Qtd: {item.quantity} {item.unit}</p>
                                </div>
                                {item.quantity <= item.minQuantity && (
                                    <span className="bg-red-100 text-red-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Baixo</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Coluna Caixa */}
                <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b pb-2">Status do Caixa</h3>
                    <div className="p-6 bg-slate-900 rounded-[2rem] text-white shadow-2xl">
                        {finState.activeCashSession ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                                    <p className="text-xs font-black uppercase tracking-widest text-emerald-400">Caixa Aberto</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Operador</p>
                                    <p className="font-black text-lg">{finState.activeCashSession.operatorName}</p>
                                </div>
                                <div className="pt-4 border-t border-white/10">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Abertura</p>
                                    <p className="font-mono text-sm">{new Date(finState.activeCashSession.openedAt).toLocaleTimeString()}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <div className="w-3 h-3 bg-red-500 rounded-full mx-auto mb-3" />
                                <p className="text-xs font-black uppercase tracking-widest text-red-400">Caixa Fechado</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
