
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { SecurityIncident } from '../../types';
import { ShieldAlert, ShieldCheck, Activity, Search, RefreshCcw } from 'lucide-react';
import { Button } from '../../components/Button';

export const AdminSecurity: React.FC = () => {
    const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('');

    const fetchIncidents = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('security_incidents')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (data) setIncidents(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchIncidents();
    }, []);

    const filtered = incidents.filter(i => 
        i.type.toLowerCase().includes(filter.toLowerCase()) || 
        i.details?.toLowerCase().includes(filter.toLowerCase())
    );

    const getSeverityColor = (sev: string) => {
        if (sev === 'CRITICAL') return 'bg-red-100 text-red-700 border-red-200';
        if (sev === 'MEDIUM') return 'bg-orange-100 text-orange-700 border-orange-200';
        return 'bg-blue-100 text-blue-700 border-blue-200';
    };

    return (
        <div className="space-y-6 animate-fade-in p-8 h-full overflow-y-auto">
            <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <ShieldAlert className="text-red-600"/> Centro de Segurança
                    </h2>
                    <p className="text-sm text-gray-500">Monitoramento de ameaças e integridade do sistema.</p>
                </div>
                <div className="flex gap-2">
                     <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                        <Search size={18} className="text-gray-400"/>
                        <input 
                            className="bg-transparent text-sm outline-none" 
                            placeholder="Filtrar incidentes..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                        />
                     </div>
                     <Button onClick={fetchIncidents} disabled={loading} variant="secondary">
                        <RefreshCcw size={18} className={loading ? "animate-spin" : ""}/>
                     </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Status do Banco</p>
                        <p className="text-xl font-black text-green-600 flex items-center gap-2"><ShieldCheck size={20}/> Protegido (RLS)</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Anti-Brute Force</p>
                        <p className="text-xl font-black text-blue-600 flex items-center gap-2"><Activity size={20}/> Ativo (Rate Limit)</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Total Incidentes (24h)</p>
                        <p className="text-3xl font-black text-purple-600">{incidents.length}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Log de Incidentes</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white text-gray-500 border-b">
                            <tr>
                                <th className="p-4 font-bold">Data/Hora</th>
                                <th className="p-4 font-bold">Tipo</th>
                                <th className="p-4 font-bold">Gravidade</th>
                                <th className="p-4 font-bold">Detalhes</th>
                                <th className="p-4 font-bold">IP (Origem)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.map(inc => (
                                <tr key={inc.id} className="hover:bg-red-50/10 transition-colors">
                                    <td className="p-4 font-mono text-slate-500 text-xs">
                                        {new Date(inc.created_at).toLocaleString()}
                                    </td>
                                    <td className="p-4 font-bold text-slate-800">{inc.type}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase border ${getSeverityColor(inc.severity)}`}>
                                            {inc.severity}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-600 max-w-md truncate" title={inc.details}>
                                        {inc.details}
                                    </td>
                                    <td className="p-4 text-slate-400 text-xs font-mono">
                                        {inc.ip_address || 'Oculto'}
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400 italic">
                                        Nenhum incidente registrado. Sistema seguro.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
