import React, { useState } from 'react';
import { useStaff } from '../../../context/StaffContext';
import { FileText, ArrowLeft, Eye, Calendar, Users, DollarSign } from 'lucide-react';
import { StaffPayroll } from './StaffPayroll';

export const ClosedPayrollsTab: React.FC = () => {
    const { state: staffState } = useStaff();
    const [selectedPayroll, setSelectedPayroll] = useState<{month: number, year: number} | null>(null);

    if (selectedPayroll) {
        return (
            <div className="space-y-4 animate-fade-in">
                <button 
                    onClick={() => setSelectedPayroll(null)}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200"
                >
                    <ArrowLeft size={20}/> Voltar para Lista de Folhas
                </button>
                <StaffPayroll initialMonth={selectedPayroll.month} initialYear={selectedPayroll.year} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <FileText className="text-pink-600" size={24}/> Folhas Fechadas
                </h2>
                <p className="text-sm text-gray-500">Histórico de todas as folhas de pagamento processadas e arquivadas.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staffState.closedPayrolls.map(payroll => (
                    <div key={payroll.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer group" onClick={() => setSelectedPayroll({ month: payroll.month, year: payroll.year })}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-pink-50 p-3 rounded-xl text-pink-600 group-hover:bg-pink-600 group-hover:text-white transition-colors">
                                    <Calendar size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 capitalize leading-tight">
                                        {new Date(payroll.year, payroll.month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                    </h3>
                                    <p className="text-xs text-gray-400 font-mono mt-1">Ref: {String(payroll.month + 1).padStart(2, '0')}/{payroll.year}</p>
                                </div>
                            </div>
                            <div className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                FECHADO
                            </div>
                        </div>

                        <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-gray-500 flex items-center gap-2"><Users size={14}/> Colaboradores</span>
                                <span className="font-bold text-slate-700">{payroll.employeeCount}</span>
                            </div>
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-gray-500 flex items-center gap-2"><DollarSign size={14}/> Custo Total</span>
                                <span className="font-bold text-slate-900">R$ {(payroll.totalCost || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm items-center pt-2 border-t border-slate-200">
                                <span className="text-gray-500 text-xs">Fechado em</span>
                                <span className="font-mono text-xs text-slate-600">{new Date(payroll.closedAt).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <button 
                            className="w-full bg-white border-2 border-slate-100 text-slate-600 py-3 rounded-xl font-bold text-sm hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                        >
                            <Eye size={16}/> Visualizar Detalhes
                        </button>
                    </div>
                ))}

                {staffState.closedPayrolls.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                        <FileText size={48} className="mb-4 opacity-20"/>
                        <p className="font-bold text-lg">Nenhuma folha fechada encontrada</p>
                        <p className="text-sm">As folhas fechadas aparecerão aqui após o processamento.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
