import React, { useState } from 'react';
import { useStaff } from '../../../context/StaffContext';
import { TimeEntry } from '../../../types';
import { Search, Calendar, FileSignature, ChevronDown, ChevronUp } from 'lucide-react';
import { PointCorrectionModal } from '../../../components/modals/PointCorrectionModal';

export const PointCorrectionTab: React.FC = () => {
    const { state: staffState } = useStaff();
    
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
    const [entryToCorrect, setEntryToCorrect] = useState<TimeEntry | null>(null);
    const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);

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

    // Filter entries by payroll month
    const monthlyEntries = staffState.timeEntries.filter(entry => {
        return isDateInPayrollMonth(entry.entryDate, filterMonth);
    });

    // Group by Staff
    const staffSummaries = staffState.users
        .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .map(user => {
            const userEntries = monthlyEntries.filter(e => e.staffId === user.id);
            return {
                user,
                entries: userEntries.sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime())
            };
        });

    const handleCorrectEntry = (entry: TimeEntry) => {
        setEntryToCorrect(entry);
        setIsCorrectionModalOpen(true);
    };

    return (
        <div className="space-y-6">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                         <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                         <input className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-500" placeholder="Buscar colaborador..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
                        <Calendar size={18} className="text-gray-400 ml-2"/>
                        <input type="month" className="bg-transparent text-sm font-bold text-gray-700 outline-none p-1" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
                    </div>
                </div>
                <div className="text-sm text-slate-500 italic">
                    Selecione um registro para realizar a correção e imprimir o termo de consentimento.
                </div>
            </div>

            <div className="space-y-4">
                {staffSummaries.map(({ user, entries }) => (
                    <div key={user.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div 
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => setExpandedStaffId(expandedStaffId === user.id ? null : user.id)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">{user.name.charAt(0)}</div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{user.name}</h3>
                                    <p className="text-xs text-slate-500">{user.role} • {entries.length} registros</p>
                                </div>
                            </div>
                            {expandedStaffId === user.id ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
                        </div>

                        {expandedStaffId === user.id && (
                            <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-400 uppercase font-bold border-b border-slate-200">
                                        <tr>
                                            <th className="pb-2 pl-2">Data</th>
                                            <th className="pb-2">Entrada</th>
                                            <th className="pb-2">Intervalo</th>
                                            <th className="pb-2">Saída</th>
                                            <th className="pb-2">Total</th>
                                            <th className="pb-2 text-center">Status</th>
                                            <th className="pb-2 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {entries.length === 0 ? (
                                            <tr><td colSpan={7} className="p-4 text-center text-gray-400 italic">Sem registros neste mês.</td></tr>
                                        ) : (
                                            entries.map(entry => {
                                                const hours = entry.clockIn && entry.clockOut 
                                                    ? (((new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / 3600000) || 0).toFixed(1) 
                                                    : '-';
                                                
                                                return (
                                                    <tr key={entry.id} className={`hover:bg-white transition-colors ${entry.status === 'CORRECTED' ? 'opacity-50 grayscale' : ''}`}>
                                                        <td className="p-3 pl-2 font-mono text-slate-600">
                                                            {new Date(entry.entryDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} <span className="text-xs text-slate-400">({new Date(entry.entryDate).toLocaleDateString('pt-BR', {weekday: 'short', timeZone: 'UTC'})})</span>
                                                        </td>
                                                        <td className="p-3 font-mono text-slate-600">{entry.clockIn ? new Date(entry.clockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</td>
                                                        <td className="p-3 font-mono text-xs text-slate-500">
                                                            {entry.breakStart && entry.breakEnd ? 
                                                                `${new Date(entry.breakStart).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - ${new Date(entry.breakEnd).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` 
                                                                : '--:--'}
                                                        </td>
                                                        <td className="p-3 font-mono text-slate-600">{entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</td>
                                                        <td className="p-3 font-bold text-slate-700">{hours}h</td>
                                                        <td className="p-3 text-center">
                                                            <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase border ${
                                                                entry.status === 'APPROVED' ? 'bg-green-100 text-green-700 border-green-200' : 
                                                                entry.status === 'REJECTED' ? 'bg-red-100 text-red-700 border-red-200' :
                                                                entry.status === 'CORRECTED' ? 'bg-gray-100 text-gray-500 border-gray-200 line-through' : 
                                                                'bg-yellow-100 text-yellow-700 border-yellow-200'
                                                            }`}>
                                                                {entry.status === 'CORRECTED' ? 'Corrigido' : entry.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            {entry.status !== 'CORRECTED' && (
                                                                <button onClick={() => handleCorrectEntry(entry)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-all flex items-center gap-1 ml-auto" title="Corrigir Ponto">
                                                                    <FileSignature size={16}/> <span className="text-xs font-bold hidden sm:inline">Corrigir</span>
                                                                </button>
                                                            )}
                                                            {entry.status === 'CORRECTED' && (
                                                                <span className="text-[10px] text-slate-400 italic">Inativo</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ))}
                
                {staffSummaries.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        Nenhum colaborador encontrado.
                    </div>
                )}
            </div>

            <PointCorrectionModal 
                isOpen={isCorrectionModalOpen} 
                onClose={() => setIsCorrectionModalOpen(false)} 
                entryToCorrect={entryToCorrect}
            />
        </div>
    );
};
