
import React, { useState } from 'react';
import { useStaff } from '../../context/StaffContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { StaffFormModal } from '../../components/modals/StaffFormModal';
import { User } from '../../types';
import { getTenantSlug } from '../../utils/tenant';
import { Edit, Trash2, Check, Link as LinkIcon, CheckSquare, Users, Info } from 'lucide-react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';

export const AdminStaff: React.FC = () => {
  const { state: staffState, deleteUser } = useStaff();
  const { state: restState } = useRestaurant(); 
  const { showConfirm, showAlert } = useUI();
  const navigate = useNavigate();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  const copyInviteLink = (userEmail?: string, userId?: string) => {
      if (!userEmail) return showAlert({ title: "Atenção", message: "Este usuário não tem email cadastrado.", type: 'WARNING' });
      const slug = restState.tenantSlug || getTenantSlug();
      const link = `${window.location.origin}/login?restaurant=${slug}&email=${encodeURIComponent(userEmail)}&register=true`;
      
      navigator.clipboard.writeText(link).then(() => {
          if (userId) {
              setCopiedInviteId(userId);
              setTimeout(() => setCopiedInviteId(null), 2000);
          }
          showAlert({ title: "Link Copiado!", message: "Envie este link para o funcionário criar a senha.", type: 'SUCCESS' });
      });
  };

  const handleEditAccess = (user: User) => {
      setEditingUser(user);
      setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Equipe & Acessos</h2>
                <p className="text-sm text-gray-500">Gerencie as permissões de acesso ao sistema.</p>
            </div>
        </div>

        {/* Banner Informativo */}
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 flex items-start gap-3">
            <Info className="text-blue-600 shrink-0 mt-0.5" size={20} />
            <div>
                <h4 className="font-bold text-blue-800 text-sm">Gerenciamento de Colaboradores</h4>
                <p className="text-sm text-blue-700 mt-1">
                    O cadastro de novos funcionários (Admissão) deve ser realizado exclusivamente pelo 
                    <button onClick={() => navigate('/rh')} className="font-bold underline ml-1 hover:text-blue-900">Módulo de RH</button>. 
                    Utilize esta tela apenas para configurar cargos e enviar convites de acesso.
                </p>
            </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs border-b">
                    <tr>
                        <th className="p-4">Nome</th>
                        <th className="p-4">Cargo (Sistema)</th>
                        <th className="p-4">Login (E-mail)</th>
                        <th className="p-4 text-center">Status Acesso</th>
                        <th className="p-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {staffState.users.map(user => {
                        const isPending = !user.auth_user_id;
                        return (
                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 font-bold text-gray-800">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500">
                                            {user.name.charAt(0)}
                                        </div>
                                        {user.name}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold
                                        ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : ''}
                                        ${user.role === 'WAITER' ? 'bg-orange-100 text-orange-700' : ''}
                                        ${user.role === 'KITCHEN' ? 'bg-red-100 text-red-700' : ''}
                                        ${user.role === 'CASHIER' ? 'bg-green-100 text-green-700' : ''}
                                    `}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-600">{user.email || 'Não configurado'}</td>
                                <td className="p-4 text-center">
                                    {isPending ? (
                                        <button 
                                            onClick={() => copyInviteLink(user.email, user.id)}
                                            disabled={!user.email}
                                            className={`flex items-center gap-1 mx-auto text-xs px-2 py-1 rounded border transition-all ${copiedInviteId === user.id ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 disabled:opacity-50'}`}
                                        >
                                            {copiedInviteId === user.id ? <Check size={12}/> : <LinkIcon size={12}/>}
                                            {copiedInviteId === user.id ? 'Copiado!' : 'Copiar Convite'}
                                        </button>
                                    ) : (
                                        <span className="text-green-600 text-xs font-bold flex items-center justify-center gap-1"><CheckSquare size={14}/> Vinculado</span>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => handleEditAccess(user)} className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors" title="Configurar Acesso"><Edit size={16}/></button>
                                        <button onClick={() => showConfirm({ title: 'Remover Acesso', message: 'Isso revogará o acesso deste usuário ao sistema, mas manterá o registro no RH. Continuar?', onConfirm: () => deleteUser(user.id) })} className="text-red-600 hover:bg-red-50 p-2 rounded transition-colors" title="Revogar Acesso"><Trash2 size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    {staffState.users.length === 0 && (
                         <tr>
                             <td colSpan={5} className="p-8 text-center text-gray-400">
                                 Nenhum colaborador encontrado. Cadastre no RH.
                             </td>
                         </tr>
                    )}
                </tbody>
            </table>
        </div>

        <StaffFormModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            userToEdit={editingUser} 
        />
    </div>
  );
};
