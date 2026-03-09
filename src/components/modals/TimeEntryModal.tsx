
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useStaff } from '@/core/context/StaffContext';
import { useUI } from '@/core/context/UIContext';
import { TimeEntry } from '@/types';
import { Calendar, AlertCircle, User as UserIcon } from 'lucide-react';

interface TimeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryToEdit?: TimeEntry | null;
  staffId?: string; 
}

export const TimeEntryModal: React.FC<TimeEntryModalProps> = ({ isOpen, onClose, entryToEdit, staffId: initialStaffId }) => {
  const { addTimeEntry, updateTimeEntry, state: staffState } = useStaff();
  const { showAlert } = useUI();

  const [selectedStaff, setSelectedStaff] = useState(initialStaffId || '');
  const [dateStr, setDateStr] = useState('');
  const [timeIn, setTimeIn] = useState('');
  const [timeBreakStart, setTimeBreakStart] = useState('');
  const [timeBreakEnd, setTimeBreakEnd] = useState('');
  const [timeOut, setTimeOut] = useState('');
  const [status, setStatus] = useState<'APPROVED' | 'PENDING' | 'REJECTED' | 'ABSENT' | 'JUSTIFIED_ABSENCE' | 'CORRECTED'>('APPROVED');
  const [justification, setJustification] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (entryToEdit) {
        setSelectedStaff(entryToEdit.staffId);
        setDateStr(entryToEdit.entryDate.toISOString().split('T')[0]);
        setTimeIn(entryToEdit.clockIn ? entryToEdit.clockIn.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}) : '');
        setTimeBreakStart(entryToEdit.breakStart ? entryToEdit.breakStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}) : '');
        setTimeBreakEnd(entryToEdit.breakEnd ? entryToEdit.breakEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}) : '');
        setTimeOut(entryToEdit.clockOut ? entryToEdit.clockOut.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}) : '');
        setStatus(entryToEdit.status || 'APPROVED');
        setJustification(entryToEdit.justification || '');
      } else {
        setSelectedStaff(initialStaffId || (staffState.users.length > 0 ? staffState.users[0].id : ''));
        setDateStr(new Date().toISOString().split('T')[0]);
        setTimeIn('');
        setTimeBreakStart('');
        setTimeBreakEnd('');
        setTimeOut('');
        setStatus('APPROVED');
        setJustification('');
      }
    }
  }, [isOpen, entryToEdit, initialStaffId, staffState.users]);

  const combineDateAndTime = (dateS: string, timeS: string): Date | undefined => {
      if (!timeS) return undefined;
      const [hours, minutes] = timeS.split(':').map(Number);
      const d = new Date(dateS + 'T00:00:00'); 
      d.setHours(hours, minutes, 0, 0); 
      return d;
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!dateStr) return showAlert({ title: "Data Inválida", message: "Informe a data do ponto.", type: "WARNING" });
      if (!selectedStaff) return showAlert({ title: "Erro", message: "Selecione um colaborador.", type: "ERROR" });

      try {
          const entryData: Partial<TimeEntry> = {
              entryDate: new Date(dateStr + 'T12:00:00'),
              clockIn: status === 'ABSENT' || status === 'JUSTIFIED_ABSENCE' ? undefined : combineDateAndTime(dateStr, timeIn),
              breakStart: status === 'ABSENT' || status === 'JUSTIFIED_ABSENCE' ? undefined : combineDateAndTime(dateStr, timeBreakStart),
              breakEnd: status === 'ABSENT' || status === 'JUSTIFIED_ABSENCE' ? undefined : combineDateAndTime(dateStr, timeBreakEnd),
              clockOut: status === 'ABSENT' || status === 'JUSTIFIED_ABSENCE' ? undefined : combineDateAndTime(dateStr, timeOut),
              justification: justification,
              staffId: selectedStaff,
              status: status,
              entryType: 'MANUAL'
          };

          if (entryToEdit) {
              await updateTimeEntry(entryToEdit.id, entryData);
              showAlert({ title: "Atualizado", message: "Registro de ponto alterado.", type: "SUCCESS" });
          } else {
              await addTimeEntry(entryData);
              showAlert({ title: "Lançado", message: "Registro manual criado com sucesso.", type: "SUCCESS" });
          }
          onClose();
      } catch (error) {
          showAlert({ title: "Erro", message: "Falha ao salvar registro.", type: "ERROR" });
      }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={entryToEdit ? "Editar Ponto" : "Lançamento Manual"} variant="dialog" maxWidth="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-xs text-yellow-800 flex gap-2">
                <AlertCircle size={16} className="shrink-0"/>
                <p>Alterações manuais no ponto devem ser justificadas para fins de auditoria trabalhista.</p>
            </div>

            {/* Seletor de Colaborador (Apenas na criação) */}
            {!entryToEdit && (
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Colaborador</label>
                    <div className="relative">
                         <UserIcon size={16} className="absolute left-3 top-3 text-gray-400"/>
                         <select 
                            className="w-full border pl-10 p-2.5 rounded-xl text-sm bg-white"
                            value={selectedStaff}
                            onChange={e => setSelectedStaff(e.target.value)}
                         >
                             {staffState.users.map(u => (
                                 <option key={u.id} value={u.id}>{u.name}</option>
                             ))}
                         </select>
                    </div>
                </div>
            )}

            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label>
                <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-3 text-gray-400"/>
                    <input 
                        type="date" 
                        required 
                        className="w-full border pl-10 p-2.5 rounded-xl text-sm" 
                        value={dateStr} 
                        onChange={e => setDateStr(e.target.value)} 
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status / Tipo de Registro</label>
                <select 
                    className="w-full border p-2.5 rounded-xl text-sm bg-white"
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                >
                    <option value="APPROVED">Presente (Normal)</option>
                    <option value="ABSENT">Falta Injustificada</option>
                    <option value="JUSTIFIED_ABSENCE">Falta Justificada (Atestado)</option>
                    <option value="PENDING">Pendente de Aprovação</option>
                </select>
            </div>

            {(status !== 'ABSENT' && status !== 'JUSTIFIED_ABSENCE') && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-green-600 uppercase mb-1">Entrada</label>
                        <input type="time" className="w-full border p-2.5 rounded-xl text-sm font-mono" value={timeIn} onChange={e => setTimeIn(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-red-600 uppercase mb-1">Saída</label>
                        <input type="time" className="w-full border p-2.5 rounded-xl text-sm font-mono" value={timeOut} onChange={e => setTimeOut(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-orange-600 uppercase mb-1">Início Intervalo</label>
                        <input type="time" className="w-full border p-2.5 rounded-xl text-sm font-mono" value={timeBreakStart} onChange={e => setTimeBreakStart(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Fim Intervalo</label>
                        <input type="time" className="w-full border p-2.5 rounded-xl text-sm font-mono" value={timeBreakEnd} onChange={e => setTimeBreakEnd(e.target.value)} />
                    </div>
                </div>
            )}

            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Justificativa / Observação</label>
                <textarea 
                    className="w-full border p-3 rounded-xl text-sm focus:border-blue-500 outline-none" 
                    rows={2} 
                    placeholder="Ex: Esquecimento de marcação, ajuste de horário..." 
                    value={justification} 
                    onChange={e => setJustification(e.target.value)} 
                />
            </div>

            <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
                <Button type="submit" className="flex-1">Salvar Registro</Button>
            </div>
        </form>
    </Modal>
  );
};
