
import React, { useState, useEffect } from 'react';
import { useStaff } from '../../../context/StaffContext';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/Button';
import { PayrollPreview } from '../../../types';
import { FileText, Download, Printer, Calculator, RefreshCcw, Search, TrendingUp, DollarSign, Wallet, FileInput } from 'lucide-react';
import { printHtml, getReportStyles } from '../../../utils/printHelper';

export const StaffPayroll: React.FC = () => {
    const { getPayroll } = useStaff();
    const { showAlert } = useUI();
    
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());
    const [payrollData, setPayrollData] = useState<PayrollPreview[]>([]);
    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getPayroll(month, year);
            setPayrollData(data);
        } catch (e) {
            showAlert({ title: "Erro", message: "Falha ao gerar folha.", type: "ERROR" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [month, year]);

    const totalBruto = payrollData.reduce((acc, p) => acc + p.grossTotal, 0);
    const totalLiquido = payrollData.reduce((acc, p) => acc + p.netTotal, 0);

    const handlePrint = () => {
        const html = `
            <!DOCTYPE html>
            <html>
            <head><title>Pré-Folha ${month+1}/${year}</title>${getReportStyles()}</head>
            <body>
                <h1>Pré-Folha de Pagamento - ${month+1}/${year}</h1>
                <table>
                    <thead>
                        <tr>
                            <th>Colaborador</th>
                            <th class="text-right">Salário Base</th>
                            <th class="text-right">Horas Extras</th>
                            <th class="text-right">Benefícios</th>
                            <th class="text-right">Bruto</th>
                            <th class="text-right">Líquido Est.</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payrollData.map(p => `
                            <tr>
                                <td>${p.staffName}</td>
                                <td class="text-right">R$ ${p.baseSalary.toFixed(2)}</td>
                                <td class="text-right">R$ ${p.overtimeTotal.toFixed(2)}</td>
                                <td class="text-right">R$ ${p.benefits.toFixed(2)}</td>
                                <td class="text-right font-bold">R$ ${p.grossTotal.toFixed(2)}</td>
                                <td class="text-right font-bold">R$ ${p.netTotal.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td>TOTAL GERAL</td>
                            <td colspan="3"></td>
                            <td class="text-right">R$ ${totalBruto.toFixed(2)}</td>
                            <td class="text-right">R$ ${totalLiquido.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </body>
            </html>
        `;
        printHtml(html);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Calculator className="text-pink-600"/> Pré-Folha de Pagamento</h2>
                    <p className="text-sm text-gray-500">Consolidação automática de salários e horas extras.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
                        <select className="bg-transparent text-sm font-bold p-2" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                            <option value={0}>Janeiro</option><option value={1}>Fevereiro</option><option value={2}>Março</option><option value={3}>Abril</option><option value={4}>Maio</option><option value={5}>Junho</option><option value={6}>Julho</option><option value={7}>Agosto</option><option value={8}>Setembro</option><option value={9}>Outubro</option><option value={10}>Novembro</option><option value={11}>Dezembro</option>
                        </select>
                        <select className="bg-transparent text-sm font-bold p-2" value={year} onChange={e => setYear(parseInt(e.target.value))}>
                            <option value={2025}>2025</option><option value={2026}>2026</option>
                        </select>
                    </div>
                    <Button onClick={loadData} disabled={loading} variant="secondary" className="px-3">
                        <RefreshCcw size={18} className={loading ? "animate-spin" : ""}/>
                    </Button>
                    <Button onClick={handlePrint} className="bg-slate-900"><Printer size={18}/> Exportar PDF</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Custo Bruto Total</p><p className="text-3xl font-black text-slate-800">R$ {totalBruto.toFixed(2)}</p></div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Líquido Estimado</p><p className="text-3xl font-black text-emerald-600">R$ {totalLiquido.toFixed(2)}</p></div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Encargos Est. (8%)</p><p className="text-3xl font-black text-orange-600">R$ {(totalBruto * 0.08).toFixed(2)}</p></div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Colaboradores</p><p className="text-3xl font-black text-blue-600">{payrollData.length}</p></div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b">
                            <tr>
                                <th className="p-4">Colaborador</th>
                                <th className="p-4 text-right">Salário Base</th>
                                <th className="p-4 text-right">Horas Extras (50%)</th>
                                <th className="p-4 text-right">Benefícios</th>
                                <th className="p-4 text-right">Bruto Total</th>
                                <th className="p-4 text-right">Líquido Est.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {payrollData.map(p => (
                                <tr key={p.staffId} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-4"><div className="font-bold text-slate-800">{p.staffName}</div><div className="text-[10px] text-slate-400">{p.hoursWorked.toFixed(1)}h trabalhadas</div></td>
                                    <td className="p-4 text-right font-mono text-slate-600">R$ {p.baseSalary.toFixed(2)}</td>
                                    <td className="p-4 text-right font-mono text-orange-600">+ R$ {p.overtimeTotal.toFixed(2)}</td>
                                    <td className="p-4 text-right font-mono text-blue-600">R$ {p.benefits.toFixed(2)}</td>
                                    <td className="p-4 text-right font-black text-slate-900 bg-slate-50/50">R$ {p.grossTotal.toFixed(2)}</td>
                                    <td className="p-4 text-right font-black text-emerald-600">R$ {p.netTotal.toFixed(2)}</td>
                                </tr>
                            ))}
                            {payrollData.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-gray-400">Nenhum dado apurado para este período.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
