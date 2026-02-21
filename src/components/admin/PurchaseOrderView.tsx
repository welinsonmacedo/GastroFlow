import React, { useState } from 'react';
import { Button } from '../Button';
import { ArrowLeft, Save, X, PlusCircle } from 'lucide-react';
import { InventoryItem, SuggestionItem } from '../../types';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';

interface PurchaseOrderViewProps {
    order: { 
        supplierName: string; 
        items: SuggestionItem[];
        supplierId?: string;
    };
    onBack: () => void;
    inventoryItems: InventoryItem[];
}

export const PurchaseOrderView: React.FC<PurchaseOrderViewProps> = ({ order, onBack, inventoryItems }) => {
    const { savePurchaseOrder } = usePurchaseOrders();
    const [items, setItems] = useState<SuggestionItem[]>(order.items);
    const [isAdding, setIsAdding] = useState(false);
    const [search, setSearch] = useState('');

    const handleSaveOrder = async () => {
        const totalCost = items.reduce((acc, item) => acc + (item.suggestedQty * item.costPrice), 0);
        const orderToSave = {
            ...order,
            items,
            totalCost
        };
        try {
            await savePurchaseOrder(orderToSave);
            alert('Ordem de pedido salva com sucesso!');
            onBack();
        } catch (error) {
            console.error('Erro ao salvar ordem de pedido:', error);
            alert('Erro ao salvar ordem de pedido. Tente novamente.');
        }
    };

    const handleQtyChange = (itemId: string, newQty: number) => {
        setItems(prev => prev.map(item => item.id === itemId ? { ...item, suggestedQty: newQty } : item));
    };

    const handleRemoveItem = (itemId: string) => {
        setItems(prev => prev.filter(item => item.id !== itemId));
    };

    const handleAddItem = (itemToAdd: InventoryItem) => {
        const newItem: SuggestionItem = {
            id: itemToAdd.id,
            name: itemToAdd.name,
            unit: itemToAdd.unit,
            currentStock: itemToAdd.quantity,
            minStock: itemToAdd.minQuantity,
            costPrice: itemToAdd.costPrice,
            suggestedQty: 1, 
            estimatedCost: itemToAdd.costPrice,
            salesCount: 0, 
            supplierId: itemToAdd.supplierId,
            supplierName: order.supplierName
        };
        setItems(prev => [...prev, newItem]);
        setIsAdding(false);
        setSearch('');
    };

    const totalCost = items.reduce((acc, item) => acc + (item.suggestedQty * item.costPrice), 0);

    const filteredInventory = inventoryItems.filter(invItem => 
        (order.supplierId ? invItem.supplierId === order.supplierId : true) &&
        !items.some(orderItem => orderItem.id === invItem.id) &&
        invItem.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="animate-fade-in h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <Button onClick={onBack} variant="outline" size="sm"><ArrowLeft size={16} className="mr-2"/> Voltar</Button>
                <h3 className="text-lg font-bold text-slate-800">Ordem de Pedido: {order.supplierName}</h3>
                <Button size="sm" onClick={handleSaveOrder}><Save size={16} className="mr-2"/> Salvar Ordem</Button>
            </div>

            <div className="bg-white rounded-xl border shadow-sm flex-1 overflow-y-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b">
                        <tr>
                            <th className="p-3">Item</th>
                            <th className="p-3 w-32 text-center">Qtd.</th>
                            <th className="p-3 w-32 text-right">Custo Unit.</th>
                            <th className="p-3 w-32 text-right">Subtotal</th>
                            <th className="p-3 w-16"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(item => (
                            <tr key={item.id} className="border-b">
                                <td className="p-3 font-bold text-slate-700">{item.name}</td>
                                <td className="p-3">
                                    <input 
                                        type="number"
                                        value={item.suggestedQty}
                                        onChange={(e) => handleQtyChange(item.id, parseFloat(e.target.value))}
                                        className="w-full p-2 border rounded-md text-center"
                                    />
                                </td>
                                <td className="p-3 text-right font-mono">R$ {item.costPrice.toFixed(2)}</td>
                                <td className="p-3 text-right font-mono font-bold">R$ {(item.suggestedQty * item.costPrice).toFixed(2)}</td>
                                <td className="p-3 text-center">
                                    <Button onClick={() => handleRemoveItem(item.id)} variant="ghost" size="sm" className="text-red-500 hover:bg-red-100">
                                        <X size={16}/>
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {isAdding && (
                    <div className="p-4 bg-slate-50 border-t">
                        <input 
                            type="text"
                            placeholder="Buscar item para adicionar..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full p-2 border rounded-md mb-2"
                        />
                        <div className="max-h-40 overflow-y-auto">
                            {filteredInventory.map(invItem => (
                                <div key={invItem.id} onClick={() => handleAddItem(invItem)} className="p-2 hover:bg-slate-100 cursor-pointer flex justify-between">
                                    <span>{invItem.name}</span>
                                    <span className="text-sm text-slate-500">R$ {invItem.costPrice.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="p-4 border-t">
                    <Button onClick={() => setIsAdding(!isAdding)} variant="outline" size="sm">
                        <PlusCircle size={16} className="mr-2"/> {isAdding ? 'Cancelar' : 'Adicionar Item'}
                    </Button>
                </div>
            </div>

            <div className="mt-4 bg-white p-4 rounded-xl border shadow-sm flex justify-end items-center font-bold">
                <span className="text-slate-500 mr-4">Total do Pedido:</span>
                <span className="text-2xl text-emerald-600">R$ {totalCost.toFixed(2)}</span>
            </div>
        </div>
    );
};
