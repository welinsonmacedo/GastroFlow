import { useInventory } from '../context/InventoryContext';
import { useRestaurant } from '../context/RestaurantContext';
import { useAuth } from '../context/AuthProvider';
import { supabase, logAudit } from '../lib/supabase';

export const usePurchaseOrders = () => {
    const { state: invState, fetchData } = useInventory();
    const { state: restState, isLoading: isRestLoading } = useRestaurant();
    const { state: authState } = useAuth();
    const { tenantId } = restState;
    const currentUser = authState.currentUser;

    const savePurchaseOrder = async (order: any) => {
        if (!tenantId || !currentUser || isRestLoading) {
            throw new Error("Aguarde, os dados do restaurante ainda estão sendo carregados.");
        }

        // 1. Salvar a Ordem de Pedido
        const { data: orderData, error: orderError } = await supabase
            .from('purchase_orders')
            .insert({
                tenant_id: tenantId,
                supplier_id: order.supplierId || null,
                total_cost: order.totalCost,
                status: 'PENDING'
            })
            .select('id')
            .single();

        if (orderError) throw orderError;
        const orderId = orderData.id;

        // 2. Salvar os Itens da Ordem
        const orderItems = order.items.map((item: any) => ({
            tenant_id: tenantId,
            purchase_order_id: orderId,
            inventory_item_id: item.id,
            quantity: item.suggestedQty,
            unit_cost: item.costPrice
        }));

        const { error: itemsError } = await supabase.from('purchase_order_items').insert(orderItems);
        if (itemsError) throw itemsError;

        // 3. Log de Auditoria
        await logAudit(tenantId, currentUser.id, currentUser.name, 'Inventory', 'Criação de Ordem de Pedido', { orderId: orderId, supplier: order.supplierName, total: order.totalCost });

        fetchData(); // Refresh inventory data
    };

    return { savePurchaseOrder };
};
