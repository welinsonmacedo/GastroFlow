
import React, { useState } from 'react';
import { ShoppingCart, Search, Package, User, CreditCard, Banknote, Trash2, Plus, Minus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';

interface Product {
    id: string;
    name: string;
    price: number;
    category: string;
    stock: number;
    image?: string;
}

interface CartItem extends Product {
    quantity: number;
}

export const CommercePOS: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    // Mock products
    const products: Product[] = [
        { id: '1', name: 'Camiseta Básica', price: 49.90, category: 'Vestuário', stock: 50 },
        { id: '2', name: 'Calça Jeans', price: 129.90, category: 'Vestuário', stock: 30 },
        { id: '3', name: 'Tênis Esportivo', price: 199.90, category: 'Calçados', stock: 15 },
        { id: '4', name: 'Boné Aba Curva', price: 39.90, category: 'Acessórios', stock: 100 },
        { id: '5', name: 'Meia Cano Alto', price: 15.00, category: 'Acessórios', stock: 200 },
        { id: '6', name: 'Jaqueta Corta Vento', price: 159.90, category: 'Vestuário', stock: 10 },
    ];

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => 
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const handleCheckout = () => {
        if (cart.length === 0) return;
        alert('Venda realizada com sucesso!');
        setCart([]);
        setIsCheckoutOpen(false);
    };

    return (
        <div className="flex h-full bg-slate-100 font-sans">
            {/* Left Side: Products */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white border-b border-slate-200 p-4 flex items-center gap-4">
                    <Button variant="secondary" onClick={() => navigate('/modules')} className="p-2">
                        <ArrowLeft size={20} />
                    </Button>
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Buscar produtos por nome ou categoria..." 
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredProducts.map(product => (
                            <div 
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group"
                            >
                                <div className="aspect-square bg-slate-100 rounded-xl mb-3 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-200 transition-colors">
                                    <Package size={48} />
                                </div>
                                <h4 className="font-bold text-slate-800 truncate">{product.name}</h4>
                                <p className="text-xs text-slate-500 mb-2">{product.category}</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-indigo-600 font-black">R$ {product.price.toFixed(2)}</span>
                                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">Estoque: {product.stock}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Side: Cart */}
            <div className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-2xl">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="text-indigo-600" size={24} />
                        <h2 className="text-xl font-black text-slate-800">Carrinho</h2>
                    </div>
                    <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold">
                        {cart.length} itens
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                            <ShoppingCart size={64} className="mb-4" />
                            <p className="font-medium">Seu carrinho está vazio</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex gap-3">
                                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-slate-300 border border-slate-100">
                                    <Package size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h5 className="font-bold text-slate-800 text-sm truncate">{item.name}</h5>
                                    <p className="text-xs text-indigo-600 font-bold">R$ {item.price.toFixed(2)}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded border border-slate-200">
                                            <Minus size={12} />
                                        </button>
                                        <span className="text-sm font-bold text-slate-700">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded border border-slate-200">
                                            <Plus size={12} />
                                        </button>
                                    </div>
                                </div>
                                <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-4">
                    <div className="flex justify-between items-center text-slate-500 text-sm">
                        <span>Subtotal</span>
                        <span>R$ {total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-800 text-xl font-black">
                        <span>Total</span>
                        <span>R$ {total.toFixed(2)}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" className="flex flex-col items-center py-4 h-auto gap-2">
                            <Banknote size={20} />
                            <span className="text-[10px] font-bold uppercase">Dinheiro</span>
                        </Button>
                        <Button variant="primary" onClick={() => setIsCheckoutOpen(true)} className="flex flex-col items-center py-4 h-auto gap-2 bg-indigo-600 hover:bg-indigo-700">
                            <CreditCard size={20} />
                            <span className="text-[10px] font-bold uppercase">Finalizar</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Checkout Modal Placeholder */}
            {isCheckoutOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
                        <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
                            <CreditCard className="text-indigo-600" />
                            Pagamento
                        </h3>
                        
                        <div className="space-y-4 mb-8">
                            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex justify-between items-center">
                                <span className="text-indigo-900 font-bold">Total a Pagar</span>
                                <span className="text-2xl font-black text-indigo-600">R$ {total.toFixed(2)}</span>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente (Opcional)</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input type="text" placeholder="Nome do cliente ou CPF" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={() => setIsCheckoutOpen(false)} className="flex-1">Cancelar</Button>
                            <Button variant="primary" onClick={handleCheckout} className="flex-1 bg-indigo-600 hover:bg-indigo-700">Confirmar Venda</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
