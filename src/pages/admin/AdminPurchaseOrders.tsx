import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRestaurant } from '../../context/RestaurantContext';
import { useInventory } from '../../context/InventoryContext';
import { Button } from '../../components/Button';
import { PlusCircle, ArrowLeft } from 'lucide-react';
import { PurchaseOrderView } from '../../components/admin/PurchaseOrderView';
import { PurchaseOrder, SuggestionItem } from '../../types';

export const AdminPurchaseOrders: React.FC = () => {
    const { state: restState } = useRestaurant();
    const { state: invState } = useInventory();
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'LIST' | 'CREATE'>('LIST');
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

    const fetchOrders = async () => {
        if (!restState.tenantId) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('purchase_orders')
                .select(`
                    id, 
                    created_at, 
                    supplier_id, 
                    total_cost, 
                    status,
                    suppliers (name)
                `)
                .eq('tenant_id', restState.tenantId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formattedOrders = data.map((o: any) => ({ ...o, supplierName: o.suppliers?.name || 'Desconhecido' }));
            setOrders(formattedOrders);
        } catch (err) {
            console.error('Error fetching purchase orders:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (view === 'LIST') {
            fetchOrders();
        }
    }, [restState.tenantId, view]);

    const handleNewOrder = () => {
        setView('CREATE');
        setSelectedSupplierId(null);
    };

    const handleSelectSupplier = (supplierId: string) => {
        setSelectedSupplierId(supplierId);
    };

    const handleBack = () => {
        setView('LIST');
        setSelectedSupplierId(null);
    };

    if (view === 'CREATE') {
        if (!selectedSupplierId) {
            return (
                <div className="p-4 animate-fade-in h-full flex flex-col">
                    <div className="flex items-center mb-4">
                        <Button onClick={handleBack} variant="outline" size="sm" className="mr-4">
                            <ArrowLeft size={16} className="mr-2"/> Voltar
                        </Button>
                        <h2 className="text-2xl font-bold">Nova Ordem: Selecione o Fornecedor</h2>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm flex-1 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {invState.suppliers.map(supplier => (
                                <div 
                                    key={supplier.id} 
                                    onClick={() => handleSelectSupplier(supplier.id)}
                                    className="p-4 border rounded-xl hover:bg-slate-50 cursor-pointer transition-colors flex flex-col items-center justify-center text-center h-32"
                                >
                                    <h3 className="font-bold text-lg text-slate-800">{supplier.name}</h3>
                                    <p className="text-sm text-slate-500">{supplier.contactName}</p>
                                </div>
                            ))}
                            {invState.suppliers.length === 0 && (
                                <p className="col-span-full text-center text-gray-500">Nenhum fornecedor cadastrado.</p>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        const supplier = invState.suppliers.find(s => s.id === selectedSupplierId);
        const emptyOrder = {
            supplierName: supplier?.name || 'Desconhecido',
            supplierId: selectedSupplierId,
            items: [] as SuggestionItem[]
        };

        return (
            <div className="p-4 h-full">
                <PurchaseOrderView 
                    order={emptyOrder} 
                    onBack={handleBack} 
                    inventoryItems={invState.inventory}
                />
            </div>
        );
    }

    if (loading) {
        return <div className="p-4">Carregando ordens de pedido...</div>;
    }

    return (
        <div className="p-4 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Ordens de Pedido</h2>
                <Button onClick={handleNewOrder}>
                    <PlusCircle size={16} className="mr-2"/> Nova Ordem
                </Button>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm flex-1 overflow-y-auto">
                {orders.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-gray-500 mb-4">Ainda não há ordens de pedido.</p>
                        <Button onClick={handleNewOrder} variant="outline">
                            Criar primeira ordem
                        </Button>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b">
                            <tr>
                                <th className="p-3">Data</th>
                                <th className="p-3">Fornecedor</th>
                                <th className="p-3">Custo Total</th>
                                <th className="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {orders.map(order => (
                                <tr key={order.id} className="hover:bg-slate-50">
                                    <td className="p-3">{new Date(order.created_at).toLocaleDateString()}</td>
                                    <td className="p-3 font-medium">{order.supplierName}</td>
                                    <td className="p-3 font-mono">R$ {order.total_cost.toFixed(2)}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                            order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                            order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {order.status === 'PENDING' ? 'Pendente' : order.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
