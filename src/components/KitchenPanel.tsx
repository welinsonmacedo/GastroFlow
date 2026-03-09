import React, { useState, useEffect } from 'react';
import socket from '../core/socket';

export const KitchenPanel: React.FC = () => {
    const [orders, setOrders] = useState<any[]>([]);

    useEffect(() => {
        socket.on('init', (data: any) => {
            setOrders(data.orders);
        });
        socket.on('order:created', (order: any) => {
            setOrders(prev => [...prev, order]);
        });
        socket.on('order:updated', (updatedOrder: any) => {
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
        });
        return () => {
            socket.off('init');
            socket.off('order:created');
            socket.off('order:updated');
        };
    }, []);

    const updateStatus = (order: any, status: string) => {
        socket.emit('order:update', { ...order, status });
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Painel da Cozinha</h1>
            <ul className="mt-4">
                {orders.map(order => (
                    <li key={order.id} className="border p-2 mb-2">
                        Pedido {order.id} - {order.status}
                        <button onClick={() => updateStatus(order, 'PREPARING')} className="bg-yellow-500 text-white p-1 rounded ml-2">Preparando</button>
                        <button onClick={() => updateStatus(order, 'READY')} className="bg-green-500 text-white p-1 rounded ml-2">Pronto</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};
