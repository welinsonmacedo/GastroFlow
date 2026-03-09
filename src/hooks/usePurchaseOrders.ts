import { useInventory } from '../context/InventoryContext';
import { useRestaurant } from '../context/RestaurantContext';
import { useAuth } from '../context/AuthProvider';
import { supabase, logAudit } from '../core/api/supabaseClient';

export const usePurchaseOrders = () => {
    const { fetchData } = useInventory();
    const { state: restState } = useRestaurant();
    const isRestLoading = restState.isLoading;
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
                status: order.status || 'PENDING',
                linked_expense_id: order.linkedExpenseId || null
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

    const deletePurchaseOrder = async (orderId: string) => {
        if (!tenantId || !currentUser) return;

        // 1. Delete items first (cascade usually handles this but good to be explicit or if cascade not set)
        const { error: itemsError } = await supabase.from('purchase_order_items').delete().eq('purchase_order_id', orderId);
        if (itemsError) throw itemsError;

        // 2. Delete order
        const { error: orderError } = await supabase.from('purchase_orders').delete().eq('id', orderId);
        if (orderError) throw orderError;

        await logAudit(tenantId, currentUser.id, currentUser.name, 'Inventory', 'Exclusão de Ordem de Pedido', { orderId });
    };

    const updatePurchaseOrder = async (orderId: string, order: any) => {
        if (!tenantId || !currentUser) return;

        // 1. Update Order details
        const { error: orderError } = await supabase
            .from('purchase_orders')
            .update({
                total_cost: order.totalCost,
                status: order.status,
                linked_expense_id: order.linkedExpenseId || null
            })
            .eq('id', orderId);
        
        if (orderError) throw orderError;

        // 2. Update Items (Strategy: Delete all and recreate - simpler for now)
        // In a real app, you might want to diff and update/insert/delete specific rows
        const { error: deleteError } = await supabase.from('purchase_order_items').delete().eq('purchase_order_id', orderId);
        if (deleteError) throw deleteError;

        const orderItems = order.items.map((item: any) => ({
            tenant_id: tenantId,
            purchase_order_id: orderId,
            inventory_item_id: item.id,
            quantity: item.suggestedQty,
            unit_cost: item.costPrice
        }));

        const { error: insertError } = await supabase.from('purchase_order_items').insert(orderItems);
        if (insertError) throw insertError;

        await logAudit(tenantId, currentUser.id, currentUser.name, 'Inventory', 'Atualização de Ordem de Pedido', { orderId, total: order.totalCost });
    };

    const fetchPurchaseOrderItems = async (orderId: string) => {
        const { data, error } = await supabase
            .from('purchase_order_items')
            .select(`
                inventory_item_id,
                quantity,
                unit_cost,
                inventory_items (name, unit, min_quantity, quantity, cost_price)
            `)
            .eq('purchase_order_id', orderId);

        if (error) throw error;
        
        return data.map((item: any) => ({
            id: item.inventory_item_id,
            name: item.inventory_items?.name || 'Item Removido',
            unit: item.inventory_items?.unit || 'UN',
            currentStock: item.inventory_items?.quantity || 0,
            minStock: item.inventory_items?.min_quantity || 0,
            costPrice: item.unit_cost,
            suggestedQty: item.quantity,
            estimatedCost: item.unit_cost,
            salesCount: 0
        }));
    };

    return { savePurchaseOrder, deletePurchaseOrder, updatePurchaseOrder, fetchPurchaseOrderItems };
};
