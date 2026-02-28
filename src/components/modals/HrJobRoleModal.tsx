import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useStaff } from '../../context/StaffContext';
import { useUI } from '../../context/UIContext';
import { HrJobRole } from '../../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    role?: HrJobRole | null;
}

export const HrJobRoleModal: React.FC<Props> = ({ isOpen, onClose, role }) => {
    const { addHrJobRole, updateHrJobRole, state } = useStaff();
    const { showAlert } = useUI();
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState<Partial<HrJobRole>>({
        title: '',
        cboCode: '',
        description: '',
        baseSalary: 0,
        customRoleId: '',
        isActive: true
    });

    useEffect(() => {
        if (role) {
            setForm(role);
        } else {
            setForm({
                title: '',
                cboCode: '',
                description: '',
                baseSalary: 0,
                customRoleId: '',
                isActive: true
            });
        }
    }, [role, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.cboCode) {
            return showAlert({ title: "Atenção", message: "Preencha o título e o CBO.", type: 'WARNING' });
        }

        setLoading(true);
        try {
            if (role?.id) {
                await updateHrJobRole(form as HrJobRole);
                showAlert({ title: "Sucesso", message: "Cargo atualizado.", type: 'SUCCESS' });
            } else {
                await addHrJobRole(form);
                showAlert({ title: "Sucesso", message: "Cargo cadastrado.", type: 'SUCCESS' });
            }
            onClose();
        } catch (error: any) {
            showAlert({ title: "Erro", message: error.message, type: 'ERROR' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={role ? "Editar Cargo (CBO)" : "Novo Cargo (CBO)"}>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-1">Título do Cargo *</label>
                        <input 
                            required 
                            type="text" 
                            className="w-full border p-2.5 rounded-xl text-sm" 
                            value={form.title} 
                            onChange={e => setForm({...form, title: e.target.value})}
                            placeholder="Ex: Garçom, Cozinheiro..."
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Código CBO *</label>
                        <input 
                            required 
                            type="text" 
                            className="w-full border p-2.5 rounded-xl text-sm font-mono" 
                            value={form.cboCode} 
                            onChange={e => setForm({...form, cboCode: e.target.value})}
                            placeholder="Ex: 5134-05"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Salário Base Sugerido (R$)</label>
                        <input 
                            type="number" 
                            step="0.01"
                            className="w-full border p-2.5 rounded-xl text-sm" 
                            value={form.baseSalary} 
                            onChange={e => setForm({...form, baseSalary: parseFloat(e.target.value)})}
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-1">Vincular a Perfil de Acesso (Opcional)</label>
                        <select 
                            className="w-full border p-2.5 rounded-xl text-sm bg-white" 
                            value={form.customRoleId || ''} 
                            onChange={e => setForm({...form, customRoleId: e.target.value || undefined})}
                        >
                            <option value="">Nenhum (Apenas RH)</option>
                            {state.roles.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Se vinculado, ao selecionar este cargo na admissão, o funcionário receberá automaticamente as permissões deste perfil.
                        </p>
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-1">Descrição / Atribuições</label>
                        <textarea 
                            className="w-full border p-2.5 rounded-xl text-sm" 
                            rows={3}
                            value={form.description || ''} 
                            onChange={e => setForm({...form, description: e.target.value})}
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
                    <Button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                        {loading ? 'Salvando...' : 'Salvar Cargo'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
