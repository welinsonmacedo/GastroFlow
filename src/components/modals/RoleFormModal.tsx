
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { CustomRole, SystemModule } from '../../types';
import { useStaff } from '../../context/StaffContext';
import { useUI } from '../../context/UIContext';
import { Shield, ChevronDown, ChevronRight, Check } from 'lucide-react';

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleToEdit?: CustomRole | null;
}

// Estrutura de Permissões (Poderia ser importada de um constants, mas mantido aqui para consistência do componente)
const PERMISSIONS_SCHEMA = {
    RESTAURANT: {
        label: "Restaurante",
        features: [
            { key: "restaurant_waiter", label: "Salão & Mesas (Garçom)" },
            { key: "restaurant_kds", label: "Cozinha (KDS)" },
            { key: "restaurant_cashier", label: "Caixa Gastronômico" }
        ]
    },
    COMMERCE: {
        label: "Comércio",
        features: [
            { key: "commerce_pos", label: "PDV (Caixa Rápido)" },
            { key: "commerce_finance", label: "Financeiro Simplificado" },
            { key: "commerce_reports", label: "Relatórios de Venda" }
        ]
    },
    INVENTORY: {
        label: "Estoque",
        features: [
            { key: "inventory_manage", label: "Gestão de Itens" },
            { key: "inventory_purchases", label: "Compras & Notas" },
            { key: "inventory_suppliers", label: "Fornecedores" }
        ]
    },
    HR: {
        label: "RH & Equipe",
        features: [
            { key: "rh_staff_list", label: "Cadastro de Colaboradores" },
            { key: "rh_attendance", label: "Ponto & Frequência" },
            { key: "rh_schedules", label: "Escalas & Turnos" },
            { key: "rh_payroll", label: "Folha de Pagamento" }
        ]
    },
    FINANCE: {
        label: "Financeiro",
        features: [
            { key: "finance_expenses", label: "Contas & Despesas" },
            { key: "finance_dre", label: "DRE Gerencial" },
            { key: "finance_bi", label: "Business Intelligence" },
            { key: "finance_reports", label: "Relatórios Detalhados" }
        ]
    },
    CONFIG: {
        label: "Configurações",
        features: [
            { key: "config_business", label: "Dados da Empresa" },
            { key: "config_operations", label: "Regras Operacionais" },
            { key: "config_delivery", label: "Delivery" },
            { key: "config_finance_settings", label: "Config. Financeira" },
            { key: "config_security", label: "Segurança" },
            { key: "config_appearance", label: "Aparência" },
            { key: "config_staff", label: "Acessos (Cargos)" }
        ]
    }
};

export const RoleFormModal: React.FC<RoleFormModalProps> = ({ isOpen, onClose, roleToEdit }) => {
    const { addRole, updateRole } = useStaff();
    const { showAlert } = useUI();
    
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
        if (selectedModules.includes(mod)) {
            setSelectedModules(selectedModules.filter(m => m !== mod));
            // Opcional: Desmarcar features se desmarcar módulo? 
            // Mantendo features marcadas caso o user marque o módulo de volta por engano.
        } else {
            setSelectedModules([...selectedModules, mod]);
            if (!expandedModules.includes(mod)) {
                setExpandedModules([...expandedModules, mod]);
            }
        }
    };

    const toggleFeature = (featKey: string, moduleKey: SystemModule) => {
        if (selectedFeatures.includes(featKey)) {
            setSelectedFeatures(selectedFeatures.filter(f => f !== featKey));
        } else {
            setSelectedFeatures([...selectedFeatures, featKey]);
            // Auto-selecionar módulo se selecionar feature
            if (!selectedModules.includes(moduleKey)) {
                setSelectedModules([...selectedModules, moduleKey]);
            }
        }
    };

    const toggleExpand = (mod: SystemModule) => {
        setExpandedModules(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
        <Modal isOpen={isOpen} onClose={onClose} title={roleToEdit ? "Editar Cargo" : "Novo Cargo"} variant="dialog" maxWidth="md">
            <form onSubmit={handleSubmit} className="space-y-6">
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
                                            {modData.features.map(feat => {
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

                <div className="flex gap-2 pt-2 border-t">
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
                    <Button type="submit" className="flex-1">Salvar Cargo</Button>
                </div>
            </form>
        </Modal>
    );
};
