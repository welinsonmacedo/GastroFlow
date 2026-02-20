
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthProvider';
import { useStaff } from '../context/StaffContext';
import { useRestaurant } from '../context/RestaurantContext';
import { Button } from '../components/Button';
import { Clock, PlayCircle, PauseCircle, StopCircle, LogOut, ArrowLeft, History, MapPin } from 'lucide-react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';

export const TimeClock: React.FC = () => {
    const { state: authState, logout } = useAuth();
    const { state: restState } = useRestaurant();
    const { state: staffState, registerTime, fetchData } = useStaff();
    const navigate = useNavigate();

    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [locationError, setLocationError] = useState('');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        fetchData(); // Garante dados atualizados ao entrar
        return () => clearInterval(timer);
    }, []);

    const user = authState.currentUser;
    // Pega o registro de hoje (se houver)
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysEntry = staffState.timeEntries.find(t => 
        t.staffId === user?.id && 
        new Date(t.entryDate).toISOString().split('T')[0] === todayStr
    );

    // Determina o estado atual
    let status: 'OFF' | 'WORKING' | 'ON_BREAK' | 'FINISHED' = 'OFF';
    if (todaysEntry) {
        if (todaysEntry.clockIn && !todaysEntry.clockOut) {
            if (todaysEntry.breakStart && !todaysEntry.breakEnd) {
                status = 'ON_BREAK';
            } else {
                status = 'WORKING';
            }
        } else if (todaysEntry.clockIn && todaysEntry.clockOut) {
            status = 'FINISHED';
        }
    }

    // Helper para calcular distância (Haversine)
    const getDistanceFromLatLonInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // Raio da terra em metros
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2); 
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        return R * c;
    };

    const handleClockAction = async (type: 'IN' | 'BREAK_START' | 'BREAK_END' | 'OUT') => {
        if (!user) return;
        setLoading(true);
        setLocationError('');

        const config = restState.businessInfo?.timeClock || { validationType: 'NONE', maxDistanceMeters: 100, maxDailyPunches: 4 };

        // Validação 1: Limite de 4 pontos (Se NONE)
        if (config.validationType === 'NONE') {
            // O fluxo padrão já limita a 4 batidas (Entrada, Pausa, Volta, Saída)
            // Se já tiver saída, bloqueia
            if (todaysEntry?.clockOut) {
                setLocationError(`Limite diário de registros atingido (${config.maxDailyPunches || 4} pontos).`);
                setLoading(false);
                return;
            }
            
            // Se for apenas validação de quantidade, o fluxo natural de IN -> BREAK -> END -> OUT já são 4.
            // Então apenas prosseguimos.
        }

        // Validação 2: Geolocalização
        if (config.validationType === 'GEOLOCATION') {
            if (!config.restaurantLocation?.lat || !config.restaurantLocation?.lng) {
                setLocationError("Localização da empresa não configurada. Contate o administrador.");
                setLoading(false);
                return;
            }

            if (!navigator.geolocation) {
                setLocationError("Geolocalização não suportada neste dispositivo.");
                setLoading(false);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const dist = getDistanceFromLatLonInMeters(
                        position.coords.latitude,
                        position.coords.longitude,
                        config.restaurantLocation!.lat,
                        config.restaurantLocation!.lng
                    );

                    const maxDist = config.maxDistanceMeters || 100;

                    if (dist > maxDist) {
                        setLocationError(`Você está a ${Math.round(dist)}m da empresa. Máximo permitido: ${maxDist}m.`);
                        setLoading(false);
                        return;
                    }

                    // Sucesso na validação
                    try {
                        await registerTime(user.id, type);
                    } catch (e) {
                        alert("Erro ao registrar ponto.");
                    } finally {
                        setLoading(false);
                    }
                },
                (error) => {
                    console.warn("Geolocalização falhou", error);
                    setLocationError("Não foi possível obter sua localização. Verifique as permissões do GPS.");
                    setLoading(false);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
            return; // Sai para esperar o callback
        }

        // Se chegou aqui (NONE validation ou fallback), registra direto
        try {
            await registerTime(user.id, type);
        } catch (e) {
            alert("Erro ao registrar ponto.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600 rounded-full blur-[150px] opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600 rounded-full blur-[150px] opacity-20 translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

            {/* Header */}
            <header className="p-6 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/modules')} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg leading-none">{restState.theme.restaurantName}</h1>
                        <p className="text-xs text-slate-400">Ponto Eletrônico</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="font-bold text-sm">{user?.name}</p>
                        <p className="text-xs text-slate-400">{user?.role}</p>
                    </div>
                    <button onClick={logout} className="p-2 text-red-400 hover:text-red-300">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                
                {/* Relógio */}
                <div className="mb-10 text-center">
                    <p className="text-slate-400 font-medium uppercase tracking-widest text-sm mb-2">
                        {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <div className="text-7xl md:text-9xl font-black font-mono tracking-tighter text-white drop-shadow-2xl">
                        {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        <span className="text-2xl md:text-4xl text-slate-500 ml-2">
                            {currentTime.toLocaleTimeString('pt-BR', { second: '2-digit' })}
                        </span>
                    </div>
                </div>

                {/* Status Indicator */}
                <div className={`mb-12 px-6 py-2 rounded-full border flex items-center gap-2 ${
                    status === 'WORKING' ? 'bg-green-500/20 border-green-500 text-green-400' :
                    status === 'ON_BREAK' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' :
                    status === 'FINISHED' ? 'bg-slate-700/50 border-slate-600 text-slate-400' :
                    'bg-slate-700/50 border-slate-600 text-slate-300'
                }`}>
                    <div className={`w-3 h-3 rounded-full ${status === 'WORKING' || status === 'ON_BREAK' ? 'animate-pulse' : ''} ${
                        status === 'WORKING' ? 'bg-green-500' :
                        status === 'ON_BREAK' ? 'bg-yellow-500' :
                        'bg-slate-500'
                    }`}></div>
                    <span className="text-sm font-bold uppercase tracking-wider">
                        {status === 'OFF' && 'Fora de Turno'}
                        {status === 'WORKING' && 'Em Expediente'}
                        {status === 'ON_BREAK' && 'Em Intervalo'}
                        {status === 'FINISHED' && 'Expediente Encerrado'}
                    </span>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                    {status === 'OFF' && (
                        <button 
                            onClick={() => handleClockAction('IN')} 
                            disabled={loading}
                            className="col-span-1 md:col-span-2 bg-green-600 hover:bg-green-500 text-white h-32 rounded-3xl font-black text-2xl uppercase tracking-widest shadow-lg shadow-green-900/50 flex flex-col items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            <PlayCircle size={48} />
                            Iniciar Turno
                        </button>
                    )}

                    {status === 'WORKING' && (
                        <>
                            <button 
                                onClick={() => handleClockAction('BREAK_START')} 
                                disabled={loading}
                                className="bg-yellow-600 hover:bg-yellow-500 text-white h-32 rounded-3xl font-bold text-xl uppercase tracking-wider shadow-lg shadow-yellow-900/50 flex flex-col items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                <PauseCircle size={40} />
                                Iniciar Pausa
                            </button>
                            <button 
                                onClick={() => handleClockAction('OUT')} 
                                disabled={loading}
                                className="bg-red-600 hover:bg-red-500 text-white h-32 rounded-3xl font-bold text-xl uppercase tracking-wider shadow-lg shadow-red-900/50 flex flex-col items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                <StopCircle size={40} />
                                Encerrar Dia
                            </button>
                        </>
                    )}

                    {status === 'ON_BREAK' && (
                        <button 
                            onClick={() => handleClockAction('BREAK_END')} 
                            disabled={loading}
                            className="col-span-1 md:col-span-2 bg-blue-600 hover:bg-blue-500 text-white h-32 rounded-3xl font-black text-2xl uppercase tracking-widest shadow-lg shadow-blue-900/50 flex flex-col items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            <PlayCircle size={48} />
                            Voltar do Intervalo
                        </button>
                    )}

                    {status === 'FINISHED' && (
                         <div className="col-span-1 md:col-span-2 bg-slate-800/50 border border-slate-700 h-32 rounded-3xl flex flex-col items-center justify-center text-slate-400">
                             <CheckCircle size={40} className="mb-2 text-green-500" />
                             <p className="font-bold">Bom descanso!</p>
                             <p className="text-sm">Turno finalizado às {todaysEntry?.clockOut?.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                         </div>
                    )}
                </div>

                {locationError && <p className="text-red-400 mt-4 text-sm font-bold bg-red-900/20 px-4 py-2 rounded-lg">{locationError}</p>}
            </main>

            {/* Footer Summary */}
            <div className="p-6 border-t border-slate-800 bg-slate-900/50 backdrop-blur-md relative z-10">
                <div className="max-w-2xl mx-auto flex items-center justify-between text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                        <History size={16} />
                        <span>Histórico Recente</span>
                    </div>
                    {todaysEntry ? (
                        <div className="font-mono">
                            E: {todaysEntry.clockIn?.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) || '--:--'} • 
                            S: {todaysEntry.clockOut?.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) || '--:--'}
                        </div>
                    ) : (
                        <span>Nenhum registro hoje</span>
                    )}
                </div>
            </div>
        </div>
    );
};

// Icon import helper if missing
import { CheckCircle } from 'lucide-react';
