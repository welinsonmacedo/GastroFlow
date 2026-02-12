
import React, { useState, useEffect, useRef } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { Printer, Download, Calendar, Building2, FileText, Mail, Phone } from 'lucide-react';

export const AccountingReport: React.FC = () => {
  const { state } = useRestaurant();
  const { businessInfo, theme } = state;
  const printRef = useRef<HTMLDivElement>(null);

  // Default para o mês atual
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // Format YYYY-MM
  const [loading, setLoading] = useState(false);
  
  const [report, setReport] = useState<{
      incomes: { method: string; amount: number; count: number }[];
      expenses: { category: string; amount: number; count: number }[];
      totalIncome: number;
      totalExpense: number;
      periodStart: string;
      periodEnd: string;
  }>({ incomes: [], expenses: [], totalIncome: 0, totalExpense: 0, periodStart: '', periodEnd: '' });

  const fetchReportData = async () => {
      if (!state.tenantId) return;
      setLoading(true);

      // Calcular inicio e fim do mês selecionado
      const [year, mth] = month.split('-');
      const startDate = new Date(parseInt(year), parseInt(mth) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(mth), 0); // Ultimo dia do mês
      
      const startIso = startDate.toISOString().split('T')[0] + ' 00:00:00';
      const endIso = endDate.toISOString().split('T')[0] + ' 23:59:59';

      try {
          // 1. Receitas (Agrupadas por Método de Pagamento - Crucial para Contabilidade)
          const { data: transactions } = await supabase
              .from('transactions')
              .select('amount, method')
              .eq('tenant_id', state.tenantId)
              .gte('created_at', startIso)
              .lte('created_at', endIso);

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

          // 2. Despesas (Agrupadas por Categoria)
          const { data: expenses } = await supabase
              .from('expenses')
              .select('amount, category')
              .eq('tenant_id', state.tenantId)
              .gte('paid_date', startDate.toISOString().split('T')[0]) // Regime de Caixa para contabilidade geralmente
              .lte('paid_date', endDate.toISOString().split('T')[0])
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
              periodStart: startDate.toLocaleDateString(),
              periodEnd: endDate.toLocaleDateString()
          });

      } catch (error) {
          console.error("Erro ao gerar relatório", error);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchReportData();
  }, [month, state.tenantId]);

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
      link.setAttribute("download", `relatorio_contabil_${month}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
        {/* Toolbar (Hidden on Print) */}
        <div className="bg-white border-b p-4 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FileText className="text-blue-600"/> Relatório para Contabilidade</h2>
                <input 
                    type="month" 
                    className="border p-2 rounded-lg font-bold text-gray-700 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={month} 
                    onChange={e => setMonth(e.target.value)} 
                />
            </div>
            <div className="flex gap-2">
                <Button variant="secondary" onClick={handleExportCSV} disabled={loading}>
                    <Download size={18}/> <span className="hidden sm:inline">Baixar CSV</span>
                </Button>
                <Button onClick={handlePrint} disabled={loading}>
                    <Printer size={18}/> <span className="hidden sm:inline">Imprimir Relatório</span>
                </Button>
            </div>
        </div>

        {/* Paper Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
            <div 
                ref={printRef}
                className="bg-white w-full max-w-[210mm] min-h-[297mm] p-[10mm] md:p-[20mm] shadow-xl print:shadow-none print:w-full print:max-w-none print:p-0 print:m-0 text-slate-900"
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
                        <div className="text-xl font-mono font-bold bg-slate-100 px-3 py-1 rounded border border-slate-200">
                            {report.periodStart} <span className="text-slate-400 mx-1">até</span> {report.periodEnd}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">Emitido em: {new Date().toLocaleDateString()}</p>
                    </div>
                </header>

                <main className="space-y-8">
                    {/* Resumo */}
                    <section className="grid grid-cols-3 gap-4 mb-8">
                        <div className="p-4 border rounded-lg bg-gray-50 print:bg-white print:border-slate-300">
                            <span className="text-xs font-bold uppercase text-slate-500">Total Entradas</span>
                            <div className="text-2xl font-bold text-slate-900">R$ {report.totalIncome.toFixed(2)}</div>
                        </div>
                        <div className="p-4 border rounded-lg bg-gray-50 print:bg-white print:border-slate-300">
                            <span className="text-xs font-bold uppercase text-slate-500">Total Saídas</span>
                            <div className="text-2xl font-bold text-slate-900">R$ {report.totalExpense.toFixed(2)}</div>
                        </div>
                        <div className="p-4 border rounded-lg bg-slate-100 print:bg-white print:border-slate-800">
                            <span className="text-xs font-bold uppercase text-slate-900">Saldo do Período</span>
                            <div className="text-2xl font-bold text-slate-900">R$ {(report.totalIncome - report.totalExpense).toFixed(2)}</div>
                        </div>
                    </section>

                    {/* Tabela de Receitas */}
                    <section>
                        <h3 className="text-sm font-black uppercase border-b border-slate-300 pb-2 mb-4 flex items-center gap-2">
                            1. Detalhamento de Receitas (Faturamento)
                        </h3>
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase">
                                    <th className="py-2">Meio de Pagamento</th>
                                    <th className="py-2 text-right">Qtd. Transações</th>
                                    <th className="py-2 text-right">Valor Total (R$)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {report.incomes.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="py-3 font-medium text-slate-700">{item.method}</td>
                                        <td className="py-3 text-right text-slate-500">{item.count}</td>
                                        <td className="py-3 text-right font-bold text-slate-900">R$ {item.amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {report.incomes.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-gray-400 italic">Sem registros de receita no período.</td></tr>}
                            </tbody>
                            <tfoot className="border-t-2 border-slate-300 font-bold">
                                <tr>
                                    <td className="py-3 uppercase text-xs">Total Receitas</td>
                                    <td className="py-3 text-right text-xs"></td>
                                    <td className="py-3 text-right">R$ {report.totalIncome.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </section>

                    {/* Tabela de Despesas */}
                    <section className="mt-8">
                        <h3 className="text-sm font-black uppercase border-b border-slate-300 pb-2 mb-4 flex items-center gap-2">
                            2. Detalhamento de Despesas (Dedutíveis)
                        </h3>
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase">
                                    <th className="py-2">Categoria de Despesa</th>
                                    <th className="py-2 text-right">Qtd. Lançamentos</th>
                                    <th className="py-2 text-right">Valor Total (R$)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {report.expenses.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="py-3 font-medium text-slate-700">{item.category}</td>
                                        <td className="py-3 text-right text-slate-500">{item.count}</td>
                                        <td className="py-3 text-right font-bold text-slate-900">R$ {item.amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {report.expenses.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-gray-400 italic">Sem registros de despesas pagas no período.</td></tr>}
                            </tbody>
                            <tfoot className="border-t-2 border-slate-300 font-bold">
                                <tr>
                                    <td className="py-3 uppercase text-xs">Total Despesas</td>
                                    <td className="py-3 text-right text-xs"></td>
                                    <td className="py-3 text-right">R$ {report.totalExpense.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </section>
                </main>

                <footer className="mt-16 border-t border-slate-200 pt-8">
                    <div className="flex justify-between items-end">
                        <div className="text-[10px] text-slate-400 max-w-md">
                            <p className="font-bold uppercase mb-1">Declaração de Responsabilidade</p>
                            <p>Este relatório foi gerado eletronicamente pelo sistema GastroFlow com base nos lançamentos operacionais realizados pelo estabelecimento. Os valores aqui expressos servem como base para a apuração contábil, sujeitos à conferência dos extratos bancários e notas fiscais.</p>
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
