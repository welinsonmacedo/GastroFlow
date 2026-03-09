
import React, { useEffect, useState } from 'react';
import { useFinance } from '@/core/context/FinanceContext';
import { useRestaurant } from '@/core/context/RestaurantContext';
import { supabase } from '@/core/api/supabaseClient';
import { Lightbulb, TrendingUp, DollarSign, Target, AlertCircle } from 'lucide-react';

export const AdminFinancialTips: React.FC = () => {
    const { state: finState } = useFinance();
    const { state: restState } = useRestaurant();
    const [cmv, setCmv] = useState(0);
    const [revenue, setRevenue] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const calculateMetrics = async () => {
            if (!restState.tenantId) return;
            const today = new Date();
            const start = new Date();
            start.setDate(today.getDate() - 30);
            const validTrans = finState.transactions.filter(t => t.status !== 'CANCELLED' && new Date(t.timestamp) >= start);
            const totalRevenue = validTrans.reduce((acc, t) => acc + t.amount, 0);
            const { data: items } = await supabase.from('order_items').select('quantity, product_cost_price').eq('tenant_id', restState.tenantId).gte('created_at', start.toISOString()).neq('status', 'CANCELLED');
            const totalCmv = items?.reduce((acc: any, i: any) => acc + (i.quantity * i.product_cost_price), 0) || 0;
            setRevenue(totalRevenue);
            setCmv(totalCmv);
            setLoading(false);
        };
        calculateMetrics();
    }, [finState.transactions, restState.tenantId]);

    const cmvPercentage = revenue > 0 ? (cmv / revenue) * 100 : 0;
    const getTips = () => {
        const tips = [];
        if (cmvPercentage > 35) {
            tips.push({ title: "CMV Elevado (Alerta Vermelho)", desc: `Seu Custo de Mercadoria está em ${cmvPercentage.toFixed(1)}%, acima do ideal de 30-35%. Revise suas fichas técnicas.`, icon: <AlertCircle className="text-red-500" size={24}/>, color: "bg-red-50 border-red-200" });
        } else if (cmvPercentage > 0 && cmvPercentage < 25) {
            tips.push({ title: "CMV Excelente", desc: `Seu CMV está em ${cmvPercentage.toFixed(1)}%. Isso indica boa margem bruta.`, icon: <TrendingUp className="text-emerald-500" size={24}/>, color: "bg-emerald-50 border-emerald-200" });
        }
        tips.push({ title: "Separação de Contas", desc: "Nunca misture o dinheiro do caixa com suas despesas pessoais.", icon: <div className="bg-blue-500 text-white p-1 rounded-full"><DollarSign size={16}/></div>, color: "bg-blue-50 border-blue-200" });
        tips.push({ title: "Fundo de Reserva", desc: "Tente manter pelo menos 3 meses de custos fixos guardados.", icon: <Target className="text-purple-500" size={24}/>, color: "bg-purple-50 border-purple-200" });
        return tips;
    };

    if (loading) return <div className="p-10 text-center">Analisando dados...</div>;

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <header><h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Lightbulb className="text-yellow-500"/> Dicas Financeiras</h2><p className="text-sm text-gray-500">Análise baseada nos seus dados dos últimos 30 dias.</p></header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Sua Margem Bruta (Estimada)</h3><div className="text-4xl font-black text-slate-800">{revenue > 0 ? (100 - cmvPercentage).toFixed(1) : 0}%</div><div className="w-full bg-gray-100 rounded-full h-2 mt-4"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(100 - cmvPercentage, 100)}%` }}></div></div></div></div>
            <div className="grid grid-cols-1 gap-4">{getTips().map((tip, idx) => (<div key={idx} className={`p-6 rounded-2xl border-2 flex gap-4 ${tip.color}`}><div className="shrink-0 pt-1">{tip.icon}</div><div><h4 className="font-bold text-lg text-slate-800 mb-1">{tip.title}</h4><p className="text-sm text-slate-600 leading-relaxed">{tip.desc}</p></div></div>))}</div>
        </div>
    );
};
