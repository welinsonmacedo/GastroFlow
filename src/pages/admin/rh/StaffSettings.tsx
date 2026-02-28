
import React, { useState } from 'react';
import { useStaff } from '../../../context/StaffContext';
import { useRestaurant } from '../../../context/RestaurantContext';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/Button';
import { HrJobRole, RHTax, RHBenefit, TaxPayerType, TaxCalculationBasis } from '../../../types';
import { Plus, Trash2, Settings, Percent, DollarSign, RefreshCcw, Gift, FileText, Building2, Scale, Calculator, Edit3, Briefcase } from 'lucide-react';
import { LegalSettingsModal } from '../../../components/modals/LegalSettingsModal';
import { HrJobRoleModal } from '../../../components/modals/HrJobRoleModal';

export const StaffSettings: React.FC = () => {
    const { state, addTax, deleteTax, addBenefit, deleteBenefit, applyRegimeDefaults, applyLegalDefaults, deleteHrJobRole } = useStaff();
    const { state: restState } = useRestaurant();
    const { showAlert, showConfirm } = useUI();

    // Abas de Configuração
    const [activeTab, setActiveTab] = useState<'LEGAL' | 'CUSTOM' | 'ROLES'>('LEGAL');
    const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
    
    // Modal de Cargos RH
    const [isHrRoleModalOpen, setIsHrRoleModalOpen] = useState(false);
    const [editingHrRole, setEditingHrRole] = useState<HrJobRole | null>(null);

    // Estado para impostos customizados
    const [taxTab, setTaxTab] = useState<TaxPayerType>('EMPLOYEE');
    const [taxForm, setTaxForm] = useState<Partial<RHTax>>({ name: '', type: 'PERCENTAGE', value: 0, calculationBasis: 'GROSS_TOTAL' });
    const [benForm, setBenForm] = useState<Partial<RHBenefit>>({ name: '', type: 'FIXED', value: 0 });

    const handleAddTax = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taxForm.name || taxForm.value === undefined) return;
        try { 
            await addTax({ ...taxForm, payerType: taxTab }); 
            setTaxForm({ name: '', type: 'PERCENTAGE', value: 0, calculationBasis: 'GROSS_TOTAL' }); 
            showAlert({ title: "Sucesso", message: "Item adicionado.", type: "SUCCESS" }); 
        } catch (e) { showAlert({ title: "Erro", message: "Falha ao salvar.", type: "ERROR" }); }
    };

    const handleDeleteTax = (id: string) => { showConfirm({ title: "Excluir Item", message: "Tem certeza?", onConfirm: () => deleteTax(id) }); };

    const handleAddBenefit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!benForm.name || benForm.value === undefined) return;
        try { await addBenefit(benForm); setBenForm({ name: '', type: 'FIXED', value: 0 }); showAlert({ title: "Sucesso", message: "Benefício adicionado.", type: "SUCCESS" }); } catch (e) { showAlert({ title: "Erro", message: "Falha ao salvar.", type: "ERROR" }); }
    };

    const handleDeleteBenefit = (id: string) => { showConfirm({ title: "Excluir Benefício", message: "Tem certeza?", onConfirm: () => deleteBenefit(id) }); };

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

    const handleResetCustom = () => {
        const regime = restState.businessInfo?.taxRegime || 'SIMPLES_NACIONAL';
        showConfirm({
            title: `Redefinir para ${regime.replace('_', ' ')}?`,
            message: "Isso apagará os impostos customizados atuais e aplicará o padrão sugerido.",
            onConfirm: async () => {
                await applyRegimeDefaults(regime);
                showAlert({ title: "Redefinido", message: "Impostos atualizados.", type: "SUCCESS" });
            }
        });
    };

    const handleSelectYear = (year: '2024' | '2026') => {
        showConfirm({
            title: `Carregar Tabela ${year}?`,
            message: `Isso irá substituir os valores atuais de INSS e IRRF.`,
            onConfirm: async () => {
                await applyLegalDefaults(year);
                showAlert({ title: "Tabela Carregada", message: `Tabela de ${year} aplicada com sucesso.`, type: "SUCCESS" });
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

    // Filtra impostos pela aba custom
    const filteredTaxes = state.taxes.filter(t => (t.payerType || 'EMPLOYEE') === taxTab);

    return (
        <div className="space-y-8 animate-fade-in pb-10">
             
             {/* Header */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Settings className="text-gray-600"/> Parâmetros de Folha</h2>
                <p className="text-sm text-gray-500">Regras fiscais, tabelas oficiais e descontos extras.</p>
                
                <div className="flex gap-4 mt-6 border-b">
                    <button onClick={() => setActiveTab('LEGAL')} className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'LEGAL' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>Tabelas Legais (INSS/IRRF)</button>
                    <button onClick={() => setActiveTab('CUSTOM')} className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'CUSTOM' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>Descontos & Extras</button>
                    <button onClick={() => setActiveTab('ROLES')} className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'ROLES' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>Cargos & CBO</button>
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
                            <span className="text-sm font-bold text-slate-600">Usar outra tabela:</span>
                            <Button onClick={() => handleSelectYear('2024')} variant="secondary" size="sm">Tabela 2024</Button>
                            <Button onClick={() => handleSelectYear('2026')} variant="secondary" size="sm">Tabela 2026</Button>
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
                                        {state.inssBrackets.map((b, i) => (
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
                                        {state.irrfBrackets.map((b, i) => (
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

            {/* ABA 2: CUSTOMIZADOS (CÓDIGO ANTIGO ADAPTADO) */}
            {activeTab === 'CUSTOM' && (
                <>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="border-b border-gray-100 flex">
                            <button onClick={() => setTaxTab('EMPLOYEE')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${taxTab === 'EMPLOYEE' ? 'text-red-600 border-b-2 border-red-600 bg-red-50/50' : 'text-slate-500 hover:bg-gray-50'}`}><FileText size={18}/> Descontos Extras (Vale, Atrasos)</button>
                            <button onClick={() => setTaxTab('EMPLOYER')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${taxTab === 'EMPLOYER' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-slate-500 hover:bg-gray-50'}`}><Building2 size={18}/> Encargos Extras da Empresa</button>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1 h-fit">
                                <div className={`p-4 rounded-2xl border mb-4 ${taxTab === 'EMPLOYEE' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-purple-50 border-purple-100 text-purple-800'}`}>
                                    <h4 className="font-bold text-sm mb-1">{taxTab === 'EMPLOYEE' ? 'Descontos Adicionais' : 'Custo Patronal Extra'}</h4>
                                    <p className="text-xs opacity-80">INSS e IRRF já são calculados automaticamente. Use esta área para VT, VR, Adiantamentos ou impostos específicos do regime.</p>
                                </div>
                                <form onSubmit={handleAddTax} className="space-y-4">
                                    <input required className="w-full border p-2.5 rounded-xl text-sm" placeholder="Nome (Ex: Vale Transporte)" value={taxForm.name} onChange={e => setTaxForm({...taxForm, name: e.target.value})} />
                                    <div className="grid grid-cols-2 gap-2">
                                        <select className="border p-2.5 rounded-xl text-sm bg-white" value={taxForm.type} onChange={e => setTaxForm({...taxForm, type: e.target.value as any})}><option value="PERCENTAGE">%</option><option value="FIXED">R$</option></select>
                                        <input required type="number" step="0.01" className="border p-2.5 rounded-xl text-sm" placeholder="Valor" value={taxForm.value} onChange={e => setTaxForm({...taxForm, value: parseFloat(e.target.value)})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Base de Cálculo</label>
                                        <select className="w-full border p-2.5 rounded-xl text-sm bg-white" value={taxForm.calculationBasis || 'GROSS_TOTAL'} onChange={e => setTaxForm({...taxForm, calculationBasis: e.target.value as any})}>
                                            <option value="GROSS_TOTAL">Sobre Bruto Total</option>
                                            <option value="BASE_SALARY">Sobre Salário Base</option>
                                        </select>
                                    </div>
                                    <Button type="submit" className={`w-full ${taxTab === 'EMPLOYEE' ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}`}>Adicionar</Button>
                                </form>
                            </div>

                            <div className="md:col-span-2 space-y-3">
                                {filteredTaxes.map(tax => (
                                    <div key={tax.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center group hover:border-gray-300">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tax.payerType === 'EMPLOYER' ? 'bg-purple-100 text-purple-600' : 'bg-red-100 text-red-600'}`}>
                                                {tax.type === 'PERCENTAGE' ? <Percent size={18}/> : <DollarSign size={18}/>}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">{tax.name}</h4>
                                                <div className="text-xs text-gray-500">
                                                    {taxTab === 'EMPLOYEE' ? 'Desconto' : 'Custo'}: <strong>{tax.type === 'PERCENTAGE' ? `${tax.value}%` : `R$ ${tax.value.toFixed(2)}`}</strong>
                                                    <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-[9px] uppercase tracking-wide">Sobre {tax.calculationBasis === 'BASE_SALARY' ? 'Base' : 'Bruto'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteTax(tax.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18}/></button>
                                    </div>
                                ))}
                                {filteredTaxes.length === 0 && <div className="text-center p-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">Nenhum item configurado.</div>}
                                <div className="flex justify-end mt-4"><button onClick={handleResetCustom} className="text-xs text-blue-600 font-bold underline">Restaurar Padrão do Regime</button></div>
                            </div>
                        </div>
                    </div>

                    {/* BENEFÍCIOS (ADIÇÕES) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-200">
                        <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
                            <h3 className="font-bold text-green-600 mb-4 flex items-center gap-2"><Gift size={18}/> Benefícios (Adicionais)</h3>
                            <p className="text-xs text-gray-500 mb-4">Valores que somam ao salário bruto (ex: Bônus, Gratificação).</p>
                            <form onSubmit={handleAddBenefit} className="space-y-4">
                                <input required className="w-full border p-2.5 rounded-xl text-sm" placeholder="Nome (Ex: Bônus Meta)" value={benForm.name} onChange={e => setBenForm({...benForm, name: e.target.value})} />
                                <div className="grid grid-cols-2 gap-2">
                                    <select className="border p-2.5 rounded-xl text-sm bg-white" value={benForm.type} onChange={e => setBenForm({...benForm, type: e.target.value as any})}><option value="FIXED">R$</option><option value="PERCENTAGE">%</option></select>
                                    <input required type="number" step="0.01" className="border p-2.5 rounded-xl text-sm" placeholder="Valor" value={benForm.value} onChange={e => setBenForm({...benForm, value: parseFloat(e.target.value)})} />
                                </div>
                                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">Adicionar Benefício</Button>
                            </form>
                        </div>
                        <div className="md:col-span-2 space-y-3">
                            {state.benefits.map(ben => (
                                <div key={ben.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center group hover:border-green-200">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${ben.type === 'PERCENTAGE' ? 'bg-green-100 text-green-600' : 'bg-green-100 text-green-600'}`}>
                                            {ben.type === 'PERCENTAGE' ? <Percent size={18}/> : <DollarSign size={18}/>}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800">{ben.name}</h4>
                                            <p className="text-xs text-gray-500">Adicional: <strong>{ben.type === 'PERCENTAGE' ? `${ben.value}%` : `R$ ${ben.value.toFixed(2)}`}</strong></p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteBenefit(ben.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18}/></button>
                                </div>
                            ))}
                            {state.benefits.length === 0 && <div className="text-center p-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">Nenhum benefício global configurado.</div>}
                        </div>
                    </div>
                </>
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
        </div>
    );
};
