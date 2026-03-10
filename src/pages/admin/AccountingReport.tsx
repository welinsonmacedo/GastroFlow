
import React, { useState, useEffect, useRef } from 'react';
import { useRestaurant } from '@/core/context/RestaurantContext';
import { supabase } from '@/core/api/supabaseClient';
import { Button } from '../../components/Button';
import { Printer, Download, FileText, Mail, Phone, RefreshCcw, ArrowRight, Filter } from 'lucide-react';

export const AccountingReport: React.FC = () => {
  const { state } = useRestaurant();
  const { businessInfo, theme } = state;
  const printRef = useRef<HTMLDivElement>(null);

  // Filtro de Data: Padrão do dia 1 do mês atual até hoje
  const [dateStart, setDateStart] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [preset, setPreset] = useState('THIS_MONTH');
  
  const [report, setReport] = useState<{
      incomes: { method: string; amount: number; count: number }[];
      expenses: { category: string; amount: number; count: number }[];
      totalIncome: number;
      totalExpense: number;
      periodStart: string;
      periodEnd: string;
  }>({ incomes: [], expenses: [], totalIncome: 0, totalExpense: 0, periodStart: '', periodEnd: '' });

  // Aplica filtros rápidos
  const applyPreset = (type: string) => {
      const now = new Date();
      let start = new Date();
      let end = new Date();

      switch (type) {
          case 'TODAY':
              // Start/End já são hoje
              break;
          case 'YESTERDAY':
              start.setDate(now.getDate() - 1);
              end.setDate(now.getDate() - 1);
              break;
          case 'THIS_MONTH':
              start = new Date(now.getFullYear(), now.getMonth(), 1);
              // End é hoje
              break;
          case 'LAST_MONTH':
              start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
              end = new Date(now.getFullYear(), now.getMonth(), 0); // Último dia do mês anterior
              break;
          case 'LAST_30':
              start.setDate(now.getDate() - 30);
              break;
          default:
              return; // Custom
      }
      
      setPreset(type);
      setDateStart(start.toISOString().split('T')[0]);
      setDateEnd(end.toISOString().split('T')[0]);
  };

  // Helper para formatar data sem problemas de fuso horário
  const formatDateSafe = (dateStr: string) => {
      if(!dateStr) return '-';
      const d = new Date(dateStr + 'T12:00:00'); 
      return d.toLocaleDateString();
  };

  const fetchReportData = async () => {
      if (!state.tenantId) return;
      setLoading(true);

      const startIso = dateStart + ' 00:00:00';
      const endIso = dateEnd + ' 23:59:59';

      try {
          // 1. Receitas
          const { data: transactions } = await supabase
              .from('transactions')
              .select('amount, method')
              .eq('tenant_id', state.tenantId)
              .gte('created_at', startIso)
              .lte('created_at', endIso)
              .neq('status', 'CANCELLED');

          const incomeMap: Record<string, { amount: number, count: number }> = {};
          let totalInc = 0;

          transactions?.forEach((t: any) => {
              const method = translateMethod(t.method);
              if (!incomeMap[method]) incomeMap[method] = { amount: 0, count: 0 };
              incomeMap[method].amount += t.amount;
              incomeMap[method].count += 1;
              totalInc += t.amount;
          });

          const incomes = Object.entries(incomeMap).map(([k, v]) => ({ method: k, ...v })).sort((a,b) => b.amount - a.amount);

          // 2. Despesas
          const { data: expenses } = await supabase
              .from('expenses')
              .select('amount, category')
              .eq('tenant_id', state.tenantId)
              .gte('paid_date', dateStart) 
              .lte('paid_date', dateEnd)
              .eq('is_paid', true);

          const expenseMap: Record<string, { amount: number, count: number }> = {};
          let totalExp = 0;

          expenses?.forEach((e: any) => {
              if (!expenseMap[e.category]) expenseMap[e.category] = { amount: 0, count: 0 };
              expenseMap[e.category].amount += e.amount;
              expenseMap[e.category].count += 1;
              totalExp += e.amount;
          });

          const expenseList = Object.entries(expenseMap).map(([k, v]) => ({ category: k, ...v })).sort((a,b) => b.amount - a.amount);

          setReport({
              incomes,
              expenses: expenseList,
              totalIncome: totalInc,
              totalExpense: totalExp,
              periodStart: formatDateSafe(dateStart),
              periodEnd: formatDateSafe(dateEnd)
          });

      } catch (error) {
          console.error("Erro ao gerar relatório", error);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchReportData();
  }, [state.tenantId]);

  const translateMethod = (method: string) => {
      const map: Record<string, string> = {
          'CREDIT': 'Cartão de Crédito',
          'DEBIT': 'Cartão de Débito',
          'PIX': 'PIX / Transferência',
          'CASH': 'Dinheiro (Espécie)',
          'MEAL_VOUCHER': 'Vale Refeição',
          'CARD': 'Cartão (Genérico)'
      };
      return map[method] || method;
  };

  const handlePrint = () => {
      window.print();
  };

  const handleExportCSV = () => {
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += `Relatorio Contabil - ${businessInfo.restaurantName || theme.restaurantName}\n`;
      csvContent += `Periodo: ${report.periodStart} a ${report.periodEnd}\n\n`;
      
      csvContent += "RECEITAS (ENTRADAS)\n";
      csvContent += "Metodo,Qtd Transacoes,Valor Total\n";
      report.incomes.forEach(row => {
          csvContent += `${row.method},${row.count},${row.amount.toFixed(2)}\n`;
      });
      csvContent += `TOTAL RECEITAS,,${report.totalIncome.toFixed(2)}\n\n`;

      csvContent += "DESPESAS (SAIDAS)\n";
      csvContent += "Categoria,Qtd Lancamentos,Valor Total\n";
      report.expenses.forEach(row => {
          csvContent += `${row.category},${row.count},${row.amount.toFixed(2)}\n`;
      });
      csvContent += `TOTAL DESPESAS,,${report.totalExpense.toFixed(2)}\n\n`;
      csvContent += `RESULTADO LIQUIDO,,${(report.totalIncome - report.totalExpense).toFixed(2)}\n`;

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `relatorio_contabil_${dateStart}_${dateEnd}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
        {/* Toolbar (Hidden on Print) */}
        <div className="bg-white border-b p-4 flex flex-col xl:flex-row justify-between items-center gap-4 print:hidden sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-4 w-full xl:w-auto">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 whitespace-nowrap"><FileText className="text-blue-600"/> Relatório Contábil</h2>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto overflow-x-auto">
                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 px-2 border-r border-gray-200 mr-1">
                        <Filter size={16} className="text-gray-400"/>
                        <select 
                            className="bg-transparent text-xs font-bold text-gray-600 outline-none cursor-pointer uppercase"
                            value={preset}
                            onChange={(e) => applyPreset(e.target.value)}
                        >
                            <option value="CUSTOM">Personalizado</option>
                            <option value="TODAY">Hoje</option>
                            <option value="YESTERDAY">Ontem</option>
                            <option value="THIS_MONTH">Este Mês</option>
                            <option value="LAST_MONTH">Mês Passado</option>
                            <option value="LAST_30">Últimos 30 dias</option>
                        </select>
                    </div>
                    <input type="date" className="bg-white border rounded px-2 py-1.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" value={dateStart} onChange={e => { setDateStart(e.target.value); setPreset('CUSTOM'); }} />
                    <ArrowRight size={14} className="text-gray-400"/>
                    <input type="date" className="bg-white border rounded px-2 py-1.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" value={dateEnd} onChange={e => { setDateEnd(e.target.value); setPreset('CUSTOM'); }} />
                    <button onClick={fetchReportData} disabled={loading} className="ml-1 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md transition-colors disabled:opacity-50 shadow-sm"><RefreshCcw size={16} className={loading ? "animate-spin" : ""}/></button>
                </div>

                <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleExportCSV} disabled={loading} size="sm" className="whitespace-nowrap"><Download size={16}/> <span className="hidden sm:inline">CSV</span></Button>
                    <Button onClick={handlePrint} disabled={loading} size="sm" className="whitespace-nowrap"><Printer size={16}/> <span className="hidden sm:inline">Imprimir</span></Button>
                </div>
            </div>
        </div>

        {/* Paper Container - Ajustado para impressão */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center print:overflow-visible print:h-auto print:block print:p-0 print:m-0">
            <div 
                ref={printRef}
                className="bg-white w-full max-w-[210mm] min-h-[297mm] p-[10mm] md:p-[20mm] shadow-xl print:shadow-none print:w-full print:max-w-none print:min-h-0 print:p-0 print:m-0 text-slate-900 print:absolute print:top-0 print:left-0 print:z-50"
            >
                {/* Cabeçalho Oficial */}
                <header className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-start">
                    <div className="flex gap-4">
                        {theme.logoUrl && <img src={theme.logoUrl} className="w-16 h-16 object-contain grayscale print:grayscale" alt="Logo" />}
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">{businessInfo.restaurantName || theme.restaurantName || 'Nome do Estabelecimento'}</h1>
                            <div className="text-sm text-slate-500 mt-1 space-y-0.5">
                                <p className="font-bold">CNPJ: {businessInfo.cnpj || 'Não Informado'}</p>
                                <p>{businessInfo.address?.street}, {businessInfo.address?.number} - {businessInfo.address?.city}/{businessInfo.address?.state}</p>
                                <div className="flex gap-4 mt-1 text-xs">
                                    {businessInfo.email && <span className="flex items-center gap-1"><Mail size={10}/> {businessInfo.email}</span>}
                                    {businessInfo.phone && <span className="flex items-center gap-1"><Phone size={10}/> {businessInfo.phone}</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Período de Apuração</div>
                        <div className="text-xl font-mono font-bold bg-slate-100 px-3 py-1 rounded border border-slate-200 print:bg-transparent print:border-none print:p-0">
                            {report.periodStart} <span className="text-slate-400 mx-1">até</span> {report.periodEnd}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">Emitido em: {new Date().toLocaleDateString()}</p>
                    </div>
                </header>

                <main className="space-y-8">
                    {/* Resumo */}
                    <section className="grid grid-cols-3 gap-4 mb-8">
                        <div className="p-4 border rounded-lg bg-gray-50 print:bg-white print:border-slate-300">
                            <span className="text-xs font-bold uppercase text-slate-500 print:text-black">Total Entradas</span>
                            <div className="text-2xl font-bold text-slate-900 print:text-black">R$ {report.totalIncome.toFixed(2)}</div>
                        </div>
                        <div className="p-4 border rounded-lg bg-gray-50 print:bg-white print:border-slate-300">
                            <span className="text-xs font-bold uppercase text-slate-500 print:text-black">Total Saídas</span>
                            <div className="text-2xl font-bold text-slate-900 print:text-black">R$ {report.totalExpense.toFixed(2)}</div>
                        </div>
                        <div className="p-4 border rounded-lg bg-slate-100 print:bg-white print:border-slate-800">
                            <span className="text-xs font-bold uppercase text-slate-900 print:text-black">Saldo do Período</span>
                            <div className="text-2xl font-bold text-slate-900 print:text-black">R$ {(report.totalIncome - report.totalExpense).toFixed(2)}</div>
                        </div>
                    </section>

                    {/* Tabela de Receitas */}
                    <section className="break-inside-avoid">
                        <h3 className="text-sm font-black uppercase border-b border-slate-300 pb-2 mb-4 flex items-center gap-2 print:border-black">
                            1. Detalhamento de Receitas (Faturamento)
                        </h3>
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase print:border-black print:text-black">
                                    <th className="py-2">Meio de Pagamento</th>
                                    <th className="py-2 text-right">Qtd. Transações</th>
                                    <th className="py-2 text-right">Valor Total (R$)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                                {report.incomes.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="py-3 font-medium text-slate-700 print:text-black">{item.method}</td>
                                        <td className="py-3 text-right text-slate-500 print:text-black">{item.count}</td>
                                        <td className="py-3 text-right font-bold text-slate-900 print:text-black">R$ {item.amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {report.incomes.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-gray-400 italic">Sem registros de receita no período.</td></tr>}
                            </tbody>
                            <tfoot className="border-t-2 border-slate-300 font-bold print:border-black">
                                <tr>
                                    <td className="py-3 uppercase text-xs">Total Receitas</td>
                                    <td className="py-3 text-right text-xs"></td>
                                    <td className="py-3 text-right">R$ {report.totalIncome.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </section>

                    {/* Tabela de Despesas */}
                    <section className="mt-8 break-inside-avoid">
                        <h3 className="text-sm font-black uppercase border-b border-slate-300 pb-2 mb-4 flex items-center gap-2 print:border-black">
                            2. Detalhamento de Despesas (Dedutíveis)
                        </h3>
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase print:border-black print:text-black">
                                    <th className="py-2">Categoria de Despesa</th>
                                    <th className="py-2 text-right">Qtd. Lançamentos</th>
                                    <th className="py-2 text-right">Valor Total (R$)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                                {report.expenses.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="py-3 font-medium text-slate-700 print:text-black">{item.category}</td>
                                        <td className="py-3 text-right text-slate-500 print:text-black">{item.count}</td>
                                        <td className="py-3 text-right font-bold text-slate-900 print:text-black">R$ {item.amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {report.expenses.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-gray-400 italic">Sem registros de despesas pagas no período.</td></tr>}
                            </tbody>
                            <tfoot className="border-t-2 border-slate-300 font-bold print:border-black">
                                <tr>
                                    <td className="py-3 uppercase text-xs">Total Despesas</td>
                                    <td className="py-3 text-right text-xs"></td>
                                    <td className="py-3 text-right">R$ {report.totalExpense.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </section>
                </main>

                <footer className="mt-16 border-t border-slate-200 pt-8 print:border-black">
                    <div className="flex justify-between items-end">
                        <div className="text-[10px] text-slate-400 max-w-md print:text-black">
                            <p className="font-bold uppercase mb-1">Declaração de Responsabilidade</p>
                            <p>Este relatório foi gerado eletronicamente pelo sistema ArloFlux com base nos lançamentos operacionais realizados pelo estabelecimento. Os valores aqui expressos servem como base para a apuração contábil, sujeitos à conferência dos extratos bancários e notas fiscais.</p>
                        </div>
                        <div className="text-center">
                            <div className="border-t border-black w-64 mb-2"></div>
                            <p className="text-xs font-bold uppercase">{businessInfo.ownerName || 'Assinatura do Responsável'}</p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    </div>
  );
};
