
import React, { useState, useEffect, useMemo } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '../lib/supabase';
import { 
    Shield, Search, Filter, Printer, Download, Calendar, 
    User, Activity, ChevronRight, Grid, LogOut, FileText,
    Package, DollarSign, Users, Settings, ChefHat, Store,
    ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';

interface AuditLogEntry {
    id: string;
    created_at: string;
    user_name: string;
    module: string;
    action: string;
    details: any;
}

export const AuditDashboard: React.FC = () => {
    const { state: restState } = useRestaurant();
    const { state: authState, logout } = useAuth();
    const navigate = useNavigate();
    
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    const modules = [
        { id: 'ALL', label: 'Todos', icon: Activity },
        { id: 'INVENTORY', label: 'Estoque', icon: Package },
        { id: 'FINANCE', label: 'Financeiro', icon: DollarSign },
        { id: 'HR', label: 'RH', icon: Users },
        { id: 'RESTAURANT', label: 'Restaurante', icon: ChefHat },
        { id: 'COMMERCE', label: 'Varejo', icon: Store },
        { id: 'CONFIG', label: 'Configurações', icon: Settings },
    ];

    useEffect(() => {
        fetchLogs();
    }, [restState.tenantId]);

    const fetchLogs = async () => {
        if (!restState.tenantId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('tenant_id', restState.tenantId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error("Erro ao buscar logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesTab = activeTab === 'ALL' || log.module === activeTab;
            const matchesSearch = log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 log.action?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDate = !dateFilter || log.created_at.startsWith(dateFilter);
            return matchesTab && matchesSearch && matchesDate;
        });
    }, [logs, activeTab, searchTerm, dateFilter]);

    const handlePrint = () => {
        window.print();
    };

    const handleExit = () => {
        navigate('/modules');
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
            {/* Header */}
            <header className="bg-slate-900 text-white shadow-xl shrink-0 z-30 print:hidden">
                <div className="max-w-[1920px] mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/10">
                            <Shield size={24} className="text-slate-300" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-none tracking-tight">Auditoria do Sistema</h1>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Logs de Atividades</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleExit}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
                        >
                            <Grid size={16} /> Módulos
                        </button>
                        <button 
                            onClick={logout}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white transition-colors border border-red-500/20 hover:border-red-500"
                        >
                            <LogOut size={16} /> Sair
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden flex flex-col p-4 md:p-8">
                <div className="max-w-7xl mx-auto w-full flex flex-col h-full gap-6">
                    
                    {/* Controls */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200 print:hidden">
                        <div className="flex flex-wrap gap-2">
                            {modules.map(mod => (
                                <button
                                    key={mod.id}
                                    onClick={() => setActiveTab(mod.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                        activeTab === mod.id 
                                        ? 'bg-slate-900 text-white shadow-lg' 
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                >
                                    <mod.icon size={14} />
                                    {mod.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Buscar usuário ou ação..."
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input 
                                    type="date" 
                                    className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                                    value={dateFilter}
                                    onChange={e => setDateFilter(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={handlePrint}
                                className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
                                title="Imprimir"
                            >
                                <Printer size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Table Container */}
                    <div className="flex-1 bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Data & Hora</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Usuário</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Módulo</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Ação</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Detalhes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <AnimatePresence mode="popLayout">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-20 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <Activity className="animate-spin text-slate-300" size={40} />
                                                        <p className="text-slate-400 font-bold text-sm">Carregando logs...</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-20 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <FileText className="text-slate-200" size={48} />
                                                        <p className="text-slate-400 font-bold text-sm">Nenhum log encontrado para os filtros aplicados.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredLogs.map((log) => (
                                                <motion.tr 
                                                    key={log.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="hover:bg-slate-50 transition-colors group"
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-700">
                                                                {new Date(log.created_at).toLocaleDateString('pt-BR')}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-mono">
                                                                {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-200">
                                                                {log.user_name?.charAt(0) || '?'}
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-600">{log.user_name || 'Sistema'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="text-[10px] font-black px-2 py-1 rounded bg-slate-100 text-slate-500 uppercase tracking-wider">
                                                            {log.module}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-medium text-slate-700">{log.action}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="max-w-xs truncate text-xs text-slate-400 italic" title={JSON.stringify(log.details)}>
                                                            {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { margin: 2cm; }
                    body { background: white; }
                    .print\\:hidden { display: none !important; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 10px; }
                    .flex-1 { overflow: visible !important; }
                    main { padding: 0 !important; }
                    .rounded-3xl { border-radius: 0 !important; }
                    .shadow-xl { box-shadow: none !important; }
                }
            `}} />
        </div>
    );
};
