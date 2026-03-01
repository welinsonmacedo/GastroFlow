
import React, { useState } from 'react';
import { useStaff } from '../../../context/StaffContext';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/Button';
import { Shift } from '../../../types';
import { Plus, Trash2, Users, ArrowRight } from 'lucide-react';
import { Modal } from '../../../components/Modal';

export const StaffSchedules: React.FC = () => {
    const { state: staffState, addShift, deleteShift } = useStaff();
    const { showAlert, showConfirm } = useUI();
    
    const [activeView, setActiveView] = useState<'SHIFTS' | 'ASSIGNMENT'>('SHIFTS');
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [shiftForm, setShiftForm] = useState<Partial<Shift>>({
        name: '', startTime: '08:00', endTime: '16:00', breakMinutes: 60, nightShift: false
    });

    const handleAddShift = async () => {
        if (!shiftForm.name) return;
        await addShift(shiftForm);
        setIsShiftModalOpen(false);
        showAlert({ title: "Turno Criado", message: "Modelo de turno salvo.", type: "SUCCESS" });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="text-xs text-blue-800">
                    <strong>Gestão de Escalas:</strong> Defina os modelos de turnos e atribua-os aos colaboradores.
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setActiveView('SHIFTS')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${activeView === 'SHIFTS' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'}`}>Modelos de Turno</button>
                    <button onClick={() => setActiveView('ASSIGNMENT')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${activeView === 'ASSIGNMENT' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'}`}>Atribuição (Lista)</button>
                </div>
            </div>

            {/* ABA 1: MODELOS DE TURNO (LISTA) */}
            {activeView === 'SHIFTS' && (
                <>
                    <div className="flex justify-end">
                        <Button onClick={() => setIsShiftModalOpen(true)} className="bg-slate-900"><Plus size={18}/> Novo Turno</Button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-blue-50 text-blue-800 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4">Nome do Turno</th>
                                    <th className="p-4">Horário</th>
                                    <th className="p-4">Intervalo</th>
                                    <th className="p-4 text-center">Tipo</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-50">
                                {staffState.shifts.map(shift => (
                                    <tr key={shift.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-bold text-slate-700">{shift.name}</td>
                                        <td className="p-4 font-mono text-slate-600">{shift.startTime} - {shift.endTime}</td>
                                        <td className="p-4 text-blue-600 font-bold">{shift.breakMinutes} min</td>
                                        <td className="p-4 text-center">
                                            {shift.nightShift ? 
                                                <span className="bg-slate-800 text-white px-2 py-1 rounded text-[10px] uppercase font-bold">Noturno</span> : 
                                                <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-[10px] uppercase font-bold">Diurno</span>
                                            }
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => showConfirm({ title: "Excluir Turno", message: "Deseja remover este modelo?", onConfirm: () => deleteShift(shift.id) })} className="text-red-400 hover:text-red-600 p-2 rounded hover:bg-red-50 transition-colors"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                                {staffState.shifts.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nenhum turno cadastrado.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* ABA 2: ATRIBUIÇÃO (LISTA DE COLABORADORES X TURNO) */}
            {activeView === 'ASSIGNMENT' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b text-xs text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                        <Users size={14}/> Atribuição de Turno Padrão
                    </div>
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white border-b text-slate-500 font-bold text-xs uppercase">
                            <tr>
                                <th className="p-4">Colaborador</th>
                                <th className="p-4">Cargo</th>
                                <th className="p-4">Turno Atual</th>
                                <th className="p-4 text-right">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {staffState.users.map(user => {
                                const currentShift = staffState.shifts.find(s => s.id === user.shiftId);
                                return (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-bold text-slate-800">{user.name}</td>
                                        <td className="p-4 text-slate-500">{user.role}</td>
                                        <td className="p-4">
                                            {currentShift ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700">{currentShift.name}</span>
                                                    <span className="text-xs text-slate-400 font-mono">{currentShift.startTime} - {currentShift.endTime}</span>
                                                </div>
                                            ) : (
                                                <span className="text-red-400 italic text-xs">Sem turno definido</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button className="text-blue-600 hover:underline text-xs font-bold flex items-center justify-end gap-1">
                                                Editar Cadastro <ArrowRight size={12}/>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Turno */}
            <Modal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} title="Novo Modelo de Turno" variant="dialog" maxWidth="sm">
                <div className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Nome do Turno</label><input className="w-full border p-2.5 rounded-xl mt-1" placeholder="Ex: Noite Fim de Semana" value={shiftForm.name} onChange={e => setShiftForm({...shiftForm, name: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Início</label><input type="time" className="w-full border p-2.5 rounded-xl mt-1" value={shiftForm.startTime} onChange={e => setShiftForm({...shiftForm, startTime: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Fim</label><input type="time" className="w-full border p-2.5 rounded-xl mt-1" value={shiftForm.endTime} onChange={e => setShiftForm({...shiftForm, endTime: e.target.value})} /></div>
                    </div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Intervalo (Minutos)</label><input type="number" className="w-full border p-2.5 rounded-xl mt-1" value={shiftForm.breakMinutes} onChange={e => setShiftForm({...shiftForm, breakMinutes: parseInt(e.target.value)})} /></div>
                    <label className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl cursor-pointer">
                        <input type="checkbox" checked={shiftForm.nightShift} onChange={e => setShiftForm({...shiftForm, nightShift: e.target.checked})} className="w-4 h-4 text-blue-600 rounded"/>
                        <span className="text-sm font-bold text-gray-700">Turno Noturno (Vira o dia)</span>
                    </label>
                    <Button onClick={handleAddShift} className="w-full py-4 text-lg font-bold">Salvar Turno</Button>
                </div>
            </Modal>
        </div>
    );
};
