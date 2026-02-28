import React, { useState } from 'react';
import { useStaff } from '../../../context/StaffContext';
import { useUI } from '../../../context/UIContext';
import { RecurringEvent, PayrollEventType } from '../../../types';
import { Plus, Trash2, Edit2, CalendarClock, DollarSign, Percent, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/Button';
import { Modal } from '../../../components/Modal';

export const StaffRecurringEvents: React.FC = () => {
    const { state, addRecurringEvent, updateRecurringEvent, deleteRecurringEvent } = useStaff();
    const { showAlert, showConfirm } = useUI();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<RecurringEvent | null>(null);
    
    const [form, setForm] = useState<Partial<RecurringEvent>>({
        staffId: '',
        type: 'BONUS',
        description: '',
        value: 0,
        isActive: true
    });

    const handleOpenModal = (evt?: RecurringEvent) => {
        if (evt) {
            setEditingEvent(evt);
            setForm(evt);
        } else {
            setEditingEvent(null);
            setForm({
                staffId: '',
                type: 'BONUS',
                description: '',
                value: 0,
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.staffId || !form.description || !form.value) {
            return showAlert({ title: "Atenção", message: "Preencha todos os campos obrigatórios.", type: "WARNING" });
        }

        try {
            if (editingEvent) {
                await updateRecurringEvent({ ...editingEvent, ...form } as RecurringEvent);
                showAlert({ title: "Sucesso", message: "Evento atualizado.", type: "SUCCESS" });
            } else {
                await addRecurringEvent(form);
                showAlert({ title: "Sucesso", message: "Evento recorrente criado.", type: "SUCCESS" });
            }
            setIsModalOpen(false);
        } catch (error: any) {
            showAlert({ title: "Erro", message: error.message, type: "ERROR" });
        }
    };

    const handleDelete = (id: string) => {
        showConfirm({
            title: "Excluir Evento?",
            message: "Tem certeza que deseja remover este evento recorrente? Ele não será mais gerado nas próximas folhas.",
            onConfirm: () => deleteRecurringEvent(id)
        });
    };

    const getTypeColor = (typeId: string) => {
        const evtType = state.eventTypes.find(t => t.id === typeId);
        if (!evtType) return 'text-slate-600 bg-slate-50 border-slate-200';
        if (evtType.operation === '+') return 'text-green-600 bg-green-50 border-green-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    const getTypeLabel = (typeId: string) => {
        const evtType = state.eventTypes.find(t => t.id === typeId);
        return evtType ? evtType.name : typeId;
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <CalendarClock className="text-blue-600"/> Eventos Recorrentes
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Configure lançamentos fixos (bônus, descontos, insalubridade) que se repetem todo mês para os colaboradores.
                    </p>
                </div>
                <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                    <Plus size={18} className="mr-2"/> Novo Evento Fixo
                </Button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-xs border-b">
                        <tr>
                            <th className="p-4">Colaborador</th>
                            <th className="p-4">Tipo</th>
                            <th className="p-4">Descrição</th>
                            <th className="p-4 text-right">Valor (R$)</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {state.recurringEvents.map(evt => {
                            const user = state.users.find(u => u.id === evt.staffId);
                            return (
                                <tr key={evt.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-bold text-slate-800">{user?.name || 'Desconhecido'}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${getTypeColor(evt.type)}`}>
                                            {getTypeLabel(evt.type)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-600">{evt.description}</td>
                                    <td className="p-4 text-right font-mono font-bold text-slate-800">
                                        {evt.value.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${evt.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {evt.isActive ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => handleOpenModal(evt)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg mr-2 transition-colors"><Edit2 size={16}/></button>
                                        <button onClick={() => handleDelete(evt.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            );
                        })}
                        {state.recurringEvents.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-500">
                                    Nenhum evento recorrente configurado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEvent ? "Editar Evento Fixo" : "Novo Evento Fixo"} onSave={handleSave}>
                <div className="space-y-4 pt-4">
                    <div>
                        <label className="block text-xs font-bold mb-1 text-slate-600">Colaborador *</label>
                        <select 
                            className="w-full border p-2.5 rounded-xl text-sm bg-white" 
                            value={form.staffId} 
                            onChange={e => setForm({...form, staffId: e.target.value})}
                        >
                            <option value="">Selecione...</option>
                            {state.users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-600">Tipo de Evento *</label>
                            <select 
                                className="w-full border p-2.5 rounded-xl text-sm bg-white" 
                                value={form.type} 
                                onChange={e => setForm({...form, type: e.target.value as PayrollEventType})}
                            >
                                <option value="">Selecione...</option>
                                {state.eventTypes.filter(t => t.isActive).map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.operation})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-600">
                                {state.eventTypes.find(t => t.id === form.type)?.calculationType === 'PERCENTAGE' ? 'Porcentagem (%) *' : 'Valor (R$) *'}
                            </label>
                            <input 
                                type="number" 
                                step="0.01"
                                className="w-full border p-2.5 rounded-xl text-sm" 
                                value={form.value || ''} 
                                onChange={e => setForm({...form, value: parseFloat(e.target.value)})}
                                placeholder={state.eventTypes.find(t => t.id === form.type)?.calculationType === 'PERCENTAGE' ? "0.00 %" : "0.00"}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold mb-1 text-slate-600">Descrição no Holerite *</label>
                        <input 
                            type="text" 
                            className="w-full border p-2.5 rounded-xl text-sm" 
                            value={form.description || ''} 
                            onChange={e => setForm({...form, description: e.target.value})}
                            placeholder="Ex: Insalubridade 20%, Desconto Plano de Saúde..."
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input 
                            type="checkbox" 
                            id="isActive" 
                            checked={form.isActive} 
                            onChange={e => setForm({...form, isActive: e.target.checked})}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300"
                        />
                        <label htmlFor="isActive" className="text-sm font-bold text-slate-700">Evento Ativo (Gerar na próxima folha)</label>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
