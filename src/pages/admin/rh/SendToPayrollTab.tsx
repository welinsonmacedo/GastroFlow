import React, { useState, useEffect } from 'react';
import { useStaff } from '../../../context/StaffContext';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/Button';
import { TimeEntry } from '../../../types';
import { User, Calendar, ArrowRight, Edit, Search } from 'lucide-react';

export const SendToPayrollTab: React.FC = () => {
    const { state: staffState } = useStaff();
    const { showAlert } = useUI();

    const [selectedStaffId, setSelectedStaffId] = useState<string>('');
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
    const [summary, setSummary] = useState({ overtime: 0, missingHours: 0, bankHours: 0 });
    const [monthlyEntries, setMonthlyEntries] = useState<TimeEntry[]>([]);

    const getStaffName = (id: string) => staffState.users.find(u => u.id === id)?.name || 'Desconhecido';

    useEffect(() => {
        if (!selectedStaffId) {
            setMonthlyEntries([]);
            setSummary({ overtime: 0, missingHours: 0, bankHours: 0 });
            return;
        }

        const userEntries = staffState.timeEntries.filter(entry => 
            entry.staffId === selectedStaffId && 
            entry.entryDate.toISOString().slice(0, 7) === filterMonth
        );
        setMonthlyEntries(userEntries.sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()));

        let overtime = 0;
        let missingHours = 0;

        const user = staffState.users.find(u => u.id === selectedStaffId);
        if (!user) return;

        const shift = staffState.shifts.find(s => s.id === user.shiftId);
        const targetHours = shift ? (new Date(`1970-01-01T${shift.endTime}`).getTime() - new Date(`1970-01-01T${shift.startTime}`).getTime()) / 3600000 - (shift.breakMinutes / 60) : 8;

        userEntries.forEach(entry => {
            if (entry.clockIn && entry.clockOut) {
                const hoursWorked = ((new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / 3600000);
                const balance = hoursWorked - targetHours;

                if (balance > 0) {
                    overtime += balance;
                } else {
                    missingHours += Math.abs(balance);
                }
            }
        });

        setSummary({
            overtime,
            missingHours,
            bankHours: user.bankHoursBalance || 0
        });

    }, [selectedStaffId, filterMonth, staffState.timeEntries, staffState.users, staffState.shifts]);

    const handleSendToPayroll = () => {
        if (!selectedStaffId) {
            showAlert({ title: 'Atenção', message: 'Por favor, selecione um colaborador para enviar os dados.', type: 'WARNING' });
            return;
        }
        showAlert({ title: 'Enviado', message: `Dados de ${getStaffName(selectedStaffId)} enviados para a pré-folha com sucesso!`, type: 'SUCCESS' });
    };

    return (
        <div className="space-y-6 p-6 bg-white rounded-3xl shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500">Colaborador</label>
                    <select 
                        className="w-full p-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-500" 
                        value={selectedStaffId} 
                        onChange={e => setSelectedStaffId(e.target.value)}
                    >
                        <option value="">Selecione um colaborador</option>
                        {staffState.users.map(user => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1 md:flex-none">
                     <label className="text-xs font-bold text-slate-500">Mês de Referência</label>
                    <input 
                        type="month" 
                        className="w-full p-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-500" 
                        value={filterMonth} 
                        onChange={e => setFilterMonth(e.target.value)} 
                    />
                </div>
            </div>

            {selectedStaffId && (
                <>
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b">
                            <h3 className="font-bold text-slate-700">Resumo Mensal de {getStaffName(selectedStaffId)}</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                                    <h4 className="font-bold text-green-800">Horas Extras (Mês)</h4>
                                    <p className="text-2xl font-black text-green-600">{summary.overtime.toFixed(1)}h</p>
                                </div>
                                <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                                    <h4 className="font-bold text-red-800">Horas Faltantes (Mês)</h4>
                                    <p className="text-2xl font-black text-red-600">{summary.missingHours.toFixed(1)}h</p>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                                    <h4 className="font-bold text-blue-800">Banco de Horas (Saldo)</h4>
                                    <p className="text-2xl font-black text-blue-600">{summary.bankHours.toFixed(1)}h</p>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={handleSendToPayroll} className="bg-green-600 hover:bg-green-700"><ArrowRight size={16} className="mr-2"/> Enviar para Pré-Folha</Button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                         <div className="p-4 bg-slate-50 border-b">
                            <h3 className="font-bold text-slate-700">Registros de Ponto</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b">
                                    <tr>
                                        <th className="p-4">Data</th>
                                        <th className="p-4">Entrada</th>
                                        <th className="p-4">Saída</th>
                                        <th className="p-4">Total</th>
                                        <th className="p-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {monthlyEntries.map(entry => {
                                        const hours = entry.clockIn && entry.clockOut 
                                            ? ((new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / 3600000).toFixed(1) 
                                            : '-';
                                        return (
                                            <tr key={entry.id}>
                                                <td className="p-4 font-bold">{new Date(entry.entryDate).toLocaleDateString()}</td>
                                                <td className="p-4 font-mono">{entry.clockIn ? new Date(entry.clockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</td>
                                                <td className="p-4 font-mono">{entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</td>
                                                <td className="p-4 font-black">{hours}h</td>
                                                <td className="p-4 text-center">
                                                    <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase border ${entry.status === 'APPROVED' ? 'bg-green-100 text-green-700 border-green-200' : (entry.status === 'REJECTED' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200')}`}>
                                                        {entry.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {monthlyEntries.length === 0 && (
                                        <tr><td colSpan={5} className="p-12 text-center text-gray-400 italic">Nenhum registro de ponto encontrado para este colaborador neste mês.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
