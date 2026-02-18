
import React, { useState } from 'react';
import { useStaff } from '../../../context/StaffContext';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/Button';
import { User, EmployeeStatus, ContractType, Role } from '../../../types';
import { Edit, Trash2, UserPlus, Phone, Mail, Building2, DollarSign, Calendar, Tag, ShieldCheck, BadgeCheck } from 'lucide-react';
import { StaffFormModal } from '../../../components/modals/StaffFormModal';

export const StaffList: React.FC = () => {
    const { state: staffState, deleteUser } = useStaff();
    const { showConfirm, showAlert } = useUI();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const getStatusColor = (status?: EmployeeStatus) => {
        switch(status) {
            case 'ACTIVE': return 'bg-green-100 text-green-700 border-green-200';
            case 'ON_LEAVE': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'TERMINATED': return 'bg-red-100 text-red-700 border-red-200';
            case 'VACATION': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">Diretório de Colaboradores</h2>
                    <p className="text-sm text-gray-500">Gestão completa do quadro de funcionários.</p>
                </div>
                <Button onClick={() => { setEditingUser(null); setIsModalOpen(true); }} className="bg-pink-600 hover:bg-pink-700 text-white border-transparent">
                    <UserPlus size={18}/> Novo Colaborador
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staffState.users.map(user => (
                    <div key={user.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-xl hover:border-pink-200 transition-all flex flex-col">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-600 font-black text-xl group-hover:bg-pink-600 group-hover:text-white transition-colors">
                                        {user.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 tracking-tight leading-none">{user.name}</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{user.role}</p>
                                    </div>
                                </div>
                                <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase border ${getStatusColor(user.status)}`}>
                                    {user.status || 'ACTIVE'}
                                </span>
                            </div>

                            <div className="space-y-2 mt-6">
                                <div className="flex items-center gap-3 text-xs text-slate-600">
                                    <Building2 size={14} className="text-gray-400"/>
                                    <span className="font-medium">{user.department || 'Setor não informado'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-600">
                                    <Calendar size={14} className="text-gray-400"/>
                                    <span className="font-medium">Admissão: {user.hireDate ? new Date(user.hireDate).toLocaleDateString() : '-'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-600">
                                    <BadgeCheck size={14} className="text-gray-400"/>
                                    <span className="font-medium">Contrato: {user.contractType || 'CLT'}</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase">Salário Base</p>
                                    <p className="text-lg font-black text-slate-800">R$ {(user.baseSalary || 0).toFixed(2)}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => { setEditingUser(user); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                                        <Edit size={18}/>
                                    </button>
                                    <button onClick={() => showConfirm({ title: 'Excluir', message: 'Confirma exclusão?', onConfirm: () => deleteUser(user.id) })} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <StaffFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} userToEdit={editingUser} />
        </div>
    );
};
