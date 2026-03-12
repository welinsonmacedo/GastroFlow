
import React, { useState } from 'react';
import { useInventory } from '@/core/context/InventoryContext';
import { useOrder } from '@/core/context/OrderContext';
import { useFinance } from '@/core/context/FinanceContext';
import { useUI } from '@/core/context/UIContext';
import { InventoryItem } from '@/types';
import { Search, Plus, AlertTriangle, ShoppingCart, Trash2, Package } from 'lucide-react';
import { AddToCartModal } from '../modals/AddToCartModal';
import { Modal } from '../Modal';
import { Button } from '../Button';

interface CashierPOSViewProps {
    cart: { item: InventoryItem; quantity: number; notes: string; extras: InventoryItem[] }[];
    setCart: React.Dispatch<React.SetStateAction<{ item: InventoryItem; quantity: number; notes: string; extras: InventoryItem[] }[]>>;
}

export const CashierPOSView: React.FC<CashierPOSViewProps> = ({ cart, setCart }) => {
    const { state: invState } = useInventory();
    const { dispatch: orderDispatch } = useOrder();
    const { state: finState, refreshTransactions } = useFinance();
    const { showAlert } = useUI();

    const [search, setSearch] = useState('');
    const [customerName, setCustomerName] = useState('');
    

    // Modal Item
    const [itemModalOpen, setItemModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

    // Modal Pagamento Dinheiro (Troco)
    const [cashModalOpen, setCashModalOpen] = useState(false);
    const [cashReceived, setCashReceived] = useState('');

    const handleAddToCart = (data: { quantity: number; notes: string; extras: InventoryItem[] }) => {
        if (selectedItem) {
            setCart([...cart, { item: selectedItem, ...data }]);
        }
    };

    const cartTotal = cart.reduce((acc, cartItem) => {
        const itemTotal = cartItem.item.salePrice + cartItem.extras.reduce((sum, ex) => sum + ex.salePrice, 0);
        return acc + (itemTotal * cartItem.quantity);
    }, 0);

    const handleSale = async (method: 'CASH' | 'CREDIT' | 'DEBIT' | 'PIX') => {
        if (!finState.activeCashSession) return showAlert({ title: "Caixa Fechado", message: "Abra o caixa.", type: 'ERROR' });
        if (cart.length === 0) return showAlert({ title: "Carrinho Vazio", message: "Adicione produtos.", type: 'WARNING' });
        
        if (method === 'CASH') {
            setCashReceived('');
            setCashModalOpen(true);
            return;
        }
        await finalizeSale(method);
    };

    const finalizeSale = async (method: string) => {
        try {
            const itemsPayload: any[] = [];
            cart.forEach(cartItem => {
                itemsPayload.push({ 
                    inventoryItemId: cartItem.item.id, 
                    quantity: cartItem.quantity, 
                    notes: cartItem.notes,
                    type: cartItem.item.type === 'RESALE' ? 'BAR' : 'KITCHEN'
                });
                cartItem.extras.forEach(extra => itemsPayload.push({ 
                    inventoryItemId: extra.id, 
                    quantity: cartItem.quantity, 
                    notes: `[ADICIONAL] para ${cartItem.item.name}`,
                    type: extra.type === 'RESALE' ? 'BAR' : 'KITCHEN'
                }));
            });
            await orderDispatch({ type: 'PROCESS_POS_SALE', sale: { customerName: customerName.trim() || 'Consumidor Final', items: itemsPayload, totalAmount: cartTotal, method } });
            setCart([]); setCustomerName(''); setCashModalOpen(false);
            showAlert({ title: "Venda Registrada", message: `Venda de R$ ${cartTotal.toFixed(2)} realizada!`, type: 'SUCCESS' });
            await refreshTransactions();
        } catch (error: any) { showAlert({ title: "Erro na Venda", message: "Não foi possível salvar.", type: 'ERROR' }); }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-4 h-full overflow-hidden">
            {/* Coluna da Esquerda: Busca e Grid */}
            <div className="lg:w-2/3 flex flex-col gap-4 h-full overflow-hidden animate-fade-in">
                <div className="relative shrink-0 group">
                    <Search className="absolute left-6 top-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={22}/>
                    <input 
                      className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 border-transparent bg-white shadow-sm focus:shadow-lg focus:border-blue-500 outline-none transition-all font-bold text-lg" 
                      placeholder="Buscar produto..." 
                      value={search} 
                      onChange={e => setSearch(e.target.value)} 
                      autoFocus 
                    />
                </div>
                <div className="overflow-y-auto flex-1 content-start p-1 custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-20">
                        {invState.inventory.filter(item => item.type !== 'INGREDIENT' && !item.isExtra && item.name.toLowerCase().includes(search.toLowerCase())).map(item => (
                            <button 
                              key={item.id} 
                              onClick={() => { setSelectedItem(item); setItemModalOpen(true); }} 
                              className="bg-white p-4 rounded-3xl shadow-sm border border-transparent hover:border-blue-300 hover:shadow-lg transition-all active:scale-95 flex flex-col justify-between h-36 group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-100 transition-opacity"><Plus size={20} className="text-blue-600"/></div>
                                <div className="text-left w-full">
                                    <div className="font-black text-slate-800 text-sm leading-tight line-clamp-2">{item.name}</div>
                                    <span className={`text-[9px] font-black uppercase tracking-widest mt-1 inline-block px-1.5 py-0.5 rounded ${item.type === 'COMPOSITE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{item.type === 'COMPOSITE' ? 'Prato' : 'Revenda'}</span>
                                </div>
                                <div className="flex justify-between items-end w-full">
                                    <div className="font-black text-lg text-slate-900">R$ {item.salePrice.toFixed(2)}</div>
                                    {item.type !== 'COMPOSITE' && item.quantity <= item.minQuantity && <div className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded flex items-center gap-1"><AlertTriangle size={10} /> {item.quantity}</div>}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Coluna da Direita: Carrinho */}
            <div className="lg:w-1/3 bg-white rounded-[2rem] shadow-2xl border border-gray-200 flex flex-col h-full overflow-hidden animate-fade-in relative z-20">
                <div className="p-3 bg-slate-900 text-white shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className="bg-slate-800 p-1.5 rounded-lg"><ShoppingCart size={16} className="text-blue-400"/></div><div><h3 className="font-black text-sm uppercase tracking-tighter leading-none">Carrinho</h3><p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{cart.length} Itens</p></div></div>
                    <button onClick={() => setCart([])} className="text-[10px] font-bold text-red-400 hover:text-white transition-colors bg-slate-800 px-2 py-1 rounded-md">Limpar</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gray-50">
                    {cart.map((cartItem, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-2xl relative group border border-gray-100 shadow-sm flex gap-3 items-center">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 text-sm">{cartItem.quantity}x</div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-slate-800 uppercase truncate leading-tight">{cartItem.item.name}</div>
                                <div className="text-xs font-black text-blue-600">R$ {((cartItem.item.salePrice + cartItem.extras.reduce((s,e)=>s+e.salePrice,0)) * cartItem.quantity).toFixed(2)}</div>
                                {cartItem.extras.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{cartItem.extras.map(e => <span key={e.id} className="text-[9px] bg-orange-50 text-orange-700 px-1.5 rounded border border-orange-100 font-bold">+ {e.name}</span>)}</div>}
                            </div>
                            <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    {cart.length === 0 && <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-60 space-y-2"><Package size={48} strokeWidth={1.5} /><p className="font-bold uppercase text-xs">Caixa Livre</p></div>}
                </div>

                <div className="p-4 bg-white border-t border-gray-100 shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-20">
                    <div className="flex justify-between items-end mb-3"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total a Pagar</span><span className="text-3xl font-black text-slate-800 tracking-tighter leading-none">R$ {cartTotal.toFixed(2)}</span></div>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs font-bold mb-3 outline-none focus:border-blue-500 focus:bg-white transition-all" placeholder="Nome do Cliente (Opcional)" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                    <div className="grid grid-cols-4 gap-1">
                        <button onClick={() => handleSale('CASH')} className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-black text-[9px] uppercase active:scale-95 transition-all flex flex-col items-center justify-center">Dinheiro</button>
                        <button onClick={() => handleSale('PIX')} className="py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-black text-[9px] uppercase active:scale-95 transition-all flex flex-col items-center justify-center">PIX</button>
                        <button onClick={() => handleSale('DEBIT')} className="py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-black text-[9px] uppercase active:scale-95 transition-all flex flex-col items-center justify-center">Débito</button>
                        <button onClick={() => handleSale('CREDIT')} className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-black text-[9px] uppercase active:scale-95 transition-all flex flex-col items-center justify-center">Crédito</button>
                    </div>
                </div>
            </div>

            <AddToCartModal 
                isOpen={itemModalOpen} 
                onClose={() => setItemModalOpen(false)} 
                item={selectedItem} 
                onConfirm={handleAddToCart} 
            />

            <Modal isOpen={cashModalOpen} onClose={() => setCashModalOpen(false)} title="Recebimento em Dinheiro" variant="dialog" maxWidth="sm">
                <div className="space-y-6">
                    <div className="text-center"><p className="text-sm font-bold text-gray-500 uppercase">Valor Total</p><p className="text-4xl font-black text-slate-800">R$ {cartTotal.toFixed(2)}</p></div>
                    <div><label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Valor Recebido</label><input type="number" step="0.01" autoFocus className="w-full border-2 p-5 rounded-2xl focus:border-emerald-500 outline-none text-center font-black text-3xl shadow-inner bg-emerald-50/30 text-emerald-700" placeholder="0.00" value={cashReceived} onChange={e => setCashReceived(e.target.value)} /></div>
                    {parseFloat(cashReceived) >= cartTotal && <div className="bg-emerald-100 p-4 rounded-2xl text-center border border-emerald-200"><p className="text-sm font-bold text-emerald-700 uppercase">Troco a Devolver</p><p className="text-3xl font-black text-emerald-800">R$ {(parseFloat(cashReceived) - cartTotal).toFixed(2)}</p></div>}
                    <Button onClick={() => finalizeSale('CASH')} disabled={!cashReceived || parseFloat(cashReceived) < cartTotal} className="w-full py-5 text-xl font-black rounded-2xl shadow-xl">CONFIRMAR RECEBIMENTO</Button>
                </div>
            </Modal>
        </div>
    );
};
