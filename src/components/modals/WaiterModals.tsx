
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useOrder } from '../../context/OrderContext';
import { useMenu } from '../../context/MenuContext';
import { useAuth } from '../../context/AuthProvider';
import { useUI } from '../../context/UIContext';
import { Product, Order, OrderStatus } from '../../types';
import { Utensils, Trash2, X, Minus, Plus, CheckSquare, Square, AlertCircle, DollarSign, CreditCard, Zap, Split, CheckCircle2 } from 'lucide-react';

// --- Open Table Modal ---
export const OpenTableModal: React.FC<{ isOpen: boolean, onClose: () => void, tableId: string | null }> = ({ isOpen, onClose, tableId }) => {
    const { dispatch } = useOrder();
    const { showAlert } = useUI();
    const [customerName, setCustomerName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleOpen = async () => {
        console.log("Tentando abrir mesa:", tableId, "Cliente:", customerName);
        if (!tableId) return;
        setLoading(true);
        try {
            const code = Math.floor(1000 + Math.random() * 9000).toString();
            console.log("Código gerado:", code);
            await dispatch({ type: 'OPEN_TABLE', tableId, customerName: customerName || 'Cliente', accessCode: code });
            console.log("Mesa aberta com sucesso!");
            showAlert({ title: "Mesa Aberta", message: `Mesa aberta com sucesso! Código: ${code}`, type: 'SUCCESS' });
            setCustomerName('');
            onClose();
        } catch (error) {
            console.error("Erro ao abrir mesa:", error);
            showAlert({ title: "Erro", message: "Não foi possível abrir a mesa.", type: 'ERROR' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Abrir Mesa" 
            variant="dialog" 
            maxWidth="sm" 
            onSave={handleOpen}
            saveLabel={loading ? "Abrindo..." : "Abrir Mesa"}
            disabled={loading}
        >
            <div className="space-y-4">
                <p className="text-xs text-gray-500 text-center mb-2 uppercase font-bold tracking-widest">Identificação do Cliente</p>
                <input 
                    className="w-full border-2 p-4 rounded-2xl focus:border-blue-500 outline-none text-center font-black text-xl bg-gray-50" 
                    placeholder="Ex: João Silva" 
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    autoFocus 
                />
                <p className="text-[10px] text-gray-400 text-center">Um código de acesso único será gerado automaticamente.</p>
            </div>
        </Modal>
    );
};

// --- Table Actions Modal ---
// Note: This modal has specific diverse actions, so it keeps internal buttons for clarity.
interface TableActionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    tableId: string | null;
    onOrder: () => void;
    orders?: Order[]; 
}

export const TableActionsModal: React.FC<TableActionsModalProps> = ({ isOpen, onClose, tableId, onOrder, orders = [] }) => {
    const { state, dispatch } = useOrder();
    const { state: authState } = useAuth();
    const { showAlert } = useUI();
    const table = state.tables.find(t => t.id === tableId);

    const [paymentMode, setPaymentMode] = useState(false);
    const [splitMode, setSplitMode] = useState(false);
    const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
    const [cashReceived, setCashReceived] = useState('');

    // Resetar estado interno ao abrir
    useEffect(() => {
        if(isOpen) {
            setPaymentMode(false);
            setSplitMode(false);
            setSelectedOrderIds([]);
            setCashReceived('');
        }
    }, [isOpen]);

    // Calcular Total
    // Se splitMode estiver ativo e houver seleção, calcula só os selecionados.
    // Caso contrário, calcula tudo.
    const ordersToCalculate = (splitMode && selectedOrderIds.length > 0) 
        ? orders.filter(o => selectedOrderIds.includes(o.id))
        : orders;

    const totalAmount = ordersToCalculate.reduce((sum, order) => 
        sum + order.items.reduce((s, i) => s + (i.productPrice * i.quantity), 0), 0
    );

    const totalTableAmount = orders.reduce((sum, order) => 
        sum + order.items.reduce((s, i) => s + (i.productPrice * i.quantity), 0), 0
    );

    const isPaid = orders.length > 0 && orders.every(o => o.isPaid);
    
    // Verifica se há itens pendentes (não entregues e não cancelados)
    const hasPendingItems = orders.some(o => 
        !o.isPaid && o.status !== 'CANCELLED' && 
        o.items.some(i => i.status !== OrderStatus.DELIVERED && i.status !== OrderStatus.CANCELLED)
    );

    const toggleOrderSelection = (orderId: string) => {
        setSelectedOrderIds(prev => 
            prev.includes(orderId) 
                ? prev.filter(id => id !== orderId) 
                : [...prev, orderId]
        );
    };

    const handlePayment = async (method: string) => {
        if (!tableId) return;
        
        try {
            await dispatch({ 
                type: 'PROCESS_PAYMENT', 
                tableId, 
                amount: totalAmount, 
                method, 
                cashierName: `Garçom ${authState.currentUser?.name || ''}`,
                specificOrderIds: (splitMode && selectedOrderIds.length > 0) ? selectedOrderIds : undefined
            });
            showAlert({ title: "Sucesso", message: "Pagamento registrado!", type: 'SUCCESS' });
            setPaymentMode(false);
            setSplitMode(false);
            setSelectedOrderIds([]);
            setCashReceived('');
            // Se pagou tudo, pode fechar automaticamente o modal ou esperar update
            if (totalAmount >= totalTableAmount) {
                 // onOrder(); // ou onClose
            }
        } catch (error) {
            showAlert({ title: "Erro", message: "Falha ao processar pagamento.", type: 'ERROR' });
        }
    };

    if (paymentMode) {
        return (
            <Modal isOpen={isOpen} onClose={() => setPaymentMode(false)} title={`Pagamento ${splitMode ? '(Parcial)' : ''}`} variant="dialog" maxWidth="sm">
                <div className="space-y-6">
                    <div className="text-center bg-gray-50 p-4 rounded-2xl border border-gray-200">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">{splitMode ? 'Total Selecionado' : 'Total da Mesa'}</p>
                        <p className="text-4xl font-black text-slate-800">R$ {totalAmount.toFixed(2)}</p>
                    </div>

                    {splitMode && (
                        <div className="text-xs text-center text-orange-600 font-bold bg-orange-50 p-2 rounded-lg">
                            Pagando {selectedOrderIds.length} pedidos de {orders.length}
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 ml-1">Dinheiro</label>
                            <div className="flex gap-2">
                                <input 
                                    type="number" 
                                    className="flex-1 border-2 p-3 rounded-xl font-bold text-lg outline-none focus:border-emerald-500" 
                                    placeholder="Valor Recebido"
                                    value={cashReceived}
                                    onChange={e => setCashReceived(e.target.value)}
                                />
                                <button 
                                    onClick={() => handlePayment('CASH')}
                                    disabled={!cashReceived || parseFloat(cashReceived) < totalAmount}
                                    className="bg-emerald-600 text-white px-4 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    OK
                                </button>
                            </div>
                            {parseFloat(cashReceived) > totalAmount && (
                                <div className="text-center text-sm font-bold text-emerald-600 bg-emerald-50 p-2 rounded-lg">
                                    Troco: R$ {(parseFloat(cashReceived) - totalAmount).toFixed(2)}
                                </div>
                            )}
                        </div>

                        <button onClick={() => handlePayment('CREDIT')} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-3">
                            <CreditCard size={20}/> Cartão Crédito
                        </button>
                        <button onClick={() => handlePayment('DEBIT')} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-3">
                            <CreditCard size={20}/> Cartão Débito
                        </button>
                        <button onClick={() => handlePayment('PIX')} className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-3">
                            <Zap size={20}/> PIX
                        </button>
                    </div>
                    
                    <button onClick={() => setPaymentMode(false)} className="w-full text-center text-sm font-bold text-gray-400 mt-2">Voltar</button>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Mesa ${table?.number}`} variant="dialog" maxWidth="sm">
            <div className="p-1 space-y-4">
                {table?.accessCode && !splitMode && (
                    <div className="bg-gray-100 p-3 rounded-xl text-center">
                        <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Código de Acesso</span>
                        <span className="text-3xl font-black text-slate-800 tracking-widest">{table.accessCode}</span>
                    </div>
                )}

                {/* VISUALIZAÇÃO DE PEDIDOS COM SELEÇÃO */}
                <div className="max-h-60 overflow-y-auto custom-scrollbar border rounded-xl border-gray-100 bg-white">
                     {orders.length === 0 && <div className="p-4 text-center text-gray-400 text-xs">Nenhum pedido lançado.</div>}
                     {orders.map(order => {
                         const orderTotal = order.items.reduce((s, i) => s + (i.productPrice * i.quantity), 0);
                         const isSelected = selectedOrderIds.includes(order.id);
                         const orderTime = new Date(order.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

                         return (
                             <div 
                                key={order.id} 
                                onClick={() => splitMode && toggleOrderSelection(order.id)}
                                className={`p-3 border-b last:border-0 transition-colors ${splitMode ? 'cursor-pointer hover:bg-blue-50' : ''} ${isSelected ? 'bg-blue-50' : ''}`}
                             >
                                 <div className="flex items-center justify-between mb-1">
                                     <div className="flex items-center gap-2">
                                         {splitMode && (
                                             <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white'}`}>
                                                 {isSelected && <CheckSquare size={14}/>}
                                             </div>
                                         )}
                                         <span className="font-bold text-slate-700 text-sm">Pedido #{order.id.slice(0,4)}</span>
                                         <span className="text-[10px] text-gray-400">{orderTime}</span>
                                     </div>
                                     <span className="font-black text-slate-800 text-sm">R$ {orderTotal.toFixed(2)}</span>
                                 </div>
                                 <div className="text-[10px] text-gray-500 pl-7">
                                     {order.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                                 </div>
                             </div>
                         )
                     })}
                </div>

                {/* Resumo e Botões */}
                {!splitMode ? (
                    <>
                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                            <span className="text-sm font-bold text-gray-600">Total Consumido</span>
                            <span className="text-xl font-black text-slate-800">R$ {totalTableAmount.toFixed(2)}</span>
                        </div>

                        <button onClick={onOrder} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all">
                            <Utensils size={20} /> LANÇAR PEDIDO
                        </button>

                        {!isPaid && totalTableAmount > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setSplitMode(true)} className="py-4 bg-white border-2 border-orange-200 text-orange-600 font-black rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-orange-50 transition-all text-xs uppercase tracking-wide">
                                    <Split size={20} /> Separar Pedidos
                                </button>
                                <button onClick={() => setPaymentMode(true)} className="py-4 bg-emerald-600 text-white font-black rounded-2xl flex flex-col items-center justify-center gap-1 shadow-xl shadow-emerald-200 hover:bg-emerald-500 transition-all text-xs uppercase tracking-wide">
                                    <DollarSign size={20} /> Pagar Tudo
                                </button>
                            </div>
                        )}
                        
                        {/* Lógica de Bloqueio de Fechamento */}
                        {hasPendingItems ? (
                            <div className="w-full py-4 bg-orange-50 text-orange-600 font-bold rounded-2xl flex flex-col items-center justify-center gap-1 border-2 border-orange-100 text-center px-4">
                                <AlertCircle size={20} />
                                <span className="text-xs uppercase tracking-wide">Impossível Fechar</span>
                                <span className="text-[10px] font-normal">Existem pedidos pendentes na cozinha.</span>
                            </div>
                        ) : (!isPaid && totalTableAmount > 0) ? (
                            <div className="w-full py-4 bg-red-50 text-red-600 font-bold rounded-2xl flex flex-col items-center justify-center gap-1 border-2 border-red-100 text-center px-4">
                                <DollarSign size={20} />
                                <span className="text-xs uppercase tracking-wide">Aguardando Pagamento</span>
                                <span className="text-[10px] font-normal">Receba o valor antes de liberar a mesa.</span>
                            </div>
                        ) : (
                            <button 
                                onClick={() => { 
                                    if (totalTableAmount > 0 && !isPaid) return; // Segurança extra
                                    dispatch({ type: 'CLOSE_TABLE', tableId }); 
                                    onClose(); 
                                }} 
                                className="w-full py-5 bg-slate-800 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-900 transition-all"
                            >
                                <Trash2 size={24} /> {totalTableAmount === 0 ? 'CANCELAR / FECHAR MESA' : 'LIBERAR MESA'}
                            </button>
                        )}
                    </>
                ) : (
                    // MODO DE SELEÇÃO (SPLIT)
                    <>
                        <div className="flex justify-between items-center bg-blue-50 p-3 rounded-xl border border-blue-200">
                            <span className="text-sm font-bold text-blue-800">Selecionado ({selectedOrderIds.length})</span>
                            <span className="text-xl font-black text-blue-800">R$ {totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={() => setSplitMode(false)} className="flex-1 py-4 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300">Cancelar</button>
                             <button 
                                onClick={() => setPaymentMode(true)} 
                                disabled={selectedOrderIds.length === 0}
                                className="flex-1 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                             >
                                <CheckCircle2 size={18} /> Pagar Seleção
                             </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

// --- Waiter Product Modal (Unchanged as it uses custom overlay) ---
interface WaiterProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onConfirm: (item: { product: Product, qty: number, note: string, selectedExtraIds: string[] }) => void;
}

export const WaiterProductModal: React.FC<WaiterProductModalProps> = ({ isOpen, onClose, product, onConfirm }) => {
    const { state } = useMenu();
    const [qty, setQty] = useState(1);
    const [note, setNote] = useState('');
    const [drinkTiming, setDrinkTiming] = useState<'IMMEDIATE' | 'WITH_FOOD'>('IMMEDIATE');
    const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            setQty(1);
            setNote('');
            setDrinkTiming('IMMEDIATE');
            setSelectedExtraIds([]);
        }
    }, [isOpen, product]);

    if (!product) return null;

    const toggleExtra = (id: string) => {
        setSelectedExtraIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const calculateTotal = () => {
        const extrasTotal = (product.linkedExtraIds || []).reduce((acc, id) => {
            if (!selectedExtraIds.includes(id)) return acc;
            const extraProd = state.products.find(p => p.id === id);
            return acc + (extraProd?.price || 0);
        }, 0);
        return (product.price + extrasTotal) * qty;
    };

    const handleConfirm = () => {
        let finalNote = note;
        if (product.category === 'Bebidas') {
            const timing = drinkTiming === 'IMMEDIATE' ? '[IMEDIATA] ' : '[COM COMIDA] ';
            finalNote = timing + finalNote;
        }
        onConfirm({ product, qty, note: finalNote, selectedExtraIds });
        onClose();
    };

    return (
        <div className={`fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 ${!isOpen ? 'hidden' : ''}`}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                    <h3 className="font-bold truncate pr-4">{product.name}</h3>
                    <button onClick={onClose}><X size={24}/></button>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 text-center uppercase tracking-widest">Quantidade</label>
                        <div className="flex items-center gap-6 justify-center">
                            <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-4 bg-gray-100 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"><Minus size={24}/></button>
                            <span className="text-4xl font-bold w-16 text-center text-blue-600">{qty}</span>
                            <button onClick={() => setQty(qty + 1)} className="p-4 bg-gray-100 rounded-xl hover:bg-green-50 hover:text-green-600 transition-colors"><Plus size={24}/></button>
                        </div>
                    </div>
                    {product.linkedExtraIds && product.linkedExtraIds.length > 0 && (
                        <div className="border-t border-b py-4 space-y-3">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider"><Plus size={14} className="inline text-green-600 mr-1"/> Adicionais</label>
                            <div className="space-y-2">
                                {product.linkedExtraIds.map(id => {
                                    const extra = state.products.find(p => p.id === id);
                                    if (!extra) return null;
                                    const isSelected = selectedExtraIds.includes(id);
                                    return (
                                        <div key={id} onClick={() => toggleExtra(id)} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${isSelected ? 'bg-orange-50 border-orange-400' : 'bg-white border-transparent shadow-sm hover:border-slate-200'}`}>
                                            <div className="flex items-center gap-3">
                                                {isSelected ? <CheckSquare size={20} className="text-orange-600"/> : <Square size={20} className="text-gray-300"/>}
                                                <span className="text-sm font-bold text-slate-700">{extra.name}</span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-400">R$ {extra.price.toFixed(2)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Observações</label>
                        <textarea className="w-full border-2 rounded-xl p-3 text-sm focus:border-blue-500 outline-none transition-all" rows={2} placeholder="Sem cebola, etc..." value={note} onChange={e => setNote(e.target.value)} />
                    </div>
                </div>
                <div className="p-4 border-t bg-gray-50">
                    <Button onClick={handleConfirm} className="w-full py-4 text-lg font-black shadow-lg">Confirmar R$ {calculateTotal().toFixed(2)}</Button>
                </div>
            </div>
        </div>
    );
};
