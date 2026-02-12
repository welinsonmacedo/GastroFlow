import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useOrder } from '../../context/OrderContext';
import { useMenu } from '../../context/MenuContext';
import { Product } from '../../types';
import { Utensils, Trash2, X, Minus, Plus, CheckSquare, Square } from 'lucide-react';

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

// --- Table Actions Modal ---
export const TableActionsModal: React.FC<{ isOpen: boolean, onClose: () => void, tableId: string | null, onOrder: () => void }> = ({ isOpen, onClose, tableId, onOrder }) => {
    const { state, dispatch } = useOrder();
    const table = state.tables.find(t => t.id === tableId);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Mesa ${table?.number}`} variant="dialog" maxWidth="sm">
            <div className="p-1 space-y-3">
                <button onClick={onOrder} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all">
                    <Utensils size={24} /> LANÇAR PEDIDO
                </button>
                <button onClick={() => { dispatch({ type: 'CLOSE_TABLE', tableId }); onClose(); }} className="w-full py-5 bg-red-50 text-red-600 font-black rounded-2xl flex items-center justify-center gap-3 border-2 border-red-100 hover:bg-red-100 transition-all">
                    <Trash2 size={24} /> CANCELAR MESA
                </button>
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