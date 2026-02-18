
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Shift, TimeEntry, PayrollPreview } from '../types';
import { supabase } from '../lib/supabase';
import { useRestaurant } from './RestaurantContext';
import { useUI } from './UIContext';

interface StaffState {
  users: User[];
  shifts: Shift[];
  timeEntries: TimeEntry[];
  isLoading: boolean;
}

interface StaffContextType {
  state: StaffState;
  addUser: (user: Partial<User>) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  
  // HR Actions
  addShift: (shift: Partial<Shift>) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;
  registerTime: (staffId: string, type: 'IN' | 'BREAK_START' | 'BREAK_END' | 'OUT', justification?: string) => Promise<void>;
  getPayroll: (month: number, year: number) => Promise<PayrollPreview[]>;
}

const StaffContext = createContext<StaffContextType | undefined>(undefined);

export const StaffProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state: restState } = useRestaurant();
  const { tenantId, planLimits } = restState;
  const { showAlert } = useUI();
  
  const [state, setState] = useState<StaffState>({ 
    users: [], 
    shifts: [], 
    timeEntries: [], 
    isLoading: true 
  });

  const fetchData = useCallback(async () => {
      if (!tenantId) return;
      
      const [staffRes, shiftsRes, timeRes] = await Promise.all([
          supabase.from('staff').select('*').eq('tenant_id', tenantId).order('name'),
          supabase.from('rh_shifts').select('*').eq('tenant_id', tenantId),
          supabase.from('rh_time_entries').select('*').eq('tenant_id', tenantId).gte('entry_date', new Date(new Date().setDate(1)).toISOString().split('T')[0])
      ]);

      if (staffRes.data) {
          const mappedUsers = staffRes.data.map(u => ({ 
              id: u.id, 
              name: u.name, 
              role: u.role, 
              pin: u.pin, 
              email: u.email, 
              auth_user_id: u.auth_user_id, 
              allowedRoutes: u.allowed_routes || [],
              department: u.department,
              hireDate: u.hire_date ? new Date(u.hire_date) : undefined,
              contractType: u.contract_type,
              baseSalary: Number(u.base_salary) || 0,
              benefitsTotal: Number(u.benefits_total) || 0,
              status: u.status,
              phone: u.phone,
              documentCpf: u.document_cpf
          }));

          const mappedShifts = (shiftsRes.data || []).map(s => ({
              id: s.id,
              name: s.name,
              startTime: s.start_time,
              endTime: s.end_time,
              breakMinutes: s.break_minutes,
              toleranceMinutes: s.tolerance_minutes,
              nightShift: s.night_shift
          }));

          const mappedTime = (timeRes.data || []).map(t => ({
              id: t.id,
              staffId: t.staff_id,
              entryDate: new Date(t.entry_date),
              clockIn: t.clock_in ? new Date(t.clock_in) : undefined,
              breakStart: t.break_start ? new Date(t.break_start) : undefined,
              breakEnd: t.break_end ? new Date(t.break_end) : undefined,
              clockOut: t.clock_out ? new Date(t.clock_out) : undefined,
              status: t.status
          }));

          setState({ 
            users: mappedUsers, 
            shifts: mappedShifts, 
            timeEntries: mappedTime, 
            isLoading: false 
          });
      }
  }, [tenantId]);

  useEffect(() => {
      if (tenantId) {
          fetchData();
          const channel = supabase.channel(`rh_staff:${tenantId}`)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'staff', filter: `tenant_id=eq.${tenantId}` }, fetchData)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'rh_shifts', filter: `tenant_id=eq.${tenantId}` }, fetchData)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'rh_time_entries', filter: `tenant_id=eq.${tenantId}` }, fetchData)
              .subscribe();
          return () => { supabase.removeChannel(channel); };
      }
  }, [tenantId, fetchData]);

  const addUser = async (user: Partial<User>) => {
      if(!tenantId) return;
      if (planLimits.maxStaff !== -1 && state.users.length >= planLimits.maxStaff) {
          showAlert({ title: "Limite Atingido", message: `Seu plano permite no máximo ${planLimits.maxStaff} membros.`, type: 'WARNING' });
          return;
      }
      await supabase.from('staff').insert({ 
          tenant_id: tenantId, 
          name: user.name, 
          role: user.role, 
          pin: user.pin, 
          email: user.email, 
          allowed_routes: user.allowedRoutes,
          department: user.department,
          hire_date: user.hireDate?.toISOString().split('T')[0],
          contract_type: user.contractType,
          base_salary: user.baseSalary,
          benefits_total: user.benefitsTotal,
          status: user.status,
          phone: user.phone,
          document_cpf: user.documentCpf
      });
  };

  const updateUser = async (user: User) => {
      await supabase.from('staff').update({ 
          name: user.name, 
          role: user.role, 
          pin: user.pin, 
          email: user.email, 
          allowed_routes: user.allowedRoutes,
          department: user.department,
          hire_date: user.hireDate ? new Date(user.hireDate).toISOString().split('T')[0] : null,
          contract_type: user.contractType,
          base_salary: user.baseSalary,
          benefits_total: user.benefitsTotal,
          status: user.status,
          phone: user.phone,
          document_cpf: user.documentCpf
      }).eq('id', user.id);
  };

  const deleteUser = async (userId: string) => {
      await supabase.from('staff').delete().eq('id', userId);
  };

  const addShift = async (shift: Partial<Shift>) => {
    if(!tenantId) return;
    await supabase.from('rh_shifts').insert({
        tenant_id: tenantId,
        name: shift.name,
        start_time: shift.startTime,
        end_time: shift.endTime,
        break_minutes: shift.breakMinutes,
        tolerance_minutes: shift.toleranceMinutes,
        night_shift: shift.nightShift
    });
  };

  const deleteShift = async (id: string) => {
      await supabase.from('rh_shifts').delete().eq('id', id);
  };

  const registerTime = async (staffId: string, type: 'IN' | 'BREAK_START' | 'BREAK_END' | 'OUT', justification?: string) => {
      if(!tenantId) return;
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      const { data: existing } = await supabase.from('rh_time_entries')
        .select('*')
        .eq('staff_id', staffId)
        .eq('entry_date', today)
        .maybeSingle();

      if (existing) {
          const update: any = {};
          if (type === 'IN') update.clock_in = now;
          if (type === 'BREAK_START') update.break_start = now;
          if (type === 'BREAK_END') update.break_end = now;
          if (type === 'OUT') update.clock_out = now;
          if (justification) update.justification = justification;

          await supabase.from('rh_time_entries').update(update).eq('id', existing.id);
      } else {
          const insert: any = { 
            tenant_id: tenantId, 
            staff_id: staffId, 
            entry_date: today,
            status: 'PENDING'
          };
          if (type === 'IN') insert.clock_in = now;
          await supabase.from('rh_time_entries').insert(insert);
      }
  };

  const getPayroll = async (month: number, year: number): Promise<PayrollPreview[]> => {
      if (!tenantId) return [];
      
      const start = new Date(year, month, 1).toISOString().split('T')[0];
      const end = new Date(year, month + 1, 0).toISOString().split('T')[0];

      // Busca todos os pontos do mês
      const { data: entries } = await supabase.from('rh_time_entries')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('entry_date', start)
        .lte('entry_date', end)
        .eq('status', 'APPROVED');

      // Consolida por colaborador
      return state.users.map(user => {
          const userEntries = (entries || []).filter(e => e.staff_id === user.id);
          
          let totalMins = 0;
          userEntries.forEach(e => {
              if (e.clock_in && e.clock_out) {
                  const diff = new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime();
                  let mins = diff / 60000;
                  // Desconta intervalo se houver
                  if (e.break_start && e.break_end) {
                      const breakDiff = new Date(e.break_end).getTime() - new Date(e.break_start).getTime();
                      mins -= (breakDiff / 60000);
                  }
                  totalMins += Math.max(0, mins);
              }
          });

          const hoursWorked = totalMins / 60;
          const expectedHours = 220; // Padrão mensal CLT
          const overtime = Math.max(0, hoursWorked - expectedHours);
          const baseSalary = user.baseSalary || 0;
          const hourlyRate = baseSalary / expectedHours;

          const overtimeTotal = overtime * (hourlyRate * 1.5); // 50% extra
          const benefits = user.benefitsTotal || 0;
          
          const gross = baseSalary + overtimeTotal + benefits;
          const net = gross * 0.92; // Estimativa de descontos (INSS/FGTS simplificado)

          return {
              staffId: user.id,
              staffName: user.name,
              baseSalary,
              overtimeTotal,
              absencesTotal: 0,
              addictionals: 0,
              benefits,
              grossTotal: gross,
              discounts: gross - net,
              netTotal: net,
              hoursWorked
          };
      });
  };

  return (
    <StaffContext.Provider value={{ 
        state, addUser, updateUser, deleteUser,
        addShift, deleteShift, registerTime, getPayroll
    }}>
      {children}
    </StaffContext.Provider>
  );
};

export const useStaff = () => {
  const context = useContext(StaffContext);
  if (!context) throw new Error('useStaff must be used within a StaffProvider');
  return context;
};
