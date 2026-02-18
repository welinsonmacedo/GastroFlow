
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// @ts-ignore
import { useParams } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import { useMenu } from '../context/MenuContext';
import { useOrder } from '../context/OrderContext';
import { useUI } from '../context/UIContext';
import { Button } from '../components/Button';
import { TableStatus, Product, Order } from '../types';
import { 
    ShoppingCart, ChefHat, Plus, Minus, X, Lock, 
    Receipt, Loader2, Bell, ArrowLeft, Search, Edit3, 
    Zap, Clock, Trash2, ArrowRight, 
    Activity, AlertCircle, RefreshCcw, Utensils
} from 'lucide-react';

const OrderGraceTimer: React.FC<{ order: Order; graceMinutes: number; onCancel: (id: string) => void }> = ({ order, graceMinutes, onCancel }) => {
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        const calc = () => {
            const now = new Date().getTime();
            const orderTime = new Date(order.timestamp).getTime();
            return Math.max(0, (graceMinutes * 60) - Math.floor((now - orderTime) / 1000));
        };
        setTimeLeft(calc());
        const i = setInterval(() => {
            const r = calc();
            setTimeLeft(r);
            if (r <= 0) clearInterval(i);
        }, 1000);
        return () => clearInterval(i);
    }, [order, graceMinutes]);

    if (timeLeft <= 0) return null;

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;

    return (
        <div className="bg-blue-600 p-5 rounded-[2rem] text-white mb-6 shadow-2xl animate-fade-in border-4 border-white/10">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-2xl animate-pulse">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none">Confirmando em</p>
                        <p className="text-2xl font-black font-mono leading-none mt-1">{mins}:{secs.toString().padStart(2, '0')}</p>
                    </div>
                </div>
                <button 
                    onClick={() => onCancel(order.id)} 
                    className="bg-white text-blue-600 px-5 py-2.5 rounded-2xl text-xs font-black uppercase shadow-lg active:scale-95 transition-all"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
};

export const ClientApp: React.FC = () => {
    const { tableId } = useParams<{ tableId: string }>();
    const { state } = useRestaurant();
    const { state: menuState } = useMenu();
    const { state: orderState, dispatch: orderDispatch, cancelOrder } = useOrder();
    const { showConfirm, showAlert } = useUI();

    const [cart, setCart] = useState<{ product: Product; quantity: number; notes: string; extras?: Product[] }[]>([]);
    const [view, setView] = useState<'MENU' | 'CART' | 'STATUS' | 'BILL'>('MENU');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [accessPin, setAccessPin] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [waiterCalled, setWaiterCalled] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [modalQuantity, setModalQuantity] = useState(1);
    const [modalNotes, setModalNotes] = useState('');
    const [drinkTiming, setDrinkTiming] = useState<'IMMEDIATE' | 'WITH_FOOD'>('IMMEDIATE');
    const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);

    const table = orderState.tables.find(t => t.id === tableId);
    const theme = state.theme;
    const graceMinutes = state.businessInfo?.orderGracePeriodMinutes || 0;
    const tableOrders = orderState.orders.filter(o => o.tableId === tableId && !o.isPaid && o.status !== 'CANCELLED');

    // Resetar estado do modal sempre que um produto for selecionado
    useEffect(() => {
        if (selectedProduct) {
            setModalQuantity(1);
            setModalNotes('');
            setDrinkTiming('IMMEDIATE');
            setSelectedExtraIds([]);
        }
    }, [selectedProduct]);

    // Lógica para organizar categorias
    const sortedCategories = useMemo(() => {
        const categories = Array.from(new Set(menuState.products
            .filter(p => p.isVisible && !p.isExtra)
            .map(p => p.category)
        ));

        return categories.sort((a, b) => {
            if (a === 'Bebidas') return 1; 
            if (b === 'Bebidas') return -1;
            return a.localeCompare(b);
        });
    }, [menuState.products]);

    // Helper para agrupar itens (Pais e Adicionais) nas telas de Status e Conta
    const groupItems = (items: any[]) => {
        const grouped: any[] = [];
        items.forEach(item => {
            const isExtra = item.notes?.includes('[ADICIONAL]');
            if (isExtra && grouped.length > 0) {
                if (!grouped[grouped.length - 1].extras) grouped[grouped.length - 1].extras = [];
                grouped[grouped.length - 1].extras.push(item);
            } else {
                grouped.push({ ...item, extras: [] });
            }
        });
        return grouped;
    };

    const handleManualRefresh = useCallback(() => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 800);
    }, []);

    const handleCallWaiter = () => {
        if (!table) return;
        orderDispatch({ type: 'CALL_WAITER', tableId: table.id });
        setWaiterCalled(true);
        showAlert({ 
            title: "Garçom Chamado", 
            message: "Sua solicitação foi enviada. Logo alguém virá lhe atender.", 
            type: 'SUCCESS' 
        });
    };

    const isDrinkProduct = (product: Product) => {
        return product.category === 'Bebidas' || product.type === 'BAR' || product.category.toLowerCase().includes('bebida');
    };

    const handleAddToCart = () => {
        if (!selectedProduct) return;
        
        let finalNote = modalNotes;
        // Lógica específica para bebidas
        if (isDrinkProduct(selectedProduct)) {
            const timingText = drinkTiming === 'IMMEDIATE' ? '[IMEDIATA]' : '[COM COMIDA]';
            finalNote = timingText; 
        }

        const chosenExtras = selectedExtraIds
            .map(id => menuState.products.find(p => p.id === id))
            .filter(Boolean) as Product[];

        setCart(prev => [
            ...prev, 
            { product: selectedProduct, quantity: modalQuantity, notes: finalNote.trim(), extras: chosenExtras }
        ]);
        setSelectedProduct(null);
    };

    const handleConfirmOrder = async () => {
        if (!tableId || cart.length === 0) return;
        const flattenedItems: any[] = [];
        cart.forEach(item => {
            flattenedItems.push({ productId: item.product.id, quantity: item.quantity, notes: item.notes });
            item.extras?.forEach(extra => {
                flattenedItems.push({ productId: extra.id, quantity: item.quantity, notes: `[ADICIONAL]` });
            });
        });
        // Isso cria um NOVO pedido (Order ID único) a cada envio. Não junta com os anteriores.
        await orderDispatch({ type: 'PLACE_ORDER', tableId, items: flattenedItems });
        setCart([]);
        setView('STATUS');
    };

    if (state.isLoading || menuState.isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400 font-sans">
                <Loader2 className="animate-spin mb-4 text-emerald-500" size={48} />
                <p className="font-black uppercase tracking-widest text-xs">Preparando Experiência...</p>
            </div>
        );
    }

    if (!table) {
        return (
            <div className="h-full flex items-center justify-center bg-red-50 p-10 text-center flex-col gap-4 text-red-600 font-sans">
                <AlertCircle size={64} />
                <h2 className="font-black text-2xl uppercase tracking-tighter">QR Code Inválido</h2>
                <p className="font-medium text-sm">Este código não pertence a uma mesa ativa.</p>
            </div>
        );
    }

    if (table.status !== TableStatus.OCCUPIED) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 font-sans" style={{ backgroundColor: theme.backgroundColor }}>
                <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center max-w-sm w-full border border-gray-100">
                    <div className="bg-blue-50 p-6 rounded-full inline-block mb-8 text-blue-600 shadow-inner">
                        <ChefHat size={64} strokeWidth={1.5} />
                    </div>
                    <h1 className="text-3xl font-black mb-2 text-slate-800 uppercase tracking-tighter">{theme.restaurantName}</h1>
                    <h2 className="text-xl font-bold text-blue-600 mb-8 tracking-tight">Mesa #{table.number}</h2>
                    <div className="bg-red-50 text-red-600 py-3 rounded-2xl font-black mb-8 animate-pulse border border-red-100 text-xs uppercase tracking-widest">Mesa Fechada</div>
                    <Button onClick={handleCallWaiter} className="w-full py-5 text-xl font-black rounded-3xl shadow-2xl shadow-blue-200">CHAMAR GARÇOM</Button>
                </div>
            </div>
        );
    }

    if (table.accessCode && !isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 font-sans" style={{ backgroundColor: theme.backgroundColor }}>
                <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl text-center max-w-sm w-full border border-gray-100">
                    <div className="bg-emerald-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <Lock size={40} className="text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-black mb-2 text-slate-800 uppercase tracking-tighter">Sua Mesa Digital</h2>
                    <p className="text-gray-400 text-xs mb-8 font-medium">Insira o código gerado pelo garçom para começar.</p>
                    <input 
                        type="tel" 
                        maxLength={4} 
                        className="text-center text-6xl tracking-[0.5em] w-full border-2 bg-gray-50 rounded-[2rem] py-6 mb-8 font-mono font-black text-blue-600 focus:border-blue-500 outline-none transition-all shadow-inner" 
                        value={accessPin} 
                        onChange={e => setAccessPin(e.target.value)} 
                        placeholder="0000" 
                    />
                    <Button 
                        onClick={() => table.accessCode === accessPin ? setIsAuthenticated(true) : showAlert({ title: "Código Incorreto", message: "O código digitado não confere.", type: 'ERROR' })} 
                        className="w-full py-5 text-xl font-black rounded-3xl shadow-xl shadow-emerald-200"
                    >
                        ACESSAR CARDÁPIO
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto pb-32 font-sans" style={{ backgroundColor: theme.backgroundColor, color: theme.fontColor }}>
            {/* HEADER */}
            <header className="bg-white/70 backdrop-blur-xl shadow-sm sticky top-0 z-40 border-b border-white/20">
                <div className="flex justify-between items-center p-4 max-w-2xl mx-auto">
                    <div>
                        {view !== 'MENU' ? (
                            <button onClick={() => setView('MENU')} className="flex items-center gap-3 text-slate-800 font-black uppercase tracking-tighter text-sm bg-gray-100/50 px-4 py-2 rounded-2xl active:scale-95 transition-all">
                                <ArrowLeft size={20} /> Voltar
                            </button>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="bg-white p-1 rounded-2xl shadow-md border border-gray-100 shrink-0">
                                    {theme.logoUrl ? <img src={theme.logoUrl} className="h-10 w-10 object-contain rounded-xl" /> : <ChefHat size={32} style={{ color: theme.primaryColor }} />}
                                </div>
                                <div>
                                    <h1 className="font-black text-xl leading-none uppercase tracking-tighter text-slate-800">{theme.restaurantName}</h1>
                                    <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-1">MESA #{table.number}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {/* Botão Chamar Garçom (Sino) no Header */}
                        <button 
                            onClick={handleCallWaiter} 
                            className={`p-3 rounded-2xl bg-gray-100 text-blue-600 hover:bg-blue-50 active:scale-90 transition-all ${waiterCalled ? 'animate-pulse bg-blue-100' : ''}`}
                            title="Chamar Garçom"
                        >
                            <Bell size={20} fill={waiterCalled ? "currentColor" : "none"} />
                        </button>

                        <button onClick={handleManualRefresh} className={`p-3 rounded-2xl bg-gray-100 text-slate-600 transition-all ${isRefreshing ? 'animate-spin' : 'active:scale-90'}`}>
                            <RefreshCcw size={20} />
                        </button>
                        <button onClick={() => setView('BILL')} className="p-3 rounded-2xl bg-gray-100 text-slate-600 hover:bg-gray-200 active:scale-90 transition-all">
                            <Receipt size={24} />
                        </button>
                        <button onClick={() => setView('CART')} className="relative p-3 rounded-2xl bg-slate-900 text-white shadow-xl shadow-slate-900/20 active:scale-90 transition-all">
                            <ShoppingCart size={24} />
                            {cart.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[10px] rounded-full w-6 h-6 flex items-center justify-center font-black border-4 border-white shadow-md">
                                    {cart.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <main className="p-4 max-w-2xl mx-auto min-h-[calc(100vh-160px)]">
                {view === 'MENU' && (
                    <div className="space-y-12 mt-4 animate-fade-in">
                        <div className="relative group">
                            <Search size={22} className="absolute left-5 top-4.5 text-gray-400 group-focus-within:text-emerald-500 transition-colors mt-0.5" />
                            <input 
                                className="w-full bg-white border-2 border-transparent shadow-xl p-5 pl-14 rounded-[2rem] text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all" 
                                placeholder="Qual será sua escolha hoje?..." 
                                value={searchQuery} 
                                onChange={e => setSearchQuery(e.target.value)} 
                            />
                        </div>

                        {sortedCategories.map(category => {
                            const items = menuState.products.filter(p => p.isVisible && !p.isExtra && p.category === category && p.name.toLowerCase().includes(searchQuery.toLowerCase()));
                            if (items.length === 0) return null;
                            const isGrid = theme.viewMode === 'GRID';
                            return (
                                <div key={category} className="space-y-6 animate-fade-in">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800 whitespace-nowrap">{category}</h2>
                                        <span className="h-[2px] flex-1 bg-gray-100 rounded-full"></span>
                                    </div>
                                    <div className={isGrid ? "grid grid-cols-2 gap-5" : "flex flex-col gap-6"}>
                                        {items.map(product => (
                                            <div 
                                                key={product.id} 
                                                onClick={() => setSelectedProduct(product)} 
                                                className={`bg-white rounded-[2.5rem] shadow-sm border border-gray-100 flex cursor-pointer hover:shadow-2xl transition-all active:scale-[0.98] group overflow-hidden ${isGrid ? 'flex-col' : 'flex-row p-4 gap-5'}`}
                                            >
                                                <div className={`relative shrink-0 overflow-hidden bg-gray-50 ${isGrid ? 'w-full h-48' : 'w-24 h-24 sm:w-32 sm:h-32 rounded-3xl'}`}>
                                                    <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={product.name} />
                                                    {/* Preço removido da foto */}
                                                </div>
                                                <div className={`flex-1 flex flex-col justify-between ${isGrid ? 'p-6' : ''}`}>
                                                    <div className="space-y-2">
                                                        <h3 className="font-black text-slate-800 leading-none text-xl group-hover:text-emerald-600 transition-colors uppercase tracking-tighter">{product.name}</h3>
                                                        {product.description && (
                                                            <p className="text-xs text-gray-500 font-medium leading-relaxed line-clamp-3">{product.description}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between items-end mt-4">
                                                        <span className="font-black text-2xl text-emerald-600 leading-none">R$ {product.price.toFixed(2)}</span>
                                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-200 transition-all hover:rotate-90" style={{ backgroundColor: theme.primaryColor }}>
                                                            <Plus size={28} strokeWidth={3} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {view === 'CART' && (
                    <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden animate-fade-in flex flex-col min-h-[70vh]">
                        <div className="bg-gray-50/80 backdrop-blur-md p-8 border-b flex justify-between items-center">
                            <div className="space-y-1">
                                <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Sua Cesta</h2>
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Itens Prontos para o Pedido</p>
                            </div>
                            <button onClick={() => setView('MENU')} className="bg-gray-200 text-slate-500 p-2 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all">
                                <X size={28} />
                            </button>
                        </div>
                        <div className="p-8 flex-1 space-y-6">
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-80 space-y-4">
                                    <div className="bg-gray-50 p-10 rounded-full">
                                        <ShoppingCart size={80} className="opacity-10" />
                                    </div>
                                    <p className="font-black text-gray-300 uppercase tracking-widest text-sm">Cesta Vazia</p>
                                    <Button onClick={() => setView('MENU')} variant="outline" className="rounded-2xl px-8 font-black uppercase text-xs">Acessar Cardápio</Button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {cart.map((item, idx) => (
                                        <div key={idx} className="bg-gray-50 p-6 rounded-[2rem] relative group border-2 border-transparent hover:border-emerald-200 transition-all">
                                            <button 
                                                onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))} 
                                                className="absolute -top-3 -right-3 bg-white text-red-500 p-2 rounded-full shadow-xl border border-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-black text-slate-800 text-xl tracking-tighter uppercase leading-tight">{item.quantity}x {item.product.name}</h4>
                                                <span className="font-black text-emerald-600 text-lg">R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                                            </div>
                                            {item.extras?.map(ex => (
                                                <div key={ex.id} className="text-[11px] font-black text-orange-600 uppercase flex items-center gap-1 pl-4 border-l-2 border-orange-200 mt-1">
                                                    <Plus size={12} /> {ex.name} (+R$ {ex.price.toFixed(2)})
                                                </div>
                                            ))}
                                            {item.notes && (
                                                <div className="mt-4 p-4 bg-white/50 rounded-2xl text-[11px] font-bold text-blue-600 border border-blue-100 flex items-start gap-2 italic">
                                                    <Edit3 size={14} className="shrink-0 opacity-50" /> "{item.notes}"
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {cart.length > 0 && (
                            <div className="bg-gray-50 p-10 border-t space-y-6 safe-area-bottom">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal Estimado</span>
                                    <span className="text-5xl font-black text-slate-800 tracking-tighter leading-none">
                                        R$ {cart.reduce((acc, i) => acc + ((i.product.price + (i.extras?.reduce((s, e) => s + e.price, 0) || 0)) * i.quantity), 0).toFixed(2)}
                                    </span>
                                </div>
                                <button 
                                    onClick={handleConfirmOrder} 
                                    className="w-full py-6 rounded-[2rem] text-white font-black text-2xl shadow-2xl shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-95 bg-emerald-600 uppercase tracking-widest flex items-center justify-center gap-4"
                                >
                                    Confirmar <ArrowRight size={28} strokeWidth={3} />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {view === 'BILL' && (
                    <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden animate-fade-in flex flex-col min-h-[70vh]">
                        <div className="bg-slate-900 p-10 text-white flex justify-between items-end">
                            <div className="space-y-1">
                                <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                                    <Receipt size={32} className="text-emerald-400" /> Sua Conta
                                </h2>
                                <p className="text-emerald-400/60 text-[10px] font-black uppercase tracking-widest">Mesa #{table.number} • {table.customerName}</p>
                            </div>
                        </div>
                        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                            <div className="space-y-4 mb-10">
                                {tableOrders.flatMap(o => groupItems(o.items)).map((item, idx) => (
                                    <div key={idx} className="border-b-2 border-dashed border-gray-50 pb-4">
                                        <div className="flex justify-between items-center">
                                            <div className="space-y-0.5">
                                                <p className="text-slate-800 font-black uppercase tracking-tighter text-sm">{item.quantity}x {item.productName}</p>
                                                {item.notes && <p className="text-[10px] text-gray-400 font-bold italic">{item.notes}</p>}
                                            </div>
                                            <span className="font-black text-slate-900 text-sm">R$ {(item.productPrice * item.quantity).toFixed(2)}</span>
                                        </div>
                                        {/* Adicionais agrupados */}
                                        {item.extras && item.extras.length > 0 && (
                                            <div className="mt-2 pl-3 border-l-2 border-orange-200 space-y-1">
                                                {item.extras.map((ex: any, i: number) => (
                                                    <div key={i} className="flex justify-between text-xs text-orange-600 font-bold">
                                                        <span>+ {ex.quantity}x {ex.productName}</span>
                                                        <span>R$ {(ex.productPrice * ex.quantity).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {tableOrders.length === 0 && (
                                    <div className="text-center py-20">
                                        <Receipt size={64} className="mx-auto mb-4 opacity-10" />
                                        <p className="font-black uppercase tracking-widest text-xs text-gray-300">Nenhum Consumo</p>
                                    </div>
                                )}
                            </div>
                            
                            {tableOrders.length > 0 && (
                                <div className="flex justify-between items-center text-4xl font-black border-t-4 border-slate-900 pt-8 mb-12">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Geral</span>
                                    <span className="text-emerald-600 tracking-tighter leading-none">
                                        R$ {tableOrders.reduce((acc, o) => acc + o.items.reduce((s, i) => s + (i.productPrice * i.quantity), 0), 0).toFixed(2)}
                                    </span>
                                </div>
                            )}

                            <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-[2rem] text-sm text-emerald-800 mb-8">
                                <p className="font-black text-lg mb-1 uppercase tracking-tighter">Deseja Fechar?</p>
                                <p className="font-bold opacity-70">Toque no botão abaixo e nosso garçom virá até sua mesa para processar o pagamento.</p>
                            </div>
                            <button 
                                onClick={handleCallWaiter} 
                                className="w-full py-6 rounded-[2rem] border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-black text-lg uppercase tracking-widest shadow-xl shadow-emerald-500/10 transition-all flex items-center justify-center gap-4"
                            >
                                <Bell size={28} className={waiterCalled ? "animate-ping" : ""} /> 
                                {waiterCalled ? 'Garçom Chamado' : 'Chamar Garçom'}
                            </button>
                        </div>
                    </div>
                )}

                {view === 'STATUS' && (
                    <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden animate-fade-in flex flex-col min-h-[70vh]">
                        <div className="bg-blue-600 p-10 text-white shrink-0">
                            <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                                <Clock size={32} /> Meus Pedidos
                            </h2>
                            <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mt-2">Acompanhe a Produção</p>
                        </div>
                        <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                            {tableOrders.length === 0 && (
                                <div className="text-center py-20">
                                    <Activity size={64} className="mx-auto mb-4 opacity-10" />
                                    <p className="font-black uppercase tracking-widest text-xs text-gray-300">Nenhum Pedido Ativo</p>
                                </div>
                            )}
                            {[...tableOrders].reverse().map(order => (
                                <div key={order.id} className="relative">
                                    <OrderGraceTimer 
                                        order={order} 
                                        graceMinutes={graceMinutes} 
                                        onCancel={(id) => showConfirm({ title: "Cancelar Pedido?", message: "Esta ação removerá o pedido da cozinha.", type: 'WARNING', onConfirm: () => cancelOrder(id) })} 
                                    />
                                    <div className="bg-gray-50 rounded-[2rem] p-6 border-2 border-transparent hover:border-blue-100 transition-all shadow-sm">
                                        <div className="flex justify-between text-[10px] font-black text-gray-400 mb-6 border-b border-gray-200 pb-3 uppercase tracking-widest">
                                            <span>ID #{order.id.slice(0, 6)}</span>
                                            <span>{order.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="space-y-6">
                                            {groupItems(order.items).map((item, idx) => (
                                                <div key={idx}>
                                                    <div className="flex justify-between items-center gap-4">
                                                        <div className="flex-1 min-w-0 pr-4">
                                                            <span className="text-slate-800 font-black uppercase tracking-tighter block truncate">{item.quantity}x {item.productName}</span>
                                                            {item.notes && <span className="text-[10px] text-gray-400 font-bold italic block truncate mt-1">"{item.notes}"</span>}
                                                        </div>
                                                        <span className={`text-[9px] px-3 py-1.5 rounded-xl font-black uppercase tracking-tighter shrink-0 border shadow-sm ${item.status === 'PENDING' ? 'bg-white text-gray-500 border-gray-200' : ''} ${item.status === 'PREPARING' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 animate-pulse' : ''} ${item.status === 'READY' ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-500/20' : ''} ${item.status === 'DELIVERED' ? 'bg-blue-100 text-blue-700 border-blue-200' : ''}`}>
                                                            {item.status === 'PENDING' && 'Na Fila'} 
                                                            {item.status === 'PREPARING' && 'Preparando'} 
                                                            {item.status === 'READY' && 'Pronto!'} 
                                                            {item.status === 'DELIVERED' && 'Entregue'}
                                                        </span>
                                                    </div>
                                                    {/* Exibe adicionais agrupados */}
                                                    {item.extras && item.extras.length > 0 && (
                                                        <div className="mt-1 pl-3 border-l-2 border-orange-200 space-y-1">
                                                            {item.extras.map((ex: any, i: number) => (
                                                                <div key={i} className="flex justify-between items-center">
                                                                    <span className="text-xs text-orange-600 font-bold">+ {ex.quantity}x {ex.productName}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div className="mt-10 p-10 bg-blue-50/50 rounded-[2.5rem] border-4 border-dashed border-blue-100 text-center">
                                <p className="text-blue-600 text-[10px] mb-6 font-black uppercase tracking-widest">Precisa de ajuda?</p>
                                <Button 
                                    variant="outline" 
                                    className="w-full bg-white border-blue-200 text-blue-600 hover:bg-blue-50 font-black py-5 rounded-3xl shadow-xl shadow-blue-200/10 transition-all uppercase tracking-widest text-xs" 
                                    onClick={handleCallWaiter}
                                >
                                    {waiterCalled ? 'Solicitação Enviada' : 'Chamar Garçom na Mesa'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL ADD TO CART (ATUALIZADO) */}
                {selectedProduct && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
                            {/* Header com Imagem Pequena (Cover) */}
                            <div className="relative">
                                <div className="h-32 w-full overflow-hidden relative">
                                    <img 
                                        src={selectedProduct.image || 'https://via.placeholder.com/400x200?text=Sem+Foto'} 
                                        className="w-full h-full object-cover" 
                                        alt={selectedProduct.name} 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                </div>
                                <div className="absolute bottom-0 left-0 w-full p-4 text-white flex justify-between items-end">
                                    <h3 className="font-black text-xl truncate pr-4 text-shadow">{selectedProduct.name}</h3>
                                    <button onClick={() => setSelectedProduct(null)} className="bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-red-500 hover:text-white transition-colors absolute top-4 right-4"><X size={20}/></button>
                                </div>
                            </div>

                            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                                {/* Exibe a Descrição do Produto no Modal */}
                                {selectedProduct.description && (
                                    <div className="text-sm text-gray-600 leading-relaxed font-medium">
                                        {selectedProduct.description}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 text-center">Quantidade</label>
                                    <div className="flex items-center gap-6 justify-center">
                                        <button onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))} className="p-4 bg-gray-100 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-colors"><Minus size={24}/></button>
                                        <span className="text-5xl font-black w-20 text-center text-blue-600">{modalQuantity}</span>
                                        <button onClick={() => setModalQuantity(modalQuantity + 1)} className="p-4 bg-gray-100 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-colors"><Plus size={24}/></button>
                                    </div>
                                </div>
                                
                                {/* REGRAS DE NEGÓCIO: Bebidas não mostram adicionais, e adicionais apenas se houver vinculados */}
                                {!isDrinkProduct(selectedProduct) && selectedProduct.linkedExtraIds && selectedProduct.linkedExtraIds.length > 0 && (
                                    <div className="border-t border-b border-gray-100 py-6 space-y-3">
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1"><Plus size={12} className="text-green-500"/> Adicionais</label>
                                        <div className="space-y-2">
                                            {selectedProduct.linkedExtraIds.map(id => {
                                                const extra = menuState.products.find(p => p.id === id);
                                                if (!extra) return null;
                                                const isSelected = selectedExtraIds.includes(id);
                                                return (
                                                    <div key={id} onClick={() => setSelectedExtraIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? 'bg-orange-50 border-orange-400' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}>
                                                        <span className="text-sm font-black text-slate-700">{extra.name}</span>
                                                        <span className="text-xs font-bold text-slate-400">+ R$ {extra.price.toFixed(2)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                
                                {/* CONDITIONAL RENDERING FOR DRINKS */}
                                {isDrinkProduct(selectedProduct) ? (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Quando Servir?</label>
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => setDrinkTiming('IMMEDIATE')}
                                                className={`flex-1 p-4 rounded-2xl border-2 font-bold text-xs uppercase tracking-wider transition-all ${drinkTiming === 'IMMEDIATE' ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-gray-400 border-gray-200'}`}
                                            >
                                                <Zap size={16} className="mx-auto mb-1"/>
                                                Imediata
                                            </button>
                                            <button 
                                                onClick={() => setDrinkTiming('WITH_FOOD')}
                                                className={`flex-1 p-4 rounded-2xl border-2 font-bold text-xs uppercase tracking-wider transition-all ${drinkTiming === 'WITH_FOOD' ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-gray-400 border-gray-200'}`}
                                            >
                                                <Utensils size={16} className="mx-auto mb-1"/>
                                                Com Comida
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Observações</label>
                                        <textarea className="w-full border-2 border-gray-100 bg-gray-50 rounded-2xl p-4 text-sm font-medium focus:border-blue-500 focus:bg-white outline-none transition-all resize-none" rows={3} placeholder="Ex: Sem cebola, ponto da carne..." value={modalNotes} onChange={e => setModalNotes(e.target.value)} />
                                    </div>
                                )}
                            </div>
                            <div className="p-6 border-t bg-gray-50 shrink-0">
                                <Button onClick={handleAddToCart} className="w-full py-5 text-xl font-black shadow-2xl shadow-blue-200 rounded-2xl uppercase tracking-widest">
                                    Adicionar • R$ {((selectedProduct.price + selectedExtraIds.reduce((sum, id) => sum + (menuState.products.find(p => p.id === id)?.price || 0), 0)) * modalQuantity).toFixed(2)}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
