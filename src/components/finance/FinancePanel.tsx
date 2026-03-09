import React, { useState, useEffect } from 'react';
import socket from '../../core/socket';
import { Expense } from '../../types';

export const FinancePanel: React.FC = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);

    useEffect(() => {
        socket.on('init', (data: any) => {
            setExpenses(data.expenses);
        });
        socket.on('finance:expense_updated', (expense: Expense) => {
            setExpenses(prev => {
                const index = prev.findIndex(e => e.id === expense.id);
                if (index !== -1) {
                    const newExpenses = [...prev];
                    newExpenses[index] = expense;
                    return newExpenses;
                }
                return [...prev, expense];
            });
        });
        return () => {
            socket.off('init');
            socket.off('finance:expense_updated');
        };
    }, []);

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">Financeiro - Despesas</h2>
            <div className="space-y-2">
                {expenses.map(expense => (
                    <div key={expense.id} className="p-4 border rounded shadow flex justify-between">
                        <span>{expense.description}</span>
                        <span className="font-bold">R$ {expense.amount.toFixed(2)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
