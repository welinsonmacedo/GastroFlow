
import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useOrder } from '../../context/OrderContext';
import { useInventory } from '../../context/InventoryContext';
import { useMenu } from '../../context/MenuContext';
import { 
    TrendingUp, AlertTriangle, Target, Calendar, 
    ArrowUpRight, ArrowDownRight, PieChart, BarChart3, 
    Zap, Award, TrendingDown, DollarSign, Activity 
} from 'lucide-react';

export const AdminBusinessIntelligence: React.FC = () => {
    const { state: finState } = useFinance();
    const { state: orderState } = useOrder();
    const { state: invState } = useInventory();
    const { state: menuState } = useMenu();

    const [activeTab, setActiveTab] = useState<'EXECUTIVE' | 'PRODUCTS' | 'FORECAST'>('EXECUTIVE');
    const [revenueGoal, setRevenueGoal] = useState(50000); // Meta padrão (pode virar config no banco)

    // --- CÁLCULOS DE DADOS ---

    // 1. Visão Executiva
    const currentMonthStats = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        const currentTrans = finState.transactions.filter(t => 
            t.status !== 'CANCELLED' && new Date(t.timestamp) >= startOfMonth
        );
        
        const lastMonthTrans = finState.transactions.filter(t => 
            t.status !== 'CANCELLED' && 
            new Date(t.timestamp) >= startOfLastMonth && 
            new Date(t.timestamp) <= endOfLastMonth
        );

        const currentRevenue = currentTrans.reduce((acc, t) => acc + t.amount, 0);
        const lastMonthRevenue = lastMonthTrans.reduce((acc, t) => acc + t.amount, 0);
        
        // CMV Estimado (Custo dos itens vendidos este mês)
        // Nota: Em produção real, isso viria de uma query agregada do banco
        let estimatedCost = 0;
        orderState.orders.forEach(o => {
            if (new Date(o.timestamp) >= startOfMonth && o.status !== 'CANCELLED') {
                o.items.forEach(i => { estimatedCost += (i.productCostPrice * i.quantity); });
            }
        });

        const cmvPercentage = currentRevenue > 0 ? (estimatedCost / currentRevenue) * 100 : 0;
        const growth = lastMonthRevenue > 0 ? ((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 100;

        return { currentRevenue, lastMonthRevenue, growth, cmvPercentage, estimatedCost };
    }, [finState.transactions, orderState.orders]);

    // 2. Ranking & ABC
    const productPerformance = useMemo(() => {
        const productStats: Record<string, { id: string, name: string, revenue: number, profit: number, qty: number }> = {};
        
        // Analisa histórico de pedidos (pode ser limitado a 30/90 dias)
        orderState.orders.forEach(o => {
            if (o.status !== 'CANCELLED' && o.isPaid) {
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
            }
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
    }, [orderState.orders]);

    // 3. Previsão & Desperdício
    const efficiencyStats = useMemo(() => {
        // Mapa de vendas por dia da semana (0-6)
        const dayCounts: Record<number, number> = {0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0};
        const dayRevenues: Record<number, number> = {0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0};
        
        finState.transactions.forEach(t => {
            if (t.status !== 'CANCELLED') {
                const day = new Date(t.timestamp).getDay();
                dayCounts[day]++;
                dayRevenues[day] += t.amount;
            }
        });

        // Logs de Perda (Desperdício)
        const wasteLogs = invState.inventoryLogs.filter(l => l.type === 'LOSS');
        const wasteTotalValue = wasteLogs.reduce((acc, log) => {
            const item = invState.inventory.find(i => i.id === log.item_id);
            return acc + (log.quantity * (item?.costPrice || 0));
        }, 0);

        // Top ingredientes desperdiçados
        const topWasteItems: Record<string, number> = {};
        wasteLogs.forEach(log => {
            const item = invState.inventory.find(i => i.id === log.item_id);
            if(item) {
                topWasteItems[item.name] = (topWasteItems[item.name] || 0) + log.quantity;
            }
        });

        return { dayRevenues, wasteTotalValue, topWasteItems };
    }, [finState.transactions, invState.inventoryLogs, invState.inventory]);

    // Alertas Inteligentes
    const alerts = [];
    if (currentMonthStats.cmvPercentage > 35) alerts.push({ type: 'danger', msg: `CMV Crítico: ${currentMonthStats.cmvPercentage.toFixed(1)}% (Meta: <35%)` });
    if (currentMonthStats.growth < 0) alerts.push({ type: 'warning', msg: `Queda de receita: ${Math.abs(currentMonthStats.growth).toFixed(1)}% vs mês anterior` });
    if (efficiencyStats.wasteTotalValue > 500) alerts.push({ type: 'warning', msg: `Desperdício alto: R$ ${efficiencyStats.wasteTotalValue.toFixed(2)} registrados como perda` });

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Activity className="text-purple-600"/> Inteligência de Negócio</h2>
                    <p className="text-sm text-gray-500">Dashboards analíticos e previsões para tomada de decisão.</p>
                </div>
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    <button onClick={() => setActiveTab('EXECUTIVE')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'EXECUTIVE' ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}>Visão Executiva</button>
                    <button onClick={() => setActiveTab('PRODUCTS')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'PRODUCTS' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}>Produtos & Margens</button>
                    <button onClick={() => setActiveTab('FORECAST')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'FORECAST' ? 'bg-orange-50 text-orange-700' : 'text-gray-500 hover:bg-gray-50'}`}>Eficiência & Previsão</button>
                </div>
            </header>

            {/* --- TAB: EXECUTIVA --- */}
            {activeTab === 'EXECUTIVE' && (
                <div className="space-y-6">
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

                    {/* Meta vs Realizado */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                        <div className="flex justify-between items-end mb-4 relative z-10">
                            <div>
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Faturamento Atual (Mês)</p>
                                <h3 className="text-4xl font-black text-slate-800">R$ {currentMonthStats.currentRevenue.toFixed(2)}</h3>
                            </div>
                            <div className="text-right">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Meta: R$ {revenueGoal.toLocaleString()}</p>
                                <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600 cursor-pointer hover:bg-gray-200" onClick={() => {
                                    const newGoal = prompt("Nova Meta de Faturamento:", revenueGoal.toString());
                                    if(newGoal) setRevenueGoal(parseFloat(newGoal));
                                }}>
                                    <Target size={12}/> Alterar Meta
                                </div>
                            </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden relative z-10">
                            <div 
                                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-1000 ease-out relative" 
                                style={{ width: `${Math.min((currentMonthStats.currentRevenue / revenueGoal) * 100, 100)}%` }}
                            >
                                <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white opacity-50"></div>
                            </div>
                        </div>
                        <p className="text-xs text-center mt-2 font-bold text-purple-600">
                            {((currentMonthStats.currentRevenue / revenueGoal) * 100).toFixed(1)}% da meta atingida
                        </p>
                        
                        {/* Background Decorator */}
                        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-purple-50 rounded-full blur-3xl z-0"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Comparativo Mensal */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <h4 className="font-bold text-gray-700 flex items-center gap-2"><Calendar size={18} className="text-blue-500"/> Comparativo Mensal</h4>
                                    <span className={`px-2 py-1 rounded text-xs font-black flex items-center gap-1 ${currentMonthStats.growth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {currentMonthStats.growth >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                                        {Math.abs(currentMonthStats.growth).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Mês Atual</span>
                                        <span className="font-bold text-slate-800">R$ {currentMonthStats.currentRevenue.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Mês Anterior</span>
                                        <span className="font-bold text-slate-500">R$ {currentMonthStats.lastMonthRevenue.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Indicador de CMV */}
                        <div className={`p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between ${currentMonthStats.cmvPercentage > 35 ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                            <h4 className="font-bold text-gray-700 flex items-center gap-2 mb-2"><PieChart size={18} className={currentMonthStats.cmvPercentage > 35 ? 'text-red-500' : 'text-emerald-500'}/> CMV Estimado</h4>
                            <div>
                                <span className={`text-4xl font-black ${currentMonthStats.cmvPercentage > 35 ? 'text-red-600' : 'text-emerald-600'}`}>{currentMonthStats.cmvPercentage.toFixed(1)}%</span>
                                <p className="text-xs text-gray-500 mt-1">Custo sobre Venda (Meta: 30-35%)</p>
                                <p className="text-xs font-mono text-gray-400 mt-2">Custo Total: R$ {currentMonthStats.estimatedCost.toFixed(2)}</p>
                            </div>
                        </div>
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
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: EFICIÊNCIA --- */}
            {activeTab === 'FORECAST' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Previsão Semanal */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-blue-500"/> Demanda Semanal (Histórico)</h3>
                            <div className="flex items-end justify-between h-40 gap-2">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, idx) => {
                                    const val = efficiencyStats.dayRevenues[idx] || 0;
                                    const max = Math.max(...Object.values(efficiencyStats.dayRevenues)) || 1;
                                    const height = (val / max) * 100;
                                    
                                    return (
                                        <div key={day} className="flex-1 flex flex-col items-center gap-2 group">
                                            <div className="relative w-full flex justify-center">
                                                <div 
                                                    className={`w-full max-w-[30px] rounded-t-lg transition-all duration-500 ${height > 80 ? 'bg-blue-600' : 'bg-blue-200 group-hover:bg-blue-300'}`} 
                                                    style={{ height: `${Math.max(height, 5)}%` }}
                                                ></div>
                                                <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-[10px] p-1 rounded whitespace-nowrap z-10 transition-opacity">
                                                    R$ {val.toFixed(0)}
                                                </div>
                                            </div>
                                            <span className="text-xs font-bold text-gray-500">{day}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-center text-gray-400 mt-4 italic">Baseado no volume de vendas histórico por dia da semana.</p>
                        </div>

                        {/* Desperdício */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                             <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><TrendingDown size={18} className="text-red-500"/> Monitor de Desperdício</h3>
                             <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6 flex justify-between items-center">
                                 <span className="text-red-800 text-sm font-bold">Total Perdas (Mês)</span>
                                 <span className="text-2xl font-black text-red-600">R$ {efficiencyStats.wasteTotalValue.toFixed(2)}</span>
                             </div>

                             <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Top Itens Desperdiçados</h4>
                             <ul className="space-y-2">
                                 {Object.entries(efficiencyStats.topWasteItems).slice(0, 5).map(([name, qty], idx) => (
                                     <li key={idx} className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                                         <span className="text-gray-700 font-medium">{name}</span>
                                         <span className="text-red-500 font-bold">{qty.toFixed(2)} un/kg</span>
                                     </li>
                                 ))}
                                 {Object.keys(efficiencyStats.topWasteItems).length === 0 && (
                                     <li className="text-center text-gray-400 text-sm py-4">Sem registros de desperdício.</li>
                                 )}
                             </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
