
import React, { useState, useCallback, useEffect } from 'react';
import { useRestaurant } from '@/core/context/RestaurantContext';
import { useUI } from '@/core/context/UIContext';
import { Button } from '../../components/Button';
import { supabase } from '@/core/api/supabaseClient';
import { DREReportPrint } from '../../components/reports/DREReportPrint';
import { 
    Loader2, RefreshCcw, Printer, Settings, 
    TrendingUp, TrendingDown, DollarSign, PieChart, 
    Calendar, AlertCircle, FileText
} from 'lucide-react';

export const AdminAccounting: React.FC = () => {
  const { state } = useRestaurant();
  const { showAlert } = useUI();
  
  // --- ESTADOS ---
  const [dateStart, setDateStart] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]); 
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  // Configurações Contábeis
  const [config, setConfig] = useState({
      accountingMethod: 'COMPETENCE' as 'COMPETENCE' | 'CASH',
      taxRate: state.businessInfo.taxPercentage ?? 6.0,
      fees: {
          credit: state.businessInfo.paymentMethods?.find(p => p.type === 'CREDIT')?.feePercentage ?? 3.99,
          debit: state.businessInfo.paymentMethods?.find(p => p.type === 'DEBIT')?.feePercentage ?? 1.99,
          pix: state.businessInfo.paymentMethods?.find(p => p.type === 'PIX')?.feePercentage ?? 0.0,
          voucher: state.businessInfo.paymentMethods?.find(p => p.type === 'MEAL_VOUCHER')?.feePercentage ?? 4.5
      }
  });

  useEffect(() => {
      setConfig(prev => ({
          ...prev,
          taxRate: state.businessInfo.taxPercentage ?? prev.taxRate,
          fees: {
              credit: state.businessInfo.paymentMethods?.find(p => p.type === 'CREDIT')?.feePercentage ?? prev.fees.credit,
              debit: state.businessInfo.paymentMethods?.find(p => p.type === 'DEBIT')?.feePercentage ?? prev.fees.debit,
              pix: state.businessInfo.paymentMethods?.find(p => p.type === 'PIX')?.feePercentage ?? prev.fees.pix,
              voucher: state.businessInfo.paymentMethods?.find(p => p.type === 'MEAL_VOUCHER')?.feePercentage ?? prev.fees.voucher
          }
      }));
  }, [state.businessInfo]);

  // Visibilidade das Seções
  const [visibility] = useState({
      charts: true,
      revenue: true,
      cmv: true,
      expenses: true,
      financial: true
  });

  // Estado dos Dados
  const [data, setData] = useState<any>({
      grossRevenue: 0, saloonSales: 0, posSales: 0, 
      taxes: 0, cardFees: 0, netRevenue: 0,
      cmv: 0, grossProfit: 0, 
      expenses: { fixed: 0, variable: 0, personnel: 0, financial: 0, total: 0, byCategory: {} as Record<string, number> },
      ebitda: 0, netIncome: 0, hasData: false
  });

  // --- BUSCA E CÁLCULO ---
  const fetchDRE = useCallback(async () => {
      if (!state.tenantId) return;
      setLoading(true);
      
      try {
          // Define intervalo com horário para pegar o dia inteiro
          const start = dateStart + ' 00:00:00';
          const end = dateEnd + ' 23:59:59';

          // 1. Receita (Transações)
          const { data: transRes, error: transErr } = await supabase
            .from('transactions')
            .select('*')
            .eq('tenant_id', state.tenantId)
            .gte('created_at', start)
            .lte('created_at', end)
            .neq('status', 'CANCELLED');

          if (transErr) throw transErr;

          // 2. Custos (CMV) - Baseado em Pedidos Pagos
          const { data: itemsRes, error: itemsErr } = await supabase
            .from('order_items')
            .select('quantity, product_cost_price, orders!inner(is_paid, created_at, status)')
            .eq('tenant_id', state.tenantId)
            .eq('orders.is_paid', true)
            .neq('orders.status', 'CANCELLED')
            .gte('orders.created_at', start)
            .lte('orders.created_at', end);

          if (itemsErr) throw itemsErr;

          // 3. Despesas (Operacionais e Financeiras)
          let expensesQuery = supabase.from('expenses').select('*').eq('tenant_id', state.tenantId);

          if (config.accountingMethod === 'CASH') {
              expensesQuery = expensesQuery
                .eq('is_paid', true)
                .gte('paid_date', start) // Usa timestamp completo
                .lte('paid_date', end);  // Usa timestamp completo
          } else {
              expensesQuery = expensesQuery
                .gte('due_date', start) // Usa timestamp completo
                .lte('due_date', end);  // Usa timestamp completo
          }

          const { data: expsRes, error: expsErr } = await expensesQuery;
          if (expsErr) throw expsErr;

          // --- PROCESSAMENTO ---
          
          // Receita Bruta
          let grossRev = 0, saloonSales = 0, posSales = 0;
          let calculatedCardFees = 0;

          transRes?.forEach((t: any) => {
              const amt = Number(t.amount) || 0;
              grossRev += amt;
              
              if (t.items_summary?.includes('Mesa')) saloonSales += amt;
              else posSales += amt;

              // Cálculo de Taxas de Maquininha
              let rate = 0;
              if (t.method === 'CREDIT') rate = config.fees.credit;
              else if (t.method === 'DEBIT') rate = config.fees.debit;
              else if (t.method === 'PIX') rate = config.fees.pix;
              else if (t.method === 'MEAL_VOUCHER') rate = config.fees.voucher;
              
              calculatedCardFees += amt * (rate / 100);
          });

          // CMV
          let cmvTotal = 0;
          itemsRes?.forEach((item: any) => {
              const qty = Number(item.quantity) || 0;
              const cost = Number(item.product_cost_price) || 0;
              cmvTotal += (qty * cost);
          });

          // Deduções e Margem
          const taxes = grossRev * (config.taxRate / 100);
          const netRevenue = grossRev - taxes - calculatedCardFees;
          const grossProfit = netRevenue - cmvTotal;

          // Processamento de Despesas
          let expFixed = 0;
          let expVariable = 0; // Operacional Variável
          let expPersonnel = 0;
          let expFinancial = 0;
          const expByCat: Record<string, number> = {};

          expsRes?.forEach((e: any) => {
              const amt = Number(e.amount) || 0;
              const cat = e.category || 'Outros';
              
              expByCat[cat] = (expByCat[cat] || 0) + amt;

              // Categorização para o DRE
              if (['Pessoal', 'Salário', 'Pró-labore', 'Funcionários'].includes(cat)) {
                  expPersonnel += amt;
              } else if (['Impostos', 'Taxas Bancárias', 'Juros', 'Multas'].includes(cat)) {
                  expFinancial += amt;
              } else if (['Aluguel', 'Internet', 'Sistema', 'Contador', 'Segurança'].includes(cat)) {
                  expFixed += amt;
              } else {
                  // Todo o resto (Manutenção, Fornecedor, Outros, Marketing) cai aqui como Operacional/Variável
                  expVariable += amt;
              }
          });

          const totalOpExpenses = expFixed + expVariable + expPersonnel;
          const ebitda = grossProfit - totalOpExpenses;
          const netResult = ebitda - expFinancial;

          setData({
              grossRevenue: grossRev, saloonSales, posSales, 
              taxes, cardFees: calculatedCardFees, netRevenue,
              cmv: cmvTotal, grossProfit, 
              expenses: { 
                  fixed: expFixed, 
                  variable: expVariable, 
                  personnel: expPersonnel, 
                  financial: expFinancial, 
                  total: totalOpExpenses + expFinancial, 
                  byCategory: expByCat 
              },
              ebitda,
              netIncome: netResult,
              hasData: grossRev > 0 || (totalOpExpenses + expFinancial) > 0
          });

      } catch (error) {
          console.error(error);
          showAlert({ title: 'Erro', message: 'Falha ao calcular DRE.', type: 'ERROR' });
      } finally {
          setLoading(false);
      }
  }, [state.tenantId, dateStart, dateEnd, config, showAlert]);

  useEffect(() => { 
      if (state.tenantId) fetchDRE(); 
  }, [state.tenantId, fetchDRE]);

  // --- UTILS DE RENDERIZAÇÃO ---
  
  const getAV = (value: number) => {
      if (data.grossRevenue === 0) return '0.0%';
      return `${((value / data.grossRevenue) * 100).toFixed(1)}%`;
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Métricas para os Cards
  // const cmvPerc = data.netRevenue > 0 ? (data.cmv / data.netRevenue) * 100 : 0;
  // const marginPerc = data.netRevenue > 0 ? (data.grossProfit / data.netRevenue) * 100 : 0;
  // const profitPerc = data.grossRevenue > 0 ? (data.netIncome / data.grossRevenue) * 100 : 0;

  const Row = ({ label, value, type = 'normal', indent = false, isNegative = false }: any) => (
    <div className={`flex justify-between py-2.5 ${indent ? 'pl-8' : ''} ${type === 'total' ? 'border-t-2 border-slate-800 font-black text-slate-900 bg-slate-50 mt-2 px-2' : 'border-b border-slate-100 text-slate-600'}`}>
        <div className="flex items-center gap-2 group relative">
            <span className={type === 'total' ? 'uppercase tracking-tight text-sm' : 'font-medium text-sm'}>{label}</span>
        </div>
        <div className="flex items-center gap-4">
            <span className={`font-mono font-bold ${isNegative ? 'text-red-500' : 'text-slate-800'}`}>
                {isNegative && value > 0 ? '-' : ''} {formatCurrency(Math.abs(value))}
            </span>
            <span className="text-[10px] w-12 text-right font-mono text-slate-400">{getAV(value)}</span>
        </div>
    </div>
  );

  const KPICard = ({ title, value, subtext, icon: Icon, colorClass }: any) => (
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-full relative overflow-hidden group hover:shadow-md transition-all">
          <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
              <Icon size={48} />
          </div>
          <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{title}</p>
              <h3 className={`text-2xl font-black ${colorClass.replace('bg-', 'text-').replace('100', '600')}`}>{value}</h3>
          </div>
          <p className="text-[10px] text-gray-400 font-medium mt-3 border-t pt-2 flex justify-between">
              <span>Margem</span>
              <span className="font-bold">{subtext}</span>
          </p>
      </div>
  );

  return (
    <>
    {/* CONTEÚDO PARA TELA (DASHBOARD) - OCULTO NA IMPRESSÃO */}
    <div className="space-y-6 animate-fade-in pb-20 print:hidden">
        
        {/* HEADER & CONTROLES */}
        <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <FileText className="text-blue-600"/> DRE Gerencial
                    </h2>
                    <p className="text-sm text-gray-500">Demonstração do Resultado do Exercício</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                     <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-xl border border-gray-200 shadow-inner">
                        <Calendar size={16} className="text-gray-400 ml-2"/>
                        <input 
                            type="date" 
                            className="bg-transparent text-sm font-bold text-slate-700 outline-none p-1" 
                            value={dateStart} 
                            onChange={e => setDateStart(e.target.value)} 
                        />
                        <span className="text-gray-400 font-bold">à</span>
                        <input 
                            type="date" 
                            className="bg-transparent text-sm font-bold text-slate-700 outline-none p-1" 
                            value={dateEnd} 
                            onChange={e => setDateEnd(e.target.value)} 
                        />
                    </div>

                    <Button variant="secondary" onClick={() => setShowConfig(!showConfig)} className={`h-[44px] w-[44px] p-0 flex items-center justify-center ${showConfig ? 'bg-blue-100 text-blue-600 border-blue-200' : ''}`}>
                        <Settings size={20}/>
                    </Button>
                    
                    <Button onClick={fetchDRE} disabled={loading} className="h-[44px] px-6 shadow-blue-200 shadow-lg">
                        {loading ? <Loader2 className="animate-spin" /> : <RefreshCcw size={18}/>} 
                        <span className="ml-2 hidden sm:inline">Gerar</span>
                    </Button>

                    <Button variant="outline" onClick={() => window.print()} className="h-[44px]">
                        <Printer size={18}/>
                    </Button>
                </div>
            </div>

            {/* Painel de Configurações */}
            {showConfig && (
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    <div>
                        <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3">Parâmetros Fiscais</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Regime de Apuração</label>
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    <button onClick={() => setConfig({...config, accountingMethod: 'COMPETENCE'})} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${config.accountingMethod === 'COMPETENCE' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Competência (Venda)</button>
                                    <button onClick={() => setConfig({...config, accountingMethod: 'CASH'})} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${config.accountingMethod === 'CASH' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>Caixa (Pagamento)</button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Alíquota de Imposto (%)</label>
                                <input type="number" step="0.1" className="w-full border p-2 rounded-lg text-sm font-bold bg-gray-50 focus:bg-white focus:border-blue-500 outline-none" value={config.taxRate} onChange={e => setConfig({...config, taxRate: parseFloat(e.target.value) || 0})} />
                                <p className="text-[10px] text-gray-400 mt-1">Puxado das Configurações da Empresa</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3">Taxas de Recebimento (%)</h4>
                        <p className="text-[10px] text-gray-400 mb-2">Puxado das Configurações da Empresa</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-[10px] font-bold text-gray-500">Crédito</label><input type="number" step="0.01" className="w-full border p-2 rounded text-sm" value={config.fees.credit} onChange={e => setConfig({...config, fees: {...config.fees, credit: parseFloat(e.target.value)}})} /></div>
                            <div><label className="block text-[10px] font-bold text-gray-500">Débito</label><input type="number" step="0.01" className="w-full border p-2 rounded text-sm" value={config.fees.debit} onChange={e => setConfig({...config, fees: {...config.fees, debit: parseFloat(e.target.value)}})} /></div>
                            <div><label className="block text-[10px] font-bold text-gray-500">Voucher</label><input type="number" step="0.01" className="w-full border p-2 rounded text-sm" value={config.fees.voucher} onChange={e => setConfig({...config, fees: {...config.fees, voucher: parseFloat(e.target.value)}})} /></div>
                            <div><label className="block text-[10px] font-bold text-gray-500">PIX</label><input type="number" step="0.01" className="w-full border p-2 rounded text-sm" value={config.fees.pix} onChange={e => setConfig({...config, fees: {...config.fees, pix: parseFloat(e.target.value)}})} /></div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* --- RELATÓRIO VISUAL (TELA) --- */}
        {data.hasData ? (
            <div className="space-y-6">
                
                {/* 1. Dashboard de KPIs (Executivo) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard 
                        title="Receita Líquida" 
                        value={formatCurrency(data.netRevenue)} 
                        subtext={getAV(data.netRevenue)}
                        icon={DollarSign}
                        colorClass="bg-blue-100 text-blue-600"
                    />
                    <KPICard 
                        title="Margem Contrib." 
                        value={formatCurrency(data.grossProfit)} 
                        subtext={getAV(data.grossProfit)}
                        icon={TrendingUp}
                        colorClass="bg-emerald-100 text-emerald-600"
                    />
                    <KPICard 
                        title="EBITDA" 
                        value={formatCurrency(data.ebitda)} 
                        subtext={getAV(data.ebitda)}
                        icon={PieChart}
                        colorClass="bg-purple-100 text-purple-600"
                    />
                    <KPICard 
                        title="Lucro Líquido" 
                        value={formatCurrency(data.netIncome)} 
                        subtext={getAV(data.netIncome)}
                        icon={data.netIncome >= 0 ? TrendingUp : AlertCircle}
                        colorClass={data.netIncome >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}
                    />
                </div>

                {/* 2. Demonstração Vertical Detalhada */}
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                    <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-widest">Relatório DRE {config.accountingMethod === 'CASH' ? '(Caixa)' : '(Competência)'}</h1>
                            <p className="text-xs text-slate-400 font-bold uppercase">{state.theme.restaurantName}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-400 font-mono">Período</p>
                            <p className="font-bold text-sm">{new Date(dateStart).toLocaleDateString()} a {new Date(dateEnd).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="p-10">
                        {/* SEÇÃO 1: RECEITA */}
                        {visibility.revenue && (
                            <>
                                <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <DollarSign size={14} /> 1. Receita e Deduções
                                </h3>
                                <Row label="(+) Receita Bruta de Vendas" value={data.grossRevenue} />
                                <Row label="    Vendas Mesas / Salão" value={data.saloonSales} indent />
                                <Row label="    Vendas Balcão / PDV" value={data.posSales} indent />
                                <Row label={`(-) Impostos (${config.taxRate}%)`} value={data.taxes} isNegative />
                                <Row label="(-) Taxas de Cartão / Recebimento" value={data.cardFees} isNegative />
                                <Row label="(=) RECEITA LÍQUIDA" value={data.netRevenue} type="total" />
                            </>
                        )}

                        {/* SEÇÃO 2: CMV */}
                        {visibility.cmv && (
                            <>
                                <h3 className="text-xs font-black text-orange-600 uppercase tracking-widest mb-4 mt-12 flex items-center gap-2">
                                    <TrendingDown size={14} /> 2. Custos Variáveis (CMV)
                                </h3>
                                <Row label="(-) Custo de Mercadoria Vendida" value={data.cmv} isNegative />
                                <Row label="(=) LUCRO BRUTO" value={data.grossProfit} type="total" />
                            </>
                        )}

                        {/* SEÇÃO 3: OPERACIONAIS */}
                        {visibility.expenses && (
                            <>
                                <h3 className="text-xs font-black text-purple-600 uppercase tracking-widest mb-4 mt-12 flex items-center gap-2">
                                    <FileText size={14} /> 3. Despesas Operacionais
                                </h3>
                                <Row label="(-) Pessoal / Folha" value={data.expenses.personnel} indent isNegative />
                                <Row label="(-) Fixas (Aluguel/Sistema)" value={data.expenses.fixed} indent isNegative />
                                <Row label="(-) Variáveis / Gerais" value={data.expenses.variable} indent isNegative />
                                
                                {/* Expansão Detalhada */}
                                <div className="pl-8 mt-2 border-l-2 border-gray-100 ml-4">
                                    {Object.entries(data.expenses.byCategory).map(([cat, val]: any) => {
                                        if (!['Pessoal', 'Salário', 'Pró-labore', 'Impostos', 'Taxas Bancárias', 'Aluguel', 'Internet', 'Sistema'].includes(cat)) {
                                            return <Row key={cat} label={`• ${cat}`} value={val} indent isNegative />;
                                        }
                                        return null;
                                    })}
                                </div>

                                <Row label="(=) EBITDA (Operacional)" value={data.ebitda} type="total" />
                            </>
                        )}

                        {/* SEÇÃO 4: RESULTADO */}
                        {visibility.financial && (
                            <>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 mt-12 flex items-center gap-2">
                                    <TrendingUp size={14} /> 4. Resultado Final
                                </h3>
                                <Row label="(-) Despesas Financeiras / Bancárias" value={data.expenses.financial} isNegative />
                                <Row label="(=) LUCRO LÍQUIDO FINAL" value={data.netIncome} type="total" />
                            </>
                        )}

                        {/* Banner de Resultado Final */}
                        <div className={`mt-16 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between border-4 ${data.netIncome >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                            <div className="text-center md:text-left mb-6 md:mb-0">
                                <h4 className={`text-2xl font-black uppercase tracking-tighter ${data.netIncome >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>{data.netIncome >= 0 ? 'Resultado Positivo' : 'Prejuízo Apurado'}</h4>
                                <p className="text-slate-500 font-medium">Lucro real após todas as baixas e despesas.</p>
                            </div>
                            <div className="text-center md:text-right">
                                <div className={`text-5xl font-black ${data.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>R$ {data.netIncome.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center p-20 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
                <PieChart size={64} className="mb-4 opacity-20"/>
                <h3 className="text-lg font-bold text-slate-600">Sem dados para exibir</h3>
                <p className="max-w-xs text-sm mt-2 mb-6">Nenhuma transação, venda ou despesa encontrada no período selecionado.</p>
                <Button onClick={fetchDRE} className="px-8">Recarregar Dados</Button>
            </div>
        )}
    </div>

    {/* CONTEÚDO EXCLUSIVO PARA IMPRESSÃO - FORÇA OVERLAY TOTAL */}
    <div className="hidden print:block fixed inset-0 z-[9999] bg-white w-full h-full p-0 m-0 overflow-visible">
        <DREReportPrint 
            data={data}
            dateStart={dateStart}
            dateEnd={dateEnd}
            businessInfo={state.businessInfo}
            theme={state.theme}
            config={config}
        />
    </div>
    </>
  );
};
