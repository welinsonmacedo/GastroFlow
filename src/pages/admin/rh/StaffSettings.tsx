
import React, { useState, useRef } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useStaff } from '../../../context/StaffContext';

// Register inline styles for Quill to ensure proper printing
const AlignStyle = Quill.import('attributors/style/align');
Quill.register(AlignStyle, true);
import { useUI } from '../../../context/UIContext';
import { useRestaurant } from '../../../context/RestaurantContext';
import { Button } from '../../../components/Button';
import { HrJobRole, EventType, ContractTemplate, ContractTemplateType } from '../../../types';
import { Plus, Trash2, Settings, DollarSign, RefreshCcw, FileText, Scale, Calculator, Edit3, Calendar, Bold, Italic, Underline, AlignCenter, Type, Eye, Printer } from 'lucide-react';
import { LegalSettingsModal } from '../../../components/modals/LegalSettingsModal';
import { HrJobRoleModal } from '../../../components/modals/HrJobRoleModal';
import { Modal } from '../../../components/Modal';
import { StaffSchedules } from './StaffSchedules';
import { StaffRecurringEvents } from './StaffRecurringEvents';

export const StaffSettings: React.FC = () => {
    const { state, applyLegalDefaults, deleteHrJobRole, addEventType, updateEventType, deleteEventType, addContractTemplate, updateContractTemplate, deleteContractTemplate } = useStaff();
    const { state: restState } = useRestaurant();
    const { showAlert, showConfirm } = useUI();

    // Abas de Configuração
    const [activeTab, setActiveTab] = useState<'LEGAL' | 'CUSTOM' | 'ROLES' | 'EVENT_TYPES' | 'CONTRACTS' | 'CALC_PARAMS' | 'SCHEDULES' | 'RECURRING'>('LEGAL');
    const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
    
    // Estado para Parâmetros de Cálculo
    const [calcParamsForm, setCalcParamsForm] = useState({
        vacationDaysEntitlement: 30,
        vacationSoldDaysLimit: 10,
        thirteenthMinMonthsWorked: 1,
        noticePeriodDays: 30,
        noticePeriodDaysPerYear: 3,
        noticePeriodMaxDays: 90,
        fgtsFinePercent: 40,
        standardMonthlyHours: 220
    });

    React.useEffect(() => {
        if (state.legalSettings) {
            setCalcParamsForm({
                vacationDaysEntitlement: state.legalSettings.vacationDaysEntitlement || 30,
                vacationSoldDaysLimit: state.legalSettings.vacationSoldDaysLimit || 10,
                thirteenthMinMonthsWorked: state.legalSettings.thirteenthMinMonthsWorked || 1,
                noticePeriodDays: state.legalSettings.noticePeriodDays || 30,
                noticePeriodDaysPerYear: state.legalSettings.noticePeriodDaysPerYear || 3,
                noticePeriodMaxDays: state.legalSettings.noticePeriodMaxDays || 90,
                fgtsFinePercent: state.legalSettings.fgtsFinePercent || 40,
                standardMonthlyHours: state.legalSettings.standardMonthlyHours || 220
            });
        }
    }, [state.legalSettings]);

    const handleSaveCalcParams = async () => {
        if (!state.legalSettings) return showAlert({ title: "Erro", message: "Configure as tabelas legais primeiro.", type: "ERROR" });
        try {
            await useStaff().saveLegalSettings({
                ...state.legalSettings,
                ...calcParamsForm
            });
            showAlert({ title: "Sucesso", message: "Parâmetros atualizados.", type: "SUCCESS" });
        } catch (error: any) {
            showAlert({ title: "Erro", message: error.message, type: "ERROR" });
        }
    };

    const [isHrRoleModalOpen, setIsHrRoleModalOpen] = useState(false);
    const [editingHrRole, setEditingHrRole] = useState<HrJobRole | null>(null);

    const [isEventTypeModalOpen, setIsEventTypeModalOpen] = useState(false);
    const [editingEventType, setEditingEventType] = useState<EventType | null>(null);
    const [eventTypeForm, setEventTypeForm] = useState<Partial<EventType>>({ name: '', operation: '+', isActive: true, calculationType: 'FIXED' });

    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [editingContract, setEditingContract] = useState<ContractTemplate | null>(null);
    const [contractForm, setContractForm] = useState<Partial<ContractTemplate>>({ name: '', content: '', type: 'CONTRACT', isActive: true });
    const [contractPreviewMode, setContractPreviewMode] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleOpenContractModal = (template?: ContractTemplate) => {
        setContractPreviewMode(false);
        if (template) {
            setEditingContract(template);
            setContractForm(template);
        } else {
            setEditingContract(null);
            setContractForm({ name: '', content: '', type: 'CONTRACT', isActive: true });
        }
        setIsContractModalOpen(true);
    };

    const handleSaveContract = async () => {
        if (!contractForm.name || !contractForm.content) return showAlert({ title: "Atenção", message: "Preencha o nome e o conteúdo do contrato.", type: "WARNING" });
        try {
            if (editingContract) {
                await updateContractTemplate({ ...editingContract, ...contractForm } as ContractTemplate);
                showAlert({ title: "Sucesso", message: "Modelo atualizado.", type: "SUCCESS" });
            } else {
                await addContractTemplate(contractForm);
                showAlert({ title: "Sucesso", message: "Modelo criado.", type: "SUCCESS" });
            }
            setIsContractModalOpen(false);
        } catch (error: any) {
            showAlert({ title: "Erro", message: error.message, type: "ERROR" });
        }
    };

    const handleDeleteContract = (id: string) => {
        showConfirm({
            title: "Excluir Modelo?",
            message: "Tem certeza que deseja excluir este modelo de contrato?",
            onConfirm: () => deleteContractTemplate(id)
        });
    };

    const handleOpenEventTypeModal = (evt?: EventType) => {
        if (evt) {
            setEditingEventType(evt);
            setEventTypeForm(evt);
        } else {
            setEditingEventType(null);
            setEventTypeForm({ name: '', operation: '+', isActive: true, calculationType: 'FIXED' });
        }
        setIsEventTypeModalOpen(true);
    };

    const handleSaveEventType = async () => {
        if (!eventTypeForm.name) return showAlert({ title: "Atenção", message: "Preencha o nome do evento.", type: "WARNING" });
        try {
            if (editingEventType) {
                await updateEventType({ ...editingEventType, ...eventTypeForm } as EventType);
                showAlert({ title: "Sucesso", message: "Tipo de evento atualizado.", type: "SUCCESS" });
            } else {
                await addEventType(eventTypeForm);
                showAlert({ title: "Sucesso", message: "Tipo de evento criado.", type: "SUCCESS" });
            }
            setIsEventTypeModalOpen(false);
        } catch (error: any) {
            showAlert({ title: "Erro", message: error.message, type: "ERROR" });
        }
    };

    const handleDeleteEventType = (id: string) => {
        showConfirm({
            title: "Excluir Tipo de Evento?",
            message: "Tem certeza que deseja excluir este tipo de evento? Isso não afetará os eventos já lançados na folha.",
            onConfirm: () => deleteEventType(id)
        });
    };

    const handleResetLegal = () => {
        showConfirm({
            title: "Carregar Tabela Oficial 2026?",
            message: "Isso irá sobrescrever as faixas de INSS e IRRF com os valores padrão de 2026.",
            onConfirm: async () => {
                await applyLegalDefaults('2026');
                showAlert({ title: "Atualizado", message: "Tabela de 2026 carregada com sucesso.", type: "SUCCESS" });
            }
        });
    };

    const handleDeleteHrRole = (id: string) => {
        const usersWithRole = state.users.filter(u => u.hrJobRoleId === id);
        if (usersWithRole.length > 0) {
            return showAlert({ title: "Impossível Excluir", message: `Existem ${usersWithRole.length} funcionários vinculados a este cargo. Remova-os primeiro.`, type: 'WARNING' });
        }
        showConfirm({ title: "Excluir Cargo", message: "Confirma a exclusão deste cargo de RH?", onConfirm: () => deleteHrJobRole(id) });
    };

    const quillRef = useRef<ReactQuill>(null);

    const insertAtCursor = (text: string) => {
        const quill = quillRef.current?.getEditor();
        if (quill) {
            const range = quill.getSelection(true);
            quill.insertText(range.index, text);
            quill.setSelection(range.index + text.length, 0);
        } else {
            setContractForm({ ...contractForm, content: (contractForm.content || '') + text });
        }
    };

    const handlePrintContract = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        
        const content = contractForm.content || '';
        const company = restState.businessInfo;
        
        // Basic replacement for preview
        let rendered = content
            .replace(/{{empresa_nome}}/g, company.restaurantName || 'Empresa Teste')
            .replace(/{{empresa_cnpj}}/g, company.cnpj || '00.000.000/0001-00')
            .replace(/{{empresa_endereco}}/g, `${company.address?.street || ''}, ${company.address?.number || ''}`)
            .replace(/{{empresa_cidade}}/g, company.address?.city || '')
            .replace(/{{empresa_estado}}/g, company.address?.state || '')
            .replace(/{{empresa_telefone}}/g, company.phone || '')
            .replace(/{{empresa_email}}/g, company.email || '')
            .replace(/{{nome}}/g, 'Nome do Colaborador')
            .replace(/{{cpf}}/g, '000.000.000-00')
            .replace(/{{rg}}/g, '00.000.000-0')
            .replace(/{{endereco}}/g, 'Rua Teste, 123')
            .replace(/{{cidade_uf}}/g, 'Cidade/UF')
            .replace(/{{nacionalidade}}/g, 'Brasileiro(a)')
            .replace(/{{estado_civil}}/g, 'Solteiro(a)')
            .replace(/{{cargo}}/g, 'Cargo Teste')
            .replace(/{{setor}}/g, 'Setor Teste')
            .replace(/{{salario}}/g, 'R$ 2.000,00')
            .replace(/{{data_admissao}}/g, '01/01/2026')
            .replace(/{{jornada}}/g, '44h semanais')
            .replace(/{{ctps}}/g, '1234567 Série 001/UF')
            .replace(/{{pis}}/g, '123.45678.90-1');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Impressão de Documento</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 40px; line-height: 1.6; color: #333; }
                        @media print { body { padding: 0; } }
                        h1, h2, h3 { color: #000; }
                        p { margin-bottom: 1em; }
                    </style>
                </head>
                <body>
                    ${rendered}
                    <script>window.print(); window.close();</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">
             
             {/* Header */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Settings className="text-gray-600"/> Parâmetros de Folha</h2>
                <p className="text-sm text-gray-500">Regras fiscais, tabelas oficiais e descontos extras.</p>
                
                <div className="flex gap-4 mt-6 border-b">
                    <button onClick={() => setActiveTab('LEGAL')} className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'LEGAL' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>Tabelas Legais (INSS/IRRF)</button>
                    <button onClick={() => setActiveTab('ROLES')} className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'ROLES' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>Cargos & CBO</button>
                    <button onClick={() => setActiveTab('EVENT_TYPES')} className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'EVENT_TYPES' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>Tipos de Eventos</button>
                    <button onClick={() => setActiveTab('CONTRACTS')} className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'CONTRACTS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>Modelos de Contrato</button>
                    <button onClick={() => setActiveTab('RECURRING')} className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'RECURRING' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>Eventos Recorrentes</button>
                    <button onClick={() => setActiveTab('SCHEDULES')} className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'SCHEDULES' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>Escalas & Turnos</button>
                    <button onClick={() => setActiveTab('CALC_PARAMS')} className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'CALC_PARAMS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>Parâmetros de Cálculos</button>
                </div>
            </div>

            {/* ABA 1: TABELAS LEGAIS */}
            {activeTab === 'LEGAL' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="text-xs text-blue-800">
                            <strong>Vigência Atual:</strong> {state.legalSettings?.validFrom ? new Date(state.legalSettings.validFrom).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => setIsLegalModalOpen(true)} className="bg-blue-600 text-white shadow-lg">
                                <Edit3 size={16} className="mr-2"/> Editar Tabelas
                            </Button>
                            <Button onClick={handleResetLegal} variant="secondary" className="bg-white border text-blue-700">
                                <RefreshCcw size={16} className="mr-2"/> Restaurar Padrão 2026
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center gap-4 md:col-span-2">
                            <span className="text-sm font-bold text-slate-600">Configurações de Tabelas Legais</span>
                        </div>
                        {/* INSS Progressivo */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
                            <h3 className="font-bold text-orange-700 mb-4 flex items-center gap-2"><Scale size={18}/> INSS Progressivo</h3>
                            <div className="overflow-hidden rounded-xl border border-orange-100">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-orange-50 text-orange-800 text-xs font-bold uppercase">
                                        <tr><th className="p-3">Faixa Salarial</th><th className="p-3 text-right">Alíquota</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-orange-50">
                                        {state.inssBrackets.map((b) => (
                                            <tr key={b.id}>
                                                <td className="p-3">
                                                    R$ {b.minValue.toFixed(2)} até {b.maxValue ? `R$ ${b.maxValue.toFixed(2)}` : '...'}
                                                </td>
                                                <td className="p-3 text-right font-bold">{b.rate}%</td>
                                            </tr>
                                        ))}
                                        {state.inssBrackets.length === 0 && <tr><td colSpan={2} className="p-4 text-center text-gray-400">Nenhuma tabela carregada.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                                <strong>Teto INSS:</strong> R$ {state.legalSettings?.inssCeiling.toFixed(2) || '0.00'}
                            </div>
                        </div>

                        {/* IRRF */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
                            <h3 className="font-bold text-blue-700 mb-4 flex items-center gap-2"><Calculator size={18}/> IRRF (Imposto de Renda)</h3>
                            <div className="overflow-hidden rounded-xl border border-blue-100">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-blue-50 text-blue-800 text-xs font-bold uppercase">
                                        <tr><th className="p-3">Base de Cálculo</th><th className="p-3 text-right">Alíquota</th><th className="p-3 text-right">Dedução</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-blue-50">
                                        {state.irrfBrackets.map((b) => (
                                            <tr key={b.id}>
                                                <td className="p-3">
                                                    {b.minValue === 0 ? 'Até' : `De R$ ${b.minValue.toFixed(2)}`} {b.maxValue ? `até R$ ${b.maxValue.toFixed(2)}` : 'em diante'}
                                                </td>
                                                <td className="p-3 text-right font-bold">{b.rate === 0 ? 'Isento' : `${b.rate}%`}</td>
                                                <td className="p-3 text-right text-gray-500">R$ {b.deduction.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                         {state.irrfBrackets.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-gray-400">Nenhuma tabela carregada.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg flex justify-between">
                                <span><strong>Dedução p/ Dependente:</strong> R$ {state.legalSettings?.irrfDependentDeduction.toFixed(2) || '0.00'}</span>
                                <span><strong>Salário Mínimo:</strong> R$ {state.legalSettings?.minWage.toFixed(2) || '0.00'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ABA 3: CARGOS E CBO */}
            {activeTab === 'ROLES' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="text-xs text-blue-800">
                            <strong>Cargos de RH (CBO):</strong> Cadastre os cargos oficiais da empresa. Estes cargos poderão ser vinculados aos perfis de acesso do sistema.
                        </div>
                        <Button onClick={() => { setEditingHrRole(null); setIsHrRoleModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm shrink-0">
                            <Plus size={16} className="mr-2"/> Novo Cargo
                        </Button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 text-gray-600 uppercase text-xs border-b">
                                <tr>
                                    <th className="p-4">Cargo</th>
                                    <th className="p-4">CBO</th>
                                    <th className="p-4">Salário Base</th>
                                    <th className="p-4">Perfil de Acesso Vinculado</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {state.hrJobRoles.map(role => {
                                    const customRole = state.roles.find(r => r.id === role.customRoleId);
                                    return (
                                        <tr key={role.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-bold text-gray-800">{role.title}</td>
                                            <td className="p-4 text-gray-600 font-mono">{role.cboCode}</td>
                                            <td className="p-4 text-gray-600">R$ {role.baseSalary?.toFixed(2) || '0.00'}</td>
                                            <td className="p-4">
                                                {customRole ? (
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-bold">{customRole.name}</span>
                                                ) : (
                                                    <span className="text-gray-400 text-xs italic">Nenhum</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => { setEditingHrRole(role); setIsHrRoleModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg mr-2"><Edit3 size={18}/></button>
                                                <button onClick={() => handleDeleteHrRole(role.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {state.hrJobRoles.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500 italic">Nenhum cargo cadastrado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ABA 4: TIPOS DE EVENTOS */}
            {activeTab === 'EVENT_TYPES' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="text-xs text-blue-800">
                            <strong>Tipos de Eventos:</strong> Cadastre os tipos de eventos (bônus, descontos, vales) que poderão ser lançados na folha de pagamento ou como eventos fixos.
                        </div>
                        <Button onClick={() => handleOpenEventTypeModal()} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm shrink-0">
                            <Plus size={16} className="mr-2"/> Novo Tipo
                        </Button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 text-gray-600 uppercase text-xs border-b">
                                <tr>
                                    <th className="p-4">Nome do Evento</th>
                                    <th className="p-4">Operação</th>
                                    <th className="p-4">Cálculo</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {state.eventTypes.map(evt => (
                                    <tr key={evt.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-bold text-gray-800">{evt.name}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${evt.operation === '+' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {evt.operation === '+' ? 'Provento (+)' : 'Desconto (-)'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-700">
                                                {evt.calculationType === 'PERCENTAGE' ? '% do Salário' : 'Valor Fixo'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${evt.isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {evt.isActive ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleOpenEventTypeModal(evt)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg mr-2"><Edit3 size={18}/></button>
                                            <button onClick={() => handleDeleteEventType(evt.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                                        </td>
                                    </tr>
                                ))}
                                {state.eventTypes.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-500 italic">Nenhum tipo de evento cadastrado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ABA 5: CONTRATOS */}
            {activeTab === 'CONTRACTS' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="text-xs text-blue-800">
                            <strong>Modelos de Contrato:</strong> Crie modelos de contrato de trabalho para gerar automaticamente para seus colaboradores.
                        </div>
                        <Button onClick={() => handleOpenContractModal()} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm shrink-0">
                            <Plus size={16} className="mr-2"/> Novo Modelo
                        </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {state.contractTemplates.map(template => (
                            <div key={template.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between h-40">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-slate-800">{template.name}</h3>
                                            <span className="text-[10px] font-bold text-blue-600 uppercase">
                                                {template.type === 'CONTRACT' ? 'Contrato' : 
                                                 template.type === 'NOTICE' ? 'Aviso' : 
                                                 template.type === 'WARNING' ? 'Advertência' : 'Outro'}
                                            </span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${template.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {template.isActive ? 'ATIVO' : 'INATIVO'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-3">{template.content}</p>
                                </div>
                                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                                    <button onClick={() => handleOpenContractModal(template)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 size={16}/></button>
                                    <button onClick={() => handleDeleteContract(template.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                        {state.contractTemplates.length === 0 && (
                            <div className="col-span-full p-8 text-center text-gray-500 italic bg-white rounded-xl border border-dashed border-gray-300">
                                Nenhum modelo de contrato cadastrado.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ABA 6: PARÂMETROS DE CÁLCULOS */}
            {activeTab === 'CALC_PARAMS' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="text-xs text-blue-800">
                            <strong>Parâmetros de Cálculos:</strong> Defina as regras para cálculos de férias, 13º salário e rescisões.
                        </div>
                        <Button onClick={handleSaveCalcParams} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm shrink-0">
                            <Settings size={16} className="mr-2"/> Salvar Parâmetros
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Férias */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Calendar size={18}/> Férias</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-slate-600">Dias de Direito (por ano)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border p-2.5 rounded-xl text-sm" 
                                        value={calcParamsForm.vacationDaysEntitlement} 
                                        onChange={e => setCalcParamsForm({...calcParamsForm, vacationDaysEntitlement: Number(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-slate-600">Limite de Dias Vendidos (Abono)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border p-2.5 rounded-xl text-sm" 
                                        value={calcParamsForm.vacationSoldDaysLimit} 
                                        onChange={e => setCalcParamsForm({...calcParamsForm, vacationSoldDaysLimit: Number(e.target.value)})}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 13º Salário */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><DollarSign size={18}/> 13º Salário</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-slate-600">Meses Mínimos Trabalhados (para direito)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border p-2.5 rounded-xl text-sm" 
                                        value={calcParamsForm.thirteenthMinMonthsWorked} 
                                        onChange={e => setCalcParamsForm({...calcParamsForm, thirteenthMinMonthsWorked: Number(e.target.value)})}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Rescisão */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><FileText size={18}/> Rescisão</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-slate-600">Aviso Prévio (Dias Base)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border p-2.5 rounded-xl text-sm" 
                                        value={calcParamsForm.noticePeriodDays} 
                                        onChange={e => setCalcParamsForm({...calcParamsForm, noticePeriodDays: Number(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-slate-600">Dias por Ano Trabalhado</label>
                                    <input 
                                        type="number" 
                                        className="w-full border p-2.5 rounded-xl text-sm" 
                                        value={calcParamsForm.noticePeriodDaysPerYear} 
                                        onChange={e => setCalcParamsForm({...calcParamsForm, noticePeriodDaysPerYear: Number(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-slate-600">Aviso Prévio (Máximo Dias)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border p-2.5 rounded-xl text-sm" 
                                        value={calcParamsForm.noticePeriodMaxDays} 
                                        onChange={e => setCalcParamsForm({...calcParamsForm, noticePeriodMaxDays: Number(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-slate-600">Multa FGTS (%)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border p-2.5 rounded-xl text-sm" 
                                        value={calcParamsForm.fgtsFinePercent} 
                                        onChange={e => setCalcParamsForm({...calcParamsForm, fgtsFinePercent: Number(e.target.value)})}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Geral */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Settings size={18}/> Geral</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-slate-600">Horas Mensais Padrão</label>
                                    <input 
                                        type="number" 
                                        className="w-full border p-2.5 rounded-xl text-sm" 
                                        value={calcParamsForm.standardMonthlyHours} 
                                        onChange={e => setCalcParamsForm({...calcParamsForm, standardMonthlyHours: Number(e.target.value)})}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ABA 7: ESCALAS & TURNOS */}
            {activeTab === 'SCHEDULES' && (
                <StaffSchedules />
            )}

            {/* ABA 8: EVENTOS RECORRENTES */}
            {activeTab === 'RECURRING' && (
                <StaffRecurringEvents />
            )}

            {/* Modal de Configuração Legal */}
            <LegalSettingsModal isOpen={isLegalModalOpen} onClose={() => setIsLegalModalOpen(false)} />
            
            {/* Modal de Cargo RH */}
            {isHrRoleModalOpen && (
                <HrJobRoleModal 
                    isOpen={isHrRoleModalOpen} 
                    onClose={() => { setIsHrRoleModalOpen(false); setEditingHrRole(null); }} 
                    role={editingHrRole} 
                />
            )}

            {/* Modal de Tipo de Evento */}
            <Modal isOpen={isEventTypeModalOpen} onClose={() => setIsEventTypeModalOpen(false)} title={editingEventType ? "Editar Tipo de Evento" : "Novo Tipo de Evento"} onSave={handleSaveEventType}>
                <div className="space-y-4 pt-4">
                    <div>
                        <label className="block text-xs font-bold mb-1 text-slate-600">Nome do Evento *</label>
                        <input 
                            type="text" 
                            className="w-full border p-2.5 rounded-xl text-sm" 
                            value={eventTypeForm.name || ''} 
                            onChange={e => setEventTypeForm({...eventTypeForm, name: e.target.value})}
                            placeholder="Ex: Vale Transporte, Bônus Meta..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 text-slate-600">Tipo de Cálculo *</label>
                        <select 
                            className="w-full border p-2.5 rounded-xl text-sm bg-white" 
                            value={eventTypeForm.calculationType || 'FIXED'} 
                            onChange={e => setEventTypeForm({...eventTypeForm, calculationType: e.target.value as 'FIXED' | 'PERCENTAGE'})}
                        >
                            <option value="FIXED">Valor Fixo (R$)</option>
                            <option value="PERCENTAGE">Porcentagem do Salário (%)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 text-slate-600">Operação *</label>
                        <select 
                            className="w-full border p-2.5 rounded-xl text-sm bg-white" 
                            value={eventTypeForm.operation} 
                            onChange={e => setEventTypeForm({...eventTypeForm, operation: e.target.value as '+' | '-'})}
                        >
                            <option value="+">Provento (+) - Soma ao Salário</option>
                            <option value="-">Desconto (-) - Subtrai do Salário</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                        <input 
                            type="checkbox" 
                            id="isActive" 
                            checked={eventTypeForm.isActive} 
                            onChange={e => setEventTypeForm({...eventTypeForm, isActive: e.target.checked})}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300"
                        />
                        <label htmlFor="isActive" className="text-sm font-bold text-slate-700">Ativo</label>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isContractModalOpen} onClose={() => setIsContractModalOpen(false)} title={editingContract ? "Editar Modelo" : "Novo Modelo"} onSave={handleSaveContract} maxWidth="5xl">
                <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-600">Nome do Modelo *</label>
                            <input 
                                type="text" 
                                className="w-full border p-2.5 rounded-xl text-sm" 
                                value={contractForm.name || ''} 
                                onChange={e => setContractForm({...contractForm, name: e.target.value})}
                                placeholder="Ex: Contrato CLT Padrão"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-600">Tipo de Documento *</label>
                            <select 
                                className="w-full border p-2.5 rounded-xl text-sm bg-white" 
                                value={contractForm.type || 'CONTRACT'} 
                                onChange={e => setContractForm({...contractForm, type: e.target.value as ContractTemplateType})}
                            >
                                <option value="CONTRACT">Contrato</option>
                                <option value="NOTICE">Aviso</option>
                                <option value="WARNING">Advertência</option>
                                <option value="OTHER">Outros</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex border-b">
                        <button 
                            onClick={() => setContractPreviewMode(false)}
                            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${!contractPreviewMode ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                        >
                            <Edit3 size={14}/> Editor
                        </button>
                        <button 
                            onClick={() => setContractPreviewMode(true)}
                            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${contractPreviewMode ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                        >
                            <Eye size={14}/> Visualização
                        </button>
                        <div className="flex-1"></div>
                        <button 
                            onClick={handlePrintContract}
                            className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-blue-600 flex items-center gap-2"
                        >
                            <Printer size={14}/> Imprimir Teste
                        </button>
                    </div>

                    {!contractPreviewMode ? (
                        <div className="flex gap-4 h-[500px]">
                            <div className="flex-1 flex flex-col h-full overflow-hidden">
                                <ReactQuill 
                                    ref={quillRef}
                                    theme="snow"
                                    value={contractForm.content || ''}
                                    onChange={(content) => setContractForm({...contractForm, content})}
                                    className="h-[400px] bg-white rounded-xl"
                                    modules={{
                                        toolbar: [
                                            [{ 'header': [1, 2, 3, false] }],
                                            ['bold', 'italic', 'underline', 'strike'],
                                            [{ 'align': [] }],
                                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                            ['clean']
                                        ]
                                    }}
                                />
                            </div>
                            <div className="w-72 bg-slate-50 p-4 rounded-xl border border-slate-200 overflow-y-auto">
                                <h4 className="text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-wider">Variáveis (Arraste ou Clique)</h4>
                                
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 mb-2 uppercase">Empresa</div>
                                        <div className="space-y-1.5">
                                            {[
                                                { label: 'Nome Fantasia', code: '{{empresa_nome}}' },
                                                { label: 'CNPJ', code: '{{empresa_cnpj}}' },
                                                { label: 'Endereço', code: '{{empresa_endereco}}' },
                                                { label: 'Cidade', code: '{{empresa_cidade}}' },
                                                { label: 'Estado', code: '{{empresa_estado}}' },
                                                { label: 'Telefone', code: '{{empresa_telefone}}' },
                                                { label: 'E-mail', code: '{{empresa_email}}' },
                                            ].map(v => (
                                                <div 
                                                    key={v.code} 
                                                    draggable 
                                                    onDragStart={(e) => e.dataTransfer.setData('text/plain', v.code)}
                                                    className="bg-white p-2 rounded border border-slate-200 cursor-move hover:bg-blue-50 transition-colors group" 
                                                    onClick={() => insertAtCursor(v.code)}
                                                >
                                                    <div className="text-[9px] text-slate-400 font-bold">{v.label}</div>
                                                    <code className="text-[11px] font-bold text-blue-600">{v.code}</code>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 mb-2 uppercase">Colaborador</div>
                                        <div className="space-y-1.5">
                                            {[
                                                { label: 'Nome Completo', code: '{{nome}}' },
                                                { label: 'CPF', code: '{{cpf}}' },
                                                { label: 'RG', code: '{{rg}}' },
                                                { label: 'Endereço', code: '{{endereco}}' },
                                                { label: 'Cidade/UF', code: '{{cidade_uf}}' },
                                                { label: 'Nacionalidade', code: '{{nacionalidade}}' },
                                                { label: 'Estado Civil', code: '{{estado_civil}}' },
                                                { label: 'Cargo', code: '{{cargo}}' },
                                                { label: 'Setor', code: '{{setor}}' },
                                                { label: 'Salário Base', code: '{{salario}}' },
                                                { label: 'Data Admissão', code: '{{data_admissao}}' },
                                                { label: 'Jornada', code: '{{jornada}}' },
                                                { label: 'CTPS', code: '{{ctps}}' },
                                                { label: 'PIS', code: '{{pis}}' },
                                            ].map(v => (
                                                <div 
                                                    key={v.code} 
                                                    draggable 
                                                    onDragStart={(e) => e.dataTransfer.setData('text/plain', v.code)}
                                                    className="bg-white p-2 rounded border border-slate-200 cursor-move hover:bg-blue-50 transition-colors group" 
                                                    onClick={() => insertAtCursor(v.code)}
                                                >
                                                    <div className="text-[9px] text-slate-400 font-bold">{v.label}</div>
                                                    <code className="text-[11px] font-bold text-blue-600">{v.code}</code>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[500px] border rounded-xl p-8 overflow-y-auto bg-white shadow-inner">
                            <div 
                                className="prose prose-slate max-w-none"
                                dangerouslySetInnerHTML={{ 
                                    __html: (contractForm.content || '')
                                        .replace(/{{empresa_nome}}/g, restState.businessInfo.restaurantName || 'Empresa Teste')
                                        .replace(/{{empresa_cnpj}}/g, restState.businessInfo.cnpj || '00.000.000/0001-00')
                                        .replace(/{{nome}}/g, 'João da Silva')
                                        .replace(/{{cpf}}/g, '123.456.789-00')
                                }} 
                            />
                        </div>
                    )}
                    <div className="flex items-center gap-2 pt-2">
                        <input 
                            type="checkbox" 
                            id="isContractActive" 
                            checked={contractForm.isActive} 
                            onChange={e => setContractForm({...contractForm, isActive: e.target.checked})}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300"
                        />
                        <label htmlFor="isContractActive" className="text-sm font-bold text-slate-700">Modelo Ativo</label>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
