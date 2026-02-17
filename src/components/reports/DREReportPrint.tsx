
import React from 'react';
import { Building2, Mail, Phone, Calendar } from 'lucide-react';

interface DREReportPrintProps {
    data: any;
    dateStart: string;
    dateEnd: string;
    businessInfo: any;
    theme: any;
    config: any;
}

export const DREReportPrint: React.FC<DREReportPrintProps> = ({ 
    data, dateStart, dateEnd, businessInfo, theme, config 
}) => {
    
    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    // Função auxiliar para calcular % vertical
    const getAV = (value: number) => {
        if (data.grossRevenue === 0) return '0.0%';
        return `${((value / data.grossRevenue) * 100).toFixed(1)}%`;
    };

    return (
        <div className="bg-white w-full h-full p-8 text-black font-sans leading-relaxed">
            {/* CABEÇALHO */}
            <header className="border-b-2 border-gray-800 pb-4 mb-6 flex justify-between items-start">
                <div className="flex gap-4">
                    {/* Logo (se houver) ou Ícone Padrão */}
                    <div className="w-16 h-16 flex items-center justify-center border border-gray-200 rounded-lg">
                         {theme.logoUrl ? (
                             <img src={theme.logoUrl} className="max-w-full max-h-full object-contain filter grayscale" alt="Logo" />
                         ) : (
                             <Building2 size={32} className="text-gray-400"/>
                         )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-tight text-gray-900">{businessInfo.restaurantName || theme.restaurantName || 'Nome do Estabelecimento'}</h1>
                        <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                            <p className="font-bold">CNPJ: {businessInfo.cnpj || 'Não Informado'}</p>
                            <p>{businessInfo.address?.street}, {businessInfo.address?.number} - {businessInfo.address?.city}/{businessInfo.address?.state}</p>
                            <div className="flex gap-3 mt-1">
                                {businessInfo.email && <span className="flex items-center gap-1"><Mail size={10}/> {businessInfo.email}</span>}
                                {businessInfo.phone && <span className="flex items-center gap-1"><Phone size={10}/> {businessInfo.phone}</span>}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-widest">DRE GERENCIAL</h2>
                    <p className="text-xs text-gray-500 font-bold mb-1 uppercase">{config.accountingMethod === 'CASH' ? 'Regime de Caixa' : 'Regime de Competência'}</p>
                    <div className="flex items-center justify-end gap-1 text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                        <Calendar size={14}/>
                        {new Date(dateStart).toLocaleDateString()} a {new Date(dateEnd).toLocaleDateString()}
                    </div>
                </div>
            </header>

            {/* CORPO DO RELATÓRIO */}
            <main className="space-y-6">
                
                {/* 1. RECEITA OPERACIONAL BRUTA */}
                <section>
                    <div className="flex justify-between items-end border-b border-gray-400 pb-1 mb-2">
                        <h3 className="font-bold text-sm uppercase">1. Receita Operacional Bruta</h3>
                    </div>
                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                            <span className="pl-4">Vendas Mesas / Salão</span>
                            <span className="font-mono">{formatCurrency(data.saloonSales)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="pl-4">Vendas Balcão / Delivery</span>
                            <span className="font-mono">{formatCurrency(data.posSales)}</span>
                        </div>
                        <div className="flex justify-between font-bold pt-1">
                            <span>(=) Receita Bruta Total</span>
                            <span className="font-mono">{formatCurrency(data.grossRevenue)}</span>
                        </div>
                    </div>
                </section>

                {/* 2. DEDUÇÕES DA RECEITA */}
                <section>
                    <div className="flex justify-between items-end border-b border-gray-400 pb-1 mb-2">
                        <h3 className="font-bold text-sm uppercase">2. Deduções da Receita</h3>
                    </div>
                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-red-700">
                            <span className="pl-4">(-) Impostos sobre Venda ({config.taxRate}%)</span>
                            <span className="font-mono">{formatCurrency(data.taxes)}</span>
                        </div>
                        <div className="flex justify-between text-red-700">
                            <span className="pl-4">(-) Taxas de Cartão / Meios de Pagamento</span>
                            <span className="font-mono">{formatCurrency(data.cardFees)}</span>
                        </div>
                        <div className="flex justify-between font-bold bg-gray-50 py-1 px-2 mt-1 border-t border-gray-200">
                            <span>(=) RECEITA LÍQUIDA</span>
                            <div className="flex gap-4">
                                <span className="font-mono">{formatCurrency(data.netRevenue)}</span>
                                <span className="text-gray-500 w-12 text-right">{getAV(data.netRevenue)}</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. CUSTOS VARIÁVEIS (CMV) */}
                <section>
                    <div className="flex justify-between items-end border-b border-gray-400 pb-1 mb-2">
                        <h3 className="font-bold text-sm uppercase">3. Custos Variáveis (CMV)</h3>
                    </div>
                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-red-700">
                            <span className="pl-4">(-) Custo de Mercadoria Vendida</span>
                            <span className="font-mono">{formatCurrency(data.cmv)}</span>
                        </div>
                        <div className="flex justify-between font-bold bg-gray-50 py-1 px-2 mt-1 border-t border-gray-200">
                            <span>(=) LUCRO BRUTO (Margem de Contribuição)</span>
                            <div className="flex gap-4">
                                <span className="font-mono">{formatCurrency(data.grossProfit)}</span>
                                <span className="text-gray-500 w-12 text-right">{getAV(data.grossProfit)}</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. DESPESAS OPERACIONAIS */}
                <section>
                    <div className="flex justify-between items-end border-b border-gray-400 pb-1 mb-2">
                        <h3 className="font-bold text-sm uppercase">4. Despesas Operacionais</h3>
                    </div>
                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-red-700">
                            <span className="pl-4">(-) Pessoal / Folha de Pagamento</span>
                            <span className="font-mono">{formatCurrency(data.expenses.personnel)}</span>
                        </div>
                        <div className="flex justify-between text-red-700">
                            <span className="pl-4">(-) Despesas Fixas (Aluguel, Energia, Sistema)</span>
                            <span className="font-mono">{formatCurrency(data.expenses.fixed)}</span>
                        </div>
                        <div className="flex justify-between text-red-700">
                            <span className="pl-4">(-) Despesas Variáveis / Gerais</span>
                            <span className="font-mono">{formatCurrency(data.expenses.variable)}</span>
                        </div>
                        
                        {/* Detalhamento das categorias */}
                        <div className="pl-8 pt-1 text-[10px] text-gray-500 italic grid grid-cols-2 gap-x-4">
                            {Object.entries(data.expenses.byCategory).map(([cat, val]: any) => {
                                if (!['Pessoal', 'Salário', 'Pró-labore', 'Impostos', 'Taxas Bancárias', 'Aluguel', 'Internet', 'Sistema'].includes(cat) && val > 0) {
                                    return (
                                        <div key={cat} className="flex justify-between border-b border-dashed border-gray-200 py-0.5">
                                            <span>• {cat}</span>
                                            <span>{formatCurrency(val)}</span>
                                        </div>
                                    );
                                }
                                return null;
                            })}
                        </div>

                        <div className="flex justify-between font-bold bg-gray-100 py-1 px-2 mt-2 border-t border-gray-300">
                            <span>(=) EBITDA (Resultado Operacional)</span>
                            <div className="flex gap-4">
                                <span className="font-mono">{formatCurrency(data.ebitda)}</span>
                                <span className="text-gray-500 w-12 text-right">{getAV(data.ebitda)}</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 5. RESULTADO FINANCEIRO */}
                <section>
                    <div className="flex justify-between items-end border-b border-gray-400 pb-1 mb-2">
                        <h3 className="font-bold text-sm uppercase">5. Resultado Financeiro</h3>
                    </div>
                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-red-700">
                            <span className="pl-4">(-) Despesas Bancárias / Juros</span>
                            <span className="font-mono">{formatCurrency(data.expenses.financial)}</span>
                        </div>
                    </div>
                </section>

                {/* RESULTADO FINAL */}
                <section className="mt-6">
                    <div className={`flex justify-between items-center border-2 p-4 rounded-lg ${data.netIncome >= 0 ? 'border-black bg-gray-50' : 'border-red-500 bg-red-50'}`}>
                        <div>
                            <h3 className="font-black text-lg uppercase">Lucro Líquido do Exercício</h3>
                            <p className="text-[10px] text-gray-500">Resultado final após todas as deduções</p>
                        </div>
                        <div className="text-right">
                            <div className={`text-2xl font-black font-mono ${data.netIncome >= 0 ? 'text-black' : 'text-red-600'}`}>
                                {formatCurrency(data.netIncome)}
                            </div>
                            <div className="text-sm font-bold text-gray-500">{getAV(data.netIncome)} da Receita</div>
                        </div>
                    </div>
                </section>
            </main>

            {/* RODAPÉ E ASSINATURA */}
            <footer className="mt-16 pt-8 border-t border-gray-300">
                <div className="flex justify-between items-end">
                    <div className="text-[10px] text-gray-400 max-w-sm">
                        <p className="font-bold uppercase mb-1 text-gray-600">Declaração</p>
                        <p>Este relatório foi gerado eletronicamente pelo sistema Flux Eat. Os valores apresentados são de caráter gerencial para auxílio na tomada de decisão e não substituem os livros contábeis oficiais exigidos pela legislação fiscal.</p>
                        <p className="mt-2">Emitido em: {new Date().toLocaleString()}</p>
                    </div>
                    
                    <div className="text-center">
                        <div className="w-64 border-b border-black mb-2"></div>
                        <p className="text-xs font-bold uppercase text-gray-800">{businessInfo.ownerName || 'Responsável'}</p>
                        <p className="text-[10px] text-gray-500 uppercase">Assinatura</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};
