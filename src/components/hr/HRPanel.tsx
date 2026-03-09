import React, { useState, useEffect } from 'react';
import socket from '../../core/socket';
import { User } from '../../types';

export const HRPanel: React.FC = () => {
    const [staff, setStaff] = useState<User[]>([]);

    useEffect(() => {
        socket.on('init', (data: any) => {
            setStaff(data.staff);
        });
        socket.on('hr:staff_updated', (member: User) => {
            setStaff(prev => {
                const index = prev.findIndex(s => s.id === member.id);
                if (index !== -1) {
                    const newStaff = [...prev];
                    newStaff[index] = member;
                    return newStaff;
                }
                return [...prev, member];
            });
        });
        return () => {
            socket.off('init');
            socket.off('hr:staff_updated');
        };
    }, []);

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">RH - Equipe</h2>
            <div className="space-y-2">
                {staff.map(member => (
                    <div key={member.id} className="p-4 border rounded shadow">
                        <h3 className="font-bold">{member.name}</h3>
                        <p>Cargo: {member.role}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};
