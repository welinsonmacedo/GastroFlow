
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { User, Role } from '../../types';
import { Info } from 'lucide-react';

interface StaffFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: User | null;
}

export const StaffFormModal: React.FC<StaffFormModalProps> = ({ isOpen, onClose, userToEdit }) => {
  const { dispatch } = useRestaurant();
  const { showAlert } = useUI();

  const [form, setForm] = useState<Partial<User>>({ name: '', role: Role.WAITER, pin: '', email: '', allowedRoutes: [] });

  useEffect(() => {
    if (isOpen) {
        if (userToEdit) {
            setForm(userToEdit);
        } else {
            setForm({ name: '', role: Role.WAITER, pin: '', email: '', allowedRoutes: [] });
        }
    }
  }, [isOpen, userToEdit]);

  const getRoutesForRole = (role: Role): string[] => {
      switch (role) {
          case Role.WAITER: return ['/waiter'];
          case Role.KITCHEN: return ['/kitchen'];
          case Role.CASHIER: return ['/cashier'];
          case Role.ADMIN: return ['/admin', '/waiter', '/kitchen', '/cashier'];
          default: return [];
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const routes = getRoutesForRole(form.role || Role.WAITER);
      const userToSave = { ...form, allowedRoutes: routes };

      if(userToEdit) {
          dispatch({ type: 'UPDATE_USER', user: { ...userToEdit, ...userToSave } as User });
      } else {
          dispatch({ type: 'ADD_USER', user: { ...userToSave, id: Math.random().toString() } as User });
      }
      
      showAlert({ title: "Sucesso", message: "Usuário salvo!", type: 'SUCCESS' });
      onClose();
  };

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        title={userToEdit ? 'Editar Usuário' : 'Novo Membro da Equipe'}
        variant="dialog"
        maxWidth="md"
    >
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-xs font-bold mb-1 text-gray-600">Nome Completo</label>
                <input required placeholder="Ex: Maria Silva" className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={form.name} onChange={e => setForm({...form, name: e.target.value})} autoFocus />
            </div>
            
            <div>
                <label className="block text-xs font-bold mb-1 text-gray-600">Função / Cargo</label>
                <select className="w-full border p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={form.role} onChange={e => setForm({...form, role: e.target.value as Role})}>
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
                    <input required placeholder="4 dígitos" maxLength={4} className="w-full border p-2.5 rounded-lg text-sm font-mono text-center tracking-widest focus:ring-2 focus:ring-blue-500 outline-none" value={form.pin} onChange={e => setForm({...form, pin: e.target.value})} />
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-600">E-mail (Login)</label>
                    <input required type="email" placeholder="usuario@email.com" className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
            </div>

            {!userToEdit && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-800 flex gap-2">
                    <Info size={16} className="shrink-0 mt-0.5"/>
                    <p>Ao salvar, você poderá copiar um <strong>link de convite</strong> para enviar ao funcionário, permitindo que ele crie sua própria senha de acesso.</p>
                </div>
            )}

            <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
                <Button type="submit" className="flex-1">Salvar Usuário</Button>
            </div>
        </form>
    </Modal>
  );
};
