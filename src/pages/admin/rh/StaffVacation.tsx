import React, { useState } from 'react';
import { useStaff } from '../../../context/StaffContext';
import { 
    Search, Plus, Trash2, AlertTriangle, History, AlertCircle 
} from 'lucide-react';
import { VacationSchedule } from '../../../types';
import { Modal } from '../../../components/Modal';

export const StaffVacation: React.FC = () => {
    const { state, calculateVacation, saveVacationSchedule, deleteVacationSchedule } = useStaff();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedStaffHistory, setSelectedStaffHistory] = useState<string | null>(null);
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

        // Validação de 1 ano de casa (Período Aquisitivo)
        const user = state.users.find(u => u.id === selectedStaffId);
        if (user && user.hireDate) {
            const hireDate = new Date(user.hireDate);
            const vacationStart = new Date(startDate);
            const oneYearAfterHire = new Date(hireDate);
            oneYearAfterHire.setFullYear(hireDate.getFullYear() + 1);
            
            // Zera as horas para comparar apenas as datas
            oneYearAfterHire.setHours(0,0,0,0);
            vacationStart.setHours(0,0,0,0);

            if (vacationStart < oneYearAfterHire) {
                alert('O colaborador ainda não completou 1 ano de casa (período aquisitivo incompleto). A legislação exige 12 meses de trabalho para o primeiro gozo de férias.');
                return;
            }
        }

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

    const updatePreviewValue = (field: keyof VacationSchedule, value: number) => {
        if (!preview) return;
        
        const updated = { ...preview, [field]: value };
        
        // Recalcular totais se necessário
        // Total Bruto = base + 1/3 + abono + 1/3 abono
        const totalGross = updated.baseValue + updated.oneThirdValue + updated.soldValue + updated.soldOneThirdValue;
        
        // Total Líquido = Bruto - INSS - IRRF
        const totalNet = totalGross - updated.inssValue - updated.irrfValue;

        setPreview({
            ...updated,
            totalGross,
            totalNet
        });
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja cancelar estas férias?')) {
            await deleteVacationSchedule(id);
        }
    };

    const openHistory = (staffId: string) => {
        setSelectedStaffHistory(staffId);
        setIsHistoryModalOpen(true);
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
                                <th className="p-4 font-semibold">Admissão</th>
                                <th className="p-4 font-semibold">Período Aquisitivo Atual</th>
                                <th className="p-4 font-semibold">Concessivo Até</th>
                                <th className="p-4 font-semibold">Últimas Férias</th>
                                <th className="p-4 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map(user => {
                                const hireDate = user.hireDate ? new Date(user.hireDate) : new Date();
                                const today = new Date();
                                
                                // Calcular Período Aquisitivo Atual
                                // Ex: Admissão 01/02/2020. Hoje 28/02/2026.
                                // Periodos: 2020-2021, 2021-2022, ..., 2025-2026.
                                // O atual iniciou em 01/02/2025 e termina em 31/01/2026 (já venceu) ou 2026-2027.
                                
                                let currentPeriodStart = new Date(hireDate);
                                currentPeriodStart.setFullYear(today.getFullYear());
                                if (currentPeriodStart > today) {
                                    currentPeriodStart.setFullYear(today.getFullYear() - 1);
                                }
                                const currentPeriodEnd = new Date(currentPeriodStart);
                                currentPeriodEnd.setFullYear(currentPeriodStart.getFullYear() + 1);
                                currentPeriodEnd.setDate(currentPeriodEnd.getDate() - 1);

                                // Limite Concessivo: 12 meses após o fim do período aquisitivo
                                const concessiveLimit = new Date(currentPeriodEnd);
                                concessiveLimit.setFullYear(concessiveLimit.getFullYear() + 1);

                                const schedules = state.vacationSchedules
                                    .filter(s => s.staffId === user.id)
                                    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
                                
                                const lastVacation = schedules.length > 0 ? schedules[0] : null;

                                return (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900">{user.name}</div>
                                            <div className="text-xs text-gray-500">{user.role}</div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            {hireDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            <div className="flex flex-col">
                                                <span>{currentPeriodStart.toLocaleDateString('pt-BR', { timeZone: 'UTC' })} - {currentPeriodEnd.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                                                {today > currentPeriodEnd && (
                                                    <span className="text-xs text-orange-600 font-bold flex items-center gap-1">
                                                        <AlertTriangle size={10} /> Vencido
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            <span className={today > concessiveLimit ? 'text-red-600 font-bold' : ''}>
                                                {concessiveLimit.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            {lastVacation ? (
                                                <div className="flex flex-col">
                                                    <span>{new Date(lastVacation.startDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} - {new Date(lastVacation.endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                                                    <span className="text-xs text-gray-400">{lastVacation.daysCount} dias</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => openHistory(user.id)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Histórico de Férias"
                                            >
                                                <History size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Agendamento */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Agendar Férias"
                maxWidth="lg"
            >
                <div className="space-y-4">
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
                            <div className="bg-white p-3 rounded border border-blue-100 mb-3">
                                <p className="font-bold text-blue-800 flex items-center gap-2 mb-2">
                                    <AlertCircle size={14}/> Memória de Cálculo
                                </p>
                                <ul className="list-disc pl-4 text-xs text-blue-700 space-y-1">
                                    <li>Salário Base: R$ {(preview.baseValue || 0).toFixed(2)}</li>
                                    <li>1/3 Constitucional: R$ {(preview.oneThirdValue || 0).toFixed(2)} (33.33% do valor)</li>
                                    {preview.soldValue > 0 && (
                                        <li>Abono Pecuniário: R$ {(preview.soldValue || 0).toFixed(2)} (Venda de {soldDays} dias)</li>
                                    )}
                                    <li>INSS/IRRF: Calculados sobre o total bruto.</li>
                                </ul>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600">Valor Férias (Editável)</label>
                                    <input 
                                        type="number" 
                                        value={preview.baseValue}
                                        onChange={(e) => updatePreviewValue('baseValue', Number(e.target.value))}
                                        className="w-full text-sm border-gray-300 rounded focus:ring-pink-500 focus:border-pink-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600">1/3 Constitucional (Editável)</label>
                                    <input 
                                        type="number" 
                                        value={preview.oneThirdValue}
                                        onChange={(e) => updatePreviewValue('oneThirdValue', Number(e.target.value))}
                                        className="w-full text-sm border-gray-300 rounded focus:ring-pink-500 focus:border-pink-500"
                                    />
                                </div>
                            </div>

                            {preview.soldValue > 0 && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600">Abono Pecuniário</label>
                                        <input 
                                            type="number" 
                                            value={preview.soldValue}
                                            onChange={(e) => updatePreviewValue('soldValue', Number(e.target.value))}
                                            className="w-full text-sm border-gray-300 rounded focus:ring-pink-500 focus:border-pink-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600">1/3 Abono</label>
                                        <input 
                                            type="number" 
                                            value={preview.soldOneThirdValue}
                                            onChange={(e) => updatePreviewValue('soldOneThirdValue', Number(e.target.value))}
                                            className="w-full text-sm border-gray-300 rounded focus:ring-pink-500 focus:border-pink-500"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-100">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600">INSS</label>
                                    <input 
                                        type="number" 
                                        value={preview.inssValue}
                                        onChange={(e) => updatePreviewValue('inssValue', Number(e.target.value))}
                                        className="w-full text-sm border-gray-300 rounded focus:ring-pink-500 focus:border-pink-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600">IRRF</label>
                                    <input 
                                        type="number" 
                                        value={preview.irrfValue}
                                        onChange={(e) => updatePreviewValue('irrfValue', Number(e.target.value))}
                                        className="w-full text-sm border-gray-300 rounded focus:ring-pink-500 focus:border-pink-500"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-blue-200 my-2 pt-2 flex justify-between text-lg font-bold text-blue-800">
                                <span>Total Líquido Estimado:</span>
                                <span>R$ {(preview.totalNet || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
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
            </Modal>

            {/* Modal de Histórico */}
            <Modal
                isOpen={isHistoryModalOpen && !!selectedStaffHistory}
                onClose={() => setIsHistoryModalOpen(false)}
                title="Histórico de Férias"
                maxWidth="2xl"
            >
                <div className="space-y-4">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-bold border-b">
                            <tr>
                                <th className="p-3">Início</th>
                                <th className="p-3">Fim</th>
                                <th className="p-3">Dias</th>
                                <th className="p-3">Abono</th>
                                <th className="p-3 text-right">Valor Líquido</th>
                                <th className="p-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {state.vacationSchedules
                                .filter(s => s.staffId === selectedStaffHistory)
                                .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                                .map(vacation => (
                                    <tr key={vacation.id}>
                                        <td className="p-3">{new Date(vacation.startDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                        <td className="p-3">{new Date(vacation.endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                        <td className="p-3">{vacation.daysCount}</td>
                                        <td className="p-3">{vacation.soldDays > 0 ? `${vacation.soldDays} dias` : '-'}</td>
                                        <td className="p-3 text-right font-bold">R$ {(vacation.totalNet || 0).toFixed(2)}</td>
                                        <td className="p-3 text-right">
                                            <button onClick={() => handleDelete(vacation.id)} className="text-red-500 hover:text-red-700">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            }
                            {state.vacationSchedules.filter(s => s.staffId === selectedStaffHistory).length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-6 text-center text-gray-400 italic">Nenhum histórico encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Modal>
        </div>
    );
};
