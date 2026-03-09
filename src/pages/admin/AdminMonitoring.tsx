
import React, { useState, useEffect } from 'react';
import { useRestaurant } from '@/core/context/RestaurantContext';
import { supabase } from '@/core/api/supabaseClient';
import { SystemAccessLog } from '@/types';
import { User, Clock, Monitor, RefreshCcw, Activity } from 'lucide-react';
import { Button } from '../../components/Button';

export const AdminMonitoring: React.FC = () => {
  const { state: restState } = useRestaurant();
  const [activeTab, setActiveTab] = useState<'REALTIME' | 'HISTORY'>('REALTIME');
  const [logs, setLogs] = useState<SystemAccessLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Atualiza o relógio local a cada minuto para recalcular durações
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
      if (!restState.tenantId) return;
      setLoading(true);

      try {
          // Busca logs e faz join com staff para pegar nomes
          const { data, error } = await supabase
              .from('system_access_logs')
              .select(`
                  *,
                  staff:staff_id (name, role)
              `)
              .eq('tenant_id', restState.tenantId)
              .order('last_seen_at', { ascending: false })
              .limit(100);

          if (error) throw error;

          if (data) {
              const formattedLogs: SystemAccessLog[] = data.map((log: any) => ({
                  id: log.id,
                  staff_id: log.staff_id,
                  login_at: new Date(log.login_at),
                  last_seen_at: new Date(log.last_seen_at),
                  logout_at: log.logout_at ? new Date(log.logout_at) : undefined,
                  device_info: log.device_info,
                  staff_name: log.staff?.name || 'Usuário Removido',
                  staff_role: log.staff?.role || 'Unknown'
              }));
              setLogs(formattedLogs);
          }
      } catch (err) {
          console.error("Erro ao buscar logs", err);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchLogs();
      
      // Auto refresh a cada 30 segundos
      const interval = setInterval(fetchLogs, 30000);
      return () => clearInterval(interval);
  }, [restState.tenantId]);

  // Filtra usuários online (Vistos nos últimos 5 minutos e sem logout)
  const onlineUsers = logs.filter(log => {
      if (log.logout_at) return false;
      const diffMs = currentTime.getTime() - log.last_seen_at.getTime();
      return diffMs < 5 * 60 * 1000; // 5 minutos
  });

  const getDuration = (start: Date, end?: Date) => {
      const finalEnd = end || currentTime;
      const diffMs = finalEnd.getTime() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
  };

  const getRoleColor = (role?: string) => {
      switch (role) {
          case 'ADMIN': return 'bg-purple-100 text-purple-700';
          case 'WAITER': return 'bg-orange-100 text-orange-700';
          case 'KITCHEN': return 'bg-red-100 text-red-700';
          case 'CASHIER': return 'bg-green-100 text-green-700';
          default: return 'bg-gray-100 text-gray-700';
      }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
            <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <Activity className="text-blue-600"/> Monitoramento
                </h2>
                <p className="text-sm text-gray-500">Acompanhe quem está utilizando o sistema.</p>
            </div>
            <div className="flex gap-2">
                 <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setActiveTab('REALTIME')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'REALTIME' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Em Tempo Real</button>
                    <button onClick={() => setActiveTab('HISTORY')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'HISTORY' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Histórico</button>
                </div>
                <Button onClick={fetchLogs} disabled={loading} variant="secondary" className="px-3">
                    <RefreshCcw size={18} className={loading ? "animate-spin" : ""}/>
                </Button>
            </div>
        </div>

        {activeTab === 'REALTIME' && (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg shadow-blue-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-white/20 p-3 rounded-xl"><User size={24}/></div>
                            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase animate-pulse">Ao Vivo</span>
                        </div>
                        <h3 className="text-4xl font-black">{onlineUsers.length}</h3>
                        <p className="text-blue-100 text-sm font-medium">Usuários Online Agora</p>
                    </div>
                </div>

                <h3 className="font-bold text-slate-700 text-lg">Sessões Ativas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {onlineUsers.map(user => (
                        <div key={user.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full m-3 shadow-[0_0_10px_#22c55e]"></div>
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg">
                                {user.staff_name?.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-slate-800 truncate">{user.staff_name}</h4>
                                    <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${getRoleColor(user.staff_role)}`}>
                                        {user.staff_role}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-3">
                                    <span className="flex items-center gap-1"><Clock size={12}/> {getDuration(user.login_at)}</span>
                                    <span className="flex items-center gap-1"><Monitor size={12}/> Online</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {onlineUsers.length === 0 && (
                        <div className="col-span-full py-10 text-center text-gray-400 bg-white rounded-2xl border-2 border-dashed">
                            Nenhum usuário ativo no momento.
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'HISTORY' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-widest border-b">
                            <tr>
                                <th className="p-4">Usuário</th>
                                <th className="p-4">Cargo</th>
                                <th className="p-4">Entrada</th>
                                <th className="p-4">Saída / Última Ativ.</th>
                                <th className="p-4">Duração</th>
                                <th className="p-4">Dispositivo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {logs.map(log => {
                                const isOnline = !log.logout_at && (currentTime.getTime() - log.last_seen_at.getTime() < 5 * 60 * 1000);
                                return (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                                            {isOnline && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                                            {log.staff_name}
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-[10px] px-2 py-1 rounded font-black uppercase ${getRoleColor(log.staff_role)}`}>
                                                {log.staff_role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-600 font-mono text-xs">
                                            {log.login_at.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-gray-600 font-mono text-xs">
                                            {log.logout_at ? log.logout_at.toLocaleString() : (
                                                <span className="text-green-600 font-bold">Ativo ({log.last_seen_at.toLocaleTimeString()})</span>
                                            )}
                                        </td>
                                        <td className="p-4 font-bold text-slate-700">
                                            {getDuration(log.login_at, log.logout_at || (isOnline ? undefined : log.last_seen_at))}
                                        </td>
                                        <td className="p-4 text-xs text-gray-400 truncate max-w-[200px]" title={log.device_info}>
                                            {log.device_info || '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
  );
};
