
import React, { useState, useEffect, useRef } from 'react';
import { useStaff } from '../../../context/StaffContext';
import { useRestaurant } from '../../../context/RestaurantContext'; // Importado para dados da empresa
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/Button';
import { PayrollPreview, ClosedPayroll } from '../../../types';
import { FileText, Printer, Calculator, RefreshCcw, Eye, X, Building2, Lock, CheckCircle } from 'lucide-react';
import { printHtml, getReportStyles } from '../../../utils/printHelper';
import { Modal } from '../../../components/Modal';

export const StaffPayroll: React.FC = () => {
    const { getPayroll, closePayroll, state: staffState } = useStaff(); // state adicionado para buscar detalhes do user
    const { state: restState } = useRestaurant(); // state adicionado para dados da empresa
    const { showAlert, showConfirm } = useUI();
    
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());
    const [payrollData, setPayrollData] = useState<PayrollPreview[]>([]);
    const [closedInfo, setClosedInfo] = useState<ClosedPayroll | undefined>(undefined);
    const [isClosed, setIsClosed] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Estado para o Modal de Detalhes
    const [selectedSlip, setSelectedSlip] = useState<PayrollPreview | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getPayroll(month, year);
            setPayrollData(data.payroll);
            setIsClosed(data.isClosed);
            setClosedInfo(data.closedInfo);
        } catch (e) {
            showAlert({ title: "Erro", message: "Falha ao gerar folha.", type: "ERROR" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [month, year]);

    const handleClosePayroll = () => {
        showConfirm({
            title: "Fechar Folha de Pagamento?",
            message: "Ao fechar a folha, os valores serão salvos permanentemente e não poderão ser alterados. Confirme apenas se todos os lançamentos estiverem corretos.",
            confirmText: "Confirmar Fechamento",
            onConfirm: async () => {
                try {
                    setLoading(true);
                    await closePayroll(month, year);
                    await loadData();
                    showAlert({ title: "Sucesso", message: "Folha fechada e arquivada.", type: "SUCCESS" });
                } catch (error: any) {
                    showAlert({ title: "Erro", message: error.message || "Erro ao fechar folha.", type: "ERROR" });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const totalBruto = payrollData.reduce((acc, p) => acc + p.grossTotal, 0);
    const totalLiquido = payrollData.reduce((acc, p) => acc + p.netTotal, 0);
    const totalDescontos = payrollData.reduce((acc, p) => acc + p.discounts, 0);
    const totalCustoEmpresa = payrollData.reduce((acc, p) => acc + p.totalCompanyCost, 0);

    // Helpers para dados complementares
    const getEmployeeDetails = (staffId: string) => {
        return staffState.users.find(u => u.id === staffId);
    };

    const handlePrintTable = () => {
        const html = `
            <!DOCTYPE html>
            <html>
            <head><title>Folha ${month+1}/${year}</title>${getReportStyles()}</head>
            <body>
                <h1>Folha de Pagamento - ${month+1}/${year} ${isClosed ? '(FECHADA)' : '(PRÉVIA)'}</h1>
                <h2>${restState.theme.restaurantName} - CNPJ: ${restState.businessInfo?.cnpj || 'N/A'}</h2>
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
        const employee = getEmployeeDetails(slip.staffId);
        const company = restState.businessInfo;
        const theme = restState.theme;

        const html = `
            <!DOCTYPE html>
            <html>
            <head><title>Holerite - ${slip.staffName}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
                body { font-family: 'Roboto Mono', monospace; font-size: 11px; padding: 20px; -webkit-print-color-adjust: exact; }
                .holerite { border: 2px solid #000; padding: 0; max-width: 800px; margin: 0 auto; }
                .header, .subheader, .body, .footer { border-bottom: 1px solid #000; padding: 10px; }
                .header { display: flex; justify-content: space-between; align-items: start; }
                .company-info h1 { margin: 0; font-size: 14px; font-weight: bold; text-transform: uppercase; }
                .recibo-title { text-align: right; font-weight: bold; }
                .subheader { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; background: #f9f9f9; }
                .field { display: flex; flex-direction: column; }
                .field label { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #555; }
                .field span { font-size: 12px; font-weight: bold; }
                
                .table-row { display: flex; border-bottom: 1px dashed #ccc; padding: 4px 0; }
                .table-header { font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 5px; background: #eee; }
                .col-code { width: 50px; text-align: center; }
                .col-desc { flex: 1; }
                .col-ref { width: 80px; text-align: center; }
                .col-val { width: 100px; text-align: right; }
                
                .footer-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px; }
                .totals { display: flex; justify-content: flex-end; gap: 20px; padding: 10px; background: #eee; font-weight: bold; border-top: 1px solid #000; }
                .total-box { text-align: right; }
                .label { font-size: 9px; text-transform: uppercase; }
                .val { font-size: 14px; }
                
                .msg { margin-top: 20px; font-size: 10px; text-align: center; font-style: italic; }
            </style>
            </head>
            <body>
                <div class="holerite">
                    <!-- HEADER EMPRESA -->
                    <div class="header">
                        <div class="company-info">
                            <h1>${company?.restaurantName || theme.restaurantName || 'Nome da Empresa'}</h1>
                            <div>${company?.address?.street || ''}, ${company?.address?.number || ''}</div>
                            <div>CNPJ: ${company?.cnpj || '00.000.000/0000-00'}</div>
                        </div>
                        <div class="recibo-title">
                            <div>RECIBO DE PAGAMENTO DE SALÁRIO</div>
                            <div style="margin-top: 5px; font-size: 14px;">Referência: ${String(month + 1).padStart(2, '0')}/${year}</div>
                        </div>
                    </div>

                    <!-- DADOS FUNCIONÁRIO -->
                    <div class="subheader">
                        <div class="field"><label>Código</label><span>${slip.staffId.slice(0,4).toUpperCase()}</span></div>
                        <div class="field"><label>Nome do Funcionário</label><span>${slip.staffName}</span></div>
                        <div class="field"><label>Cargo</label><span>${employee?.role || 'FUNCIONÁRIO'}</span></div>
                        <div class="field"><label>Admissão</label><span>${employee?.hireDate ? new Date(employee.hireDate).toLocaleDateString() : '-'}</span></div>
                    </div>

                    <!-- CORPO (VENCIMENTOS/DESCONTOS) -->
                    <div class="body" style="min-height: 300px;">
                        <div class="table-row table-header">
                            <div class="col-code">Cód.</div>
                            <div class="col-desc">Descrição</div>
                            <div class="col-ref">Ref.</div>
                            <div class="col-val">Vencimentos</div>
                            <div class="col-val">Descontos</div>
                        </div>

                        <!-- Salário Base -->
                        <div class="table-row">
                            <div class="col-code">001</div>
                            <div class="col-desc">SALÁRIO BASE</div>
                            <div class="col-ref">30d</div>
                            <div class="col-val">${slip.baseSalary.toFixed(2)}</div>
                            <div class="col-val"></div>
                        </div>

                        <!-- Horas Extras -->
                        ${slip.overtimeTotal > 0 ? `
                        <div class="table-row">
                            <div class="col-code">002</div>
                            <div class="col-desc">HORAS EXTRAS</div>
                            <div class="col-ref"></div>
                            <div class="col-val">${slip.overtimeTotal.toFixed(2)}</div>
                            <div class="col-val"></div>
                        </div>` : ''}

                        <!-- Benefícios -->
                        ${slip.benefitBreakdown.map((b, i) => `
                        <div class="table-row">
                            <div class="col-code">${100+i}</div>
                            <div class="col-desc">${b.name.toUpperCase()}</div>
                            <div class="col-ref"></div>
                            <div class="col-val">${b.value.toFixed(2)}</div>
                            <div class="col-val"></div>
                        </div>`).join('')}

                        <!-- Descontos -->
                        ${employeeTaxes.map((t, i) => `
                        <div class="table-row">
                            <div class="col-code">${900+i}</div>
                            <div class="col-desc">${t.name.toUpperCase()}</div>
                            <div class="col-ref"></div>
                            <div class="col-val"></div>
                            <div class="col-val">${t.value.toFixed(2)}</div>
                        </div>`).join('')}
                    </div>

                    <!-- TOTAIS -->
                    <div class="totals">
                        <div class="total-box"><div class="label">Total Vencimentos</div><div class="val">${slip.grossTotal.toFixed(2)}</div></div>
                        <div class="total-box"><div class="label">Total Descontos</div><div class="val">${slip.discounts.toFixed(2)}</div></div>
                        <div class="total-box" style="border: 1px solid #000; padding: 0 10px; background: #fff;"><div class="label">Líquido a Receber</div><div class="val">R$ ${slip.netTotal.toFixed(2)}</div></div>
                    </div>

                    <!-- RODAPÉ BASES -->
                    <div class="footer">
                        <div class="footer-grid">
                            <div class="field"><label>Salário Base</label><span>${slip.baseSalary.toFixed(2)}</span></div>
                            <div class="field"><label>Base Calc. INSS</label><span>${slip.grossTotal.toFixed(2)}</span></div>
                            <div class="field"><label>Base Calc. FGTS</label><span>${slip.grossTotal.toFixed(2)}</span></div>
                            <div class="field"><label>FGTS do Mês (8%)</label><span>${slip.fgtsValue.toFixed(2)}</span></div>
                        </div>
                    </div>
                </div>
                <div class="msg">
                    Declaro ter recebido a importância líquida discriminada neste recibo.
                    <br/><br/>
                    ____________________________________________________<br/>
                    ${slip.staffName}
                </div>
            </body>
            </html>
        `;
        printHtml(html);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        {isClosed ? <Lock size={24} className="text-red-500"/> : <Calculator size={24} className="text-pink-600"/>} 
                        {isClosed ? 'Folha Fechada (Histórico)' : 'Pré-Folha de Pagamento'}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {isClosed 
                            ? `Fechado em ${closedInfo?.closedAt?.toLocaleDateString()} por ${closedInfo?.closedBy}`
                            : 'Cálculo de salários e custo total da folha.'}
                    </p>
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
                    
                    {!isClosed && (
                        <Button onClick={handleClosePayroll} className="bg-red-600 hover:bg-red-700 text-white shadow-lg">
                            <Lock size={16} className="mr-2"/> Fechar Folha
                        </Button>
                    )}
                    
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
            <Modal isOpen={!!selectedSlip} onClose={() => setSelectedSlip(null)} title="Recibo de Pagamento (Holerite)" variant="dialog" maxWidth="4xl">
                {selectedSlip && (
                    <div className="space-y-6">
                        {/* Wrapper Estilo Holerite */}
                        <div className="border-2 border-slate-800 p-0 text-xs font-mono bg-white text-slate-900 shadow-sm print:shadow-none">
                            
                            {/* Header Empresa */}
                            <div className="border-b border-slate-800 p-4 flex justify-between items-start bg-slate-50">
                                <div>
                                    <h1 className="font-bold text-sm uppercase">{restState.theme.restaurantName || "Razão Social da Empresa"}</h1>
                                    <p>{restState.businessInfo?.address?.street || 'Endereço da Empresa'}, {restState.businessInfo?.address?.number || ''}</p>
                                    <p>CNPJ: {restState.businessInfo?.cnpj || '00.000.000/0000-00'}</p>
                                </div>
                                <div className="text-right">
                                    <h2 className="font-bold text-sm">RECIBO DE PAGAMENTO</h2>
                                    <p className="font-bold mt-1">Ref: {String(month+1).padStart(2, '0')}/{year}</p>
                                </div>
                            </div>

                            {/* Dados do Funcionário */}
                            <div className="border-b border-slate-800 p-2 grid grid-cols-4 gap-4 bg-white">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Cód.</label>
                                    <span className="font-bold">{selectedSlip.staffId.slice(0,4).toUpperCase()}</span>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Nome do Funcionário</label>
                                    <span className="font-bold">{selectedSlip.staffName}</span>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">CBO / Função</label>
                                    <span>{getEmployeeDetails(selectedSlip.staffId)?.role || 'FUNCIONÁRIO'}</span>
                                </div>
                                <div>
                                     <label className="block text-[10px] font-bold text-gray-500 uppercase">Departamento</label>
                                     <span>{getEmployeeDetails(selectedSlip.staffId)?.department || 'GERAL'}</span>
                                </div>
                                <div>
                                     <label className="block text-[10px] font-bold text-gray-500 uppercase">Admissão</label>
                                     <span>{getEmployeeDetails(selectedSlip.staffId)?.hireDate ? new Date(getEmployeeDetails(selectedSlip.staffId)!.hireDate!).toLocaleDateString() : '-'}</span>
                                </div>
                            </div>

                            {/* Corpo (Tabela) */}
                            <div className="min-h-[300px] relative">
                                {/* Header da Tabela */}
                                <div className="grid grid-cols-12 border-b border-black bg-gray-100 font-bold p-1">
                                    <div className="col-span-1 text-center">Cód</div>
                                    <div className="col-span-5">Descrição</div>
                                    <div className="col-span-2 text-center">Ref.</div>
                                    <div className="col-span-2 text-right">Vencimentos</div>
                                    <div className="col-span-2 text-right">Descontos</div>
                                </div>
                                
                                {/* Linhas */}
                                <div className="p-1 space-y-1">
                                    <div className="grid grid-cols-12">
                                        <div className="col-span-1 text-center">001</div>
                                        <div className="col-span-5">SALÁRIO BASE</div>
                                        <div className="col-span-2 text-center">30d</div>
                                        <div className="col-span-2 text-right">{selectedSlip.baseSalary.toFixed(2)}</div>
                                        <div className="col-span-2 text-right"></div>
                                    </div>
                                    {selectedSlip.overtimeTotal > 0 && (
                                        <div className="grid grid-cols-12">
                                            <div className="col-span-1 text-center">002</div>
                                            <div className="col-span-5">HORAS EXTRAS</div>
                                            <div className="col-span-2 text-center"></div>
                                            <div className="col-span-2 text-right">{selectedSlip.overtimeTotal.toFixed(2)}</div>
                                            <div className="col-span-2 text-right"></div>
                                        </div>
                                    )}
                                    {selectedSlip.benefitBreakdown.map((ben, i) => (
                                        <div key={`ben-${i}`} className="grid grid-cols-12">
                                            <div className="col-span-1 text-center">{100+i}</div>
                                            <div className="col-span-5">{ben.name.toUpperCase()}</div>
                                            <div className="col-span-2 text-center"></div>
                                            <div className="col-span-2 text-right">{ben.value.toFixed(2)}</div>
                                            <div className="col-span-2 text-right"></div>
                                        </div>
                                    ))}
                                    {selectedSlip.taxBreakdown.filter(t => t.type !== 'EMPLOYER').map((tax, i) => (
                                        <div key={`tax-${i}`} className="grid grid-cols-12">
                                            <div className="col-span-1 text-center">{900+i}</div>
                                            <div className="col-span-5">{tax.name.toUpperCase()}</div>
                                            <div className="col-span-2 text-center"></div>
                                            <div className="col-span-2 text-right"></div>
                                            <div className="col-span-2 text-right">{tax.value.toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Totais */}
                            <div className="border-t border-black bg-gray-100 p-2 grid grid-cols-12 items-center">
                                <div className="col-span-6 font-bold text-xs"></div>
                                <div className="col-span-2 text-right">
                                    <div className="text-[9px] uppercase">Total Vencimentos</div>
                                    <div className="font-bold">{selectedSlip.grossTotal.toFixed(2)}</div>
                                </div>
                                <div className="col-span-2 text-right">
                                    <div className="text-[9px] uppercase">Total Descontos</div>
                                    <div className="font-bold">{selectedSlip.discounts.toFixed(2)}</div>
                                </div>
                                <div className="col-span-2 text-right border border-black bg-white p-1 ml-2">
                                    <div className="text-[9px] uppercase font-bold">Líquido a Receber</div>
                                    <div className="font-black text-sm">R$ {selectedSlip.netTotal.toFixed(2)}</div>
                                </div>
                            </div>

                            {/* Rodapé Bases */}
                            <div className="border-t border-black p-2 grid grid-cols-4 gap-4 bg-white text-[10px]">
                                <div>
                                    <div className="font-bold text-gray-500 uppercase">Sal. Contrib. INSS</div>
                                    <div className="font-bold">{selectedSlip.grossTotal.toFixed(2)}</div>
                                </div>
                                <div>
                                    <div className="font-bold text-gray-500 uppercase">Base Calc. FGTS</div>
                                    <div className="font-bold">{selectedSlip.grossTotal.toFixed(2)}</div>
                                </div>
                                <div>
                                    <div className="font-bold text-gray-500 uppercase">FGTS do Mês</div>
                                    <div className="font-bold">{selectedSlip.fgtsValue.toFixed(2)}</div>
                                </div>
                                <div>
                                    <div className="font-bold text-gray-500 uppercase">Base Calc. IRRF</div>
                                    <div className="font-bold">{(selectedSlip.grossTotal - selectedSlip.inssValue).toFixed(2)}</div>
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
