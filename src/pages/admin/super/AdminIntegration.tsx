import React, { useState, useEffect } from 'react';
import { useSaaS } from '@/core/context/SaaSContext';
import { useUI } from '@/core/context/UIContext';
import { Button } from '../../../components/Button';
import { Plus, Edit, Trash2, FileCode2, Save, X } from 'lucide-react';

export interface ESocialTemplate {
    id: string;
    code: string; // e.g., 'S-1000'
    name: string; // e.g., 'Informações do Empregador'
    xmlTemplate: string;
}

export const AdminIntegration: React.FC = () => {
    const { state, dispatch } = useSaaS();
    const { showAlert, showConfirm } = useUI();
    
    const [templates, setTemplates] = useState<ESocialTemplate[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState<ESocialTemplate | null>(null);

    useEffect(() => {
        if (state.globalSettings?.esocialTemplates) {
            try {
                const parsed = typeof state.globalSettings.esocialTemplates === 'string' 
                    ? JSON.parse(state.globalSettings.esocialTemplates) 
                    : state.globalSettings.esocialTemplates;
                
                if (Array.isArray(parsed)) {
                    setTemplates(parsed);
                } else {
                    // Convert object to array if needed, or handle legacy format
                    const arr = Object.entries(parsed).map(([code, data]: [string, any]) => ({
                        id: data.id || Math.random().toString(36).substr(2, 9),
                        code,
                        name: data.name || code,
                        xmlTemplate: data.xmlTemplate || data
                    }));
                    setTemplates(arr);
                }
            } catch (e) {
                console.error("Failed to parse esocial templates", e);
                setTemplates([]);
            }
        } else {
            setTemplates([]);
        }
    }, [state.globalSettings?.esocialTemplates]);

    const handleSave = () => {
        if (!currentTemplate?.code || !currentTemplate?.xmlTemplate) {
            showAlert({ title: "Erro", message: "Código e XML são obrigatórios.", type: 'ERROR' });
            return;
        }

        let newTemplates = [...templates];
        if (currentTemplate.id) {
            newTemplates = newTemplates.map(t => t.id === currentTemplate.id ? currentTemplate : t);
        } else {
            newTemplates.push({ ...currentTemplate, id: Math.random().toString(36).substr(2, 9) });
        }

        dispatch({
            type: 'UPDATE_GLOBAL_SETTINGS',
            settings: {
                ...state.globalSettings,
                esocialTemplates: newTemplates as any
            }
        });

        setIsEditing(false);
        setCurrentTemplate(null);
    };

    const handleDelete = (id: string) => {
        showConfirm({
            title: "Remover Molde",
            message: "Tem certeza que deseja remover este molde XML?",
            type: 'WARNING',
            onConfirm: () => {
                const newTemplates = templates.filter(t => t.id !== id);
                dispatch({
                    type: 'UPDATE_GLOBAL_SETTINGS',
                    settings: {
                        ...state.globalSettings,
                        esocialTemplates: newTemplates as any
                    }
                });
            }
        });
    };

    return (
        <div className="space-y-6">
            {!isEditing ? (
                <>
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">Moldes e-Social</h2>
                            <p className="text-sm text-gray-500">Gerencie os moldes XML que serão disponibilizados para todos os clientes.</p>
                        </div>
                        <Button onClick={() => {
                            setCurrentTemplate({ id: '', code: '', name: '', xmlTemplate: '<?xml version="1.0" encoding="UTF-8"?>\n<eSocial>\n  <!-- Insira o molde aqui usando {{variaveis}} -->\n</eSocial>' });
                            setIsEditing(true);
                        }}>
                            <Plus size={18} className="mr-2" /> Novo Molde
                        </Button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        {templates.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <FileCode2 size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Nenhum molde cadastrado.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-600 text-sm font-semibold uppercase">
                                    <tr>
                                        <th className="p-4">Evento</th>
                                        <th className="p-4">Descrição</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {templates.map(t => (
                                        <tr key={t.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-mono font-bold text-blue-600">{t.code}</td>
                                            <td className="p-4 text-gray-700">{t.name}</td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => { setCurrentTemplate(t); setIsEditing(true); }} className="p-2 bg-gray-100 rounded hover:bg-gray-200 text-slate-600"><Edit size={16}/></button>
                                                    <button onClick={() => handleDelete(t.id)} className="p-2 bg-red-50 rounded hover:bg-red-100 text-red-600"><Trash2 size={16}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            ) : (
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <h2 className="text-xl font-bold text-gray-800">{currentTemplate?.id ? 'Editar Molde' : 'Novo Molde'}</h2>
                        <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Código do Evento (ex: S-1000)</label>
                                <input 
                                    type="text" 
                                    className="w-full border p-3 rounded-lg font-mono"
                                    value={currentTemplate?.code || ''}
                                    onChange={e => setCurrentTemplate(prev => prev ? {...prev, code: e.target.value} : null)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome / Descrição</label>
                                <input 
                                    type="text" 
                                    className="w-full border p-3 rounded-lg"
                                    value={currentTemplate?.name || ''}
                                    onChange={e => setCurrentTemplate(prev => prev ? {...prev, name: e.target.value} : null)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex justify-between">
                                <span>Molde XML</span>
                                <span className="text-blue-500 font-normal normal-case">Use {'{{variavel}}'} para dados dinâmicos</span>
                            </label>
                            <textarea 
                                className="w-full border p-3 rounded-lg font-mono text-sm h-96 bg-slate-50"
                                value={currentTemplate?.xmlTemplate || ''}
                                onChange={e => setCurrentTemplate(prev => prev ? {...prev, xmlTemplate: e.target.value} : null)}
                                placeholder="<eSocial>...</eSocial>"
                            />
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                            <Button onClick={handleSave}><Save size={18} className="mr-2" /> Salvar Molde</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
