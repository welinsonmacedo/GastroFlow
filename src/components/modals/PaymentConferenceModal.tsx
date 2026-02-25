import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useRestaurant } from '../../context/RestaurantContext';
import { Order } from '../../types';
import { CreditCard, DollarSign, Smartphone } from 'lucide-react';

interface PaymentConferenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    onConfirm: (amount: number, method: string) => void;
}

export const PaymentConferenceModal: React.FC<PaymentConferenceModalProps> = ({ isOpen, onClose, order, onConfirm }) => {
    const { state: restState } = useRestaurant();
    const [selectedMethod, setSelectedMethod] = useState('');
    const [amount, setAmount] = useState(0);

    useEffect(() => {
        if (isOpen && order) {
            setSelectedMethod(order.deliveryInfo?.paymentMethod || '');
            const total = order.items.reduce((acc, i) => acc + (i.productPrice * i.quantity), 0) + (order.deliveryInfo?.deliveryFee || 0);
            setAmount(total);
        }
    }, [isOpen, order]);

    if (!order) return null;

    const paymentMethods = restState.businessInfo?.paymentMethods?.filter(pm => pm.isActive) || [];

    const handleConfirm = () => {
        if (!selectedMethod) return;
        onConfirm(amount, selectedMethod);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Conferência de Pagamento" maxWidth="md">
            <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Valor Total</p>
                    <p className="text-3xl font-black text-slate-800">R$ {amount.toFixed(2)}</p>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Forma de Pagamento Realizada</label>
                    <div className="grid grid-cols-2 gap-2">
                        {paymentMethods.map(pm => (
                            <button
                                key={pm.id}
                                onClick={() => setSelectedMethod(pm.name)}
                                className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${selectedMethod === pm.name ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 hover:bg-gray-50'}`}
                            >
                                {pm.type === 'CASH' && <DollarSign size={18} />}
                                {pm.type === 'CREDIT' && <CreditCard size={18} />}
                                {pm.type === 'DEBIT' && <CreditCard size={18} />}
                                {pm.type === 'PIX' && <Smartphone size={18} />}
                                {pm.type === 'APP' && <Smartphone size={18} />}
                                <span className="font-bold text-sm">{pm.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-4 border-t flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button 
                        onClick={handleConfirm} 
                        disabled={!selectedMethod}
                        className="px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    >
                        Confirmar Recebimento
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
