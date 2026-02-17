
import React from 'react';
import { InventoryItemsView } from './inventory/InventoryItemsView';
import { InventoryNewItemView } from './inventory/InventoryNewItemView';
import { InventoryEntryView } from './inventory/InventoryEntryView';
import { InventoryCountView } from './inventory/InventoryCountView';
import { InventorySuppliersView } from './inventory/InventorySuppliersView';
import { InventoryLogsView } from './inventory/InventoryLogsView';

interface AdminInventoryProps {
    view: 'ITEMS' | 'SUPPLIERS' | 'LOGS' | 'ENTRY' | 'COUNT' | 'NEW_ITEM';
}

export const AdminInventory: React.FC<AdminInventoryProps> = ({ view }) => {
  return (
    <div className="animate-fade-in w-full h-full flex flex-col">
        {view === 'ITEMS' && <InventoryItemsView />}
        {view === 'NEW_ITEM' && <InventoryNewItemView />}
        {view === 'ENTRY' && <InventoryEntryView />}
        {view === 'COUNT' && <InventoryCountView />}
        {view === 'SUPPLIERS' && <InventorySuppliersView />}
        {view === 'LOGS' && <InventoryLogsView />}
    </div>
  );
};
