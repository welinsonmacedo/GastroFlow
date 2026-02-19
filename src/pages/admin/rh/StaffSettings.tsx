
import React, { useState } from 'react';
import { useStaff } from '../../../context/StaffContext';
import { useRestaurant } from '../../../context/RestaurantContext';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/Button';
import { RHTax, RHBenefit } from '../../../types';
import { Plus, Trash2, Settings, Percent, DollarSign, Info, RefreshCcw, Gift, FileText } from 'lucide-react';

export const StaffSettings: React.FC = () => {
    const { state, addTax, deleteTax, addBenefit, deleteBenefit, applyRegimeDefaults } = useStaff();
    const { state: restState } = useRestaurant();
    const { showAlert, showConfirm } = useUI();

    const [taxForm, setTaxForm] = useState<Partial<RHTax>>({ name: '', type: 'PERCENTAGE', value: 0 });
    const [benForm, setBenForm] = useState<Partial<RHBenefit>>({ name: '', type: 'FIXED', value: 0 });

    const handleAddTax = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taxForm.name || taxForm.value === undefined) return;
        try { await addTax(taxForm); setTaxForm({ name: '', type: 'PERCENTAGE', value: 0 }); showAlert({ title: "Sucesso", message: "Imposto adicionado.", type: "SUCCESS" }); } catch (e) { showAlert({ title: "Erro", message: "Falha ao salvar.", type: "ERROR" }); }
    };

    const handleDeleteTax = (id: string) => { showConfirm({ title: "Excluir Imposto", message: "Tem certeza?", onConfirm: () => deleteTax(id) }); };

    const handleAddBenefit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!benForm.name || benForm.value === undefined) return;
        try { await addBenefit(benForm); setBenForm({ name: '', type: 'FIXED', value: 0 }); showAlert({ title: "Sucesso", message: "Benefício adicionado.", type: "SUCCESS" }); } catch (e) { showAlert({ title: "Erro", message: "Falha ao salvar.", type: "ERROR" }); }
    };

    const handleDeleteBenefit = (id: string) => { showConfirm({ title: "Excluir Benefício", message: "Tem certeza?", onConfirm: () => deleteBenefit(id) }); };

    const handleResetTaxes = () => {
        const regime = restState.businessInfo?.taxRegime || 'SIMPLES_NACIONAL';
        showConfirm({
            title: `Redefinir para ${regime.replace('_', ' ')}?`,
            message: "Isso apagará os impostos atuais e aplicará o padrão sugerido para o regime tributário da empresa.",
            type: 'WARNING',
            onConfirm: async () => {
                await applyRegimeDefaults(regime);
                showAlert({ title: "Redefinido", message: "Impostos atualizados conforme o regime.", type: "SUCCESS" });
            }
        });
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">
             
             {/* Header */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Settings className="text-gray-600"/> Configurações de RH</h2>
                <p className="text-sm text-gray-500">Regras de folha de pagamento.</p>
                
                <div className="mt-4 flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <div>
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Regime Tributário Atual</p>
                        <p className="text-lg font-black text-blue-900">{restState.businessInfo?.taxRegime?.replace('_', ' ') || 'NÃO DEFINIDO'}</p>
                    </div>
                    <Button variant="secondary" onClick={handleResetTaxes} className="bg-white text-blue-700 border-blue-200 hover:bg-blue-100">
                        <RefreshCcw size={16} className="mr-2"/> Aplicar Padrão
                    </Button>
                </div>
            </div>

            {/* SEÇÃO 1: IMPOSTOS (DEDUÇÕES) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
                    <h3 className="font-bold text-red-600 mb-4 flex items-center gap-2"><FileText size={18}/> Encargos / Descontos</h3>
                    <form onSubmit={handleAddTax} className="space-y-4">
                        <input required className="w-full border p-2.5 rounded-xl text-sm" placeholder="Nome (Ex: INSS)" value={taxForm.name} onChange={e => setTaxForm({...taxForm, name: e.target.value})} />
                        <div className="grid grid-cols-2 gap-2">
                            <select className="border p-2.5 rounded-xl text-sm bg-white" value={taxForm.type} onChange={e => setTaxForm({...taxForm, type: e.target.value as any})}><option value="PERCENTAGE">%</option><option value="FIXED">R$</option></select>
                            <input required type="number" step="0.01" className="border p-2.5 rounded-xl text-sm" placeholder="Valor" value={taxForm.value} onChange={e => setTaxForm({...taxForm, value: parseFloat(e.target.value)})} />
                        </div>
                        <Button type="submit" className="w-full">Adicionar Desconto</Button>
                    </form>
                </div>

                <div className="md:col-span-2 space-y-3">
                    {state.taxes.map(tax => (
                        <div key={tax.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tax.type === 'PERCENTAGE' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                    {tax.type === 'PERCENTAGE' ? <Percent size={18}/> : <DollarSign size={18}/>}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">{tax.name}</h4>
                                    <p className="text-xs text-gray-500">Desconto: <strong>{tax.type === 'PERCENTAGE' ? `${tax.value}%` : `R$ ${tax.value.toFixed(2)}`}</strong></p>
                                </div>
                            </div>
                            <button onClick={() => handleDeleteTax(tax.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                        </div>
                    ))}
                    {state.taxes.length === 0 && <div className="text-center p-8 text-gray-400 bg-gray-50 rounded-xl">Nenhum imposto configurado.</div>}
                </div>
            </div>

            {/* SEÇÃO 2: BENEFÍCIOS (ADIÇÕES) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-200">
                <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
                    <h3 className="font-bold text-green-600 mb-4 flex items-center gap-2"><Gift size={18}/> Benefícios (Adicionais)</h3>
                    <form onSubmit={handleAddBenefit} className="space-y-4">
                        <input required className="w-full border p-2.5 rounded-xl text-sm" placeholder="Nome (Ex: Vale Refeição)" value={benForm.name} onChange={e => setBenForm({...benForm, name: e.target.value})} />
                        <div className="grid grid-cols-2 gap-2">
                            <select className="border p-2.5 rounded-xl text-sm bg-white" value={benForm.type} onChange={e => setBenForm({...benForm, type: e.target.value as any})}><option value="FIXED">R$</option><option value="PERCENTAGE">%</option></select>
                            <input required type="number" step="0.01" className="border p-2.5 rounded-xl text-sm" placeholder="Valor" value={benForm.value} onChange={e => setBenForm({...benForm, value: parseFloat(e.target.value)})} />
                        </div>
                        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">Adicionar Benefício</Button>
                    </form>
                </div>

                <div className="md:col-span-2 space-y-3">
                    {state.benefits.map(ben => (
                        <div key={ben.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${ben.type === 'PERCENTAGE' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                                    {ben.type === 'PERCENTAGE' ? <Percent size={18}/> : <DollarSign size={18}/>}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">{ben.name}</h4>
                                    <p className="text-xs text-gray-500">Adicional: <strong>{ben.type === 'PERCENTAGE' ? `${ben.value}%` : `R$ ${ben.value.toFixed(2)}`}</strong></p>
                                </div>
                            </div>
                            <button onClick={() => handleDeleteBenefit(ben.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                        </div>
                    ))}
                    {state.benefits.length === 0 && <div className="text-center p-8 text-gray-400 bg-gray-50 rounded-xl">Nenhum benefício global configurado.</div>}
                </div>
            </div>
        </div>
    );
};
