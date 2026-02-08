import React, { useState, useCallback, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { Loader2, RefreshCcw, Printer } from 'lucide-react';

export const AdminAccounting: React.FC = () => {
  const { state } = useRestaurant();
  const { showAlert } = useUI();
  
  const [accountingDateStart, setAccountingDateStart] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]); 
  const [accountingDateEnd, setAccountingDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [loadingAccounting, setLoadingAccounting] = useState(false);
  const [accountingData, setAccountingData] = useState<any>({ 
      revenue: 0, expenses: 0, netIncome: 0, byMethod: {}, expensesByCategory: {}, transactionsCount: 0 
  });

  const fetchAccountingData = useCallback(async () => {
      if (!state.tenantId) return;
      setLoadingAccounting(true);
      
      const start = accountingDateStart + ' 00:00:00';
      const end = accountingDateEnd + ' 23:59:59';

      try {
          const { data: trans } = await supabase.from('transactions').select('*').eq('tenant_id', state.tenantId).gte('created_at', start).lte('created_at', end);
          const { data: exps } = await supabase.from('expenses').select('*').eq('tenant_id', state.tenantId).gte('due_date', accountingDateStart).lte('due_date', accountingDateEnd);

          const revenue = trans?.reduce((acc, t) => acc + t.amount, 0) || 0;
          const expensesTotal = exps?.reduce((acc, e) => acc + e.amount, 0) || 0;
          
          const byMethod: any = {};
          trans?.forEach(t => { byMethod[t.method] = (byMethod[t.method] || 0) + t.amount; });

          const expByCat: any = {};
          exps?.forEach(e => { expByCat[e.category] = (expByCat[e.category] || 0) + e.amount; });

          setAccountingData({
              revenue,
              expenses: expensesTotal,
              netIncome: revenue - expensesTotal,
              byMethod,
              expensesByCategory: expByCat,
              transactionsCount: trans?.length || 0,
          });

      } catch (error) {
          console.error(error);
          showAlert({ title: "Erro", message: "Falha ao carregar dados.", type: 'ERROR' });
      } finally {
          setLoadingAccounting(false);
      }
  }, [state.tenantId, accountingDateStart, accountingDateEnd]);

  useEffect(() => { fetchAccountingData(); }, [fetchAccountingData]);

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border gap-4 print:hidden">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Relatório Contábil (DRE)</h2>
                <p className="text-sm text-gray-500">Extrato financeiro para contabilidade e gestão.</p>
            </div>
            <div className="flex flex-col md:flex-row gap-2 items-end">
                <div><label className="block text-xs font-bold text-gray-500 mb-1">Início</label><input type="date" className="border p-2 rounded text-sm" value={accountingDateStart} onChange={e => setAccountingDateStart(e.target.value)} /></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-1">Fim</label><input type="date" className="border p-2 rounded text-sm" value={accountingDateEnd} onChange={e => setAccountingDateEnd(e.target.value)} /></div>
                <Button onClick={fetchAccountingData} disabled={loadingAccounting} className="h-[38px]">{loadingAccounting ? <Loader2 className="animate-spin" size={16}/> : <RefreshCcw size={16}/>} Atualizar</Button>
                <Button variant="secondary" onClick={() => window.print()} className="h-[38px]"><Printer size={16}/> Imprimir</Button>
            </div>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm border print:border-none print:shadow-none">
            <h1 className="text-3xl font-bold text-center mb-2 print:block hidden">{state.theme.restaurantName} - Relatório Financeiro</h1>
            <p className="text-center text-gray-500 mb-8 print:block hidden">Período: {new Date(accountingDateStart).toLocaleDateString()} a {new Date(accountingDateEnd).toLocaleDateString()}</p>
            
            <div className="grid grid-cols-3 gap-6 mb-8 text-center">
                <div className="p-4 bg-gray-50 rounded-lg">
                    <span className="block text-gray-500 text-sm uppercase font-bold mb-1">Receita Bruta</span>
                    <span className="text-2xl font-bold text-green-600">R$ {accountingData.revenue.toFixed(2)}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                    <span className="block text-gray-500 text-sm uppercase font-bold mb-1">Despesas</span>
                    <span className="text-2xl font-bold text-red-600">R$ {accountingData.expenses.toFixed(2)}</span>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <span className="block text-blue-600 text-sm uppercase font-bold mb-1">Lucro Líquido</span>
                    <span className="text-3xl font-bold text-blue-800">R$ {accountingData.netIncome.toFixed(2)}</span>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div>
                    <h3 className="font-bold border-b pb-2 mb-4 text-gray-800">Receita por Método</h3>
                    <ul className="space-y-3">
                        {Object.entries(accountingData.byMethod).map(([method, amount]: any) => (
                            <li key={method} className="flex justify-between items-center text-sm">
                                <span className="bg-gray-100 px-2 py-1 rounded text-gray-700 font-medium">{method}</span>
                                <span className="font-mono font-bold text-gray-800">R$ {amount.toFixed(2)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold border-b pb-2 mb-4 text-gray-800">Despesas por Categoria</h3>
                    <ul className="space-y-3">
                        {Object.entries(accountingData.expensesByCategory).map(([cat, amount]: any) => (
                            <li key={cat} className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">{cat}</span>
                                <span className="font-mono font-bold text-red-600">- R$ {amount.toFixed(2)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    </div>
  );
};