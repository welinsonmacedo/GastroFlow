
import React, { useState } from 'react';
import { InventoryItemsView } from './inventory/InventoryItemsView';
import { InventoryNewItemView } from './inventory/InventoryNewItemView';
import { InventoryEntryView } from './inventory/InventoryEntryView';
import { InventoryCountView } from './inventory/InventoryCountView';
import { InventorySuppliersView } from './inventory/InventorySuppliersView';
import { InventoryLogsView } from './inventory/InventoryLogsView';
import { Package, Truck, FileText, ArrowDownToLine, ClipboardList } from 'lucide-react';

export type InventoryView = 'ITEMS' | 'SUPPLIERS' | 'LOGS' | 'ENTRY' | 'COUNT' | 'NEW_ITEM';

interface AdminInventoryProps {
    view?: InventoryView;
}

export const AdminInventory: React.FC<AdminInventoryProps> = ({ view: controlledView }) => {
  const [internalView, setInternalView] = useState<InventoryView>('ITEMS');
  
  const currentView = controlledView || internalView;

  const tabs = [
    { id: 'ITEMS', label: 'Itens', icon: Package },
    { id: 'ENTRY', label: 'Entrada', icon: ArrowDownToLine },
    { id: 'COUNT', label: 'Contagem', icon: ClipboardList },
    { id: 'SUPPLIERS', label: 'Fornecedores', icon: Truck },
    { id: 'LOGS', label: 'Logs', icon: FileText },
  ];

  return (
   <div className="animate-fade-in w-full h-full flex flex-col p-0">
        {!controlledView && (
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Estoque</h2>
                <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setInternalView(tab.id as InventoryView)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                currentView === tab.id 
                                ? 'bg-orange-100 text-orange-600 shadow-sm' 
                                : 'text-slate-500 hover:bg-gray-50 hover:text-slate-700'
                            }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
        )}

        <div className={`flex-1 ${!controlledView ? 'bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden' : ''}`}>
            {currentView === 'ITEMS' && <InventoryItemsView onNewItem={() => setInternalView('NEW_ITEM')} />}
            {currentView === 'NEW_ITEM' && <InventoryNewItemView onCancel={() => setInternalView('ITEMS')} />}
            {currentView === 'ENTRY' && <InventoryEntryView />}
            {currentView === 'COUNT' && <InventoryCountView />}
            {currentView === 'SUPPLIERS' && <InventorySuppliersView />}
            {currentView === 'LOGS' && <InventoryLogsView />}
        </div>
    </div>
  );
};
