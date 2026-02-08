import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Role, User } from '../../types';
import { getTenantSlug } from '../../utils/tenant';
import { Plus, Edit, Trash2, UserPlus, Check, Link as LinkIcon, CheckSquare, Info, User as UserIcon } from 'lucide-react';

export const AdminStaff: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { showAlert, showConfirm } = useUI();
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<Partial<User>>({ name: '', role: Role.WAITER, pin: '', email: '', allowedRoutes: [] });
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  const getRoutesForRole = (role: Role): string[] => {
      switch (role) {
          case Role.WAITER: return ['/waiter'];
          case Role.KITCHEN: return ['/kitchen'];
          case Role.CASHIER: return ['/cashier'];
          case Role.ADMIN: return ['/admin', '/waiter', '/kitchen', '/cashier'];
          default: return [];
      }
  };

  const handleSaveUser = (e: React.FormEvent) => {
      e.preventDefault();
      const routes = getRoutesForRole(userForm.role || Role.WAITER);
      const userToSave = { ...userForm, allowedRoutes: routes };

      if(editingUser) {
          dispatch({ type: 'UPDATE_USER', user: { ...editingUser, ...userToSave } as User });
      } else {
          dispatch({ type: 'ADD_USER', user: { ...userToSave, id: Math.random().toString() } as User });
      }
      
      setEditingUser(null);
      setUserForm({ name: '', role: Role.WAITER, pin: '', email: '', allowedRoutes: [] });
      showAlert({ title: "Sucesso", message: "Usuário salvo! Se for novo, envie o link de convite.", type: 'SUCCESS' });
  };

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
            <Button onClick={() => { setEditingUser(null); setUserForm({ name: '', role: Role.WAITER, pin: '', email: '', allowedRoutes: [] }); }}><UserPlus size={16}/> Novo Usuário</Button>
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
                                        <button onClick={() => { setEditingUser(user); setUserForm(user); }} className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors" title="Editar"><Edit size={16}/></button>
                                        <button onClick={() => showConfirm({ title: 'Excluir Usuário', message: 'Confirma a exclusão? O acesso será revogado.', onConfirm: () => dispatch({ type: 'DELETE_USER', userId: user.id }) })} className="text-red-600 hover:bg-red-50 p-2 rounded transition-colors" title="Excluir"><Trash2 size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

        <Modal 
            isOpen={!!userForm.name || !!editingUser} 
            onClose={() => { setEditingUser(null); setUserForm({ name: '', role: Role.WAITER, pin: '', email: '', allowedRoutes: [] }); }}
            title={editingUser ? 'Editar Usuário' : 'Novo Membro da Equipe'}
            variant="dialog" // Keep small
            maxWidth="md"
        >
            <form onSubmit={handleSaveUser} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-600">Nome Completo</label>
                    <input required placeholder="Ex: Maria Silva" className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} autoFocus />
                </div>
                
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-600">Função / Cargo</label>
                    <select className="w-full border p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as Role})}>
                        <option value="WAITER">Garçom (Pedidos e Mesas)</option>
                        <option value="KITCHEN">Cozinha (KDS)</option>
                        <option value="CASHIER">Caixa (Pagamentos)</option>
                        <option value="ADMIN">Gerente (Acesso Total)</option>
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1">As permissões de acesso serão configuradas automaticamente com base no cargo.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold mb-1 text-gray-600">PIN de Acesso</label>
                        <input required placeholder="4 dígitos" maxLength={4} className="w-full border p-2.5 rounded-lg text-sm font-mono text-center tracking-widest focus:ring-2 focus:ring-blue-500 outline-none" value={userForm.pin} onChange={e => setUserForm({...userForm, pin: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 text-gray-600">E-mail (Login)</label>
                        <input required type="email" placeholder="usuario@email.com" className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} />
                    </div>
                </div>

                {!editingUser && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-800 flex gap-2">
                        <Info size={16} className="shrink-0 mt-0.5"/>
                        <p>Ao salvar, você poderá copiar um <strong>link de convite</strong> para enviar ao funcionário, permitindo que ele crie sua própria senha de acesso.</p>
                    </div>
                )}

                <div className="flex gap-2 pt-2">
                    <Button type="button" variant="secondary" onClick={() => { setEditingUser(null); setUserForm({ name: '', role: Role.WAITER, pin: '', email: '', allowedRoutes: [] }); }} className="flex-1">Cancelar</Button>
                    <Button type="submit" className="flex-1">Salvar Usuário</Button>
                </div>
            </form>
        </Modal>
    </div>
  );
};