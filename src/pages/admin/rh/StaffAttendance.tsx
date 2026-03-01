
import React, { useState } from 'react';
import { Timer, ArrowRight, FileSignature } from 'lucide-react';
import { DailyLogTab } from './DailyLogTab'; // We will modify this to be monthly
import { SendToPayrollTab } from './SendToPayrollTab';
import { PointCorrectionTab } from './PointCorrectionTab';

type Tab = 'daily' | 'payroll' | 'correction';

export const StaffAttendance: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('daily');

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            <Timer className="text-pink-600"/> Controle de Ponto
                        </h2>
                        <p className="text-sm text-gray-500">Auditoria de ponto e fechamento para pré-folha.</p>
                    </div>
                    <div className="flex items-center border border-slate-200 rounded-full p-1 bg-slate-100">
                        <button 
                            onClick={() => setActiveTab('daily')}
                            className={`px-4 py-2 text-sm font-bold rounded-full transition-colors ${activeTab === 'daily' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}>
                            Espelho de Ponto
                        </button>
                        <button 
                            onClick={() => setActiveTab('correction')}
                            className={`px-4 py-2 text-sm font-bold rounded-full transition-colors ${activeTab === 'correction' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}>
                            Correção de Ponto
                        </button>
                        <button 
                            onClick={() => setActiveTab('payroll')}
                            className={`px-4 py-2 text-sm font-bold rounded-full transition-colors ${activeTab === 'payroll' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}>
                            Enviar para Folha
                        </button>
                    </div>
                </div>
            </div>

            <div>
                {activeTab === 'daily' && <DailyLogTab />}
                {activeTab === 'correction' && <PointCorrectionTab />}
                {activeTab === 'payroll' && <SendToPayrollTab />}
            </div>
        </div>
    );
};
