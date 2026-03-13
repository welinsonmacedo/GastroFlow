import React from 'react';
import { useFinance } from '../../core/context/FinanceContext';
import { useOrder } from '../../core/context/OrderContext';
import { useInventory } from '../../core/context/InventoryContext';

export const CashierPanel: React.FC = () => {
    const { state: finState } = useFinance();
    const { state: orderState } = useOrder();
    const { state: invState } = useInventory();

    return (
        <div className="p-6 bg-slate-50 rounded-3xl shadow-xl border border-gray-200">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Painel do Caixa</h1>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Controle Financeiro e Operacional</p>
                </div>
                <div className="flex gap-2">
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Sincronizado</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Status do Caixa */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Sessão Ativa</h3>
                    {finState.activeCashSession ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
                                <p className="text-[10px] font-black uppercase tracking-widest mb-1">Operador</p>
                                <p className="font-black text-lg">{finState.activeCashSession.operatorName}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-[8px] font-black text-gray-400 uppercase">Abertura</p>
                                    <p className="text-xs font-bold">{new Date(finState.activeCashSession.openedAt).toLocaleTimeString()}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-[8px] font-black text-gray-400 uppercase">Fundo Inicial</p>
                                    <p className="text-xs font-bold">R$ {finState.activeCashSession.initialAmount.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <p className="text-xs font-black text-gray-400 uppercase">Caixa Fechado</p>
                        </div>
                    )}
                </div>

                {/* Pedidos para Receber */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Pedidos Pendentes</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {orderState.orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').map(order => {
                            const totalAmount = order.items.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);
                            return (
                                <div key={order.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                                    <div>
                                        <p className="text-xs font-black text-slate-700">Mesa {order.tableId || 'Balcão'}</p>
                                        <p className="text-[9px] font-bold text-slate-400">R$ {totalAmount.toFixed(2)}</p>
                                    </div>
                                    <span className="text-[8px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase">{order.status}</span>
                                </div>
                            );
                        })}
                        {orderState.orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length === 0 && (
                            <p className="text-center py-6 text-gray-400 text-xs italic">Nenhum pedido ativo.</p>
                        )}
                    </div>
                </div>

                {/* Alertas de Estoque */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Alertas de Estoque</h3>
                    <div className="space-y-2">
                        {invState.inventory.filter(i => i.quantity <= i.minQuantity).slice(0, 5).map(item => (
                            <div key={item.id} className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 flex justify-between items-center">
                                <span className="text-xs font-bold truncate max-w-[120px]">{item.name}</span>
                                <span className="text-[10px] font-black">{item.quantity} {item.unit}</span>
                            </div>
                        ))}
                        {invState.inventory.filter(i => i.quantity <= i.minQuantity).length === 0 && (
                            <div className="text-center py-10 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
                                <p className="text-xs font-black uppercase">Estoque OK</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
