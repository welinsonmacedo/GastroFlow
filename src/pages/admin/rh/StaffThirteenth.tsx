import React, { useState } from 'react';
import { useStaff } from '../../../context/StaffContext';
import { 
    DollarSign, Calendar, Search, CheckCircle, AlertCircle, 
    Printer, FileText, Calculator, Trash2 
} from 'lucide-react';
import { ThirteenthPayment } from '../../../types';

export const StaffThirteenth: React.FC = () => {
    const { state, calculateThirteenth, saveThirteenth, deleteThirteenth } = useStaff();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');
    const [previewPayment, setPreviewPayment] = useState<ThirteenthPayment | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const filteredUsers = state.users.filter(user => 
        user.status === 'ACTIVE' && 
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCalculate = async (staffId: string, installment: 1 | 2) => {
        try {
            setCalculating(true);
            const payment = await calculateThirteenth(staffId, selectedYear, installment);
            setPreviewPayment(payment);
            setIsModalOpen(true);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setCalculating(false);
        }
    };

    const handleSave = async () => {
        if (!previewPayment) return;
        try {
            await saveThirteenth(previewPayment);
            setIsModalOpen(false);
            setPreviewPayment(null);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este lançamento?')) {
            await deleteThirteenth(id);
        }
    };

    const getPayment = (staffId: string, installment: 1 | 2) => {
        return state.thirteenthPayments.find(p => 
            p.staffId === staffId && 
            p.year === selectedYear && 
            p.installment === installment
        );
    };

    return (
        <div className="space-y-6">
            {/* ... existing header ... */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">13º Salário</h2>
                    <p className="text-gray-500">Gerenciamento de pagamentos do décimo terceiro</p>
                </div>
                <div className="flex items-center gap-4">
                    <select 
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="bg-white border border-gray-300 rounded-lg px-4 py-2 font-medium text-gray-700"
                    >
                        {[2023, 2024, 2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
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
                                <th className="p-4 font-semibold text-center">1ª Parcela (Nov)</th>
                                <th className="p-4 font-semibold text-center">2ª Parcela (Dez)</th>
                                <th className="p-4 font-semibold text-right">Total Pago</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map(user => {
                                const first = getPayment(user.id, 1);
                                const second = getPayment(user.id, 2);
                                const totalPaid = (first?.value || 0) + (second?.netValue || 0);

                                return (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900">{user.name}</div>
                                            <div className="text-xs text-gray-500">{user.role}</div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            {user.hireDate ? new Date(user.hireDate).toLocaleDateString() : '-'}
                                        </td>
                                        
                                        {/* 1ª Parcela */}
                                        <td className="p-4 text-center">
                                            {first ? (
                                                <div className="flex flex-col items-center gap-1 group">
                                                    <span className="font-bold text-green-600">
                                                        R$ {first.value.toFixed(2)}
                                                    </span>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => handleDelete(first.id)}
                                                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => handleCalculate(user.id, 1)}
                                                    disabled={calculating}
                                                    className="px-3 py-1 text-xs font-medium text-pink-600 bg-pink-50 hover:bg-pink-100 rounded-lg border border-pink-200 transition-colors"
                                                >
                                                    Calcular 1ª Parc.
                                                </button>
                                            )}
                                        </td>

                                        {/* 2ª Parcela */}
                                        <td className="p-4 text-center">
                                            {second ? (
                                                <div className="flex flex-col items-center gap-1 group">
                                                    <span className="font-bold text-green-600">
                                                        R$ {second.netValue.toFixed(2)}
                                                    </span>
                                                    <div className="text-[10px] text-gray-400">
                                                        Desc: R$ {(second.inssValue + second.irrfValue).toFixed(2)}
                                                    </div>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => handleDelete(second.id)}
                                                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => handleCalculate(user.id, 2)}
                                                    disabled={calculating || !first} // Idealmente exige a 1ª, mas nem sempre
                                                    className="px-3 py-1 text-xs font-medium text-pink-600 bg-pink-50 hover:bg-pink-100 rounded-lg border border-pink-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Calcular 2ª Parc.
                                                </button>
                                            )}
                                        </td>

                                        <td className="p-4 text-right font-bold text-gray-800">
                                            R$ {totalPaid.toFixed(2)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Confirmação/Edição */}
            {isModalOpen && previewPayment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">
                                {previewPayment.installment}ª Parcela - 13º Salário
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 space-y-2">
                                <p className="font-bold flex items-center gap-2">
                                    <AlertCircle size={16}/> Memória de Cálculo:
                                </p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Salário Base: R$ {previewPayment.referenceSalary.toFixed(2)}</li>
                                    <li>Meses Trabalhados: {previewPayment.monthsWorked}/12</li>
                                    <li>Valor Proporcional: R$ {((previewPayment.referenceSalary / 12) * previewPayment.monthsWorked).toFixed(2)}</li>
                                    {previewPayment.installment === 1 ? (
                                        <li>1ª Parcela: 50% do valor proporcional (sem descontos).</li>
                                    ) : (
                                        <li>2ª Parcela: Valor total - 1ª Parcela - INSS - IRRF.</li>
                                    )}
                                </ul>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Bruto (Editável)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                                    <input 
                                        type="number"
                                        value={previewPayment.value}
                                        onChange={(e) => setPreviewPayment({...previewPayment, value: Number(e.target.value), netValue: Number(e.target.value) - previewPayment.inssValue - previewPayment.irrfValue})}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500"
                                    />
                                </div>
                            </div>

                            {previewPayment.installment === 2 && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">INSS</label>
                                        <input 
                                            type="number"
                                            value={previewPayment.inssValue}
                                            onChange={(e) => setPreviewPayment({...previewPayment, inssValue: Number(e.target.value), netValue: previewPayment.value - Number(e.target.value) - previewPayment.irrfValue})}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">IRRF</label>
                                        <input 
                                            type="number"
                                            value={previewPayment.irrfValue}
                                            onChange={(e) => setPreviewPayment({...previewPayment, irrfValue: Number(e.target.value), netValue: previewPayment.value - previewPayment.inssValue - Number(e.target.value)})}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                                <span className="text-gray-600 font-medium">Líquido a Pagar:</span>
                                <span className="text-xl font-bold text-green-600">
                                    R$ {previewPayment.netValue.toFixed(2)}
                                </span>
                            </div>
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
                                className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-bold shadow-lg shadow-pink-200"
                            >
                                Confirmar Pagamento
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
