
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
    User, Shift, TimeEntry, PayrollPreview, CustomRole, 
    RHTax, RHBenefit, TaxRegime, TaxPayerType, TaxCalculationBasis,
    RhPayrollSetting, RhInssBracket, RhIrrfBracket, ClosedPayroll,
    PayrollEvent, PayrollEventType, PayrollEntry, HrJobRole, RecurringEvent
} from '../types';
import { supabase, logAudit } from '../lib/supabase';
import { useRestaurant } from './RestaurantContext';
import { useUI } from './UIContext';
import { useAuth } from './AuthProvider'; 

interface StaffState {
  users: User[];
  shifts: Shift[];
  timeEntries: TimeEntry[];
  roles: CustomRole[];
  hrJobRoles: HrJobRole[];
  taxes: RHTax[]; 
  benefits: RHBenefit[]; 
  legalSettings: RhPayrollSetting | null;
  inssBrackets: RhInssBracket[];
  irrfBrackets: RhIrrfBracket[];
  payrollEvents: PayrollEvent[];
  recurringEvents: RecurringEvent[];
  payrollEntries: PayrollEntry[];
  isLoading: boolean;
}

interface StaffContextType {
  state: StaffState;
  addUser: (user: Partial<User>) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  addRole: (role: Partial<CustomRole>) => Promise<void>;
  updateRole: (role: CustomRole) => Promise<void>;
  deleteRole: (roleId: string) => Promise<void>;
  addHrJobRole: (role: Partial<HrJobRole>) => Promise<void>;
  updateHrJobRole: (role: HrJobRole) => Promise<void>;
  deleteHrJobRole: (roleId: string) => Promise<void>;
  addShift: (shift: Partial<Shift>) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;
  registerTime: (staffId: string, type: 'IN' | 'BREAK_START' | 'BREAK_END' | 'OUT', justification?: string) => Promise<void>;
  addTimeEntry: (entry: Partial<TimeEntry>) => Promise<void>;
  updateTimeEntry: (entry: TimeEntry) => Promise<void>;
  
  saveLegalSettings: (settings: Partial<RhPayrollSetting>) => Promise<void>;
  saveInssBrackets: (brackets: RhInssBracket[]) => Promise<void>;
  saveIrrfBrackets: (brackets: RhIrrfBracket[]) => Promise<void>;
  applyLegalDefaults: (year?: '2024' | '2026') => Promise<void>;

  addTax: (tax: Partial<RHTax>) => Promise<void>;
  deleteTax: (id: string) => Promise<void>;
  applyRegimeDefaults: (regime: TaxRegime) => Promise<void>;
  addBenefit: (benefit: Partial<RHBenefit>) => Promise<void>;
  deleteBenefit: (id: string) => Promise<void>;

  addPayrollEvent: (event: Partial<PayrollEvent>) => Promise<void>;
  updatePayrollEvent: (event: PayrollEvent) => Promise<void>;
  deletePayrollEvent: (id: string) => Promise<void>;
  addPayrollEntry: (entry: Partial<PayrollEntry>) => Promise<void>;

  addRecurringEvent: (event: Partial<RecurringEvent>) => Promise<void>;
  updateRecurringEvent: (event: RecurringEvent) => Promise<void>;
  deleteRecurringEvent: (id: string) => Promise<void>;
  generateRecurringEventsForMonth: (month: number, year: number) => Promise<void>;

  getPayroll: (month: number, year: number) => Promise<{ payroll: PayrollPreview[], isClosed: boolean, closedInfo?: ClosedPayroll }>;
  closePayroll: (month: number, year: number) => Promise<void>;
  reopenPayroll: (month: number, year: number) => Promise<void>;
  fetchData: () => Promise<void>;
}

const StaffContext = createContext<StaffContextType | undefined>(undefined);

export const StaffProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state: restState } = useRestaurant();
  const { state: authState } = useAuth();
  const { tenantId, planLimits } = restState;
  const { showAlert } = useUI();

  const currentUser = authState.currentUser;
  
  const [state, setState] = useState<StaffState>({ 
    users: [], shifts: [], timeEntries: [], roles: [], hrJobRoles: [], taxes: [], benefits: [],
    legalSettings: null, inssBrackets: [], irrfBrackets: [], payrollEvents: [], recurringEvents: [], payrollEntries: [], isLoading: true 
  });

  const fetchData = useCallback(async () => {
      if (!tenantId) return;
      
      const [
          staffRes, shiftsRes, timeRes, rolesRes, taxesRes, benefitsRes,
          settingsRes, inssRes, irrfRes, eventsRes, recurringEventsRes, hrRolesRes
      ] = await Promise.all([
          supabase.from('staff').select('*, custom_roles(name)').eq('tenant_id', tenantId).order('name'),
          supabase.from('rh_shifts').select('*').eq('tenant_id', tenantId),
          supabase.from('rh_time_entries').select('*').eq('tenant_id', tenantId).gte('entry_date', new Date(new Date().setDate(1)).toISOString().split('T')[0]).order('entry_date', { ascending: false }),
          supabase.from('custom_roles').select('*').eq('tenant_id', tenantId),
          supabase.from('rh_taxes').select('*').eq('tenant_id', tenantId),
          supabase.from('rh_benefits').select('*').eq('tenant_id', tenantId),
          supabase.from('rh_payroll_settings').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('rh_inss_brackets').select('*').eq('tenant_id', tenantId).order('min_value', { ascending: true }),
          supabase.from('rh_irrf_brackets').select('*').eq('tenant_id', tenantId).order('min_value', { ascending: true }),
          supabase.from('rh_payroll_events').select('*').eq('tenant_id', tenantId),
          supabase.from('rh_recurring_events').select('*').eq('tenant_id', tenantId),
          supabase.from('rh_job_roles').select('*').eq('tenant_id', tenantId)
      ]);

      if (staffRes.data) {
          const mappedUsers = staffRes.data.map((u: any) => ({ 
              id: u.id, name: u.name, role: u.role, customRoleId: u.custom_role_id, customRoleName: u.custom_roles?.name,
              email: u.email, auth_user_id: u.auth_user_id, allowedRoutes: u.allowed_routes || [],
              department: u.department, hrJobRoleId: u.hr_job_role_id, hireDate: u.hire_date ? new Date(u.hire_date) : undefined, contractType: u.contract_type,
              workModel: u.work_model || '44H_WEEKLY',
              baseSalary: Number(u.base_salary) || 0, benefitsTotal: Number(u.benefits_total) || 0, status: u.status,
              shiftId: u.shift_id, phone: u.phone, documentCpf: u.document_cpf, dependentsCount: u.dependents_count || 0,
              bankHoursBalance: Number(u.bank_hours_balance) || 0
          }));

          const legalSettings: RhPayrollSetting | null = settingsRes.data ? {
              id: settingsRes.data.id, minWage: Number(settingsRes.data.min_wage),
              inssCeiling: Number(settingsRes.data.inss_ceiling), irrfDependentDeduction: Number(settingsRes.data.irrf_dependent_deduction),
              fgtsRate: Number(settingsRes.data.fgts_rate), validFrom: settingsRes.data.valid_from, validUntil: settingsRes.data.valid_until
          } : null;

          const inssBrackets = (inssRes.data || []).map((i: any) => ({
              id: i.id, minValue: Number(i.min_value), maxValue: i.max_value ? Number(i.max_value) : undefined,
              rate: Number(i.rate), validFrom: i.valid_from
          }));

          const irrfBrackets = (irrfRes.data || []).map((i: any) => ({
              id: i.id, minValue: Number(i.min_value), maxValue: i.max_value ? Number(i.max_value) : undefined,
              rate: Number(i.rate), deduction: Number(i.deduction), validFrom: i.valid_from
          }));

          const mappedTaxes = (taxesRes.data || []).map((t: any) => ({
              id: t.id, name: t.name, type: t.type, value: Number(t.value),
              payerType: (t.payer_type || 'EMPLOYEE') as TaxPayerType,
              calculationBasis: (t.calculation_basis || 'GROSS_TOTAL') as TaxCalculationBasis,
              isActive: t.is_active
          }));

          const mappedBenefits = (benefitsRes.data || []).map((b: any) => ({
              id: b.id, name: b.name, type: b.type, value: Number(b.value), isActive: b.is_active
          }));
          
          const mappedShifts = (shiftsRes.data || []).map((s: any) => ({
              id: s.id, name: s.name, startTime: s.start_time, endTime: s.end_time,
              breakMinutes: s.break_minutes, toleranceMinutes: s.tolerance_minutes, nightShift: s.night_shift
          }));

          const mappedTime = (timeRes.data || []).map((t: any) => ({
              id: t.id, staffId: t.staff_id, entryDate: new Date(t.entry_date),
              clockIn: t.clock_in ? new Date(t.clock_in) : undefined,
              breakStart: t.break_start ? new Date(t.break_start) : undefined,
              breakEnd: t.break_end ? new Date(t.break_end) : undefined,
              clockOut: t.clock_out ? new Date(t.clock_out) : undefined,
              justification: t.justification, status: t.status
          }));

          const mappedRoles = (rolesRes.data || []).map((r: any) => ({
              id: r.id, name: r.name, description: r.description,
              permissions: r.permissions || { allowed_modules: [], allowed_features: [] }
          }));

          const mappedEvents = (eventsRes.data || []).map((e: any) => ({
              id: e.id, staffId: e.staff_id, month: e.month, year: e.year,
              type: e.type, description: e.description, value: Number(e.value)
          }));

          const mappedRecurringEvents = (recurringEventsRes.data || []).map((e: any) => ({
              id: e.id, staffId: e.staff_id, type: e.type, description: e.description, 
              value: Number(e.value), isActive: e.is_active
          }));

          const mappedHrRoles = (hrRolesRes.data || []).map((r: any) => ({
              id: r.id, title: r.title, cboCode: r.cbo_code, description: r.description,
              baseSalary: Number(r.base_salary), customRoleId: r.custom_role_id, isActive: r.is_active
          }));

          setState({ 
            users: mappedUsers, shifts: mappedShifts, timeEntries: mappedTime, roles: mappedRoles, hrJobRoles: mappedHrRoles,
            taxes: mappedTaxes, benefits: mappedBenefits, legalSettings, inssBrackets, irrfBrackets, 
            payrollEvents: mappedEvents, recurringEvents: mappedRecurringEvents, payrollEntries: [], isLoading: false 
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
              .on('postgres_changes', { event: '*', schema: 'public', table: 'rh_taxes', filter: `tenant_id=eq.${tenantId}` }, fetchData)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'rh_benefits', filter: `tenant_id=eq.${tenantId}` }, fetchData)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'rh_payroll_settings', filter: `tenant_id=eq.${tenantId}` }, fetchData)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'rh_inss_brackets', filter: `tenant_id=eq.${tenantId}` }, fetchData)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'rh_irrf_brackets', filter: `tenant_id=eq.${tenantId}` }, fetchData)
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
          tenant_id: tenantId, name: user.name, role: user.role, custom_role_id: user.customRoleId || null,
          pin: '0000', email: user.email, allowed_routes: user.allowedRoutes, department: user.department,
          hr_job_role_id: user.hrJobRoleId || null,
          hire_date: user.hireDate?.toISOString().split('T')[0], contract_type: user.contractType,
          work_model: user.workModel,
          base_salary: user.baseSalary, benefits_total: user.benefitsTotal, status: user.status,
          shift_id: user.shiftId || null, phone: user.phone, document_cpf: user.documentCpf, dependents_count: user.dependentsCount || 0,
      });

      if (error) { throw new Error(error.message); }
      if (currentUser && tenantId) {
          await logAudit(tenantId, currentUser.id, currentUser.name, 'HR', 'Criação de Colaborador', { userName: user.name, role: user.role });
      }
      await fetchData();
  };

  const updateUser = async (user: User) => {
      const { error } = await supabase.from('staff').update({ 
          name: user.name, role: user.role, custom_role_id: user.customRoleId || null,
          email: user.email, allowed_routes: user.allowedRoutes, department: user.department,
          hr_job_role_id: user.hrJobRoleId || null,
          hire_date: user.hireDate ? new Date(user.hireDate).toISOString().split('T')[0] : null,
          contract_type: user.contractType, work_model: user.workModel,
          base_salary: user.baseSalary, benefits_total: user.benefitsTotal,
          status: user.status, shift_id: user.shiftId || null, phone: user.phone, document_cpf: user.documentCpf,
          dependents_count: user.dependentsCount || 0,
      }).eq('id', user.id);

      if (error) { throw new Error(error.message); }
      if (currentUser && tenantId) {
          await logAudit(tenantId, currentUser.id, currentUser.name, 'HR', 'Atualização de Colaborador', { userName: user.name });
      }
      await fetchData();
  };

  const deleteUser = async (userId: string) => { 
      await supabase.from('staff').delete().eq('id', userId); 
      if (currentUser && tenantId) {
          await logAudit(tenantId, currentUser.id, currentUser.name, 'HR', 'Exclusão de Colaborador', { userId });
      }
  };
  const addRole = async (role: Partial<CustomRole>) => { if(!tenantId) return; const { error } = await supabase.from('custom_roles').insert({ tenant_id: tenantId, name: role.name, description: role.description, permissions: role.permissions }); if (error) throw error; };
  const updateRole = async (role: CustomRole) => { if(!tenantId) return; const { error } = await supabase.from('custom_roles').update({ name: role.name, description: role.description, permissions: role.permissions }).eq('id', role.id); if (error) throw error; };
  const deleteRole = async (roleId: string) => { const { error } = await supabase.from('custom_roles').delete().eq('id', roleId); if (error) throw error; };

  const addHrJobRole = async (role: Partial<HrJobRole>) => { 
      if(!tenantId) return; 
      const { error } = await supabase.from('rh_job_roles').insert({ 
          tenant_id: tenantId, title: role.title, cbo_code: role.cboCode, 
          description: role.description, base_salary: role.baseSalary, 
          custom_role_id: role.customRoleId || null, is_active: role.isActive !== false 
      }); 
      if (error) throw error; 
  };
  const updateHrJobRole = async (role: HrJobRole) => { 
      if(!tenantId) return; 
      const { error } = await supabase.from('rh_job_roles').update({ 
          title: role.title, cbo_code: role.cboCode, 
          description: role.description, base_salary: role.baseSalary, 
          custom_role_id: role.customRoleId || null, is_active: role.isActive 
      }).eq('id', role.id); 
      if (error) throw error; 
  };
  const deleteHrJobRole = async (roleId: string) => { 
      const { error } = await supabase.from('rh_job_roles').delete().eq('id', roleId); 
      if (error) throw error; 
  };

  const addShift = async (shift: Partial<Shift>) => { if(!tenantId) return; await supabase.from('rh_shifts').insert({ tenant_id: tenantId, name: shift.name, start_time: shift.startTime, end_time: shift.endTime, break_minutes: shift.breakMinutes, tolerance_minutes: shift.toleranceMinutes, night_shift: shift.nightShift }); };
  const deleteShift = async (id: string) => { await supabase.from('rh_shifts').delete().eq('id', id); };
  
  const registerTime = async (staffId: string, type: 'IN' | 'BREAK_START' | 'BREAK_END' | 'OUT', justification?: string) => {
      if(!tenantId) return;
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      const { data: existing } = await supabase.from('rh_time_entries').select('*').eq('staff_id', staffId).eq('entry_date', today).maybeSingle();
      if (existing) {
          const update: any = {};
          if (type === 'IN') update.clock_in = now;
          if (type === 'BREAK_START') update.break_start = now;
          if (type === 'BREAK_END') update.break_end = now;
          if (type === 'OUT') update.clock_out = now;
          if (justification) update.justification = justification;
          await supabase.from('rh_time_entries').update(update).eq('id', existing.id);
      } else {
          const insert: any = { tenant_id: tenantId, staff_id: staffId, entry_date: today, status: 'PENDING', entry_type: 'DIGITAL' };
          if (type === 'IN') insert.clock_in = now;
          await supabase.from('rh_time_entries').insert(insert);
      }
      await fetchData();
  };
  
  const addTimeEntry = async (entry: Partial<TimeEntry>) => { if(!tenantId) return; const payload = { tenant_id: tenantId, staff_id: entry.staffId, entry_date: entry.entryDate instanceof Date ? entry.entryDate.toISOString().split('T')[0] : entry.entryDate, clock_in: entry.clockIn ? entry.clockIn.toISOString() : null, break_start: entry.breakStart ? entry.breakStart.toISOString() : null, break_end: entry.breakEnd ? entry.breakEnd.toISOString() : null, clock_out: entry.clockOut ? entry.clockOut.toISOString() : null, justification: entry.justification, entry_type: 'MANUAL', status: 'APPROVED' }; const { error } = await supabase.from('rh_time_entries').insert(payload); if(error) throw error; await fetchData(); };
  const updateTimeEntry = async (entry: TimeEntry) => { if(!tenantId) return; const payload = { clock_in: entry.clockIn ? entry.clockIn.toISOString() : null, break_start: entry.breakStart ? entry.breakStart.toISOString() : null, break_end: entry.breakEnd ? entry.breakEnd.toISOString() : null, clock_out: entry.clockOut ? entry.clockOut.toISOString() : null, justification: entry.justification, status: entry.status }; const { error } = await supabase.from('rh_time_entries').update(payload).eq('id', entry.id); if(error) throw error; await fetchData(); };

  // --- MÉTODOS DE CONFIGURAÇÃO LEGAL ---
  const saveLegalSettings = async (settings: Partial<RhPayrollSetting>) => {
      if (!tenantId) return;
      const payload = {
          tenant_id: tenantId, min_wage: settings.minWage, inss_ceiling: settings.inssCeiling,
          irrf_dependent_deduction: settings.irrfDependentDeduction, fgts_rate: settings.fgtsRate,
          valid_from: settings.validFrom, valid_until: settings.validUntil
      };
      await supabase.from('rh_payroll_settings').delete().eq('tenant_id', tenantId);
      await supabase.from('rh_payroll_settings').insert(payload);
      fetchData();
  };

  const saveInssBrackets = async (brackets: RhInssBracket[]) => {
      if (!tenantId) return;
      await supabase.from('rh_inss_brackets').delete().eq('tenant_id', tenantId);
      const inserts = brackets.map(b => ({ tenant_id: tenantId, min_value: b.minValue, max_value: b.maxValue, rate: b.rate, valid_from: b.validFrom }));
      await supabase.from('rh_inss_brackets').insert(inserts);
      fetchData();
  };

  const saveIrrfBrackets = async (brackets: RhIrrfBracket[]) => {
      if (!tenantId) return;
      await supabase.from('rh_irrf_brackets').delete().eq('tenant_id', tenantId);
      const inserts = brackets.map(b => ({ tenant_id: tenantId, min_value: b.minValue, max_value: b.maxValue, rate: b.rate, deduction: b.deduction, valid_from: b.validFrom }));
      await supabase.from('rh_irrf_brackets').insert(inserts);
      fetchData();
  };

  const applyLegalDefaults = async (year: '2024' | '2026' = '2026') => {
      if (!tenantId) return;
      const today = new Date().toISOString().split('T')[0];

      let settings, inssBrackets, irrfBrackets;

      if (year === '2024') {
          settings = { minWage: 1412.00, inssCeiling: 7786.02, irrfDependentDeduction: 189.59, fgtsRate: 8.00, validFrom: '2024-01-01' };
          inssBrackets = [
              { id: '', minValue: 0, maxValue: 1412.00, rate: 7.5, validFrom: '2024-01-01' },
              { id: '', minValue: 1412.01, maxValue: 2666.68, rate: 9.0, validFrom: '2024-01-01' },
              { id: '', minValue: 2666.69, maxValue: 4000.03, rate: 12.0, validFrom: '2024-01-01' },
              { id: '', minValue: 4000.04, maxValue: 7786.02, rate: 14.0, validFrom: '2024-01-01' }
          ];
          irrfBrackets = [
              { id: '', minValue: 0, maxValue: 2259.20, rate: 0, deduction: 0, validFrom: '2024-01-01' },
              { id: '', minValue: 2259.21, maxValue: 2826.65, rate: 7.5, deduction: 169.44, validFrom: '2024-01-01' },
              { id: '', minValue: 2826.66, maxValue: 3751.05, rate: 15.0, deduction: 381.44, validFrom: '2024-01-01' },
              { id: '', minValue: 3751.06, maxValue: 4664.68, rate: 22.5, deduction: 662.77, validFrom: '2024-01-01' },
              { id: '', minValue: 4664.69, rate: 27.5, deduction: 896.00, validFrom: '2024-01-01' }
          ];
      } else { // 2026 - Valores hipotéticos
          settings = { minWage: 1650.00, inssCeiling: 8564.62, irrfDependentDeduction: 189.59, fgtsRate: 8.00, validFrom: '2026-01-01' };
          inssBrackets = [
              { id: '', minValue: 0, maxValue: 1650.00, rate: 7.5, validFrom: '2026-01-01' },
              { id: '', minValue: 1650.01, maxValue: 3000.00, rate: 9.0, validFrom: '2026-01-01' },
              { id: '', minValue: 3000.01, maxValue: 4500.00, rate: 12.0, validFrom: '2026-01-01' },
              { id: '', minValue: 4500.01, maxValue: 8564.62, rate: 14.0, validFrom: '2026-01-01' }
          ];
          irrfBrackets = [
              { id: '', minValue: 0, maxValue: 2500.00, rate: 0, deduction: 0, validFrom: '2026-01-01' },
              { id: '', minValue: 2500.01, maxValue: 3200.00, rate: 7.5, deduction: 187.50, validFrom: '2026-01-01' },
              { id: '', minValue: 3200.01, maxValue: 4250.00, rate: 15.0, deduction: 427.50, validFrom: '2026-01-01' },
              { id: '', minValue: 4250.01, maxValue: 5300.00, rate: 22.5, deduction: 746.25, validFrom: '2026-01-01' },
              { id: '', minValue: 5300.01, rate: 27.5, deduction: 1011.25, validFrom: '2026-01-01' }
          ];
      }

      await saveLegalSettings(settings);
      await saveInssBrackets(inssBrackets);
      await saveIrrfBrackets(irrfBrackets);
  };

  const addTax = async (tax: Partial<RHTax>) => { if (!tenantId) return; await supabase.from('rh_taxes').insert({ tenant_id: tenantId, name: tax.name, type: tax.type, value: tax.value, payer_type: tax.payerType, calculation_basis: tax.calculationBasis, is_active: true }); };
  const deleteTax = async (id: string) => { await supabase.from('rh_taxes').delete().eq('id', id); };
  const applyRegimeDefaults = async (regime: TaxRegime) => {
      await supabase.from('rh_taxes').delete().eq('tenant_id', tenantId);
      const defaults: Partial<RHTax>[] = [ { name: 'Vale Transporte (Desc)', type: 'PERCENTAGE', value: 6, payerType: 'EMPLOYEE', calculationBasis: 'BASE_SALARY' } ];
      if (regime !== 'SIMPLES_NACIONAL' && regime !== 'MEI') { defaults.push({ name: 'INSS Patronal', type: 'PERCENTAGE', value: 20, payerType: 'EMPLOYER', calculationBasis: 'GROSS_TOTAL' }); defaults.push({ name: 'Sistema S + Terceiros', type: 'PERCENTAGE', value: 5.8, payerType: 'EMPLOYER', calculationBasis: 'GROSS_TOTAL' }); }
      for (const d of defaults) { await addTax(d); }
      fetchData();
  };
  const addBenefit = async (benefit: Partial<RHBenefit>) => { if (!tenantId) return; await supabase.from('rh_benefits').insert({ tenant_id: tenantId, name: benefit.name, type: benefit.type, value: benefit.value, is_active: true }); };
  const deleteBenefit = async (id: string) => { await supabase.from('rh_benefits').delete().eq('id', id); };

  // --- EVENTOS VARIÁVEIS ---
  const addPayrollEvent = async (event: Partial<PayrollEvent>) => {
      if(!tenantId || !currentUser) return;

      if (event.type === 'ADVANCE') {
          const user = state.users.find(u => u.id === event.staffId);
          if (user && user.baseSalary) {
              const maxAdvance = user.baseSalary * 0.40; // 40% limit
              if (event.value && event.value > maxAdvance) {
                  throw new Error(`Adiantamento (R$ ${event.value.toFixed(2)}) excede o limite de 40% (R$ ${maxAdvance.toFixed(2)}) do salário base.`);
              }
          }
      }

      const { error } = await supabase.from('rh_payroll_events').insert({
          tenant_id: tenantId, staff_id: event.staffId, month: event.month, year: event.year,
          type: event.type, description: event.description, value: event.value, created_by: authState.currentUser?.id
      });
      if(error) throw error;

      await logAudit(tenantId, currentUser.id, currentUser.name, 'HR', 'Lançamento de Evento', { eventType: event.type, staffId: event.staffId, value: event.value });
      fetchData();
  };

  const updatePayrollEvent = async (event: PayrollEvent) => {
      if(!tenantId || !currentUser) return;

      const { error } = await supabase.from('rh_payroll_events').update({
          type: event.type, description: event.description, value: event.value
      }).eq('id', event.id);
      if(error) throw error;

      await logAudit(tenantId, currentUser.id, currentUser.name, 'HR', 'Edição de Evento', { eventType: event.type, staffId: event.staffId, value: event.value });
      fetchData();
  };
  
  const deletePayrollEvent = async (id: string) => {
      await supabase.from('rh_payroll_events').delete().eq('id', id);
      fetchData();
  };

  // --- EVENTOS RECORRENTES ---
  const addRecurringEvent = async (event: Partial<RecurringEvent>) => {
      if(!tenantId || !currentUser) return;
      const { error } = await supabase.from('rh_recurring_events').insert({
          tenant_id: tenantId, staff_id: event.staffId, type: event.type, 
          description: event.description, value: event.value, is_active: event.isActive !== false
      });
      if(error) throw error;
      fetchData();
  };

  const updateRecurringEvent = async (event: RecurringEvent) => {
      if(!tenantId || !currentUser) return;
      const { error } = await supabase.from('rh_recurring_events').update({
          type: event.type, description: event.description, value: event.value, is_active: event.isActive
      }).eq('id', event.id);
      if(error) throw error;
      fetchData();
  };

  const deleteRecurringEvent = async (id: string) => {
      await supabase.from('rh_recurring_events').delete().eq('id', id);
      fetchData();
  };

  const generateRecurringEventsForMonth = async (month: number, year: number) => {
      if(!tenantId || !currentUser) return;
      
      // 1. Get active recurring events
      const activeEvents = state.recurringEvents.filter(e => e.isActive);
      if (activeEvents.length === 0) return;

      // 2. Get existing events for this month to avoid duplicates
      const { data: existingEvents } = await supabase.from('rh_payroll_events')
          .select('staff_id, type, description')
          .eq('tenant_id', tenantId)
          .eq('month', month)
          .eq('year', year);

      const inserts = [];
      for (const rec of activeEvents) {
          // Check if this exact event was already generated
          const alreadyExists = existingEvents?.some(e => 
              e.staff_id === rec.staffId && 
              e.type === rec.type && 
              e.description === rec.description
          );

          if (!alreadyExists) {
              inserts.push({
                  tenant_id: tenantId,
                  staff_id: rec.staffId,
                  month,
                  year,
                  type: rec.type,
                  description: rec.description,
                  value: rec.value,
                  created_by: currentUser.id
              });
          }
      }

      if (inserts.length > 0) {
          const { error } = await supabase.from('rh_payroll_events').insert(inserts);
          if (error) throw error;
          await logAudit(tenantId, currentUser.id, currentUser.name, 'HR', 'Geração de Eventos Recorrentes', { count: inserts.length, month, year });
          fetchData();
      }
  };

  const addPayrollEntry = async (entry: Partial<PayrollEntry>) => {
      if (!tenantId) return;
      const { error } = await supabase.from('rh_payroll_entries').insert({
          tenant_id: tenantId,
          staff_id: entry.staffId,
          month: entry.month,
          overtime_hours: entry.overtimeHours,
          missing_hours: entry.missingHours,
      });
      if (error) throw error;
      fetchData();
  };

  const calculateINSS = (grossSalary: number): number => {
      const brackets = state.inssBrackets;
      const ceiling = state.legalSettings?.inssCeiling || 7786.02;
      const salaryForCalc = Math.min(grossSalary, ceiling);
      let totalINSS = 0;
      let remainingSalary = salaryForCalc;
      let previousBracketMax = 0;

      for (const bracket of brackets) {
          if (salaryForCalc > previousBracketMax) {
              const taxableAmountInBracket = Math.min(remainingSalary, (bracket.maxValue || ceiling) - previousBracketMax);
              totalINSS += taxableAmountInBracket * (bracket.rate / 100);
              remainingSalary -= taxableAmountInBracket;
              if (remainingSalary <= 0) break;
              previousBracketMax = bracket.maxValue || ceiling;
          }
      }
      return totalINSS;
  };

  const calculateIRRF = (grossSalary: number, inssValue: number, dependents: number): number => {
      const deductionPerDependent = state.legalSettings?.irrfDependentDeduction || 189.59;
      const basis = grossSalary - inssValue - (dependents * deductionPerDependent);
      if (basis <= 0) return 0;
      const bracket = state.irrfBrackets.find(b => basis >= b.minValue && (b.maxValue === undefined || b.maxValue === null || basis <= b.maxValue));
      if (!bracket || bracket.rate === 0) return 0;
      return (basis * (bracket.rate / 100)) - bracket.deduction;
  };

  const getPayroll = async (month: number, year: number): Promise<{ payroll: PayrollPreview[], isClosed: boolean, closedInfo?: ClosedPayroll }> => {
      if (!tenantId) return { payroll: [], isClosed: false };
      
      const { data: closedPayroll } = await supabase.from('rh_closed_payrolls')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle();

      if (closedPayroll) {
          const { data: items } = await supabase.from('rh_closed_payroll_items').select('*').eq('payroll_id', closedPayroll.id);
          const historyItems = (items || []).map((i: any) => ({
              staffId: i.staff_id, staffName: i.staff_name, baseSalary: Number(i.base_salary),
              grossTotal: Number(i.gross_total), netTotal: Number(i.net_total), discounts: Number(i.total_discounts),
              ...i.details
          }));

          return { 
              payroll: historyItems, 
              isClosed: true,
              closedInfo: {
                  id: closedPayroll.id, month: closedPayroll.month, year: closedPayroll.year,
                  totalCost: closedPayroll.total_cost, totalNet: closedPayroll.total_net,
                  employeeCount: closedPayroll.employee_count, closedAt: new Date(closedPayroll.closed_at),
                  closedBy: closedPayroll.closed_by
              }
          };
      }

      // CÁLCULO DINÂMICO
      const start = new Date(year, month, 1).toISOString().split('T')[0];
      const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
      
      // Buscar Ponto
      const { data: entries } = await supabase.from('rh_time_entries').select('*').eq('tenant_id', tenantId).gte('entry_date', start).lte('entry_date', end).eq('status', 'APPROVED');
      
      // Buscar Eventos Variáveis
      const { data: events } = await supabase.from('rh_payroll_events').select('*').eq('tenant_id', tenantId).eq('month', month).eq('year', year);

      const activeTaxes = state.taxes.filter(t => t.isActive);
      const activeBenefits = state.benefits.filter(b => b.isActive);
      const fgtsRate = state.legalSettings?.fgtsRate || 8;
      
      // Mapeia dias úteis e DSR se necessário, mas vamos simplificar com carga mensal
      const STANDARD_HOURS_MAP: Record<string, number> = {
          '44H_WEEKLY': 220,
          '12X36': 180, // Média 15 dias * 12h
          'PART_TIME': 110,
          'INTERMITTENT': 0, // Paga por hora
          'ROTATING': 220
      };

      const livePayroll = state.users.map(user => {
          // 1. Horas Trabalhadas
          const userEntries = (entries || []).filter(e => e.staff_id === user.id);
          let totalMins = 0;
          let nightMins = 0; // Adicional noturno
          
          userEntries.forEach((e: any) => {
              if (e.clock_in && e.clock_out) {
                  const inTime = new Date(e.clock_in);
                  const outTime = new Date(e.clock_out);
                  const diff = outTime.getTime() - inTime.getTime();
                  let mins = diff / 60000;
                  
                  if (e.break_start && e.break_end) {
                       mins -= ((new Date(e.break_end).getTime() - new Date(e.break_start).getTime()) / 60000);
                  }
                  totalMins += Math.max(0, mins);

                  // Cálculo simplificado noturno (22:00 - 05:00)
                  // Detecta se cruzou a noite
                  const inHour = inTime.getHours();
                  const outHour = outTime.getHours();
                  // Lógica completa seria complexa, aqui vamos estimar se o turno é noturno
                  // Se o turno cruza meia noite ou começa depois das 22h
                  if (inHour >= 22 || outHour < 5 || outTime.getDate() > inTime.getDate()) {
                      // Estima que tudo foi noturno se shiftId diz nightShift, senão calcula proporcional
                      // Para simplificar neste MVP, assumimos 20% do tempo total se for turno da noite
                      const shift = state.shifts.find(s => s.id === user.shiftId);
                      if (shift?.nightShift) {
                          nightMins += mins;
                      }
                  }
              }
          });

          const hoursWorked = totalMins / 60;
          const targetHours = STANDARD_HOURS_MAP[user.workModel || '44H_WEEKLY'] || 220;
          const baseSalary = user.baseSalary || 0;
          const hourlyRate = targetHours > 0 ? baseSalary / targetHours : 0;
          
          // Banco de Horas / Extra
          const balance = hoursWorked - targetHours;
          const overtimeHours = Math.max(0, balance); // Positivo = Extra
          const underHours = Math.min(0, balance); // Negativo = Falta
          
          // Cálculo financeiro de Extras (50% dia normal, 100% domingo/feriado - simplificado para 50%)
          // Melhoria: Iterar dias para saber se foi domingo
          let overtime50Val = overtimeHours * (hourlyRate * 1.5);
          let overtime100Val = 0; // Implementar checagem de domingo

          const nightShiftAdd = (nightMins / 60) * (hourlyRate * 0.20); // 20% sobre hora normal

          // Eventos Variáveis
          const userEvents = (events || []).filter((ev: any) => ev.staff_id === user.id);
          let eventAdditions = 0;
          let eventDeductions = 0;
          let advances = 0;
          const eventBreakdown: any[] = [];
          
          userEvents.forEach((ev: any) => {
              if (['BONUS', 'COMMISSION', 'INSALUBRITY', 'DANGEROUSNESS', 'NIGHT_SHIFT'].includes(ev.type)) {
                  eventAdditions += Number(ev.value);
                  eventBreakdown.push({ name: ev.description || ev.type, value: Number(ev.value), type: 'CREDIT' });
              } else if (['DEDUCTION', 'FOOD_VOUCHER'].includes(ev.type)) {
                  eventDeductions += Number(ev.value);
                  eventBreakdown.push({ name: ev.description || ev.type, value: Number(ev.value), type: 'DEBIT' });
              } else if (ev.type === 'ADVANCE') {
                  advances += Number(ev.value);
                  eventBreakdown.push({ name: 'Adiantamento', value: Number(ev.value), type: 'DEBIT' });
              }
          });

          // Benefícios Fixos (Recorrentes)
          let benefitsValue = user.benefitsTotal || 0;
          const benefitBreakdown: { name: string, value: number }[] = [];
          activeBenefits.forEach(ben => {
               let val = ben.type === 'PERCENTAGE' ? (baseSalary * (ben.value / 100)) : ben.value;
               benefitsValue += val;
               benefitBreakdown.push({ name: ben.name, value: val });
          });

          // Total Bruto
          const gross = baseSalary + overtime50Val + overtime100Val + nightShiftAdd + benefitsValue + eventAdditions;

          // Impostos
          const inssValue = calculateINSS(gross);
          const irrfValue = calculateIRRF(gross, inssValue, user.dependentsCount || 0);
          
          let otherDeductions = eventDeductions + advances; // Inclui eventos manuais de desconto
          let otherEmployerCharges = 0;
          const taxBreakdown: { name: string, value: number, type: TaxPayerType }[] = [];

          if (inssValue > 0) taxBreakdown.push({ name: 'INSS', value: inssValue, type: 'EMPLOYEE' });
          if (irrfValue > 0) taxBreakdown.push({ name: 'IRRF', value: irrfValue, type: 'EMPLOYEE' });

          activeTaxes.forEach(tax => {
              let val = 0;
              const basisAmount = tax.calculationBasis === 'BASE_SALARY' ? baseSalary : gross;
              if (tax.type === 'PERCENTAGE') val = (basisAmount * (tax.value / 100));
              else val = tax.value;
              
              if (tax.payerType === 'EMPLOYER') otherEmployerCharges += val;
              else otherDeductions += val;
              
              taxBreakdown.push({ name: tax.name, value: val, type: tax.payerType });
          });

          const totalEmployeeDeductions = inssValue + irrfValue + otherDeductions;
          const net = gross - totalEmployeeDeductions;
          
          const fgtsValue = gross * (fgtsRate / 100);
          taxBreakdown.push({ name: `FGTS (${fgtsRate}%)`, value: fgtsValue, type: 'EMPLOYER' });
          const totalEmployerCharges = fgtsValue + otherEmployerCharges;
          const totalCompanyCost = gross + totalEmployerCharges;

          return {
              staffId: user.id, staffName: user.name, baseSalary, 
              overtime50: overtime50Val, overtime100: overtime100Val, nightShiftAdd, bankOfHoursBalance: balance,
              absencesTotal: underHours, addictionals: 0, eventsValue: eventAdditions,
              benefits: benefitsValue, grossTotal: gross, discounts: totalEmployeeDeductions, advances, netTotal: net, hoursWorked,
              employerCharges: totalEmployerCharges, totalCompanyCost, inssValue, irrfValue, fgtsValue,
              taxBreakdown, benefitBreakdown, eventBreakdown
          };
      });

      return { payroll: livePayroll, isClosed: false };
  };

  const closePayroll = async (month: number, year: number) => {
      if (!tenantId) return;
      const { payroll, isClosed } = await getPayroll(month, year);
      if (isClosed) throw new Error("Esta folha já está fechada.");

      const totalCost = payroll.reduce((acc, p) => acc + p.totalCompanyCost, 0);
      const totalNet = payroll.reduce((acc, p) => acc + p.netTotal, 0);
      const userName = authState.currentUser?.name || 'Admin';

      const { data: closedHeader, error: headerError } = await supabase.from('rh_closed_payrolls').insert({
          tenant_id: tenantId, month, year,
          total_cost: totalCost, total_net: totalNet, employee_count: payroll.length,
          status: 'CLOSED', closed_by: userName
      }).select().single();

      if (headerError) throw headerError;

      const itemsToInsert = payroll.map(p => ({
          payroll_id: closedHeader.id,
          tenant_id: tenantId,
          staff_id: p.staffId,
          staff_name: p.staffName,
          base_salary: p.baseSalary,
          gross_total: p.grossTotal,
          net_total: p.netTotal,
          total_discounts: p.discounts,
          details: { 
              overtime50: p.overtime50,
              overtime100: p.overtime100,
              nightShiftAdd: p.nightShiftAdd,
              benefits: p.benefits,
              eventsValue: p.eventsValue,
              advances: p.advances,
              employerCharges: p.employerCharges,
              totalCompanyCost: p.totalCompanyCost,
              hoursWorked: p.hoursWorked,
              bankOfHoursBalance: p.bankOfHoursBalance,
              inssValue: p.inssValue,
              irrfValue: p.irrfValue,
              fgtsValue: p.fgtsValue,
              taxBreakdown: p.taxBreakdown,
              benefitBreakdown: p.benefitBreakdown,
              eventBreakdown: p.eventBreakdown
          }
      }));

      const { error: itemsError } = await supabase.from('rh_closed_payroll_items').insert(itemsToInsert);
      if (itemsError) {
          await supabase.from('rh_closed_payrolls').delete().eq('id', closedHeader.id);
          throw itemsError;
      }
      
      // Atualizar Saldo de Banco de Horas no Staff
      // (Opcional: Zerar se pagou ou acumular)
      // Neste modelo simples, estamos pagando tudo como hora extra na folha, então não acumulamos.
      // Se quiser acumular, precisaria de lógica de "Compensar vs Pagar".
  };

  const reopenPayroll = async (month: number, year: number) => {
      if (!tenantId) return;
      const { data: closedPayroll } = await supabase.from('rh_closed_payrolls')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle();

      if (!closedPayroll) throw new Error("Esta folha não está fechada.");

      // Excluir os itens e o cabeçalho
      await supabase.from('rh_closed_payroll_items').delete().eq('payroll_id', closedPayroll.id);
      await supabase.from('rh_closed_payrolls').delete().eq('id', closedPayroll.id);
      
      await logAudit(tenantId, currentUser?.id || '', currentUser?.name || '', 'HR', 'Reabertura de Folha', { month, year });
  };

  return (
    <StaffContext.Provider value={{ 
        state, addUser, updateUser, deleteUser,
        addRole, updateRole, deleteRole,
        addHrJobRole, updateHrJobRole, deleteHrJobRole,
        addShift, deleteShift, registerTime, getPayroll, closePayroll, reopenPayroll,
        addTimeEntry, updateTimeEntry, fetchData,
        saveLegalSettings, saveInssBrackets, saveIrrfBrackets, applyLegalDefaults,
        addTax, deleteTax, applyRegimeDefaults,
        addBenefit, deleteBenefit,
        addPayrollEvent, updatePayrollEvent, deletePayrollEvent, addPayrollEntry,
        addRecurringEvent, updateRecurringEvent, deleteRecurringEvent, generateRecurringEventsForMonth
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
