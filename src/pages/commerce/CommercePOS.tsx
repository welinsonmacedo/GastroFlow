import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useOrder } from '../../context/OrderContext';
import { useFinance } from '../../context/FinanceContext';
import { useUI } from '../../context/UIContext';
import { InventoryItem } from '../../types';
import { 
    Search, ShoppingCart, Trash2, Package, Banknote, Zap, CreditCard, 
    ScanLine, RefreshCcw, Plus, Minus, Keyboard, X, Lock
} from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';

// Estilo de PDV Rápido (Supermercado)
export const CommercePOS: React.FC = () => {
    const { state: invState } = useInventory();
    const { dispatch: orderDispatch } = useOrder();
    const { state: finState, refreshTransactions } = useFinance();
    const { showAlert } = useUI();

    const [cart, setCart] = useState<{ item: InventoryItem; quantity: number; notes: string; extras: InventoryItem[] }[]>([]);
    const [search, setSearch] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [processing, setProcessing] = useState(false);
    
    // Modal Pagamento
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [cashReceived, setCashReceived] = useState('');

    const inputRef = useRef<HTMLInputElement>(null);

    // Foca no input sempre que possível
    useEffect(() => {
        const focusInput = () => {
            if (!paymentModalOpen && inputRef.current) {
                inputRef.current.focus();
            }
        };
        focusInput();
        window.addEventListener('click', focusInput);
        return () => window.removeEventListener('click', focusInput);
    }, [paymentModalOpen]);

    // Atalhos de Teclado
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (paymentModalOpen) return;
            
            if (e.key === 'F2') {
                e.preventDefault();
                if (cart.length > 0) setPaymentModalOpen(true);
            }
            if (e.key === 'F9') {
                e.preventDefault();
                setCart([]);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart, paymentModalOpen]);

    const addToCart = (item: InventoryItem, qty: number = 1) => {
        setCart(prev => {
            const existing = prev.find(i => i.item.id === item.id);
            if (existing) {
                return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + qty } : i);
            }
            return [...prev, { item, quantity: qty }];
        });
    };

    const handleScan = (e: React.FormEvent) => {
        e.preventDefault();
        const code = barcodeInput.trim();
        if (!code) return;

        // 1. Tenta por Código de Barras
        let item = invState.inventory.find(i => i.barcode === code);
        
        // 2. Se não achar, tenta por ID interno (se for curto) ou Nome exato
        if (!item) {
             item = invState.inventory.find(i => i.name.toLowerCase() === code.toLowerCase());
        }

        if (item) {
            addToCart(item);
            setBarcodeInput('');
        } else {
            // Se for texto parcial, abre busca visual (poderia ser implementado)
            showAlert({ title: "Não encontrado", message: "Produto não localizado.", type: 'WARNING' });
            setBarcodeInput('');
        }
    };

    const cartTotal = cart.reduce((acc, i) => acc + (i.item.salePrice * i.quantity), 0);

    const handleSale = async (method: 'CASH' | 'CREDIT' | 'DEBIT' | 'PIX') => {
        if (!finState.activeCashSession) return showAlert({ title: "Caixa Fechado", message: "Abra o caixa antes de vender.", type: 'ERROR' });
        if (cart.length === 0) return showAlert({ title: "Carrinho Vazio", message: "Adicione produtos.", type: 'WARNING' });
        
        if (method === 'CASH') {
            setCashReceived('');
            setCashModalOpen(true);
            return;
        }
        
        setProcessing(true);
        try {
            const itemsPayload: any[] = [];
            cart.forEach(cartItem => {
                itemsPayload.push({ inventoryItemId: cartItem.item.id, quantity: cartItem.quantity, notes: cartItem.notes });
                cartItem.extras.forEach(extra => itemsPayload.push({ inventoryItemId: extra.id, quantity: cartItem.quantity, notes: `[ADICIONAL] para ${cartItem.item.name}` }));
            });
            await orderDispatch({ type: 'PROCESS_POS_SALE', sale: { customerName: customerName.trim() || 'Consumidor Final', items: itemsPayload, totalAmount: cartTotal, method } });
            setCart([]); setCustomerName(''); setCashModalOpen(false);
            showAlert({ title: "Venda Registrada", message: `Venda de R$ ${cartTotal.toFixed(2)} realizada!`, type: 'SUCCESS' });
            await refreshTransactions();
        } catch (error: any) { showAlert({ title: "Erro na Venda", message: "Não foi possível salvar.", type: 'ERROR' }); } finally { setProcessing(false); }
    };
    
    const finalizeSale = async (method: string) => {
        setProcessing(true);
        try {
            const itemsPayload: any[] = [];
            cart.forEach(cartItem => {
                itemsPayload.push({ inventoryItemId: cartItem.item.id, quantity: cartItem.quantity, notes: cartItem.notes });
                cartItem.extras.forEach(extra => itemsPayload.push({ inventoryItemId: extra.id, quantity: cartItem.quantity, notes: `[ADICIONAL] para ${cartItem.item.name}` }));
            });
            await orderDispatch({ type: 'PROCESS_POS_SALE', sale: { customerName: customerName.trim() || 'Consumidor Final', items: itemsPayload, totalAmount: cartTotal, method } });
            setCart([]); setCustomerName(''); setCashModalOpen(false);
            showAlert({ title: "Venda Registrada", message: `Venda de R$ ${cartTotal.toFixed(2)} realizada!`, type: 'SUCCESS' });
            await refreshTransactions();
        } catch (error: any) { showAlert({ title: "Erro na Venda", message: "Não foi possível salvar.", type: 'ERROR' }); } finally { setProcessing(false); }
    };

    const [barcodeInput, setBarcodeInput] = useState('');

    if (!finState.activeCashSession) {
        return (
            <div className="h-full flex items-center justify-center text-slate-500 flex-col gap-4">
                <div className="bg-red-100 p-6 rounded-full text-red-500"><Lock size={48} /></div>
                <h2 className="text-2xl font-bold">Caixa Fechado</h2>
                <p>Acesse o módulo Financeiro para abrir o turno.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col md:flex-row gap-4">
            {/* ESQUERDA: LISTA E BUSCA */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                {/* Search Bar (Scanner Input) */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100 flex gap-4 items-center">
                    <div className="relative flex-1">
                        <ScanLine className="absolute left-4 top-3.5 text-indigo-500 animate-pulse" size={20}/>
                        <form onSubmit={handleScan}>
                            <input 
                                ref={inputRef}
                                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-indigo-100 focus:border-indigo-500 outline-none font-mono text-lg font-bold uppercase tracking-widest placeholder-indigo-300"
                                placeholder="Escanear Código de Barras (ou digitar nome)..."
                                value={barcodeInput}
                                onChange={e => setBarcodeInput(e.target.value)}
                                autoFocus
                            />
                        </form>
                    </div>
                    <div className="hidden md:flex gap-2">
                         <div className="bg-gray-100 px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-500 flex flex-col items-center justify-center border">
                             <Keyboard size={14}/>
                             <span>F2 Pagar</span>
                         </div>
                         <div className="bg-gray-100 px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-500 flex flex-col items-center justify-center border">
                             <RefreshCcw size={14}/>
                             <span>F9 Limpar</span>
                         </div>
                    </div>
                </div>

                {/* Cart Grid */}
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="bg-slate-50 p-3 border-b flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <span className="w-16 text-center">Qtd</span>
                        <span className="flex-1">Produto</span>
                        <span className="w-24 text-right">Unit.</span>
                        <span className="w-24 text-right">Total</span>
                        <span className="w-10"></span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {cart.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                                <ShoppingCart size={64} strokeWidth={1}/>
                                <p className="text-xl font-bold uppercase tracking-widest">Caixa Livre</p>
                                <p className="text-sm">Aguardando leitura de produtos...</p>
                            </div>
                        )}
                        {cart.map((line, idx) => (
                            <div key={idx} className="flex items-center p-3 hover:bg-indigo-50 rounded-xl transition-colors border border-transparent hover:border-indigo-100 group">
                                <div className="w-16 flex items-center justify-center gap-2">
                                    <span className="font-mono font-black text-lg text-slate-700">{line.quantity}</span>
                                </div>
                                <div className="flex-1 px-2">
                                    <div className="font-bold text-slate-800 leading-tight">{line.item.name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">{line.item.barcode}</div>
                                </div>
                                <div className="w-24 text-right font-mono text-slate-500">R$ {line.item.salePrice.toFixed(2)}</div>
                                <div className="w-24 text-right font-mono font-black text-indigo-600">R$ {(line.item.salePrice * line.quantity).toFixed(2)}</div>
                                <div className="w-10 text-center">
                                    <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* DIREITA: TOTAIS E PAGAMENTO */}
            <div className="w-full md:w-[350px] bg-slate-900 text-white rounded-2xl p-6 flex flex-col justify-between shadow-2xl shrink-0">
                <div className="space-y-6">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Cliente (Opcional)</p>
                        <input 
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-indigo-500 outline-none"
                            placeholder="Nome ou CPF"
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                        />
                    </div>
                    
                    <div className="space-y-2 pt-4 border-t border-slate-700">
                         <div className="flex justify-between text-slate-400 text-sm">
                             <span>Itens</span>
                             <span>{cart.length}</span>
                         </div>
                         <div className="flex justify-between text-slate-400 text-sm">
                             <span>Subtotal</span>
                             <span>R$ {cartTotal.toFixed(2)}</span>
                         </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total a Pagar</p>
                        <div className="text-5xl font-black text-emerald-400 tracking-tighter">
                            <span className="text-2xl mr-1">R$</span>{cartTotal.toFixed(2)}
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => { if(cart.length > 0) setPaymentModalOpen(true) }}
                        disabled={cart.length === 0}
                        className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        <Banknote size={24} /> FINALIZAR (F2)
                    </button>
                </div>
            </div>

            {/* MODAL DE PAGAMENTO */}
            <Modal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Pagamento Rápido" variant="dialog" maxWidth="md">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Resumo */}
                    <div className="w-full md:w-1/3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center flex flex-col justify-center">
                        <p className="text-xs font-bold text-slate-500 uppercase">Total da Compra</p>
                        <p className="text-3xl font-black text-slate-800 my-2">R$ {cartTotal.toFixed(2)}</p>
                        <div className="h-px bg-slate-200 w-full my-2"></div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Troco</p>
                        <p className={`text-2xl font-black ${parseFloat(cashReceived) >= cartTotal ? 'text-emerald-600' : 'text-slate-300'}`}>
                            R$ {Math.max(0, (parseFloat(cashReceived) || 0) - cartTotal).toFixed(2)}
                        </p>
                    </div>

                    {/* Métodos */}
                    <div className="flex-1 space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Dinheiro (Recebido)</label>
                            <input 
                                type="number" 
                                autoFocus
                                className="w-full border-2 border-emerald-500 p-3 rounded-xl text-2xl font-bold text-emerald-700 outline-none"
                                placeholder="0.00"
                                value={cashReceived}
                                onChange={e => setCashReceived(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => handleSale('CASH')} disabled={parseFloat(cashReceived) < cartTotal} className="py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold uppercase shadow disabled:opacity-50 flex flex-col items-center">
                                <Banknote size={20} className="mb-1"/> DINHEIRO
                            </button>
                            <button onClick={() => handleSale('PIX')} className="py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold uppercase shadow flex flex-col items-center">
                                <Zap size={20} className="mb-1"/> PIX
                            </button>
                            <button onClick={() => handleSale('DEBIT')} className="py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold uppercase shadow flex flex-col items-center text-xs">
                                <CreditCard size={18} className="mb-1"/> Débito
                            </button>
                            <button onClick={() => handleSale('CREDIT')} className="py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase shadow flex flex-col items-center text-xs">
                                <CreditCard size={18} className="mb-1"/> Crédito
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};