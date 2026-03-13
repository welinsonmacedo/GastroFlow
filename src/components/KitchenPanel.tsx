import React from 'react';
import { useOrder } from '../core/context/OrderContext';
import { useInventory } from '../core/context/InventoryContext';
import { useFinance } from '../core/context/FinanceContext';
import { OrderStatus } from '@/types';

export const KitchenPanel: React.FC = () => {
    const { state: orderState, dispatch: orderDispatch } = useOrder();
    const { state: invState } = useInventory();
    const { state: finState } = useFinance();

    const updateStatus = async (orderId: string, itemId: string, status: OrderStatus) => {
        try {
            await orderDispatch({ type: 'UPDATE_ITEM_STATUS', orderId, itemId, status });
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
        }
    };

    return (
        <div className="p-6 bg-slate-50 rounded-3xl shadow-xl border border-gray-200">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Painel da Cozinha</h1>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Monitoramento de Pedidos e Insumos</p>
                </div>
                <div className="flex gap-2">
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full uppercase">Real-time On</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pedidos Pendentes */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Pedidos em Preparo</h3>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {orderState.orders.filter(o => o.status === 'PENDING').length === 0 && (
                            <p className="text-center py-10 text-gray-400 italic">Nenhum pedido pendente.</p>
                        )}
                        {orderState.orders.filter(o => o.status === 'PENDING').map(order => (
                            <div key={order.id} className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="font-black text-lg">Mesa {order.tableId || 'Balcão'}</span>
                                    <span className="text-[10px] font-mono opacity-60">#{order.id.slice(0,4)}</span>
                                </div>
                                <div className="space-y-2">
                                    {order.items.map((item: any) => (
                                        <div key={item.id} className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                                            <span className="text-sm font-bold">{item.quantity}x {item.productName}</span>
                                            <button 
                                                onClick={() => updateStatus(order.id, item.id, OrderStatus.READY)}
                                                className="bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-black px-3 py-1 rounded-md uppercase transition-all"
                                            >
                                                Pronto
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Estoque Crítico */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Insumos Críticos</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {invState.inventory.filter(i => i.quantity <= i.minQuantity).slice(0, 8).map(item => (
                            <div key={item.id} className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                                <p className="font-black text-red-900 text-xs truncate">{item.name}</p>
                                <div className="flex justify-between items-end mt-2">
                                    <p className="text-[10px] font-bold text-red-600 uppercase">Qtd: {item.quantity}</p>
                                    <span className="bg-red-200 text-red-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Repor</span>
                                </div>
                            </div>
                        ))}
                        {invState.inventory.filter(i => i.quantity <= i.minQuantity).length === 0 && (
                            <div className="col-span-2 text-center py-10 text-emerald-600 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <p className="text-xs font-black uppercase">Estoque em Dia</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Status Financeiro</h3>
                        <div className={`p-4 rounded-2xl flex items-center justify-between ${finState.activeCashSession ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                            <span className="text-xs font-black uppercase tracking-widest">Caixa do Dia</span>
                            <span className="font-black">{finState.activeCashSession ? 'ABERTO' : 'FECHADO'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
