
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { Loader2, RefreshCcw, Printer, PieChart, TrendingUp, CheckCircle2, ArrowUpRight, AlertCircle, FileText, DollarSign, Store, Package, HelpCircle, SlidersHorizontal, Eye, CreditCard, BarChart2, Users, ShoppingBag, Bike, Monitor, Settings } from 'lucide-react';

export const AdminAccounting: React.FC = () => {
  const { state } = useRestaurant();
  const { showAlert } = useUI();
  const printRef = useRef<HTMLDivElement>(null);
  
  // Filtros de Data
  const [dateStart, setDateStart] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]); 
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  
  // Configurações do Relatório
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
      accountingMethod: 'COMPETENCE' as 'COMPETENCE' | 'CASH',
      taxRate: 6.0,
      fees: { credit: 3.99, debit: 1.99, pix: 0.0, voucher: 4.5 }
  });
  
  // Visibilidade das Seções
  const [visibility, setVisibility] = useState({
      charts: true,
      revenue: true,
      cmv: true,
      expenses: true,
      financial: true,
      operational: true // Nova seção
  });

  const [data, setData] = useState<any>({
      grossRevenue: 0, saloonSales: 0, posSales: 0, 
      taxes: 0, cardFees: 0, netRevenue: 0,
      cmv: 0, grossProfit: 0, operatingExpenses: 0, expensesByCategory: {},
      ebitda: 0, financialExpenses: 0, netIncome: 0, hasData: false,
      // Novos dados analíticos
      channelAnalysis: { dineIn: 0, delivery: 0, pdv: 0 },
      staffPerformance: []
  });

  const fetchDRE = useCallback(async () => {
      if (!state.tenantId) return;
      setLoading(true);
      
      try {
          const start = dateStart + ' 00:00:00';
          const end = dateEnd + ' 23:59:59';

          // 1. Buscar Transações (Receita Bruta) com JOIN em ORDERS para saber o tipo
          const { data: transRes, error: transErr } = await supabase
            .from('transactions')
            .select('*, orders(order_type)') // Busca o tipo do pedido vinculado
            .eq('tenant_id', state.tenantId)
            .gte('created_at', start)
            .lte('created_at', end)
            .neq('status', 'CANCELLED');

          if (transErr) throw transErr;

          // 2. Buscar Itens de Pedidos Vendidos para CMV
          const { data: itemsRes, error: itemsErr } = await supabase
            .from('order_items')
            .select('quantity, product_price, product_cost_price, orders!inner(is_paid, created_at, status)')
            .eq('tenant_id', state.tenantId)
            .eq('orders.is_paid', true)
            .neq('orders.status', 'CANCELLED')
            .gte('orders.created_at', start)
            .lte('orders.created_at', end);

          if (itemsErr) throw itemsErr;

          // 3. Buscar Despesas
          let expensesQuery = supabase
            .from('expenses')
            .select('*')
            .eq('tenant_id', state.tenantId);

          if (config.accountingMethod === 'CASH') {
              expensesQuery = expensesQuery.eq('is_paid', true).gte('paid_date', dateStart).lte('paid_date', dateEnd);
          } else {
              expensesQuery = expensesQuery.gte('due_date', dateStart).lte('due_date', dateEnd);
          }

          const { data: expsRes, error: expsErr } = await expensesQuery;
          if (expsErr) throw expsErr;

          // --- Cálculos Financeiros ---
          let grossRev = 0;
          let calculatedCardFees = 0;
          
          // Analíticos
          let dineInTotal = 0;
          let deliveryTotal = 0;
          let pdvTotal = 0;
          const staffMap: Record<string, { count: number, total: number }> = {};

          transRes?.forEach((t: any) => {
              const amt = Number(t.amount) || 0;
              grossRev += amt;
              
              // Taxas
              let rate = 0;
              if (t.method === 'CREDIT') rate = config.fees.credit;
              else if (t.method === 'DEBIT') rate = config.fees.debit;
              else if (t.method === 'PIX') rate = config.fees.pix;
              else if (t.method === 'MEAL_VOUCHER') rate = config.fees.voucher;
              calculatedCardFees += amt * (rate / 100);

              // Análise de Canal (Baseado no tipo do pedido ou inferência)
              const orderType = t.orders?.order_type;
              if (orderType === 'DELIVERY') {
                  deliveryTotal += amt;
              } else if (orderType === 'PDV' || (!orderType && t.items_summary?.includes('Balcão'))) {
                  pdvTotal += amt;
              } else {
                  // DINE_IN ou Default (Mesas/QR)
                  dineInTotal += amt;
              }

              // Performance da Equipe (Quem fechou a conta)
              const cashier = t.cashier_name || 'Sistema/QR';
              if (!staffMap[cashier]) staffMap[cashier] = { count: 0, total: 0 };
              staffMap[cashier].count += 1;
              staffMap[cashier].total += amt;
          });

          // Ordenar Ranking de Staff
          const staffRanking = Object.entries(staffMap)
              .map(([name, stats]) => ({ name, ...stats }))
              .sort((a, b) => b.total - a.total);

          let cmvTotal = 0;
          itemsRes?.forEach((item: any) => {
              const qty = Number(item.quantity) || 0;
              const cost = Number(item.product_cost_price) || 0;
              cmvTotal += (qty * cost);
          });

          const taxes = grossRev * (config.taxRate / 100);
          const netRevenue = grossRev - taxes - calculatedCardFees;
          const grossProfit = netRevenue - cmvTotal;

          let opExpenses = 0, finExpenses = 0;
          const expByCat: any = {};
          expsRes?.forEach((e: any) => {
              const amt = Number(e.amount) || 0;
              if (['Impostos', 'Taxas Bancárias'].includes(e.category)) finExpenses += amt;
              else {
                  opExpenses += amt;
                  expByCat[e.category] = (expByCat[e.category] || 0) + amt;
              }
          });

          const ebitda = grossProfit - opExpenses;
          
          setData({
              grossRevenue: grossRev, 
              saloonSales: dineInTotal, // Atualizado para usar lógica de order_type
              posSales: pdvTotal + deliveryTotal, // PDV + Delivery somados para linha simplificada do DRE
              taxes, cardFees: calculatedCardFees, netRevenue,
              cmv: cmvTotal, grossProfit, operatingExpenses: opExpenses,
              expensesByCategory: expByCat, ebitda, financialExpenses: finExpenses,
              netIncome: ebitda - finExpenses,
              hasData: grossRev > 0 || opExpenses > 0,
              // Dados Novos
              channelAnalysis: { dineIn: dineInTotal, delivery: deliveryTotal, pdv: pdvTotal },
              staffPerformance: staffRanking
          });

      } catch (error: any) {
          console.error("DRE Fetch Error:", error);
          showAlert({ title: "Erro no DRE", message: "Falha ao compilar dados.", type: 'ERROR' });
      } finally {
          setLoading(false);
      }
  }, [state.tenantId, dateStart, dateEnd, config, showAlert]);

  useEffect(() => { if (state.tenantId) fetchDRE(); }, [state.tenantId, fetchDRE]);

  const cmvPerc = data.netRevenue > 0 ? (data.cmv / data.netRevenue) * 100 : 0;
  const marginPerc = data.netRevenue > 0 ? (data.grossProfit / data.netRevenue) * 100 : 0;
  const profitPerc = data.grossRevenue > 0 ? (data.netIncome / data.grossRevenue) * 100 : 0;

  const Row = ({ label, value, type = 'normal', indent = false, isNegative = false, description = '' }: any) => (
    <div className={`flex justify-between py-2.5 print:py-1 ${indent ? 'pl-8' : ''} ${type === 'total' ? 'border-t-2 border-slate-800 font-black text-slate-900 bg-slate-50 mt-2 px-2 print:bg-transparent print:border-black' : 'border-b border-slate-100 text-slate-600 print:border-slate-300'}`}>
        <div className="flex items-center gap-2 group relative">
            <span className={type === 'total' ? 'uppercase tracking-tight text-sm print:text-black' : 'font-medium text-sm print:text-black'}>{label}</span>
            {description && (
                <>
                    <HelpCircle size={14} className="text-slate-300 cursor-help hover:text-blue-500 print:hidden transition-colors" />
                    <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 print:hidden leading-relaxed">
                        {description}
                        <div className="absolute bottom-[-4px] left-3 w-2 h-2 bg-slate-800 transform rotate-45"></div>
                    </div>
                </>
            )}
        </div>
        <span className={`font-mono font-bold ${isNegative ? 'text-red-500 print:text-black' : 'text-slate-800 print:text-black'}`}>
            {isNegative && value > 0 ? '-' : ''} R$ {Math.abs(value).toFixed(2)}
        </span>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-20 print:pb-0 print:space-y-4">
        {/* Header - Controles (Escondido na impressão) */}
        <div className="flex flex-col gap-4 print:hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><PieChart className="text-blue-600"/> DRE Gerencial</h2>
                    <p className="text-sm text-gray-500">Relatório de Lucratividade e Operação</p>
                </div>
                <div className="flex flex-col md:flex-row gap-2 items-end">
                    <div className="flex gap-2 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
                        <input type="date" className="bg-transparent p-1 text-xs font-bold outline-none" value={dateStart} onChange={e => setDateStart(e.target.value)} />
                        <span className="text-gray-400 self-center font-bold">→</span>
                        <input type="date" className="bg-transparent p-1 text-xs font-bold outline-none" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => setShowConfig(!showConfig)} variant="secondary" className={`h-[42px] px-4 border-gray-200 ${showConfig ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white'}`}><SlidersHorizontal size={18}/></Button>
                        <Button onClick={fetchDRE} disabled={loading} className="h-[42px] px-6">{loading ? <Loader2 className="animate-spin" size={18}/> : <RefreshCcw size={18}/>} <span className="ml-2">Atualizar</span></Button>
                        <Button variant="secondary" onClick={() => window.print()} className="h-[42px] bg-white border-gray-200"><Printer size={18}/></Button>
                    </div>
                </div>
            </div>

            {/* Painel de Configuração Modular (Mantido Igual, ocultado para brevidade) */}
            {showConfig && (
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 animate-fade-in grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* ... Configs de Taxas e Visibilidade ... */}
                    <div>
                        <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2"><Settings size={14}/> Dados Gerais</h4>
                        <div className="space-y-4">
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Imposto Simples (%)</label><input type="number" step="0.1" className="w-full border p-2 rounded-lg text-sm font-bold" value={config.taxRate} onChange={e => setConfig({...config, taxRate: parseFloat(e.target.value) || 0})} /></div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2"><CreditCard size={14}/> Taxas (%)</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-[10px] font-bold text-gray-500 mb-1">Crédito</label><input type="number" step="0.01" className="w-full border p-2 rounded-lg text-sm font-bold" value={config.fees.credit} onChange={e => setConfig({...config, fees: {...config.fees, credit: parseFloat(e.target.value) || 0}})} /></div>
                            <div><label className="block text-[10px] font-bold text-gray-500 mb-1">Débito</label><input type="number" step="0.01" className="w-full border p-2 rounded-lg text-sm font-bold" value={config.fees.debit} onChange={e => setConfig({...config, fees: {...config.fees, debit: parseFloat(e.target.value) || 0}})} /></div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2"><Eye size={14}/> Exibir Seções</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.keys(visibility).map(key => (
                                <label key={key} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${visibility[key as keyof typeof visibility] ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-transparent opacity-60'}`}><input type="checkbox" className="hidden" checked={visibility[key as keyof typeof visibility]} onChange={e => setVisibility({...visibility, [key]: e.target.checked})} /><span className="text-[10px] font-bold uppercase">{key}</span></label>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {data.hasData && (
            <>
                {/* Cards de Métricas */}
                {visibility.charts && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
                        <div className={`p-6 rounded-2xl border-2 bg-white shadow-sm flex flex-col ${cmvPerc > 35 ? 'border-red-200 bg-red-50/30' : 'border-emerald-200 bg-emerald-50/30'}`}>
                            <div className="flex justify-between items-start mb-2"><span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">CMV Real (Meta: 35%)</span>{cmvPerc > 35 ? <ArrowUpRight className="text-red-500" /> : <CheckCircle2 className="text-emerald-500" />}</div>
                            <div className="text-4xl font-black text-slate-800">{cmvPerc.toFixed(1)}%</div>
                            <div className="mt-3 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full ${cmvPerc > 35 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(cmvPerc, 100)}%` }}></div>
                            </div>
                        </div>
                        <div className="p-6 rounded-2xl border-2 bg-white shadow-sm flex flex-col border-blue-200 bg-blue-50/30">
                            <div className="flex justify-between items-start mb-2"><span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Margem Bruta</span><TrendingUp className="text-blue-500" /></div>
                            <div className="text-4xl font-black text-slate-800">{marginPerc.toFixed(1)}%</div>
                            <p className="text-[10px] text-blue-600 mt-2 font-bold uppercase">Ideal acima de 30%</p>
                        </div>
                        <div className={`p-6 rounded-2xl border-2 bg-white shadow-sm flex flex-col ${profitPerc < 10 ? 'border-orange-200 bg-orange-50/30' : 'border-emerald-200 bg-emerald-50/30'}`}>
                            <div className="flex justify-between items-start mb-2"><span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Lucratividade Final</span>{profitPerc < 10 ? <AlertCircle className="text-orange-500" /> : <TrendingUp className="text-emerald-500" />}</div>
                            <div className="text-4xl font-black text-slate-800">{profitPerc.toFixed(1)}%</div>
                            <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase">Meta: 10% a 15%</p>
                        </div>
                    </div>
                )}

                {/* DRE Report Sheet */}
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
                    <div className="bg-slate-900 p-10 text-white flex justify-between items-end print:bg-white print:text-black print:p-0 print:border-b-2 print:border-black print:mb-4">
                        <div>
                            <h1 className="text-4xl font-black tracking-tighter uppercase mb-1 print:text-2xl">DRE Gerencial</h1>
                            <p className="text-blue-400 text-sm font-bold uppercase tracking-widest flex items-center gap-2 print:text-black">
                                <Store size={16} className="print:hidden"/> {state.theme.restaurantName}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-500 text-[10px] font-black uppercase mb-1 print:text-black">Período</p>
                            <p className="text-lg font-mono font-bold bg-white/10 px-3 py-1 rounded-lg print:bg-transparent print:p-0 print:text-sm">
                                {new Date(dateStart).toLocaleDateString()} — {new Date(dateEnd).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    <div className="p-10 max-w-4xl mx-auto print:p-0 print:max-w-none">
                        <div className="space-y-1">
                            {/* SEÇÃO 1: RECEITA */}
                            {visibility.revenue && (
                                <>
                                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2 print:text-black print:border-b print:mt-4">
                                        <DollarSign size={14} className="print:hidden"/> 1. Receita e Deduções
                                    </h3>
                                    <Row label="(+) Receita Bruta de Vendas" value={data.grossRevenue} description="Soma total de todas as vendas realizadas (cartão, dinheiro, pix) excluindo cancelamentos." />
                                    <Row label={`(-) Impostos (${config.taxRate}%)`} value={data.taxes} isNegative description={`Estimativa de impostos sobre a venda (${config.taxRate}% configurado).`} />
                                    <Row label="(-) Taxas de Cartão / Recebimento" value={data.cardFees} isNegative description="Custos variáveis de maquininha." />
                                    <Row label="(=) RECEITA LÍQUIDA" value={data.netRevenue} type="total" description="O dinheiro que efetivamente entra no negócio." />
                                </>
                            )}

                            {/* SEÇÃO 2: CMV */}
                            {visibility.cmv && (
                                <>
                                    <h3 className="text-xs font-black text-orange-600 uppercase tracking-widest mb-4 mt-12 flex items-center gap-2 print:text-black print:border-b print:mt-6">
                                        <Package size={14} className="print:hidden"/> 2. Custos Variáveis (CMV)
                                    </h3>
                                    <Row label="(-) Custo de Mercadoria Vendida" value={data.cmv} isNegative description="Custo dos ingredientes/insumos utilizados." />
                                    <Row label="(=) LUCRO BRUTO" value={data.grossProfit} type="total" description="O que sobra para pagar as contas fixas." />
                                </>
                            )}

                            {/* SEÇÃO 3: OPERACIONAIS */}
                            {visibility.expenses && (
                                <>
                                    <h3 className="text-xs font-black text-purple-600 uppercase tracking-widest mb-4 mt-12 flex items-center gap-2 print:text-black print:border-b print:mt-6">
                                        <FileText size={14} className="print:hidden"/> 3. Despesas Operacionais
                                    </h3>
                                    {Object.entries(data.expensesByCategory).map(([cat, val]: any) => (
                                        <Row key={cat} label={`(-) ${cat}`} value={val} indent isNegative description={`Total gasto na categoria ${cat}.`} />
                                    ))}
                                    <Row label="(=) EBITDA (Operacional)" value={data.ebitda} type="total" description="Lucro da operação antes de juros, impostos e depreciação." />
                                </>
                            )}

                            {/* SEÇÃO 4: RESULTADO */}
                            {visibility.financial && (
                                <>
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 mt-12 flex items-center gap-2 print:text-black print:border-b print:mt-6">
                                        <TrendingUp size={14} className="print:hidden"/> 4. Resultado Final
                                    </h3>
                                    <Row label="(-) Despesas Financeiras" value={data.financialExpenses} isNegative description="Tarifas e juros." />
                                    <Row label="(=) LUCRO LÍQUIDO FINAL" value={data.netIncome} type="total" description="O valor real que sobrou no bolso." />
                                </>
                            )}

                            {/* SEÇÃO 5: ANÁLISE OPERACIONAL (NOVO) */}
                            {visibility.operational && (
                                <div className="mt-16 print:break-before-page">
                                    <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-6 flex items-center gap-2 print:text-black print:border-b">
                                        <BarChart2 size={14} className="print:hidden"/> 5. Análise Operacional & Performance
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Vendas por Canal */}
                                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 print:bg-white print:border-slate-300">
                                            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Store size={16}/> Comparativo de Canais</h4>
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                                        <span className="flex items-center gap-1"><ShoppingBag size={12}/> Mesa / Salão (QR)</span>
                                                        <span>R$ {data.channelAnalysis.dineIn.toFixed(2)}</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500" style={{ width: `${(data.channelAnalysis.dineIn / data.grossRevenue) * 100}%` }}></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                                        <span className="flex items-center gap-1"><Bike size={12}/> Delivery</span>
                                                        <span>R$ {data.channelAnalysis.delivery.toFixed(2)}</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-orange-500" style={{ width: `${(data.channelAnalysis.delivery / data.grossRevenue) * 100}%` }}></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                                        <span className="flex items-center gap-1"><Monitor size={12}/> Balcão / PDV</span>
                                                        <span>R$ {data.channelAnalysis.pdv.toFixed(2)}</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-purple-500" style={{ width: `${(data.channelAnalysis.pdv / data.grossRevenue) * 100}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ranking de Staff */}
                                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 print:bg-white print:border-slate-300">
                                            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Users size={16}/> Top Performance (Vendas/Fechamentos)</h4>
                                            <div className="space-y-2 overflow-y-auto max-h-48 custom-scrollbar">
                                                {data.staffPerformance.map((staff: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center text-xs p-2 bg-white rounded-lg border border-slate-100">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                {idx + 1}
                                                            </div>
                                                            <span className="font-bold text-slate-700">{staff.name}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-mono font-bold text-slate-900">R$ {staff.total.toFixed(2)}</div>
                                                            <div className="text-[9px] text-slate-400">{staff.count} atendimentos</div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {data.staffPerformance.length === 0 && <p className="text-center text-gray-400 text-xs py-4">Sem dados de equipe no período.</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Banner de Resultado Final */}
                        <div className={`mt-16 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between border-4 print:mt-8 print:border-2 print:p-4 print:rounded-xl ${data.netIncome >= 0 ? 'bg-emerald-50 border-emerald-200 print:bg-white print:border-black' : 'bg-red-50 border-red-200 print:bg-white print:border-black'}`}>
                            <div className="text-center md:text-left mb-6 md:mb-0 print:text-left">
                                <h4 className={`text-2xl font-black uppercase tracking-tighter print:text-black ${data.netIncome >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>{data.netIncome >= 0 ? 'Resultado Positivo' : 'Prejuízo Apurado'}</h4>
                                <p className="text-slate-500 font-medium print:text-black">Lucro real após todas as baixas e despesas.</p>
                            </div>
                            <div className="text-center md:text-right">
                                <div className={`text-5xl font-black print:text-3xl print:text-black ${data.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>R$ {data.netIncome.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        )}
    </div>
  );
};