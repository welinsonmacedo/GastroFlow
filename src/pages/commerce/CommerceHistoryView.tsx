import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { supabase } from '../../lib/supabase';
import { Transaction, OrderItem } from '../../types';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Search, History, Eye, XCircle, Lock, Receipt, Calendar } from 'lucide-react';

export const CommerceHistoryView: React.FC = () => {
    const { state: finState, voidTransaction } = useFinance();
    const { state: restState } = useRestaurant();
    const { showAlert } = useUI();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal Details
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    const [txItems, setTxItems] = useState<OrderItem[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Modal Cancel
    const [voidModalOpen, setVoidModalOpen] = useState(false);
    const [transactionToVoid, setTransactionToVoid] = useState<string | null>(null);
    const [adminPin, setAdminPin] = useState('');

    const fetchHistory = async () => {
        if (!restState.tenantId) return;
        setLoading(true);
        try {
            const start = `${filterDate} 00:00:00`;
            const end = `${filterDate} 23:59:59`;
            
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('tenant_id', restState.tenantId)
                .gte('created_at', start)
                .lte('created_at', end)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            const mapped = (data || []).map((t: any) => ({
                id: t.id,
                tableId: t.table_id || '',
                tableNumber: t.table_number || 0,
                amount: Number(t.amount),
                method: t.method,
                timestamp: new Date(t.created_at),
                itemsSummary: t.items_summary || '',
                cashierName: t.cashier_name || '',
                status: t.status || 'COMPLETED',
                order_id: t.order_id // Needed for details
            }));
            setTransactions(mapped);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [filterDate, restState.tenantId]);

    const handleViewDetails = async (tx: Transaction) => {
        // Cast to access order_id property which might be dynamic
        const orderId = (tx as any).order_id;
        if (!orderId) {
            showAlert({ title: "Sem Detalhes", message: "Esta transação não possui itens vinculados.", type: 'INFO' });
            return;
        }
        
        setSelectedTx(tx);
        setLoadingDetails(true);
        try {
            const { data, error } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', orderId);
                
            if (error) throw error;
            
            const items = (data || []).map((i: any) => ({
                id: i.id,
                productId: i.product_id || '',
                quantity: Number(i.quantity),
                notes: i.notes,
                status: i.status,
                productName: i.product_name,
                productType: i.product_type,
                productPrice: Number(i.product_price),
                productCostPrice: Number(i.product_cost_price)
            }));
            setTxItems(items);
        } catch (error) {
            showAlert({ title: "Erro", message: "Falha ao carregar itens.", type: 'ERROR' });
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleVoidSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transactionToVoid) return;
        try {
            await voidTransaction(transactionToVoid, adminPin);
            setVoidModalOpen(false);
            setAdminPin('');
            showAlert({ title: "Sucesso", message: "Transação estornada!", type: 'SUCCESS' });
            fetchHistory(); // Refresh list
        } catch (error: any) {
            showAlert({ title: "Erro", message: error.message || "Senha incorreta ou erro no estorno.", type: 'ERROR' });
        }
    };

    const filteredList = transactions.filter(t => 
        t.itemsSummary.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.id.includes(searchTerm)
    );

    return (
        <div className="h-full flex flex-col space-y-6 animate-fade-in">
            {/* Header / Filtros */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 text-indigo-700">
                    <div className="bg-indigo-100 p-2 rounded-lg"><History size={20}/></div>
                    <h2 className="text-xl font-bold">Histórico de Vendas</h2>
                </div>
                
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <div className="relative">
                         <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                         <input 
                            className="pl-10 pr-4 py-2 border rounded-xl text-sm focus:border-indigo-500 outline-none w-full md:w-64" 
                            placeholder="Buscar transação..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                         />
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 border px-3 py-2 rounded-xl">
                        <Calendar size={18} className="text-gray-500"/>
                        <input 
                            type="date" 
                            className="bg-transparent text-sm font-bold text-gray-700 outline-none"
                            value={filterDate}
                            onChange={e => setFilterDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Lista */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-widest sticky top-0 z-10">
                            <tr>
                                <th className="p-4">Hora</th>
                                <th className="p-4">Resumo</th>
                                <th className="p-4">Pagamento</th>
                                <th className="p-4 text-right">Valor</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {filteredList.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Nenhuma venda encontrada.</td></tr>
                            ) : filteredList.map(tx => (
                                <tr key={tx.id} className={`hover:bg-gray-50 transition-colors ${tx.status === 'CANCELLED' ? 'bg-red-50/30' : ''}`}>
                                    <td className="p-4 font-mono text-gray-600">{tx.timestamp.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                    <td className="p-4 font-bold text-slate-700">{tx.itemsSummary}</td>
                                    <td className="p-4"><span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100 uppercase">{tx.method}</span></td>
                                    <td className={`p-4 text-right font-black ${tx.status === 'CANCELLED' ? 'text-gray-400 line-through' : 'text-slate-800'}`}>R$ {tx.amount.toFixed(2)}</td>
                                    <td className="p-4 text-center">
                                        {tx.status === 'CANCELLED' ? (
                                            <span className="text-red-600 font-bold text-xs uppercase flex items-center justify-center gap-1"><XCircle size={14}/> Cancelado</span>
                                        ) : (
                                            <span className="text-green-600 font-bold text-xs uppercase flex items-center justify-center gap-1">Concluído</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => handleViewDetails(tx)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Ver Detalhes"><Eye size={18}/></button>
                                            {tx.status !== 'CANCELLED' && (
                                                <button onClick={() => { setTransactionToVoid(tx.id); setVoidModalOpen(true); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cancelar Venda"><XCircle size={18}/></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Detalhes */}
            <Modal isOpen={!!selectedTx} onClose={() => setSelectedTx(null)} title="Detalhes da Venda" variant="dialog" maxWidth="md">
                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Total Pago</p>
                            <p className="text-2xl font-black text-indigo-700">R$ {selectedTx?.amount.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-xs text-gray-500 font-bold">{selectedTx?.timestamp.toLocaleString()}</p>
                             <p className="text-sm font-bold text-slate-700 uppercase">{selectedTx?.method}</p>
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto custom-scrollbar border rounded-xl">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 text-xs font-bold text-gray-600">
                                <tr><th className="p-2">Qtd</th><th className="p-2">Item</th><th className="p-2 text-right">Total</th></tr>
                            </thead>
                            <tbody className="divide-y">
                                {txItems.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="p-2 text-center font-mono">{item.quantity}</td>
                                        <td className="p-2">{item.productName}</td>
                                        <td className="p-2 text-right font-bold">R$ {(item.productPrice * item.quantity).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Button onClick={() => setSelectedTx(null)} variant="secondary" className="w-full">Fechar</Button>
                </div>
            </Modal>

            {/* Modal Cancelamento */}
            <Modal isOpen={voidModalOpen} onClose={() => setVoidModalOpen(false)} title="Cancelar Venda" variant="dialog" maxWidth="sm">
                <form onSubmit={handleVoidSubmit} className="space-y-6">
                    <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-start gap-3">
                        <Lock size={20} className="shrink-0"/>
                        <p>Esta ação é irreversível e exige a Senha Mestra do administrador para ser autorizada.</p>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">PIN do Administrador</label>
                        <input 
                            type="password" 
                            autoFocus 
                            className="w-full border-2 p-5 rounded-2xl focus:border-red-500 outline-none text-center font-black tracking-[0.5em] text-3xl shadow-inner bg-gray-50" 
                            placeholder="****" 
                            value={adminPin} 
                            onChange={e => setAdminPin(e.target.value)} 
                            maxLength={4} 
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={() => setVoidModalOpen(false)} className="flex-1">Voltar</Button>
                        <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black shadow-red-200">CONFIRMAR ESTORNO</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};