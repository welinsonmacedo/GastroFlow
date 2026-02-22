import React, { useState } from 'react';
import { useSaaS } from '../../../context/SaaSContext';
import { Plan, SystemModule, PlanLimits } from '../../../types';
import { Button } from '../../../components/Button';
import { Modal } from '../../../components/Modal';
import { Plus, Edit, Trash2, Check, X, ChefHat, DollarSign, Package, Users, Store, Settings, ShieldAlert, Briefcase } from 'lucide-react';

const MODULES_CONFIG = [
    {
        id: 'RESTAURANT' as SystemModule,
        label: 'Restaurante & Mesas',
        icon: ChefHat,
        features: [
            { id: 'rest_dashboard', label: 'Dashboard' },
            { id: 'rest_tables', label: 'Gestão de Mesas' },
            { id: 'rest_orders', label: 'Pedidos' },
            { id: 'rest_kds', label: 'KDS (Cozinha)' },
            { id: 'rest_waiter', label: 'App Garçom' },
            { id: 'rest_menu', label: 'Cardápio Digital' }
        ]
    },
    {
        id: 'MANAGER' as SystemModule,
        label: 'Gestor (Backoffice)',
        icon: Briefcase,
        features: [
            { id: 'admin_overview', label: 'Visão Geral' },
            { id: 'admin_products', label: 'Cardápio Digital' },
            { id: 'admin_tables', label: 'Mesas & QR Code' }
        ]
    },
    {
        id: 'FINANCE' as SystemModule,
        label: 'Financeiro',
        icon: DollarSign,
        features: [
            { id: 'fin_dashboard', label: 'Dashboard' },
            { id: 'fin_entries', label: 'Entradas' },
            { id: 'fin_exits', label: 'Saídas' },
            { id: 'fin_dre', label: 'DRE Gerencial' },
            { id: 'fin_cashier', label: 'Histórico de Caixa' },
            { id: 'fin_bi', label: 'Inteligência (BI)' },
            { id: 'fin_reports', label: 'Relatórios' },
            { id: 'fin_tips', label: 'Dicas Financeiras' }
        ]
    },
    {
        id: 'INVENTORY' as SystemModule,
        label: 'Estoque',
        icon: Package,
        features: [
            { id: 'inv_dashboard', label: 'Dashboard' },
            { id: 'inv_items', label: 'Itens & Produtos' },
            { id: 'inv_suppliers', label: 'Fornecedores' },
            { id: 'inv_purchases', label: 'Compras' },
            { id: 'inv_recipes', label: 'Fichas Técnicas' }
        ]
    },
    {
        id: 'HR' as SystemModule,
        label: 'RH & Ponto',
        icon: Users,
        features: [
            { id: 'hr_dashboard', label: 'Dashboard' },
            { id: 'hr_staff', label: 'Colaboradores' },
            { id: 'hr_timeclock', label: 'Ponto Eletrônico' },
            { id: 'hr_payroll', label: 'Folha de Pagamento' },
            { id: 'hr_schedule', label: 'Escalas' }
        ]
    },
    {
        id: 'COMMERCE' as SystemModule,
        label: 'Varejo / PDV',
        icon: Store,
        features: [
            { id: 'pos_terminal', label: 'Terminal PDV' },
            { id: 'pos_sales', label: 'Histórico de Vendas' }
        ]
    },
    {
        id: 'AUDIT' as SystemModule,
        label: 'Auditoria',
        icon: ShieldAlert,
        features: [
            { id: 'audit_logs', label: 'Logs de Sistema' }
        ]
    }
];

export const PlanManager: React.FC = () => {
    const { state, dispatch } = useSaaS();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Partial<Plan>>({});

    const handleNewPlan = () => {
        setEditingPlan({
            name: '',
            key: '',
            price: 'R$ 0,00',
            period: 'Mensal',
            features: [],
            limits: {
                maxTables: 10,
                maxProducts: 50,
                maxStaff: 2,
                allowKds: false,
                allowCashier: false,
                allowReports: true,
                allowInventory: false,
                allowPurchases: false,
                allowExpenses: false,
                allowStaff: true,
                allowTableMgmt: true,
                allowCustomization: true,
                allowHR: false,
                allowProductImages: true,
                allowedModules: [],
                allowedFeatures: []
            },
            is_popular: false,
            button_text: 'Contratar'
        });
        setIsModalOpen(true);
    };

    const handleEditPlan = (plan: Plan) => {
        setEditingPlan({ ...plan });
        setIsModalOpen(true);
    };

    const handleDeletePlan = (planId: string) => {
        if (window.confirm('Tem certeza que deseja excluir este plano?')) {
            dispatch({ type: 'DELETE_PLAN', planId });
        }
    };

    const handleSave = () => {
        if (!editingPlan.name || !editingPlan.key) {
            alert('Nome e Chave são obrigatórios');
            return;
        }

        // Sync legacy boolean flags with modules
        const newLimits = { ...editingPlan.limits } as PlanLimits;
        const modules = newLimits.allowedModules || [];
        
        newLimits.allowTableMgmt = modules.includes('RESTAURANT');
        newLimits.allowKds = modules.includes('RESTAURANT') && (newLimits.allowedFeatures?.includes('rest_kds') || false);
        newLimits.allowExpenses = modules.includes('FINANCE');
        newLimits.allowInventory = modules.includes('INVENTORY');
        newLimits.allowPurchases = modules.includes('INVENTORY'); // Coupled with Inventory usually
        newLimits.allowHR = modules.includes('HR');
        newLimits.allowCashier = modules.includes('COMMERCE');

        const planToSave = {
            ...editingPlan,
            limits: newLimits
        } as Plan;

        if (editingPlan.id) {
            dispatch({ type: 'UPDATE_PLAN_DETAILS', plan: planToSave });
        } else {
            dispatch({ type: 'CREATE_PLAN', plan: planToSave });
        }
        setIsModalOpen(false);
    };

    const toggleModule = (moduleId: SystemModule) => {
        const current = editingPlan.limits?.allowedModules || [];
        const newModules = current.includes(moduleId) 
            ? current.filter(m => m !== moduleId) 
            : [...current, moduleId];
            
        setEditingPlan({ 
            ...editingPlan, 
            limits: { 
                ...editingPlan.limits!, 
                allowedModules: newModules 
            } 
        });
    };

    const toggleFeature = (featureId: string) => {
        const current = editingPlan.limits?.allowedFeatures || [];
        const newFeatures = current.includes(featureId) 
            ? current.filter(f => f !== featureId) 
            : [...current, featureId];
            
        setEditingPlan({ 
            ...editingPlan, 
            limits: { 
                ...editingPlan.limits!, 
                allowedFeatures: newFeatures 
            } 
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Planos & Preços</h2>
                <Button onClick={handleNewPlan}>
                    <Plus size={18} className="mr-2" /> Novo Plano
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {state.plans.map(plan => (
                    <div key={plan.id} className="bg-white rounded-xl shadow-sm border p-6 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg">{plan.name}</h3>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{plan.key}</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEditPlan(plan)} className="p-2 hover:bg-gray-100 rounded-lg text-blue-600">
                                    <Edit size={18} />
                                </button>
                                <button onClick={() => handleDeletePlan(plan.id)} className="p-2 hover:bg-gray-100 rounded-lg text-red-600">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                        
                        <p className="text-3xl font-black text-slate-800 mb-6">{plan.price} <span className="text-sm font-normal text-gray-500">/{plan.period}</span></p>

                        <div className="space-y-4 flex-1">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Módulos Inclusos</h4>
                                <div className="flex flex-wrap gap-2">
                                    {plan.limits?.allowedModules?.map(mod => (
                                        <span key={mod} className="text-[10px] font-bold bg-white border px-2 py-1 rounded text-slate-700 shadow-sm">
                                            {MODULES_CONFIG.find(m => m.id === mod)?.label || mod}
                                        </span>
                                    ))}
                                    {(!plan.limits?.allowedModules || plan.limits?.allowedModules.length === 0) && <span className="text-xs text-gray-400 italic">Nenhum módulo</span>}
                                </div>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Limites</h4>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div><span className="font-bold">Mesas:</span> {plan.limits?.maxTables === -1 ? 'Infinito' : plan.limits?.maxTables}</div>
                                    <div><span className="font-bold">Produtos:</span> {plan.limits?.maxProducts === -1 ? 'Infinito' : plan.limits?.maxProducts}</div>
                                    <div><span className="font-bold">Usuários:</span> {plan.limits?.maxStaff === -1 ? 'Infinito' : plan.limits?.maxStaff}</div>
                                    <div><span className="font-bold">Imagens:</span> {plan.limits?.allowProductImages ? 'Sim' : 'Não'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingPlan.id ? "Editar Plano" : "Novo Plano"}
                variant="page"
                onSave={handleSave}
            >
                <div className="max-w-5xl mx-auto space-y-8 pb-20">
                    {/* Basic Info */}
                    <section className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                        <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Informações Básicas</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Plano</label>
                                <input 
                                    className="w-full border p-2 rounded-lg" 
                                    value={editingPlan.name || ''} 
                                    onChange={e => setEditingPlan({...editingPlan, name: e.target.value})}
                                    placeholder="Ex: Profissional"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Chave (ID Único)</label>
                                <input 
                                    className="w-full border p-2 rounded-lg" 
                                    value={editingPlan.key || ''} 
                                    onChange={e => setEditingPlan({...editingPlan, key: e.target.value.toUpperCase().replace(/\s/g, '_')})}
                                    placeholder="Ex: PRO_PLAN"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Preço (Texto)</label>
                                <input 
                                    className="w-full border p-2 rounded-lg" 
                                    value={editingPlan.price || ''} 
                                    onChange={e => setEditingPlan({...editingPlan, price: e.target.value})}
                                    placeholder="Ex: R$ 99,90"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Limits */}
                    <section className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                        <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Limites Operacionais</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Max. Mesas (-1 = Infinito)</label>
                                <input 
                                    type="number"
                                    className="w-full border p-2 rounded-lg" 
                                    value={editingPlan.limits?.maxTables ?? 10} 
                                    onChange={e => setEditingPlan({...editingPlan, limits: { ...editingPlan.limits!, maxTables: parseInt(e.target.value) }})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Max. Produtos (-1 = Infinito)</label>
                                <input 
                                    type="number"
                                    className="w-full border p-2 rounded-lg" 
                                    value={editingPlan.limits?.maxProducts ?? 50} 
                                    onChange={e => setEditingPlan({...editingPlan, limits: { ...editingPlan.limits!, maxProducts: parseInt(e.target.value) }})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Max. Usuários (-1 = Infinito)</label>
                                <input 
                                    type="number"
                                    className="w-full border p-2 rounded-lg" 
                                    value={editingPlan.limits?.maxStaff ?? 2} 
                                    onChange={e => setEditingPlan({...editingPlan, limits: { ...editingPlan.limits!, maxStaff: parseInt(e.target.value) }})}
                                />
                            </div>
                            <div className="flex items-center pt-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        className="w-5 h-5 rounded text-blue-600"
                                        checked={editingPlan.limits?.allowProductImages ?? true}
                                        onChange={e => setEditingPlan({...editingPlan, limits: { ...editingPlan.limits!, allowProductImages: e.target.checked }})}
                                    />
                                    <span className="text-sm font-medium text-gray-700">Permitir Imagens nos Produtos</span>
                                </label>
                            </div>
                        </div>
                    </section>

                    {/* Modules & Features */}
                    <section className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
                        <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Módulos e Permissões</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {MODULES_CONFIG.map(module => {
                                const isModuleEnabled = editingPlan.limits?.allowedModules?.includes(module.id);
                                return (
                                    <div key={module.id} className={`border rounded-xl p-4 transition-all ${isModuleEnabled ? 'bg-blue-50/50 border-blue-200' : 'bg-gray-50 border-gray-200 opacity-75'}`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${isModuleEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                                                    <module.icon size={20} />
                                                </div>
                                                <span className={`font-bold ${isModuleEnabled ? 'text-blue-900' : 'text-gray-600'}`}>{module.label}</span>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={isModuleEnabled || false} onChange={() => toggleModule(module.id)} />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>

                                        {isModuleEnabled && (
                                            <div className="pl-12 space-y-2 animate-fade-in">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Funcionalidades (Abas)</p>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {module.features.map(feature => (
                                                        <label key={feature.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-1 rounded transition-colors">
                                                            <input 
                                                                type="checkbox" 
                                                                className="rounded text-blue-600 focus:ring-blue-500"
                                                                checked={editingPlan.limits?.allowedFeatures?.includes(feature.id) || false}
                                                                onChange={() => toggleFeature(feature.id)}
                                                            />
                                                            <span className="text-sm text-gray-700">{feature.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </Modal>
        </div>
    );
};
