import React, { useState, useCallback, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
// Added missing Store and Package icons
import { Loader2, RefreshCcw, Printer, PieChart, TrendingUp, CheckCircle2, ArrowUpRight, AlertCircle, FileText, DollarSign, Store, Package } from 'lucide-react';

export const AdminAccounting: React.FC = () => {
  const { state } = useRestaurant();
  const { showAlert } = useUI();
  
  const [dateStart, setDateStart] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]); 
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  
  const [data, setData] = useState<any>({
      grossRevenue: 0, saloonSales: 0, posSales: 0, taxes: 0, netRevenue: 0,
      cmv: 0, grossProfit: 0, operatingExpenses: 0, expensesByCategory: {},
      ebitda: 0, financialExpenses: 0, netIncome: 0
  });

  const fetchDRE = useCallback(async () => {
      if (!state.tenantId) return;
      setLoading(true);
      
      try {
          const start = dateStart + ' 00:00:00';
          const end = dateEnd + ' 23:59:59';

          // 1. Buscar Transações (Receita)
          const { data: transRes, error: transErr } = await supabase
            .from('transactions')
            .select('*')
            .eq('tenant_id', state.tenantId)
            .gte('created_at', start)
            .lte('created_at', end);

          if (transErr) throw transErr;

          // 2. Buscar Itens de Pedidos Vendidos no período para calcular CMV (Custo Real)
          // Buscamos itens de pedidos que já foram pagos/finalizados
          const { data: itemsRes, error: itemsErr } = await supabase
            .from('order_items')
            .select('quantity, product_price, product_cost_price, orders!inner(is_paid, created_at)')
            .eq('tenant_id', state.tenantId)
            .eq('orders.is_paid', true)
            .gte('orders.created_at', start)
            .lte('orders.created_at', end);

          if (itemsErr) throw itemsErr;

          // 3. Buscar Despesas
          const { data: expsRes, error: expsErr } = await supabase
            .from('expenses')
            .select('*')
            .eq('tenant_id', state.tenantId)
            .gte('due_date', dateStart)
            .lte('due_date', dateEnd);

          if (expsErr) throw expsErr;

          // --- PROCESSAMENTO DOS DADOS ---
          let grossRev = 0, saloonSales = 0, posSales = 0;
          transRes?.forEach((t: any) => {
              const amt = Number(t.amount) || 0;
              grossRev += amt;
              if (t.items_summary?.includes('Mesa')) saloonSales += amt;
              else posSales += amt;
          });

          let cmvTotal = 0;
          itemsRes?.forEach((item: any) => {
              const qty = Number(item.quantity) || 0;
              const cost = Number(item.product_cost_price) || 0;
              cmvTotal += (qty * cost);
          });

          const taxes = grossRev * 0.06; // Simulação fixa 6% Simples Nacional
          const netRevenue = grossRev - taxes;
          const grossProfit = netRevenue - cmvTotal;

          let opExpenses = 0, finExpenses = 0;
          const expByCat: any = {};

          expsRes?.forEach((e: any) => {
              const amt = Number(e.amount) || 0;
              if (['Impostos', 'Taxas Bancárias'].includes(e.category)) {
                  finExpenses += amt;
              } else {
                  opExpenses += amt;
                  expByCat[e.category] = (expByCat[e.category] || 0) + amt;
              }
          });

          const ebitda = grossProfit - opExpenses;
          
          setData({
              grossRevenue: grossRev, saloonSales, posSales, taxes, netRevenue,
              cmv: cmvTotal, grossProfit, operatingExpenses: opExpenses,
              expensesByCategory: expByCat, ebitda, financialExpenses: finExpenses,
              netIncome: ebitda - finExpenses
          });

      } catch (error: any) {
          console.error("DRE Fetch Error:", error);
          showAlert({ title: "Erro no Relatório", message: error.message || "Falha ao processar dados financeiros.", type: 'ERROR' });
      } finally {
          setLoading(false);
      }
  }, [state.tenantId, dateStart, dateEnd, showAlert]);

  useEffect(() => { 
      if (state.tenantId) fetchDRE(); 
  }, [state.tenantId, fetchDRE]);

  const cmvPerc = data.netRevenue > 0 ? (data.cmv / data.netRevenue) * 100 : 0;
  const marginPerc = data.netRevenue > 0 ? (data.grossProfit / data.netRevenue) * 100 : 0;
  const profitPerc = data.grossRevenue > 0 ? (data.netIncome / data.grossRevenue) * 100 : 0;

  const Row = ({ label, value, type = 'normal', indent = false, isNegative = false }: any) => (
    <div className={`flex justify-between py-2.5 ${indent ? 'pl-8' : ''} ${type === 'total' ? 'border-t-2 border-slate-800 font-black text-slate-900 bg-slate-50 mt-2 px-2' : 'border-b border-slate-100 text-slate-600'}`}>
        <span className={type === 'total' ? 'uppercase tracking-tight text-sm' : 'font-medium text-sm'}>{label}</span>
        <span className={`font-mono font-bold ${isNegative ? 'text-red-500' : 'text-slate-800'}`}>
            {isNegative && value > 0 ? '-' : ''} R$ {Math.abs(value).toFixed(2)}
        </span>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        {/* Header de Filtros */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border gap-4 print:hidden">
            <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><PieChart className="text-blue-600"/> DRE Gerencial</h2>
                <p className="text-sm text-gray-500">Lucratividade e Custo de Mercadoria Vendida (CMV)</p>
            </div>
            <div className="flex flex-col md:flex-row gap-2 items-end">
                <div className="flex gap-2 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
                    <input type="date" className="bg-transparent p-1 text-xs font-bold outline-none" value={dateStart} onChange={e => setDateStart(e.target.value)} />
                    <span className="text-gray-400 self-center font-bold">→</span>
                    <input type="date" className="bg-transparent p-1 text-xs font-bold outline-none" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
                </div>
                <div className="flex gap-2">
                    <Button onClick={fetchDRE} disabled={loading} className="h-[42px] px-6">
                        {loading ? <Loader2 className="animate-spin" size={18}/> : <RefreshCcw size={18}/>} 
                        <span className="ml-2">Atualizar</span>
                    </Button>
                    <Button variant="secondary" onClick={() => window.print()} className="h-[42px] bg-white border-gray-200"><Printer size={18}/></Button>
                </div>
            </div>
        </div>

        {/* Cards de Indicadores de Saúde */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`p-6 rounded-2xl border-2 bg-white shadow-sm flex flex-col ${cmvPerc > 35 ? 'border-red-200 bg-red-50/30' : 'border-emerald-200 bg-emerald-50/30'}`}>
                <div className="flex justify-between items-start mb-2">
                    <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">CMV (Meta: 35%)</span>
                    {cmvPerc > 35 ? <ArrowUpRight className="text-red-500" /> : <CheckCircle2 className="text-emerald-500" />}
                </div>
                <div className="text-4xl font-black text-slate-800">{cmvPerc.toFixed(1)}%</div>
                <div className="mt-3 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${cmvPerc > 35 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(cmvPerc, 100)}%` }}></div>
                </div>
            </div>

            <div className="p-6 rounded-2xl border-2 bg-white shadow-sm flex flex-col border-blue-200 bg-blue-50/30">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Margem de Contribuição</span>
                    <TrendingUp className="text-blue-500" />
                </div>
                <div className="text-4xl font-black text-slate-800">{marginPerc.toFixed(1)}%</div>
                <p className="text-[10px] text-blue-600 mt-2 font-bold uppercase">Ideal acima de 30%</p>
            </div>

            <div className={`p-6 rounded-2xl border-2 bg-white shadow-sm flex flex-col ${profitPerc < 10 ? 'border-orange-200 bg-orange-50/30' : 'border-emerald-200 bg-emerald-50/30'}`}>
                <div className="flex justify-between items-start mb-2">
                    <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Lucro Líquido Final</span>
                    {profitPerc < 10 ? <AlertCircle className="text-orange-500" /> : <TrendingUp className="text-emerald-500" />}
                </div>
                <div className="text-4xl font-black text-slate-800">{profitPerc.toFixed(1)}%</div>
                <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase">Meta de Mercado: 10 a 15%</p>
            </div>
        </div>

        {/* O DRE Propriamente Dito */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-200 overflow-hidden print:border-none print:shadow-none">
            <div className="bg-slate-900 p-10 text-white flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase mb-1">Demonstrativo de Resultado</h1>
                    <p className="text-blue-400 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                        {/* Fixed missing Store icon */}
                        <Store size={16}/> {state.theme.restaurantName}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-slate-500 text-[10px] font-black uppercase mb-1">Período Consolidado</p>
                    <p className="text-lg font-mono font-bold bg-white/10 px-3 py-1 rounded-lg">
                        {new Date(dateStart).toLocaleDateString()} — {new Date(dateEnd).toLocaleDateString()}
                    </p>
                </div>
            </div>

            <div className="p-10 max-w-4xl mx-auto">
                {/* Fixed undefined variable grossRev to data.grossRevenue */}
                {data.grossRevenue === 0 && !loading && (
                    <div className="bg-yellow-50 border-2 border-yellow-100 p-8 rounded-3xl text-center mb-10">
                        <AlertCircle className="mx-auto text-yellow-500 mb-4" size={48}/>
                        <h3 className="text-lg font-bold text-yellow-800">Sem dados para este período</h3>
                        <p className="text-yellow-700 text-sm">Verifique se existem vendas finalizadas e despesas cadastradas no intervalo selecionado.</p>
                    </div>
                )}

                <div className="space-y-1">
                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <DollarSign size={14}/> 1. Receita e Deduções
                    </h3>
                    <Row label="(+) Receita Bruta de Vendas" value={data.grossRevenue} />
                    <Row label="    Vendas Mesas / Salão" value={data.saloonSales} indent />
                    <Row label="    Vendas Balcão / PDV" value={data.posSales} indent />
                    <Row label="(-) Impostos s/ Faturamento (Est.)" value={data.taxes} isNegative />
                    <Row label="(=) RECEITA LÍQUIDA" value={data.netRevenue} type="total" />

                    <h3 className="text-xs font-black text-orange-600 uppercase tracking-widest mb-4 mt-12 flex items-center gap-2">
                        {/* Fixed missing Package icon */}
                        <Package size={14}/> 2. Custos de Produção (CMV)
                    </h3>
                    <Row label="(-) Custo de Mercadoria Vendida (Estoque)" value={data.cmv} isNegative />
                    <Row label="(=) LUCRO BRUTO" value={data.grossProfit} type="total" />

                    <h3 className="text-xs font-black text-purple-600 uppercase tracking-widest mb-4 mt-12 flex items-center gap-2">
                        <FileText size={14}/> 3. Despesas Operacionais
                    </h3>
                    {Object.entries(data.expensesByCategory).map(([cat, val]: any) => (
                        <Row key={cat} label={`(-) ${cat}`} value={val} indent isNegative />
                    ))}
                    {Object.keys(data.expensesByCategory).length === 0 && (
                        <p className="text-[10px] text-gray-400 italic pl-8 py-2">Nenhuma despesa operacional cadastrada.</p>
                    )}
                    <Row label="(=) EBITDA (Resultado Operacional)" value={data.ebitda} type="total" />

                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 mt-12 flex items-center gap-2">
                        <TrendingUp size={14}/> 4. Resultado Financeiro e Final
                    </h3>
                    <Row label="(-) Taxas Bancárias / Despesas Fin." value={data.financialExpenses} isNegative />
                    <Row label="(=) LUCRO LÍQUIDO FINAL" value={data.netIncome} type="total" />
                </div>

                {/* Resumo Visual de Encerramento */}
                <div className={`mt-16 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between border-4 transition-all
                    ${data.netIncome >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="text-center md:text-left mb-6 md:mb-0">
                        <h4 className={`text-2xl font-black uppercase tracking-tighter ${data.netIncome >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                            {data.netIncome >= 0 ? 'Resultado Positivo' : 'Resultado Negativo'}
                        </h4>
                        <p className="text-slate-500 font-medium">Lucro real apurado após todas as baixas e deduções.</p>
                    </div>
                    <div className="text-center md:text-right">
                        <div className={`text-5xl font-black ${data.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            R$ {data.netIncome.toFixed(2)}
                        </div>
                        <div className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Saldo Final Consolidado</div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 p-6 text-center border-t border-gray-100">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">
                    Relatório Gerencial Interno • Gerado via GastroFlow • {new Date().toLocaleString()}
                </p>
            </div>
        </div>
    </div>
  );
};
