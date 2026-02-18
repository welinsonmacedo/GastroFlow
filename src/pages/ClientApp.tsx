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
    Receipt, Loader2, Bell, Search, Edit3, 
    Zap, Clock, Trash2, ArrowRight, 
    Activity, AlertCircle, Utensils, Home
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

    // --- Helpers de Estilo baseados no Tema ---
    const getRadiusClass = (radius?: string) => {
        switch(radius) {
            case 'none': return 'rounded-none';
            case 'sm': return 'rounded-sm';
            case 'md': return 'rounded-md';
            case 'lg': return 'rounded-2xl'; // Nosso padrão "arredondado"
            case 'full': return 'rounded-3xl';
            default: return 'rounded-2xl';
        }
    };
    
    const getFontFamily = (font?: string) => {
        switch(font) {
            case 'Roboto': return 'font-roboto'; // Requer configuração no index.html/css
            case 'Playfair Display': return 'font-serif';
            case 'Montserrat': return 'font-sans'; // Ajustar conforme imports reais
            default: return 'font-sans';
        }
    };

    const radiusClass = getRadiusClass(theme.borderRadius);
    const fontClass = getFontFamily(theme.fontFamily);
    const isOutlineBtn = theme.buttonStyle === 'outline';

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
        await orderDispatch({ type: 'PLACE_ORDER', tableId, items: flattenedItems });
        setCart([]);
        setView('STATUS');
    };

    if (state.isLoading || menuState.isLoading) {
        return (
            <div className={`h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400 ${fontClass}`}>
                <Loader2 className="animate-spin mb-4" size={48} style={{ color: theme.primaryColor }} />
                <p className="font-black uppercase tracking-widest text-xs">Preparando Experiência...</p>
            </div>
        );
    }

    if (!table) {
        return (
            <div className={`h-full flex items-center justify-center bg-red-50 p-10 text-center flex-col gap-4 text-red-600 ${fontClass}`}>
                <AlertCircle size={64} />
                <h2 className="font-black text-2xl uppercase tracking-tighter">QR Code Inválido</h2>
                <p className="font-medium text-sm">Este código não pertence a uma mesa ativa.</p>
            </div>
        );
    }

    if (table.status !== TableStatus.OCCUPIED) {
        return (
            <div className={`flex flex-col items-center justify-center h-full p-6 ${fontClass}`} style={{ backgroundColor: theme.backgroundColor }}>
                <div className={`bg-white p-10 shadow-2xl text-center max-w-sm w-full border border-gray-100 ${radiusClass}`}>
                    <div className="bg-blue-50 p-6 rounded-full inline-block mb-8 text-blue-600 shadow-inner">
                        <ChefHat size={64} strokeWidth={1.5} />
                    </div>
                    <h1 className="text-3xl font-black mb-2 text-slate-800 uppercase tracking-tighter">{theme.restaurantName}</h1>
                    <h2 className="text-xl font-bold text-blue-600 mb-8 tracking-tight">Mesa #{table.number}</h2>
                    <div className={`bg-red-50 text-red-600 py-3 font-black mb-8 animate-pulse border border-red-100 text-xs uppercase tracking-widest ${radiusClass}`}>Mesa Fechada</div>
                    <Button onClick={handleCallWaiter} className={`w-full py-5 text-xl font-black shadow-2xl shadow-blue-200 ${radiusClass}`}>CHAMAR GARÇOM</Button>
                </div>
            </div>
        );
    }

    if (table.accessCode && !isAuthenticated) {
        return (
            <div className={`flex flex-col items-center justify-center h-full p-6 ${fontClass}`} style={{ backgroundColor: theme.backgroundColor }}>
                <div className={`bg-white p-10 shadow-2xl text-center max-w-sm w-full border border-gray-100 ${radiusClass}`}>
                    <div className="bg-emerald-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <Lock size={40} className="text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-black mb-2 text-slate-800 uppercase tracking-tighter">Sua Mesa Digital</h2>
                    <p className="text-gray-400 text-xs mb-8 font-medium">Insira o código gerado pelo garçom para começar.</p>
                    <input 
                        type="tel" 
                        maxLength={4} 
                        className={`text-center text-6xl tracking-[0.5em] w-full border-2 bg-gray-50 py-6 mb-8 font-mono font-black text-blue-600 focus:border-blue-500 outline-none transition-all shadow-inner ${radiusClass}`}
                        value={accessPin} 
                        onChange={e => setAccessPin(e.target.value)} 
                        placeholder="0000" 
                    />
                    <Button 
                        onClick={() => table.accessCode === accessPin ? setIsAuthenticated(true) : showAlert({ title: "Código Incorreto", message: "O código digitado não confere.", type: 'ERROR' })} 
                        className={`w-full py-5 text-xl font-black shadow-xl shadow-emerald-200 ${radiusClass}`}
                    >
                        ACESSAR CARDÁPIO
                    </Button>
                </div>
            </div>
        );
    }

    const NavButton = ({ id, icon: Icon, label, badge }: any) => {
        const isActive = view === id;
        return (
            <button 
                onClick={() => setView(id)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 relative group`}
            >
                <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-opacity-10 transform -translate-y-1' : 'text-gray-400 hover:text-gray-600'}`} style={isActive ? { backgroundColor: `${theme.primaryColor}20`, color: theme.primaryColor } : {}}>
                    <div className="relative">
                        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                        {badge > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white shadow-sm">
                                {badge}
                            </span>
                        )}
                    </div>
                </div>
                <span className={`text-[9px] font-bold uppercase mt-0.5 tracking-wider transition-colors ${isActive ? 'opacity-100' : 'opacity-60'}`} style={{ color: isActive ? theme.primaryColor : '#94a3b8' }}>
                    {label}
                </span>
            </button>
        )
    };

    return (
        <div className={`h-full overflow-hidden flex flex-col ${fontClass}`} style={{ backgroundColor: theme.backgroundColor, color: theme.fontColor }}>
            {/* HEADER SIMPLIFICADO */}
            <header className="bg-white/80 backdrop-blur-xl shadow-sm sticky top-0 z-40 border-b border-white/20 shrink-0">
                <div className="flex justify-between items-center p-4 max-w-2xl mx-auto">
                    <div className="flex items-center gap-3">
                        <div className={`bg-white p-1 shadow-md border border-gray-100 shrink-0 ${radiusClass}`}>
                            {theme.logoUrl ? <img src={theme.logoUrl} className={`h-10 w-10 object-contain ${radiusClass}`} /> : <ChefHat size={32} style={{ color: theme.primaryColor }} />}
                        </div>
                        <div>
                            <h1 className="font-black text-lg leading-none uppercase tracking-tighter text-slate-800">{theme.restaurantName}</h1>
                            <p className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{ color: theme.primaryColor }}>MESA #{table.number}</p>
                        </div>
                    </div>
                    
                    {/* Botão Chamar Garçom (Sino) no Header */}
                    <button 
                        onClick={handleCallWaiter} 
                        className={`p-3 bg-white border border-gray-100 shadow-sm text-blue-600 hover:bg-blue-50 active:scale-90 transition-all ${radiusClass} ${waiterCalled ? 'animate-pulse bg-blue-100 ring-2 ring-blue-200' : ''}`}
                        title="Chamar Garçom"
                    >
                        <Bell size={20} fill={waiterCalled ? "currentColor" : "none"} />
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT - Com padding bottom extra para a nav bar flutuante */}
            <main className="flex-1 overflow-y-auto p-4 pb-32 max-w-2xl mx-auto w-full custom-scrollbar">
                {view === 'MENU' && (
                    <div className="space-y-8 animate-fade-in pt-2">
                        {/* SEARCH BAR CORRIGIDO */}
                        <div className="relative group">
                            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
                            <input 
                                className={`w-full bg-white border border-gray-100 shadow-lg shadow-gray-200/50 p-4 pl-12 text-sm font-bold outline-none transition-all placeholder:text-gray-300 focus:shadow-md ${radiusClass}`} 
                                placeholder="O que você deseja comer hoje?" 
                                value={searchQuery} 
                                onChange={e => setSearchQuery(e.target.value)} 
                                style={{ caretColor: theme.primaryColor }}
                            />
                        </div>

                        {sortedCategories.map(category => {
                            const items = menuState.products.filter(p => p.isVisible && !p.isExtra && p.category === category && p.name.toLowerCase().includes(searchQuery.toLowerCase()));
                            if (items.length === 0) return null;
                            const isGrid = theme.viewMode === 'GRID';
                            return (
                                <div key={category} className="space-y-4 animate-fade-in">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-xl font-black uppercase tracking-tighter text-slate-800 whitespace-nowrap">{category}</h2>
                                        <div className="h-px flex-1 bg-gray-200 rounded-full"></div>
                                    </div>
                                    <div className={isGrid ? "grid grid-cols-2 gap-4" : "flex flex-col gap-4"}>
                                        {items.map(product => (
                                            <div 
                                                key={product.id} 
                                                onClick={() => setSelectedProduct(product)} 
                                                className={`bg-white shadow-sm border border-gray-100 flex cursor-pointer hover:shadow-xl transition-all active:scale-[0.98] group overflow-hidden ${radiusClass} ${isGrid ? 'flex-col' : 'flex-row p-3 gap-4'}`}
                                            >
                                                <div className={`relative shrink-0 overflow-hidden bg-gray-50 ${radiusClass} ${isGrid ? 'w-full h-40' : 'w-24 h-24'}`}>
                                                    <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={product.name} />
                                                </div>
                                                <div className={`flex-1 flex flex-col justify-between ${isGrid ? 'p-4 pt-2' : 'py-1 pr-1'}`}>
                                                    <div className="space-y-1">
                                                        <h3 className="font-black text-slate-800 leading-tight text-lg group-hover:opacity-70 transition-opacity">{product.name}</h3>
                                                        {product.description && (
                                                            <p className="text-[11px] text-gray-500 font-medium leading-relaxed line-clamp-2">{product.description}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between items-end mt-3">
                                                        <span className="font-black text-lg" style={{ color: theme.primaryColor }}>R$ {product.price.toFixed(2)}</span>
                                                        <div 
                                                            className={`w-8 h-8 flex items-center justify-center text-white shadow-md transition-all group-hover:scale-110 ${radiusClass === 'rounded-full' || radiusClass === 'rounded-2xl' || radiusClass === 'rounded-3xl' ? 'rounded-full' : 'rounded-lg'}`} 
                                                            style={{ 
                                                                backgroundColor: isOutlineBtn ? 'transparent' : theme.primaryColor,
                                                                border: isOutlineBtn ? `2px solid ${theme.primaryColor}` : 'none',
                                                                color: isOutlineBtn ? theme.primaryColor : 'white'
                                                            }}
                                                        >
                                                            <Plus size={16} strokeWidth={3} />
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
                    <div className={`bg-white shadow-xl border border-gray-100 overflow-hidden animate-fade-in flex flex-col min-h-[50vh] ${radiusClass}`}>
                        <div className="bg-gray-50 p-6 border-b flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Sua Cesta</h2>
                                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.primaryColor }}>Confira antes de pedir</p>
                            </div>
                        </div>
                        <div className="p-6 flex-1 space-y-4">
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
                                    <div className="bg-gray-50 p-8 rounded-full">
                                        <ShoppingCart size={48} className="text-gray-300" />
                                    </div>
                                    <p className="font-bold text-gray-400 text-sm">Sua cesta está vazia</p>
                                    <Button onClick={() => setView('MENU')} variant="outline" className={`px-6 text-xs font-bold uppercase ${radiusClass}`}>Voltar ao Cardápio</Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {cart.map((item, idx) => (
                                        <div key={idx} className={`bg-gray-50 p-4 relative group border border-transparent hover:border-gray-200 transition-all ${radiusClass}`}>
                                            <button 
                                                onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))} 
                                                className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-2"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <div className="flex justify-between items-start pr-8">
                                                <h4 className="font-bold text-slate-800 text-base leading-tight">
                                                    <span className="mr-2" style={{ color: theme.primaryColor }}>{item.quantity}x</span> 
                                                    {item.product.name}
                                                </h4>
                                            </div>
                                            <div className="text-sm font-black text-slate-700 mt-1">
                                                R$ {(item.product.price * item.quantity).toFixed(2)}
                                            </div>
                                            {item.extras?.map(ex => (
                                                <div key={ex.id} className="text-[10px] font-bold text-orange-600 mt-1 flex items-center gap-1">
                                                    <Plus size={8} /> {ex.name} (+R$ {ex.price.toFixed(2)})
                                                </div>
                                            ))}
                                            {item.notes && (
                                                <div className="mt-2 text-[10px] text-gray-500 italic bg-white p-2 rounded-lg border border-gray-100">
                                                    Note: {item.notes}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {cart.length > 0 && (
                            <div className="bg-slate-900 p-6 text-white">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Total Estimado</span>
                                    <span className="text-3xl font-black">
                                        R$ {cart.reduce((acc, i) => acc + ((i.product.price + (i.extras?.reduce((s, e) => s + e.price, 0) || 0)) * i.quantity), 0).toFixed(2)}
                                    </span>
                                </div>
                                <button 
                                    onClick={handleConfirmOrder} 
                                    className={`w-full py-4 bg-white text-slate-900 font-black text-lg shadow-lg transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2 ${radiusClass}`}
                                >
                                    Enviar Pedido <ArrowRight size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {view === 'BILL' && (
                    <div className={`bg-white shadow-xl border border-gray-100 overflow-hidden animate-fade-in flex flex-col min-h-[50vh] ${radiusClass}`}>
                        <div className="bg-slate-900 p-8 text-white">
                            <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                                <Receipt size={24} style={{ color: theme.primaryColor }} /> Conta
                            </h2>
                            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1">Mesa #{table.number} • {table.customerName}</p>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                            <div className="space-y-4 mb-8">
                                {tableOrders.flatMap(o => groupItems(o.items)).map((item, idx) => (
                                    <div key={idx} className="border-b border-dashed border-gray-200 pb-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <div className="font-bold text-slate-700">
                                                <span className="text-xs text-slate-400 mr-2">{item.quantity}x</span>
                                                {item.productName}
                                            </div>
                                            <span className="font-bold text-slate-900">R$ {(item.productPrice * item.quantity).toFixed(2)}</span>
                                        </div>
                                        {/* Adicionais agrupados */}
                                        {item.extras && item.extras.length > 0 && (
                                            <div className="mt-1 pl-6 space-y-0.5">
                                                {item.extras.map((ex: any, i: number) => (
                                                    <div key={i} className="flex justify-between text-[10px] text-orange-600 font-medium">
                                                        <span>+ {ex.quantity}x {ex.productName}</span>
                                                        <span>R$ {(ex.productPrice * ex.quantity).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {tableOrders.length === 0 && (
                                    <div className="text-center py-10">
                                        <p className="font-bold text-gray-400 text-sm">Nenhum consumo registrado</p>
                                    </div>
                                )}
                            </div>
                            
                            {tableOrders.length > 0 && (
                                <div className="flex justify-between items-center text-2xl font-black border-t-2 border-slate-900 pt-4 mb-8">
                                    <span className="text-xs text-gray-500 uppercase">Total</span>
                                    <span className="text-slate-900">
                                        R$ {tableOrders.reduce((acc, o) => acc + o.items.reduce((s, i) => s + (i.productPrice * i.quantity), 0), 0).toFixed(2)}
                                    </span>
                                </div>
                            )}

                            <div className={`bg-emerald-50 border border-emerald-100 p-4 text-center ${radiusClass}`}>
                                <p className="text-emerald-800 font-bold text-sm mb-3">Pronto para pagar?</p>
                                <button 
                                    onClick={handleCallWaiter} 
                                    className={`w-full py-3 bg-white border border-emerald-200 text-emerald-600 font-black text-sm uppercase shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 ${radiusClass}`}
                                >
                                    <Bell size={16} /> Chamar Garçom
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'STATUS' && (
                    <div className={`bg-white shadow-xl border border-gray-100 overflow-hidden animate-fade-in flex flex-col min-h-[50vh] ${radiusClass}`}>
                        <div className="bg-blue-600 p-8 text-white">
                            <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                                <Clock size={24} /> Pedidos
                            </h2>
                            <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mt-1">Acompanhamento em tempo real</p>
                        </div>
                        <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                            {tableOrders.length === 0 && (
                                <div className="text-center py-10">
                                    <Activity size={48} className="mx-auto mb-2 text-gray-200" />
                                    <p className="font-bold text-gray-400 text-sm">Nenhum pedido ativo</p>
                                </div>
                            )}
                            {[...tableOrders].reverse().map(order => (
                                <div key={order.id} className="relative">
                                    <OrderGraceTimer 
                                        order={order} 
                                        graceMinutes={graceMinutes} 
                                        onCancel={(id) => showConfirm({ title: "Cancelar Pedido?", message: "Esta ação removerá o pedido da cozinha.", type: 'WARNING', onConfirm: () => cancelOrder(id) })} 
                                    />
                                    <div className={`bg-gray-50 p-5 border border-gray-100 ${radiusClass}`}>
                                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">#{order.id.slice(0, 4)}</span>
                                            <span className="text-xs font-bold text-slate-500">{order.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="space-y-3">
                                            {groupItems(order.items).map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center">
                                                    <div className="flex-1">
                                                        <div className="font-bold text-slate-700 text-sm leading-tight">
                                                            {item.quantity}x {item.productName}
                                                        </div>
                                                        {item.notes && <div className="text-[10px] text-gray-400 italic mt-0.5">"{item.notes}"</div>}
                                                        {/* Adicionais */}
                                                        {item.extras && item.extras.length > 0 && (
                                                            <div className="mt-1 pl-2 border-l-2 border-gray-200">
                                                                {item.extras.map((ex: any, i: number) => (
                                                                    <div key={i} className="text-[10px] text-gray-500">+ {ex.quantity}x {ex.productName}</div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className={`text-[9px] px-2 py-1 rounded-lg font-black uppercase tracking-wider border ${item.status === 'PENDING' ? 'bg-white text-gray-400 border-gray-200' : ''} ${item.status === 'PREPARING' ? 'bg-yellow-50 text-yellow-600 border-yellow-200 animate-pulse' : ''} ${item.status === 'READY' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ''} ${item.status === 'DELIVERED' ? 'bg-blue-50 text-blue-600 border-blue-200' : ''}`}>
                                                        {item.status === 'PENDING' && 'Fila'} 
                                                        {item.status === 'PREPARING' && 'Prep'} 
                                                        {item.status === 'READY' && 'Pronto'} 
                                                        {item.status === 'DELIVERED' && 'Entregue'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* MODAL ADD TO CART (ATUALIZADO) */}
                {selectedProduct && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
                        <div className={`bg-white shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh] ${radiusClass}`}>
                            {/* Header com Imagem Pequena (Cover) */}
                            <div className="relative">
                                <div className="h-32 w-full overflow-hidden relative">
                                    <img 
                                        src={selectedProduct.image || 'https://via.placeholder.com/400x200?text=Sem+Foto'} 
                                        className="w-full h-full object-cover" 
                                        alt={selectedProduct.name} 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
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
                                        <button onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))} className={`p-4 bg-gray-100 hover:bg-red-50 hover:text-red-600 transition-colors ${radiusClass}`}><Minus size={24}/></button>
                                        <span className="text-5xl font-black w-20 text-center" style={{ color: theme.primaryColor }}>{modalQuantity}</span>
                                        <button onClick={() => setModalQuantity(modalQuantity + 1)} className={`p-4 bg-gray-100 hover:bg-green-50 hover:text-green-600 transition-colors ${radiusClass}`}><Plus size={24}/></button>
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
                                                    <div key={id} onClick={() => setSelectedExtraIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])} className={`flex items-center justify-between p-4 border-2 transition-all cursor-pointer ${radiusClass} ${isSelected ? 'bg-orange-50 border-orange-400' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}>
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
                                                className={`flex-1 p-4 border-2 font-bold text-xs uppercase tracking-wider transition-all ${radiusClass} ${drinkTiming === 'IMMEDIATE' ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-gray-400 border-gray-200'}`}
                                            >
                                                <Zap size={16} className="mx-auto mb-1"/>
                                                Imediata
                                            </button>
                                            <button 
                                                onClick={() => setDrinkTiming('WITH_FOOD')}
                                                className={`flex-1 p-4 border-2 font-bold text-xs uppercase tracking-wider transition-all ${radiusClass} ${drinkTiming === 'WITH_FOOD' ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-gray-400 border-gray-200'}`}
                                            >
                                                <Utensils size={16} className="mx-auto mb-1"/>
                                                Com Comida
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Observações</label>
                                        <textarea className={`w-full border-2 border-gray-100 bg-gray-50 p-4 text-sm font-medium focus:border-blue-500 focus:bg-white outline-none transition-all resize-none ${radiusClass}`} rows={3} placeholder="Ex: Sem cebola, ponto da carne..." value={modalNotes} onChange={e => setModalNotes(e.target.value)} />
                                    </div>
                                )}
                            </div>
                            <div className="p-6 border-t bg-gray-50 shrink-0">
                                <Button onClick={handleAddToCart} className={`w-full py-5 text-xl font-black shadow-2xl shadow-blue-200 uppercase tracking-widest ${radiusClass}`} style={{ backgroundColor: theme.primaryColor }}>
                                    Adicionar • R$ {((selectedProduct.price + selectedExtraIds.reduce((sum, id) => sum + (menuState.products.find(p => p.id === id)?.price || 0), 0)) * modalQuantity).toFixed(2)}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* FLOATING BOTTOM NAVIGATION */}
            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md bg-white/95 backdrop-blur-md border border-gray-200 shadow-2xl shadow-slate-300/50 flex justify-around p-2 items-center safe-area-bottom ${radiusClass === 'rounded-3xl' ? 'rounded-full' : 'rounded-3xl'}`}>
                 <NavButton id="MENU" icon={Home} label="Cardápio" />
                 <NavButton id="STATUS" icon={Clock} label="Pedidos" />
                 <NavButton id="BILL" icon={Receipt} label="Conta" />
                 <NavButton id="CART" icon={ShoppingCart} label="Cesta" badge={cart.length} />
            </div>
        </div>
    );
};