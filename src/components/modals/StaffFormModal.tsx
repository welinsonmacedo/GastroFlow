
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useStaff } from '../../context/StaffContext';
import { useUI } from '../../context/UIContext';
import { User, Role, ContractType, WorkModel } from '../../types';
import { Shield, Mail, User as UserIcon, Briefcase, Clock } from 'lucide-react';

interface StaffFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: User | null;
  variant?: 'ACCESS' | 'RH';
}

export const StaffFormModal: React.FC<StaffFormModalProps> = ({ isOpen, onClose, userToEdit, variant = 'ACCESS' }) => {
  const { addUser, updateUser, state } = useStaff(); 
  const { showAlert } = useUI();

  const [form, setForm] = useState<Partial<User>>({});

  useEffect(() => {
    if (isOpen) {
        if (userToEdit) {
            setForm({ ...userToEdit, customRoleId: userToEdit.customRoleId || '' });
        } else {
            setForm({ 
                name: '', role: Role.WAITER, email: '', allowedRoutes: [], customRoleId: '',
                department: '', phone: '', documentCpf: '', baseSalary: 0, contractType: 'CLT', workModel: '44H_WEEKLY',
                addressState: '', bankAccountType: 'CORRENTE', shiftId: '', dependentsCount: 0
            });
        }
    }
  }, [isOpen, userToEdit]);

  const handleSubmit = async () => {
      // Validacao manual já que o botão está fora do form
      if (variant === 'ACCESS' && !userToEdit) return; // Nao deve acontecer

      if (!form.name) return showAlert({ title: "Nome Obrigatório", message: "Informe o nome.", type: "WARNING" });
      if (variant === 'ACCESS' && !form.email) return showAlert({ title: "Email Obrigatório", message: "Informe o email.", type: "WARNING" });
      if (variant === 'ACCESS' && !form.customRoleId && form.role !== Role.ADMIN) {
          return showAlert({ title: "Cargo Obrigatório", message: "Selecione um cargo cadastrado para o colaborador.", type: "WARNING" });
      }

      const userToSave = { 
          ...form, 
          customRoleId: form.customRoleId || undefined,
          hrJobRoleId: form.hrJobRoleId || undefined,
          shiftId: form.shiftId || undefined,
          baseSalary: Number(form.baseSalary) || 0,
          benefitsTotal: Number(form.benefitsTotal) || 0,
          dependentsCount: Number(form.dependentsCount) || 0
      };

      try {
          if (userToEdit) {
              await updateUser({ ...userToEdit, ...userToSave } as User);
              showAlert({ title: "Sucesso", message: "Dados atualizados!", type: 'SUCCESS' });
          } else {
              await addUser(userToSave);
              showAlert({ title: "Sucesso", message: "Colaborador cadastrado!", type: 'SUCCESS' });
          }
          onClose();
      } catch (error: any) {
          showAlert({ title: "Erro", message: error.message || "Erro ao salvar.", type: 'ERROR' });
      }
  };

  if (variant === 'ACCESS' && !userToEdit) return null;

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        title={userToEdit ? (variant === 'RH' ? 'Editar Colaborador' : `Acesso: ${userToEdit.name}`) : 'Novo Colaborador'}
        variant={variant === 'RH' ? "page" : "dialog"}
        maxWidth="md"
        onSave={handleSubmit}
    >
        <div className="space-y-8 pb-10">
            
            {/* VARIANT ACCESS: Apenas Login e Senha */}
            {variant === 'ACCESS' && (
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold mb-2 text-slate-600 uppercase flex items-center gap-2">
                            <Shield size={14}/> Cargo / Função
                        </label>
                        <select 
                            className="w-full border-2 p-3 rounded-xl text-sm bg-white focus:border-blue-500 outline-none" 
                            value={form.customRoleId || ''} 
                            onChange={e => {
                                const val = e.target.value;
                                if (val === 'ADMIN') {
                                    setForm({...form, role: Role.ADMIN, customRoleId: ''});
                                } else {
                                    setForm({...form, customRoleId: val, role: Role.WAITER});
                                }
                            }}
                        >
                            <option value="">Selecione um Cargo...</option>
                            <option value="ADMIN">Administrador (Acesso Total)</option>
                            {state.roles.length > 0 && (
                                <optgroup label="Cargos Cadastrados">
                                    {state.roles.map(role => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold mb-2 text-slate-600 uppercase flex items-center gap-2">
                            <Mail size={14}/> E-mail (Login)
                        </label>
                        <input 
                            required 
                            type="email" 
                            placeholder="usuario@email.com" 
                            className="w-full border-2 p-3 rounded-xl text-sm focus:border-blue-500 outline-none" 
                            value={form.email} 
                            onChange={e => setForm({...form, email: e.target.value})} 
                        />
                    </div>
                </div>
            )}

            {/* VARIANT RH: Formulário Completo */}
            {variant === 'RH' && (
                <div className="space-y-8 max-w-5xl mx-auto">
                    
                    {/* 1. DADOS PESSOAIS (Simplificado para caber no exemplo, mas idealmente completo) */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2 pb-2 border-b">
                            <UserIcon size={16} className="text-blue-600"/> Dados Pessoais
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Nome Completo</label>
                                <input required className="w-full border p-2.5 rounded-xl text-sm" placeholder="Ex: Maria Silva" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">CPF</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm" placeholder="000.000.000-00" value={form.documentCpf} onChange={e => setForm({...form, documentCpf: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Cargo / Função (RH)</label>
                                <select 
                                    className="w-full border p-2.5 rounded-xl text-sm bg-white focus:border-blue-500 outline-none" 
                                    value={form.hrJobRoleId || ''} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        const selectedRole = state.hrJobRoles.find(r => r.id === val);
                                        
                                        setForm({
                                            ...form, 
                                            hrJobRoleId: val,
                                            // Auto-vincular perfil de acesso se o cargo tiver um
                                            customRoleId: selectedRole?.customRoleId || form.customRoleId,
                                            // Auto-preencher salário base se o cargo tiver um e o atual for 0
                                            baseSalary: selectedRole?.baseSalary && !form.baseSalary ? selectedRole.baseSalary : form.baseSalary
                                        });
                                    }}
                                >
                                    <option value="">Selecione um Cargo...</option>
                                    {state.hrJobRoles.map(role => (
                                        <option key={role.id} value={role.id}>{role.title} ({role.cboCode})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Perfil de Acesso (Sistema)</label>
                                <select 
                                    className="w-full border p-2.5 rounded-xl text-sm bg-white focus:border-blue-500 outline-none" 
                                    value={form.customRoleId || (form.role === Role.ADMIN ? 'ADMIN' : '')} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val === 'ADMIN') {
                                            setForm({...form, role: Role.ADMIN, customRoleId: ''});
                                        } else {
                                            setForm({...form, customRoleId: val, role: Role.WAITER});
                                        }
                                    }}
                                >
                                    <option value="">Sem Acesso / Básico</option>
                                    <option value="ADMIN">Administrador (Acesso Total)</option>
                                    {state.roles.length > 0 && (
                                        <optgroup label="Perfis Cadastrados">
                                            {state.roles.map(role => (
                                                <option key={role.id} value={role.id}>{role.name}</option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Departamento</label>
                                <input className="w-full border p-2.5 rounded-xl text-sm" placeholder="Ex: Salão, Cozinha" value={form.department} onChange={e => setForm({...form, department: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    {/* 5. CONTRATO & JORNADA (ATUALIZADO) */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2 pb-2 border-b">
                            <Briefcase size={16} className="text-gray-600"/> Contrato & Jornada
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Tipo Contrato</label>
                                <select className="w-full border p-2.5 rounded-xl text-sm bg-white" value={form.contractType} onChange={e => setForm({...form, contractType: e.target.value as ContractType})}>
                                    <option value="CLT">CLT</option>
                                    <option value="PJ">PJ</option>
                                    <option value="FREELANCE">Freelance</option>
                                    <option value="TEMPORARY">Temporário</option>
                                    <option value="INTERN">Estágio</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Modelo de Jornada</label>
                                <select className="w-full border p-2.5 rounded-xl text-sm bg-white font-bold text-blue-700" value={form.workModel} onChange={e => setForm({...form, workModel: e.target.value as WorkModel})}>
                                    <option value="44H_WEEKLY">44h Semanais (Padrão)</option>
                                    <option value="12X36">Escala 12x36</option>
                                    <option value="PART_TIME">Meio Período (25h)</option>
                                    <option value="INTERMITTENT">Intermitente (Por Hora)</option>
                                    <option value="ROTATING">Escala Rotativa</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Salário Base</label>
                                <input type="number" step="0.01" className="w-full border p-2.5 rounded-xl text-sm font-bold" value={form.baseSalary} onChange={e => setForm({...form, baseSalary: parseFloat(e.target.value)})} />
                            </div>
                             <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Turno Padrão</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                                    <select 
                                        className="w-full border pl-9 p-2.5 rounded-xl text-sm bg-white cursor-pointer"
                                        value={form.shiftId || ''}
                                        onChange={e => setForm({...form, shiftId: e.target.value})}
                                    >
                                        <option value="">Selecione o Turno...</option>
                                        {state.shifts.map(shift => (
                                            <option key={shift.id} value={shift.id}>
                                                {shift.name} ({shift.startTime} - {shift.endTime})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </Modal>
  );
};
