import React, { useState } from 'react';
import { useStaff } from '../../../context/StaffContext';
import { 
    Calendar, Search, Plus, Trash2, CheckCircle, AlertTriangle 
} from 'lucide-react';
import { VacationSchedule } from '../../../types';

export const StaffVacation: React.FC = () => {
    const { state, calculateVacation, saveVacationSchedule, deleteVacationSchedule } = useStaff();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [daysCount, setDaysCount] = useState(30);
    const [soldDays, setSoldDays] = useState(0);
    const [preview, setPreview] = useState<VacationSchedule | null>(null);

    const filteredUsers = state.users.filter(user => 
        user.status === 'ACTIVE' && 
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCalculate = async () => {
        if (!selectedStaffId || !startDate || daysCount <= 0) return;
        try {
            const result = await calculateVacation(selectedStaffId, new Date(startDate), daysCount, soldDays);
            setPreview(result);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleSave = async () => {
        if (!preview) return;
        try {
            await saveVacationSchedule(preview);
            setIsModalOpen(false);
            setPreview(null);
            setSelectedStaffId('');
            setStartDate('');
            setDaysCount(30);
            setSoldDays(0);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja cancelar estas férias?')) {
            await deleteVacationSchedule(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Férias</h2>
                    <p className="text-gray-500">Controle de períodos aquisitivos e agendamentos</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium shadow-sm"
                >
                    <Plus size={18} />
                    Agendar Férias
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input 
                            type="text"
                            placeholder="Buscar colaborador..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                                <th className="p-4 font-semibold">Colaborador</th>
                                <th className="p-4 font-semibold">Período Aquisitivo</th>
                                <th className="p-4 font-semibold">Dias Vencidos</th>
                                <th className="p-4 font-semibold">Agendamentos</th>
                                <th className="p-4 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map(user => {
                                // Lógica simplificada de período aquisitivo
                                const hireDate = user.hireDate ? new Date(user.hireDate) : new Date();
                                const today = new Date();
                                const yearsWorked = today.getFullYear() - hireDate.getFullYear();
                                const currentPeriodStart = new Date(hireDate);
                                currentPeriodStart.setFullYear(today.getFullYear() - 1);
                                const currentPeriodEnd = new Date(currentPeriodStart);
                                currentPeriodEnd.setFullYear(currentPeriodStart.getFullYear() + 1);
                                
                                const schedules = state.vacationSchedules.filter(s => s.staffId === user.id);

                                return (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900">{user.name}</div>
                                            <div className="text-xs text-gray-500">{user.role}</div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            {currentPeriodStart.toLocaleDateString()} - {currentPeriodEnd.toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                                                30 Dias
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {schedules.length > 0 ? (
                                                <div className="space-y-1">
                                                    {schedules.map(s => (
                                                        <div key={s.id} className="flex items-center justify-between text-xs bg-gray-50 p-1 rounded border border-gray-200">
                                                            <span>
                                                                {new Date(s.startDate).toLocaleDateString()} - {new Date(s.endDate).toLocaleDateString()} ({s.daysCount}d)
                                                            </span>
                                                            <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700 ml-2">
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Nenhum agendamento</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            {/* Actions */}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Agendamento */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">Agendar Férias</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Colaborador</label>
                                <select 
                                    value={selectedStaffId}
                                    onChange={(e) => setSelectedStaffId(e.target.value)}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                                >
                                    <option value="">Selecione...</option>
                                    {state.users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
                                    <input 
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dias de Gozo</label>
                                    <input 
                                        type="number"
                                        value={daysCount}
                                        onChange={(e) => setDaysCount(Number(e.target.value))}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vender Dias (Abono Pecuniário)</label>
                                <select 
                                    value={soldDays}
                                    onChange={(e) => setSoldDays(Number(e.target.value))}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                                >
                                    <option value={0}>Não vender</option>
                                    <option value={5}>5 dias</option>
                                    <option value={10}>10 dias</option>
                                </select>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button 
                                    onClick={handleCalculate}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium mr-2"
                                >
                                    Calcular Prévia
                                </button>
                            </div>

                            {preview && (
                                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Valor Férias:</span>
                                        <span className="font-bold">R$ {preview.baseValue.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">1/3 Constitucional:</span>
                                        <span className="font-bold">R$ {preview.oneThirdValue.toFixed(2)}</span>
                                    </div>
                                    {preview.soldValue > 0 && (
                                        <div className="flex justify-between text-green-600">
                                            <span>Abono Pecuniário:</span>
                                            <span className="font-bold">R$ {preview.soldValue.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="border-t border-blue-200 my-2 pt-2 flex justify-between text-lg font-bold text-blue-800">
                                        <span>Total Líquido Estimado:</span>
                                        <span>R$ {preview.totalNet.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={!preview}
                                className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-bold shadow-lg shadow-pink-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirmar Agendamento
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
