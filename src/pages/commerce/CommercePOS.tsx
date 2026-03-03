import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useOrder } from '../../context/OrderContext';
import { useFinance } from '../../context/FinanceContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthProvider';
import { InventoryItem } from '../../types';
import { 
    ShoppingCart, Trash2, Package, Banknote, Zap, CreditCard, 
    ScanLine, Plus, Minus, Lock, Wallet, LogOut, Loader2, ArrowDown, AlertTriangle
} from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { CloseRegisterModal } from '../../components/modals/CloseRegisterModal';
import { CashBleedModal } from '../../components/modals/CashBleedModal';

// Custom hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export const CommercePOS: React.FC = () => {
    const { state: invState } = useInventory();
    const { dispatch: orderDispatch } = useOrder();
    const { state: finState, refreshTransactions, openRegister } = useFinance();
    const { state: authState, logout } = useAuth();
    const { state: restState } = useRestaurant();
    const { showAlert, showConfirm, closeAlert } = useUI();

    const [cart, setCart] = useState<{ item: InventoryItem; quantity: number; notes: string; extras: InventoryItem[] }[]>([]);
    const [customerName, setCustomerName] = useState('');
    
    const [searchInput, setSearchInput] = useState('');
    const debouncedSearchTerm = useDebounce(searchInput, 250);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [cashReceived, setCashReceived] = useState('');

    const [openRegisterAmount, setOpenRegisterAmount] = useState('');
    const [openingLoading, setOpeningLoading] = useState(false);
    const [closeModalOpen, setCloseModalOpen] = useState(false);
    const [bleedModalOpen, setBleedModalOpen] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const focusInput = (e: MouseEvent) => {
            if (searchRef.current && searchRef.current.contains(e.target as Node)) return;
            if (!paymentModalOpen && !closeModalOpen && !bleedModalOpen && inputRef.current) {
                inputRef.current.focus();
            }
        };
        window.addEventListener('click', focusInput);
        return () => window.removeEventListener('click', focusInput);
    }, [paymentModalOpen, closeModalOpen, bleedModalOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (paymentModalOpen || closeModalOpen || bleedModalOpen) return;
            if (e.key === 'F2') { e.preventDefault(); if (cart.length > 0) setPaymentModalOpen(true); }
            if (e.key === 'F9') { e.preventDefault(); setCart([]); }
            if (e.key === 'Escape') { setShowSuggestions(false); }
            
            // Foca o input automaticamente se o usuário começar a digitar (ou usar leitor de código de barras)
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && document.activeElement !== inputRef.current) {
                inputRef.current?.focus();
                setSearchInput(prev => prev + e.key);
                closeAlert();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart, paymentModalOpen, closeModalOpen, bleedModalOpen]);

    const parseSearchInput = (input: string) => {
        let qty = 1;
        let term = input.trim();
        const match = input.match(/^(\d+(\.\d+)?)([\*\/xX])(.+)/);
        if (match) {
            qty = parseFloat(match[1]);
            term = match[4].trim();
        }
        return { qty, term };
    };

    const filteredSuggestions = useMemo(() => {
        const { term } = parseSearchInput(debouncedSearchTerm);
        if (!term || term.length < 2) return [];
        return invState.inventory
            .filter(item => 
                item.type !== 'INGREDIENT' && 
                !item.isExtra && 
                (item.name.toLowerCase().includes(term.toLowerCase()) || item.barcode?.includes(term))
            )
            .slice(0, 8);
    }, [debouncedSearchTerm, invState.inventory]);

    const addToCart = useCallback((item: InventoryItem, quantity: number, notes: string = '', extras: InventoryItem[] = []) => {
        setCart(prev => {
            const isComplex = notes || extras.length > 0;
            if (!isComplex) {
                const existingIndex = prev.findIndex(i => i.item.id === item.id && !i.notes && i.extras.length === 0);
                if (existingIndex > -1) {
                    const newCart = [...prev];
                    newCart[existingIndex].quantity += quantity;
                    return newCart;
                }
            }
            return [...prev, { item, quantity, notes, extras }];
        });
    }, []);

    const updateCartQuantity = (index: number, newQuantity: number) => {
        setCart(prev => {
            if (newQuantity <= 0) {
                return prev.filter((_, i) => i !== index);
            }
            const newCart = [...prev];
            newCart[index].quantity = newQuantity;
            return newCart;
        });
    };

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const handleScan = (e: React.FormEvent) => {
        e.preventDefault();
        const { qty, term } = parseSearchInput(searchInput);
        if (!term) return;

        let item = invState.inventory.find(i => i.barcode === term);
        if (!item) item = invState.inventory.find(i => i.name.toLowerCase() === term.toLowerCase());
        if (!item && filteredSuggestions.length === 1) item = filteredSuggestions[0];

        if (item) {
            addToCart(item, qty);
            setSearchInput('');
            setShowSuggestions(false);
            closeAlert();
        } else {
            if (filteredSuggestions.length > 0) setShowSuggestions(true);
            else { 
                showAlert({ title: "Não encontrado", message: "Produto não localizado.", type: 'WARNING' }); 
                setSearchInput(''); 
                setTimeout(() => inputRef.current?.focus(), 10);
            }
        }
    };

    const handleSelectSuggestion = (item: InventoryItem) => {
        const { qty } = parseSearchInput(searchInput);
        addToCart(item, qty);
        setSearchInput('');
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    const cartTotal = cart.reduce((acc, i) => acc + (i.item.salePrice * i.quantity), 0);

    const handleSale = async (methodType: string, methodName: string) => {
        if (!finState.activeCashSession) return showAlert({ title: "Caixa Fechado", message: "Abra o caixa antes de vender.", type: 'ERROR' });
        if (cart.length === 0) return showAlert({ title: "Carrinho Vazio", message: "Adicione produtos.", type: 'WARNING' });
        if (methodType === 'CASH') { setCashReceived(''); setPaymentModalOpen(true); return; }
        await finalizeSale(methodName);
    };
    
    const finalizeSale = async (methodName: string) => {
        try {
            const itemsPayload = cart.map(cartItem => ({ inventoryItemId: cartItem.item.id, quantity: cartItem.quantity, notes: cartItem.notes }));
            await orderDispatch({ 
                type: 'PROCESS_POS_SALE', 
                sale: { 
                    customerName: customerName.trim() || 'Consumidor Final', 
                    items: itemsPayload, 
                    method: methodName,
                    cashierName: finState.activeCashSession?.operatorName || 'Operador'
                } 
            });
            setCart([]); setCustomerName(''); setPaymentModalOpen(false);
            showAlert({ title: "Venda Registrada", message: `Venda de R$ ${cartTotal.toFixed(2)} realizada!`, type: 'SUCCESS' });
            await refreshTransactions();
        } catch (error: any) { showAlert({ title: "Erro na Venda", message: error.message || "Não foi possível salvar.", type: 'ERROR' }); }
    };

    const handleOpenRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(openRegisterAmount);
        if (isNaN(amount) || amount < 0) return showAlert({ title: "Valor Inválido", message: "Informe um valor inicial válido.", type: 'WARNING' });
        setOpeningLoading(true);
        try {
            await openRegister(amount, authState.currentUser?.name || 'Operador');
            setOpenRegisterAmount('');
        } catch (error: any) { showAlert({ title: "Erro ao Abrir", message: error.message || "Falha ao abrir caixa.", type: 'ERROR' }); } finally { setOpeningLoading(false); }
    };

    const handleLogout = () => showConfirm({ title: "Sair do Caixa?", message: "Isso fará logout do sistema.", type: 'WARNING', confirmText: "Sair", onConfirm: logout });

    const getPaymentIcon = (type: string) => {
        switch (type) {
            case 'CASH': return <Banknote size={20} />;
            case 'PIX': return <Zap size={20} />;
            case 'CREDIT': case 'DEBIT': return <CreditCard size={20} />;
            default: return <Wallet size={20} />;
        }
    };

    const paymentMethods = restState.businessInfo?.paymentMethods?.filter(pm => pm.isActive) || [];

    if (!finState.activeCashSession) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-950 p-4 font-sans">
                <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center max-w-md w-full border border-white/10 relative">
                    <button onClick={handleLogout} className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition-colors"><LogOut size={24} /></button>
                    <div className="bg-indigo-50 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-8 shadow-inner"><Lock size={48} className="text-indigo-600" /></div>
                    <h2 className="text-3xl font-black mb-2 text-slate-800 uppercase tracking-tighter">Caixa Fechado</h2>
                    <p className="text-gray-400 mb-8 font-medium">Informe o fundo de troco para iniciar as vendas.</p>
                    <form onSubmit={handleOpenRegister}>
                        <div className="mb-8">
                            <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest">Saldo Inicial</label>
                            <div className="relative">
                                <span className="absolute left-4 top-5 font-black text-2xl text-gray-300">R$</span>
                                <input type="number" step="0.01" className="border-2 border-gray-100 p-6 rounded-3xl w-full text-center text-4xl font-black text-indigo-600 focus:outline-none focus:border-indigo-500 transition-all shadow-inner bg-gray-50" placeholder="0.00" value={openRegisterAmount} onChange={e => setOpenRegisterAmount(e.target.value)} autoFocus required disabled={openingLoading}/>
                            </div>
                        </div>
                        <Button type="submit" disabled={openingLoading} className="w-full py-5 text-xl font-black rounded-3xl shadow-2xl shadow-indigo-200 bg-indigo-600 hover:bg-indigo-700">{openingLoading ? <Loader2 className="animate-spin" /> : 'ABRIR CAIXA'}</Button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col lg:flex-row gap-4 h-full overflow-hidden">
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-200 shadow-sm shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold uppercase border border-emerald-200 flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Caixa Aberto</div>
                        <span className="text-xs font-bold text-gray-500">Op: {finState.activeCashSession.operatorName}</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setBleedModalOpen(true)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 border border-red-100 transition-colors"><ArrowDown size={14}/> Sangria</button>
                        <button onClick={() => setCloseModalOpen(true)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 shadow-sm transition-colors"><Lock size={14}/> Fechar Caixa</button>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100 flex gap-4 items-center shrink-0 z-50 relative" ref={searchRef}>
                    <div className="relative flex-1">
                        <ScanLine className="absolute left-4 top-3.5 text-indigo-500 animate-pulse" size={20}/>
                        <form onSubmit={handleScan}>
                            <input 
                                ref={inputRef}
                                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-indigo-100 focus:border-indigo-500 outline-none font-mono text-lg font-bold uppercase tracking-widest placeholder-indigo-300"
                                placeholder="Escanear ou Pesquisar..."
                                value={searchInput}
                                onChange={e => {
                                    setSearchInput(e.target.value);
                                    closeAlert(); // Fecha o modal de erro automaticamente ao começar a digitar/escanear novamente
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                autoFocus
                                autoComplete="off"
                            />
                        </form>
                        {showSuggestions && filteredSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50 animate-fade-in">
                                {filteredSuggestions.map((item, idx) => (
                                    <button key={item.id} onClick={() => handleSelectSuggestion(item)} className={`w-full text-left p-3 flex justify-between items-center hover:bg-indigo-50 transition-colors border-b last:border-0 border-gray-100 ${idx === 0 ? 'bg-indigo-50/50' : ''}`}>
                                        <div>
                                            <span className="font-bold text-slate-700 block">{item.name}</span>
                                            <span className="text-[10px] text-gray-400 font-mono">{item.barcode}</span>
                                        </div>
                                        <span className="font-black text-indigo-600">R$ {item.salePrice.toFixed(2)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 content-start p-1 custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-20">
                        {invState.inventory
                            .filter(item => item.type !== 'INGREDIENT' && !item.isExtra)
                            .slice(0, 20)
                            .map(item => (
                            <button key={item.id} onClick={() => addToCart(item, 1)} className="bg-white p-4 rounded-3xl shadow-sm border border-transparent hover:border-blue-300 hover:shadow-lg transition-all active:scale-95 flex flex-col justify-between h-36 group relative overflow-hidden">
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

            <div className="lg:w-1/3 bg-white rounded-[2rem] shadow-2xl border border-gray-200 flex flex-col h-full overflow-hidden animate-fade-in relative z-20 shrink-0">
                <div className="p-5 bg-slate-900 text-white shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-3"><div className="bg-slate-800 p-2 rounded-xl"><ShoppingCart size={20} className="text-blue-400"/></div><div><h3 className="font-black text-lg uppercase tracking-tighter leading-none">Carrinho</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{cart.length} Itens</p></div></div>
                    <button onClick={() => setCart([])} className="text-xs font-bold text-red-400 hover:text-white transition-colors bg-slate-800 px-3 py-1.5 rounded-lg">Limpar</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-gray-50">
                    {cart.map((cartItem, idx) => (
                        <div key={idx} className="bg-white p-2 rounded-xl shadow-sm flex gap-2 items-center border">
                            <div className="flex-1 min-w-0 pl-2">
                                <p className="text-sm font-bold text-slate-800 truncate">{cartItem.item.name}</p>
                                <p className="text-xs font-bold text-blue-600">R$ {(cartItem.item.salePrice * cartItem.quantity).toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                                <button onClick={() => updateCartQuantity(idx, cartItem.quantity - 1)} className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-100 rounded"><Minus size={14}/></button>
                                <input 
                                    type="number"
                                    value={cartItem.quantity}
                                    onChange={e => updateCartQuantity(idx, parseInt(e.target.value) || 1)}
                                    className="w-10 text-center font-bold bg-transparent outline-none text-slate-700"
                                />
                                <button onClick={() => updateCartQuantity(idx, cartItem.quantity + 1)} className="p-1.5 text-slate-500 hover:text-green-500 hover:bg-green-100 rounded"><Plus size={14}/></button>
                            </div>
                            <button onClick={() => removeFromCart(idx)} className="text-red-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    {cart.length === 0 && <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-60 space-y-2"><Package size={48} strokeWidth={1.5} /><p className="font-bold uppercase text-xs">Caixa Livre</p></div>}
                </div>

                <div className="p-5 bg-white border-t border-gray-100 shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-20">
                    <div className="flex justify-between items-end mb-4"><span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total a Pagar</span><span className="text-4xl font-black text-slate-800 tracking-tighter leading-none">R$ {cartTotal.toFixed(2)}</span></div>
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm font-bold mb-4 outline-none focus:border-blue-500 focus:bg-white transition-all" placeholder="Nome do Cliente (Opcional)" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                        {paymentMethods.map(pm => (
                             <button key={pm.id} onClick={() => handleSale(pm.type, pm.name)} className={`py-3 rounded-2xl font-black text-xs uppercase shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 ${pm.type === 'CASH' ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20' : pm.type === 'PIX' ? 'bg-slate-800 hover:bg-slate-700 text-white shadow-slate-900/20' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'}`}>
                                 {getPaymentIcon(pm.type)} {pm.name}
                             </button>
                        ))}
                        {paymentMethods.length === 0 && <div className="col-span-2 text-center text-xs text-gray-400 py-2 italic bg-gray-50 rounded-lg">Nenhuma forma de pagamento configurada.</div>}
                    </div>
                </div>
            </div>

            <Modal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Recebimento em Dinheiro" variant="dialog" maxWidth="sm">
                <div className="space-y-6">
                    <div className="text-center"><p className="text-sm font-bold text-gray-500 uppercase">Valor Total</p><p className="text-4xl font-black text-slate-800">R$ {cartTotal.toFixed(2)}</p></div>
                    <div><label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Valor Recebido</label><input type="number" step="0.01" autoFocus className="w-full border-2 p-5 rounded-2xl focus:border-emerald-500 outline-none text-center font-black text-3xl shadow-inner bg-emerald-50/30 text-emerald-700" placeholder="0.00" value={cashReceived} onChange={e => setCashReceived(e.target.value)} /></div>
                    {parseFloat(cashReceived) >= cartTotal && <div className="bg-emerald-100 p-4 rounded-2xl text-center border border-emerald-200"><p className="text-sm font-bold text-emerald-700 uppercase">Troco a Devolver</p><p className="text-3xl font-black text-emerald-800">R$ {(parseFloat(cashReceived) - cartTotal).toFixed(2)}</p></div>}
                    <Button onClick={() => finalizeSale('Dinheiro')} disabled={!cashReceived || parseFloat(cashReceived) < cartTotal} className="w-full py-5 text-xl font-black rounded-2xl shadow-xl">CONFIRMAR RECEBIMENTO</Button>
                </div>
            </Modal>

            {closeModalOpen && <CloseRegisterModal isOpen={closeModalOpen} onClose={() => setCloseModalOpen(false)} />} 
            {bleedModalOpen && <CashBleedModal isOpen={bleedModalOpen} onClose={() => setBleedModalOpen(false)} />}
        </div>
    );
};
