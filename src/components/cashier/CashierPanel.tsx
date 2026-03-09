import React, { useState, useEffect } from 'react';
import socket from '../../core/socket';
import { CashSession } from '../../types';

export const CashierPanel: React.FC = () => {
    const [sessions, setSessions] = useState<CashSession[]>([]);

    useEffect(() => {
        socket.on('init', (data: any) => {
            setSessions(data.cashSessions);
        });
        socket.on('cash:session_updated', (session: CashSession) => {
            setSessions(prev => {
                const index = prev.findIndex(s => s.id === session.id);
                if (index !== -1) {
                    const newSessions = [...prev];
                    newSessions[index] = session;
                    return newSessions;
                }
                return [...prev, session];
            });
        });
        return () => {
            socket.off('init');
            socket.off('cash:session_updated');
        };
    }, []);

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">Caixa - Sessões</h2>
            <div className="space-y-2">
                {sessions.map(session => (
                    <div key={session.id} className="p-4 border rounded shadow flex justify-between">
                        <span>Operador: {session.operatorName}</span>
                        <span className="font-bold">Status: {session.status}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
