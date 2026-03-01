
import React, { useState, useEffect } from 'react';
import { useStaff } from '../../../context/StaffContext';
import { useUI } from '../../../context/UIContext';
import { useRestaurant } from '../../../context/RestaurantContext';
import { Button } from '../../../components/Button';
import { AlertTriangle, User as LucideUser, Printer, Edit3, Eye } from 'lucide-react';

export const StaffWarnings: React.FC = () => {
    const { state } = useStaff();
    const { state: restState } = useRestaurant();
    const { showAlert } = useUI();

    const [selectedStaffId, setSelectedStaffId] = useState<string>('');
    const [warningType, setWarningType] = useState<'VERBAL' | 'FORMAL'>('FORMAL');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [content, setContent] = useState<string>('');
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    const warningTemplates = state.contractTemplates.filter(t => t.isActive && t.type === 'WARNING');
    const selectedStaff = state.users.find(u => u.id === selectedStaffId);

    useEffect(() => {
        if (selectedTemplateId) {
            const template = warningTemplates.find(t => t.id === selectedTemplateId);
            if (template) {
                setContent(template.content);
            }
        }
    }, [selectedTemplateId]);

    const handlePrint = () => {
        if (!selectedStaffId || !content) {
            return showAlert({ title: "Campos Obrigatórios", message: "Selecione um colaborador e preencha o conteúdo.", type: "WARNING" });
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const company = restState.businessInfo;
        
        // Replace variables
        let rendered = content
            .replace(/{{empresa_nome}}/g, company.restaurantName || '')
            .replace(/{{empresa_cnpj}}/g, company.cnpj || '')
            .replace(/{{empresa_endereco}}/g, `${company.address?.street || ''}, ${company.address?.number || ''}`)
            .replace(/{{empresa_cidade}}/g, company.address?.city || '')
            .replace(/{{empresa_estado}}/g, company.address?.state || '')
            .replace(/{{nome}}/g, selectedStaff?.name || '')
            .replace(/{{cpf}}/g, selectedStaff?.documentCpf || '')
            .replace(/{{cargo}}/g, selectedStaff?.customRoleName || '')
            .replace(/{{data}}/g, new Date().toLocaleDateString('pt-BR'))
            .replace(/{{tipo_advertencia}}/g, warningType === 'VERBAL' ? 'VERBAL' : 'ESCRITA/FORMAL');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Advertência - ${selectedStaff?.name}</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 50px; line-height: 1.6; color: #000; }
                        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px; }
                        .content { margin-bottom: 60px; text-align: justify; }
                        .signatures { display: flex; justify-content: space-between; margin-top: 100px; }
                        .sig-box { border-top: 1px solid #000; width: 250px; text-align: center; padding-top: 10px; font-size: 12px; }
                        @media print { body { padding: 0; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>${company.restaurantName?.toUpperCase()}</h2>
                        <p>${warningType === 'VERBAL' ? 'REGISTRO DE ADVERTÊNCIA VERBAL' : 'ADVERTÊNCIA DISCIPLINAR FORMAL'}</p>
                    </div>
                    <div class="content">
                        ${rendered}
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
                    <script>window.print(); window.close();</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            <AlertTriangle className="text-orange-500" /> Advertências & Avisos
                        </h2>
                        <p className="text-sm text-gray-500">Emissão de medidas disciplinares e registros verbais.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Painel de Configuração */}
                    <div className="lg:col-span-1 space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Nova Advertência</h3>
                        
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-600">Colaborador *</label>
                            <div className="relative">
                                <LucideUser className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                <select 
                                    className="w-full border pl-9 p-2.5 rounded-xl text-sm bg-white"
                                    value={selectedStaffId}
                                    onChange={e => setSelectedStaffId(e.target.value)}
                                >
                                    <option value="">Selecione o funcionário...</option>
                                    {state.users.filter(u => u.status === 'ACTIVE').map(user => (
                                        <option key={user.id} value={user.id}>{user.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-600">Tipo de Advertência</label>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setWarningType('VERBAL')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${warningType === 'VERBAL' ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                >
                                    Verbal
                                </button>
                                <button 
                                    onClick={() => setWarningType('FORMAL')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${warningType === 'FORMAL' ? 'bg-red-600 text-white border-red-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                >
                                    Formal/Escrita
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
                            {warningTemplates.length === 0 && (
                                <p className="text-[10px] text-orange-600 mt-1 font-bold">Nenhum modelo do tipo "Advertência" cadastrado.</p>
                            )}
                        </div>

                        <div className="pt-4">
                            <Button 
                                onClick={handlePrint}
                                className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl flex items-center justify-center gap-2"
                                disabled={!selectedStaffId || !content}
                            >
                                <Printer size={18} /> Imprimir Documento
                            </Button>
                        </div>
                    </div>

                    {/* Editor de Conteúdo */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setIsPreviewMode(false)}
                                    className={`text-sm font-bold pb-2 border-b-2 transition-all ${!isPreviewMode ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}
                                >
                                    <Edit3 size={14} className="inline mr-1"/> Editar Texto
                                </button>
                                <button 
                                    onClick={() => setIsPreviewMode(true)}
                                    className={`text-sm font-bold pb-2 border-b-2 transition-all ${isPreviewMode ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}
                                >
                                    <Eye size={14} className="inline mr-1"/> Visualizar
                                </button>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Suporta Tags HTML</span>
                        </div>

                        {!isPreviewMode ? (
                            <textarea 
                                className="w-full h-[500px] border p-6 rounded-2xl text-sm font-mono leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white shadow-inner"
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="O conteúdo da advertência aparecerá aqui após selecionar um modelo..."
                            />
                        ) : (
                            <div className="w-full h-[500px] border p-8 rounded-2xl bg-white overflow-y-auto shadow-inner prose prose-slate max-w-none">
                                <div 
                                    dangerouslySetInnerHTML={{ 
                                        __html: content
                                            .replace(/{{empresa_nome}}/g, restState.businessInfo.restaurantName || 'Empresa Teste')
                                            .replace(/{{nome}}/g, selectedStaff?.name || 'Nome do Colaborador')
                                            .replace(/{{tipo_advertencia}}/g, warningType === 'VERBAL' ? 'VERBAL' : 'FORMAL')
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
            </div>
        </div>
    );
};
