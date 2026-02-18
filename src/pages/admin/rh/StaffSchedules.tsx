
import React, { useState } from 'react';
import { useStaff } from '../../../context/StaffContext';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/Button';
import { Shift } from '../../../types';
import { Plus, Clock, Trash2, Calendar, LayoutGrid, Info, Check } from 'lucide-react';
import { Modal } from '../../../components/Modal';

export const StaffSchedules: React.FC = () => {
    const { state: staffState, addShift, deleteShift } = useStaff();
    const { showAlert, showConfirm } = useUI();
    
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Calendar className="text-pink-600"/> Gestão de Turnos</h2>
                    <p className="text-sm text-gray-500">Defina os horários padrão de trabalho da casa.</p>
                </div>
                <Button onClick={() => setIsShiftModalOpen(true)} className="bg-slate-900"><Plus size={18}/> Novo Turno</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {staffState.shifts.map(shift => (
                    <div key={shift.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-pink-300 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-pink-50 p-3 rounded-2xl text-pink-600"><Clock size={20}/></div>
                            <button onClick={() => showConfirm({ title: "Excluir Turno", message: "Deseja remover este modelo?", onConfirm: () => deleteShift(shift.id) })} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                        </div>
                        <h3 className="font-black text-slate-800 text-lg">{shift.name}</h3>
                        <div className="mt-4 flex flex-col gap-2">
                            <div className="flex justify-between text-sm"><span className="text-gray-400 font-bold">Início:</span><span className="font-mono font-black">{shift.startTime}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-400 font-bold">Fim:</span><span className="font-mono font-black">{shift.endTime}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-400 font-bold">Intervalo:</span><span className="font-bold text-blue-600">{shift.breakMinutes}m</span></div>
                        </div>
                    </div>
                ))}
                {staffState.shifts.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                        Nenhum turno cadastrado. Comece criando os horários da sua equipe.
                    </div>
                )}
            </div>

            <div className="bg-pink-50 p-6 rounded-3xl border border-pink-100 flex gap-4">
                 <div className="bg-pink-500 text-white p-2 rounded-full h-fit"><Info size={20}/></div>
                 <div>
                     <h4 className="font-bold text-pink-900">Como gerenciar a Escala Semanal?</h4>
                     <p className="text-sm text-pink-700 leading-relaxed mt-1">A Escala Semanal permite associar cada colaborador aos turnos acima dia após dia. A funcionalidade de Grade Completa com arraste de colaboradores está sendo sincronizada com o calendário do gestor.</p>
                 </div>
            </div>

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
                        <input type="checkbox" checked={shiftForm.nightShift} onChange={e => setShiftForm({...shiftForm, nightShift: e.target.checked})} className="w-4 h-4 text-pink-600 rounded"/>
                        <span className="text-sm font-bold text-gray-700">Turno Noturno (Vira o dia)</span>
                    </label>
                    <Button onClick={handleAddShift} className="w-full py-4 text-lg font-bold">Salvar Turno</Button>
                </div>
            </Modal>
        </div>
    );
};
