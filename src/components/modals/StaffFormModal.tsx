
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useStaff } from '../../context/StaffContext';
import { useUI } from '../../context/UIContext';
import { User, Role } from '../../types';
import { Info, Shield, Mail } from 'lucide-react';

interface StaffFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: User | null;
}

export const StaffFormModal: React.FC<StaffFormModalProps> = ({ isOpen, onClose, userToEdit }) => {
  const { updateUser, state } = useStaff(); 
  const { showAlert } = useUI();

  const [form, setForm] = useState<Partial<User>>({ name: '', role: Role.WAITER, email: '', allowedRoutes: [], customRoleId: '' });

  useEffect(() => {
    if (isOpen && userToEdit) {
        setForm({
            ...userToEdit,
            // Se tiver customRole, inicializa o select, senão usa o role enum ou string vazia
            customRoleId: userToEdit.customRoleId || '' 
        });
    }
  }, [isOpen, userToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!userToEdit) return;

      // Se um cargo personalizado for selecionado, usamos ele. 
      // Caso contrário, usamos o Enum legado para retrocompatibilidade.
      // O backend dará preferência ao customRoleId se presente.
      const userToSave = { 
          ...form, 
          // Se selecionou "Nenhum" no custom role, envia string vazia (que o context converte para null)
          customRoleId: form.customRoleId || undefined 
      };

      try {
          await updateUser({ ...userToEdit, ...userToSave } as User);
          showAlert({ title: "Sucesso", message: "Permissões de acesso atualizadas!", type: 'SUCCESS' });
          onClose();
      } catch (error) {
          showAlert({ title: "Erro", message: "Erro ao atualizar permissões.", type: 'ERROR' });
      }
  };

  if (!userToEdit) return null;

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        title={`Configurar Acesso: ${userToEdit.name}`}
        variant="dialog"
        maxWidth="md"
    >
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                 <div className="flex items-center gap-3 mb-2">
                     <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-slate-700 border">{userToEdit.name.charAt(0)}</div>
                     <div>
                         <p className="font-bold text-slate-800">{userToEdit.name}</p>
                         <p className="text-xs text-slate-500">{userToEdit.department || 'Setor não informado'}</p>
                     </div>
                 </div>
            </div>

            <div>
                <label className="block text-xs font-bold mb-2 text-slate-600 uppercase flex items-center gap-2">
                    <Shield size={14}/> Cargo no Sistema
                </label>
                
                {/* Select Unificado: Cargos Padrão + Personalizados */}
                <select 
                    className="w-full border-2 p-3 rounded-xl text-sm bg-white focus:border-blue-500 outline-none transition-all cursor-pointer" 
                    value={form.customRoleId ? form.customRoleId : form.role} 
                    onChange={e => {
                        const val = e.target.value;
                        // Verifica se é um cargo padrão (Enum) ou ID
                        if (['WAITER', 'KITCHEN', 'CASHIER', 'ADMIN'].includes(val)) {
                            setForm({...form, role: val as Role, customRoleId: ''});
                        } else {
                            setForm({...form, customRoleId: val, role: Role.WAITER}); // Role base genérico se usar custom
                        }
                    }}
                >
                    <optgroup label="Cargos Padrão (Sistema)">
                        <option value="WAITER">Garçom (Padrão)</option>
                        <option value="KITCHEN">Cozinha (Padrão)</option>
                        <option value="CASHIER">Caixa (Padrão)</option>
                        <option value="ADMIN">Gerente (Acesso Total)</option>
                    </optgroup>
                    
                    {state.roles.length > 0 && (
                        <optgroup label="Cargos Personalizados">
                            {state.roles.map(role => (
                                <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                        </optgroup>
                    )}
                </select>

                <p className="text-[10px] text-gray-400 mt-2 px-1">
                    Define quais módulos e abas o colaborador poderá acessar.
                </p>
            </div>

            <div>
                <label className="block text-xs font-bold mb-2 text-slate-600 uppercase flex items-center gap-2">
                    <Mail size={14}/> E-mail de Login
                </label>
                <input 
                    required 
                    type="email" 
                    placeholder="usuario@email.com" 
                    className="w-full border-2 p-3 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" 
                    value={form.email} 
                    onChange={e => setForm({...form, email: e.target.value})} 
                />
                <p className="text-[10px] text-gray-400 mt-2 px-1">
                    Este e-mail será usado para enviar o convite de criação de senha.
                </p>
            </div>

            <div className="flex gap-3 pt-4 border-t">
                <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
                <Button type="submit" className="flex-1 shadow-lg">Salvar Permissões</Button>
            </div>
        </form>
    </Modal>
  );
};
