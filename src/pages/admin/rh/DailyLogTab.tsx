import React, { useState } from 'react';
import { useStaff } from '../../../context/StaffContext';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/Button';
import { TimeEntry } from '../../../types';
import { Search, Calendar, Edit, Plus, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { TimeEntryModal } from '../../../components/modals/TimeEntryModal';
import { SummaryModal } from '../../../components/modals/SummaryModal';
import { ImportAFDModal } from '../../../components/modals/ImportAFDModal';

export const DailyLogTab: React.FC = () => {
    const { state: staffState } = useStaff();
    const { showAlert } = useUI();
    
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState<TimeEntry | null>(null);
    const [selectedStaffId, setSelectedStaffId] = useState<string>('');
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [summary, setSummary] = useState({ overtime: 0, missingHours: 0, bankHours: 0 });
    
    const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);

    const getStaffName = (id: string) => staffState.users.find(u => u.id === id)?.name || 'Desconhecido';
    
    // Filter entries by month
    const monthlyEntries = staffState.timeEntries.filter(entry => {
        const entryMonth = entry.entryDate.toISOString().slice(0, 7);
        return entryMonth === filterMonth;
    });

    // Group by Staff
    const staffSummaries = staffState.users
        .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .map(user => {
            const userEntries = monthlyEntries.filter(e => e.staffId === user.id);
            
            // Calculate totals
            let totalHours = 0;
            let overtime = 0;
            let missing = 0;
            
            // Simple calculation logic (can be improved with shift details)
            const shift = staffState.shifts.find(s => s.id === user.shiftId);
            const dailyTarget = shift ? (new Date(`1970-01-01T${shift.endTime}`).getTime() - new Date(`1970-01-01T${shift.startTime}`).getTime()) / 3600000 - (shift.breakMinutes / 60) : 8;

            userEntries.forEach(entry => {
                if (entry.clockIn && entry.clockOut) {
                    const worked = (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / 3600000;
                    totalHours += worked;
                    const diff = worked - dailyTarget;
                    if (diff > 0) overtime += diff;
                    else missing += Math.abs(diff);
                }
            });

            return {
                user,
                entries: userEntries.sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()),
                totalHours,
                overtime,
                missing,
                bankBalance: user.bankHoursBalance || 0
            };
        });

    const handleEditEntry = (entry: TimeEntry) => {
        setEntryToEdit(entry);
        setIsEntryModalOpen(true);
    };

    const handleNewEntry = () => {
        setEntryToEdit(null);
        // If expanded, pre-select that staff
        if (expandedStaffId) setSelectedStaffId(expandedStaffId);
        setIsEntryModalOpen(true);
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
                    <Button onClick={handleNewEntry} className="bg-pink-600 hover:bg-pink-700 text-white border-transparent shadow-pink-200">
                        <Plus size={18}/> <span className="hidden sm:inline">Lançar Manual</span>
                    </Button>
                    <Button onClick={() => setIsImportModalOpen(true)} variant="secondary" className="bg-white text-slate-600 border-slate-200 hover:bg-slate-50">
                        <Upload size={18} className="mr-2"/> Importar AFD
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                {staffSummaries.map(({ user, entries, totalHours, overtime, missing, bankBalance }) => (
                    <div key={user.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div 
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => setExpandedStaffId(expandedStaffId === user.id ? null : user.id)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold">{user.name.charAt(0)}</div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{user.name}</h3>
                                    <p className="text-xs text-slate-500">{user.role} • {entries.length} registros</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right hidden md:block">
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Horas Totais</p>
                                    <p className="font-mono font-bold text-slate-700">{totalHours.toFixed(1)}h</p>
                                </div>
                                <div className="text-right hidden md:block">
                                    <p className="text-[10px] uppercase font-bold text-green-600">Extras</p>
                                    <p className="font-mono font-bold text-green-700">+{overtime.toFixed(1)}h</p>
                                </div>
                                <div className="text-right hidden md:block">
                                    <p className="text-[10px] uppercase font-bold text-red-500">Faltas</p>
                                    <p className="font-mono font-bold text-red-600">-{missing.toFixed(1)}h</p>
                                </div>
                                <div className="text-right hidden md:block">
                                    <p className="text-[10px] uppercase font-bold text-blue-500">Banco</p>
                                    <p className="font-mono font-bold text-blue-600">{bankBalance.toFixed(1)}h</p>
                                </div>
                                {expandedStaffId === user.id ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
                            </div>
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
                                                    ? ((new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / 3600000).toFixed(1) 
                                                    : '-';
                                                
                                                return (
                                                    <tr key={entry.id} className="hover:bg-white transition-colors">
                                                        <td className="p-3 pl-2 font-mono text-slate-600">
                                                            {new Date(entry.entryDate).toLocaleDateString()} <span className="text-xs text-slate-400">({new Date(entry.entryDate).toLocaleDateString('pt-BR', {weekday: 'short'})})</span>
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
                                                                (entry.status as any) === 'APPROVED' ? 'bg-green-100 text-green-700 border-green-200' : 
                                                                (entry.status as any) === 'REJECTED' ? 'bg-red-100 text-red-700 border-red-200' :
                                                                (entry.status as any) === 'ABSENT' ? 'bg-red-500 text-white border-red-600' :
                                                                (entry.status as any) === 'JUSTIFIED_ABSENCE' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                                (entry.status as any) === 'CORRECTED' ? 'bg-gray-100 text-gray-500 border-gray-200 line-through' : 
                                                                'bg-yellow-100 text-yellow-700 border-yellow-200'
                                                            }`}>
                                                                {(entry.status as any) === 'CORRECTED' ? 'Corrigido' : 
                                                                (entry.status as any) === 'ABSENT' ? 'Falta' :
                                                                (entry.status as any) === 'JUSTIFIED_ABSENCE' ? 'Justificada' :
                                                                entry.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            {entry.status !== 'CORRECTED' && (
                                                                <button onClick={() => handleEditEntry(entry)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Editar">
                                                                    <Edit size={16}/>
                                                                </button>
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

            <TimeEntryModal 
                isOpen={isEntryModalOpen} 
                onClose={() => setIsEntryModalOpen(false)} 
                entryToEdit={entryToEdit}
                staffId={selectedStaffId || (staffState.users.length > 0 ? staffState.users[0].id : '')}
            />
            
            <SummaryModal 
                isOpen={isSummaryModalOpen} 
                onClose={() => setIsSummaryModalOpen(false)} 
                summary={summary}
                onSave={(newSummary) => setSummary(newSummary)}
            />

            <ImportAFDModal 
                isOpen={isImportModalOpen} 
                onClose={() => setIsImportModalOpen(false)} 
            />
        </div>
    );
};
