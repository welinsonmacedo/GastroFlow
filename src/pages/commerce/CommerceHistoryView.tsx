
import React, { useState } from 'react';
import { useFinance } from '@/core/context/FinanceContext';
import { Button } from '../../components/Button';
import { RefreshCcw, Eye, XCircle, Lock } from 'lucide-react';
import { useUI } from '@/core/context/UIContext';
import { Modal } from '../../components/Modal';

export const CommerceHistoryView: React.FC = () => {
    const { state: finState, refreshTransactions, voidTransaction } = useFinance();
    const { showAlert } = useUI();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [voidModalOpen, setVoidModalOpen] = useState(false);
    const [transactionToVoid, setTransactionToVoid] = useState<string | null>(null);
    const [voidPin, setVoidPin] = useState('');

    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        await refreshTransactions();
        setTimeout(() => setIsRefreshing(false), 800);
    };

    const handleVoidSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transactionToVoid) return;
        try {
            await voidTransaction(transactionToVoid, voidPin);
            setVoidModalOpen(false); 
            setVoidPin('');
            showAlert({ title: "Sucesso", message: "Transação estornada!", type: 'SUCCESS' });
        } catch (error: any) { 
            showAlert({ title: "Erro", message: error.message, type: 'ERROR' }); 
        }
    };

    return (
        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden h-full flex flex-col animate-fade-in">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center shrink-0">
                <h3 className="font-black text-slate-800 uppercase tracking-tighter text-xl">Histórico de Vendas</h3>
                <Button size="sm" variant="outline" onClick={handleManualRefresh} className="rounded-xl flex items-center gap-2">
                    <RefreshCcw size={14} className={isRefreshing ? 'animate-spin' : ''}/> Sincronizar
                </Button>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest sticky top-0 z-10">
                        <tr className="border-b">
                            <th className="p-6">Hora</th>
                            <th className="p-6">Detalhes</th>
                            <th className="p-6">Método</th>
                            <th className="p-6 text-right">Valor</th>
                            <th className="p-6 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {finState.transactions.map(t => (
                            <tr key={t.id} className={`hover:bg-gray-50/50 transition-colors ${t.status === 'CANCELLED' ? 'opacity-40 grayscale' : ''}`}>
                                <td className="p-6">
                                    <div className="font-black text-slate-700">
                                        {t.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </td>
                                <td className="p-6 text-sm font-bold text-slate-600 uppercase tracking-tight">{t.itemsSummary}</td>
                                <td className="p-6">
                                    <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg border border-blue-100 uppercase">
                                        {t.method}
                                    </span>
                                </td>
                                <td className="p-6 text-right font-black text-slate-800">R$ {t.amount.toFixed(2)}</td>
                                <td className="p-6 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        {t.cashierName && (
                                            <div className="relative group">
                                                <Eye size={20} className="text-gray-400 cursor-help" />
                                                <div className="absolute right-0 bottom-full mb-2 w-32 bg-slate-800 text-white text-[10px] font-bold p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                                                    Op: {t.cashierName}
                                                </div>
                                            </div>
                                        )}
                                        {t.status !== 'CANCELLED' && (
                                            <button 
                                                onClick={() => { setTransactionToVoid(t.id); setVoidModalOpen(true); }} 
                                                className="text-red-300 hover:text-red-500 transition-all"
                                            >
                                                <XCircle size={22}/>
                                            </button>
                                        )} 
                                        {t.status === 'CANCELLED' && (
                                            <span className="text-[9px] font-black text-red-500 uppercase border border-red-200 px-2 py-1 rounded-lg">
                                                Estornado
                                            </span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {finState.transactions.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-20 text-center text-gray-400 font-bold uppercase text-xs">
                                    Nenhuma transação encontrada
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={voidModalOpen} onClose={() => setVoidModalOpen(false)} title="Autorizar Cancelamento" variant="dialog" maxWidth="sm">
                <form onSubmit={handleVoidSubmit} className="space-y-6">
                    <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-start gap-3">
                        <Lock size={20} className="shrink-0"/>
                        <p>Apenas gerentes podem autorizar o estorno de vendas concluídas. Insira sua Senha Mestra abaixo.</p>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">PIN do Administrador</label>
                        <input 
                            type="password" 
                            autoFocus 
                            className="w-full border-2 p-5 rounded-2xl focus:border-red-500 outline-none text-center font-black tracking-[0.5em] text-3xl shadow-inner bg-gray-50" 
                            placeholder="****" 
                            value={voidPin} 
                            onChange={e => setVoidPin(e.target.value)} 
                            maxLength={4} 
                        />
                    </div>
                    <Button type="submit" className="w-full py-5 bg-red-600 hover:bg-red-700 font-black rounded-2xl text-lg shadow-xl shadow-red-600/20">
                        ESTORNAR AGORA
                    </Button>
                </form>
            </Modal>
        </div>
    );
};
