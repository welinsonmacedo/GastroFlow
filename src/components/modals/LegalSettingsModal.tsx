
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useStaff } from '../../context/StaffContext';
import { useUI } from '../../context/UIContext';
import { RhInssBracket, RhIrrfBracket } from '../../types';
import { Calculator, Plus, Trash2 } from 'lucide-react';

interface LegalSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const LegalSettingsModal: React.FC<LegalSettingsModalProps> = ({ isOpen, onClose }) => {
    const { state, saveLegalSettings, saveInssBrackets, saveIrrfBrackets } = useStaff();
    const { showAlert } = useUI();

    const [minWage, setMinWage] = useState(0);
    const [inssCeiling, setInssCeiling] = useState(0);
    const [irrfDeduction, setIrrfDeduction] = useState(0);
    const [fgtsRate, setFgtsRate] = useState(8);
    
    const [inssList, setInssList] = useState<RhInssBracket[]>([]);
    const [irrfList, setIrrfList] = useState<RhIrrfBracket[]>([]);

    useEffect(() => {
        if (isOpen && state.legalSettings) {
            setMinWage(state.legalSettings.minWage);
            setInssCeiling(state.legalSettings.inssCeiling);
            setIrrfDeduction(state.legalSettings.irrfDependentDeduction);
            setFgtsRate(state.legalSettings.fgtsRate);
            setInssList([...state.inssBrackets]);
            setIrrfList([...state.irrfBrackets]);
        }
    }, [isOpen, state.legalSettings]);

    const handleSave = async () => {
        try {
            await saveLegalSettings({
                minWage, inssCeiling, irrfDependentDeduction: irrfDeduction, fgtsRate,
                validFrom: new Date().toISOString().split('T')[0]
            });
            await saveInssBrackets(inssList);
            await saveIrrfBrackets(irrfList);
            showAlert({ title: "Salvo", message: "Configurações legais atualizadas.", type: "SUCCESS" });
            onClose();
        } catch (e) {
            showAlert({ title: "Erro", message: "Falha ao salvar configurações.", type: "ERROR" });
        }
    };

    const addInss = () => setInssList([...inssList, { id: Math.random().toString(), minValue: 0, maxValue: 0, rate: 0, validFrom: '' }]);
    const removeInss = (idx: number) => setInssList(inssList.filter((_, i) => i !== idx));
    const updateInss = (idx: number, field: string, value: any) => {
        const list = [...inssList];
        list[idx] = { ...list[idx], [field]: parseFloat(value) || 0 };
        setInssList(list);
    };

    const addIrrf = () => setIrrfList([...irrfList, { id: Math.random().toString(), minValue: 0, maxValue: 0, rate: 0, deduction: 0, validFrom: '' }]);
    const removeIrrf = (idx: number) => setIrrfList(irrfList.filter((_, i) => i !== idx));
    const updateIrrf = (idx: number, field: string, value: any) => {
        const list = [...irrfList];
        list[idx] = { ...list[idx], [field]: parseFloat(value) || 0 };
        setIrrfList(list);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Editar Tabelas Legais (INSS/IRRF)" variant="page" onSave={handleSave}>
            <div className="space-y-8 max-w-4xl mx-auto pb-20">
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200">
                    <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2"><Calculator size={18}/> Parâmetros Gerais</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Salário Mínimo</label><input type="number" step="0.01" className="w-full border p-2 rounded-xl mt-1" value={minWage} onChange={e => setMinWage(parseFloat(e.target.value))}/></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Teto INSS</label><input type="number" step="0.01" className="w-full border p-2 rounded-xl mt-1" value={inssCeiling} onChange={e => setInssCeiling(parseFloat(e.target.value))}/></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Dedução Dep. (IRRF)</label><input type="number" step="0.01" className="w-full border p-2 rounded-xl mt-1" value={irrfDeduction} onChange={e => setIrrfDeduction(parseFloat(e.target.value))}/></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Alíquota FGTS (%)</label><input type="number" step="0.1" className="w-full border p-2 rounded-xl mt-1" value={fgtsRate} onChange={e => setFgtsRate(parseFloat(e.target.value))}/></div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-orange-700">Tabela INSS Progressivo</h4>
                        <Button onClick={addInss} size="sm" variant="secondary"><Plus size={14}/> Adicionar Faixa</Button>
                    </div>
                    <div className="space-y-2">
                        {inssList.map((item, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <span className="text-xs text-gray-400 w-8">#{idx+1}</span>
                                <input placeholder="De (R$)" type="number" className="flex-1 border p-2 rounded-lg text-sm" value={item.minValue} onChange={e => updateInss(idx, 'minValue', e.target.value)} />
                                <input placeholder="Até (R$)" type="number" className="flex-1 border p-2 rounded-lg text-sm" value={item.maxValue || ''} onChange={e => updateInss(idx, 'maxValue', e.target.value)} />
                                <input placeholder="%" type="number" className="w-20 border p-2 rounded-lg text-sm" value={item.rate} onChange={e => updateInss(idx, 'rate', e.target.value)} />
                                <button onClick={() => removeInss(idx)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-blue-700">Tabela IRRF</h4>
                        <Button onClick={addIrrf} size="sm" variant="secondary"><Plus size={14}/> Adicionar Faixa</Button>
                    </div>
                    <div className="space-y-2">
                         <div className="flex gap-2 text-xs font-bold text-gray-400 px-2 uppercase">
                            <span className="w-8"></span>
                            <span className="flex-1">Faixa Inicial</span>
                            <span className="flex-1">Faixa Final</span>
                            <span className="w-20">Alíquota</span>
                            <span className="w-24">Dedução</span>
                            <span className="w-8"></span>
                        </div>
                        {irrfList.map((item, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <span className="text-xs text-gray-400 w-8">#{idx+1}</span>
                                <input type="number" className="flex-1 border p-2 rounded-lg text-sm" value={item.minValue} onChange={e => updateIrrf(idx, 'minValue', e.target.value)} />
                                <input type="number" className="flex-1 border p-2 rounded-lg text-sm" value={item.maxValue || ''} onChange={e => updateIrrf(idx, 'maxValue', e.target.value)} />
                                <input type="number" className="w-20 border p-2 rounded-lg text-sm" value={item.rate} onChange={e => updateIrrf(idx, 'rate', e.target.value)} />
                                <input type="number" className="w-24 border p-2 rounded-lg text-sm" value={item.deduction} onChange={e => updateIrrf(idx, 'deduction', e.target.value)} />
                                <button onClick={() => removeIrrf(idx)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
