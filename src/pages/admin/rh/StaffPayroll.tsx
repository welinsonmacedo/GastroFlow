
import React, { useState, useEffect, useRef } from 'react';
import { useStaff } from '../../../context/StaffContext';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/Button';
import { PayrollPreview } from '../../../types';
import { FileText, Printer, Calculator, RefreshCcw, Eye, X, Building2 } from 'lucide-react';
import { printHtml, getReportStyles } from '../../../utils/printHelper';
import { Modal } from '../../../components/Modal';

export const StaffPayroll: React.FC = () => {
    const { getPayroll } = useStaff();
    const { showAlert } = useUI();
    
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());
    const [payrollData, setPayrollData] = useState<PayrollPreview[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [selectedSlip, setSelectedSlip] = useState<PayrollPreview | null>(null);

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
    const totalDescontos = payrollData.reduce((acc, p) => acc + p.discounts, 0);
    const totalCustoEmpresa = payrollData.reduce((acc, p) => acc + p.totalCompanyCost, 0);

    const handlePrintTable = () => {
        const html = `
            <!DOCTYPE html>
            <html>
            <head><title>Pré-Folha ${month+1}/${year}</title>${getReportStyles()}</head>
            <body>
                <h1>Folha de Pagamento - ${month+1}/${year}</h1>
                <table>
                    <thead>
                        <tr>
                            <th>Colaborador</th>
                            <th class="text-right">Bruto</th>
                            <th class="text-right">Descontos (Func)</th>
                            <th class="text-right">Líquido</th>
                            <th class="text-right">Encargos (Empresa)</th>
                            <th class="text-right">Custo Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payrollData.map(p => `
                            <tr>
                                <td>${p.staffName}</td>
                                <td class="text-right">R$ ${p.grossTotal.toFixed(2)}</td>
                                <td class="text-right text-red-600">- R$ ${p.discounts.toFixed(2)}</td>
                                <td class="text-right font-bold">R$ ${p.netTotal.toFixed(2)}</td>
                                <td class="text-right text-purple-600">R$ ${p.employerCharges.toFixed(2)}</td>
                                <td class="text-right font-bold bg-gray-50">R$ ${p.totalCompanyCost.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td>TOTAL GERAL</td>
                            <td class="text-right">R$ ${totalBruto.toFixed(2)}</td>
                            <td class="text-right text-red-600">- R$ ${totalDescontos.toFixed(2)}</td>
                            <td class="text-right">R$ ${totalLiquido.toFixed(2)}</td>
                            <td class="text-right">R$ ${payrollData.reduce((acc,p) => acc + p.employerCharges, 0).toFixed(2)}</td>
                            <td class="text-right">R$ ${totalCustoEmpresa.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </body>
            </html>
        `;
        printHtml(html);
    };

    const handlePrintSlip = (slip: PayrollPreview) => {
        const employeeTaxes = slip.taxBreakdown.filter(t => t.type !== 'EMPLOYER');
        const employerTaxes = slip.taxBreakdown.filter(t => t.type === 'EMPLOYER');

        const html = `
            <!DOCTYPE html>
            <html>
            <head><title>Holerite - ${slip.staffName}</title>
            <style>
                body { font-family: sans-serif; font-size: 12px; padding: 20px; }
                .box { border: 1px solid #000; padding: 10px; margin-bottom: 10px; }
                .header { text-align: center; font-weight: bold; font-size: 14px; text-transform: uppercase; margin-bottom: 20px; }
                .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .title { font-weight: bold; }
                .cols { display: flex; gap: 20px; margin-top: 20px; }
                .col { flex: 1; border: 1px solid #ccc; padding: 10px; }
                .col h3 { border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 0; }
                .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .total-row { font-weight: bold; border-top: 2px solid #000; margin-top: 10px; padding-top: 5px; font-size: 14px; }
                .info { font-size: 10px; color: #555; margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 5px; }
            </style>
            </head>
            <body>
                <div class="box">
                    <div class="header">DEMONSTRATIVO DE PAGAMENTO</div>
                    <div class="row"><span class="title">Colaborador:</span> <span>${slip.staffName}</span></div>
                    <div class="row"><span class="title">Referência:</span> <span>${month+1}/${year}</span></div>
                </div>

                <div class="cols">
                    <div class="col">
                        <h3>Vencimentos</h3>
                        <div class="item"><span>Salário Base</span> <span>R$ ${slip.baseSalary.toFixed(2)}</span></div>
                        ${slip.overtimeTotal > 0 ? `<div class="item"><span>Horas Extras</span> <span>R$ ${slip.overtimeTotal.toFixed(2)}</span></div>` : ''}
                        ${slip.benefitBreakdown.map(b => `<div class="item"><span>${b.name}</span> <span>R$ ${b.value.toFixed(2)}</span></div>`).join('')}
                        ${slip.benefits > 0 && slip.benefitBreakdown.length === 0 ? `<div class="item"><span>Benefícios Div.</span> <span>R$ ${slip.benefits.toFixed(2)}</span></div>` : ''}
                        <div class="total-row item"><span>Total Bruto</span> <span>R$ ${slip.grossTotal.toFixed(2)}</span></div>
                    </div>
                    <div class="col">
                        <h3>Descontos</h3>
                        ${employeeTaxes.map(t => `<div class="item"><span>${t.name}</span> <span>R$ ${t.value.toFixed(2)}</span></div>`).join('')}
                        ${employeeTaxes.length === 0 ? '<div class="item"><span>-</span> <span>-</span></div>' : ''}
                        <div class="total-row item" style="color: red;"><span>Total Descontos</span> <span>R$ ${slip.discounts.toFixed(2)}</span></div>
                    </div>
                </div>

                <div class="box" style="margin-top: 20px; text-align: right; background: #f0f0f0;">
                    <div class="row" style="font-size: 16px;">
                        <span class="title">LÍQUIDO A RECEBER:</span> 
                        <span style="font-weight: bold;">R$ ${slip.netTotal.toFixed(2)}</span>
                    </div>
                </div>

                ${employerTaxes.length > 0 ? `
                <div class="info">
                    <strong>Informativo de Recolhimentos da Empresa (Não descontado):</strong><br/>
                    ${employerTaxes.map(t => `${t.name}: R$ ${t.value.toFixed(2)}`).join(' | ')}
                </div>
                ` : ''}
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
                    <p className="text-sm text-gray-500">Cálculo de salários e custo total da folha.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
                        <select className="bg-transparent text-sm font-bold p-2 outline-none" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                            <option value={0}>Janeiro</option><option value={1}>Fevereiro</option><option value={2}>Março</option><option value={3}>Abril</option><option value={4}>Maio</option><option value={5}>Junho</option><option value={6}>Julho</option><option value={7}>Agosto</option><option value={8}>Setembro</option><option value={9}>Outubro</option><option value={10}>Novembro</option><option value={11}>Dezembro</option>
                        </select>
                        <select className="bg-transparent text-sm font-bold p-2 outline-none" value={year} onChange={e => setYear(parseInt(e.target.value))}>
                            <option value={2025}>2025</option><option value={2026}>2026</option>
                        </select>
                    </div>
                    <Button onClick={loadData} disabled={loading} variant="secondary" className="px-3">
                        <RefreshCcw size={18} className={loading ? "animate-spin" : ""}/>
                    </Button>
                    <Button onClick={handlePrintTable} className="bg-slate-900"><Printer size={18}/> Exportar Relatório</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Folha Bruta</p><p className="text-2xl font-black text-slate-800">R$ {totalBruto.toFixed(2)}</p></div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Líquido (Pagar)</p><p className="text-2xl font-black text-emerald-600">R$ {totalLiquido.toFixed(2)}</p></div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Encargos Empresa</p><p className="text-2xl font-black text-purple-600">R$ {(totalCustoEmpresa - totalBruto).toFixed(2)}</p></div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Custo Total RH</p><p className="text-2xl font-black text-slate-900">R$ {totalCustoEmpresa.toFixed(2)}</p></div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b">
                            <tr>
                                <th className="p-4">Colaborador</th>
                                <th className="p-4 text-right">Salário Base</th>
                                <th className="p-4 text-right">Proventos (Extra/Benef)</th>
                                <th className="p-4 text-right">Bruto Total</th>
                                <th className="p-4 text-right">Descontos (Func)</th>
                                <th className="p-4 text-right bg-emerald-50 text-emerald-800">Líquido</th>
                                <th className="p-4 text-right text-purple-600">Encargos (Emp)</th>
                                <th className="p-4 text-center">Holerite</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {payrollData.map(p => (
                                <tr key={p.staffId} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-4"><div className="font-bold text-slate-800">{p.staffName}</div><div className="text-[10px] text-slate-400">{p.hoursWorked.toFixed(1)}h trabalhadas</div></td>
                                    <td className="p-4 text-right font-mono text-slate-600">R$ {p.baseSalary.toFixed(2)}</td>
                                    <td className="p-4 text-right font-mono text-blue-600">+ R$ {(p.overtimeTotal + p.benefits).toFixed(2)}</td>
                                    <td className="p-4 text-right font-black text-slate-900">R$ {p.grossTotal.toFixed(2)}</td>
                                    <td className="p-4 text-right font-mono text-red-500">- R$ {p.discounts.toFixed(2)}</td>
                                    <td className="p-4 text-right font-black text-emerald-600 bg-emerald-50">R$ {p.netTotal.toFixed(2)}</td>
                                    <td className="p-4 text-right font-mono text-purple-600">R$ {p.employerCharges.toFixed(2)}</td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => setSelectedSlip(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver Detalhes">
                                            <Eye size={18}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {payrollData.length === 0 && <tr><td colSpan={8} className="p-10 text-center text-gray-400">Nenhum dado apurado para este período.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Detalhes (Holerite) */}
            <Modal isOpen={!!selectedSlip} onClose={() => setSelectedSlip(null)} title="Detalhes do Pagamento" variant="dialog" maxWidth="md">
                {selectedSlip && (
                    <div className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-lg text-slate-800">{selectedSlip.staffName}</h3>
                                <span className="text-xs font-mono bg-white border px-2 py-1 rounded text-slate-500">Ref: {month + 1}/{year}</span>
                            </div>
                            <div className="text-xs text-slate-500 flex gap-4">
                                <span>Salário Base: R$ {selectedSlip.baseSalary.toFixed(2)}</span>
                                <span>Horas Trab.: {selectedSlip.hoursWorked.toFixed(1)}h</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            {/* Vencimentos */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase text-green-700 border-b border-green-200 pb-1 mb-2">Vencimentos</h4>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Salário Base</span>
                                    <span className="font-mono font-bold">R$ {selectedSlip.baseSalary.toFixed(2)}</span>
                                </div>
                                {selectedSlip.overtimeTotal > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Horas Extras</span>
                                        <span className="font-mono font-bold text-green-600">R$ {selectedSlip.overtimeTotal.toFixed(2)}</span>
                                    </div>
                                )}
                                {selectedSlip.benefitBreakdown.map((ben, idx) => (
                                    <div key={`ben-${idx}`} className="flex justify-between text-sm">
                                        <span className="text-slate-600">{ben.name}</span>
                                        <span className="font-mono font-bold text-blue-600">R$ {ben.value.toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="border-t pt-2 mt-2 flex justify-between text-sm font-black text-slate-800">
                                    <span>Total Bruto</span>
                                    <span>R$ {selectedSlip.grossTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Descontos (Funcionário) */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase text-red-700 border-b border-red-200 pb-1 mb-2">Descontos</h4>
                                {selectedSlip.taxBreakdown.filter(t => t.type === 'EMPLOYEE').map((tax, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span className="text-slate-600">{tax.name}</span>
                                        <span className="font-mono font-bold text-red-500">R$ {tax.value.toFixed(2)}</span>
                                    </div>
                                ))}
                                {selectedSlip.taxBreakdown.filter(t => t.type === 'EMPLOYEE').length === 0 && <p className="text-xs text-gray-400 italic">Nenhum desconto.</p>}
                                <div className="border-t pt-2 mt-2 flex justify-between text-sm font-black text-red-700">
                                    <span>Total Desc.</span>
                                    <span>R$ {selectedSlip.discounts.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 flex justify-between items-center">
                            <span className="text-sm font-bold text-emerald-800 uppercase tracking-widest">Líquido a Receber</span>
                            <span className="text-2xl font-black text-emerald-600">R$ {selectedSlip.netTotal.toFixed(2)}</span>
                        </div>

                        {/* Encargos da Empresa (Apenas visualização gerencial) */}
                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 mt-4">
                            <h4 className="text-xs font-black uppercase text-purple-700 mb-2 flex items-center gap-2"><Building2 size={12}/> Custos da Empresa (Patronal)</h4>
                            <div className="space-y-1">
                                {selectedSlip.taxBreakdown.filter(t => t.type === 'EMPLOYER').map((tax, idx) => (
                                    <div key={idx} className="flex justify-between text-xs">
                                        <span className="text-purple-800">{tax.name}</span>
                                        <span className="font-bold text-purple-900">R$ {tax.value.toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="border-t border-purple-200 pt-1 mt-1 flex justify-between text-xs font-bold text-purple-900">
                                    <span>Total Encargos</span>
                                    <span>R$ {selectedSlip.employerCharges.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-black text-purple-900 mt-2 pt-2 border-t border-purple-200">
                                    <span>CUSTO TOTAL (Salário + Encargos)</span>
                                    <span>R$ {selectedSlip.totalCompanyCost.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button variant="secondary" onClick={() => setSelectedSlip(null)} className="flex-1">Fechar</Button>
                            <Button onClick={() => handlePrintSlip(selectedSlip)} className="flex-1 bg-slate-900"><Printer size={18} className="mr-2"/> Imprimir Holerite</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
