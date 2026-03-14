
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { InventoryItem } from '@/types';
import { Minus, Plus, Square, CheckSquare } from 'lucide-react';
import { useInventory } from '@/core/context/InventoryContext';

interface AddToCartModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: InventoryItem | null;
    onConfirm: (data: { quantity: number; notes: string; extras: InventoryItem[] }) => void;
}

export const AddToCartModal: React.FC<AddToCartModalProps> = ({ isOpen, onClose, item, onConfirm }) => {
    const { state: invState } = useInventory();
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const [selectedExtras, setSelectedExtras] = useState<InventoryItem[]>([]);

    useEffect(() => {
        if (isOpen && item) {
            setQuantity(1);
            setNotes('');
            setSelectedExtras([]);
        }
    }, [isOpen, item]);

    const toggleExtra = (extra: InventoryItem) => {
        if (selectedExtras.find(e => e.id === extra.id)) {
            setSelectedExtras(selectedExtras.filter(e => e.id !== extra.id));
        } else {
            setSelectedExtras([...selectedExtras, extra]);
        }
    };

    const handleConfirm = () => {
        onConfirm({ quantity, notes, extras: selectedExtras });
        onClose();
    };

    if (!item) return null;

    // Filtra adicionais compatíveis (se houver lógica de categoria) ou mostra todos
    const availableExtras = invState.inventory.filter(i => 
        i.isExtra && 
        item.category && 
        (i.targetCategories || []).includes(item.category)
    );

    const total = ((item.salePrice || 0) + selectedExtras.reduce((acc, ex) => acc + (ex.salePrice || 0), 0)) * quantity;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={item.name} variant="dialog" maxWidth="xs" onSave={handleConfirm}>
            <div className="space-y-6">
                {/* Quantidade */}
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 bg-white shadow-sm rounded-xl hover:bg-red-50 text-red-500 transition-colors"><Minus size={20}/></button>
                    <span className="text-3xl font-black text-slate-800">{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)} className="p-3 bg-white shadow-sm rounded-xl hover:bg-blue-50 text-blue-500 transition-colors"><Plus size={20}/></button>
                </div>

                {/* Lista de Adicionais */}
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Adicionais Disponíveis</label>
                    <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                        {availableExtras.map(extra => {
                            const isSelected = selectedExtras.some(e => e.id === extra.id);
                            return (
                                <div key={extra.id} onClick={() => toggleExtra(extra)} className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                                    <div className="flex items-center gap-3">
                                        {isSelected ? <CheckSquare size={20} className="text-blue-600"/> : <Square size={20} className="text-gray-300"/>}
                                        <span className="text-sm font-bold text-slate-700">{extra.name}</span>
                                    </div>
                                    <span className="text-xs font-bold text-slate-500">+ R$ {extra.salePrice.toFixed(2)}</span>
                                </div>
                            );
                        })}
                        {availableExtras.length === 0 && (
                            <p className="text-xs text-center text-gray-400 py-2">Nenhum adicional disponível para esta categoria.</p>
                        )}
                    </div>
                </div>

                {/* Observações */}
                <div className="space-y-1">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Observações</label>
                    <textarea 
                        className="w-full border-2 p-3 rounded-xl text-sm focus:border-blue-500 outline-none resize-none" 
                        rows={2} 
                        placeholder="Ex: Sem cebola, bem passado..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </div>

                {/* Total Estimado no Modal */}
                <div className="pt-4 border-t flex justify-between items-center">
                    <div className="text-xs font-bold text-gray-500 uppercase">Subtotal</div>
                    <div className="text-2xl font-black text-blue-600">
                        R$ {total.toFixed(2)}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
