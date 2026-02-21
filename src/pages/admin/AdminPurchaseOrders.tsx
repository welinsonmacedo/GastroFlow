import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRestaurant } from '../../context/RestaurantContext';

interface PurchaseOrder {
    id: string;
    created_at: string;
    supplier_id: string;
    total_cost: number;
    status: string;
    supplierName?: string;
}

export const AdminPurchaseOrders: React.FC = () => {
    const { state: restState } = useRestaurant();
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            if (!restState.tenantId) return;
            try {
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

                const formattedOrders = data.map((o: any) => ({ ...o, supplierName: o.suppliers.name }));
                setOrders(formattedOrders);
            } catch (err) {
                console.error('Error fetching purchase orders:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [restState.tenantId]);

    if (loading) {
        return <div className="p-4">Carregando ordens de pedido...</div>;
    }

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">Ordens de Pedido</h2>
            <div className="bg-white p-6 rounded-lg shadow-sm">
                {orders.length === 0 ? (
                    <p className="text-center text-gray-500">Ainda não há ordens de pedido. Crie uma a partir das sugestões de compra.</p>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr>
                                <th className="p-2">Data</th>
                                <th className="p-2">Fornecedor</th>
                                <th className="p-2">Custo Total</th>
                                <th className="p-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order.id}>
                                    <td className="p-2">{new Date(order.created_at).toLocaleDateString()}</td>
                                    <td className="p-2">{order.supplierName}</td>
                                    <td className="p-2">R$ {order.total_cost.toFixed(2)}</td>
                                    <td className="p-2">{order.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
