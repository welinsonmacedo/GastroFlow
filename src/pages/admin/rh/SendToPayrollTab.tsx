import React, { useState, useEffect } from 'react';
import { useStaff } from '../../../context/StaffContext';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/Button';
import { TimeEntry } from '../../../types';
import { ArrowRight, Edit } from 'lucide-react';
import { SummaryModal } from '../../../components/modals/SummaryModal';

export const SendToPayrollTab: React.FC = () => {
    const { state: staffState, addPayrollEntry, deletePayrollEntry } = useStaff();
    const { showAlert } = useUI();

    const [selectedStaffId, setSelectedStaffId] = useState<string>('');
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
    const [summary, setSummary] = useState({ overtime: 0, missingHours: 0, bankHours: 0 });
    const [monthlyEntries, setMonthlyEntries] = useState<TimeEntry[]>([]);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

    const existingEntry = staffState.payrollEntries.find(e => e.staffId === selectedStaffId && e.month === filterMonth);
    const getStaffName = (id: string) => staffState.users.find(u => u.id === id)?.name || 'Desconhecido';

    const pointClosingDay = staffState.legalSettings?.pointClosingDay || 30;

    const isDateInPayrollMonth = (date: Date, filterMonthStr: string) => {
        const [yearStr, monthStr] = filterMonthStr.split('-');
        const pYear = parseInt(yearStr, 10);
        const pMonth = parseInt(monthStr, 10);

        // Use UTC methods to avoid timezone offset issues since entryDate is parsed from 'YYYY-MM-DD'
        const entryYear = date.getUTCFullYear();
        const entryMonth = date.getUTCMonth() + 1;
        const entryDay = date.getUTCDate();

        const isCurrentMonth = entryYear === pYear && entryMonth === pMonth && entryDay <= pointClosingDay;
        
        const prevMonth = pMonth === 1 ? 12 : pMonth - 1;
        const prevYear = pMonth === 1 ? pYear - 1 : pYear;
        const isPrevMonth = entryYear === prevYear && entryMonth === prevMonth && entryDay > pointClosingDay;

        return isCurrentMonth || isPrevMonth;
    };

    const [yearStr, monthStr] = filterMonth.split('-');
    const pYear = parseInt(yearStr, 10);
    const pMonth = parseInt(monthStr, 10) - 1;
    const isPayrollClosed = staffState.closedPayrolls.some(cp => cp.month === pMonth && cp.year === pYear);

    useEffect(() => {
        if (!selectedStaffId) {
            setMonthlyEntries([]);
            setSummary({ overtime: 0, missingHours: 0, bankHours: 0 });
            return;
        }

        const userEntries = staffState.timeEntries.filter(entry => 
            entry.staffId === selectedStaffId && 
            isDateInPayrollMonth(entry.entryDate, filterMonth)
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
                let hoursWorked = ((new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / 3600000);
                
                if (entry.breakStart && entry.breakEnd) {
                    const breakDuration = ((new Date(entry.breakEnd).getTime() - new Date(entry.breakStart).getTime()) / 3600000);
                    hoursWorked -= breakDuration;
                }

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

    const handleSendToPayroll = async () => {
        if (!selectedStaffId) {
            showAlert({ title: 'Atenção', message: 'Por favor, selecione um colaborador para enviar os dados.', type: 'WARNING' });
            return;
        }
        try {
            await addPayrollEntry({
                staffId: selectedStaffId,
                month: filterMonth,
                overtimeHours: summary.overtime,
                missingHours: summary.missingHours,
            });
            showAlert({ title: 'Enviado', message: `Dados de ${getStaffName(selectedStaffId)} enviados para a pré-folha com sucesso!`, type: 'SUCCESS' });
        } catch (error) {
            showAlert({ title: 'Erro', message: 'Não foi possível enviar os dados para a pré-folha.', type: 'ERROR' });
        }
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
                                    <p className="text-2xl font-black text-green-600">{(summary.overtime || 0).toFixed(1)}h</p>
                                </div>
                                <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                                    <h4 className="font-bold text-red-800">Horas Faltantes (Mês)</h4>
                                    <p className="text-2xl font-black text-red-600">{(summary.missingHours || 0).toFixed(1)}h</p>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                                    <h4 className="font-bold text-blue-800">Banco de Horas (Saldo)</h4>
                                    <p className="text-2xl font-black text-blue-600">{(summary.bankHours || 0).toFixed(1)}h</p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                {isPayrollClosed ? (
                                    <div className="text-sm text-red-500 font-bold flex items-center bg-red-50 px-4 py-2 rounded-xl">
                                        Folha fechada. Não é possível alterar.
                                    </div>
                                ) : (
                                    <>
                                        <Button onClick={() => setIsSummaryModalOpen(true)} variant="secondary"><Edit size={16} className="mr-2"/> Editar Resumo</Button>
                                        {existingEntry ? (
                                            <Button onClick={async () => { await deletePayrollEntry(existingEntry.id); showAlert({ title: 'Sucesso', message: 'Dados removidos da pré-folha.', type: 'SUCCESS' }); }} variant="danger">Voltar para Edição</Button>
                                        ) : (
                                            <Button onClick={handleSendToPayroll} className="bg-green-600 hover:bg-green-700"><ArrowRight size={16} className="mr-2"/> Enviar para Pré-Folha</Button>
                                        )}
                                    </>
                                )}
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
                                        <th className="p-4">Saída Intervalo</th>
                                        <th className="p-4">Retorno Intervalo</th>
                                        <th className="p-4">Saída</th>
                                        <th className="p-4">Total</th>
                                        <th className="p-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {monthlyEntries.map(entry => {
                                        let hours = '-';
                                        if (entry.clockIn && entry.clockOut) {
                                            let h = (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / 3600000;
                                            if (entry.breakStart && entry.breakEnd) {
                                                h -= (new Date(entry.breakEnd).getTime() - new Date(entry.breakStart).getTime()) / 3600000;
                                            }
                                            hours = (h || 0).toFixed(1);
                                        }
                                        return (
                                            <tr key={entry.id}>
                                                <td className="p-4 font-bold">{new Date(entry.entryDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                                <td className="p-4 font-mono">{entry.clockIn ? new Date(entry.clockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</td>
                                                <td className="p-4 font-mono text-slate-500">{entry.breakStart ? new Date(entry.breakStart).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</td>
                                                <td className="p-4 font-mono text-slate-500">{entry.breakEnd ? new Date(entry.breakEnd).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</td>
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

            <SummaryModal 
                isOpen={isSummaryModalOpen} 
                onClose={() => setIsSummaryModalOpen(false)} 
                summary={summary}
                onSave={(newSummary) => {
                    setSummary(newSummary);
                    showAlert({ title: 'Sucesso', message: 'Resumo atualizado localmente. Clique em Enviar para salvar.', type: 'SUCCESS' });
                }}
            />
        </div>
    );
};
