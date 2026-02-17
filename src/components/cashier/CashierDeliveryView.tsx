
import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useOrder } from '../../context/OrderContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { InventoryItem, DeliveryInfo, DeliveryMethodConfig, OrderStatus } from '../../types';
import { Button } from '../Button';
import { Bike, Search, MapPin, CheckCircle, Printer } from 'lucide-react';

export const CashierDeliveryView: React.FC = () => {
    const { state: restState } = useRestaurant();
    const { state: invState } = useInventory(); 
    const { state: orderState, dispatch: orderDispatch } = useOrder();
    const { showAlert, showConfirm } = useUI();

    const [deliveryCart, setDeliveryCart] = useState<{ item: InventoryItem; quantity: number; notes: string; extras: InventoryItem[] }[]>([]);
    const [deliveryForm, setDeliveryForm] = useState<DeliveryInfo>({ 
        customerName: '', phone: '', address: '', platform: 'PHONE', methodId: '', deliveryFee: 0, changeFor: 0, paymentMethod: 'CASH', paymentStatus: 'PENDING' 
    });
    const [deliverySearch, setDeliverySearch] = useState('');
    const [processingSale, setProcessingSale] = useState(false);

    const deliveryMethods = restState.businessInfo?.deliverySettings?.filter(m => m.isActive) || [];
    const activeDeliveryOrders = orderState.orders.filter(o => o.type === 'DELIVERY' && !o.isPaid && o.status !== 'CANCELLED');

    const calculateDeliveryTotal = () => {
        const subtotal = deliveryCart.reduce((acc, i) => acc + ((i.item.salePrice + i.extras.reduce((s,e)=>s+e.salePrice,0)) * i.quantity), 0);
        return subtotal + (deliveryForm.deliveryFee || 0);
    };
  
    const selectDeliveryMethod = (method: DeliveryMethodConfig) => {
        let fee = 0;
        if (method.feeBehavior === 'ADD_TO_TOTAL') {
            if (method.feeType === 'FIXED') fee = method.feeValue;
        }
        setDeliveryForm(prev => ({
            ...prev,
            methodId: method.id,
            platform: method.name,
            deliveryFee: fee
        }));
    };

    const handleDeliverySubmit = async () => {
        if (deliveryCart.length === 0) return showAlert({ title: "Carrinho Vazio", message: "Adicione itens ao pedido.", type: 'WARNING' });
        if (!deliveryForm.customerName) return showAlert({ title: "Dados Incompletos", message: "Informe o nome do cliente.", type: 'WARNING' });
        if (!deliveryForm.methodId) return showAlert({ title: "Método de Entrega", message: "Selecione como será a entrega.", type: 'WARNING' });
  
        setProcessingSale(true);
        try {
            const itemsPayload = deliveryCart.map(cartItem => {
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
                deliveryInfo: deliveryForm 
            });
  
            setDeliveryCart([]);
            setDeliveryForm({ customerName: '', phone: '', address: '', platform: 'PHONE', methodId: '', deliveryFee: 0, changeFor: 0, paymentMethod: 'CASH', paymentStatus: 'PENDING' });
            showAlert({ title: "Sucesso", message: "Pedido enviado para a cozinha!", type: 'SUCCESS' });
        } catch (error) {
            showAlert({ title: "Erro", message: "Falha ao criar pedido delivery.", type: 'ERROR' });
        } finally {
            setProcessingSale(false);
        }
    };

    const handleDispatchDelivery = async (orderId: string) => {
        const order = activeDeliveryOrders.find(o => o.id === orderId);
        if (!order) return;
        const total = order.items.reduce((acc, i) => acc + (i.productPrice * i.quantity), 0) + (order.deliveryInfo?.deliveryFee || 0);
        
        showConfirm({
            title: "Despachar e Finalizar?",
            message: `Confirma que o pedido saiu para entrega e o pagamento foi/será recebido? Total: R$ ${total.toFixed(2)}`,
            onConfirm: async () => {
                await orderDispatch({ 
                    type: 'PROCESS_PAYMENT', 
                    amount: total, 
                    method: 'CASH', 
                    orderId: order.id,
                    cashierName: 'Delivery'
                });
                showAlert({ title: "Despachado", message: "Pedido finalizado e arquivado.", type: 'SUCCESS' });
            }
        });
    };

    // Helper simples para adicionar item (a versão completa com extras exigiria modal complexo)
    const quickAddItem = (item: InventoryItem) => {
        setDeliveryCart([...deliveryCart, { item, quantity: 1, notes: '', extras: [] }]);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
            {/* Coluna Esquerda: Novo Pedido */}
            <div className="lg:w-1/2 flex flex-col gap-4 h-full overflow-hidden animate-fade-in">
                <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 shrink-0 overflow-y-auto custom-scrollbar">
                    <h3 className="font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2"><Bike size={20} className="text-orange-500"/> Novo Delivery</h3>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <input className="border p-2.5 rounded-xl bg-gray-50 text-sm" placeholder="Nome do Cliente" value={deliveryForm.customerName} onChange={e => setDeliveryForm({...deliveryForm, customerName: e.target.value})} />
                            <input className="border p-2.5 rounded-xl bg-gray-50 text-sm" placeholder="Telefone / WhatsApp" value={deliveryForm.phone} onChange={e => setDeliveryForm({...deliveryForm, phone: e.target.value})} />
                        </div>
                        <input className="w-full border p-2.5 rounded-xl bg-gray-50 text-sm" placeholder="Endereço Completo (Rua, Número, Bairro)" value={deliveryForm.address} onChange={e => setDeliveryForm({...deliveryForm, address: e.target.value})} />
                        
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Método de Entrega</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {deliveryMethods.map(m => (
                                    <button 
                                      key={m.id} 
                                      onClick={() => selectDeliveryMethod(m)} 
                                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 whitespace-nowrap 
                                      ${deliveryForm.methodId === m.id 
                                          ? 'bg-orange-500 text-white border-orange-500 shadow-md' 
                                          : (m.type === 'APP' ? 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')
                                      }`}
                                    >
                                        {m.name}
                                    </button>
                                ))}
                                {deliveryMethods.length === 0 && <span className="text-xs text-red-400 italic">Configure métodos em Admin.</span>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Taxa de Entrega</label>
                                <input type="number" className="w-full border p-2 rounded-lg text-sm" value={deliveryForm.deliveryFee} onChange={e => setDeliveryForm({...deliveryForm, deliveryFee: parseFloat(e.target.value)})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Forma Pagto</label>
                                <select className="w-full border p-2 rounded-lg text-sm bg-white" value={deliveryForm.paymentMethod} onChange={e => setDeliveryForm({...deliveryForm, paymentMethod: e.target.value as any})}>
                                    <option value="CASH">Dinheiro</option>
                                    <option value="CARD_MACHINE">Maquininha</option>
                                    <option value="ONLINE">Pago Online / App</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Status Pagto</label>
                                <select className="w-full border p-2 rounded-lg text-sm bg-white" value={deliveryForm.paymentStatus} onChange={e => setDeliveryForm({...deliveryForm, paymentStatus: e.target.value as any})}>
                                    <option value="PENDING">Cobrar na Entrega</option>
                                    <option value="PAID">Já Pago</option>
                                </select>
                            </div>
                            {deliveryForm.paymentMethod === 'CASH' && (
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Troco Para</label>
                                    <input type="number" className="w-full border p-2 rounded-lg text-sm" placeholder="R$ 0,00" value={deliveryForm.changeFor || ''} onChange={e => setDeliveryForm({...deliveryForm, changeFor: parseFloat(e.target.value)})} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-4 border-b">
                        <div className="relative group">
                            <Search className="absolute left-4 top-3 text-gray-400" size={18}/>
                            <input className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-gray-50 text-sm focus:bg-white focus:border-blue-500 outline-none" placeholder="Adicionar produtos..." value={deliverySearch} onChange={e => setDeliverySearch(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-3 content-start custom-scrollbar">
                        {invState.inventory.filter(i => 
                            !i.isExtra && 
                            i.type !== 'INGREDIENT' && 
                            i.name.toLowerCase().includes(deliverySearch.toLowerCase())
                        ).map(item => (
                            <button key={item.id} onClick={() => quickAddItem(item)} className="bg-gray-50 p-3 rounded-xl border border-transparent hover:border-blue-300 hover:shadow-md transition-all text-left">
                                <div className="font-bold text-slate-800 text-xs truncate">{item.name}</div>
                                <div className="text-blue-600 font-black text-sm mt-1">R$ {item.salePrice.toFixed(2)}</div>
                            </button>
                        ))}
                    </div>
                    
                    <div className="p-4 bg-slate-50 border-t">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-gray-500 uppercase">{deliveryCart.length} Itens</span>
                            <span className="text-xl font-black text-slate-800">R$ {calculateDeliveryTotal().toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => showAlert({title: "Imprimir", message: "Enviado para impressora.", type: 'INFO'})} disabled={deliveryCart.length === 0} className="w-14 bg-white border border-gray-200" title="Imprimir Conferência"><Printer size={18}/></Button>
                            <Button onClick={handleDeliverySubmit} disabled={processingSale} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white shadow-orange-200">
                                {processingSale ? 'Enviando...' : 'Enviar para Cozinha'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Coluna Direita: Monitor */}
            <div className="lg:w-1/2 bg-slate-100 p-4 rounded-[2rem] border border-slate-200 overflow-hidden flex flex-col">
                <h3 className="font-black text-slate-700 uppercase tracking-tight mb-4 ml-2">Monitor de Entregas</h3>
                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                    {activeDeliveryOrders.length === 0 && (
                        <div className="text-center py-20 text-gray-400">
                            <Bike size={48} className="mx-auto mb-2 opacity-20"/>
                            <p className="text-xs font-bold uppercase">Nenhum pedido ativo</p>
                        </div>
                    )}
                    {activeDeliveryOrders.map(order => {
                        const total = order.items.reduce((acc, i) => acc + (i.productPrice * i.quantity), 0);
                        const kitchenItems = order.items.filter(i => i.productType === 'KITCHEN');
                        const isReady = kitchenItems.length === 0 || kitchenItems.every(i => i.status === OrderStatus.READY);

                        return (
                            <div key={order.id} className={`bg-white p-4 rounded-2xl shadow-sm border-l-4 transition-all ${isReady ? 'border-l-emerald-500' : 'border-l-orange-400'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-slate-800">{order.deliveryInfo?.customerName}</h4>
                                        <div className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-2 mt-1">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded">{order.deliveryInfo?.platform}</span>
                                            <span>#{order.id.slice(0,4)}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-slate-800">R$ {total.toFixed(2)}</div>
                                        <div className={`text-[9px] font-black uppercase px-2 py-0.5 rounded mt-1 inline-block ${isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {isReady ? 'Pronto p/ Entrega' : 'Preparando'}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 mb-3 flex items-start gap-1">
                                    <MapPin size={12} className="shrink-0 mt-0.5"/>
                                    <span className="truncate">{order.deliveryInfo?.address || 'Retirada'}</span>
                                </div>
                                {isReady && (
                                    <button onClick={() => handleDispatchDelivery(order.id)} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2">
                                        <CheckCircle size={14}/> Despachar / Finalizar
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
