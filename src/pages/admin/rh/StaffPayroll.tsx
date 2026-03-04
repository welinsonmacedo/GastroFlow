
import React, { useState, useEffect } from 'react';
import { useStaff } from '../../../context/StaffContext';
import { useRestaurant } from '../../../context/RestaurantContext'; 
import { useUI } from '../../../context/UIContext';
import { useFinance } from '../../../context/FinanceContext';
import { Button } from '../../../components/Button';
import { PayrollPreview, ClosedPayroll, PayrollEventType } from '../../../types';
import { FileText, Printer, Calculator, RefreshCcw, Eye, Lock, Plus, Download, AlertTriangle, List, Trash2, Unlock, CheckSquare } from 'lucide-react';
import { printHtml } from '../../../utils/printHelper';
import { Modal } from '../../../components/Modal';

export const StaffPayroll: React.FC = () => {
    const { getPayroll, closePayroll, reopenPayroll, addPayrollEvent, deletePayrollEvent, generateRecurringEventsForMonth, state: staffState } = useStaff();
    const { state: restState } = useRestaurant(); 
    const { showAlert, showConfirm } = useUI();
    const { addExpense } = useFinance();
    
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());
    const [payrollData, setPayrollData] = useState<PayrollPreview[]>([]);
    const [closedInfo, setClosedInfo] = useState<ClosedPayroll | undefined>(undefined);
    const [isClosed, setIsClosed] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Modal Details (Holerite)
    const [selectedSlip, setSelectedSlip] = useState<PayrollPreview | null>(null);
    
    // Modal Eventos
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [eventForm, setEventForm] = useState({ staffId: '', type: '', value: 0, description: '' });

    // Helper to get employee details for the selected slip
    const selectedEmployee = selectedSlip ? staffState.users.find(u => u.id === selectedSlip.staffId) : null;
    const selectedHrRole = selectedEmployee ? staffState.hrJobRoles.find(r => r.id === selectedEmployee.hrJobRoleId) : null;
    const selectedDisplayRole = selectedHrRole ? selectedHrRole.title : (selectedEmployee?.role || 'FUNCIONÁRIO');
    
    let selectedBaseHours = 220;
    if (selectedEmployee?.workModel === '12X36') selectedBaseHours = 180;
    else if (selectedEmployee?.workModel === 'PART_TIME') selectedBaseHours = 125;
    else if ((selectedEmployee?.workModel as string) === 'HOURLY' && selectedSlip) selectedBaseHours = selectedSlip.hoursWorked;
    
    // Estados para Calculadora de Eventos
    const [calcMode, setCalcMode] = useState<'MANUAL' | 'DAYS' | 'HOURS'>('MANUAL');
    const [calcQty, setCalcQty] = useState<number>(0);
    
    // Estados Específicos para Faltas
    const [absenceDate, setAbsenceDate] = useState(new Date().toISOString().split('T')[0]);
    const [isJustified, setIsJustified] = useState(false);
    const [deductDSR, setDeductDSR] = useState(false);

    // Modal Fechar Folha
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
    const [sendToFinance, setSendToFinance] = useState(true);
    const [sendTaxesToFinance, setSendTaxesToFinance] = useState(true);

    // Modal Listar Eventos
    const [isEventsListModalOpen, setIsEventsListModalOpen] = useState(false);
    const [selectedStaffForEvents, setSelectedStaffForEvents] = useState<PayrollPreview | null>(null);

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

    useEffect(() => {
        // Removido cálculo local para cumprir requisito de "tudo no backend"
    }, [eventForm.type, staffState.eventTypes]);

    useEffect(() => {
        // Removido cálculo local para cumprir requisito de "tudo no backend"
    }, [calcQty, calcMode, eventForm.staffId, staffState.users, eventForm.type, isJustified, deductDSR, staffState.eventTypes]);

    const handleClosePayroll = async () => {
        try {
            setLoading(true);
            await closePayroll(month, year);
            
            if (sendToFinance) {
                for (const p of payrollData) {
                    if (p.netTotal > 0) {
                        // O vencimento será o 5º dia útil do mês seguinte, simplificando para dia 5
                        const dueDate = new Date(year, month + 1, 5);
                        await addExpense({
                            id: Math.random().toString(36).substr(2, 9),
                            description: `Salário ${p.staffName} - Ref: ${String(month + 1).padStart(2, '0')}/${year}`,
                            amount: p.netTotal,
                            category: 'Folha de Pagamento',
                            dueDate: dueDate,
                            isPaid: false,
                            isRecurring: false
                        });
                    }
                }
            }

            if (sendTaxesToFinance) {
                const totalINSS = payrollData.reduce((acc, p) => acc + p.inssValue, 0);
                const totalIRRF = payrollData.reduce((acc, p) => acc + p.irrfValue, 0);
                const totalFGTS = payrollData.reduce((acc, p) => acc + p.fgtsValue, 0);

                if (totalINSS > 0) {
                    const dueDateINSS = new Date(year, month + 1, 20);
                    await addExpense({
                        id: Math.random().toString(36).substr(2, 9),
                        description: `Guia INSS - Ref: ${String(month + 1).padStart(2, '0')}/${year}`,
                        amount: totalINSS,
                        category: 'Impostos Folha',
                        dueDate: dueDateINSS,
                        isPaid: false,
                        isRecurring: false
                    });
                }

                if (totalIRRF > 0) {
                    const dueDateIRRF = new Date(year, month + 1, 20);
                    await addExpense({
                        id: Math.random().toString(36).substr(2, 9),
                        description: `Guia IRRF - Ref: ${String(month + 1).padStart(2, '0')}/${year}`,
                        amount: totalIRRF,
                        category: 'Impostos Folha',
                        dueDate: dueDateIRRF,
                        isPaid: false,
                        isRecurring: false
                    });
                }

                if (totalFGTS > 0) {
                    const dueDateFGTS = new Date(year, month + 1, 7);
                    await addExpense({
                        id: Math.random().toString(36).substr(2, 9),
                        description: `Guia FGTS - Ref: ${String(month + 1).padStart(2, '0')}/${year}`,
                        amount: totalFGTS,
                        category: 'Impostos Folha',
                        dueDate: dueDateFGTS,
                        isPaid: false,
                        isRecurring: false
                    });
                }
            }

            await loadData();
            setIsCloseModalOpen(false);
            showAlert({ title: "Sucesso", message: `Folha fechada e arquivada.${sendToFinance || sendTaxesToFinance ? ' Despesas enviadas ao financeiro.' : ''}`, type: "SUCCESS" });
        } catch (error: any) {
            showAlert({ title: "Erro", message: error.message, type: "ERROR" });
        } finally {
            setLoading(false);
        }
    };

    const handleReopenPayroll = () => {
        showConfirm({
            title: "Reabrir Folha de Pagamento?",
            message: "Isso excluirá o histórico fechado desta folha. Despesas enviadas ao financeiro NÃO serão excluídas automaticamente, você precisará cancelá-las manualmente lá. Deseja continuar?",
            confirmText: "Reabrir Folha",
            onConfirm: async () => {
                try {
                    setLoading(true);
                    await reopenPayroll(month, year);
                    await loadData();
                    showAlert({ title: "Sucesso", message: "Folha reaberta com sucesso.", type: "SUCCESS" });
                } catch (error: any) {
                    showAlert({ title: "Erro", message: error.message, type: "ERROR" });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleDeleteEvent = async (id: string) => {
        showConfirm({
            title: "Excluir Evento?",
            message: "Tem certeza que deseja excluir este evento da folha?",
            confirmText: "Excluir",
            onConfirm: async () => {
                try {
                    setLoading(true);
                    await deletePayrollEvent(id);
                    await loadData();
                    showAlert({ title: "Sucesso", message: "Evento excluído.", type: "SUCCESS" });
                } catch (error: any) {
                    showAlert({ title: "Erro", message: error.message, type: "ERROR" });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleAddEvent = async () => {
        if (!eventForm.staffId || !eventForm.type) return; 
        try {
            const selectedEventType = staffState.eventTypes.find(t => t.id === eventForm.type);
            const isDeduction = selectedEventType?.operation === '-';

            let finalDesc = eventForm.description;
            if (!finalDesc) {
                if (isDeduction && calcMode === 'DAYS') {
                     const dateStr = new Date(absenceDate).toLocaleDateString('pt-BR');
                     if (isJustified) {
                         finalDesc = `Falta Justificada em ${dateStr}`;
                     } else {
                         finalDesc = `Falta Injustificada (${calcQty}d) em ${dateStr}`;
                         if (deductDSR) finalDesc += " + DSR";
                     }
                } else if (calcMode !== 'MANUAL') {
                    const label = calcMode === 'DAYS' ? 'dias' : 'horas';
                    const typeLabel = isDeduction ? 'Falta/Desc' : 'Extra';
                    finalDesc = `${typeLabel}: ${calcQty} ${label}`;
                }
            }

            await addPayrollEvent({ 
                staffId: eventForm.staffId, 
                month, year, 
                type: eventForm.type as PayrollEventType, 
                value: Number(eventForm.value), 
                description: finalDesc 
            });
            showAlert({ title: "Lançado", message: "Evento adicionado à pré-folha.", type: "SUCCESS" });
            setIsEventModalOpen(false);
            loadData();
        } catch (e) {
            showAlert({ title: "Erro", message: "Falha ao lançar evento.", type: "ERROR" });
        }
    };

    const handleGenerateRecurring = async () => {
        try {
            setLoading(true);
            await generateRecurringEventsForMonth(month, year);
            await loadData();
            showAlert({ title: "Sucesso", message: "Eventos recorrentes gerados para este mês.", type: "SUCCESS" });
        } catch (error: any) {
            showAlert({ title: "Erro", message: error.message, type: "ERROR" });
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        if (payrollData.length === 0) return;
        let csv = "Colaborador;Cargo;Salario Base;H.Extra 50%;H.Extra 100%;Adic. Noturno;Bonus;Bruto;INSS;IRRF;Outros Desc.;Liquido;Custo Empresa\n";
        payrollData.forEach(p => {
            const employee = staffState.users.find(u => u.id === p.staffId);
            const role = employee?.role || '-';
            csv += `${p.staffName};${role};${p.baseSalary.toFixed(2)};${p.overtime50.toFixed(2)};${p.overtime100.toFixed(2)};${p.nightShiftAdd.toFixed(2)};${p.eventsValue.toFixed(2)};${p.grossTotal.toFixed(2)};${p.inssValue.toFixed(2)};${p.irrfValue.toFixed(2)};${(p.discounts - p.inssValue - p.irrfValue).toFixed(2)};${p.netTotal.toFixed(2)};${p.totalCompanyCost.toFixed(2)}\n`;
        });
        const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csv);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `folha_${month+1}_${year}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    const handlePrintSlip = (slip: PayrollPreview) => {
        const employeeTaxes = slip.taxBreakdown.filter(t => t.type !== 'EMPLOYER');
        const employee = staffState.users.find(u => u.id === slip.staffId);
        const company = restState.businessInfo;
        const theme = restState.theme;

        const overtimeTotal = slip.overtime50 + slip.overtime100;
        
        const hrRole = staffState.hrJobRoles.find(r => r.id === employee?.hrJobRoleId);
        const displayRole = hrRole ? hrRole.title : (employee?.role || 'FUNCIONÁRIO');

        // Determine base hours based on work model
        let baseHours = 220; // Default 44h weekly
        if (employee?.workModel === '12X36') baseHours = 180;
        else if (employee?.workModel === 'PART_TIME') baseHours = 125;
        else if ((employee?.workModel as string) === 'HOURLY') baseHours = slip.hoursWorked;

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
                        <div class="field"><label>Cargo</label><span>${displayRole.toUpperCase()}</span></div>
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
                            <div class="col-ref">${baseHours}h</div>
                            <div class="col-val">${slip.baseSalary.toFixed(2)}</div>
                            <div class="col-val"></div>
                        </div>

                        <!-- Horas Extras -->
                        ${overtimeTotal > 0 ? `
                        <div class="table-row">
                            <div class="col-code">002</div>
                            <div class="col-desc">HORAS EXTRAS</div>
                            <div class="col-ref"></div>
                            <div class="col-val">${overtimeTotal.toFixed(2)}</div>
                            <div class="col-val"></div>
                        </div>` : ''}

                        <!-- Benefícios e Eventos -->
                        ${slip.benefitBreakdown.map((b, i) => `
                        <div class="table-row">
                            <div class="col-code">${100+i}</div>
                            <div class="col-desc">${b.name.toUpperCase()}</div>
                            <div class="col-ref"></div>
                            <div class="col-val">${b.value.toFixed(2)}</div>
                            <div class="col-val"></div>
                        </div>`).join('')}

                        ${slip.eventBreakdown.filter(e => e.type === 'CREDIT').map((e, i) => `
                        <div class="table-row">
                            <div class="col-code">${200+i}</div>
                            <div class="col-desc">${e.name.toUpperCase()}</div>
                            <div class="col-ref"></div>
                            <div class="col-val">${e.value.toFixed(2)}</div>
                            <div class="col-val"></div>
                        </div>`).join('')}

                        ${slip.eventBreakdown.filter(e => e.type === 'DEBIT').map((e, i) => `
                        <div class="table-row">
                            <div class="col-code">${500+i}</div>
                            <div class="col-desc">${e.name.toUpperCase()}</div>
                            <div class="col-ref"></div>
                            <div class="col-val"></div>
                            <div class="col-val">${e.value.toFixed(2)}</div>
                        </div>`).join('')}

                        <!-- Descontos Impostos -->
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

    const totalBruto = payrollData.reduce((acc, p) => acc + p.grossTotal, 0);
    const totalLiquido = payrollData.reduce((acc, p) => acc + p.netTotal, 0);
    const totalCustoEmpresa = payrollData.reduce((acc, p) => acc + p.totalCompanyCost, 0);

    const getSelectedUserSalary = () => {
        const user = staffState.users.find(u => u.id === eventForm.staffId);
        return user ? user.baseSalary || 0 : 0;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header de Controle */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        {isClosed ? <Lock size={24} className="text-red-500"/> : <Calculator size={24} className="text-pink-600"/>} 
                        {isClosed ? 'Folha Fechada' : 'Pré-Folha de Pagamento'}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {isClosed 
                            ? `Fechado em ${closedInfo?.closedAt?.toLocaleDateString()} por ${closedInfo?.closedBy}`
                            : 'Gestão de salários, horas extras e eventos variáveis.'}
                    </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl mr-2">
                        <select className="bg-transparent text-sm font-bold p-2 outline-none" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                            {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                        <select className="bg-transparent text-sm font-bold p-2 outline-none" value={year} onChange={e => setYear(parseInt(e.target.value))}>
                            <option value={2025}>2025</option><option value={2026}>2026</option>
                        </select>
                    </div>
                    
                    {!isClosed && (
                        <>
                            <Button onClick={handleGenerateRecurring} disabled={loading} variant="secondary" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                                <RefreshCcw size={16} className="mr-2"/> Gerar Recorrentes
                            </Button>
                            <Button onClick={() => { 
                                setEventForm({ staffId: '', type: staffState.eventTypes.length > 0 ? staffState.eventTypes[0].id : '', value: 0, description: '' }); 
                                setCalcMode('MANUAL');
                                setCalcQty(0);
                                setIsEventModalOpen(true); 
                                // Resetar estados de falta
                                setIsJustified(false);
                                setDeductDSR(false);
                                setAbsenceDate(new Date().toISOString().split('T')[0]);
                            }} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                                <Plus size={16} className="mr-2"/> Lançar Evento
                            </Button>
                            <Button onClick={() => setIsCloseModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white shadow-sm">
                                <Lock size={16} className="mr-2"/> Fechar
                            </Button>
                        </>
                    )}
                    {isClosed && (
                        <Button onClick={handleReopenPayroll} className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm">
                            <Unlock size={16} className="mr-2"/> Reabrir Folha
                        </Button>
                    )}
                    
                    <Button onClick={handleExportCSV} variant="secondary">
                        <Download size={16} className="mr-2"/> Contabilidade
                    </Button>
                    <Button onClick={loadData} disabled={loading} variant="secondary" className="px-3">
                        <RefreshCcw size={18} className={loading ? "animate-spin" : ""}/>
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Bruto</p><p className="text-2xl font-black text-slate-800">R$ {totalBruto.toFixed(2)}</p></div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Líquido a Pagar</p><p className="text-2xl font-black text-emerald-600">R$ {totalLiquido.toFixed(2)}</p></div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Custo Total Empresa</p><p className="text-2xl font-black text-slate-900">R$ {totalCustoEmpresa.toFixed(2)}</p></div>
            </div>

            {/* Tabela Detalhada */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b">
                            <tr>
                                <th className="p-4">Colaborador</th>
                                <th className="p-4 text-right">Base</th>
                                <th className="p-4 text-right">H.Extra / Adic.</th>
                                <th className="p-4 text-right">Variáveis</th>
                                <th className="p-4 text-right">Bruto</th>
                                <th className="p-4 text-right text-red-600">Descontos</th>
                                <th className="p-4 text-right bg-emerald-50 text-emerald-800">Líquido</th>
                                <th className="p-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-sm">
                            {payrollData.map(p => (
                                <tr key={p.staffId} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800">{p.staffName}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">
                                            {p.hoursWorked.toFixed(1)}h Trab. | Banco: {p.bankOfHoursBalance > 0 ? '+' : ''}{p.bankOfHoursBalance.toFixed(1)}h
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">R$ {p.baseSalary.toFixed(2)}</td>
                                    <td className="p-4 text-right text-blue-600">
                                        R$ {(p.overtime50 + p.overtime100 + p.nightShiftAdd + p.addictionals).toFixed(2)}
                                        <div className="text-[9px] text-gray-400">
                                            {p.nightShiftAdd > 0 && `(Not: ${p.nightShiftAdd.toFixed(2)})`}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right text-orange-600">
                                        {p.eventsValue !== 0 ? `R$ ${p.eventsValue.toFixed(2)}` : '-'}
                                    </td>
                                    <td className="p-4 text-right font-bold">R$ {p.grossTotal.toFixed(2)}</td>
                                    <td className="p-4 text-right text-red-500">- R$ {p.discounts.toFixed(2)}</td>
                                    <td className="p-4 text-right font-black text-emerald-600 bg-emerald-50">R$ {p.netTotal.toFixed(2)}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-1">
                                            <button onClick={() => { setSelectedStaffForEvents(p); setIsEventsListModalOpen(true); }} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg" title="Ver Eventos Lançados"><List size={18}/></button>
                                            <button onClick={() => setSelectedSlip(p)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg" title="Ver Holerite"><Eye size={18}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Lançamento de Eventos (LAYOUT OTIMIZADO) */}
            <Modal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} title="Lançamento Variável" variant="page" onSave={handleAddEvent}>
                <div className="max-w-7xl mx-auto space-y-6 pt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        
                        {/* COLUNA ESQUERDA: DADOS DO LANÇAMENTO (5 cols em telas grandes) */}
                        <div className="lg:col-span-5 space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                                    <FileText size={18} className="text-blue-600"/> Dados do Evento
                                </h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Colaborador</label>
                                        <select className="w-full border p-3 rounded-xl bg-white mt-1" value={eventForm.staffId} onChange={e => setEventForm({...eventForm, staffId: e.target.value})}>
                                            <option value="">Selecione...</option>
                                            {staffState.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Tipo de Evento</label>
                                        <select className="w-full border p-3 rounded-xl bg-white mt-1" value={eventForm.type} onChange={e => setEventForm({...eventForm, type: e.target.value})}>
                                            <option value="">Selecione...</option>
                                            {staffState.eventTypes.filter(t => t.isActive).map(t => (
                                                <option key={t.id} value={t.id}>{t.name} ({t.operation})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Descrição</label>
                                        <input className="w-full border p-3 rounded-xl mt-1" placeholder={calcMode !== 'MANUAL' ? "Calculado automaticamente..." : "Ex: Meta batida"} value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* COLUNA DIREITA: CALCULADORA (7 cols em telas grandes) */}
                        <div className="lg:col-span-7">
                             {eventForm.staffId ? (
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 h-full flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="text-sm font-black text-slate-600 uppercase flex items-center gap-2">
                                                <Calculator size={18}/> Calculadora Automática
                                            </h4>
                                            <div className="text-xs bg-white px-3 py-1 rounded-lg border text-slate-500 font-mono">
                                                Base: R$ {getSelectedUserSalary().toFixed(2)}
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2 mb-6">
                                            <button 
                                                onClick={() => setCalcMode('MANUAL')} 
                                                className={`flex-1 py-3 text-xs font-bold rounded-xl border-2 transition-all ${calcMode === 'MANUAL' ? 'bg-white border-blue-500 text-blue-600 shadow-sm' : 'border-transparent bg-white/50 text-gray-500 hover:bg-white'}`}
                                            >
                                                Manual
                                            </button>
                                            <button 
                                                onClick={() => setCalcMode('DAYS')} 
                                                className={`flex-1 py-3 text-xs font-bold rounded-xl border-2 transition-all ${calcMode === 'DAYS' ? 'bg-white border-blue-500 text-blue-600 shadow-sm' : 'border-transparent bg-white/50 text-gray-500 hover:bg-white'}`}
                                            >
                                                Dias (1/30)
                                            </button>
                                            <button 
                                                onClick={() => setCalcMode('HOURS')} 
                                                className={`flex-1 py-3 text-xs font-bold rounded-xl border-2 transition-all ${calcMode === 'HOURS' ? 'bg-white border-blue-500 text-blue-600 shadow-sm' : 'border-transparent bg-white/50 text-gray-500 hover:bg-white'}`}
                                            >
                                                Horas (1/220)
                                            </button>
                                        </div>
                                        
                                        {/* PAINEL DINÂMICO DE CÁLCULO */}
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-inner">
                                            <p className="text-sm text-gray-500 italic text-center py-4">
                                                Insira o valor final ou a porcentagem abaixo. O sistema processará os cálculos no servidor.
                                            </p>
                                        </div>
                                    </div>

                                    {/* RESULTADO FINAL (Big Input) */}
                                    <div className="mt-6 pt-6 border-t border-slate-200">
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-2">
                                            {staffState.eventTypes.find(t => t.id === eventForm.type)?.calculationType === 'PERCENTAGE' ? 'Porcentagem (%)' : 'Valor Final do Lançamento'}
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-4 text-gray-400 font-bold">
                                                {staffState.eventTypes.find(t => t.id === eventForm.type)?.calculationType === 'PERCENTAGE' ? '%' : 'R$'}
                                            </span>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                className={`w-full border-2 p-4 pl-12 rounded-2xl font-black text-3xl outline-none transition-all ${staffState.eventTypes.find(t => t.id === eventForm.type)?.operation === '-' ? 'text-red-600 border-red-100 focus:border-red-400' : 'text-green-600 border-green-100 focus:border-green-400'} bg-white`} 
                                                value={eventForm.value} 
                                                onChange={e => setEventForm({...eventForm, value: parseFloat(e.target.value)})}
                                            />
                                        </div>
                                    </div>
                                </div>
                             ) : (
                                 <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl h-full flex flex-col items-center justify-center text-gray-400 p-10">
                                     <Calculator size={48} className="mb-4 opacity-20"/>
                                     <p>Selecione um colaborador para habilitar a calculadora.</p>
                                 </div>
                             )}
                        </div>
                    </div>
                </div>
            </Modal>
            
            {/* Modal de Holerite (Recibo de Pagamento) - MANTIDO IDÊNTICO */}
            <Modal isOpen={!!selectedSlip} onClose={() => setSelectedSlip(null)} title="Recibo de Pagamento (Holerite)" variant="dialog" maxWidth="4xl">
                {selectedSlip && (
                    <div className="space-y-6">
                        {/* Wrapper Estilo Holerite Visual */}
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
                                    <span className="uppercase">{selectedDisplayRole}</span>
                                </div>
                                <div>
                                     <label className="block text-[10px] font-bold text-gray-500 uppercase">Departamento</label>
                                     <span className="uppercase">{selectedEmployee?.department || 'GERAL'}</span>
                                </div>
                                <div>
                                     <label className="block text-[10px] font-bold text-gray-500 uppercase">Admissão</label>
                                     <span>{selectedEmployee?.hireDate ? new Date(selectedEmployee.hireDate).toLocaleDateString() : '-'}</span>
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
                                        <div className="col-span-2 text-center">{selectedBaseHours}h</div>
                                        <div className="col-span-2 text-right">{selectedSlip.baseSalary.toFixed(2)}</div>
                                        <div className="col-span-2 text-right"></div>
                                    </div>
                                    {selectedSlip.overtime50 > 0 && (
                                        <div className="grid grid-cols-12">
                                            <div className="col-span-1 text-center">002</div>
                                            <div className="col-span-5">HORAS EXTRAS 50%</div>
                                            <div className="col-span-2 text-center"></div>
                                            <div className="col-span-2 text-right">{selectedSlip.overtime50.toFixed(2)}</div>
                                            <div className="col-span-2 text-right"></div>
                                        </div>
                                    )}
                                    {selectedSlip.overtime100 > 0 && (
                                        <div className="grid grid-cols-12">
                                            <div className="col-span-1 text-center">003</div>
                                            <div className="col-span-5">HORAS EXTRAS 100%</div>
                                            <div className="col-span-2 text-center"></div>
                                            <div className="col-span-2 text-right">{selectedSlip.overtime100.toFixed(2)}</div>
                                            <div className="col-span-2 text-right"></div>
                                        </div>
                                    )}
                                    {selectedSlip.eventBreakdown.filter(e => e.name.toUpperCase().includes('DSR')).map((evt, i) => (
                                        <div key={`dsr-${i}`} className="grid grid-cols-12">
                                            <div className="col-span-1 text-center">{600+i}</div>
                                            <div className="col-span-5">{evt.name.toUpperCase()}</div>
                                            <div className="col-span-2 text-center"></div>
                                            <div className="col-span-2 text-right">{evt.value.toFixed(2)}</div>
                                            <div className="col-span-2 text-right"></div>
                                        </div>
                                    ))}
                                    {selectedSlip.benefitBreakdown.map((ben, i) => (
                                        <div key={`ben-${i}`} className="grid grid-cols-12">
                                            <div className="col-span-1 text-center">{100+i}</div>
                                            <div className="col-span-5">{ben.name.toUpperCase()}</div>
                                            <div className="col-span-2 text-center"></div>
                                            <div className="col-span-2 text-right">{ben.value.toFixed(2)}</div>
                                            <div className="col-span-2 text-right"></div>
                                        </div>
                                    ))}
                                    {selectedSlip.eventBreakdown.filter(e => e.type === 'CREDIT').map((evt, i) => (
                                        <div key={`evt-c-${i}`} className="grid grid-cols-12">
                                            <div className="col-span-1 text-center">{200+i}</div>
                                            <div className="col-span-5">{evt.name.toUpperCase()}</div>
                                            <div className="col-span-2 text-center"></div>
                                            <div className="col-span-2 text-right">{evt.value.toFixed(2)}</div>
                                            <div className="col-span-2 text-right"></div>
                                        </div>
                                    ))}
                                    {selectedSlip.eventBreakdown.filter(e => e.type === 'DEBIT').map((evt, i) => (
                                        <div key={`evt-d-${i}`} className="grid grid-cols-12">
                                            <div className="col-span-1 text-center">{500+i}</div>
                                            <div className="col-span-5">{evt.name.toUpperCase()}</div>
                                            <div className="col-span-2 text-center"></div>
                                            <div className="col-span-2 text-right"></div>
                                            <div className="col-span-2 text-right">{evt.value.toFixed(2)}</div>
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
            <Modal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} title="Fechar Folha de Pagamento" variant="dialog">
                <div className="space-y-6 pt-4">
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3">
                        <AlertTriangle className="text-amber-600 flex-shrink-0" size={24} />
                        <div>
                            <h4 className="font-bold text-amber-800">Atenção</h4>
                            <p className="text-sm text-amber-700 mt-1">
                                Fechar a folha criará um histórico imutável para este mês. Certifique-se de ter lançado todos os eventos variáveis (bônus, faltas, etc).
                            </p>
                        </div>
                    </div>

                    <label className={`flex items-start gap-3 cursor-pointer p-4 rounded-xl border-2 transition-all ${sendToFinance ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="mt-0.5">
                            <input type="checkbox" className="hidden" checked={sendToFinance} onChange={e => setSendToFinance(e.target.checked)} />
                            <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${sendToFinance ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                                {sendToFinance && <CheckSquare size={14} className="text-white"/>}
                            </div>
                        </div>
                        <div>
                            <div className="font-bold text-slate-800">Enviar Salários para o Financeiro</div>
                            <div className="text-xs text-slate-500 mt-1">
                                Cria automaticamente uma conta a pagar (Despesa) para cada funcionário com o valor líquido do salário. O vencimento será no dia 5 do mês seguinte.
                            </div>
                        </div>
                    </label>

                    <label className={`flex items-start gap-3 cursor-pointer p-4 rounded-xl border-2 transition-all ${sendTaxesToFinance ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="mt-0.5">
                            <input type="checkbox" className="hidden" checked={sendTaxesToFinance} onChange={e => setSendTaxesToFinance(e.target.checked)} />
                            <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${sendTaxesToFinance ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                                {sendTaxesToFinance && <CheckSquare size={14} className="text-white"/>}
                            </div>
                        </div>
                        <div>
                            <div className="font-bold text-slate-800">Enviar Guias de Impostos para o Financeiro</div>
                            <div className="text-xs text-slate-500 mt-1">
                                Cria automaticamente contas a pagar para as guias consolidadas de INSS, IRRF e FGTS de todos os funcionários, com seus respectivos vencimentos.
                            </div>
                        </div>
                    </label>

                    <div className="flex gap-3 pt-4">
                        <Button variant="secondary" onClick={() => setIsCloseModalOpen(false)} className="flex-1">Cancelar</Button>
                        <Button onClick={handleClosePayroll} disabled={loading} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                            {loading ? 'Fechando...' : 'Congelar Folha'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal Listar Eventos */}
            <Modal isOpen={isEventsListModalOpen} onClose={() => setIsEventsListModalOpen(false)} title={`Eventos Lançados - ${selectedStaffForEvents?.staffName}`} variant="dialog">
                <div className="space-y-4 pt-4">
                    {(() => {
                        if (!selectedStaffForEvents) return null;
                        const staffEvents = staffState.payrollEvents.filter(e => e.staffId === selectedStaffForEvents.staffId && e.month === month && e.year === year);
                        
                        if (staffEvents.length === 0) {
                            return <div className="text-center p-6 text-gray-500 italic bg-slate-50 rounded-xl">Nenhum evento variável lançado para este colaborador neste mês.</div>;
                        }

                        return (
                            <div className="space-y-2">
                                {staffEvents.map(ev => {
                                    const evtType = staffState.eventTypes.find(t => t.id === ev.type);
                                    const isDeduction = evtType?.operation === '-';
                                    return (
                                    <div key={ev.id} className="flex justify-between items-center p-3 bg-white border rounded-xl shadow-sm">
                                        <div>
                                            <div className="font-bold text-slate-800 text-sm">{ev.description || evtType?.name || ev.type}</div>
                                            <div className="text-xs text-slate-500">{evtType?.name || ev.type}</div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className={`font-black ${isDeduction ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {isDeduction ? '-' : '+'} {evtType?.calculationType === 'PERCENTAGE' ? `${ev.value}%` : `R$ ${ev.value.toFixed(2)}`}
                                            </div>
                                            {!isClosed && (
                                                <button onClick={() => handleDeleteEvent(ev.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 size={16}/>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )})}
                            </div>
                        );
                    })()}
                    <div className="pt-4 flex justify-end">
                        <Button variant="secondary" onClick={() => setIsEventsListModalOpen(false)}>Fechar</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
