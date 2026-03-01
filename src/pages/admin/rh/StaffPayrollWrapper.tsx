import React, { useState } from 'react';
import { FileText, Calendar, UserMinus, DollarSign } from 'lucide-react';
import { StaffPayroll } from './StaffPayroll';
import { StaffVacation } from './StaffVacation';
import { StaffTermination } from './StaffTermination';
import { StaffThirteenth } from './StaffThirteenth';

export const StaffPayrollWrapper: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'PAYROLL' | 'VACATION' | 'TERMINATION' | 'THIRTEENTH'>('PAYROLL');

    return (
        <div className="flex h-full animate-fade-in gap-6">
            {/* Sidebar Navigation */}
            <div className="w-64 shrink-0 space-y-6">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4 px-2">
                        <FileText className="text-pink-600" size={20}/> Folha de Pagamento
                    </h2>
                    
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Processamento</h3>
                            <div className="space-y-1">
                                <button 
                                    onClick={() => setActiveTab('PAYROLL')} 
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'PAYROLL' ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <FileText size={16}/> Pré-Folha
                                </button>
                                <button 
                                    onClick={() => setActiveTab('VACATION')} 
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'VACATION' ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <Calendar size={16}/> Férias
                                </button>
                                <button 
                                    onClick={() => setActiveTab('THIRTEENTH')} 
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'THIRTEENTH' ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <DollarSign size={16}/> 13º Salário
                                </button>
                                <button 
                                    onClick={() => setActiveTab('TERMINATION')} 
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'TERMINATION' ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <UserMinus size={16}/> Rescisão
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 pb-10 space-y-6">
                {activeTab === 'PAYROLL' && <StaffPayroll />}
                {activeTab === 'VACATION' && <StaffVacation />}
                {activeTab === 'THIRTEENTH' && <StaffThirteenth />}
                {activeTab === 'TERMINATION' && <StaffTermination />}
            </div>
        </div>
    );
};
