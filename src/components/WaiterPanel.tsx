import React from 'react';
import { useOrder } from '../core/context/OrderContext';
import { useInventory } from '../core/context/InventoryContext';
import { useFinance } from '../core/context/FinanceContext';

export const WaiterPanel: React.FC = () => {
    const { state: orderState, dispatch: orderDispatch } = useOrder();
    const { state: invState } = useInventory();
    const { state: finState } = useFinance();

    const createOrder = async () => {
        try {
            await orderDispatch({ 
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
