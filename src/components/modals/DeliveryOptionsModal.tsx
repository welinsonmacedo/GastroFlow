
import React, { useState, useEffect } from 'react';
import { useRestaurant } from '@/core/context/RestaurantContext';
import { useOrder } from '@/core/context/OrderContext';
import { useUI } from '@/core/context/UIContext';
import { DeliveryInfo, DeliveryMethodConfig, InventoryItem } from '@/types';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { User, Printer, Loader2 } from 'lucide-react';
import { printHtml, getReceiptStyles } from '@/core/print/printHelper';

interface DeliveryOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    cart: { item: InventoryItem; quantity: number; notes: string; extras: InventoryItem[] }[];
    onSuccess: () => void;
}

export const DeliveryOptionsModal: React.FC<DeliveryOptionsModalProps> = ({ isOpen, onClose, cart, onSuccess }) => {
    const { state: restState } = useRestaurant();
    const { dispatch: orderDispatch } = useOrder();
    const { showAlert } = useUI();

    const configuredPaymentMethods = restState.businessInfo?.paymentMethods?.filter(pm => pm.isActive) || [];
    const deliveryMethods = restState.businessInfo?.deliverySettings?.filter(m => m.isActive) || [];

    const [form, setForm] = useState<DeliveryInfo>({ 
        customerName: '', phone: '', address: '', platform: 'PHONE', methodId: '', deliveryFee: 0, changeFor: 0, paymentMethod: '', paymentStatus: 'PENDING' 
    });
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (configuredPaymentMethods.length > 0 && !form.paymentMethod) {
            setForm(prev => ({ ...prev, paymentMethod: configuredPaymentMethods[0].name }));
        }
    }, [configuredPaymentMethods]);

    const selectDeliveryMethod = (method: DeliveryMethodConfig) => {
        let fee = 0;
        if (method.feeBehavior === 'ADD_TO_TOTAL' && method.feeType === 'FIXED') {
            fee = method.feeValue;
        }
        setForm(prev => ({ ...prev, methodId: method.id, platform: method.name, deliveryFee: fee }));
    };

    const isCash = () => {
        const method = configuredPaymentMethods.find(pm => pm.name === form.paymentMethod);
        return method?.type === 'CASH';
    };

    const calculateTotal = () => {
        const subtotal = cart.reduce((acc, i) => acc + ((i.item.salePrice + i.extras.reduce((s,e)=>s+e.salePrice,0)) * i.quantity), 0);
        return subtotal + (form.deliveryFee || 0);
    };

    const handleSubmit = async () => {
        if (cart.length === 0) return showAlert({ title: "Carrinho Vazio", message: "Adicione itens.", type: 'WARNING' });
        if (!form.customerName) return showAlert({ title: "Dados Incompletos", message: "Informe o cliente.", type: 'WARNING' });
        if (!form.methodId) return showAlert({ title: "Método de Entrega", message: "Selecione como será a entrega.", type: 'WARNING' });

        setProcessing(true);
        try {
            const itemsPayload = cart.map(cartItem => {
                return [
                    { 
                        inventoryItemId: cartItem.item.id, 
                        quantity: cartItem.quantity, 
                        notes: cartItem.notes, 
                        salePrice: cartItem.item.salePrice,
                        name: cartItem.item.name,
                        type: cartItem.item.type === 'RESALE' ? 'BAR' : 'KITCHEN'
                    },
                    ...cartItem.extras.map(ex => ({
                        inventoryItemId: ex.id,
                        quantity: cartItem.quantity,
                        notes: `[ADICIONAL] p/ ${cartItem.item.name}`,
                        salePrice: ex.salePrice,
                        name: ex.name,
                        type: ex.type === 'RESALE' ? 'BAR' : 'KITCHEN'
                    }))
                ];
            }).flat();

            await orderDispatch({ 
                type: 'PLACE_ORDER', 
                orderType: 'DELIVERY', 
                items: itemsPayload, 
                deliveryInfo: form 
            });

            onSuccess();
            if (typeof onClose === 'function') onClose();
            showAlert({ title: "Sucesso", message: "Pedido enviado!", type: 'SUCCESS' });
        } catch (error) {
            showAlert({ title: "Erro", message: "Falha ao criar pedido.", type: 'ERROR' });
        } finally {
            setProcessing(false);
        }
    };

    const handlePrint = () => {
        const subtotal = cart.reduce((acc, i) => acc + ((i.item.salePrice + i.extras.reduce((s,e)=>s+e.salePrice,0)) * i.quantity), 0);
        const total = subtotal + (form.deliveryFee || 0);
        
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
                </div>
                <div style="margin-bottom: 15px; font-size: 13px;">
                    <strong>Cliente:</strong> ${form.customerName}<br/>
                    <strong>Telefone:</strong> ${form.phone || '-'}<br/>
                    <strong>Endereço:</strong> ${form.address || 'Retirada'}<br/>
                    <strong>Método:</strong> ${form.platform} (${form.paymentMethod})
                </div>
                <div style="border-bottom: 1px dashed #000; margin-bottom: 10px;"></div>
                ${cart.map(i => `
                    <div class="item-row">
                        <span>${i.quantity}x ${i.item.name}</span>
                        <span>${(i.item.salePrice * i.quantity).toFixed(2)}</span>
                    </div>
                    ${i.extras.map(e => `<div class="extras">+ ${e.name} (${e.salePrice.toFixed(2)})</div>`).join('')}
                    ${i.notes ? `<div class="note">${i.notes}</div>` : ''}
                `).join('')}
                <div class="total">
                    <div style="font-size: 12px; font-weight: normal;">Subtotal: ${subtotal.toFixed(2)}</div>
                    <div style="font-size: 12px; font-weight: normal;">Taxa: ${form.deliveryFee.toFixed(2)}</div>
                    <div style="margin-top: 5px;">TOTAL: R$ ${total.toFixed(2)}</div>
                    ${isCash() && form.changeFor ? `<div style="font-size: 12px;">Troco para: ${form.changeFor.toFixed(2)}</div>` : ''}
                </div>
                <div class="footer">
                    ${new Date().toLocaleString()}
                </div>
            </body>
            </html>
        `;
        printHtml(html);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Configurar Delivery" maxWidth="md">
            <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <h3 className="font-black text-slate-700 uppercase tracking-tight mb-4 flex items-center gap-2 text-sm"><User size={16}/> Dados do Cliente</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                            <input className="w-full border-2 border-gray-100 p-3 rounded-xl bg-white text-sm font-bold focus:border-blue-500 outline-none transition-all" placeholder="Ex: João Silva" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                            <input className="w-full border-2 border-gray-100 p-3 rounded-xl bg-white text-sm font-bold focus:border-blue-500 outline-none transition-all" placeholder="(00) 00000-0000" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Endereço de Entrega</label>
                            <input className="w-full border-2 border-gray-100 p-3 rounded-xl bg-white text-sm font-bold focus:border-blue-500 outline-none transition-all" placeholder="Rua, Número, Bairro, Complemento" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <h3 className="font-black text-slate-700 uppercase tracking-tight mb-4 text-sm">Método de Entrega</h3>
                    <div className="flex flex-wrap gap-2">
                        {deliveryMethods.map(m => (
                            <button 
                                key={m.id} 
                                onClick={() => selectDeliveryMethod(m)} 
                                className={`px-4 py-2 rounded-xl text-xs font-black border-2 uppercase transition-all ${form.methodId === m.id ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}
                            >
                                {m.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <h3 className="font-black text-slate-700 uppercase tracking-tight mb-4 text-sm">Pagamento e Taxas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Taxa de Entrega</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-400 font-bold text-sm">R$</span>
                                <input type="number" step="0.01" className="w-full border-2 border-gray-100 pl-10 pr-3 py-3 rounded-xl bg-white text-sm font-bold focus:border-blue-500 outline-none transition-all" value={form.deliveryFee} onChange={e => setForm({...form, deliveryFee: parseFloat(e.target.value) || 0})} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Forma de Pagamento</label>
                            <select className="w-full border-2 border-gray-100 p-3 rounded-xl bg-white text-sm font-bold focus:border-blue-500 outline-none transition-all" value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})}>
                                <option value="">Selecione...</option>
                                {configuredPaymentMethods.map(pm => <option key={pm.id} value={pm.name}>{pm.name}</option>)}
                            </select>
                        </div>
                        {isCash() && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Troco para quanto?</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-gray-400 font-bold text-sm">R$</span>
                                    <input type="number" step="0.01" className="w-full border-2 border-gray-100 pl-10 pr-3 py-3 rounded-xl bg-white text-sm font-bold focus:border-blue-500 outline-none transition-all" placeholder="0.00" value={form.changeFor || ''} onChange={e => setForm({...form, changeFor: parseFloat(e.target.value) || 0})} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total do Pedido</p>
                        <p className="text-3xl font-black text-slate-800 tracking-tighter leading-none">R$ {calculateTotal().toFixed(2)}</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={handlePrint} disabled={cart.length === 0} className="rounded-2xl h-14 w-14 p-0 flex items-center justify-center border-2 border-gray-100 hover:bg-gray-50">
                            <Printer size={24} className="text-gray-400"/>
                        </Button>
                        <Button onClick={handleSubmit} disabled={processing} className="h-14 px-10 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest shadow-xl shadow-orange-600/20 active:scale-95 transition-all">
                            {processing ? <Loader2 className="animate-spin"/> : 'FINALIZAR E ENVIAR'}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
