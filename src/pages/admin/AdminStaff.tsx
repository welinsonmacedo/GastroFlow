
import React, { useState } from 'react';
import { useStaff } from '@/core/context/StaffContext';
import { useRestaurant } from '@/core/context/RestaurantContext';
import { useUI } from '@/core/context/UIContext';
import { Button } from '../../components/Button';
import { StaffFormModal } from '../../components/modals/StaffFormModal';
import { RoleFormModal } from '../../components/modals/RoleFormModal';
import { TableAssignmentModal } from '../../components/modals/TableAssignmentModal';
import { User, CustomRole } from '@/types';
import { getTenantSlug } from '@/core/tenant/tenantResolver';
import { Edit, Trash2, Check, Link as LinkIcon, CheckSquare, Users, Info, Shield, Plus } from 'lucide-react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';

export const AdminStaff: React.FC = () => {
  const { state: staffState, deleteUser, deleteRole } = useStaff();
  const { state: restState } = useRestaurant(); 
  const { showConfirm, showAlert } = useUI();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'USERS' | 'ROLES'>('USERS');

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [selectedWaiter, setSelectedWaiter] = useState<User | null>(null);

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
      setIsUserModalOpen(true);
  };

  const handleDeleteRole = (id: string) => {
      const usersWithRole = staffState.users.filter(u => u.customRoleId === id);
      if (usersWithRole.length > 0) {
          return showAlert({ title: "Impossível Excluir", message: `Existem ${usersWithRole.length} usuários vinculados a este cargo. Remova-os primeiro.`, type: 'WARNING' });
      }
      showConfirm({ title: "Excluir Cargo", message: "Confirma a exclusão deste cargo personalizado?", onConfirm: () => deleteRole(id) });
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Equipe & Acessos</h2>
                    <p className="text-sm text-gray-500">Controle quem acessa o que no sistema.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setActiveTab('USERS')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'USERS' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Colaboradores</button>
                    <button onClick={() => setActiveTab('ROLES')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'ROLES' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Cargos & Permissões</button>
                </div>
            </div>
        </div>

        {activeTab === 'USERS' && (
            <>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 flex items-start gap-3">
                    <Info className="text-blue-600 shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="font-bold text-blue-800 text-sm">Gerenciamento de Colaboradores</h4>
                        <p className="text-sm text-blue-700 mt-1">
                            O cadastro de novos funcionários (Admissão) deve ser realizado pelo <button onClick={() => navigate('/rh')} className="font-bold underline hover:text-blue-900">Módulo de RH</button>. 
                            Aqui você configura os acessos (login) e cargos no sistema.
                        </p>
                    </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs border-b">
                            <tr>
                                <th className="p-4">Nome</th>
                                <th className="p-4">Cargo (RH)</th>
                                <th className="p-4">Perfil de Acesso</th>
                                <th className="p-4">Login (E-mail)</th>
                                <th className="p-4 text-center">Status Acesso</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {staffState.users.map(user => {
                                const isPending = !user.auth_user_id;
                                const isSystemAdmin = user.role === 'ADMIN';
                                const displayRole = user.customRoleName || (isSystemAdmin ? 'Administrador' : 'Sem Acesso');
                                const hrRole = staffState.hrJobRoles.find(r => r.id === user.hrJobRoleId);
                                return (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-bold text-gray-800">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500">{user.name.charAt(0)}</div>
                                                {user.name}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-sm font-bold text-gray-700">
                                                {hrRole ? hrRole.title : 'Não definido'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${isSystemAdmin ? 'bg-purple-100 text-purple-700' : user.customRoleId ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {displayRole}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-600">{user.email || 'Não configurado'}</td>
                                        <td className="p-4 text-center">
                                            {isPending ? (
                                                <button onClick={() => copyInviteLink(user.email, user.id)} disabled={!user.email} className={`flex items-center gap-1 mx-auto text-xs px-2 py-1 rounded border transition-all ${copiedInviteId === user.id ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 disabled:opacity-50'}`}>
                                                    {copiedInviteId === user.id ? <Check size={12}/> : <LinkIcon size={12}/>}
                                                    {copiedInviteId === user.id ? 'Copiado!' : 'Copiar Convite'}
                                                </button>
                                            ) : (
                                                <span className="text-green-600 text-xs font-bold flex items-center justify-center gap-1"><CheckSquare size={14}/> Vinculado</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {user.role === 'WAITER' && (
                                                    <button 
                                                        onClick={() => { setSelectedWaiter(user); setIsTableModalOpen(true); }} 
                                                        className="text-orange-600 hover:bg-orange-50 p-2 rounded transition-colors" 
                                                        title="Atribuir Mesas"
                                                    >
                                                        <Users size={16}/>
                                                    </button>
                                                )}
                                                <button onClick={() => handleEditAccess(user)} className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors" title="Configurar Acesso"><Edit size={16}/></button>
                                                <button onClick={() => showConfirm({ title: 'Remover Acesso', message: 'Isso revogará o acesso deste usuário ao sistema. Continuar?', onConfirm: () => deleteUser(user.id) })} className="text-red-600 hover:bg-red-50 p-2 rounded transition-colors" title="Revogar Acesso"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </>
        )}

        {activeTab === 'ROLES' && (
            <>
                <div className="flex justify-end mb-4">
                    <Button onClick={() => { setEditingRole(null); setIsRoleModalOpen(true); }}><Plus size={18}/> Novo Cargo Personalizado</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {staffState.roles.map(role => (
                        <div key={role.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-blue-300 transition-all group relative">
                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingRole(role); setIsRoleModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16}/></button>
                                <button onClick={() => handleDeleteRole(role.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                            </div>
                            <div className="mb-3">
                                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Shield size={18} className="text-blue-500"/> {role.name}</h3>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2 min-h-[2.5em]">{role.description || 'Sem descrição definida.'}</p>
                            </div>
                            <div className="space-y-2">
                                <div className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Módulos Permitidos</div>
                                <div className="flex flex-wrap gap-1">
                                    {role.permissions?.allowed_modules.length > 0 ? (
                                        role.permissions.allowed_modules.slice(0, 4).map(mod => <span key={mod} className="text-[10px] px-2 py-1 bg-gray-100 text-gray-700 rounded border border-gray-200">{mod}</span>)
                                    ) : <span className="text-[10px] text-gray-400 italic">Nenhum módulo</span>}
                                    {role.permissions?.allowed_modules.length > 4 && <span className="text-[10px] px-2 py-1 text-gray-400">...</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                    {staffState.roles.length === 0 && <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">Nenhum cargo personalizado criado.</div>}
                </div>
            </>
        )}

        <StaffFormModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} userToEdit={editingUser} variant="ACCESS" />
        <RoleFormModal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} roleToEdit={editingRole} />
        <TableAssignmentModal isOpen={isTableModalOpen} onClose={() => setIsTableModalOpen(false)} waiter={selectedWaiter} />
    </div>
  );
};
