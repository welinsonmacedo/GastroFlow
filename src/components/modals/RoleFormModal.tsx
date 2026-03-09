
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { CustomRole, SystemModule } from '@/types';
import { PERMISSIONS_SCHEMA } from '../../constants';
import { useStaff } from '@/core/context/StaffContext';
import { useUI } from '@/core/context/UIContext';
import { useRestaurant } from '@/core/context/RestaurantContext';
import { Shield, ChevronDown, ChevronRight, Check } from 'lucide-react';

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleToEdit?: CustomRole | null;
}

// Estrutura de Permissões (Importada de constants)
export const RoleFormModal: React.FC<RoleFormModalProps> = ({ isOpen, onClose, roleToEdit }) => {
    const { addRole, updateRole } = useStaff();
    const { showAlert } = useUI();
    const { state: restState } = useRestaurant();
    
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedModules, setSelectedModules] = useState<SystemModule[]>([]);
    const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
    const [expandedModules, setExpandedModules] = useState<SystemModule[]>(['RESTAURANT']);

    useEffect(() => {
        if (isOpen) {
            if (roleToEdit) {
                setName(roleToEdit.name);
                setDescription(roleToEdit.description || '');
                setSelectedModules(roleToEdit.permissions?.allowed_modules || []);
                setSelectedFeatures(roleToEdit.permissions?.allowed_features || []);
            } else {
                setName('');
                setDescription('');
                setSelectedModules([]);
                setSelectedFeatures([]);
            }
        }
    }, [isOpen, roleToEdit]);

    const toggleModule = (mod: SystemModule) => {
        // @ts-ignore
        const moduleFeatures = PERMISSIONS_SCHEMA[mod]?.features.map((f: any) => f.key) || [];

        if (selectedModules.includes(mod)) {
            // Desmarcar módulo e remover suas features
            setSelectedModules(prev => prev.filter(m => m !== mod));
            setSelectedFeatures(prev => prev.filter(f => !moduleFeatures.includes(f)));
        } else {
            // Marcar módulo e adicionar todas as suas features
            setSelectedModules(prev => [...prev, mod]);
            
            setSelectedFeatures(prev => {
                const newFeatures = [...prev];
                moduleFeatures.forEach((featKey: string) => {
                    if (!newFeatures.includes(featKey)) {
                        newFeatures.push(featKey);
                    }
                });
                return newFeatures;
            });

            if (!expandedModules.includes(mod)) {
                setExpandedModules(prev => [...prev, mod]);
            }
        }
    };

    const toggleFeature = (featKey: string, moduleKey: SystemModule) => {
        const newSelectedFeatures = selectedFeatures.includes(featKey)
            ? selectedFeatures.filter(f => f !== featKey)
            : [...selectedFeatures, featKey];

        setSelectedFeatures(newSelectedFeatures);

        const schema = PERMISSIONS_SCHEMA as any;
        const moduleFeatures = schema[moduleKey]?.features.map((f: any) => f.key) || [];
        const hasAnyFeatureInModule = moduleFeatures.some((f: string) => newSelectedFeatures.includes(f));

        if (hasAnyFeatureInModule) {
            if (!selectedModules.includes(moduleKey)) {
                setSelectedModules([...selectedModules, moduleKey]);
            }
        } else {
            setSelectedModules(selectedModules.filter(m => m !== moduleKey));
        }
    };

    const toggleExpand = (mod: SystemModule) => {
        setExpandedModules(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
    };

    const handleSubmit = async () => {
        if (!name) return;

        const roleData: any = {
            name,
            description,
            permissions: {
                allowed_modules: selectedModules,
                allowed_features: selectedFeatures
            }
        };

        try {
            if (roleToEdit) {
                await updateRole({ ...roleToEdit, ...roleData });
            } else {
                await addRole(roleData);
            }
            showAlert({ title: "Sucesso", message: "Cargo salvo com sucesso!", type: 'SUCCESS' });
            onClose();
        } catch (error) {
            showAlert({ title: "Erro", message: "Falha ao salvar cargo.", type: 'ERROR' });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={roleToEdit ? "Editar Cargo" : "Novo Cargo"} variant="dialog" maxWidth="md" onSave={handleSubmit}>
            <div className="space-y-6">
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Nome do Cargo</label>
                    <input required className="w-full border p-2.5 rounded-lg text-sm focus:border-blue-500 outline-none" placeholder="Ex: Gerente de Loja" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Descrição</label>
                    <input className="w-full border p-2.5 rounded-lg text-sm focus:border-blue-500 outline-none" placeholder="Descrição opcional..." value={description} onChange={e => setDescription(e.target.value)} />
                </div>

                <div className="border rounded-xl overflow-hidden">
                    <div className="bg-slate-50 p-3 border-b border-slate-200">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Shield size={14} className="text-blue-600"/> Permissões de Acesso
                        </h4>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-2 bg-white">
                        {Object.entries(PERMISSIONS_SCHEMA).map(([modKey, modData]) => {
                            // Filtra módulos permitidos para o tenant
                            const tenantAllowedModules = restState.allowedModules || ['RESTAURANT', 'SNACKBAR', 'DISTRIBUTOR', 'COMMERCE', 'MANAGER', 'CONFIG', 'FINANCE', 'INVENTORY', 'HR', 'AUDIT', 'SUPPORT', 'TIMECLOCK'];
                            if (!tenantAllowedModules.includes(modKey as SystemModule)) return null;

                            const isSelected = selectedModules.includes(modKey as SystemModule);
                            const isExpanded = expandedModules.includes(modKey as SystemModule);

                            return (
                                <div key={modKey} className="mb-1">
                                    <div className={`flex items-center justify-between p-2 rounded-lg transition-colors ${isSelected ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}`}>
                                        <div className="flex items-center gap-3">
                                            <div 
                                                onClick={() => toggleModule(modKey as SystemModule)}
                                                className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300'}`}
                                            >
                                                {isSelected && <Check size={14} strokeWidth={3} />}
                                            </div>
                                            <span 
                                                className="text-sm font-bold text-slate-700 cursor-pointer select-none"
                                                onClick={() => toggleExpand(modKey as SystemModule)}
                                            >
                                                {modData.label}
                                            </span>
                                        </div>
                                        <button type="button" onClick={() => toggleExpand(modKey as SystemModule)} className="text-gray-400 hover:text-blue-600">
                                            {isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                                        </button>
                                    </div>

                                    {isExpanded && (
                                        <div className="pl-9 pr-2 py-2 space-y-2 border-l-2 border-slate-100 ml-4 my-1">
                                            {modData.features.map((feat: { key: string; label: string }) => {
                                                // Filtra features permitidas para o tenant
                                                if (restState.allowedFeatures && restState.allowedFeatures.length > 0) {
                                                    if (!restState.allowedFeatures.includes(feat.key)) return null;
                                                }

                                                const featSelected = selectedFeatures.includes(feat.key);
                                                return (
                                                    <div 
                                                        key={feat.key} 
                                                        className="flex items-center gap-2 cursor-pointer group"
                                                        onClick={() => toggleFeature(feat.key, modKey as SystemModule)}
                                                    >
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${featSelected ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 group-hover:border-gray-400'}`}>
                                                            {featSelected && <Check size={10} strokeWidth={4} />}
                                                        </div>
                                                        <span className={`text-xs ${featSelected ? 'text-slate-800 font-bold' : 'text-slate-500 group-hover:text-slate-700'}`}>{feat.label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
