
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Transaction, CashSession, CashMovement, Expense } from '../types';
import { supabase } from '../lib/supabase';
import { useRestaurant } from './RestaurantContext';
import { useUI } from './UIContext';

interface FinanceState {
  transactions: Transaction[];
  expenses: Expense[];
  activeCashSession: CashSession | null;
  cashMovements: CashMovement[];
}

interface FinanceContextType {
  state: FinanceState;
  openRegister: (initialAmount: number, operatorName: string) => Promise<void>;
  closeRegister: (finalAmount: number) => Promise<void>;
  bleedRegister: (amount: number, reason: string, userName: string) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  payExpense: (expenseId: string) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  refreshTransactions: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state: restaurantState } = useRestaurant();
  const { tenantId } = restaurantState;
  const { showAlert } = useUI();

  const [state, setState] = useState<FinanceState>({
    transactions: [],
    expenses: [],
    activeCashSession: null,
    cashMovements: []
  });

  const fetchData = async () => {
      if (!tenantId) return;
      
      // Fetching more transactions for better dashboard overview (last 500 instead of 50)
      const [transRes, expRes, sessionRes] = await Promise.all([
          supabase.from('transactions').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(200),
          supabase.from('expenses').select('*').eq('tenant_id', tenantId).order('due_date', { ascending: true }),
          supabase.from('cash_sessions').select('*').eq('tenant_id', tenantId).eq('status', 'OPEN').maybeSingle()
      ]);

      const mappedTransactions = (transRes.data || []).map((t: any) => ({
          id: t.id, tableId: t.table_id || '', tableNumber: t.table_number || 0, amount: t.amount,
          method: t.method, timestamp: new Date(t.created_at), itemsSummary: t.items_summary || '', cashierName: t.cashier_name || ''
      }));

      const mappedExpenses = (expRes.data || []).map((e: any) => ({
          id: e.id, description: e.description, amount: e.amount, category: e.category, dueDate: new Date(e.due_date),
          paidDate: e.paid_date ? new Date(e.paid_date) : undefined, isPaid: e.is_paid, supplierId: e.supplier_id,
          isRecurring: e.is_recurring, paymentMethod: e.payment_method
      }));

      let activeSession = null;
      let movements: CashMovement[] = [];

      if (sessionRes.data) {
          activeSession = {
              id: sessionRes.data.id, openedAt: new Date(sessionRes.data.opened_at),
              initialAmount: sessionRes.data.initial_amount, status: sessionRes.data.status, operatorName: sessionRes.data.operator_name
          };
          const { data: moveData } = await supabase.from('cash_movements').select('*').eq('session_id', activeSession.id);
          if (moveData) {
              movements = moveData.map((m: any) => ({
                  id: m.id, sessionId: m.session_id, type: m.type, amount: m.amount, reason: m.reason, timestamp: new Date(m.created_at), userName: m.user_name
              }));
          }
      }

      setState({ transactions: mappedTransactions, expenses: mappedExpenses, activeCashSession: activeSession, cashMovements: movements });
  };

  useEffect(() => {
      fetchData();
      if (!tenantId) return;
      const channel = supabase.channel(`finance_ctx:${tenantId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `tenant_id=eq.${tenantId}` }, fetchData)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `tenant_id=eq.${tenantId}` }, fetchData)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_sessions', filter: `tenant_id=eq.${tenantId}` }, fetchData)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_movements', filter: `tenant_id=eq.${tenantId}` }, fetchData)
          .subscribe();
      return () => { supabase.removeChannel(channel); };
  }, [tenantId]);

  const openRegister = async (initialAmount: number, operatorName: string) => {
      if(!tenantId) return;
      await supabase.from('cash_sessions').insert({ tenant_id: tenantId, initial_amount: initialAmount, status: 'OPEN', operator_name: operatorName });
      await fetchData();
  };

  const closeRegister = async (finalAmount: number) => {
      if(!tenantId || !state.activeCashSession) return;
      const { error } = await supabase.rpc('close_cash_session', { p_session_id: state.activeCashSession.id, p_final_amount: finalAmount });
      if(error) {
          console.error(error);
          throw error;
      }
      await fetchData();
  };

  const bleedRegister = async (amount: number, reason: string, userName: string) => {
      if(!tenantId || !state.activeCashSession) return;
      await supabase.from('cash_movements').insert({ tenant_id: tenantId, session_id: state.activeCashSession.id, type: 'BLEED', amount, reason, user_name: userName });
      await fetchData();
  };

  const addExpense = async (expense: Expense) => {
      if(!tenantId) return;
      const { error } = await supabase.from('expenses').insert({ 
          tenant_id: tenantId, 
          description: expense.description, 
          amount: expense.amount, 
          category: expense.category, 
          due_date: expense.dueDate, 
          is_paid: expense.isPaid,
          is_recurring: expense.isRecurring,
          payment_method: expense.paymentMethod
      });
      
      if (error) {
          console.error("Error adding expense:", error);
          throw error;
      }
      
      await fetchData();
  };

  const payExpense = async (expenseId: string) => {
      const { error } = await supabase.from('expenses').update({ is_paid: true, paid_date: new Date() }).eq('id', expenseId);
      if (error) throw error;
      await fetchData();
  };

  const deleteExpense = async (expenseId: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
      if (error) throw error;
      await fetchData();
  };

  return (
    <FinanceContext.Provider value={{ state, openRegister, closeRegister, bleedRegister, addExpense, payExpense, deleteExpense, refreshTransactions: fetchData }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within a FinanceProvider');
  return context;
};
