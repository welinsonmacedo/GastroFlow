
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
                <div className="relative">
                    <div className="h-32 w-full overflow-hidden relative">
                        <img 
                            src={product.image || 'https://via.placeholder.com/400x200?text=Sem+Foto'} 
                            className="w-full h-full object-cover" 
                            alt={product.name} 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full p-4 text-white flex justify-between items-end">
                        <h3 className="font-black text-xl truncate pr-4 text-shadow">{product.name}</h3>
                        <button onClick={onClose} className="bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-red-500 hover:text-white transition-colors absolute top-4 right-4"><X size={20}/></button>
                    </div>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 text-center">Quantidade</label>
                        <div className="flex items-center gap-6 justify-center">
                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-4 bg-gray-100 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-colors"><Minus size={24}/></button>
                            <span className="text-5xl font-black w-20 text-center text-blue-600">{quantity}</span>
                            <button onClick={() => setQuantity(quantity + 1)} className="p-4 bg-gray-100 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-colors"><Plus size={24}/></button>
                        </div>
                    </div>
                    
                    {!isDrink && product.linkedExtraIds && product.linkedExtraIds.length > 0 && (
                        <div className="border-t border-gray-100 py-6 space-y-6">
                            {Object.entries(getGroupedExtras()).map(([category, extras]) => (
                                <div key={category} className="space-y-3">
                                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1 border-b border-gray-100 pb-1">{category}</label>
                                    <div className="space-y-2">
                                        {extras.map(extra => {
                                            const isSelected = selectedExtraIds.includes(extra.id);
                                            return (
                                                <div key={extra.id} onClick={() => toggleExtra(extra.id)} className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? 'bg-orange-50 border-orange-400 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                                                    <div className="flex items-center gap-3">
                                                        {isSelected ? <CheckSquare size={20} className="text-orange-600"/> : <Square size={20} className="text-gray-300"/>}
                                                        <span className={`text-sm font-bold ${isSelected ? 'text-orange-900' : 'text-slate-700'}`}>{extra.name}</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-400">+ R$ {extra.price.toFixed(2)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {isDrink ? (
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
                            <textarea 
                                className="w-full border-2 border-gray-100 bg-gray-50 rounded-2xl p-4 text-sm font-medium focus:border-blue-500 focus:bg-white outline-none transition-all resize-none" 
                                rows={3} 
                                placeholder="Ex: Sem cebola, ponto da carne..." 
                                value={notes} 
                                onChange={e => setNotes(e.target.value)} 
                            />
                        </div>
                    )}
                </div>
                <div className="p-6 border-t bg-gray-50 shrink-0">
                    <Button onClick={handleConfirm} className="w-full py-5 text-xl font-black shadow-2xl shadow-blue-200 rounded-2xl uppercase tracking-widest">
                        Adicionar • R$ {finalPrice.toFixed(2)}
                    </Button>
                </div>
            </div>
        </div>
    );
};
