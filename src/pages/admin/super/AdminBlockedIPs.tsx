
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { ShieldAlert, Trash2, RefreshCcw, Search, Globe } from 'lucide-react';
import { Button } from '../../../components/Button';
import { useUI } from '../../../context/UIContext';

interface BlockedIP {
    ip: string;
    reason: string;
    blocked_at: string;
}

export const AdminBlockedIPs: React.FC = () => {
    const [blockedIps, setBlockedIps] = useState<BlockedIP[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('');
    const { showAlert, showConfirm } = useUI();

    const fetchBlockedIps = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('blocked_ips')
                .select('*')
                .order('blocked_at', { ascending: false });
            
            if (error) {
                console.error("Error fetching blocked IPs:", error);
                showAlert({ title: "Erro", message: "Erro ao carregar IPs bloqueados: " + error.message, type: 'ERROR' });
            }
            if (data) setBlockedIps(data);
        } catch (err) {
            console.error("Unexpected error fetching blocked IPs:", err);
        } finally {
            setLoading(false);
        }
    };

    const unblockIp = async (ip: string) => {
        showConfirm({
            title: "Desbloquear IP?",
            message: `Tem certeza que deseja desbloquear o IP ${ip}?`,
            type: 'WARNING',
            confirmText: "Desbloquear",
            onConfirm: async () => {
                const { error } = await supabase
                    .from('blocked_ips')
                    .delete()
                    .eq('ip', ip);
                
                if (error) {
                    showAlert({ title: "Erro", message: "Erro ao desbloquear IP: " + error.message, type: 'ERROR' });
                } else {
                    showAlert({ title: "Sucesso", message: "IP desbloqueado com sucesso!", type: 'SUCCESS' });
                    fetchBlockedIps();
                }
            }
        });
    };

    useEffect(() => {
        fetchBlockedIps();
    }, []);

    const filtered = blockedIps.filter(i => 
        i.ip.toLowerCase().includes(filter.toLowerCase()) || 
        i.reason?.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in p-8 h-full overflow-y-auto">
            <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <ShieldAlert className="text-red-600"/> IPs Bloqueados
                    </h2>
                    <p className="text-sm text-gray-500">Gerenciamento de restrições de acesso por IP.</p>
                </div>
                <div className="flex gap-2">
                     <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                        <Search size={18} className="text-gray-400"/>
                        <input 
                            className="bg-transparent text-sm outline-none" 
                            placeholder="Filtrar IPs..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                        />
                     </div>
                     <Button onClick={fetchBlockedIps} disabled={loading} variant="secondary">
                        <RefreshCcw size={18} className={loading ? "animate-spin" : ""}/>
                     </Button>
                </div>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 border-b">
                            <tr>
                                <th className="p-4 font-bold">IP</th>
                                <th className="p-4 font-bold">Motivo</th>
                                <th className="p-4 font-bold">Bloqueado em</th>
                                <th className="p-4 font-bold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.map(item => (
                                <tr key={item.ip} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-mono font-bold text-slate-800 flex items-center gap-2">
                                        <Globe size={14} className="text-gray-400" />
                                        {item.ip}
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        {item.reason || 'Nenhum motivo especificado'}
                                    </td>
                                    <td className="p-4 text-slate-500 text-xs">
                                        {new Date(item.blocked_at).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <Button 
                                            variant="danger" 
                                            size="sm" 
                                            onClick={() => unblockIp(item.ip)}
                                            className="h-8 px-3"
                                        >
                                            <Trash2 size={14} className="mr-1" /> Desbloquear
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-400 italic">
                                        Nenhum IP bloqueado no momento.
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
