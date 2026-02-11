import React, { useState, useCallback, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { Loader2, RefreshCcw, Printer, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, PieChart, DollarSign, ArrowDownRight, ArrowUpRight } from 'lucide-react';

export const AdminAccounting: React.FC = () => {
  const { state } = useRestaurant();
  const { showAlert } = useUI();
  
  const [dateStart, setDateStart] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]); 
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  
  const [data, setData] = useState<any>({
      grossRevenue: 0,
      taxes: 0,
      netRevenue: 0,
      cmv: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      expensesByCategory: {},
      ebitda: 0,
      financialExpenses: 0,
      netIncome: 0,
      saloonSales: 0,
      posSales: 0
  });

  const fetchDRE = useCallback(async () => {
      if (!state.tenantId) return;
      setLoading(true);
      
      try {
          const start = dateStart + ' 00:00:00';
          const end = dateEnd + ' 23:59:59';

          // 1. Buscar Transações (Receita e CMV)
          const { data: transactions } = await supabase
            .from('transactions')
            .select(`*, orders ( items:order_items ( quantity, product_price, product_cost_price ) )`)
            .eq('tenant_id', state.tenantId)
            .gte('created_at', start)
            .lte('created_at', end);

          // 2. Buscar Despesas
          const { data: expenses } = await supabase
            .from('expenses')
            .select('*')
            .eq('tenant_id', state.tenantId)
            .gte('due_date', dateStart) 
            .lte('due_date', dateEnd);

          // Processamento
          let grossRev = 0;
          let cmvTotal = 0;
          let saloonSales = 0;
          let posSales = 0;

          transactions?.forEach((t: any) => {
              grossRev += t.amount;
              if (t.items_summary?.includes('Mesa')) saloonSales += t.amount;
              else posSales += t.amount;

              t.orders?.items?.forEach((item: any) => {
                  cmvTotal += (Number(item.product_cost_price) || 0) * item.quantity;
              });
          });

          // Simulação de Impostos (Configurável no futuro, ex: 6% Simples)
          const taxes = grossRev * 0.06;
          const netRevenue = grossRev - taxes;
          const grossProfit = netRevenue - cmvTotal;

          let opExpenses = 0;
          let finExpenses = 0;
          const expByCat: any = {};

          expenses?.forEach((e: any) => {
              if (e.category === 'Impostos' || e.category === 'Taxas Bancárias') {
                  finExpenses += e.amount;
              } else {
                  opExpenses += e.amount;
                  expByCat[e.category] = (expByCat[e.category] || 0) + e.amount;
              }
          });

          const ebitda = grossProfit - opExpenses;
          const netIncome = ebitda - finExpenses;

          setData({
              grossRevenue: grossRev,
              saloonSales,
              posSales,
              taxes,
              netRevenue,
              cmv: cmvTotal,
              grossProfit,
              operatingExpenses: opExpenses,
              expensesByCategory: expByCat,
              ebitda,
              financialExpenses: finExpenses,
              netIncome
          });

      } catch (error) {
          console.error(error);
          showAlert({ title: "Erro", message: "Falha ao processar DRE.", type: 'ERROR' });
      } finally {
          setLoading(false);
      }
  }, [state.tenantId, dateStart, dateEnd]);

  useEffect(() => { fetchDRE(); }, [fetchDRE]);

  // Indicadores
  const cmvPerc = data.netRevenue > 0 ? (data.cmv / data.netRevenue) * 100 : 0;
  const marginPerc = data.netRevenue > 0 ? (data.grossProfit / data.netRevenue) * 100 : 0;
  const profitPerc = data.grossRevenue > 0 ? (data.netIncome / data.grossRevenue) * 100 : 0;

  const DRERow = ({ label, value, type = 'normal', indent = false, isNegative = false }: any) => (
    <div className={`flex justify-between py-2.5 ${indent ? 'pl-8' : ''} ${type === 'total' ? 'border-t-2 border-slate-800 font-black text-slate-900 bg-slate-50 mt-2 px-2' : 'border-b border-slate-100 text-slate-600'}`}>
        <span className={type === 'total' ? 'uppercase tracking-tight' : 'font-medium'}>{label}</span>
        <span className={`font-mono ${isNegative ? 'text-red-500' : ''} ${type === 'total' ? 'text-lg' : ''}`}>
            {isNegative ? '-' : ''} R$ {Math.abs(value).toFixed(2)}
        </span>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border gap-4 print:hidden">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><PieChart className="text-blue-600"/> DRE Profissional</h2>
                <p className="text-sm text-gray-500">Demonstrativo de Resultado do Exercício</p>
            </div>
            <div className="flex flex-col md:flex-row gap-2 items-end">
                <div className="flex gap-2 bg-gray-50 p-1 rounded-lg border">
                    <input type="date" className="bg-transparent p-1.5 text-xs font-bold outline-none" value={dateStart} onChange={e => setDateStart(e.target.value)} />
                    <span className="text-gray-300 self-center">até</span>
                    <input type="date" className="bg-transparent p-1.5 text-xs font-bold outline-none" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
                </div>
                <Button onClick={fetchDRE} disabled={loading} className="h-[38px]">{loading ? <Loader2 className="animate-spin" size={16}/> : <RefreshCcw size={16}/>} Gerar</Button>
                <Button variant="secondary" onClick={() => window.print()} className="h-[38px]"><Printer size={16}/> Imprimir</Button>
            </div>
        </div>

        {/* --- INDICADORES DE SAÚDE --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`p-6 rounded-2xl border-2 bg-white shadow-sm flex flex-col ${cmvPerc > 35 ? 'border-red-100' : 'border-emerald-100'}`}>
                <div className="flex justify-between items-start mb-2">
                    <span className="text-gray-400 text-xs font-black uppercase tracking-widest">CMV Real</span>
                    {cmvPerc > 35 ? <ArrowUpRight className="text-red-500" /> : <CheckCircle2 className="text-emerald-500" />}
                </div>
                <div className="text-3xl font-black text-slate-800">{cmvPerc.toFixed(1)}%</div>
                <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase">Ideal: Até 35%</p>
            </div>

            <div className={`p-6 rounded-2xl border-2 bg-white shadow-sm flex flex-col border-blue-100`}>
                <div className="flex justify-between items-start mb-2">
                    <span className="text-gray-400 text-xs font-black uppercase tracking-widest">Margem Bruta</span>
                    <TrendingUp className="text-blue-500" />
                </div>
                <div className="text-3xl font-black text-slate-800">{marginPerc.toFixed(1)}%</div>
                <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase">Meta: Mínimo 30%</p>
            </div>

            <div className={`p-6 rounded-2xl border-2 bg-white shadow-sm flex flex-col ${profitPerc < 10 ? 'border-orange-100' : 'border-emerald-100'}`}>
                <div className="flex justify-between items-start mb-2">
                    <span className="text-gray-400 text-xs font-black uppercase tracking-widest">Lucratividade</span>
                    {profitPerc < 10 ? <AlertCircle className="text-orange-500" /> : <TrendingUp className="text-emerald-500" />}
                </div>
                <div className="text-3xl font-black text-slate-800">{profitPerc.toFixed(1)}%</div>
                <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase">Saudável: 10% a 15%</p>
            </div>
        </div>

        {/* --- DRE ESTRUTURADO --- */}
        <div className="bg-white rounded-2xl shadow-xl border overflow-hidden print:border-none print:shadow-none">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase mb-1">DRE Gerencial</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{state.theme.restaurantName}</p>
                </div>
                <div className="text-right">
                    <p className="text-slate-500 text-[10px] font-black uppercase mb-1">Período Selecionado</p>
                    <p className="text-sm font-mono">{new Date(dateStart).toLocaleDateString()} — {new Date(dateEnd).toLocaleDateString()}</p>
                </div>
            </div>

            <div className="p-8 max-w-4xl mx-auto">
                <div className="space-y-1">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">1. Receita e Faturamento</h3>
                    <DRERow label="(+) Receita Bruta (Vendas)" value={data.grossRevenue} />
                    <DRERow label="Vendas no Salão / Mesas" value={data.saloonSales} indent />
                    <DRERow label="Vendas Balcão / PDV" value={data.posSales} indent />
                    <DRERow label="(-) Impostos s/ Faturamento (Simples/ISS)" value={data.taxes} isNegative />
                    <DRERow label="(=) RECEITA LÍQUIDA" value={data.netRevenue} type="total" />

                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 mt-10 border-b pb-2">2. Custos Variáveis (CMV)</h3>
                    <DRERow label="(-) Custo de Mercadoria Vendida (CMV)" value={data.cmv} isNegative />
                    <p className="text-[10px] text-gray-400 italic mb-2">Ingredientes, embalagens e desperdícios lançados.</p>
                    <DRERow label="(=) LUCRO BRUTO" value={data.grossProfit} type="total" />

                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 mt-10 border-b pb-2">3. Despesas Operacionais</h3>
                    {Object.entries(data.expensesByCategory).map(([cat, val]: any) => (
                        <DRERow key={cat} label={`(-) ${cat}`} value={val} indent isNegative />
                    ))}
                    {/* Add comment above fix: Ensure the reduce result is treated as a number */}
                    <DRERow label="(-) Outras Operacionais" value={data.operatingExpenses - (Object.values(data.expensesByCategory).reduce((a: any, b: any) => a + b, 0) as number)} indent isNegative />
                    <DRERow label="(=) EBITDA / RESULTADO OPERACIONAL" value={data.ebitda} type="total" />

                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 mt-10 border-b pb-2">4. Resultado Financeiro</h3>
                    <DRERow label="(-) Despesas Financeiras (Taxas Cartão/Juros)" value={data.financialExpenses} isNegative />
                    <DRERow label="(=) LUCRO LÍQUIDO FINAL" value={data.netIncome} type="total" />
                </div>

                <div className={`mt-12 p-6 rounded-2xl flex items-center justify-between border-4 ${data.netIncome >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <div>
                        <h4 className={`text-xl font-black uppercase ${data.netIncome >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                            {data.netIncome >= 0 ? 'Lucro Líquido no Período' : 'Prejuízo no Período'}
                        </h4>
                        <p className="text-slate-500 text-sm font-medium">Resultado final após todas as deduções e custos.</p>
                    </div>
                    <div className={`text-4xl font-black ${data.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        R$ {data.netIncome.toFixed(2)}
                    </div>
                </div>
            </div>
            
            <div className="bg-slate-50 p-4 text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest border-t">
                Relatório Gerencial • Gerado em {new Date().toLocaleString()}
            </div>
        </div>
    </div>
  );
};
