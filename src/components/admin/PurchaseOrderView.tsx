import React, { useState, useEffect } from 'react';
import { Button } from '../Button';
import { ArrowLeft, Save, X, PlusCircle, CheckCircle, Truck, FileText, Link as LinkIcon } from 'lucide-react';
import { InventoryItem, SuggestionItem, Expense } from '../../types';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import { supabase } from '../../lib/supabase';
import { useRestaurant } from '../../context/RestaurantContext';

interface PurchaseOrderViewProps {
    order: { 
        supplierName: string; 
        items: SuggestionItem[];
        supplierId?: string;
        id?: string;
        status?: string;
        linkedExpenseId?: string;
    };
    onBack: () => void;
    inventoryItems: InventoryItem[];
    isEditing?: boolean;
    orderId?: string;
}

export const PurchaseOrderView: React.FC<PurchaseOrderViewProps> = ({ order, onBack, inventoryItems, isEditing = false, orderId }) => {
    const { savePurchaseOrder, updatePurchaseOrder } = usePurchaseOrders();
    const { state: restState } = useRestaurant();
    const [items, setItems] = useState<SuggestionItem[]>(order.items);
    const [isAdding, setIsAdding] = useState(false);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState(order.status || 'PENDING');
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [availableExpenses, setAvailableExpenses] = useState<Expense[]>([]);
    const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(order.linkedExpenseId || null);
    const [linkedExpense, setLinkedExpense] = useState<Expense | null>(null);

    useEffect(() => {
        if (order.linkedExpenseId) {
            fetchLinkedExpense(order.linkedExpenseId);
        }
    }, [order.linkedExpenseId]);

    const fetchLinkedExpense = async (expenseId: string) => {
        const { data } = await supabase.from('expenses').select('*').eq('id', expenseId).single();
        if (data) setLinkedExpense(data);
    };

    const fetchAvailableExpenses = async () => {
        if (!order.supplierId || !restState.tenantId) return;
        
        const { data } = await supabase
            .from('expenses')
            .select('*')
            .eq('tenant_id', restState.tenantId)
            .eq('supplier_id', order.supplierId)
            .order('created_at', { ascending: false })
            .limit(20); // Last 20 expenses from this supplier

        if (data) {
            setAvailableExpenses(data);
        }
    };

    const handleSaveOrder = async (newStatus?: string, expenseIdToLink?: string) => {
        const validatedItems = items.map(item => ({
            ...item,
            suggestedQty: parseFloat(String(item.suggestedQty)) || 0,
            costPrice: parseFloat(String(item.costPrice)) || 0,
        }));

        if (validatedItems.some(item => item.suggestedQty <= 0)) {
            alert('A quantidade de todos os itens deve ser maior que zero.');
            return;
        }

        const totalCost = validatedItems.reduce((acc, item) => acc + (item.suggestedQty * item.costPrice), 0);
        
        const orderToSave = {
            ...order,
            items: validatedItems,
            totalCost,
            status: newStatus || status,
            linkedExpenseId: expenseIdToLink !== undefined ? expenseIdToLink : selectedExpenseId
        };

        try {
            if (isEditing && orderId) {
                await updatePurchaseOrder(orderId, orderToSave);
                if (newStatus) alert(`Status atualizado para ${newStatus === 'PLACED' ? 'Realizado' : 'Entregue'}!`);
                else alert('Ordem de pedido atualizada com sucesso!');
            } else {
                await savePurchaseOrder(orderToSave);
                alert('Ordem de pedido criada com sucesso!');
            }
            onBack();
        } catch (error: any) {
            console.error('Erro ao salvar ordem de pedido:', error);
            const errorMessage = error.message || 'Ocorreu um erro desconhecido.';
            alert(`Erro ao salvar ordem de pedido: ${errorMessage}`);
        }
    };

    const handleQtyChange = (itemId: string, newQty: number) => {
        if (isNaN(newQty)) return;
        setItems(prev => prev.map(item => item.id === itemId ? { ...item, suggestedQty: newQty } : item));
    };

    const handleCostPriceChange = (itemId: string, newCost: number) => {
        if (isNaN(newCost)) return;
        setItems(prev => prev.map(item => item.id === itemId ? { ...item, costPrice: newCost } : item));
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
            
            supplierName: order.supplierName
        };
        setItems(prev => [...prev, newItem]);
        setIsAdding(false);
        setSearch('');
    };

    const handleMarkAsPlaced = () => {
        if (window.confirm('Marcar pedido como REALIZADO? Isso indica que você já enviou o pedido ao fornecedor.')) {
            setStatus('PLACED');
            handleSaveOrder('PLACED');
        }
    };

    const handleMarkAsDelivered = async () => {
        await fetchAvailableExpenses();
        setShowLinkModal(true);
    };

    const confirmDelivery = (expenseId: string | null) => {
        setStatus('DELIVERED');
        handleSaveOrder('DELIVERED', expenseId || undefined);
        setShowLinkModal(false);
    };

    const totalCost = items.reduce((acc, item) => acc + (item.suggestedQty * item.costPrice), 0);

    const filteredInventory = inventoryItems.filter(invItem => 
        invItem.type && invItem.type !== 'COMPOSITE' &&
        !items.some(orderItem => orderItem.id === invItem.id) &&
        (invItem.name.toLowerCase().includes(search.toLowerCase()) ||
        (invItem.barcode && invItem.barcode.toString().includes(search)))
    );

    return (
        <div className="animate-fade-in h-full flex flex-col relative">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <Button onClick={onBack} variant="outline" size="sm"><ArrowLeft size={16} className="mr-2"/> Voltar</Button>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Ordem de Pedido: {order.supplierName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                status === 'PLACED' ? 'bg-blue-100 text-blue-700' :
                                status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                            }`}>
                                {status === 'PENDING' ? 'Pendente' : status === 'PLACED' ? 'Realizado' : status === 'DELIVERED' ? 'Entregue' : status}
                            </span>
                            {linkedExpense && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <LinkIcon size={12}/> Vinculado a: {linkedExpense.description}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    {isEditing && status === 'PENDING' && (
                        <Button size="sm" onClick={handleMarkAsPlaced} className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Truck size={16} className="mr-2"/> Marcar como Realizado
                        </Button>
                    )}
                    {isEditing && (status === 'PENDING' || status === 'PLACED') && (
                        <Button size="sm" onClick={handleMarkAsDelivered} className="bg-green-600 hover:bg-green-700 text-white">
                            <CheckCircle size={16} className="mr-2"/> Marcar como Entregue
                        </Button>
                    )}
                    <Button size="sm" onClick={() => handleSaveOrder()}><Save size={16} className="mr-2"/> Salvar Alterações</Button>
                </div>
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
                                        disabled={status === 'DELIVERED'}
                                    />
                                </td>
                                <td className="p-3">
                                    <input 
                                        type="number"
                                        value={item.costPrice}
                                        onChange={(e) => handleCostPriceChange(item.id, parseFloat(e.target.value))}
                                        className="w-full p-2 border rounded-md text-right"
                                        disabled={status === 'DELIVERED'}
                                    />
                                </td>
                                <td className="p-3 text-right font-mono font-bold">R$ {(item.suggestedQty * item.costPrice).toFixed(2)}</td>
                                <td className="p-3 text-center">
                                    {status !== 'DELIVERED' && (
                                        <Button onClick={() => handleRemoveItem(item.id)} variant="secondary" size="sm" className="text-red-500 hover:bg-red-100">
                                            <X size={16}/>
                                        </Button>
                                    )}
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
                                    <div>
                                        <span className="font-medium">{invItem.name}</span>
                                        {invItem.barcode && <span className="text-xs text-gray-400 ml-2">({invItem.barcode})</span>}
                                    </div>
                                    <span className="text-sm text-slate-500">R$ {invItem.costPrice.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {status !== 'DELIVERED' && (
                    <div className="p-4 border-t">
                        <Button onClick={() => setIsAdding(!isAdding)} variant="outline" size="sm">
                            <PlusCircle size={16} className="mr-2"/> {isAdding ? 'Cancelar' : 'Adicionar Item'}
                        </Button>
                    </div>
                )}
            </div>

            <div className="mt-4 bg-white p-4 rounded-xl border shadow-sm flex justify-end items-center font-bold">
                <span className="text-slate-500 mr-4">Total do Pedido:</span>
                <span className="text-2xl text-emerald-600">R$ {totalCost.toFixed(2)}</span>
            </div>

            {/* Link Expense Modal */}
            {showLinkModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <FileText className="text-blue-600"/> Vincular Nota Fiscal (Opcional)
                        </h3>
                        <p className="text-slate-600 mb-4 text-sm">
                            Selecione uma entrada de nota (despesa) já lançada para vincular a este pedido. Isso ajuda no rastreamento.
                        </p>
                        
                        <div className="max-h-60 overflow-y-auto border rounded-lg mb-4">
                            {availableExpenses.length === 0 ? (
                                <div className="p-4 text-center text-gray-500 text-sm">
                                    Nenhuma despesa recente encontrada para este fornecedor.
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {availableExpenses.map(expense => (
                                        <div 
                                            key={expense.id} 
                                            onClick={() => setSelectedExpenseId(expense.id === selectedExpenseId ? null : expense.id)}
                                            className={`p-3 cursor-pointer hover:bg-blue-50 transition-colors flex justify-between items-center ${selectedExpenseId === expense.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                        >
                                            <div>
                                                <div className="font-medium text-slate-800">{expense.description}</div>
                                                <div className="text-xs text-slate-500">{new Date(expense.dueDate).toLocaleDateString()}</div>
                                            </div>
                                            <div className="font-bold text-slate-700">
                                                R$ {expense.amount.toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowLinkModal(false)}>Cancelar</Button>
                            <Button onClick={() => confirmDelivery(selectedExpenseId)}>
                                {selectedExpenseId ? 'Vincular e Confirmar Entrega' : 'Confirmar Sem Vínculo'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
