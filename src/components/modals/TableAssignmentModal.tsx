import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useOrder } from '../../context/OrderContext';
import { User } from '../../types';
import { Button } from '../Button';
import { Search, CheckCircle, AlertCircle } from 'lucide-react';

interface TableAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    waiter: User | null;
}

export const TableAssignmentModal: React.FC<TableAssignmentModalProps> = ({ isOpen, onClose, waiter }) => {
    const { state: orderState, assignTable } = useOrder();
    const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen && waiter) {
            // Pre-select tables assigned to this waiter
            const assigned = new Set<string>();
            orderState.tables.forEach(t => {
                if (t.assignedWaiterId === waiter.id) {
                    assigned.add(t.id);
                }
            });
            setSelectedTables(assigned);
        }
    }, [isOpen, waiter, orderState.tables]);

    const handleToggleTable = (tableId: string) => {
        const newSet = new Set(selectedTables);
        if (newSet.has(tableId)) {
            newSet.delete(tableId);
        } else {
            newSet.add(tableId);
        }
        setSelectedTables(newSet);
    };

    const handleSave = async () => {
        if (!waiter) return;

        // 1. Unassign tables that were deselected (if they were assigned to this waiter)
        const tablesToUnassign = orderState.tables.filter(t => t.assignedWaiterId === waiter.id && !selectedTables.has(t.id));
        
        // 2. Assign tables that are selected
        const tablesToAssign = Array.from(selectedTables);

        // Execute updates
        const promises = [
            ...tablesToUnassign.map(t => assignTable(t.id, null)),
            ...tablesToAssign.map(id => {
                const table = orderState.tables.find(t => t.id === id);
                // Only update if not already assigned to this waiter
                if (table?.assignedWaiterId !== waiter.id) {
                    return assignTable(id, waiter.id);
                }
                return Promise.resolve();
            })
        ];

        await Promise.all(promises);
        onClose();
    };

    const filteredTables = orderState.tables
        .filter(t => t.number.toString().includes(searchQuery))
        .sort((a, b) => a.number - b.number);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Atribuir Mesas - ${waiter?.name}`} variant="dialog" maxWidth="md">
            <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                    <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={20} />
                    <div>
                        <p className="text-sm text-blue-800">
                            Selecione as mesas que o garçom <strong>{waiter?.name}</strong> será responsável.
                            Ele receberá notificações apenas destas mesas se o modo "Atribuir Mesas" estiver ativo.
                        </p>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar mesa..." 
                        className="w-full pl-10 pr-4 py-2.5 border rounded-xl bg-gray-50 focus:bg-white transition-colors outline-none focus:border-blue-500"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[400px] overflow-y-auto p-1">
                    {filteredTables.map(table => {
                        const isSelected = selectedTables.has(table.id);
                        const assignedToOther = table.assignedWaiterId && table.assignedWaiterId !== waiter?.id;
                        
                        return (
                            <div 
                                key={table.id} 
                                onClick={() => handleToggleTable(table.id)}
                                className={`
                                    relative p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-1
                                    ${isSelected 
                                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                        : (assignedToOther ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50')
                                    }
                                `}
                            >
                                <span className="text-2xl font-black">{table.number}</span>
                                {isSelected && <div className="absolute top-2 right-2 text-blue-600"><CheckCircle size={16} fill="currentColor" className="text-white"/></div>}
                                {assignedToOther && <div className="text-[9px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-500 font-bold uppercase">Ocupada</div>}
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSave} className="w-full sm:w-auto">Salvar Atribuições</Button>
                </div>
            </div>
        </Modal>
    );
};
