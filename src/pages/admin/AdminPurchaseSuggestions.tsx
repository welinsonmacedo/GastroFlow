
import React, { useEffect, useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { ShoppingCart, RefreshCcw, TrendingUp, AlertTriangle, Package, ArrowLeft, PlusCircle, X, Save } from 'lucide-react';
import { InventoryItem, SuggestionItem } from '../../types';
import { PurchaseOrderView } from '../../components/admin/PurchaseOrderView';

export const AdminPurchaseSuggestions: React.FC = () => {
    const { state: invState } = useInventory();
    const { state: restState } = useRestaurant();
    const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Record<string, number>>({}); // { [itemId]: quantity }
    const [view, setView] = useState<'LIST' | 'ORDER'>('LIST');
    const [activeOrder, setActiveOrder] = useState<{ supplierName: string; items: SuggestionItem[], supplierId?: string } | null>(null);

    const calculateSuggestions = async () => {
        if (!restState.tenantId) return;
        setLoading(true);

        try {
            // 1. Buscar histórico de vendas dos últimos 30 dias para calcular popularidade
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: salesData } = await supabase
                .from('order_items')
                .select('product_id, quantity')
                .eq('tenant_id', restState.tenantId)
                .gte('created_at', thirtyDaysAgo.toISOString())
                .neq('status', 'CANCELLED');

            // Mapa de popularidade por ID de Inventário
            const popularityMap: { [inventoryId: string]: number } = {};

            // Precisamos da relação de Produtos para saber qual item de estoque foi baixado
            const { data: products } = await supabase
                .from('products')
                .select('id, linked_inventory_item_id')
                .eq('tenant_id', restState.tenantId);

            salesData?.forEach((sale: any) => {
                const prod = products?.find((p: any) => p.id === sale.product_id);
                if (prod && prod.linked_inventory_item_id) {
                    const invId = prod.linked_inventory_item_id;
                    popularityMap[invId] = (popularityMap[invId] || 0) + Number(sale.quantity);
                }
            });

            const newSuggestions: SuggestionItem[] = [];

            // 2. Filtrar itens abaixo do mínimo (Apenas Matéria Prima e Revenda)
            // Itens compostos (Pratos) não se compram, se produzem, então focamos nos ingredientes.
            const lowStockItems = invState.inventory.filter(i => 
                (i.type === 'INGREDIENT' || i.type === 'RESALE') && 
                i.quantity <= i.minQuantity
            );

            lowStockItems.forEach(item => {
                // Lógica de Sugestão: Repor até o dobro do mínimo (Estoque de Segurança Confortável)
                // Fórmula: (Mínimo * 2) - Atual.
                let suggest = (item.minQuantity * 2) - item.quantity;
                if (suggest <= 0) suggest = item.minQuantity; // Fallback mínimo

                newSuggestions.push({
                    id: item.id,
                    name: item.name,
                    unit: item.unit,
                    currentStock: item.quantity,
                    minStock: item.minQuantity,
                    costPrice: item.costPrice,
                    suggestedQty: suggest,
                    estimatedCost: suggest * item.costPrice,
                    salesCount: popularityMap[item.id] || 0,
                    supplierId: item.supplierId,
                    supplierName: invState.suppliers.find(s => s.id === item.supplierId)?.name || 'Não especificado'
                });
            });

            // 3. Ordenar por Popularidade (Mais vendidos primeiro) para priorizar reposição
            newSuggestions.sort((a, b) => b.salesCount - a.salesCount);

            setSuggestions(newSuggestions);

        } catch (error) {
            console.error("Erro ao calcular sugestões:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        calculateSuggestions();
    }, [invState.inventory]);

    const totalEstimatedCost = suggestions.reduce((acc, item) => acc + item.estimatedCost, 0);

    const groupedBySupplier = suggestions.reduce((acc, item) => {
        const key = item.supplierId || 'unknown';
        if (!acc[key]) {
            acc[key] = {
                supplierName: item.supplierName || 'Fornecedor não especificado',
                items: []
            };
        }
        acc[key].items.push(item);
        return acc;
    }, {} as Record<string, { supplierName: string; items: SuggestionItem[] }>);

    const handleSelectItem = (itemId: string, quantity: number) => {
        setSelectedItems(prev => {
            const newSelected = { ...prev };
            if (newSelected[itemId]) {
                delete newSelected[itemId];
            } else {
                newSelected[itemId] = quantity;
            }
            return newSelected;
        });
    };

    const handleCreateOrder = (supplierName: string, items: SuggestionItem[], supplierId?: string) => {
        const itemsForOrder = items.filter(item => selectedItems[item.id]);
        if (itemsForOrder.length === 0) return;

        setActiveOrder({
            supplierName,
            supplierId,
            items: itemsForOrder.map(item => ({ ...item, suggestedQty: selectedItems[item.id] }))
        });
        setView('ORDER');
    };

    return (
        <div className="space-y-4 animate-fade-in h-full flex flex-col">
            {view === 'LIST' ? (
                <>
                    {/* Cards de Resumo */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Itens a Repor</p>
                                <p className="text-2xl font-black text-slate-800">{suggestions.length}</p>
                            </div>
                            <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Package size={20}/></div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Investimento Estimado</p>
                                <p className="text-2xl font-black text-emerald-600">R$ {totalEstimatedCost.toFixed(2)}</p>
                            </div>
                            <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600"><TrendingUp size={20}/></div>
                        </div>
                    </div>

                    {/* Tabela de Sugestões */}
                    <div className="overflow-y-auto custom-scrollbar flex-1">
                        {Object.entries(groupedBySupplier).map(([supplierId, group]) => (
                            <div key={supplierId} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-4">
                                <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                                    <h3 className="font-bold text-slate-800">{group.supplierName}</h3>
                                    <Button 
                                        onClick={() => handleCreateOrder(group.supplierName, group.items, supplierId)}
                                        disabled={group.items.filter(item => selectedItems[item.id]).length === 0}
                                        size="sm"
                                    >
                                        Criar Ordem de Pedido
                                    </Button>
                                </div>
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b">
                                        <tr>
                                            <th className="p-4 w-12 bg-slate-50"></th>
                                            <th className="p-4 bg-slate-50">Item</th>
                                            <th className="p-4 text-center bg-slate-50">Nível Atual</th>
                                            <th className="p-4 text-center bg-slate-50">Popularidade (30d)</th>
                                            <th className="p-4 text-right bg-blue-50/50 text-blue-700">Sugestão Compra</th>
                                            <th className="p-4 text-right bg-slate-50">Custo Est.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {group.items.map(item => (
                                            <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${selectedItems[item.id] ? 'bg-blue-50' : ''}`}>
                                                <td className="p-4 w-12 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        checked={!!selectedItems[item.id]}
                                                        onChange={() => handleSelectItem(item.id, item.suggestedQty)}
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-slate-800">{item.name}</div>
                                                    <div className="text-xs text-gray-400">Estoque Mínimo: {item.minStock} {item.unit}</div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded text-xs">
                                                        {item.currentStock} {item.unit}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center gap-1 text-xs font-medium text-slate-600">
                                                        <TrendingUp size={14} className="text-emerald-500"/>
                                                        {item.salesCount} vendas
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right bg-blue-50/30">
                                                    <span className="text-lg font-black text-blue-700">
                                                        {item.suggestedQty.toFixed(2)} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right font-mono font-bold text-slate-700">
                                                    R$ {item.estimatedCost.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                        {suggestions.length === 0 && (
                            <div className="p-10 text-center text-slate-400">
                                <AlertTriangle size={32} className="mx-auto mb-2 opacity-20"/>
                                <p>Estoque saudável! Nenhum item precisa de reposição urgente.</p>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                activeOrder && (
                    <PurchaseOrderView 
                        order={activeOrder} 
                        onBack={() => setView('LIST')}
                        inventoryItems={invState.inventory}
                    />
                )
            )}
        </div>
    );
};
