
import React, { useState } from 'react';
import { useStaff } from '../../../context/StaffContext';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/Button';
import { RHTax } from '../../../types';
import { Plus, Trash2, Settings, Percent, DollarSign, Info } from 'lucide-react';

export const StaffSettings: React.FC = () => {
    const { state, addTax, deleteTax } = useStaff();
    const { showAlert, showConfirm } = useUI();

    const [form, setForm] = useState<Partial<RHTax>>({
        name: '', type: 'PERCENTAGE', value: 0
    });

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || form.value === undefined) return;
        
        try {
            await addTax(form);
            setForm({ name: '', type: 'PERCENTAGE', value: 0 });
            showAlert({ title: "Sucesso", message: "Imposto/Desconto adicionado.", type: "SUCCESS" });
        } catch (e) {
            showAlert({ title: "Erro", message: "Falha ao salvar.", type: "ERROR" });
        }
    };

    const handleDelete = (id: string) => {
        showConfirm({
            title: "Excluir Imposto",
            message: "Isso afetará o cálculo da folha de pagamento futura. Tem certeza?",
            onConfirm: () => deleteTax(id)
        });
    };

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Settings className="text-gray-600"/> Configurações de RH</h2>
                <p className="text-sm text-gray-500">Defina os encargos e descontos que serão aplicados automaticamente na pré-folha.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* FORMULÁRIO */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
                    <h3 className="font-bold text-slate-800 mb-4">Adicionar Encargo / Desconto</h3>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Encargo</label>
                            <input 
                                required
                                className="w-full border p-3 rounded-xl text-sm"
                                placeholder="Ex: INSS, Plano de Saúde"
                                value={form.name}
                                onChange={e => setForm({...form, name: e.target.value})}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
                                <select 
                                    className="w-full border p-3 rounded-xl text-sm bg-white"
                                    value={form.type}
                                    onChange={e => setForm({...form, type: e.target.value as any})}
                                >
                                    <option value="PERCENTAGE">Porcentagem (%)</option>
                                    <option value="FIXED">Valor Fixo (R$)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor</label>
                                <input 
                                    required
                                    type="number"
                                    step="0.01"
                                    className="w-full border p-3 rounded-xl text-sm font-bold"
                                    value={form.value}
                                    onChange={e => setForm({...form, value: parseFloat(e.target.value)})}
                                />
                            </div>
                        </div>
                        <Button type="submit" className="w-full">Adicionar Configuração</Button>
                    </form>
                </div>

                {/* LISTA */}
                <div className="space-y-4">
                    {state.taxes.length === 0 && (
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex flex-col items-center justify-center text-center text-blue-800">
                            <Info size={32} className="mb-2 opacity-50"/>
                            <p className="font-bold">Nenhum imposto configurado</p>
                            <p className="text-xs mt-1">A folha de pagamento será calculada apenas com salários e extras.</p>
                        </div>
                    )}
                    
                    {state.taxes.map(tax => (
                        <div key={tax.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center group">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tax.type === 'PERCENTAGE' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {tax.type === 'PERCENTAGE' ? <Percent size={18}/> : <DollarSign size={18}/>}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">{tax.name}</h4>
                                    <p className="text-xs text-gray-500">
                                        Desconto de <span className="font-bold text-slate-700">{tax.type === 'PERCENTAGE' ? `${tax.value}%` : `R$ ${tax.value.toFixed(2)}`}</span>
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => handleDelete(tax.id)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                                <Trash2 size={18}/>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
