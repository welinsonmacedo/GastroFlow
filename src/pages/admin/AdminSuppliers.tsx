import React from 'react';
import { useInventory } from '../../context/InventoryContext';
import { Truck } from 'lucide-react';

export const AdminSuppliers: React.FC = () => {
    const { state } = useInventory();
    const { suppliers } = state;

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Truck /> Fornecedores
            </h2>
            <div className="bg-white p-6 rounded-lg shadow-sm">
                {suppliers.length === 0 ? (
                    <p className="text-center text-gray-500">Nenhum fornecedor cadastrado.</p>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {suppliers.map(supplier => (
                            <li key={supplier.id} className="py-4 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-gray-800">{supplier.name}</p>
                                    <p className="text-sm text-gray-500">{supplier.contactName} - {supplier.phone}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-600">{supplier.city}, {supplier.state}</p>
                                    <p className="text-xs text-gray-400">{supplier.cnpj}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};
