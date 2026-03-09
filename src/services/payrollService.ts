import { supabase } from '../core/api/supabaseClient';
import { ThirteenthPayment, VacationSchedule, Termination, PayrollPreview, ClosedPayroll } from '../types';

export const payrollService = {
    async calculateThirteenth(staffId: string, year: number, installment: 1 | 2): Promise<ThirteenthPayment> {
        const { data, error } = await supabase.rpc('calculate_thirteenth', {
            p_staff_id: staffId,
            p_year: year,
            p_installment: installment
        });
        if (error) throw error;
        return data as ThirteenthPayment;
    },

    async calculateVacation(staffId: string, startDate: Date, days: number, soldDays: number): Promise<VacationSchedule> {
        const { data, error } = await supabase.rpc('calculate_vacation', {
            p_staff_id: staffId,
            p_start_date: startDate.toISOString(),
            p_days: days,
            p_sold_days: soldDays
        });
        if (error) throw error;
        return {
            ...data,
            startDate: new Date(data.start_date),
            endDate: new Date(data.end_date),
            paymentDate: data.payment_date ? new Date(data.payment_date) : undefined
        } as VacationSchedule;
    },

    async calculateTermination(staffId: string, date: Date, reason: string, noticeType: string): Promise<Termination> {
        const { data, error } = await supabase.rpc('calculate_termination', {
            p_staff_id: staffId,
            p_date: date.toISOString(),
            p_reason: reason,
            p_notice_type: noticeType
        });
        if (error) throw error;
        return {
            ...data,
            terminationDate: new Date(data.termination_date)
        } as Termination;
    },

    async getPayrollPreview(month: number, year: number): Promise<{ payroll: PayrollPreview[], isClosed: boolean, closedInfo?: ClosedPayroll }> {
        const { data, error } = await supabase.rpc('get_payroll_preview', {
            p_month: month,
            p_year: year
        });
        if (error) throw error;
        
        // Map snake_case to camelCase if necessary, or ensure RPC returns camelCase
        // Assuming RPC returns snake_case matching the types but let's be safe
        // Actually, the types in frontend are camelCase. The RPC usually returns snake_case.
        // I should map it here.
        
        const payroll = (data.payroll || []).map((p: any) => ({
            staffId: p.staff_id,
            staffName: p.staff_name,
            baseSalary: p.base_salary,
            overtime50: p.overtime_50,
            overtime100: p.overtime_100,
            nightShiftAdd: p.night_shift_add,
            bankOfHoursBalance: p.bank_hours_balance,
            absencesTotal: p.absences_total,
            addictionals: p.addictionals,
            eventsValue: p.events_value,
            benefits: p.benefits,
            grossTotal: p.gross_total,
            discounts: p.discounts,
            advances: p.advances,
            netTotal: p.net_total,
            hoursWorked: p.hours_worked,
            employerCharges: p.employer_charges,
            totalCompanyCost: p.total_company_cost,
            inssValue: p.inss_value,
            irrfValue: p.irrf_value,
            fgtsValue: p.fgts_value,
            taxBreakdown: p.tax_breakdown || [],
            benefitBreakdown: p.benefit_breakdown || [],
            eventBreakdown: p.event_breakdown || []
        }));

        const closedInfo = data.closed_info ? {
            id: data.closed_info.id,
            month: data.closed_info.month,
            year: data.closed_info.year,
            totalCost: data.closed_info.total_cost,
            totalNet: data.closed_info.total_net,
            employeeCount: data.closed_info.employee_count,
            closedAt: new Date(data.closed_info.closed_at),
            closedBy: data.closed_info.closed_by,
            expenseId: data.closed_info.expense_id,
            isPaid: data.closed_info.is_paid,
            esocialSent: data.closed_info.esocial_sent
        } : undefined;

        return {
            payroll,
            isClosed: data.is_closed,
            closedInfo
        };
    }
};
