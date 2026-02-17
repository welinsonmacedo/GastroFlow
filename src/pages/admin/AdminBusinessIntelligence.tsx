
import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useOrder } from '../../context/OrderContext';
import { useInventory } from '../../context/InventoryContext';
import { 
    TrendingUp, AlertTriangle, Target, Calendar, 
    ArrowUpRight, ArrowDownRight, PieChart, BarChart3, 
    Zap, Award, TrendingDown, DollarSign, Activity, Filter
} from 'lucide-react';

export const AdminBusinessIntelligence: React.FC = () => {
    const { state: finState } = useFinance();
    const { state: orderState } = useOrder();
    const { state: invState } = useInventory(); // Mantido para futuras implementações se necessário

    const [activeTab, setActiveTab] = useState<'EXECUTIVE' | 'PRODUCTS' | 'FORECAST'>('EXECUTIVE');
    const [revenueGoal, setRevenueGoal] = useState(50000); 

    // --- FILTROS ---
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString()); // '0' a '11' ou 'ALL'

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
    const months = [
        { val: '0', label: 'Janeiro' }, { val: '1', label: 'Fevereiro' }, { val: '2', label: 'Março' },
        { val: '3', label: 'Abril' }, { val: '4', label: 'Maio' }, { val: '5', label: 'Junho' },
        { val: '6', label: 'Julho' }, { val: '7', label: 'Agosto' }, { val: '8', label: 'Setembro' },
        { val: '9', label: 'Outubro' }, { val: '10', label: 'Novembro' }, { val: '11', label: 'Dezembro' },
    ];

    // --- CÁLCULOS DE DADOS ---

    // 1. Dados Filtrados (Base para os cálculos)
    const filteredData = useMemo(() => {
        return finState.transactions.filter(t => {
            if (t.status === 'CANCELLED') return false;
            const d = new Date(t.timestamp);
            const matchYear = d.getFullYear() === selectedYear;
            const matchMonth = selectedMonth === 'ALL' ? true : d.getMonth() === parseInt(selectedMonth);
            return matchYear && matchMonth;
        });
    }, [finState.transactions, selectedYear, selectedMonth]);

    // 2. Histórico Anual (Para o gráfico de evolução)
    const annualHistory = useMemo(() => {
        const history = Array(12).fill(0);
        finState.transactions.forEach(t => {
            if (t.status !== 'CANCELLED' && new Date(t.timestamp).getFullYear() === selectedYear) {
                const month = new Date(t.timestamp).getMonth();
                history[month] += t.amount;
            }
        });
        return history;
    }, [finState.transactions, selectedYear]);

    // 3. Estatísticas Executivas
    const executiveStats = useMemo(() => {
        const grossRevenue = filteredData.reduce((acc, t) => acc + t.amount, 0);
        
        // Estimativa simples de deduções (Impostos + Taxas ~ 10%) para Faturamento Líquido
        // Em um cenário real, isso viria do AdminAccounting
        const estimatedDeductions = grossRevenue * 0.10; 
        const netRevenue = grossRevenue - estimatedDeductions;

        // CMV Estimado com base nos pedidos do período filtrado
        let estimatedCost = 0;
        
        // Precisamos filtrar as ordens que correspondem ao período selecionado
        const filteredOrders = orderState.orders.filter(o => {
            if (o.status === 'CANCELLED') return false;
            const d = new Date(o.timestamp);
            const matchYear = d.getFullYear() === selectedYear;
            const matchMonth = selectedMonth === 'ALL' ? true : d.getMonth() === parseInt(selectedMonth);
            return matchYear && matchMonth;
        });

        filteredOrders.forEach(o => {
            o.items.forEach(i => { estimatedCost += (i.productCostPrice * i.quantity); });
        });

        const cmvPercentage = grossRevenue > 0 ? (estimatedCost / grossRevenue) * 100 : 0;
        
        // Comparativo com período anterior (Mês passado se filtro for mês, ou ano passado se filtro for ALL)
        let prevRevenue = 0;
        if (selectedMonth !== 'ALL') {
            // Mês anterior
            const prevMonthDate = new Date(selectedYear, parseInt(selectedMonth) - 1, 1);
            prevRevenue = finState.transactions.filter(t => 
                t.status !== 'CANCELLED' && 
                new Date(t.timestamp).getMonth() === prevMonthDate.getMonth() &&
                new Date(t.timestamp).getFullYear() === prevMonthDate.getFullYear()
            ).reduce((acc, t) => acc + t.amount, 0);
        } else {
            // Ano anterior
            prevRevenue = finState.transactions.filter(t => 
                t.status !== 'CANCELLED' && 
                new Date(t.timestamp).getFullYear() === selectedYear - 1
            ).reduce((acc, t) => acc + t.amount, 0);
        }

        const growth = prevRevenue > 0 ? ((grossRevenue - prevRevenue) / prevRevenue) * 100 : 100;

        return { grossRevenue, netRevenue, prevRevenue, growth, cmvPercentage, estimatedCost };
    }, [filteredData, orderState.orders, selectedYear, selectedMonth, finState.transactions]);

    // 4. Ranking & ABC
    const productPerformance = useMemo(() => {
        const productStats: Record<string, { id: string, name: string, revenue: number, profit: number, qty: number }> = {};
        
        // Usa as ordens filtradas pelo período
        const filteredOrders = orderState.orders.filter(o => {
            if (o.status === 'CANCELLED' || !o.isPaid) return false;
            const d = new Date(o.timestamp);
            const matchYear = d.getFullYear() === selectedYear;
            const matchMonth = selectedMonth === 'ALL' ? true : d.getMonth() === parseInt(selectedMonth);
            return matchYear && matchMonth;
        });

        filteredOrders.forEach(o => {
            o.items.forEach(i => {
                if (!productStats[i.productId]) {
                    productStats[i.productId] = { 
                        id: i.productId, 
                        name: i.productName, 
                        revenue: 0, 
                        profit: 0, 
                        qty: 0 
                    };
                }
                const revenue = i.productPrice * i.quantity;
                const cost = i.productCostPrice * i.quantity;
                productStats[i.productId].revenue += revenue;
                productStats[i.productId].profit += (revenue - cost);
                productStats[i.productId].qty += i.quantity;
            });
        });

        let products = Object.values(productStats).sort((a, b) => b.revenue - a.revenue);
        const totalRevenue = products.reduce((acc, p) => acc + p.revenue, 0);
        
        // Classificação ABC
        let accumulatedRevenue = 0;
        return products.map(p => {
            accumulatedRevenue += p.revenue;
            const percentage = (accumulatedRevenue / totalRevenue) * 100;
            let abc = 'C';
            if (percentage <= 80) abc = 'A';
            else if (percentage <= 95) abc = 'B';
            
            // Margem unitária média
            const avgMargin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;

            return { ...p, abc, margin: avgMargin };
        });
    }, [orderState.orders, selectedYear, selectedMonth]);

    // 5. Previsão (Baseada no período filtrado)
    const efficiencyStats = useMemo(() => {
        // Mapa de vendas por dia da semana (0-6)
        const dayCounts: Record<number, number> = {0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0};
        const dayRevenues: Record<number, number> = {0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0};
        
        filteredData.forEach(t => {
            const day = new Date(t.timestamp).getDay();
            dayCounts[day]++;
            dayRevenues[day] += t.amount;
        });

        return { dayRevenues, dayCounts };
    }, [filteredData]);

    // Alertas Inteligentes
    const alerts = [];
    if (executiveStats.cmvPercentage > 35) alerts.push({ type: 'danger', msg: `CMV Crítico: ${executiveStats.cmvPercentage.toFixed(1)}% (Meta: <35%)` });
    if (executiveStats.growth < 0) alerts.push({ type: 'warning', msg: `Queda de receita: ${Math.abs(executiveStats.growth).toFixed(1)}% vs período anterior` });
    
    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header com Filtros */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Activity className="text-purple-600"/> Inteligência de Negócio</h2>
                    <p className="text-sm text-gray-500">Dashboards analíticos e previsões para tomada de decisão.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                        <Filter size={16} className="text-gray-400 ml-2"/>
                        <select 
                            className="bg-transparent text-sm font-bold text-slate-700 outline-none p-1 cursor-pointer"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        >
                            {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                            <option value="ALL">Ano Inteiro</option>
                        </select>
                        <div className="w-px h-4 bg-gray-300 mx-1"></div>
                        <select 
                            className="bg-transparent text-sm font-bold text-slate-700 outline-none p-1 cursor-pointer"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button onClick={() => setActiveTab('EXECUTIVE')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'EXECUTIVE' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>Executiva</button>
                        <button onClick={() => setActiveTab('PRODUCTS')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'PRODUCTS' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>Produtos</button>
                        <button onClick={() => setActiveTab('FORECAST')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'FORECAST' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>Previsão</button>
                    </div>
                </div>
            </div>

            {/* --- TAB: EXECUTIVA --- */}
            {activeTab === 'EXECUTIVE' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Alertas Inteligentes */}
                    {alerts.length > 0 && (
                        <div className="bg-white p-4 rounded-xl border-l-4 border-yellow-400 shadow-sm space-y-2">
                            <h4 className="text-xs font-black text-gray-500 uppercase flex items-center gap-2"><Zap size={14} className="text-yellow-500"/> Insights & Alertas</h4>
                            {alerts.map((alert, idx) => (
                                <div key={idx} className={`text-sm font-bold flex items-center gap-2 ${alert.type === 'danger' ? 'text-red-600' : 'text-orange-600'}`}>
                                    <AlertTriangle size={16}/> {alert.msg}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* KPIs Principais */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100">
                            <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">Faturamento Bruto</p>
                            <h3 className="text-2xl font-black text-slate-800">R$ {executiveStats.grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                            <p className="text-[10px] text-gray-400 mt-1 font-bold">Total de vendas confirmadas</p>
                        </div>
                        
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100">
                            <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-1">Faturamento Líquido (Est.)</p>
                            <h3 className="text-2xl font-black text-emerald-600">R$ {executiveStats.netRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                            <p className="text-[10px] text-gray-400 mt-1 font-bold">Após impostos/taxas estimados</p>
                        </div>

                        <div className={`p-5 rounded-2xl shadow-sm border ${executiveStats.cmvPercentage > 35 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
                            <p className={`text-xs font-black uppercase tracking-widest mb-1 ${executiveStats.cmvPercentage > 35 ? 'text-red-500' : 'text-gray-400'}`}>CMV Global</p>
                            <h3 className={`text-2xl font-black ${executiveStats.cmvPercentage > 35 ? 'text-red-600' : 'text-slate-800'}`}>{executiveStats.cmvPercentage.toFixed(1)}%</h3>
                            <p className="text-[10px] text-gray-400 mt-1 font-bold">Custo sobre venda</p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Crescimento</p>
                            <div className={`flex items-center gap-2 text-2xl font-black ${executiveStats.growth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {executiveStats.growth >= 0 ? <ArrowUpRight size={24}/> : <ArrowDownRight size={24}/>}
                                {Math.abs(executiveStats.growth).toFixed(1)}%
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1 font-bold">vs. período anterior</p>
                        </div>
                    </div>

                    {/* Gráfico de Histórico Anual */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                         <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-gray-700 flex items-center gap-2"><BarChart3 size={18} className="text-blue-500"/> Histórico de Vendas ({selectedYear})</h3>
                            <div className="text-xs font-bold text-gray-400">Total Anual: R$ {annualHistory.reduce((a, b) => a + b, 0).toLocaleString()}</div>
                         </div>
                         
                         <div className="h-48 flex items-end gap-2 md:gap-4">
                             {annualHistory.map((val, idx) => {
                                 const maxVal = Math.max(...annualHistory) || 1;
                                 const height = (val / maxVal) * 100;
                                 const isSelected = selectedMonth !== 'ALL' && parseInt(selectedMonth) === idx;
                                 
                                 return (
                                     <div key={idx} className="flex-1 flex flex-col items-center group relative">
                                         <div 
                                            className={`w-full max-w-[40px] rounded-t-lg transition-all duration-700 relative ${isSelected ? 'bg-blue-600' : 'bg-blue-100 hover:bg-blue-200'}`} 
                                            style={{ height: `${Math.max(height, 2)}%` }}
                                         >
                                             <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold">
                                                 R$ {val.toLocaleString()}
                                             </div>
                                         </div>
                                         <span className={`text-[10px] font-bold mt-2 uppercase ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>
                                             {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][idx]}
                                         </span>
                                     </div>
                                 )
                             })}
                         </div>
                    </div>

                    {/* Meta vs Realizado */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                        <div className="flex justify-between items-end mb-4 relative z-10">
                            <div>
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Meta Mensal</p>
                                <h3 className="text-3xl font-black text-slate-800">R$ {executiveStats.grossRevenue.toLocaleString()} <span className="text-sm text-gray-400 font-medium">/ R$ {revenueGoal.toLocaleString()}</span></h3>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => {
                                    const newGoal = prompt("Nova Meta de Faturamento:", revenueGoal.toString());
                                    if(newGoal) setRevenueGoal(parseFloat(newGoal));
                                }}>
                                    <Target size={14}/> Definir Meta
                                </div>
                            </div>
                        </div>
                        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden relative z-10">
                            <div 
                                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-1000 ease-out relative" 
                                style={{ width: `${Math.min((executiveStats.grossRevenue / revenueGoal) * 100, 100)}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-center mt-3 font-bold text-purple-600">
                            {((executiveStats.grossRevenue / revenueGoal) * 100).toFixed(1)}% da meta atingida
                        </p>
                    </div>
                </div>
            )}

            {/* --- TAB: PRODUTOS & MARGENS --- */}
            {activeTab === 'PRODUCTS' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Classe A (80% Faturamento)</h4>
                            <p className="text-3xl font-black text-blue-600">{productPerformance.filter(p => p.abc === 'A').length} <span className="text-sm text-gray-400 font-medium">produtos</span></p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-yellow-100 shadow-sm">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Classe B (15% Faturamento)</h4>
                            <p className="text-3xl font-black text-yellow-600">{productPerformance.filter(p => p.abc === 'B').length} <span className="text-sm text-gray-400 font-medium">produtos</span></p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Classe C (5% Faturamento)</h4>
                            <p className="text-3xl font-black text-slate-600">{productPerformance.filter(p => p.abc === 'C').length} <span className="text-sm text-gray-400 font-medium">produtos</span></p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700 flex items-center gap-2"><Award size={18} className="text-orange-500"/> Ranking de Lucratividade</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white text-gray-500 border-b">
                                    <tr>
                                        <th className="p-4 font-bold">Produto</th>
                                        <th className="p-4 font-bold text-center">Class. ABC</th>
                                        <th className="p-4 font-bold text-right">Vendas (R$)</th>
                                        <th className="p-4 font-bold text-right">Lucro Total</th>
                                        <th className="p-4 font-bold text-right">Margem %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {productPerformance.slice(0, 20).map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50">
                                            <td className="p-4">
                                                <div className="font-bold text-slate-800">{p.name}</div>
                                                <div className="text-xs text-gray-400">{p.qty} unidades vendidas</div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-black ${p.abc === 'A' ? 'bg-blue-100 text-blue-700' : p.abc === 'B' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    Classe {p.abc}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-mono text-slate-600">R$ {p.revenue.toFixed(2)}</td>
                                            <td className="p-4 text-right font-mono font-bold text-emerald-600">R$ {p.profit.toFixed(2)}</td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className={`text-xs font-bold ${p.margin > 50 ? 'text-emerald-500' : p.margin < 20 ? 'text-red-500' : 'text-yellow-600'}`}>{p.margin.toFixed(1)}%</span>
                                                    {p.margin < 20 && <TrendingDown size={14} className="text-red-400"/>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {productPerformance.length === 0 && (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nenhum dado de vendas no período selecionado.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: EFICIÊNCIA --- */}
            {activeTab === 'FORECAST' && (
                <div className="space-y-6 animate-fade-in">
                     {/* Previsão Semanal */}
                     <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-gray-700 flex items-center gap-2"><BarChart3 size={18} className="text-blue-500"/> Histórico de Demanda Semanal</h3>
                            <div className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold uppercase">
                                Base: {selectedMonth === 'ALL' ? selectedYear : `${months[parseInt(selectedMonth)].label}/${selectedYear}`}
                            </div>
                        </div>
                        
                        <div className="flex items-end justify-between h-64 gap-4 px-2">
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, idx) => {
                                const val = efficiencyStats.dayRevenues[idx] || 0;
                                const max = Math.max(...Object.values(efficiencyStats.dayRevenues)) || 1;
                                const height = (val / max) * 100;
                                
                                return (
                                    <div key={day} className="flex-1 flex flex-col items-center gap-3 group relative h-full justify-end">
                                        <div className="relative w-full flex flex-col justify-end h-full">
                                             <div className="text-xs font-bold text-slate-500 text-center mb-1 group-hover:text-blue-600 transition-colors">
                                                 {val > 0 ? `R$ ${val.toLocaleString('pt-BR', {notation: 'compact'})}` : ''}
                                             </div>
                                            <div 
                                                className={`w-full rounded-t-xl transition-all duration-1000 ${height > 0 ? (height > 80 ? 'bg-gradient-to-t from-blue-600 to-blue-400' : 'bg-gradient-to-t from-blue-200 to-blue-100') : 'bg-gray-50'}`} 
                                                style={{ height: `${Math.max(height, 2)}%` }}
                                            ></div>
                                        </div>
                                        <div className="bg-gray-50 w-full py-2 rounded-lg text-center">
                                            <span className="text-xs font-black text-gray-500 uppercase">{day}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-xs text-center text-gray-400 mt-6 italic bg-gray-50 p-2 rounded-lg inline-block mx-auto w-full">
                            Gráfico gerado com base no volume de vendas histórico do período selecionado. Use para planejar escalas e estoque.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
