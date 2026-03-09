import React, { useState, useEffect } from 'react';
import socket from '../core/socket';

export const WaiterPanel: React.FC = () => {
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

    const createOrder = () => {
        const newOrder = { id: Date.now().toString(), tableId: '1', items: [], status: 'PENDING' };
        socket.emit('order:create', newOrder);
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Painel do Garçom</h1>
            <button onClick={createOrder} className="bg-blue-500 text-white p-2 rounded">Novo Pedido</button>
            <ul className="mt-4">
                {orders.map(order => (
                    <li key={order.id} className="border p-2 mb-2">Pedido {order.id} - {order.status}</li>
                ))}
            </ul>
        </div>
    );
};
