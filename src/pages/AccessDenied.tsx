
import React from 'react';
import { ShieldAlert, Lock } from 'lucide-react';

interface AccessDeniedProps {
    ip: string;
    reason?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ ip, reason }) => {
    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                <div className="bg-red-600 p-6 flex justify-center">
                    <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
                        <ShieldAlert size={48} className="text-white" />
                    </div>
                </div>
                <div className="p-8 text-center">
                    <h1 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-wide">Acesso Bloqueado</h1>
                    <p className="text-slate-500 mb-6 font-medium">
                        Seu endereço IP foi restrito pelo administrador do sistema.
                    </p>
                    
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6 text-left">
                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200">
                            <span className="text-xs font-bold text-slate-400 uppercase">Seu IP</span>
                            <span className="font-mono font-bold text-slate-700">{ip}</span>
                        </div>
                        {reason && (
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Motivo</span>
                                <p className="text-sm text-red-600 font-medium bg-red-50 p-2 rounded border border-red-100">
                                    {reason}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="text-xs text-slate-400">
                        Caso acredite que isso seja um erro, entre em contato com o suporte técnico informando seu IP.
                    </div>
                </div>
                <div className="bg-slate-100 p-4 text-center border-t border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-center gap-1">
                        <Lock size={10} /> Flux Eat Security System
                    </p>
                </div>
            </div>
        </div>
    );
};
