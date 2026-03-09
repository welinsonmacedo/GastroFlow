
import React, { useEffect, useState } from 'react';
import { supabase } from '@/core/api/supabaseClient';
import { SecurityIncident } from '@/types';
import { ShieldAlert, ShieldCheck, Activity, Search, RefreshCcw, Lock } from 'lucide-react';
import { Button } from '../../components/Button';
import { logSecurityIncident } from '@/core/security/security';

export const AdminSecurity: React.FC = () => {
    const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('');
    const [config, setConfig] = useState({ blockDevTools: true, blockRightClick: true, blockExtensions: true });

    const fetchIncidents = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('security_incidents')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            
            if (error) {
                console.error("Error fetching security incidents:", error);
                if (error.code === '42P01') {
                    // Table does not exist
                    console.warn("Table security_incidents does not exist. Please run the security_schema.sql script.");
                } else {
                    alert("Erro ao carregar incidentes de segurança: " + error.message);
                }
            }
            if (data) setIncidents(data);
        } catch (err) {
            console.error("Unexpected error fetching incidents:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchConfig = async () => {
        try {
            const { data, error } = await supabase.from('system_settings').select('value').eq('key', 'security_config').single();
            if (error) {
                if (error.code === '42P01') {
                    console.warn("Table system_settings does not exist. Please run the security_schema.sql script.");
                } else if (error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine for .single() if empty
                    console.error("Error fetching security config:", error);
                }
            }
            if (data?.value) setConfig(data.value);
        } catch (err) {
            console.error("Unexpected error fetching config:", err);
        }
    };

    const toggleConfig = async (key: keyof typeof config) => {
        const newConfig = { ...config, [key]: !config[key] };
        setConfig(newConfig);
        const { error } = await supabase.rpc('update_security_config_by_saas_admin', {
            p_config: newConfig
        });
        if (error) {
            console.error("Erro ao salvar configuração de segurança:", error);
            alert("Erro ao salvar configuração: " + error.message);
            // Revert state on error
            setConfig(config);
        } else {
            // Dispatch a custom event so SecurityGuard can update immediately
            window.dispatchEvent(new CustomEvent('securityConfigChanged', { detail: newConfig }));
            logSecurityIncident({
                type: 'SECURITY_CONFIG_CHANGED',
                severity: 'MEDIUM',
                details: `Configuração de segurança alterada: ${key} = ${newConfig[key]}`
            });
        }
    };

    useEffect(() => {
        fetchIncidents();
        fetchConfig();
        
        const channel = supabase.channel('admin_security')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'security_incidents' }, fetchIncidents)
            .subscribe();
            
        return () => { supabase.removeChannel(channel); };
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

            {/* Configurações de Proteção */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Lock size={16} /> Configurações de Proteção Ativa
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`p-4 rounded-xl border cursor-pointer transition-all ${config.blockDevTools ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 opacity-75'}`} onClick={() => toggleConfig('blockDevTools')}>
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-sm text-slate-700">Bloquear DevTools</span>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${config.blockDevTools ? 'bg-green-500' : 'bg-gray-300'}`}>
                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${config.blockDevTools ? 'left-6' : 'left-1'}`}></div>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500">Impede inspeção de código e atalhos F12/Ctrl+Shift+I.</p>
                    </div>

                    <div className={`p-4 rounded-xl border cursor-pointer transition-all ${config.blockRightClick ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 opacity-75'}`} onClick={() => toggleConfig('blockRightClick')}>
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-sm text-slate-700">Bloquear Botão Direito</span>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${config.blockRightClick ? 'bg-green-500' : 'bg-gray-300'}`}>
                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${config.blockRightClick ? 'left-6' : 'left-1'}`}></div>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500">Previne menu de contexto para "Salvar Como" ou "Inspecionar".</p>
                    </div>

                    <div className={`p-4 rounded-xl border cursor-pointer transition-all ${config.blockExtensions ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 opacity-75'}`} onClick={() => toggleConfig('blockExtensions')}>
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-sm text-slate-700">Bloquear Extensões</span>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${config.blockExtensions ? 'bg-green-500' : 'bg-gray-300'}`}>
                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${config.blockExtensions ? 'left-6' : 'left-1'}`}></div>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500">Detecta e bloqueia injeção de scripts por extensões de browser.</p>
                    </div>
                </div>
            </div>

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
                                <th className="p-4 font-bold text-right">Ações</th>
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
                                    <td className="p-4 text-right">
                                        {inc.ip_address && inc.ip_address !== 'Oculto' && (
                                            <Button 
                                                variant="danger" 
                                                size="sm" 
                                                className="h-7 px-2 text-[10px]"
                                                onClick={async () => {
                                                    const { error } = await supabase.rpc('block_ip_by_saas_admin', {
                                                        p_ip: inc.ip_address,
                                                        p_reason: `Incidente: ${inc.type} - ${inc.details}`
                                                    });
                                                    if (error) {
                                                        alert("Erro ao bloquear IP: " + error.message);
                                                    } else {
                                                        alert("IP bloqueado com sucesso!");
                                                    }
                                                }}
                                            >
                                                Bloquear IP
                                            </Button>
                                        )}
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
