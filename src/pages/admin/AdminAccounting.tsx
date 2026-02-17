
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { 
    Loader2, RefreshCcw, Printer, Filter, Settings, 
    TrendingUp, TrendingDown, DollarSign, PieChart, 
    Calendar, ChevronDown, ChevronUp, AlertCircle, FileText
} from 'lucide-react';

export const AdminAccounting: React.FC = () => {
  const { state } = useRestaurant();
  const { showAlert } = useUI();
  const printRef = useRef<HTMLDivElement>(null);
  
  // --- ESTADOS ---
  const [dateStart, setDateStart] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]); 
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  // Configurações Contábeis
  const [config, setConfig] = useState({
      accountingMethod: 'COMPETENCE' as 'COMPETENCE' | 'CASH',
      taxRate: 6.0, // Simples Nacional (Estimado)
  });

  // Estado dos Dados
  const [dreData, setDreData] = useState({
      grossRevenue: 0,
      deductions: { taxes: 0, fees: 0, total: 0 },
      netRevenue: 0,
      cmv: 0,
      grossProfit: 0, // Margem de Contribuição
      expenses: { fixed: 0, variable: 0, personnel: 0, financial: 0, total: 0, byCategory: {} as Record<string, number> },
      ebitda: 0,
      netResult: 0,
      hasData: false
  });

  // --- BUSCA E CÁLCULO ---
  const fetchDRE = useCallback(async () => {
      if (!state.tenantId) return;
      setLoading(true);
      
      try {
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
              expensesQuery = expensesQuery.eq('is_paid', true).gte('paid_date', dateStart).lte('paid_date', dateEnd);
          } else {
              expensesQuery = expensesQuery.gte('due_date', dateStart).lte('due_date', dateEnd);
          }

          const { data: expsRes, error: expsErr } = await expensesQuery;
          if (expsErr) throw expsErr;

          // --- PROCESSAMENTO ---
          
          // Receita Bruta e Taxas de Cartão
          let grossRevenue = 0;
          let cardFees = 0;
          
          // Helper para taxas de cartão (busca do businessInfo ou usa fallback)
          const getFeeRate = (method: string) => {
              const methods = state.businessInfo?.paymentMethods || [];
              const matched = methods.find(m => m.type === method && m.isActive);
              return matched ? matched.feePercentage : (method === 'CREDIT' ? 3.99 : (method === 'DEBIT' ? 1.99 : 0));
          };

          transRes?.forEach((t: any) => {
              const amount = Number(t.amount) || 0;
              grossRevenue += amount;
              cardFees += amount * (getFeeRate(t.method) / 100);
          });

          // Impostos (Simples Nacional)
          const taxes = grossRevenue * (config.taxRate / 100);
          
          // Deduções Totais
          const deductionsTotal = taxes + cardFees;

          // Receita Líquida
          const netRevenue = grossRevenue - deductionsTotal;

          // CMV
          let cmv = 0;
          itemsRes?.forEach((item: any) => {
              cmv += (Number(item.quantity) * Number(item.product_cost_price));
          });

          // Lucro Bruto (Margem de Contribuição)
          const grossProfit = netRevenue - cmv;

          // Despesas Operacionais
          let expPersonnel = 0;
          let expFinancial = 0;
          let expOperational = 0;
          const expensesByCategory: Record<string, number> = {};

          expsRes?.forEach((e: any) => {
              const amount = Number(e.amount);
              const cat = e.category || 'Outros';
              
              expensesByCategory[cat] = (expensesByCategory[cat] || 0) + amount;

              if (['Pessoal', 'Salário', 'Pró-labore'].includes(cat)) expPersonnel += amount;
              else if (['Impostos', 'Taxas Bancárias', 'Juros'].includes(cat)) expFinancial += amount;
              else expOperational += amount;
          });

          const totalExpenses = expPersonnel + expFinancial + expOperational;
          const ebitda = grossProfit - expOperational - expPersonnel; // EBITDA aproximado
          const netResult = ebitda - expFinancial;

          setDreData({
              grossRevenue,
              deductions: { taxes, fees: cardFees, total: deductionsTotal },
              netRevenue,
              cmv,
              grossProfit,
              expenses: { 
                  personnel: expPersonnel, 
                  financial: expFinancial, 
                  variable: expOperational, // Tratando operacionais gerais como fixas/variáveis mistas por enquanto
                  fixed: 0,
                  total: totalExpenses,
                  byCategory: expensesByCategory
              },
              ebitda,
              netResult,
              hasData: grossRevenue > 0 || totalExpenses > 0
          });

      } catch (error) {
          console.error(error);
          showAlert({ title: 'Erro', message: 'Falha ao calcular DRE.', type: 'ERROR' });
      } finally {
          setLoading(false);
      }
  }, [state.tenantId, dateStart, dateEnd, config, state.businessInfo]);

  useEffect(() => { 
      if (state.tenantId) fetchDRE(); 
  }, [state.tenantId, fetchDRE]);

  // --- UTILS DE RENDERIZAÇÃO ---
  
  // Análise Vertical (AV%)
  const getAV = (value: number) => {
      if (dreData.grossRevenue === 0) return '0.0%';
      return `${((value / dreData.grossRevenue) * 100).toFixed(1)}%`;
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Componente de Linha do DRE
  const DreRow = ({ label, value, type = 'normal', indent = 0, isNegative = false }: any) => {
    const isHeader = type === 'header';
    const isResult = type === 'result';
    
    return (
      <div className={`flex justify-between items-center py-3 border-b border-gray-100 text-sm hover:bg-gray-50 transition-colors
          ${isHeader ? 'font-bold text-slate-800 bg-gray-50/50 mt-4' : 'text-slate-600'}
          ${isResult ? 'font-black text-base border-t-2 border-slate-200 bg-slate-50 mt-2' : ''}
          print:py-1 print:border-gray-200
      `}>
          <div className="flex-1 pl-4" style={{ paddingLeft: `${indent * 1.5}rem` }}>
              {label}
          </div>
          <div className="w-32 text-right font-mono font-medium">
              <span className={isNegative ? 'text-red-500' : (isResult && value > 0 ? 'text-emerald-600' : 'text-slate-800')}>
                  {isNegative && value > 0 ? '-' : ''} {formatCurrency(value)}
              </span>
          </div>
          <div className="w-20 text-right pr-4 font-mono text-xs text-slate-400">
              {getAV(value)}
          </div>
      </div>
    );
  };

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
    <div className="space-y-6 animate-fade-in pb-20 print:p-0 print:bg-white">
        
        {/* HEADER & CONTROLES (Oculto na Impressão) */}
        <div className="flex flex-col gap-4 print:hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <FileText className="text-blue-600"/> DRE Gerencial
                    </h2>
                    <p className="text-sm text-gray-500">Demonstração do Resultado do Exercício</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                     {/* Seletor de Data */}
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
                                <p className="text-[10px] text-gray-400 mt-1">Competência considera a data da venda. Caixa considera a data do recebimento/pagamento.</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3">Tributação</h4>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Alíquota Simples Nacional (%)</label>
                            <input type="number" step="0.1" className="w-full border p-2 rounded-lg text-sm font-bold bg-gray-50 focus:bg-white focus:border-blue-500 outline-none" value={config.taxRate} onChange={e => setConfig({...config, taxRate: parseFloat(e.target.value) || 0})} />
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* --- RELATÓRIO VISUAL --- */}
        {dreData.hasData ? (
            <div ref={printRef} className="print:w-full print:max-w-none space-y-6">
                
                {/* 1. Dashboard de KPIs (Executivo) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
                    <KPICard 
                        title="Receita Líquida" 
                        value={formatCurrency(dreData.netRevenue)} 
                        subtext={getAV(dreData.netRevenue)}
                        icon={DollarSign}
                        colorClass="bg-blue-100 text-blue-600"
                    />
                    <KPICard 
                        title="Margem Contrib." 
                        value={formatCurrency(dreData.grossProfit)} 
                        subtext={getAV(dreData.grossProfit)}
                        icon={TrendingUp}
                        colorClass="bg-emerald-100 text-emerald-600"
                    />
                    <KPICard 
                        title="EBITDA" 
                        value={formatCurrency(dreData.ebitda)} 
                        subtext={getAV(dreData.ebitda)}
                        icon={PieChart}
                        colorClass="bg-purple-100 text-purple-600"
                    />
                    <KPICard 
                        title="Lucro Líquido" 
                        value={formatCurrency(dreData.netResult)} 
                        subtext={getAV(dreData.netResult)}
                        icon={dreData.netResult >= 0 ? TrendingUp : AlertCircle}
                        colorClass={dreData.netResult >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}
                    />
                </div>

                {/* 2. Demonstração Vertical Detalhada (Papel A4 Style) */}
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden print:shadow-none print:border-2 print:border-black">
                    {/* Cabeçalho do Relatório */}
                    <div className="bg-slate-900 text-white p-6 print:bg-white print:text-black print:border-b-2 print:border-black flex justify-between items-center">
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-widest">Relatório DRE</h1>
                            <p className="text-xs text-slate-400 font-bold uppercase print:text-slate-600">{state.theme.restaurantName}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-400 font-mono print:text-black">Período</p>
                            <p className="font-bold text-sm">{new Date(dateStart).toLocaleDateString()} a {new Date(dateEnd).toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* Tabela */}
                    <div className="p-0">
                        {/* HEADER DA TABELA */}
                        <div className="flex justify-between items-center px-4 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
                            <span className="flex-1">Descrição</span>
                            <span className="w-32 text-right">Valor (R$)</span>
                            <span className="w-20 text-right pr-4">Análise (AV)</span>
                        </div>

                        {/* RECEITA */}
                        <DreRow label="(+) RECEITA OPERACIONAL BRUTA" value={dreData.grossRevenue} type="header" />
                        <DreRow label="Vendas de Mercadorias e Serviços" value={dreData.grossRevenue} indent={1} />
                        
                        {/* DEDUÇÕES */}
                        <DreRow label="(-) DEDUÇÕES DA RECEITA" value={dreData.deductions.total} type="header" isNegative />
                        <DreRow label="Impostos (Simples Nacional)" value={dreData.deductions.taxes} indent={1} isNegative />
                        <DreRow label="Taxas de Cartões / Meios de Pagto" value={dreData.deductions.fees} indent={1} isNegative />

                        <DreRow label="(=) RECEITA OPERACIONAL LÍQUIDA" value={dreData.netRevenue} type="result" />

                        {/* CMV */}
                        <DreRow label="(-) CUSTOS VARIÁVEIS (CMV)" value={dreData.cmv} type="header" isNegative />
                        <DreRow label="Custo das Mercadorias Vendidas" value={dreData.cmv} indent={1} isNegative />

                        <DreRow label="(=) MARGEM DE CONTRIBUIÇÃO (LUCRO BRUTO)" value={dreData.grossProfit} type="result" />

                        {/* DESPESAS */}
                        <DreRow label="(-) DESPESAS OPERACIONAIS" value={dreData.expenses.total} type="header" isNegative />
                        <DreRow label="Despesas com Pessoal" value={dreData.expenses.personnel} indent={1} isNegative />
                        <DreRow label="Despesas Gerais / Fixas" value={dreData.expenses.variable} indent={1} isNegative />
                        
                        {/* Detalhamento Expansível (Visualmente indentado) */}
                        {Object.entries(dreData.expenses.byCategory).map(([cat, val]) => {
                            if (!['Pessoal', 'Salário', 'Pró-labore', 'Impostos', 'Taxas Bancárias', 'Juros'].includes(cat)) {
                                return <DreRow key={cat} label={`• ${cat}`} value={val as number} indent={2} isNegative />;
                            }
                            return null;
                        })}

                        <DreRow label="(=) EBITDA (Res. Operacional)" value={dreData.ebitda} type="result" />

                        {/* FINANCEIRO */}
                        <DreRow label="(-) RESULTADO FINANCEIRO" value={dreData.expenses.financial} type="header" isNegative />
                        <DreRow label="Despesas Financeiras / Bancárias" value={dreData.expenses.financial} indent={1} isNegative />

                        {/* RESULTADO FINAL */}
                        <div className={`mt-6 p-4 flex justify-between items-center border-t-4 ${dreData.netResult >= 0 ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50'} print:bg-white print:border-black print:border-y-2`}>
                            <div className="pl-2">
                                <h3 className={`text-lg font-black uppercase tracking-tight ${dreData.netResult >= 0 ? 'text-emerald-800' : 'text-red-800'} print:text-black`}>
                                    (=) Resultado Líquido do Exercício
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">Lucro/Prejuízo Final</p>
                            </div>
                            <div className="text-right">
                                <div className={`text-2xl font-black font-mono ${dreData.netResult >= 0 ? 'text-emerald-600' : 'text-red-600'} print:text-black`}>
                                    {formatCurrency(dreData.netResult)}
                                </div>
                                <div className="text-sm font-bold text-slate-400">
                                    Margem Líquida: {getAV(dreData.netResult)}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Rodapé do Relatório */}
                    <div className="bg-slate-50 p-4 border-t border-slate-200 text-center text-[10px] text-slate-400 print:bg-white">
                        <p>Documento gerado eletronicamente pelo sistema GastroFlow em {new Date().toLocaleString()}.</p>
                        <p>Os valores apresentados são gerenciais e não substituem a contabilidade fiscal oficial.</p>
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
  );
};
