
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Transaction, CashSession, CashMovement, Expense } from '../types';
import { supabase } from '../lib/supabase';
import { useRestaurant } from './RestaurantContext';
import { useUI } from './UIContext';
import { useAuth } from './AuthProvider';

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
  updateExpense: (expense: Expense) => Promise<void>;
  payExpense: (expenseId: string) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  voidTransaction: (transactionId: string, adminPin: string) => Promise<void>; 
  refreshTransactions: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state: restaurantState } = useRestaurant();
  const { state: authState } = useAuth();
  const { tenantId } = restaurantState;
  const { showAlert } = useUI();

  const [state, setState] = useState<FinanceState>({
    transactions: [],
    expenses: [],
    activeCashSession: null,
    cashMovements: []
  });

  // 1. Busca APENAS Transações e Despesas (Não afeta o status do caixa)
  const fetchFinancialData = useCallback(async () => {
      if (!tenantId) return;
      
      const [transRes, expRes] = await Promise.all([
          supabase.from('transactions').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(200),
          supabase.from('expenses').select('*').eq('tenant_id', tenantId).order('due_date', { ascending: true }),
      ]);

      const mappedTransactions = (transRes.data || []).map((t: any) => ({
          id: t.id, 
          tableId: t.table_id || '', 
          tableNumber: t.table_number || 0, 
          amount: t.amount,
          method: t.method, 
          timestamp: new Date(t.created_at), 
          itemsSummary: t.items_summary || '', 
          cashierName: t.cashier_name || '',
          status: t.status || 'COMPLETED'
      }));

      const mappedExpenses = (expRes.data || []).map((e: any) => ({
          id: e.id, description: e.description, amount: e.amount, category: e.category, dueDate: new Date(e.due_date),
          paidDate: e.paid_date ? new Date(e.paid_date) : undefined, isPaid: e.is_paid, supplierId: e.supplier_id,
          isRecurring: e.is_recurring, paymentMethod: e.payment_method
      }));

      setState(prev => ({ 
          ...prev, 
          transactions: mappedTransactions, 
          expenses: mappedExpenses
      }));
  }, [tenantId]);

  // 2. Busca APENAS a Sessão do Usuário (Rodado na inicialização ou login)
  const fetchSessionData = useCallback(async () => {
      if (!tenantId) return;

      // CORREÇÃO DE LÓGICA:
      // Busca QUALQUER sessão aberta para este restaurante.
      // Removemos o filtro .eq('operator_name', ...) para evitar que o caixa feche 
      // se o nome do usuário mudar ou se a sessão for recarregada.
      const { data: sessionData } = await supabase.from('cash_sessions')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('status', 'OPEN')
          .order('opened_at', { ascending: false }) // Pega o mais recente aberto
          .limit(1)
          .maybeSingle();

      if (sessionData) {
          const activeSession = {
              id: sessionData.id, 
              openedAt: new Date(sessionData.opened_at),
              initialAmount: sessionData.initial_amount, 
              status: sessionData.status, 
              operatorName: sessionData.operator_name
          };

          const { data: moveData } = await supabase.from('cash_movements').select('*').eq('session_id', activeSession.id);
          const movements = (moveData || []).map((m: any) => ({
              id: m.id, sessionId: m.session_id, type: m.type, amount: m.amount, reason: m.reason, timestamp: new Date(m.created_at), userName: m.user_name
          }));

          setState(prev => ({ ...prev, activeCashSession: activeSession, cashMovements: movements }));
      } else {
          // Se não achar sessão aberta, garante que o estado reflita isso
          setState(prev => ({ ...prev, activeCashSession: null, cashMovements: [] }));
      }
  }, [tenantId]);

  // Efeito Inicial: Carrega tudo
  useEffect(() => {
      if (!tenantId) return;
      fetchFinancialData();
      fetchSessionData();
  }, [tenantId, fetchFinancialData, fetchSessionData]);

  // Efeito Realtime: Segregado para evitar fechar o caixa acidentalmente
  useEffect(() => {
      if (!tenantId) return;

      const channel = supabase.channel(`finance_ctx:${tenantId}`)
          // A. Transações e Despesas: Atualizam apenas as listas, SEM TOCAR NA SESSÃO
          .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `tenant_id=eq.${tenantId}` }, fetchFinancialData)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `tenant_id=eq.${tenantId}` }, fetchFinancialData)
          
          // B. Movimentações: Atualizam apenas se houver sessão ativa
          .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_movements', filter: `tenant_id=eq.${tenantId}` }, async () => {
               // Recarrega movimentos da sessão atual se existir
               if (state.activeCashSession) {
                   const { data: moveData } = await supabase.from('cash_movements').select('*').eq('session_id', state.activeCashSession.id);
                   if (moveData) {
                       const movements = moveData.map((m: any) => ({
                           id: m.id, sessionId: m.session_id, type: m.type, amount: m.amount, reason: m.reason, timestamp: new Date(m.created_at), userName: m.user_name
                       }));
                       setState(prev => ({ ...prev, cashMovements: movements }));
                   }
               }
          })
          
          // C. Sessões: Lógica específica para abrir/fechar via evento
          .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_sessions', filter: `tenant_id=eq.${tenantId}` }, (payload) => {
              // CORREÇÃO: Removemos a checagem de owner. Se alguém abrir/fechar o caixa, reflete para todos.
              
              if (payload.eventType === 'INSERT') {
                  const newSession = payload.new;
                  if (newSession.status === 'OPEN') {
                      setState(prev => ({
                          ...prev,
                          activeCashSession: {
                              id: newSession.id,
                              openedAt: new Date(newSession.opened_at),
                              initialAmount: newSession.initial_amount,
                              status: 'OPEN',
                              operatorName: newSession.operator_name
                          },
                          cashMovements: []
                      }));
                  }
              } else if (payload.eventType === 'UPDATE') {
                  const updatedSession = payload.new;
                  if (updatedSession.status === 'CLOSED') {
                      setState(prev => ({ ...prev, activeCashSession: null, cashMovements: [] }));
                  }
              }
          })
          .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, [tenantId, fetchFinancialData, state.activeCashSession]);

  const openRegister = async (initialAmount: number, operatorName: string) => {
      if(!tenantId) throw new Error("Restaurante não identificado");
      
      const { data, error } = await supabase.from('cash_sessions').insert({ 
          tenant_id: tenantId, 
          initial_amount: initialAmount, 
          status: 'OPEN', 
          operator_name: operatorName 
      }).select().single();

      if (error) {
          console.error("Erro ao abrir caixa:", error);
          throw new Error(error.message);
      }
      
      // Atualização Otimista
      if (data) {
          setState(prev => ({
              ...prev,
              activeCashSession: {
                  id: data.id,
                  openedAt: new Date(data.opened_at),
                  initialAmount: data.initial_amount,
                  status: 'OPEN',
                  operatorName: data.operator_name
              },
              cashMovements: []
          }));
      }
  };

  const closeRegister = async (finalAmount: number) => {
      if(!tenantId || !state.activeCashSession) return;
      
      const { error } = await supabase.rpc('close_cash_session', { 
          p_session_id: state.activeCashSession.id, 
          p_final_amount: finalAmount 
      });
      
      if(error) {
          console.error("Erro ao fechar caixa:", error);
          throw new Error(error.message);
      }
      
      // Limpeza imediata local
      setState(prev => ({ ...prev, activeCashSession: null, cashMovements: [] }));
  };

  const bleedRegister = async (amount: number, reason: string, userName: string) => {
      if(!tenantId || !state.activeCashSession) return;
      
      const { error } = await supabase.from('cash_movements').insert({ 
          tenant_id: tenantId, 
          session_id: state.activeCashSession.id, 
          type: 'BLEED', 
          amount, 
          reason, 
          user_name: userName 
      });

      if(error) throw error;
      // Fetch data não necessário pois o realtime captura
  };

  const addExpense = async (expense: Expense) => {
      if(!tenantId) return;
      
      const dueDateStr = expense.dueDate instanceof Date 
        ? expense.dueDate.toISOString().split('T')[0] 
        : expense.dueDate;

      let paidDateVal = null;
      if (expense.isPaid) {
          paidDateVal = expense.paidDate 
            ? (expense.paidDate instanceof Date ? expense.paidDate.toISOString().split('T')[0] : expense.paidDate)
            : new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase.from('expenses').insert({ 
          tenant_id: tenantId, 
          description: expense.description, 
          amount: expense.amount, 
          category: expense.category, 
          due_date: dueDateStr, 
          paid_date: paidDateVal,
          is_paid: expense.isPaid,
          is_recurring: expense.isRecurring,
          payment_method: expense.paymentMethod,
          supplier_id: expense.supplierId || null
      });
      
      if (error) throw error;
  };

  const updateExpense = async (expense: Expense) => {
      if(!tenantId || !expense.id) return;

      const dueDateStr = expense.dueDate instanceof Date 
        ? expense.dueDate.toISOString().split('T')[0] 
        : expense.dueDate;

      let paidDateVal = null;
      if (expense.isPaid) {
          paidDateVal = expense.paidDate 
            ? (expense.paidDate instanceof Date ? expense.paidDate.toISOString().split('T')[0] : expense.paidDate)
            : new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase.from('expenses').update({ 
          description: expense.description, 
          amount: expense.amount, 
          category: expense.category, 
          due_date: dueDateStr, 
          paid_date: paidDateVal,
          is_paid: expense.isPaid,
          is_recurring: expense.isRecurring,
          payment_method: expense.paymentMethod,
          supplier_id: expense.supplierId || null
      }).eq('id', expense.id);
      
      if (error) throw error;
  };

  const payExpense = async (expenseId: string) => {
      const { error } = await supabase.from('expenses').update({ 
          is_paid: true, 
          paid_date: new Date().toISOString().split('T')[0] 
      }).eq('id', expenseId);
      
      if (error) throw error;
  };

  const deleteExpense = async (expenseId: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
      if (error) throw error;
  };

  const voidTransaction = async (transactionId: string, adminPin: string) => {
      if (!tenantId) return;
      
      const correctPin = restaurantState.businessInfo?.adminPin;
      if (!correctPin) throw new Error("Senha mestra não configurada nas Configurações.");
      if (adminPin !== correctPin) throw new Error("Senha incorreta.");

      const { data: transaction } = await supabase.from('transactions').select('order_id, status').eq('id', transactionId).single();
      
      if (!transaction) throw new Error("Transação não encontrada.");
      if (transaction.status === 'CANCELLED') throw new Error("Transação já cancelada.");

      if (transaction.order_id) {
          const { data: items } = await supabase.from('order_items').select('product_id, quantity').eq('order_id', transaction.order_id);
          
          if (items && items.length > 0) {
              for (const item of items) {
                  const { data: prod } = await supabase.from('products').select('linked_inventory_item_id').eq('id', item.product_id).single();
                  
                  if (prod && prod.linked_inventory_item_id) {
                      const invId = prod.linked_inventory_item_id;
                      const { data: invItem } = await supabase.from('inventory_items').select('id, type, quantity').eq('id', invId).single();

                      if (invItem) {
                          if (invItem.type === 'COMPOSITE') {
                              const { data: recipe } = await supabase.from('inventory_recipes').select('*').eq('parent_item_id', invItem.id);
                              if (recipe) {
                                  for (const step of recipe) {
                                      const { data: ing } = await supabase.from('inventory_items').select('quantity').eq('id', step.ingredient_item_id).single();
                                      if (ing) {
                                          const restoreQty = step.quantity * item.quantity;
                                          const newQty = ing.quantity + restoreQty;
                                          await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', step.ingredient_item_id);
                                          await supabase.from('inventory_logs').insert({
                                              tenant_id: tenantId, item_id: step.ingredient_item_id, type: 'IN', quantity: restoreQty, 
                                              reason: `Estorno Cancelamento (Pedido #${transaction.order_id.slice(0,4)})`, user_name: 'Admin'
                                          });
                                      }
                                  }
                              }
                          } else {
                              const restoreQty = item.quantity;
                              const newQty = invItem.quantity + restoreQty;
                              await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', invItem.id);
                              await supabase.from('inventory_logs').insert({
                                  tenant_id: tenantId, item_id: invItem.id, type: 'IN', quantity: restoreQty, 
                                  reason: `Estorno Cancelamento (Pedido #${transaction.order_id.slice(0,4)})`, user_name: 'Admin'
                              });
                          }
                      }
                  }
              }
          }
      }

      const { error: transError } = await supabase.from('transactions').update({ status: 'CANCELLED' }).eq('id', transactionId);
      if (transError) throw transError;

      if (transaction.order_id) {
          await supabase.from('orders').update({ status: 'CANCELLED', is_paid: false }).eq('id', transaction.order_id);
          await supabase.from('order_items').update({ status: 'CANCELLED' }).eq('order_id', transaction.order_id);
      }
      
      await fetchFinancialData();
  };

  return (
    <FinanceContext.Provider value={{ state, openRegister, closeRegister, bleedRegister, addExpense, updateExpense, payExpense, deleteExpense, voidTransaction, refreshTransactions: fetchFinancialData }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within a FinanceProvider');
  return context;
};
