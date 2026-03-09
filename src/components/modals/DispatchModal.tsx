import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useStaff } from '@/core/context/StaffContext';
import { useRestaurant } from '@/core/context/RestaurantContext';
import { Order } from '@/types';
import { User, Bike, MapPin } from 'lucide-react';

interface DispatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    onConfirm: (courierInfo: { id: string, name: string }) => void;
}

export const DispatchModal: React.FC<DispatchModalProps> = ({ isOpen, onClose, order, onConfirm }) => {
    const { state: staffState } = useStaff();
    const { state: restState } = useRestaurant();
    
    const [dispatchType, setDispatchType] = useState<'INTERNAL' | 'APP'>('INTERNAL');
    const [selectedCourierId, setSelectedCourierId] = useState('');
    
    // Reset state when modal opens
    useEffect(() => {
        if (isOpen && order) {
            // Try to guess default based on order method
            const method = restState.businessInfo?.deliverySettings?.find(m => m.name === order.deliveryInfo?.platform);
            if (method && method.type === 'APP') {
                setDispatchType('APP');
                setSelectedCourierId(method.id);
            } else {
                setDispatchType('INTERNAL');
                setSelectedCourierId('');
            }
        }
    }, [isOpen, order, restState.businessInfo?.deliverySettings]);

    if (!order) return null;

    const deliveryApps = restState.businessInfo?.deliverySettings?.filter(m => m.type === 'APP' && m.isActive) || [];
    const staffMembers = staffState.users.filter(u => u.status === 'ACTIVE'); 

    const handleConfirm = () => {
        let courierName = '';
        if (dispatchType === 'INTERNAL') {
            const staff = staffMembers.find(s => s.id === selectedCourierId);
            if (!staff) return;
            courierName = staff.name;
        } else {
            const app = deliveryApps.find(a => a.id === selectedCourierId);
            if (!app) return;
            courierName = app.name;
        }
        
        onConfirm({ id: selectedCourierId, name: courierName });
        onClose();
    };

    const total = order.items.reduce((acc, i) => acc + (i.productPrice * i.quantity), 0) + (order.deliveryInfo?.deliveryFee || 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Despachar Pedido" maxWidth="md">
            <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="font-bold text-slate-800">{order.deliveryInfo?.customerName}</h3>
                            <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={12}/> {order.deliveryInfo?.address}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-black text-slate-800">R$ {total.toFixed(2)}</p>
                            <p className="text-xs text-slate-500 uppercase">{order.deliveryInfo?.paymentMethod}</p>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tipo de Entrega</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => { setDispatchType('INTERNAL'); setSelectedCourierId(''); }}
                            className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${dispatchType === 'INTERNAL' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:bg-gray-50'}`}
                        >
                            <User size={18} />
                            <span className="font-bold text-sm">Entregador Próprio</span>
                        </button>
                        <button 
                            onClick={() => { setDispatchType('APP'); setSelectedCourierId(''); }}
                            className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${dispatchType === 'APP' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-100 hover:bg-gray-50'}`}
                        >
                            <Bike size={18} />
                            <span className="font-bold text-sm">App Parceiro</span>
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Selecione o Entregador</label>
                    {dispatchType === 'INTERNAL' ? (
                        <select 
                            className="w-full p-3 rounded-xl border-2 border-gray-100 bg-white font-bold text-slate-700 outline-none focus:border-blue-500"
                            value={selectedCourierId}
                            onChange={e => setSelectedCourierId(e.target.value)}
                        >
                            <option value="">Selecione um funcionário...</option>
                            {staffMembers.map(staff => (
                                <option key={staff.id} value={staff.id}>{staff.name}</option>
                            ))}
                        </select>
                    ) : (
                        <select 
                            className="w-full p-3 rounded-xl border-2 border-gray-100 bg-white font-bold text-slate-700 outline-none focus:border-orange-500"
                            value={selectedCourierId}
                            onChange={e => setSelectedCourierId(e.target.value)}
                        >
                            <option value="">Selecione o App...</option>
                            {deliveryApps.map(app => (
                                <option key={app.id} value={app.id}>{app.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="pt-4 border-t flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button 
                        onClick={handleConfirm} 
                        disabled={!selectedCourierId}
                        className={`px-6 ${dispatchType === 'INTERNAL' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-orange-600 hover:bg-orange-500'} text-white font-bold`}
                    >
                        Confirmar Despacho
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
