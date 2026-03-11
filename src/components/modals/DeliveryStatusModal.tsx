
import React, { useState } from 'react';
import { useRestaurant } from '@/core/context/RestaurantContext';
import { useOrder } from '@/core/context/OrderContext';
import { useUI } from '@/core/context/UIContext';
import { OrderStatus } from '@/types';
import { Modal } from '../Modal';
import { Printer, CheckCircle, MapPin, Clock, Bike } from 'lucide-react';
import { DispatchModal } from './DispatchModal';
import { PaymentConferenceModal } from './PaymentConferenceModal';
import { printHtml, getReceiptStyles } from '@/core/print/printHelper';

interface DeliveryStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DeliveryStatusModal: React.FC<DeliveryStatusModalProps> = ({ isOpen, onClose }) => {
    const { state: restState } = useRestaurant();
    const { state: orderState, dispatch: orderDispatch } = useOrder();
    const { showAlert } = useUI();

    const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
    const [selectedOrderToDispatch, setSelectedOrderToDispatch] = useState<any>(null);

    const [conferenceModalOpen, setConferenceModalOpen] = useState(false);
    const [selectedOrderToConference, setSelectedOrderToConference] = useState<any>(null);

    const activeDeliveryOrders = orderState.orders.filter(o => o.type === 'DELIVERY' && !o.isPaid && o.status !== 'CANCELLED' && o.status !== 'DISPATCHED');
    const dispatchedOrders = orderState.orders.filter(o => o.type === 'DELIVERY' && o.status === 'DISPATCHED' && !o.isPaid);
    
    const configuredPaymentMethods = restState.businessInfo?.paymentMethods?.filter(pm => pm.isActive) || [];

    const handleDispatch = (orderId: string) => {
        const order = activeDeliveryOrders.find(o => o.id === orderId);
        if (!order) return;
        setSelectedOrderToDispatch(order);
        setDispatchModalOpen(true);
    };

    const confirmDispatch = async (courierInfo: { id: string, name: string }) => {
        if (!selectedOrderToDispatch) return;
        const order = selectedOrderToDispatch;
        const total = order.items.reduce((acc: number, i: any) => acc + (i.productPrice * i.quantity), 0) + (order.deliveryInfo?.deliveryFee || 0);

        const paymentMethodConfig = configuredPaymentMethods.find(pm => pm.name === order.deliveryInfo?.paymentMethod);
        const isAppPayment = paymentMethodConfig?.type === 'APP';

        if (isAppPayment) {
             await orderDispatch({ 
                type: 'PROCESS_PAYMENT', 
                amount: total, 
                method: order.deliveryInfo?.paymentMethod || 'APP', 
                orderId: order.id,
                cashierName: 'Delivery',
                courierInfo
            });
            showAlert({ title: "Finalizado", message: `Pedido App finalizado automaticamente!`, type: 'SUCCESS' });
        } else {
            await orderDispatch({
                type: 'DISPATCH_ORDER',
                orderId: order.id,
                courierInfo
            });
            showAlert({ title: "Despachado", message: `Pedido despachado por ${courierInfo.name}. Aguardando retorno.`, type: 'INFO' });
        }
        
        setDispatchModalOpen(false);
        setSelectedOrderToDispatch(null);
    };

    const handleConference = (orderId: string) => {
        const order = dispatchedOrders.find(o => o.id === orderId);
        if (!order) return;
        setSelectedOrderToConference(order);
        setConferenceModalOpen(true);
    };

    const confirmConference = async (amount: number, method: string) => {
        if (!selectedOrderToConference) return;
        
        await orderDispatch({ 
            type: 'PROCESS_PAYMENT', 
            amount: amount, 
            method: method, 
            orderId: selectedOrderToConference.id,
            cashierName: 'Delivery'
        });
        
        showAlert({ title: "Conferido", message: "Pagamento confirmado e pedido finalizado.", type: 'SUCCESS' });
        setConferenceModalOpen(false);
        setSelectedOrderToConference(null);
    };

    const handlePrintOrder = (order: any) => {
        const total = order.items.reduce((acc: number, i: any) => acc + (i.productPrice * i.quantity), 0) + (order.deliveryInfo?.deliveryFee || 0);
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cupom Delivery</title>
                ${getReceiptStyles()}
            </head>
            <body>
                <div class="header">
                    <span class="title">${restState.theme.restaurantName}</span>
                    <span class="subtitle">DELIVERY / BALCÃO</span>
                    <span class="subtitle">Pedido #${order.id.slice(0,4)}</span>
                </div>
                <div style="margin-bottom: 15px; font-size: 13px;">
                    <strong>Cliente:</strong> ${order.deliveryInfo?.customerName}<br/>
                    <strong>Telefone:</strong> ${order.deliveryInfo?.phone || '-'}<br/>
                    <strong>Endereço:</strong> ${order.deliveryInfo?.address || 'Retirada'}<br/>
                    <strong>Método:</strong> ${order.deliveryInfo?.platform} (${order.deliveryInfo?.paymentMethod})
                </div>
                <div style="border-bottom: 1px dashed #000; margin-bottom: 10px;"></div>
                ${order.items.map((i: any) => `
                    <div class="item-row">
                        <span>${i.quantity}x ${i.productName}</span>
                        <span>${(i.productPrice * i.quantity).toFixed(2)}</span>
                    </div>
                    ${i.notes ? `<div class="note">${i.notes}</div>` : ''}
                `).join('')}
                <div class="total">
                    <div style="font-size: 12px; font-weight: normal;">Taxa: ${(order.deliveryInfo?.deliveryFee || 0).toFixed(2)}</div>
                    <div style="margin-top: 5px;">TOTAL: R$ ${total.toFixed(2)}</div>
                    ${order.deliveryInfo?.changeFor ? `<div style="font-size: 12px;">Troco para: ${order.deliveryInfo.changeFor.toFixed(2)}</div>` : ''}
                </div>
                <div class="footer">
                    ${new Date(order.timestamp).toLocaleString()}
                </div>
            </body>
            </html>
        `;
        printHtml(html);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Monitor de Delivery" maxWidth="lg">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[70vh]">
                {/* Preparo */}
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-slate-700 uppercase tracking-tight text-sm flex items-center gap-2"><Clock size={16}/> Em Preparo</h3>
                        <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-2 py-1 rounded-lg border border-orange-200">{activeDeliveryOrders.length} PEDIDOS</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                        {activeDeliveryOrders.map(order => {
                            const total = order.items.reduce((acc, i) => acc + (i.productPrice * i.quantity), 0) + (order.deliveryInfo?.deliveryFee || 0);
                            const kitchenItems = order.items.filter(i => i.productType === 'KITCHEN');
                            const isReady = kitchenItems.length === 0 || kitchenItems.every(i => i.status === OrderStatus.READY);

                            return (
                                <div key={order.id} className={`bg-white p-4 rounded-2xl shadow-sm border-l-4 transition-all ${isReady ? 'border-l-emerald-500' : 'border-l-orange-400'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-slate-800 text-sm truncate uppercase tracking-tight">{order.deliveryInfo?.customerName}</h4>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-2 mt-1">
                                                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-500">{order.deliveryInfo?.platform}</span>
                                                <span>#{order.id.slice(0,4)}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-slate-900 text-sm">R$ {total.toFixed(2)}</div>
                                            <button onClick={() => handlePrintOrder(order)} className="text-gray-300 hover:text-blue-600 transition-colors mt-1" title="Imprimir Cupom"><Printer size={16}/></button>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-gray-400 mb-4 truncate flex items-center gap-1 font-bold"><MapPin size={12} className="text-gray-300"/> {order.deliveryInfo?.address || 'Retirada'}</div>
                                    {isReady ? (
                                        <button onClick={() => handleDispatch(order.id)} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"><CheckCircle size={14}/> Despachar Pedido</button>
                                    ) : (
                                        <div className="w-full py-3 bg-orange-50 text-orange-600 rounded-xl font-black text-[10px] uppercase text-center border border-orange-100 flex items-center justify-center gap-2">
                                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                                            Preparando na Cozinha
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {activeDeliveryOrders.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-50 py-20">
                                <Clock size={48} strokeWidth={1.5} className="mb-2"/>
                                <p className="font-black uppercase text-[10px] tracking-widest">Nenhum pedido em preparo</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Despachados */}
                <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-blue-800 uppercase tracking-tight text-sm flex items-center gap-2"><Bike size={16}/> Despachados</h3>
                        <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded-lg border border-blue-200">{dispatchedOrders.length} EM ROTA</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                        {dispatchedOrders.map(order => {
                            const total = order.items.reduce((acc, i) => acc + (i.productPrice * i.quantity), 0) + (order.deliveryInfo?.deliveryFee || 0);
                            return (
                                <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-l-blue-500">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-slate-800 text-sm truncate uppercase tracking-tight">{order.deliveryInfo?.customerName}</h4>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-2 mt-1">
                                                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-500">{order.deliveryInfo?.platform}</span>
                                                <span>#{order.id.slice(0,4)}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-slate-900 text-sm">R$ {total.toFixed(2)}</div>
                                            <div className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded mt-1 uppercase truncate max-w-[80px]">{order.deliveryInfo?.courierName}</div>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-gray-400 mb-4 truncate flex items-center gap-1 font-bold"><MapPin size={12} className="text-gray-300"/> {order.deliveryInfo?.address || 'Retirada'}</div>
                                    <button onClick={() => handleConference(order.id)} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95">
                                        <CheckCircle size={14}/> Conferir Entrega
                                    </button>
                                </div>
                            );
                        })}
                        {dispatchedOrders.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-blue-200 opacity-50 py-20">
                                <Bike size={48} strokeWidth={1.5} className="mb-2"/>
                                <p className="font-black uppercase text-[10px] tracking-widest">Nenhum pedido em rota</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <DispatchModal 
                isOpen={dispatchModalOpen}
                onClose={() => setDispatchModalOpen(false)}
                order={selectedOrderToDispatch}
                onConfirm={confirmDispatch}
            />

            <PaymentConferenceModal
                isOpen={conferenceModalOpen}
                onClose={() => setConferenceModalOpen(false)}
                order={selectedOrderToConference}
                onConfirm={confirmConference}
            />
        </Modal>
    );
};
