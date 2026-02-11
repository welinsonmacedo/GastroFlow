
import React, { useState, useEffect, useCallback } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useFinance } from '../../context/FinanceContext';
import { useUI } from '../../context/UIContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { PieChart, TrendingUp, AlertCircle, CheckCircle2, RefreshCcw, Printer, ArrowUpRight, DollarSign, Loader2 } from 'lucide-react';

export const AdminAccounting: React.FC = () => {
  const { state } = useRestaurant();
  const { showAlert } = useUI();
  
  const [dateStart, setDateStart] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]); 
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  
  const [dre, setDre] = useState<any>({ grossRev: 0, taxes: 0, netRev: 0, cmv: 0, grossProfit: 0, opExpenses: 0, expByCat: {}, ebitda: 0, finExpenses: 0, netIncome: 0 });

  const fetchDRE = useCallback(async () => {
      if (!state.tenantId) return;
      setLoading(true);
      try {
          const start = dateStart + ' 00:00:00';
          const end = dateEnd + ' 23:59:59';

          // 1. Receita e CMV Histórico
          const { data: trans } = await supabase
            .from('transactions')
            .select(`*, orders ( items:order_items ( quantity, product_price, product_cost_price ) )`)
            .eq('tenant_id', state.tenantId)
            .gte('created_at', start)
            .lte('created_at', end);

          // 2. Despesas
          const { data: exps } = await supabase
            .from('expenses')
            .select('*')
            .eq('tenant_id', state.tenantId)
            .gte('due_date', dateStart)
            .lte('due_date', dateEnd);

          let gross = 0, cmv = 0;
          trans?.forEach((t: any) => {
              gross += t.amount;
              t.orders?.items?.forEach((i: any) => cmv += (Number(i.product_cost_price) || 0) * i.quantity);
          });

          const taxes = gross * 0.06; // Simulação 6% Simples Nacional
          const netRev = gross - taxes;
          const grossProfit = netRev - cmv;

          let opExp = 0, finExp = 0;
          const byCat: any = {};
          exps?.forEach((e: any) => {
              if (['Impostos', 'Taxas Bancárias'].includes(e.category)) {
                  finExp += e.amount;
              } else {
                  opExp += e.amount;
                  byCat[e.category] = (byCat[e.category] || 0) + e.amount;
              }
          });

          const ebitda = grossProfit - opExp;
          const netIncome = ebitda - finExp;

          setDre({ 
              grossRev: gross, 
              taxes, 
              netRev, 
              cmv, 
              grossProfit, 
              opExpenses: opExp, 
              expByCat: byCat, 
              ebitda, 
              finExpenses: finExp, 
              netIncome 
          });
      } catch (error) {
          console.error(error);
          showAlert({ title: "Erro", message: "Falha ao gerar DRE.", type: 'ERROR' });
      } finally { 
          setLoading(false); 
      }
  }, [state.tenantId, dateStart, dateEnd, showAlert]);

  useEffect(() => { fetchDRE(); }, [fetchDRE]);

  const cmvPerc = dre.netRev > 0 ? (dre.cmv / dre.netRev) * 100 : 0;
  
  const Row = ({ label, val, total, indent, neg }: any) => (
      <div className={`flex justify-between py-2.5 border-b border-slate-50 ${indent ? 'pl-8' : ''} ${total ? 'font-black bg-slate-50 text-slate-900 border-slate-900 border-t-2 mt-2 px-2' : 'text-slate-600'}`}>
          <span className={total ? 'uppercase' : ''}>{label}</span>
          <span className={`font-mono ${neg ? 'text-red-500' : ''}`}>
              {neg ? '-' : ''} R$ {Math.abs(val).toFixed(2)}
          </span>
      </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border gap-4">
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2"><PieChart className="text-blue-600"/> DRE Profissional</h2>
                <p className="text-sm text-gray-500">Gestão de Lucratividade e CMV</p>
            </div>
            <div className="flex flex-col md:flex-row gap-2 items-end">
                <div className="flex gap-2 bg-gray-50 p-1 rounded-lg border">
                    <input type="date" className="bg-transparent p-1.5 text-xs font-bold outline-none" value={dateStart} onChange={e => setDateStart(e.target.value)} />
                    <span className="text-gray-300 self-center">até</span>
                    <input type="date" className="bg-transparent p-1.5 text-xs font-bold outline-none" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
                </div>
                <Button onClick={fetchDRE} disabled={loading} className="h-[38px]">
                    {loading ? <Loader2 className="animate-spin" size={16}/> : <RefreshCcw size={16}/>} Gerar
                </Button>
                <Button variant="secondary" onClick={() => window.print()} className="h-[38px]"><Printer size={16}/> Imprimir</Button>
            </div>
        </div>

        {/* --- INDICADORES --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`p-6 rounded-xl border-2 bg-white shadow-sm ${cmvPerc > 35 ? 'border-red-100' : 'border-green-100'}`}>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">CMV Real</span>
                <div className="text-3xl font-black text-slate-800">{cmvPerc.toFixed(1)}%</div>
                <p className="text-[10px] text-gray-400 mt-1 uppercase">Ideal: Até 35%</p>
            </div>
            <div className="p-6 rounded-xl border-2 bg-white border-blue-100 shadow-sm">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lucratividade</span>
                <div className="text-3xl font-black text-slate-800">{dre.grossRev > 0 ? ((dre.netIncome / dre.grossRev) * 100).toFixed(1) : 0}%</div>
                <p className="text-[10px] text-gray-400 mt-1 uppercase">Ideal: 10% a 15%</p>
            </div>
            <div className="p-6 rounded-xl border-2 bg-white border-purple-100 shadow-sm">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lucro Líquido</span>
                <div className={`text-3xl font-black ${dre.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>R$ {dre.netIncome.toFixed(0)}</div>
                <p className="text-[10px] text-gray-400 mt-1 uppercase">Resultado do Período</p>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border overflow-hidden">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-end">
                <h1 className="text-3xl font-black uppercase tracking-tighter">DRE Gerencial</h1>
                <div className="text-right text-xs opacity-50 font-mono">
                    {new Date(dateStart).toLocaleDateString()} - {new Date(dateEnd).toLocaleDateString()}
                </div>
            </div>
            
            <div className="p-8 max-w-4xl mx-auto space-y-1">
                <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 border-b pb-1">1. Receita e Deduções</h3>
                <Row label="(+) Receita Bruta de Vendas" val={dre.grossRev} />
                <Row label="(-) Impostos s/ Faturamento (Simples)" val={dre.taxes} neg />
                <Row label="(=) RECEITA LÍQUIDA" val={dre.netRev} total />

                <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 mt-10 border-b pb-1">2. Custos de Mercadoria (CMV)</h3>
                <Row label="(-) Custo de Mercadoria Vendida (Estoque)" val={dre.cmv} neg />
                <Row label="(=) LUCRO BRUTO" val={dre.grossProfit} total />

                <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 mt-10 border-b pb-1">3. Despesas Operacionais</h3>
                {Object.entries(dre.expByCat).map(([cat, val]: any) => (
                    <Row key={cat} label={`(-) ${cat}`} val={val} indent neg />
                ))}
                <Row label="(=) RESULTADO OPERACIONAL (EBITDA)" val={dre.ebitda} total />

                <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 mt-10 border-b pb-1">4. Resultado Final</h3>
                <Row label="(-) Despesas Financeiras / Taxas" val={dre.finExpenses} neg />
                <Row label="(=) LUCRO LÍQUIDO FINAL" val={dre.netIncome} total />
            </div>

            <div className="bg-slate-50 p-4 text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest border-t">
                Relatório Gerencial • {state.theme.restaurantName}
            </div>
        </div>
    </div>
  );
};
