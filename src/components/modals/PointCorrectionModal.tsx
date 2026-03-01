import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useStaff } from '../../context/StaffContext';
import { useUI } from '../../context/UIContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { Button } from '../Button';
import { TimeEntry } from '../../types';
import { printContract } from '../../utils/printContract';
import { Printer, AlertTriangle } from 'lucide-react';

interface PointCorrectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    entryToCorrect: TimeEntry | null;
}

export const PointCorrectionModal: React.FC<PointCorrectionModalProps> = ({ isOpen, onClose, entryToCorrect }) => {
    const { state: staffState, addTimeEntry, updateTimeEntry } = useStaff();
    const { showAlert, showConfirm } = useUI();
    const { state: restState } = useRestaurant();
    const { businessInfo } = restState;

    const [form, setForm] = useState({
        clockIn: '',
        breakStart: '',
        breakEnd: '',
        clockOut: '',
        justification: '',
        templateId: ''
    });

    useEffect(() => {
        if (entryToCorrect) {
            setForm({
                clockIn: entryToCorrect.clockIn ? new Date(entryToCorrect.clockIn).toTimeString().slice(0, 5) : '',
                breakStart: entryToCorrect.breakStart ? new Date(entryToCorrect.breakStart).toTimeString().slice(0, 5) : '',
                breakEnd: entryToCorrect.breakEnd ? new Date(entryToCorrect.breakEnd).toTimeString().slice(0, 5) : '',
                clockOut: entryToCorrect.clockOut ? new Date(entryToCorrect.clockOut).toTimeString().slice(0, 5) : '',
                justification: '',
                templateId: ''
            });
        }
    }, [entryToCorrect]);

    const formatTime = (date?: Date) => date ? new Date(date).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '--:--';

    const handleSave = () => {
        if (!entryToCorrect) return;
        if (!form.justification) return showAlert({ title: "Erro", message: "Justificativa é obrigatória.", type: "ERROR" });
        if (!form.templateId) return showAlert({ title: "Erro", message: "Selecione um modelo de termo de consentimento.", type: "ERROR" });

        showConfirm({ 
            title: "Confirmar Correção", 
            message: "Isso irá inativar o registro original e criar um novo. Deseja continuar e imprimir o termo?",
            onConfirm: async () => {
                try {
                    // 1. Update old entry to CORRECTED
                    await updateTimeEntry(entryToCorrect.id, { status: 'CORRECTED' });

                    // 2. Create new entry
                    const dateStr = entryToCorrect.entryDate instanceof Date 
                        ? entryToCorrect.entryDate.toISOString().split('T')[0] 
                        : new Date(entryToCorrect.entryDate).toISOString().split('T')[0];

                    const newEntry: Partial<TimeEntry> = {
                        staffId: entryToCorrect.staffId,
                        entryDate: entryToCorrect.entryDate,
                        clockIn: form.clockIn ? new Date(`${dateStr}T${form.clockIn}`) : undefined,
                        breakStart: form.breakStart ? new Date(`${dateStr}T${form.breakStart}`) : undefined,
                        breakEnd: form.breakEnd ? new Date(`${dateStr}T${form.breakEnd}`) : undefined,
                        clockOut: form.clockOut ? new Date(`${dateStr}T${form.clockOut}`) : undefined,
                        justification: `Correção: ${form.justification}`,
                        status: 'APPROVED',
                        originalEntryId: entryToCorrect.id,
                        correctionReason: form.justification
                    };

                    await addTimeEntry(newEntry);

                    // 3. Print Consent Form
                    const template = staffState.contractTemplates.find(t => t.id === form.templateId);
                    const user = staffState.users.find(u => u.id === entryToCorrect.staffId);
                    const hrRole = staffState.hrJobRoles.find(r => r.id === user?.hrJobRoleId);
                    const shift = staffState.shifts.find(s => s.id === user?.shiftId);

                    if (template && user && businessInfo) {
                        const oldTime = `${formatTime(entryToCorrect.clockIn)} - ${formatTime(entryToCorrect.breakStart)}/${formatTime(entryToCorrect.breakEnd)} - ${formatTime(entryToCorrect.clockOut)}`;
                        const newTime = `${form.clockIn || '--:--'} - ${form.breakStart || '--:--'}/${form.breakEnd || '--:--'} - ${form.clockOut || '--:--'}`;

                        printContract(
                            template.content, 
                            user, 
                            businessInfo, 
                            hrRole?.title || '', 
                            shift?.name || '',
                            {
                                'data_ponto': new Date(entryToCorrect.entryDate).toLocaleDateString('pt-BR'),
                                'horario_anterior': oldTime,
                                'horario_corrigido': newTime,
                                'justificativa': form.justification
                            }
                        );
                    }

                    showAlert({ title: "Sucesso", message: "Correção realizada com sucesso.", type: "SUCCESS" });
                    onClose();
                } catch (error: any) {
                    showAlert({ title: "Erro", message: error.message, type: "ERROR" });
                }
            }
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Correção de Ponto">
            <div className="space-y-6 pt-4">
                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 flex items-start gap-3">
                    <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={18}/>
                    <p className="text-sm text-yellow-800">
                        A correção de ponto inativará o registro original e criará um novo. 
                        É obrigatório imprimir e assinar o termo de consentimento.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold mb-1 text-slate-500">Horário Original</label>
                        <div className="p-3 bg-slate-100 rounded-xl text-sm font-mono text-slate-600">
                            {formatTime(entryToCorrect?.clockIn)} - {formatTime(entryToCorrect?.breakStart)} / {formatTime(entryToCorrect?.breakEnd)} - {formatTime(entryToCorrect?.clockOut)}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 text-slate-500">Data</label>
                        <div className="p-3 bg-slate-100 rounded-xl text-sm font-bold text-slate-700">
                            {entryToCorrect?.entryDate ? new Date(entryToCorrect.entryDate).toLocaleDateString() : '-'}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold mb-1 text-slate-600">Nova Entrada</label>
                        <input type="time" className="w-full border p-2 rounded-xl text-sm" value={form.clockIn} onChange={e => setForm({...form, clockIn: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 text-slate-600">Início Intervalo</label>
                        <input type="time" className="w-full border p-2 rounded-xl text-sm" value={form.breakStart} onChange={e => setForm({...form, breakStart: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 text-slate-600">Fim Intervalo</label>
                        <input type="time" className="w-full border p-2 rounded-xl text-sm" value={form.breakEnd} onChange={e => setForm({...form, breakEnd: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 text-slate-600">Nova Saída</label>
                        <input type="time" className="w-full border p-2 rounded-xl text-sm" value={form.clockOut} onChange={e => setForm({...form, clockOut: e.target.value})} />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold mb-1 text-slate-600">Justificativa da Correção *</label>
                    <textarea 
                        className="w-full border p-3 rounded-xl text-sm h-24 resize-none" 
                        placeholder="Ex: Esquecimento de marcação, erro no relógio..."
                        value={form.justification}
                        onChange={e => setForm({...form, justification: e.target.value})}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold mb-1 text-slate-600">Modelo do Termo de Consentimento *</label>
                    <select 
                        className="w-full border p-3 rounded-xl text-sm bg-white"
                        value={form.templateId}
                        onChange={e => setForm({...form, templateId: e.target.value})}
                    >
                        <option value="">Selecione um modelo...</option>
                        {staffState.contractTemplates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                        Crie modelos em "Configurações de RH" {'>'} "Gerador de Modelos". Use variáveis como {'{{horario_anterior}}'}, {'{{horario_corrigido}}'}, {'{{justificativa}}'}.
                    </p>
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSave} className="bg-blue-600 text-white hover:bg-blue-700">
                        <Printer size={18} className="mr-2"/> Salvar e Imprimir Termo
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
