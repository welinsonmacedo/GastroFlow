
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useOrder } from '../../context/OrderContext';
import { useMenu } from '../../context/MenuContext';
import { useAuth } from '../../context/AuthProvider';
import { useUI } from '../../context/UIContext';
import { Product, Order, OrderStatus } from '../../types';
import { Utensils, Trash2, X, Minus, Plus, CheckSquare, Square, AlertCircle, DollarSign, CreditCard, Banknote, Zap } from 'lucide-react';

// --- Open Table Modal ---
export const OpenTableModal: React.FC<{ isOpen: boolean, onClose: () => void, tableId: string | null }> = ({ isOpen, onClose, tableId }) => {
    const { dispatch } = useOrder();
    const [customerName, setCustomerName] = useState('');

    const handleOpen = () => {
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        dispatch({ type: 'OPEN_TABLE', tableId, customerName: customerName || 'Cliente', accessCode: code });
        setCustomerName('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Abrir Mesa" variant="dialog" maxWidth="sm">
            <div className="space-y-4">
                <input 
                    className="w-full border-2 p-3 rounded-xl focus:border-blue-500 outline-none text-center font-bold" 
                    placeholder="Nome do Cliente" 
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    autoFocus 
                />
                <Button onClick={handleOpen} className="w-full py-4 font-bold">INICIAR ATENDIMENTO</Button>
            </div>
        </Modal>
    );
};

// --- Table Actions Modal (UPDATED) ---
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
    const [cashReceived, setCashReceived] = useState('');

    // Cálculos
    const totalAmount = orders.reduce((sum, order) => 
        sum + order.items.reduce((s, i) => s + (i.productPrice * i.quantity), 0), 0
    );

    const isPaid = orders.length > 0 && orders.every(o => o.isPaid);
    
    // Verifica se há itens pendentes (não entregues e não cancelados)
    const hasPendingItems = orders.some(o => 
        !o.isPaid && o.status !== 'CANCELLED' && 
        o.items.some(i => i.status !== OrderStatus.DELIVERED && i.status !== OrderStatus.CANCELLED)
    );

    const handlePayment = async (method: string) => {
        if (!tableId) return;
        
        try {
            await dispatch({ 
                type: 'PROCESS_PAYMENT', 
                tableId, 
                amount: totalAmount, 
                method, 
                cashierName: `Garçom ${authState.currentUser?.name || ''}` 
            });
            showAlert({ title: "Sucesso", message: "Pagamento registrado! A mesa pode ser fechada.", type: 'SUCCESS' });
            setPaymentMode(false);
            setCashReceived('');
        } catch (error) {
            showAlert({ title: "Erro", message: "Falha ao processar pagamento.", type: 'ERROR' });
        }
    };

    // Resetar estado interno ao abrir
    useEffect(() => {
        if(isOpen) {
            setPaymentMode(false);
            setCashReceived('');
        }
    }, [isOpen]);

    if (paymentMode) {
        return (
            <Modal isOpen={isOpen} onClose={() => setPaymentMode(false)} title={`Pagamento Mesa ${table?.number}`} variant="dialog" maxWidth="sm">
                <div className="space-y-6">
                    <div className="text-center bg-gray-50 p-4 rounded-2xl border border-gray-200">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Total a Pagar</p>
                        <p className="text-4xl font-black text-slate-800">R$ {totalAmount.toFixed(2)}</p>
                    </div>

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
                {table?.accessCode && (
                    <div className="bg-gray-100 p-3 rounded-xl text-center">
                        <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Código de Acesso</span>
                        <span className="text-3xl font-black text-slate-800 tracking-widest">{table.accessCode}</span>
                    </div>
                )}

                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <span className="text-sm font-bold text-gray-600">Total Consumido</span>
                    <span className="text-xl font-black text-slate-800">R$ {totalAmount.toFixed(2)}</span>
                </div>

                <button onClick={onOrder} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all">
                    <Utensils size={24} /> LANÇAR PEDIDO
                </button>

                {!isPaid && totalAmount > 0 && (
                    <button onClick={() => setPaymentMode(true)} className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-emerald-200 hover:scale-[1.02] active:scale-95 transition-all">
                        <DollarSign size={24} /> RECEBER PAGAMENTO
                    </button>
                )}
                
                {/* Lógica de Bloqueio de Fechamento */}
                {hasPendingItems ? (
                    <div className="w-full py-4 bg-orange-50 text-orange-600 font-bold rounded-2xl flex flex-col items-center justify-center gap-1 border-2 border-orange-100 text-center px-4">
                        <AlertCircle size={20} />
                        <span className="text-xs uppercase tracking-wide">Impossível Fechar</span>
                        <span className="text-[10px] font-normal">Existem pedidos pendentes na cozinha.</span>
                    </div>
                ) : (!isPaid && totalAmount > 0) ? (
                    <div className="w-full py-4 bg-red-50 text-red-600 font-bold rounded-2xl flex flex-col items-center justify-center gap-1 border-2 border-red-100 text-center px-4">
                        <DollarSign size={20} />
                        <span className="text-xs uppercase tracking-wide">Aguardando Pagamento</span>
                        <span className="text-[10px] font-normal">Receba o valor antes de liberar a mesa.</span>
                    </div>
                ) : (
                    <button 
                        onClick={() => { 
                            if (totalAmount > 0 && !isPaid) return; // Segurança extra
                            dispatch({ type: 'CLOSE_TABLE', tableId }); 
                            onClose(); 
                        }} 
                        className="w-full py-5 bg-slate-800 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-900 transition-all"
                    >
                        <Trash2 size={24} /> {totalAmount === 0 ? 'CANCELAR / FECHAR MESA' : 'LIBERAR MESA'}
                    </button>
                )}
            </div>
        </Modal>
    );
};

// --- Waiter Product Modal ---
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
