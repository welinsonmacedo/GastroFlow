
import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useUI } from '../../context/UIContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { 
    FileText, Download, Printer, Calendar, 
    ArrowUpCircle, ArrowDownCircle, Package, RefreshCcw, 
    Search, ListPlus 
} from 'lucide-react';
import { printHtml, getReportStyles } from '../../utils/printHelper';

type ReportTab = 'REVENUE' | 'EXPENSES' | 'FINANCE' | 'INVENTORY';

export const AdminReports: React.FC = () => {
    const { state } = useRestaurant();
    const { showAlert } = useUI();

    // Filtros
    const [dateStart, setDateStart] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
    const [dateEnd, setDateEnd] = useState(new Date().toISOString().split('T')[0]);
    const [activeTab, setActiveTab] = useState<ReportTab>('REVENUE');
    const [isDetailed, setIsDetailed] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Dados
    const [data, setData] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>({});

    const fetchData = async () => {
        if (!state.tenantId) return;
        setLoading(true);
        setData([]);
        setSummary({});

        const start = `${dateStart} 00:00:00`;
        const end = `${dateEnd} 23:59:59`;

        try {
            if (activeTab === 'REVENUE') {
                const { data: trans, error } = await supabase.from('transactions').select('*').eq('tenant_id', state.tenantId).gte('created_at', start).lte('created_at', end).neq('status', 'CANCELLED').order('created_at', { ascending: false });
                if (error) throw error;
                const mappedData = (trans || []).map((t: any) => ({ ...t, amount: Number(t.amount) || 0 }));
                setData(mappedData);
                setSummary({ total: mappedData.reduce((acc, t) => acc + t.amount, 0), count: mappedData.length });
            }
            else if (activeTab === 'EXPENSES') {
                const { data: exps, error } = await supabase.from('expenses').select('*').eq('tenant_id', state.tenantId).gte('due_date', dateStart).lte('due_date', dateEnd).order('due_date', { ascending: false });
                if (error) throw error;
                const mappedData = (exps || []).map((e: any) => ({ ...e, amount: Number(e.amount) || 0 }));
                setData(mappedData);
                setSummary({ total: mappedData.reduce((acc, e) => acc + e.amount, 0), paid: mappedData.filter((e: any) => e.is_paid).reduce((acc, e) => acc + e.amount, 0), pending: mappedData.filter((e: any) => !e.is_paid).reduce((acc, e) => acc + e.amount, 0) });
            }
            else if (activeTab === 'FINANCE') {
                const { data: exps } = await supabase.from('expenses').select('paid_date, amount, description, category').eq('tenant_id', state.tenantId).eq('is_paid', true).gte('paid_date', dateStart).lte('paid_date', dateEnd);
                const expenseItems = (exps || []).map((e: any) => ({ date: e.paid_date, type: 'OUT', description: `[DESPESA] ${e.description}`, details: e.category, amount: Number(e.amount) || 0, qty: 1 }));
                let incomeItems = [];
                if (isDetailed) {
                    const { data: items } = await supabase.from('order_items').select(`created_at, product_name, product_price, quantity, orders!inner(customer_name, is_paid, status)`).eq('tenant_id', state.tenantId).eq('orders.is_paid', true).neq('orders.status', 'CANCELLED').gte('created_at', start).lte('created_at', end);
                    incomeItems = (items || []).map((i: any) => ({ date: i.created_at, type: 'IN', description: i.product_name, details: i.orders?.customer_name || 'Consumidor', amount: (Number(i.product_price) * Number(i.quantity)) || 0, qty: Number(i.quantity) || 0 }));
                } else {
                    const { data: trans } = await supabase.from('transactions').select('created_at, amount, method, items_summary').eq('tenant_id', state.tenantId).gte('created_at', start).lte('created_at', end).neq('status', 'CANCELLED');
                    incomeItems = (trans || []).map((t: any) => ({ date: t.created_at, type: 'IN', description: `Venda (${t.method})`, details: t.items_summary || '', amount: Number(t.amount) || 0, qty: 1 }));
                }
                const flow = [...incomeItems, ...expenseItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setData(flow);
                const totalIn = flow.filter(i => i.type === 'IN').reduce((acc, i) => acc + i.amount, 0);
                const totalOut = flow.filter(i => i.type === 'OUT').reduce((acc, i) => acc + i.amount, 0);
                setSummary({ totalIn, totalOut, balance: totalIn - totalOut });
            }
            else if (activeTab === 'INVENTORY') {
                const { data: logs, error } = await supabase.from('inventory_logs').select('*, inventory_items(name, unit)').eq('tenant_id', state.tenantId).gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false });
                if (error) throw error;
                const formattedLogs = logs?.map((l: any) => ({ ...l, quantity: Number(l.quantity) || 0, itemName: l.inventory_items?.name || 'Item Removido', unit: l.inventory_items?.unit || '-' }));
                setData(formattedLogs || []);
            }
        } catch (error) {
            console.error(error);
            showAlert({ title: "Erro", message: "Falha ao carregar relatório.", type: "ERROR" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [activeTab, state.tenantId, isDetailed]);

    const handleExportCSV = () => {
        if (data.length === 0) return showAlert({ title: "Vazio", message: "Sem dados para exportar.", type: "WARNING" });
        let headers = "", rows = "";
        if (activeTab === 'REVENUE') { headers = "Data;Metodo;Resumo;Valor\n"; rows = data.map(i => `${new Date(i.created_at).toLocaleString()};${i.method};${i.items_summary};${i.amount.toFixed(2).replace('.', ',')}`).join("\n"); }
        else if (activeTab === 'EXPENSES') { headers = "Vencimento;Descricao;Categoria;Valor;Status\n"; rows = data.map(i => `${new Date(i.due_date).toLocaleDateString()};${i.description};${i.category};${i.amount.toFixed(2).replace('.', ',')};${i.is_paid ? 'PAGO' : 'PENDENTE'}`).join("\n"); }
        else if (activeTab === 'FINANCE') { headers = "Data;Tipo;Descricao;Detalhes;Valor\n"; rows = data.map(i => `${new Date(i.date).toLocaleString()};${i.type};${i.description};${i.details};${i.amount.toFixed(2).replace('.', ',')}`).join("\n"); }
        else if (activeTab === 'INVENTORY') { headers = "Data;Item;Operacao;Qtd;Motivo\n"; rows = data.map(i => `${new Date(i.created_at).toLocaleString()};${i.itemName};${i.type};${i.quantity};${i.reason}`).join("\n"); }
        const encodedUri = encodeURI("data:text/csv;charset=utf-8," + headers + rows);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `relatorio_${activeTab}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        if (data.length === 0) return showAlert({ title: "Vazio", message: "Sem dados para imprimir.", type: "WARNING" });

        let tableRows = '';
        data.forEach(item => {
            if (activeTab === 'REVENUE') {
                tableRows += `<tr><td>${new Date(item.created_at).toLocaleString()}</td><td>${item.items_summary}</td><td>${item.method}</td><td class="text-right">R$ ${item.amount.toFixed(2)}</td></tr>`;
            } else if (activeTab === 'EXPENSES') {
                tableRows += `<tr><td>${new Date(item.due_date).toLocaleDateString()}</td><td>${item.description}</td><td>${item.category}</td><td class="text-right">R$ ${item.amount.toFixed(2)}</td></tr>`;
            } else if (activeTab === 'FINANCE') {
                tableRows += `<tr><td>${new Date(item.date).toLocaleString()}</td><td>${item.description}</td><td>${item.type}</td><td class="text-right">R$ ${item.amount.toFixed(2)}</td></tr>`;
            } else if (activeTab === 'INVENTORY') {
                tableRows += `<tr><td>${new Date(item.created_at).toLocaleString()}</td><td>${item.itemName}</td><td>${item.type}</td><td class="text-right">${item.quantity} ${item.unit}</td></tr>`;
            }
        });

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Relatório ${activeTab}</title>
                ${getReportStyles()}
            </head>
            <body>
                <h1>Relatório: ${activeTab}</h1>
                <h2>Período: ${new Date(dateStart).toLocaleDateString()} a ${new Date(dateEnd).toLocaleDateString()}</h2>
                <table>
                    <thead>
                        <tr>
                            ${activeTab === 'REVENUE' ? '<th>Data</th><th>Resumo</th><th>Método</th><th class="text-right">Valor</th>' : ''}
                            ${activeTab === 'EXPENSES' ? '<th>Vencimento</th><th>Descrição</th><th>Categoria</th><th class="text-right">Valor</th>' : ''}
                            ${activeTab === 'FINANCE' ? '<th>Data</th><th>Descrição</th><th>Tipo</th><th class="text-right">Valor</th>' : ''}
                            ${activeTab === 'INVENTORY' ? '<th>Data</th><th>Item</th><th>Operação</th><th class="text-right">Qtd</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </body>
            </html>
        `;
        printHtml(html);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header e Filtros */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 print:hidden">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            <FileText className="text-blue-600"/> Relatórios Gerenciais
                        </h2>
                        <p className="text-sm text-gray-500">Extração de dados analíticos para contabilidade e gestão.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                            <Download size={18}/> Excel / CSV
                        </Button>
                        <Button variant="secondary" onClick={handlePrint} className="flex items-center gap-2">
                            <Printer size={18}/> PDF / Imprimir
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                    {/* Abas */}
                    <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
                        <button onClick={() => { setActiveTab('REVENUE'); setIsDetailed(false); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'REVENUE' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                            <ArrowUpCircle size={14}/> Faturamento
                        </button>
                        <button onClick={() => { setActiveTab('EXPENSES'); setIsDetailed(false); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'EXPENSES' ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                            <ArrowDownCircle size={14}/> Despesas
                        </button>
                        <button onClick={() => setActiveTab('FINANCE')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'FINANCE' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                            <RefreshCcw size={14}/> Mov. Financeira
                        </button>
                        <button onClick={() => { setActiveTab('INVENTORY'); setIsDetailed(false); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'INVENTORY' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                            <Package size={14}/> Estoque
                        </button>
                    </div>

                    {/* Datas e Opções */}
                    <div className="flex flex-col md:flex-row gap-3 items-center">
                        {activeTab === 'FINANCE' && (
                            <label className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer border transition-all ${isDetailed ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                <input type="checkbox" className="hidden" checked={isDetailed} onChange={e => setIsDetailed(e.target.checked)} />
                                <ListPlus size={16}/> Detalhar Itens & Clientes
                            </label>
                        )}

                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                            <Calendar size={18} className="text-gray-400 ml-1"/>
                            <input type="date" className="bg-transparent text-sm font-bold text-slate-700 outline-none" value={dateStart} onChange={e => setDateStart(e.target.value)} />
                            <span className="text-gray-400 font-bold">até</span>
                            <input type="date" className="bg-transparent text-sm font-bold text-slate-700 outline-none" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
                            <button onClick={fetchData} className="ml-2 bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-700 transition-colors">
                                <Search size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Resumos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
                {activeTab === 'REVENUE' && (
                    <>
                        <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100"><p className="text-xs font-black text-blue-400 uppercase">Receita Total</p><p className="text-3xl font-black text-blue-700">R$ {summary.total?.toFixed(2)}</p></div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-200"><p className="text-xs font-black text-gray-400 uppercase">Transações</p><p className="text-3xl font-black text-slate-700">{summary.count}</p></div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-200"><p className="text-xs font-black text-gray-400 uppercase">Ticket Médio</p><p className="text-3xl font-black text-slate-700">R$ {(summary.count > 0 ? summary.total / summary.count : 0).toFixed(2)}</p></div>
                    </>
                )}
                {activeTab === 'EXPENSES' && (
                    <>
                        <div className="bg-red-50 p-5 rounded-2xl border border-red-100"><p className="text-xs font-black text-red-400 uppercase">Total Despesas</p><p className="text-3xl font-black text-red-700">R$ {summary.total?.toFixed(2)}</p></div>
                        <div className="bg-green-50 p-5 rounded-2xl border border-green-100"><p className="text-xs font-black text-green-600 uppercase">Pago</p><p className="text-3xl font-black text-green-700">R$ {summary.paid?.toFixed(2)}</p></div>
                        <div className="bg-yellow-50 p-5 rounded-2xl border border-yellow-100"><p className="text-xs font-black text-yellow-600 uppercase">Pendente</p><p className="text-3xl font-black text-yellow-700">R$ {summary.pending?.toFixed(2)}</p></div>
                    </>
                )}
                {activeTab === 'FINANCE' && (
                    <>
                        <div className="bg-green-50 p-5 rounded-2xl border border-green-100"><p className="text-xs font-black text-green-600 uppercase">Entradas</p><p className="text-3xl font-black text-green-700">R$ {(summary.totalIn || 0).toFixed(2)}</p></div>
                        <div className="bg-red-50 p-5 rounded-2xl border border-red-100"><p className="text-xs font-black text-red-400 uppercase">Saídas</p><p className="text-3xl font-black text-red-700">R$ {(summary.totalOut || 0).toFixed(2)}</p></div>
                        <div className={`p-5 rounded-2xl border ${summary.balance >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}><p className="text-xs font-black uppercase opacity-60">Saldo Líquido</p><p className={`text-3xl font-black ${summary.balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>R$ {(summary.balance || 0).toFixed(2)}</p></div>
                    </>
                )}
            </div>

            {/* Tabela de Dados */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden print:shadow-none print:border-black">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900 text-white uppercase text-xs font-bold tracking-widest print:bg-white print:text-black print:border-b-2 print:border-black">
                            <tr>
                                <th className="p-4">Data</th>
                                {activeTab === 'REVENUE' && <><th className="p-4">Resumo</th><th className="p-4">Método</th><th className="p-4 text-right">Valor</th></>}
                                {activeTab === 'EXPENSES' && <><th className="p-4">Descrição</th><th className="p-4">Categoria</th><th className="p-4">Status</th><th className="p-4 text-right">Valor</th></>}
                                {activeTab === 'FINANCE' && <><th className="p-4">Descrição</th><th className="p-4 text-center">Tipo</th><th className="p-4 text-right">Valor</th></>}
                                {activeTab === 'INVENTORY' && <><th className="p-4">Item</th><th className="p-4">Motivo</th><th className="p-4 text-center">Tipo</th><th className="p-4 text-right">Qtd</th></>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 print:divide-gray-300">
                            {data.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors print:hover:bg-transparent">
                                    <td className="p-4 font-mono text-slate-500 print:text-black">
                                        {activeTab === 'REVENUE' || activeTab === 'INVENTORY' 
                                            ? new Date(item.created_at).toLocaleString() 
                                            : activeTab === 'FINANCE' ? new Date(item.date).toLocaleString() 
                                            : new Date(item.due_date).toLocaleDateString()}
                                    </td>
                                    {activeTab === 'REVENUE' && (<><td className="p-4 font-medium">{item.items_summary}</td><td className="p-4"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-blue-100">{item.method}</span></td><td className="p-4 text-right font-bold text-slate-700">R$ {item.amount.toFixed(2)}</td></>)}
                                    {activeTab === 'EXPENSES' && (<><td className="p-4 font-medium">{item.description}</td><td className="p-4 text-slate-500">{item.category}</td><td className="p-4">{item.is_paid ? <span className="text-green-600 font-bold text-xs">PAGO</span> : <span className="text-yellow-600 font-bold text-xs">PENDENTE</span>}</td><td className="p-4 text-right font-bold text-red-600">- R$ {item.amount.toFixed(2)}</td></>)}
                                    {activeTab === 'FINANCE' && (<><td className="p-4 font-medium">{item.description}</td><td className="p-4 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${item.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.type === 'IN' ? 'ENTRADA' : 'SAÍDA'}</span></td><td className={`p-4 text-right font-bold ${item.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>{item.type === 'OUT' ? '- ' : ''} R$ {(item.amount || 0).toFixed(2)}</td></>)}
                                    {activeTab === 'INVENTORY' && (<><td className="p-4 font-bold text-slate-700">{item.itemName}</td><td className="p-4 text-slate-500 text-xs italic">{item.reason}</td><td className="p-4 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${item.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.type === 'IN' ? 'Entrada' : 'Saída'}</span></td><td className="p-4 text-right font-mono font-bold">{item.quantity} {item.unit}</td></>)}
                                </tr>
                            ))}
                            {data.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-gray-400">Nenhum registro encontrado no período.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
