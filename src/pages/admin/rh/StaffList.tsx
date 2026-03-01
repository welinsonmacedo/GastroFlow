
import React, { useState } from 'react';
import { useStaff } from '../../../context/StaffContext';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/Button';
import { User, EmployeeStatus } from '../../../types';
import { Edit, Trash2, UserPlus, Building2, Calendar, BadgeCheck, DollarSign } from 'lucide-react';
import { StaffFormModal } from '../../../components/modals/StaffFormModal';

export const StaffList: React.FC = () => {
    const { state: staffState, deleteUser } = useStaff();
    const { showConfirm } = useUI();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

    const getStatusColor = (status?: EmployeeStatus) => {
        switch(status) {
            case 'ACTIVE': return 'bg-green-100 text-green-700 border-green-200';
            case 'ON_LEAVE': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'TERMINATED': return 'bg-red-100 text-red-700 border-red-200';
            case 'VACATION': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const filteredUsers = staffState.users.filter(user => {
        if (activeTab === 'ACTIVE') {
            return user.status !== 'TERMINATED';
        } else {
            return user.status === 'TERMINATED';
        }
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">Diretório de Colaboradores</h2>
                    <p className="text-sm text-gray-500">Gestão completa do quadro de funcionários.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('ACTIVE')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'ACTIVE' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Ativos
                        </button>
                        <button 
                            onClick={() => setActiveTab('INACTIVE')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'INACTIVE' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Inativos
                        </button>
                    </div>
                    <Button onClick={() => { setEditingUser(null); setIsModalOpen(true); }} className="bg-pink-600 hover:bg-pink-700 text-white border-transparent">
                        <UserPlus size={18}/> Novo Colaborador
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b">
                            <tr>
                                <th className="p-4">Colaborador</th>
                                <th className="p-4">Cargo / Função</th>
                                <th className="p-4">Departamento</th>
                                <th className="p-4">Admissão & Contrato</th>
                                <th className="p-4">Salário Base</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600 font-black text-sm shrink-0">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">{user.name}</div>
                                                <div className="text-xs text-gray-400">{user.email || 'Sem e-mail'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-medium text-slate-700">
                                            {user.customRoleName || (user.role === 'ADMIN' ? 'Administrador' : 'Cargo não definido')}
                                        </div>
                                        {user.role === 'ADMIN' && <div className="text-[10px] text-purple-600 font-bold uppercase">Sistema</div>}
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Building2 size={14} className="text-gray-400"/>
                                            {user.department || '-'}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                <Calendar size={12} className="text-gray-400"/>
                                                {user.hireDate ? new Date(user.hireDate).toLocaleDateString() : '-'}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                                <BadgeCheck size={12} className="text-blue-500"/>
                                                {user.contractType || 'CLT'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 font-mono font-bold text-slate-700">
                                        R$ {(user.baseSalary || 0).toFixed(2)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase border ${getStatusColor(user.status)}`}>
                                            {user.status || 'ACTIVE'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => { setEditingUser(user); setIsModalOpen(true); }} 
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="Editar"
                                            >
                                                <Edit size={16}/>
                                            </button>
                                            <button 
                                                onClick={() => showConfirm({ title: 'Excluir', message: 'Confirma exclusão? O histórico financeiro será mantido, mas o acesso revogado.', onConfirm: () => deleteUser(user.id) })} 
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {staffState.users.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-10 text-center text-gray-400">
                                        Nenhum colaborador encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <StaffFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} userToEdit={editingUser} variant="RH" />
        </div>
    );
};
