
import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { StaffFormModal } from '../../components/modals/StaffFormModal';
import { User } from '../../types';
import { getTenantSlug } from '../../utils/tenant';
import { Edit, Trash2, UserPlus, Check, Link as LinkIcon, CheckSquare } from 'lucide-react';

export const AdminStaff: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { showConfirm, showAlert } = useUI();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  const copyInviteLink = (userEmail?: string, userId?: string) => {
      if (!userEmail) return showAlert({ title: "Atenção", message: "Este usuário não tem email cadastrado.", type: 'WARNING' });
      const slug = state.tenantSlug || getTenantSlug();
      const link = `${window.location.origin}/login?restaurant=${slug}&email=${encodeURIComponent(userEmail)}&register=true`;
      
      navigator.clipboard.writeText(link).then(() => {
          if (userId) {
              setCopiedInviteId(userId);
              setTimeout(() => setCopiedInviteId(null), 2000);
          }
          showAlert({ title: "Link Copiado!", message: "Envie este link para o funcionário criar a senha.", type: 'SUCCESS' });
      });
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Equipe</h2>
                <p className="text-sm text-gray-500">Gerencie usuários e permissões de acesso.</p>
            </div>
            <Button onClick={() => { 
                setEditingUser(null); 
                setIsModalOpen(true);
            }}>
                <UserPlus size={16}/> Novo Usuário
            </Button>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs border-b">
                    <tr>
                        <th className="p-4">Nome</th>
                        <th className="p-4">Cargo</th>
                        <th className="p-4">Acesso (PIN)</th>
                        <th className="p-4">Email</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {state.users.map(user => {
                        const isPending = !user.auth_user_id;
                        return (
                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 font-bold text-gray-800">{user.name}</td>
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
                                <td className="p-4 font-mono text-gray-500">****</td>
                                <td className="p-4 text-gray-600">{user.email || '-'}</td>
                                <td className="p-4 text-center">
                                    {isPending ? (
                                        <button 
                                            onClick={() => copyInviteLink(user.email, user.id)}
                                            className={`flex items-center gap-1 mx-auto text-xs px-2 py-1 rounded border transition-all ${copiedInviteId === user.id ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'}`}
                                        >
                                            {copiedInviteId === user.id ? <Check size={12}/> : <LinkIcon size={12}/>}
                                            {copiedInviteId === user.id ? 'Copiado!' : 'Copiar Convite'}
                                        </button>
                                    ) : (
                                        <span className="text-green-600 text-xs font-bold flex items-center justify-center gap-1"><CheckSquare size={14}/> Ativo</span>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => { 
                                            setEditingUser(user); 
                                            setIsModalOpen(true);
                                        }} className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors" title="Editar"><Edit size={16}/></button>
                                        <button onClick={() => showConfirm({ title: 'Excluir Usuário', message: 'Confirma a exclusão? O acesso será revogado.', onConfirm: () => dispatch({ type: 'DELETE_USER', userId: user.id }) })} className="text-red-600 hover:bg-red-50 p-2 rounded transition-colors" title="Excluir"><Trash2 size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
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
