
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
  
  // State simplificado, pois os dados já vêm agregados da view
  const [reportData, setReportData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ revenue: 0, expenses: 0, netIncome: 0 });

  const fetchAccountingData = useCallback(async () => {
      if (!state.tenantId) return;
      setLoadingAccounting(true);
      
      try {
          // Consulta direta à VIEW de banco de dados para alta performance
          // Não processa milhares de linhas no frontend
          const { data, error } = await supabase
            .from('view_finance_dre')
            .select('*')
            .eq('tenant_id', state.tenantId)
            .gte('date', accountingDateStart)
            .lte('date', accountingDateEnd)
            .order('date', { ascending: true });

          if (error) throw error;

          if (data) {
              setReportData(data);
              // Soma os totais da view (que já estão agrupados por dia)
              const totalRevenue = data.reduce((acc, row) => acc + (row.revenue || 0), 0);
              const totalExpenses = data.reduce((acc, row) => acc + (row.expenses || 0), 0);
              const totalNet = data.reduce((acc, row) => acc + (row.net_income || 0), 0);
              
              setSummary({ revenue: totalRevenue, expenses: totalExpenses, netIncome: totalNet });
          }

      } catch (error) {
          console.error(error);
          showAlert({ title: "Erro", message: "Falha ao carregar relatório contábil.", type: 'ERROR' });
      } finally {
          setLoadingAccounting(false);
      }
  }, [state.tenantId, accountingDateStart, accountingDateEnd]);

  useEffect(() => { fetchAccountingData(); }, [fetchAccountingData]);

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border gap-4 print:hidden">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">DRE Gerencial</h2>
                <p className="text-sm text-gray-500">Dados consolidados via processamento bancário.</p>
            </div>
            <div className="flex flex-col md:flex-row gap-2 items-end">
                <div><label className="block text-xs font-bold text-gray-500 mb-1">Início</label><input type="date" className="border p-2 rounded text-sm" value={accountingDateStart} onChange={e => setAccountingDateStart(e.target.value)} /></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-1">Fim</label><input type="date" className="border p-2 rounded text-sm" value={accountingDateEnd} onChange={e => setAccountingDateEnd(e.target.value)} /></div>
                <Button onClick={fetchAccountingData} disabled={loadingAccounting} className="h-[38px]">{loadingAccounting ? <Loader2 className="animate-spin" size={16}/> : <RefreshCcw size={16}/>} Atualizar</Button>
                <Button variant="secondary" onClick={() => window.print()} className="h-[38px]"><Printer size={16}/> Imprimir</Button>
            </div>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm border print:border-none print:shadow-none">
            <h1 className="text-3xl font-bold text-center mb-2 print:block hidden">{state.theme.restaurantName} - DRE Sintético</h1>
            <p className="text-center text-gray-500 mb-8 print:block hidden">Período: {new Date(accountingDateStart).toLocaleDateString()} a {new Date(accountingDateEnd).toLocaleDateString()}</p>
            
            <div className="grid grid-cols-3 gap-6 mb-8 text-center">
                <div className="p-4 bg-gray-50 rounded-lg">
                    <span className="block text-gray-500 text-sm uppercase font-bold mb-1">Faturamento</span>
                    <span className="text-2xl font-bold text-green-600">R$ {summary.revenue.toFixed(2)}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                    <span className="block text-gray-500 text-sm uppercase font-bold mb-1">Despesas/Custos</span>
                    <span className="text-2xl font-bold text-red-600">R$ {summary.expenses.toFixed(2)}</span>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <span className="block text-blue-600 text-sm uppercase font-bold mb-1">Resultado Líquido</span>
                    <span className="text-3xl font-bold text-blue-800">R$ {summary.netIncome.toFixed(2)}</span>
                </div>
            </div>

            <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-gray-600 uppercase font-bold">
                        <tr>
                            <th className="p-3">Data</th>
                            <th className="p-3 text-right">Receita (+)</th>
                            <th className="p-3 text-right">Despesas (-)</th>
                            <th className="p-3 text-right">Resultado (=)</th>
                            <th className="p-3 text-center">Transações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {reportData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="p-3">{new Date(row.date).toLocaleDateString()}</td>
                                <td className="p-3 text-right text-green-600 font-medium">R$ {row.revenue.toFixed(2)}</td>
                                <td className="p-3 text-right text-red-600 font-medium">R$ {row.expenses.toFixed(2)}</td>
                                <td className="p-3 text-right font-bold">R$ {row.net_income.toFixed(2)}</td>
                                <td className="p-3 text-center text-gray-500">{row.transactions_count}</td>
                            </tr>
                        ))}
                        {reportData.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">Sem movimentação no período.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};
