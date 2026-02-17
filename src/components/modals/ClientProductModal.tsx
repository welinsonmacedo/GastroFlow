
import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { useMenu } from '../../context/MenuContext';
import { Button } from '../Button';
import { X, Minus, Plus, Zap, Utensils, CheckSquare, Square } from 'lucide-react';

interface ClientProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onAddToCart: (item: { product: Product; quantity: number; notes: string; extras: Product[] }) => void;
}

export const ClientProductModal: React.FC<ClientProductModalProps> = ({ isOpen, onClose, product, onAddToCart }) => {
    const { state: menuState } = useMenu();
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const [drinkTiming, setDrinkTiming] = useState<'IMMEDIATE' | 'WITH_FOOD'>('IMMEDIATE');
    const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen && product) {
            setQuantity(1);
            setNotes('');
            setDrinkTiming('IMMEDIATE');
            setSelectedExtraIds([]);
        }
    }, [isOpen, product]);

    if (!isOpen || !product) return null;

    const isDrink = product.category === 'Bebidas' || product.type === 'BAR' || product.category.toLowerCase().includes('bebida');

    const handleConfirm = () => {
        let finalNote = notes;
        
        if (isDrink) {
            const timingText = drinkTiming === 'IMMEDIATE' ? '[IMEDIATA]' : '[COM COMIDA]';
            finalNote = finalNote ? `${timingText} ${finalNote}` : timingText;
        }

        const chosenExtras = selectedExtraIds
            .map(id => menuState.products.find(p => p.id === id))
            .filter(Boolean) as Product[];

        onAddToCart({
            product,
            quantity,
            notes: finalNote.trim(),
            extras: chosenExtras
        });
        onClose();
    };

    const toggleExtra = (id: string) => {
        setSelectedExtraIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const getGroupedExtras = () => {
        const ids = product.linkedExtraIds || [];
        const extras = ids.map(id => menuState.products.find(p => p.id === id)).filter(Boolean) as Product[];
        const grouped: Record<string, Product[]> = {};
        extras.forEach(ex => {
            const cat = ex.category || 'Opções';
            if(!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(ex);
        });
        return grouped;
    };

    const totalExtras = selectedExtraIds.reduce((sum, id) => sum + (menuState.products.find(p => p.id === id)?.price || 0), 0);
    const finalPrice = (product.price + totalExtras) * quantity;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header com Imagem Pequena (Cover) */}
                <div className="relative shrink-0">
                    <div className="h-48 w-full overflow-hidden relative">
                        <img 
                            src={product.image || 'https://via.placeholder.com/400x200?text=Sem+Foto'} 
                            className="w-full h-full object-cover" 
                            alt={product.name} 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    </div>
                    <button onClick={onClose} className="bg-black/20 backdrop-blur-md p-2 rounded-full hover:bg-white hover:text-black text-white transition-all absolute top-4 right-4 z-10"><X size={20}/></button>
                    <div className="absolute bottom-0 left-0 w-full p-6 text-white">
                        <h3 className="font-black text-2xl text-shadow-sm leading-tight mb-1">{product.name}</h3>
                        <p className="text-sm font-medium opacity-90 text-shadow-sm">R$ {product.price.toFixed(2)}</p>
                    </div>
                </div>

                <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
                    {/* Descrição do Produto */}
                    {product.description && (
                        <div className="text-sm text-gray-600 leading-relaxed font-medium">
                            {product.description}
                        </div>
                    )}

                    <div>
                        <div className="flex items-center justify-between bg-gray-50 p-2 rounded-2xl border border-gray-100">
                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-12 bg-white rounded-xl shadow-sm text-slate-800 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center"><Minus size={20} strokeWidth={3}/></button>
                            <span className="text-3xl font-black text-slate-800 tabular-nums">{quantity}</span>
                            <button onClick={() => setQuantity(quantity + 1)} className="w-12 h-12 bg-blue-600 rounded-xl shadow-lg shadow-blue-200 text-white hover:bg-blue-700 transition-colors flex items-center justify-center"><Plus size={20} strokeWidth={3}/></button>
                        </div>
                    </div>
                    
                    {!isDrink && product.linkedExtraIds && product.linkedExtraIds.length > 0 && (
                        <div className="border-t border-gray-100 pt-6 space-y-6">
                            {Object.entries(getGroupedExtras()).map(([category, extras]) => (
                                <div key={category} className="space-y-3">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">{category}</label>
                                    <div className="space-y-2">
                                        {extras.map(extra => {
                                            const isSelected = selectedExtraIds.includes(extra.id);
                                            return (
                                                <div key={extra.id} onClick={() => toggleExtra(extra.id)} className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? 'bg-orange-50 border-orange-400 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 bg-white'}`}>
                                                            {isSelected && <CheckSquare size={12} strokeWidth={4} />}
                                                        </div>
                                                        <span className={`text-sm font-bold ${isSelected ? 'text-orange-900' : 'text-slate-700'}`}>{extra.name}</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-500">+ R$ {extra.price.toFixed(2)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {isDrink ? (
                        <div className="space-y-3 border-t border-gray-100 pt-6">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Quando Servir?</label>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setDrinkTiming('IMMEDIATE')}
                                    className={`flex-1 p-4 rounded-2xl border-2 font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-2 ${drinkTiming === 'IMMEDIATE' ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <Zap size={20} className={drinkTiming === 'IMMEDIATE' ? "fill-white" : ""}/>
                                    Agora
                                </button>
                                <button 
                                    onClick={() => setDrinkTiming('WITH_FOOD')}
                                    className={`flex-1 p-4 rounded-2xl border-2 font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-2 ${drinkTiming === 'WITH_FOOD' ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <Utensils size={20} className={drinkTiming === 'WITH_FOOD' ? "fill-white" : ""}/>
                                    Com Prato
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 border-t border-gray-100 pt-6">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Observações</label>
                            <textarea 
                                className="w-full border-2 border-gray-200 bg-gray-50 rounded-2xl p-4 text-sm font-bold text-slate-700 focus:border-blue-500 focus:bg-white outline-none transition-all resize-none placeholder-gray-400" 
                                rows={3} 
                                placeholder="Ex: Sem cebola, ponto da carne..." 
                                value={notes} 
                                onChange={e => setNotes(e.target.value)} 
                            />
                        </div>
                    )}
                </div>
                <div className="p-6 border-t bg-gray-50 shrink-0">
                    <Button onClick={handleConfirm} className="w-full py-5 text-lg font-black shadow-xl shadow-blue-200 rounded-2xl uppercase tracking-widest flex justify-between items-center px-8">
                        <span>Adicionar</span>
                        <span>R$ {finalPrice.toFixed(2)}</span>
                    </Button>
                </div>
            </div>
        </div>
    );
};
