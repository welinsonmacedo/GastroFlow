
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useStaff } from '../../context/StaffContext';
import { useUI } from '../../context/UIContext';
import { User, Role, ContractType } from '../../types';
import { Shield, Mail, User as UserIcon, Phone, FileText, Building2, DollarSign, Calendar } from 'lucide-react';

interface StaffFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: User | null;
  variant?: 'ACCESS' | 'RH';
}

export const StaffFormModal: React.FC<StaffFormModalProps> = ({ isOpen, onClose, userToEdit, variant = 'ACCESS' }) => {
  const { addUser, updateUser, state } = useStaff(); 
  const { showAlert } = useUI();

  const [form, setForm] = useState<Partial<User>>({ 
      name: '', role: Role.WAITER, email: '', allowedRoutes: [], customRoleId: '',
      department: '', phone: '', documentCpf: '', baseSalary: 0, contractType: 'CLT'
  });

  useEffect(() => {
    if (isOpen) {
        if (userToEdit) {
            setForm({
                ...userToEdit,
                customRoleId: userToEdit.customRoleId || '' 
            });
        } else {
            // Reset form for creation
            setForm({ 
                name: '', role: Role.WAITER, email: '', allowedRoutes: [], customRoleId: '',
                department: '', phone: '', documentCpf: '', baseSalary: 0, contractType: 'CLT'
            });
        }
    }
  }, [isOpen, userToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      const userToSave = { 
          ...form, 
          customRoleId: form.customRoleId || undefined,
          // Garante que campos numéricos sejam números
          baseSalary: Number(form.baseSalary) || 0
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

  // Se for modo ACCESS e não tiver usuário para editar, não renderiza (pois não cria usuários por aqui)
  if (variant === 'ACCESS' && !userToEdit) return null;

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        title={userToEdit ? (variant === 'RH' ? 'Editar Colaborador' : `Acesso: ${userToEdit.name}`) : 'Novo Colaborador'}
        variant="dialog"
        maxWidth="md"
    >
        <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* --- SEÇÃO DE IDENTIFICAÇÃO (Sempre editável no RH, Readonly no ACCESS) --- */}
            {variant === 'ACCESS' ? (
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                     <div className="flex items-center gap-3 mb-2">
                         <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-slate-700 border">{userToEdit?.name.charAt(0)}</div>
                         <div>
                             <p className="font-bold text-slate-800">{userToEdit?.name}</p>
                             <p className="text-xs text-slate-500">{userToEdit?.department || 'Setor não informado'}</p>
                         </div>
                     </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold mb-1 text-slate-600 uppercase">Nome Completo</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-3 text-gray-400" size={18}/>
                            <input required className="w-full border pl-10 p-2.5 rounded-xl text-sm outline-none focus:border-blue-500" placeholder="Ex: Maria Silva" value={form.name} onChange={e => setForm({...form, name: e.target.value})} autoFocus />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-600 uppercase">CPF</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-3 text-gray-400" size={18}/>
                                <input className="w-full border pl-10 p-2.5 rounded-xl text-sm outline-none focus:border-blue-500" placeholder="000.000.000-00" value={form.documentCpf} onChange={e => setForm({...form, documentCpf: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-600 uppercase">Telefone</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 text-gray-400" size={18}/>
                                <input className="w-full border pl-10 p-2.5 rounded-xl text-sm outline-none focus:border-blue-500" placeholder="(00) 00000-0000" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SEÇÃO DE ACESSO (Comum aos dois, mas simplificado no RH se quiser) --- */}
            <div className="border-t pt-4">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Credenciais de Sistema</h4>
                <div className="grid grid-cols-1 gap-4">
                     <div>
                        <label className="block text-xs font-bold mb-2 text-slate-600 uppercase flex items-center gap-2">
                            <Shield size={14}/> Cargo / Função
                        </label>
                        <select 
                            className="w-full border-2 p-3 rounded-xl text-sm bg-white focus:border-blue-500 outline-none transition-all cursor-pointer" 
                            value={form.customRoleId ? form.customRoleId : form.role} 
                            onChange={e => {
                                const val = e.target.value;
                                if (['WAITER', 'KITCHEN', 'CASHIER', 'ADMIN'].includes(val)) {
                                    setForm({...form, role: val as Role, customRoleId: ''});
                                } else {
                                    setForm({...form, customRoleId: val, role: Role.WAITER});
                                }
                            }}
                        >
                            <optgroup label="Cargos Padrão">
                                <option value="WAITER">Garçom</option>
                                <option value="KITCHEN">Cozinha</option>
                                <option value="CASHIER">Caixa</option>
                                <option value="ADMIN">Gerente</option>
                            </optgroup>
                            {state.roles.length > 0 && (
                                <optgroup label="Personalizados">
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
                            className="w-full border-2 p-3 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" 
                            value={form.email} 
                            onChange={e => setForm({...form, email: e.target.value})} 
                        />
                    </div>
                </div>
            </div>

            {/* --- SEÇÃO DE RH (Apenas se variant='RH') --- */}
            {variant === 'RH' && (
                <div className="border-t pt-4 bg-gray-50 -mx-6 px-6 pb-6 -mb-6">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 mt-2">Dados Contratuais (RH)</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-600">Departamento</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                                <input className="w-full border pl-9 p-2 rounded-xl text-sm bg-white" placeholder="Ex: Cozinha" value={form.department} onChange={e => setForm({...form, department: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-600">Tipo Contrato</label>
                            <select className="w-full border p-2 rounded-xl text-sm bg-white" value={form.contractType} onChange={e => setForm({...form, contractType: e.target.value as ContractType})}>
                                <option value="CLT">CLT</option>
                                <option value="PJ">PJ</option>
                                <option value="FREELANCE">Freelance</option>
                                <option value="TEMPORARY">Temporário</option>
                                <option value="INTERN">Estágio</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-600">Salário Base</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                                <input type="number" step="0.01" className="w-full border pl-9 p-2 rounded-xl text-sm bg-white font-bold text-slate-700" placeholder="0.00" value={form.baseSalary} onChange={e => setForm({...form, baseSalary: parseFloat(e.target.value)})} />
                            </div>
                        </div>
                         <div>
                            <label className="block text-xs font-bold mb-1 text-slate-600">Admissão</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                                <input type="date" className="w-full border pl-9 p-2 rounded-xl text-sm bg-white" value={form.hireDate ? new Date(form.hireDate).toISOString().split('T')[0] : ''} onChange={e => setForm({...form, hireDate: new Date(e.target.value)})} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
                <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
                <Button type="submit" className="flex-1 shadow-lg">{userToEdit ? 'Salvar Alterações' : 'Cadastrar'}</Button>
            </div>
        </form>
    </Modal>
  );
};
