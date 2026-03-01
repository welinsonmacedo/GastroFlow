import React, { useState } from 'react';
import { Users, AlertTriangle } from 'lucide-react';
import { StaffList } from './StaffList';
import { StaffWarnings } from './StaffWarnings';

export const StaffEmployeesWrapper: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'LIST' | 'WARNINGS'>('LIST');

    return (
        <div className="flex h-full animate-fade-in gap-6">
            {/* Sidebar Navigation */}
            <div className="w-64 shrink-0 space-y-6">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4 px-2">
                        <Users className="text-pink-600" size={20}/> Colaboradores
                    </h2>
                    
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Gestão</h3>
                            <div className="space-y-1">
                                <button 
                                    onClick={() => setActiveTab('LIST')} 
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'LIST' ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <Users size={16}/> Lista de Colaboradores
                                </button>
                                <button 
                                    onClick={() => setActiveTab('WARNINGS')} 
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'WARNINGS' ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <AlertTriangle size={16}/> Advertências
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 pb-10 space-y-6">
                {activeTab === 'LIST' && <StaffList />}
                {activeTab === 'WARNINGS' && <StaffWarnings />}
            </div>
        </div>
    );
};
