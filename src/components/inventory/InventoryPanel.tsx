import React, { useState, useEffect } from 'react';
import socket from '../../core/socket';
import { InventoryItem } from '../../types';

export const InventoryPanel: React.FC = () => {
    const [items, setItems] = useState<InventoryItem[]>([]);

    useEffect(() => {
        socket.on('init', (data: any) => {
            setItems(data.inventory);
        });
        socket.on('inventory:updated', (item: InventoryItem) => {
            setItems(prev => {
                const index = prev.findIndex(i => i.id === item.id);
                if (index !== -1) {
                    const newItems = [...prev];
                    newItems[index] = item;
                    return newItems;
                }
                return [...prev, item];
            });
        });
        return () => {
            socket.off('init');
            socket.off('inventory:updated');
        };
    }, []);

    const updateItem = (item: InventoryItem) => {
        socket.emit('inventory:update', item);
    };

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">Estoque</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(item => (
                    <div key={item.id} className="p-4 border rounded shadow">
                        <h3 className="font-bold">{item.name}</h3>
                        <p>Quantidade: {item.quantity} {item.unit}</p>
                        <button 
                            className="mt-2 bg-blue-500 text-white p-2 rounded"
                            onClick={() => updateItem({ ...item, quantity: item.quantity + 1 })}
                        >
                            Adicionar
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
