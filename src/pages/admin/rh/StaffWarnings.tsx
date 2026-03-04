
import React, { useState, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';
import { useStaff } from '../../../context/StaffContext';

// Register inline styles for Quill to ensure proper printing
const AlignStyle = Quill.import('attributors/style/align');
Quill.register(AlignStyle, true);
import { useUI } from '../../../context/UIContext';
import { useRestaurant } from '../../../context/RestaurantContext';
import { replaceContractVariables } from '../../../utils/printContract';
import { Button } from '../../../components/Button';
import { AlertTriangle, User as LucideUser, Printer, Edit3, Eye, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const StaffWarnings: React.FC = () => {
    const { state, addStaffWarning, deleteStaffWarning } = useStaff();
    const { state: restState } = useRestaurant();
    const { showAlert, showConfirm } = useUI();

    const [selectedStaffId, setSelectedStaffId] = useState<string>('');
    const [warningType, setWarningType] = useState<'VERBAL' | 'FORMAL'>('FORMAL');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [content, setContent] = useState<string>('');
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'NEW' | 'HISTORY'>('NEW');

    const warningTemplates = state.contractTemplates.filter(t => t.isActive && t.type === 'WARNING');
    const selectedStaff = state.users.find(u => u.id === selectedStaffId);
    const staffWarnings = state.warnings.filter(w => !selectedStaffId || w.staffId === selectedStaffId);

    useEffect(() => {
        if (selectedTemplateId) {
            const template = warningTemplates.find(t => t.id === selectedTemplateId);
            if (template) {
                setContent(template.content);
            }
        }
    }, [selectedTemplateId]);

    const handleSaveAndPrint = async () => {
        if (!selectedStaffId || !content) {
            return showAlert({ title: "Campos Obrigatórios", message: "Selecione um colaborador e preencha o conteúdo.", type: "WARNING" });
        }

        try {
            setIsSaving(true);
            
            // 1. Save to database
            await addStaffWarning({
                staffId: selectedStaffId,
                type: warningType,
                content: content
            });

            // 2. Print
            const company = restState.businessInfo;
            const role = state.hrJobRoles.find(r => r.id === selectedStaff?.hrJobRoleId);
            const roleName = role ? role.title : (selectedStaff?.customRoleName || '');
            const shift = state.shifts.find(s => s.id === selectedStaff?.shiftId);
            const shiftName = shift ? shift.name : '';
            
            // Replace variables using the shared utility
            let rendered = replaceContractVariables(content, selectedStaff as any, company, roleName, shiftName)
                .replace(/\{\{\s*data\s*\}\}/g, new Date().toLocaleDateString('pt-BR'))
                .replace(/\{\{\s*tipo_advertencia\s*\}\}/g, warningType === 'VERBAL' ? 'VERBAL' : 'ESCRITA/FORMAL');

            const cleanRendered = DOMPurify.sanitize(rendered);

            // Create hidden iframe for printing (PWA friendly)
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);

            const htmlContent = `
                <html>
                    <head>
                  
                    </head>
                    <body>
                        
                        <div class="content">
                            ${cleanRendered}
                        </div>
                         <div class="signatures">
                        <div class="sig-box">Testemunha 1:</div>
                        <div class="sig-box">Testemunha 2:<br/></div>
                    </div>
                        <div class="signatures">
                            <div class="sig-box">
                                Assinatura do Empregador
                            </div>
                            <div class="sig-box">
                                Assinatura do Colaborador<br/>
                                ${selectedStaff?.name}
                            </div>
                        </div>
                        <script>window.onload = function() { window.print(); }</script>
                    </body>
                </html>
            `;

            const doc = iframe.contentWindow?.document || iframe.contentDocument;
            if (doc) {
                doc.open();
                doc.write(htmlContent);
                doc.close();
                setTimeout(() => {
                    if (document.body.contains(iframe)) document.body.removeChild(iframe);
                }, 2000);
            }
            
            showAlert({ title: "Sucesso", message: "Advertência registrada e enviada para impressão.", type: "SUCCESS" });
            
            // Reset form
            setSelectedTemplateId('');
            setContent('');
        } catch (error) {
            console.error(error);
            showAlert({ title: "Erro", message: "Não foi possível salvar a advertência.", type: "ERROR" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteWarning = (id: string) => {
        showConfirm({
            title: "Excluir Registro",
            message: "Tem certeza que deseja excluir este registro do histórico?",
            onConfirm: async () => {
                try {
                    await deleteStaffWarning(id);
                    showAlert({ title: "Sucesso", message: "Registro excluído.", type: "SUCCESS" });
                } catch (error) {
                    showAlert({ title: "Erro", message: "Erro ao excluir registro.", type: "ERROR" });
                }
            }
        });
    };

    const handleViewWarning = (warning: any) => {
        const staff = state.users.find(u => u.id === warning.staffId);
        const company = restState.businessInfo;
        const role = state.hrJobRoles.find(r => r.id === staff?.hrJobRoleId);
        const roleName = role ? role.title : (staff?.customRoleName || '');
        const shift = state.shifts.find(s => s.id === staff?.shiftId);
        const shiftName = shift ? shift.name : '';
        
        let rendered = replaceContractVariables(warning.content, staff as any, company, roleName, shiftName)
            .replace(/\{\{\s*data\s*\}\}/g, new Date(warning.createdAt).toLocaleDateString('pt-BR'))
            .replace(/\{\{\s*tipo_advertencia\s*\}\}/g, warning.type === 'VERBAL' ? 'VERBAL' : 'ESCRITA/FORMAL');

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const htmlContent = `
            <html>
                <head>
                
                </head>
                <body>
                    <div class="content">
                        ${rendered}
                    </div>
                     <div class="signatures">
                        <div class="sig-box">Testemunha 1:</div>
                        <div class="sig-box">Testemunha 2:<br/></div>
                    </div>
                    <div class="signatures">
                        <div class="sig-box">Assinatura do Empregador</div>
                        <div class="sig-box">Assinatura do Colaborador<br/>${staff?.name}</div>
                    </div>
                    <script>window.onload = function() { window.print(); }</script>
                </body>
            </html>
        `;

        const doc = iframe.contentWindow?.document || iframe.contentDocument;
        if (doc) {
            doc.open();
            doc.write(htmlContent);
            doc.close();
            setTimeout(() => {
                if (document.body.contains(iframe)) document.body.removeChild(iframe);
            }, 2000);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            <AlertTriangle className="text-orange-500" /> Advertências & Avisos
                        </h2>
                        <p className="text-sm text-gray-500">Emissão de medidas disciplinares e registros verbais.</p>
                    </div>
                </div>

                <div className="flex gap-4 mt-6 border-b mb-8">
                    <button onClick={() => setActiveTab('NEW')} className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'NEW' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500'}`}>Nova Advertência</button>
                    <button onClick={() => setActiveTab('HISTORY')} className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'HISTORY' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500'}`}>Histórico</button>
                </div>

                {activeTab === 'NEW' && (
                    <div className="space-y-6">
                        {/* Painel de Configuração Inline */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Colaborador *</label>
                                <div className="relative">
                                    <LucideUser className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                    <select 
                                        className="w-full border pl-9 p-2.5 rounded-xl text-sm bg-white"
                                        value={selectedStaffId}
                                        onChange={e => setSelectedStaffId(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {state.users.filter(u => u.status === 'ACTIVE').map(user => (
                                            <option key={user.id} value={user.id}>{user.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Tipo</label>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setWarningType('VERBAL')}
                                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${warningType === 'VERBAL' ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        Verbal
                                    </button>
                                    <button 
                                        onClick={() => setWarningType('FORMAL')}
                                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${warningType === 'FORMAL' ? 'bg-red-600 text-white border-red-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        Formal
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Modelo Base</label>
                                <select 
                                    className="w-full border p-2.5 rounded-xl text-sm bg-white"
                                    value={selectedTemplateId}
                                    onChange={e => setSelectedTemplateId(e.target.value)}
                                >
                                    <option value="">Selecione um modelo...</option>
                                    {warningTemplates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <Button 
                                onClick={handleSaveAndPrint}
                                className="bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-xl flex items-center justify-center gap-2"
                                disabled={!selectedStaffId || !content || isSaving}
                            >
                                {isSaving ? 'Salvando...' : <><Printer size={18} /> Lançar e Imprimir</>}
                            </Button>
                        </div>

                        {/* Editor de Conteúdo Abaixo */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setIsPreviewMode(false)}
                                        className={`text-sm font-bold pb-2 border-b-2 transition-all ${!isPreviewMode ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}
                                    >
                                        <Edit3 size={14} className="inline mr-1"/> Editar Texto
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (selectedTemplateId) setIsPreviewMode(true);
                                            else showAlert({ title: "Atenção", message: "Selecione um modelo para visualizar.", type: "WARNING" });
                                        }}
                                        className={`text-sm font-bold pb-2 border-b-2 transition-all ${isPreviewMode ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'} ${!selectedTemplateId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <Eye size={14} className="inline mr-1"/> Visualizar
                                    </button>
                                </div>
                            </div>

                            {!isPreviewMode ? (
                                <div className="h-[600px] bg-white rounded-2xl shadow-inner overflow-hidden">
                                    <ReactQuill 
                                        theme="snow"
                                        value={content}
                                        onChange={setContent}
                                        className="h-[550px]"
                                        modules={{
                                            toolbar: [
                                                [{ 'header': [1, 2, 3, false] }],
                                                ['bold', 'italic', 'underline', 'strike'],
                                                [{ 'align': [] }],
                                                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                                ['clean']
                                            ]
                                        }}
                                        placeholder="O conteúdo da advertência aparecerá aqui após selecionar um modelo..."
                                    />
                                </div>
                            ) : (
                                <div className="w-full h-[600px] border p-8 rounded-2xl bg-white overflow-y-auto shadow-inner prose prose-slate max-w-none">
                                    <div 
                                        dangerouslySetInnerHTML={{ 
                                            __html: (() => {
                                                const company = restState.businessInfo;
                                                const role = state.hrJobRoles.find(r => r.id === selectedStaff?.hrJobRoleId);
                                                const roleName = role ? role.title : (selectedStaff?.customRoleName || '');
                                                const shift = state.shifts.find(s => s.id === selectedStaff?.shiftId);
                                                const shiftName = shift ? shift.name : '';
                                                
                                                return DOMPurify.sanitize(replaceContractVariables(content, selectedStaff as any, company, roleName, shiftName)
                                                    .replace(/\{\{\s*data\s*\}\}/g, new Date().toLocaleDateString('pt-BR'))
                                                    .replace(/\{\{\s*tipo_advertencia\s*\}\}/g, warningType === 'VERBAL' ? 'VERBAL' : 'ESCRITA/FORMAL'));
                                            })()
                                        }} 
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {[
                                    { label: 'Nome', code: '{{nome}}' },
                                    { label: 'CPF', code: '{{cpf}}' },
                                    { label: 'Cargo', code: '{{cargo}}' },
                                    { label: 'Data', code: '{{data}}' },
                                    { label: 'Turno', code: '{{turno}}' },
                                ].map(v => (
                                    <button 
                                        key={v.code}
                                        onClick={() => setContent(prev => prev + v.code)}
                                        className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 p-2 rounded border border-slate-200 text-slate-600 transition-colors"
                                    >
                                        {v.label}: <code className="text-blue-600">{v.code}</code>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'HISTORY' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="relative w-64">
                                <LucideUser className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                <select 
                                    className="w-full border pl-9 p-2.5 rounded-xl text-sm bg-white"
                                    value={selectedStaffId}
                                    onChange={e => setSelectedStaffId(e.target.value)}
                                >
                                    <option value="">Todos os funcionários</option>
                                    {state.users.map(user => (
                                        <option key={user.id} value={user.id}>{user.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                                        <th className="p-4 font-bold">Data</th>
                                        <th className="p-4 font-bold">Colaborador</th>
                                        <th className="p-4 font-bold">Tipo</th>
                                        <th className="p-4 font-bold text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {staffWarnings.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-slate-400 text-sm">Nenhum registro encontrado.</td>
                                        </tr>
                                    ) : (
                                        staffWarnings.map(warning => {
                                            const staff = state.users.find(u => u.id === warning.staffId);
                                            return (
                                                <tr key={warning.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                    <td className="p-4 text-sm text-slate-600">
                                                        {new Date(warning.createdAt).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="p-4 text-sm font-bold text-slate-800">
                                                        {staff?.name}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${warning.type === 'VERBAL' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                                            {warning.type}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => handleViewWarning(warning)} className="p-2 hover:bg-white rounded-lg text-blue-600 border border-transparent hover:border-blue-100 transition-all" title="Imprimir/Visualizar">
                                                                <Printer size={16} />
                                                            </button>
                                                            <button onClick={() => handleDeleteWarning(warning.id)} className="p-2 hover:bg-white rounded-lg text-red-600 border border-transparent hover:border-red-100 transition-all" title="Excluir Registro">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
