import React, { useState } from 'react';
import { useStaff } from '@/core/context/StaffContext';
import { 
    UserMinus, Search, FileText, CheckCircle, Trash2, AlertCircle 
} from 'lucide-react';
import { Termination, TerminationReason, NoticePeriodType } from '@/types';
import { Modal } from '../../../components/Modal';

export const StaffTermination: React.FC = () => {
    const { state, calculateTermination, saveTermination, finalizeTermination, deleteTermination } = useStaff();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form State
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [terminationDate, setTerminationDate] = useState('');
    const [reason, setReason] = useState<TerminationReason>('DISMISSAL_NO_CAUSE');
    const [noticeType, setNoticeType] = useState<NoticePeriodType>('INDEMNIFIED');
    const [preview, setPreview] = useState<Termination | null>(null);

    const handleCalculate = async () => {
        if (!selectedStaffId || !terminationDate) return;
        try {
            const result = await calculateTermination(selectedStaffId, new Date(terminationDate), reason, noticeType);
            setPreview(result);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleSave = async () => {
        if (!preview) return;
        try {
            await saveTermination(preview);
            setIsModalOpen(false);
            setPreview(null);
            setSelectedStaffId('');
            setTerminationDate('');
        } catch (error: any) {
            alert(error.message);
        }
    };

    const updatePreviewValue = (field: keyof Termination, value: number) => {
        if (!preview) return;
        
        const updated = { ...preview, [field]: value };
        
        // Recalcular total
        const totalValue = 
            updated.balanceSalary + 
            updated.noticeValue + 
            updated.vacationProportionalValue + 
            updated.vacationExpiredValue + 
            updated.thirteenthProportionalValue + 
            updated.fgtsFineValue - 
            updated.discountsValue;

        setPreview({
            ...updated,
            totalValue
        });
    };

    const handleFinalize = async (id: string) => {
        if (confirm('ATENÇÃO: Finalizar a rescisão é irreversível. O colaborador será desligado. Deseja continuar?')) {
            try {
                await finalizeTermination(id);
            } catch (error: any) {
                alert(error.message);
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Excluir este cálculo de rescisão?')) {
            await deleteTermination(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Rescisão</h2>
                    <p className="text-gray-500">Cálculo e processamento de desligamentos</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm"
                >
                    <UserMinus size={18} />
                    Nova Rescisão
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input 
                            type="text"
                            placeholder="Buscar rescisões..."
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
                                <th className="p-4 font-semibold">Data Desligamento</th>
                                <th className="p-4 font-semibold">Motivo</th>
                                <th className="p-4 font-semibold">Aviso Prévio</th>
                                <th className="p-4 font-semibold text-right">Total Verbas</th>
                                <th className="p-4 font-semibold text-center">Status</th>
                                <th className="p-4 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {state.terminations.map(term => {
                                const user = state.users.find(u => u.id === term.staffId);
                                return (
                                    <tr key={term.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900">{user?.name || 'Desconhecido'}</div>
                                            <div className="text-xs text-gray-500">{user?.role}</div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            {new Date(term.terminationDate).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            {term.reason === 'DISMISSAL_NO_CAUSE' ? 'Dispensa s/ Justa Causa' : 
                                             term.reason === 'RESIGNATION' ? 'Pedido de Demissão' : term.reason}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            {term.noticePeriodType === 'INDEMNIFIED' ? 'Indenizado' : 'Trabalhado'}
                                        </td>
                                        <td className="p-4 text-right font-bold text-gray-800">
                                            R$ {(term.totalValue || 0).toFixed(2)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                term.status === 'FINALIZED' ? 'bg-red-100 text-red-700' : 
                                                term.status === 'PAID' ? 'bg-green-100 text-green-700' : 
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {term.status === 'FINALIZED' ? 'FINALIZADO' : 
                                                 term.status === 'PAID' ? 'PAGO' : 'RASCUNHO'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            {term.status === 'DRAFT' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleFinalize(term.id)}
                                                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                        title="Finalizar"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(term.id)}
                                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </>
                                            )}
                                            {term.status === 'FINALIZED' && (
                                                <button className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Imprimir TRCT">
                                                    <FileText size={18} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Nova Rescisão */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Calcular Rescisão"
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
                            {state.users.filter(u => u.status === 'ACTIVE').map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data Desligamento</label>
                            <input 
                                type="date"
                                value={terminationDate}
                                onChange={(e) => setTerminationDate(e.target.value)}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                            <select 
                                value={reason}
                                onChange={(e) => setReason(e.target.value as any)}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                            >
                                <option value="DISMISSAL_NO_CAUSE">Dispensa sem Justa Causa</option>
                                <option value="DISMISSAL_CAUSE">Dispensa por Justa Causa</option>
                                <option value="RESIGNATION">Pedido de Demissão</option>
                                <option value="AGREEMENT">Acordo (Comum Acordo)</option>
                                <option value="CONTRACT_END">Término de Contrato</option>
                                <option value="DEATH">Falecimento</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Aviso Prévio</label>
                        <select 
                            value={noticeType}
                            onChange={(e) => setNoticeType(e.target.value as any)}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                        >
                            <option value="INDEMNIFIED">Indenizado (Pago)</option>
                            <option value="WORKED">Trabalhado</option>
                            <option value="WAIVED">Dispensado/Descontado</option>
                        </select>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button 
                            onClick={handleCalculate}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium mr-2"
                        >
                            Simular Cálculo
                        </button>
                    </div>

                    {preview && (
                        <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-100 text-sm space-y-2">
                            <div className="bg-white p-3 rounded border border-red-100 mb-3">
                                <p className="font-bold text-red-800 flex items-center gap-2 mb-2">
                                    <AlertCircle size={14}/> Memória de Cálculo
                                </p>
                                <ul className="list-disc pl-4 text-xs text-red-700 space-y-1">
                                    <li>Saldo de Salário: Dias trabalhados no mês do desligamento.</li>
                                    <li>Aviso Prévio: {preview.noticeDays} dias {noticeType === 'INDEMNIFIED' ? 'indenizados' : 'trabalhados'}.</li>
                                    <li>Férias Prop.: Proporcional aos meses trabalhados no período aquisitivo atual + 1/3.</li>
                                    <li>13º Prop.: Proporcional aos meses trabalhados no ano corrente.</li>
                                    <li>Multa FGTS: 40% sobre o saldo (estimado).</li>
                                </ul>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600">Saldo Salário (Editável)</label>
                                    <input 
                                        type="number" 
                                        value={preview.balanceSalary}
                                        onChange={(e) => updatePreviewValue('balanceSalary', Number(e.target.value))}
                                        className="w-full text-sm border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600">Aviso Prévio (Editável)</label>
                                    <input 
                                        type="number" 
                                        value={preview.noticeValue}
                                        onChange={(e) => updatePreviewValue('noticeValue', Number(e.target.value))}
                                        className="w-full text-sm border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600">Férias Prop. + 1/3</label>
                                    <input 
                                        type="number" 
                                        value={preview.vacationProportionalValue}
                                        onChange={(e) => updatePreviewValue('vacationProportionalValue', Number(e.target.value))}
                                        className="w-full text-sm border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600">13º Proporcional</label>
                                    <input 
                                        type="number" 
                                        value={preview.thirteenthProportionalValue}
                                        onChange={(e) => updatePreviewValue('thirteenthProportionalValue', Number(e.target.value))}
                                        className="w-full text-sm border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600">Multa FGTS</label>
                                    <input 
                                        type="number" 
                                        value={preview.fgtsFineValue}
                                        onChange={(e) => updatePreviewValue('fgtsFineValue', Number(e.target.value))}
                                        className="w-full text-sm border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600">Descontos</label>
                                    <input 
                                        type="number" 
                                        value={preview.discountsValue}
                                        onChange={(e) => updatePreviewValue('discountsValue', Number(e.target.value))}
                                        className="w-full text-sm border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-red-200 my-2 pt-2 flex justify-between text-lg font-bold text-red-800">
                                <span>Total Rescisório:</span>
                                <span>R$ {(preview.totalValue || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={!preview}
                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-lg shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Salvar Rescisão
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
