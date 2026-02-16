
import React, { useEffect, useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { ShoppingCart, RefreshCcw, TrendingUp, AlertTriangle, Package } from 'lucide-react';

interface SuggestionItem {
    id: string;
    name: string;
    unit: string;
    currentStock: number;
    minStock: number;
    costPrice: number;
    suggestedQty: number;
    estimatedCost: number;
    salesCount: number; 
}

export const AdminPurchaseSuggestions: React.FC = () => {
    const { state: invState } = useInventory();
    const { state: restState } = useRestaurant();
    const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
    const [loading, setLoading] = useState(false);

    const calculateSuggestions = async () => {
        if (!restState.tenantId) return;
        setLoading(true);

        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: salesData } = await supabase
                .from('order_items')
                .select('product_id, quantity')
                .eq('tenant_id', restState.tenantId)
                .gte('created_at', thirtyDaysAgo.toISOString())
                .neq('status', 'CANCELLED');

            const popularityMap: { [inventoryId: string]: number } = {};
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
            const lowStockItems = invState.inventory.filter(i => 
                (i.type === 'INGREDIENT' || i.type === 'RESALE') && 
                i.quantity <= i.minQuantity
            );

            lowStockItems.forEach(item => {
                let suggest = (item.minQuantity * 2) - item.quantity;
                if (suggest <= 0) suggest = item.minQuantity;

                newSuggestions.push({
                    id: item.id,
                    name: item.name,
                    unit: item.unit,
                    currentStock: item.quantity,
                    minStock: item.minQuantity,
                    costPrice: item.costPrice,
                    suggestedQty: suggest,
                    estimatedCost: suggest * item.costPrice,
                    salesCount: popularityMap[item.id] || 0
                });
            });

            newSuggestions.sort((a, b) => b.salesCount - a.salesCount);
            setSuggestions(newSuggestions);

        } catch (error) {
            console.error("Erro ao calcular sugestões:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { calculateSuggestions(); }, [invState.inventory]);

    const totalEstimatedCost = suggestions.reduce((acc, item) => acc + item.estimatedCost, 0);

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
                <div><h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><ShoppingCart className="text-blue-600"/> Sugestão de Compras</h2><p className="text-sm text-gray-500">Itens com estoque crítico baseados na velocidade de vendas.</p></div>
                <Button onClick={calculateSuggestions} disabled={loading} variant="outline"><RefreshCcw size={18} className={loading ? "animate-spin" : ""}/> Atualizar</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between"><div><p className="text-xs font-bold text-gray-500 uppercase">Itens a Repor</p><p className="text-3xl font-black text-slate-800">{suggestions.length}</p></div><div className="bg-blue-50 p-3 rounded-xl text-blue-600"><Package size={24}/></div></div>
                <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between"><div><p className="text-xs font-bold text-gray-500 uppercase">Investimento Estimado</p><p className="text-3xl font-black text-emerald-600">R$ {totalEstimatedCost.toFixed(2)}</p></div><div className="bg-emerald-50 p-3 rounded-xl text-emerald-600"><TrendingUp size={24}/></div></div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b"><tr><th className="p-4">Item</th><th className="p-4 text-center">Nível Atual</th><th className="p-4 text-center">Popularidade (30d)</th><th className="p-4 text-right bg-blue-50/50 text-blue-700">Sugestão Compra</th><th className="p-4 text-right">Custo Est.</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {suggestions.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4"><div className="font-bold text-slate-800">{item.name}</div><div className="text-xs text-gray-400">Estoque Mínimo: {item.minStock} {item.unit}</div></td>
                                <td className="p-4 text-center"><span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded text-xs">{item.currentStock} {item.unit}</span></td>
                                <td className="p-4 text-center"><div className="flex items-center justify-center gap-1 text-xs font-medium text-slate-600"><TrendingUp size={14} className="text-emerald-500"/>{item.salesCount} vendas</div></td>
                                <td className="p-4 text-right bg-blue-50/30"><span className="text-lg font-black text-blue-700">{item.suggestedQty.toFixed(2)} <span className="text-xs font-normal text-slate-400">{item.unit}</span></span></td>
                                <td className="p-4 text-right font-mono font-bold text-slate-700">R$ {item.estimatedCost.toFixed(2)}</td>
                            </tr>
                        ))}
                        {suggestions.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-slate-400"><AlertTriangle size={32} className="mx-auto mb-2 opacity-20"/><p>Estoque saudável! Nenhum item precisa de reposição urgente.</p></td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
