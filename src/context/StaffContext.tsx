
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Shift, TimeEntry, PayrollPreview, CustomRole, RHTax } from '../types';
import { supabase } from '../lib/supabase';
import { useRestaurant } from './RestaurantContext';
import { useUI } from './UIContext';

interface StaffState {
  users: User[];
  shifts: Shift[];
  timeEntries: TimeEntry[];
  roles: CustomRole[];
  taxes: RHTax[]; // Novos impostos
  isLoading: boolean;
}

interface StaffContextType {
  state: StaffState;
  addUser: (user: Partial<User>) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  
  // Custom Roles
  addRole: (role: Partial<CustomRole>) => Promise<void>;
  updateRole: (role: CustomRole) => Promise<void>;
  deleteRole: (roleId: string) => Promise<void>;

  // HR Actions
  addShift: (shift: Partial<Shift>) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;
  registerTime: (staffId: string, type: 'IN' | 'BREAK_START' | 'BREAK_END' | 'OUT', justification?: string) => Promise<void>;
  
  // Gestão Manual de Ponto
  addTimeEntry: (entry: Partial<TimeEntry>) => Promise<void>;
  updateTimeEntry: (entry: TimeEntry) => Promise<void>;

  // Gestão de Impostos (Configurações)
  addTax: (tax: Partial<RHTax>) => Promise<void>;
  deleteTax: (id: string) => Promise<void>;

  getPayroll: (month: number, year: number) => Promise<PayrollPreview[]>;
  fetchData: () => Promise<void>;
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
    roles: [],
    taxes: [],
    isLoading: true 
  });

  const fetchData = useCallback(async () => {
      if (!tenantId) return;
      
      const [staffRes, shiftsRes, timeRes, rolesRes, taxesRes] = await Promise.all([
          supabase.from('staff').select('*, custom_roles(name)').eq('tenant_id', tenantId).order('name'),
          supabase.from('rh_shifts').select('*').eq('tenant_id', tenantId),
          supabase.from('rh_time_entries').select('*').eq('tenant_id', tenantId).gte('entry_date', new Date(new Date().setDate(1)).toISOString().split('T')[0]).order('entry_date', { ascending: false }),
          supabase.from('custom_roles').select('*').eq('tenant_id', tenantId),
          supabase.from('rh_taxes').select('*').eq('tenant_id', tenantId)
      ]);

      if (staffRes.data) {
          const mappedUsers = staffRes.data.map((u: any) => ({ 
              id: u.id, 
              name: u.name, 
              role: u.role,
              customRoleId: u.custom_role_id,
              customRoleName: u.custom_roles?.name,
              email: u.email, 
              auth_user_id: u.auth_user_id, 
              allowedRoutes: u.allowed_routes || [],
              
              department: u.department,
              hireDate: u.hire_date ? new Date(u.hire_date) : undefined,
              contractType: u.contract_type,
              baseSalary: Number(u.base_salary) || 0,
              benefitsTotal: Number(u.benefits_total) || 0,
              status: u.status,
              shiftId: u.shift_id,
              phone: u.phone,
              documentCpf: u.document_cpf,

              // Extended
              birthDate: u.birth_date ? new Date(u.birth_date) : undefined,
              mothersName: u.mothers_name,
              fathersName: u.fathers_name,
              maritalStatus: u.marital_status,
              gender: u.gender,
              educationLevel: u.education_level,
              rgNumber: u.rg_number,
              rgIssuer: u.rg_issuer,
              rgState: u.rg_state,
              ctpsNumber: u.ctps_number,
              ctpsSeries: u.ctps_series,
              ctpsState: u.ctps_state,
              pisPasep: u.pis_pasep,
              voterRegistration: u.voter_registration,
              addressZip: u.address_zip,
              addressStreet: u.address_street,
              addressNumber: u.address_number,
              addressNeighborhood: u.address_neighborhood,
              addressCity: u.address_city,
              addressState: u.address_state,
              addressComplement: u.address_complement,
              bankName: u.bank_name,
              bankAgency: u.bank_agency,
              bankAccount: u.bank_account,
              bankAccountType: u.bank_account_type,
              pixKey: u.pix_key
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
              justification: t.justification,
              status: t.status
          }));

          const mappedRoles = (rolesRes.data || []).map(r => ({
              id: r.id,
              name: r.name,
              description: r.description,
              permissions: r.permissions || { allowed_modules: [], allowed_features: [] }
          }));

          const mappedTaxes = (taxesRes.data || []).map(t => ({
              id: t.id,
              name: t.name,
              type: t.type,
              value: Number(t.value),
              isActive: t.is_active
          }));

          setState({ 
            users: mappedUsers, 
            shifts: mappedShifts, 
            timeEntries: mappedTime, 
            roles: mappedRoles,
            taxes: mappedTaxes,
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
              .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_roles', filter: `tenant_id=eq.${tenantId}` }, fetchData)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'rh_taxes', filter: `tenant_id=eq.${tenantId}` }, fetchData)
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
      
      const { error } = await supabase.from('staff').insert({ 
          tenant_id: tenantId, 
          name: user.name, 
          role: user.role, 
          custom_role_id: user.customRoleId || null,
          pin: '0000', 
          email: user.email, 
          allowed_routes: user.allowedRoutes,
          department: user.department,
          hire_date: user.hireDate?.toISOString().split('T')[0],
          contract_type: user.contractType,
          base_salary: user.baseSalary,
          benefits_total: user.benefitsTotal,
          status: user.status,
          shift_id: user.shiftId || null,
          phone: user.phone,
          document_cpf: user.documentCpf,
          // Extended fields...
          birth_date: user.birthDate?.toISOString().split('T')[0],
          mothers_name: user.mothersName,
          fathers_name: user.fathersName,
          marital_status: user.maritalStatus,
          gender: user.gender,
          education_level: user.educationLevel,
          rg_number: user.rgNumber,
          rg_issuer: user.rgIssuer,
          rg_state: user.rgState,
          ctps_number: user.ctpsNumber,
          ctps_series: user.ctpsSeries,
          ctps_state: user.ctpsState,
          pis_pasep: user.pisPasep,
          voter_registration: user.voterRegistration,
          address_zip: user.addressZip,
          address_street: user.addressStreet,
          address_number: user.addressNumber,
          address_neighborhood: user.addressNeighborhood,
          address_city: user.addressCity,
          address_state: user.addressState,
          address_complement: user.addressComplement,
          bank_name: user.bankName,
          bank_agency: user.bankAgency,
          bank_account: user.bankAccount,
          bank_account_type: user.bankAccountType,
          pix_key: user.pixKey
      });

      if (error) {
          console.error("Erro ao adicionar usuário:", error);
          throw new Error(error.message);
      }
      await fetchData();
  };

  const updateUser = async (user: User) => {
      const { error } = await supabase.from('staff').update({ 
          name: user.name, 
          role: user.role, 
          custom_role_id: user.customRoleId || null,
          email: user.email, 
          allowed_routes: user.allowedRoutes,
          department: user.department,
          hire_date: user.hireDate ? new Date(user.hireDate).toISOString().split('T')[0] : null,
          contract_type: user.contractType,
          base_salary: user.baseSalary,
          benefits_total: user.benefitsTotal,
          status: user.status,
          shift_id: user.shiftId || null,
          phone: user.phone,
          document_cpf: user.documentCpf,
          // Extended
          birth_date: user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : null,
          mothers_name: user.mothersName,
          fathers_name: user.fathersName,
          marital_status: user.maritalStatus,
          gender: user.gender,
          education_level: user.educationLevel,
          rg_number: user.rgNumber,
          rg_issuer: user.rgIssuer,
          rg_state: user.rgState,
          ctps_number: user.ctpsNumber,
          ctps_series: user.ctpsSeries,
          ctps_state: user.ctpsState,
          pis_pasep: user.pisPasep,
          voter_registration: user.voterRegistration,
          address_zip: user.addressZip,
          address_street: user.addressStreet,
          address_number: user.addressNumber,
          address_neighborhood: user.addressNeighborhood,
          address_city: user.addressCity,
          address_state: user.addressState,
          address_complement: user.addressComplement,
          bank_name: user.bankName,
          bank_agency: user.bankAgency,
          bank_account: user.bankAccount,
          bank_account_type: user.bankAccountType,
          pix_key: user.pixKey
      }).eq('id', user.id);

      if (error) {
        console.error("Erro ao atualizar usuário:", error);
        throw new Error(error.message);
      }
      await fetchData();
  };

  const deleteUser = async (userId: string) => {
      await supabase.from('staff').delete().eq('id', userId);
  };

  const addRole = async (role: Partial<CustomRole>) => {
      if(!tenantId) return;
      const { error } = await supabase.from('custom_roles').insert({
          tenant_id: tenantId,
          name: role.name,
          description: role.description,
          permissions: role.permissions
      });
      if (error) throw error;
  };

  const updateRole = async (role: CustomRole) => {
      if(!tenantId) return;
      const { error } = await supabase.from('custom_roles').update({
          name: role.name,
          description: role.description,
          permissions: role.permissions
      }).eq('id', role.id);
      if (error) throw error;
  };

  const deleteRole = async (roleId: string) => {
      const { error } = await supabase.from('custom_roles').delete().eq('id', roleId);
      if (error) throw error;
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
            status: 'PENDING',
            entry_type: 'DIGITAL'
          };
          if (type === 'IN') insert.clock_in = now;
          await supabase.from('rh_time_entries').insert(insert);
      }
      await fetchData();
  };
  
  const addTimeEntry = async (entry: Partial<TimeEntry>) => {
      if(!tenantId) return;
      const payload = {
          tenant_id: tenantId,
          staff_id: entry.staffId,
          entry_date: entry.entryDate instanceof Date ? entry.entryDate.toISOString().split('T')[0] : entry.entryDate,
          clock_in: entry.clockIn ? entry.clockIn.toISOString() : null,
          break_start: entry.breakStart ? entry.breakStart.toISOString() : null,
          break_end: entry.breakEnd ? entry.breakEnd.toISOString() : null,
          clock_out: entry.clockOut ? entry.clockOut.toISOString() : null,
          justification: entry.justification,
          entry_type: 'MANUAL',
          status: 'APPROVED'
      };

      const { error } = await supabase.from('rh_time_entries').insert(payload);
      if(error) throw error;
      await fetchData();
  };

  const updateTimeEntry = async (entry: TimeEntry) => {
      if(!tenantId) return;
      const payload = {
          clock_in: entry.clockIn ? entry.clockIn.toISOString() : null,
          break_start: entry.breakStart ? entry.breakStart.toISOString() : null,
          break_end: entry.breakEnd ? entry.breakEnd.toISOString() : null,
          clock_out: entry.clockOut ? entry.clockOut.toISOString() : null,
          justification: entry.justification,
          status: entry.status
      };

      const { error } = await supabase.from('rh_time_entries').update(payload).eq('id', entry.id);
      if(error) throw error;
      await fetchData();
  };

  // --- Gestão de Impostos (RH) ---
  const addTax = async (tax: Partial<RHTax>) => {
      if (!tenantId) return;
      const { error } = await supabase.from('rh_taxes').insert({
          tenant_id: tenantId,
          name: tax.name,
          type: tax.type,
          value: tax.value,
          is_active: true
      });
      if (error) throw error;
  };

  const deleteTax = async (id: string) => {
      const { error } = await supabase.from('rh_taxes').delete().eq('id', id);
      if (error) throw error;
  };

  const getPayroll = async (month: number, year: number): Promise<PayrollPreview[]> => {
      if (!tenantId) return [];
      
      const start = new Date(year, month, 1).toISOString().split('T')[0];
      const end = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const { data: entries } = await supabase.from('rh_time_entries')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('entry_date', start)
        .lte('entry_date', end)
        .eq('status', 'APPROVED');

      // Busca os impostos configurados
      const activeTaxes = state.taxes.filter(t => t.isActive);

      return state.users.map(user => {
          const userEntries = (entries || []).filter(e => e.staff_id === user.id);
          
          let totalMins = 0;
          userEntries.forEach(e => {
              if (e.clock_in && e.clock_out) {
                  const diff = new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime();
                  let mins = diff / 60000;
                  if (e.break_start && e.break_end) {
                      const breakDiff = new Date(e.break_end).getTime() - new Date(e.break_start).getTime();
                      mins -= (breakDiff / 60000);
                  }
                  totalMins += Math.max(0, mins);
              }
          });

          const hoursWorked = totalMins / 60;
          const expectedHours = 220;
          const overtime = Math.max(0, hoursWorked - expectedHours);
          const baseSalary = user.baseSalary || 0;
          const hourlyRate = baseSalary / expectedHours;

          const overtimeTotal = overtime * (hourlyRate * 1.5);
          const benefits = user.benefitsTotal || 0;
          
          const gross = baseSalary + overtimeTotal + benefits;
          
          // Cálculo Dinâmico de Descontos (Impostos)
          let totalDiscounts = 0;
          const breakdown: { name: string, value: number }[] = [];

          activeTaxes.forEach(tax => {
              let val = 0;
              if (tax.type === 'PERCENTAGE') {
                  val = (gross * (tax.value / 100));
              } else {
                  val = tax.value;
              }
              totalDiscounts += val;
              breakdown.push({ name: tax.name, value: val });
          });

          const net = gross - totalDiscounts;

          return {
              staffId: user.id,
              staffName: user.name,
              baseSalary,
              overtimeTotal,
              absencesTotal: 0,
              addictionals: 0,
              benefits,
              grossTotal: gross,
              discounts: totalDiscounts,
              netTotal: net,
              hoursWorked,
              taxBreakdown: breakdown // Adicionado detalhamento
          };
      });
  };

  return (
    <StaffContext.Provider value={{ 
        state, addUser, updateUser, deleteUser,
        addRole, updateRole, deleteRole,
        addShift, deleteShift, registerTime, getPayroll,
        addTimeEntry, updateTimeEntry, fetchData,
        addTax, deleteTax
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
