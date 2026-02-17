
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { useRestaurant } from './RestaurantContext';
import { useUI } from './UIContext';

interface StaffState {
  users: User[];
  isLoading: boolean;
}

interface StaffContextType {
  state: StaffState;
  addUser: (user: Partial<User>) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
}

const StaffContext = createContext<StaffContextType | undefined>(undefined);

export const StaffProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state: restState } = useRestaurant();
  const { tenantId, planLimits } = restState;
  const { showAlert } = useUI();
  const [state, setState] = useState<StaffState>({ users: [], isLoading: true });

  const fetchStaff = useCallback(async () => {
      if (!tenantId) return;
      const { data } = await supabase.from('staff').select('*').eq('tenant_id', tenantId);
      if (data) {
          const mappedUsers = data.map(u => ({ 
              id: u.id, name: u.name, role: u.role, pin: u.pin, 
              email: u.email, auth_user_id: u.auth_user_id, allowedRoutes: u.allowed_routes || [] 
          }));
          setState({ users: mappedUsers, isLoading: false });
      }
  }, [tenantId]);

  useEffect(() => {
      if (tenantId) {
          fetchStaff();
          const channel = supabase.channel(`staff:${tenantId}`)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'staff', filter: `tenant_id=eq.${tenantId}` }, fetchStaff)
              .subscribe();
          return () => { supabase.removeChannel(channel); };
      }
  }, [tenantId, fetchStaff]);

  const addUser = async (user: Partial<User>) => {
      if(!tenantId) return;

      if (planLimits.maxStaff !== -1 && state.users.length >= planLimits.maxStaff) {
          showAlert({ title: "Limite Atingido", message: `Seu plano permite no máximo ${planLimits.maxStaff} membros na equipe. Atualize seu plano para adicionar mais.`, type: 'WARNING' });
          return;
      }

      await supabase.from('staff').insert({ 
          tenant_id: tenantId, name: user.name, role: user.role, 
          pin: user.pin, email: user.email, allowed_routes: user.allowedRoutes 
      });
      await fetchStaff();
  };

  const updateUser = async (user: User) => {
      await supabase.from('staff').update({ 
          name: user.name, role: user.role, pin: user.pin, 
          email: user.email, allowed_routes: user.allowedRoutes 
      }).eq('id', user.id);
      await fetchStaff();
  };

  const deleteUser = async (userId: string) => {
      await supabase.from('staff').delete().eq('id', userId);
      await fetchStaff();
  };

  return (
    <StaffContext.Provider value={{ state, addUser, updateUser, deleteUser }}>
      {children}
    </StaffContext.Provider>
  );
};

export const useStaff = () => {
  const context = useContext(StaffContext);
  if (!context) throw new Error('useStaff must be used within a StaffProvider');
  return context;
};
