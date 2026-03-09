import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRestaurant } from '../../context/RestaurantContext';
import { useInventory } from '../../context/InventoryContext';
import { Button } from '../../components/Button';
import { PlusCircle, ArrowLeft, Trash2, Edit, Printer } from 'lucide-react';
import { PurchaseOrderView } from '../../components/admin/PurchaseOrderView';
import { PurchaseOrder, SuggestionItem } from '../../types';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import { GlobalLoading } from '../../components/GlobalLoading';

export const AdminPurchaseOrders: React.FC = () => {
    const { state: restState } = useRestaurant();
    const { state: invState } = useInventory();
    const { deletePurchaseOrder, fetchPurchaseOrderItems } = usePurchaseOrders();
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'LIST' | 'CREATE' | 'EDIT'>('LIST');
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

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
                    linked_expense_id,
                    suppliers (name)
                `)
                .eq('tenant_id', restState.tenantId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formattedOrders = data.map((o: any) => ({ 
                ...o, 
                supplierName: o.suppliers?.name || 'Desconhecido',
                linkedExpenseId: o.linked_expense_id 
            }));
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
        setSelectedOrder(null);
    };

    const handleSelectSupplier = (supplierId: string) => {
        setSelectedSupplierId(supplierId);
    };

    const handleBack = () => {
        setView('LIST');
        setSelectedSupplierId(null);
        setSelectedOrder(null);
    };

    const handleDeleteOrder = async (orderId: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta ordem de pedido?')) {
            try {
                await deletePurchaseOrder(orderId);
                fetchOrders();
            } catch (error) {
                console.error('Erro ao excluir ordem:', error);
                alert('Erro ao excluir ordem de pedido.');
            }
        }
    };

    const handleEditOrder = async (order: PurchaseOrder) => {
        try {
            const items = await fetchPurchaseOrderItems(order.id);
            const orderToEdit = {
                ...order,
                items: items,
                supplierName: order.supplierName || 'Desconhecido'
            };
            setSelectedOrder(orderToEdit);
            setView('EDIT');
        } catch (error) {
            console.error('Erro ao carregar itens da ordem:', error);
            alert('Erro ao carregar detalhes da ordem.');
        }
    };

    const handlePrintOrder = async (order: PurchaseOrder) => {
        try {
            const items = await fetchPurchaseOrderItems(order.id);
            const printContent = `
                <html>
                <head>
                    <title>Ordem de Pedido #${order.id.slice(0, 8)}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        .header { margin-bottom: 20px; }
                        .total { margin-top: 20px; font-weight: bold; text-align: right; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>Ordem de Pedido</h2>
                        <p><strong>ID:</strong> ${order.id}</p>
                        <p><strong>Data:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
                        <p><strong>Fornecedor:</strong> ${order.supplierName}</p>
                        <p><strong>Status:</strong> ${order.status}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Qtd.</th>
                                <th>Unidade</th>
                                <th>Custo Unit.</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map((item: any) => `
                                <tr>
                                    <td>${item.name}</td>
                                    <td>${item.suggestedQty}</td>
                                    <td>${item.unit}</td>
                                    <td>R$ ${item.costPrice.toFixed(2)}</td>
                                    <td>R$ ${(item.suggestedQty * item.costPrice).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="total">
                        Total: R$ ${order.total_cost.toFixed(2)}
                    </div>
                </body>
                </html>
            `;
            
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow?.document;
            if (doc) {
                doc.open();
                doc.write(printContent);
                doc.close();
                
                setTimeout(() => {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                    setTimeout(() => {
                        if (document.body.contains(iframe)) {
                            document.body.removeChild(iframe);
                        }
                    }, 1000);
                }, 500);
            }
        } catch (error) {
            console.error('Erro ao preparar impressão:', error);
            alert('Erro ao preparar impressão.');
        }
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

    if (view === 'EDIT' && selectedOrder) {
        return (
            <div className="p-4 h-full">
                <PurchaseOrderView 
                    order={selectedOrder} 
                    onBack={handleBack} 
                    inventoryItems={invState.inventory}
                    isEditing={true}
                    orderId={selectedOrder.id}
                />
            </div>
        );
    }

    if (loading) {
        return <GlobalLoading message="Carregando ordens de pedido..." />;
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
                                <th className="p-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {orders.map(order => (
                                <tr key={order.id} className="hover:bg-slate-50 group">
                                    <td className="p-3">{new Date(order.created_at).toLocaleDateString()}</td>
                                    <td className="p-3 font-medium">{order.supplierName}</td>
                                    <td className="p-3 font-mono">R$ {order.total_cost.toFixed(2)}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                            order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                            order.status === 'PLACED' ? 'bg-blue-100 text-blue-700' :
                                            order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {order.status === 'PENDING' ? 'Pendente' : 
                                             order.status === 'PLACED' ? 'Realizado' : 
                                             order.status === 'DELIVERED' ? 'Entregue' : 
                                             order.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="sm" variant="outline" onClick={() => handlePrintOrder(order)} title="Imprimir">
                                                <Printer size={16} className="text-slate-500 hover:text-blue-600"/>
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleEditOrder(order)} title="Editar">
                                                <Edit size={16} className="text-slate-500 hover:text-blue-600"/>
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleDeleteOrder(order.id)} title="Excluir">
                                                <Trash2 size={16} className="text-slate-500 hover:text-red-600"/>
                                            </Button>
                                        </div>
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
