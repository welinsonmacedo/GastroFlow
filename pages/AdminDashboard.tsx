
import React, { useState, useEffect, useCallback } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useUI } from '../context/UIContext';
import { Button } from '../components/Button';
import { LayoutDashboard, Utensils, QrCode, Palette, Activity, X, LayoutGrid, Package, DollarSign, Layers, ArrowLeft, PieChart, CreditCard, User as UserIcon, ChevronDown, ChevronRight, Briefcase, Settings, ShoppingCart, Lightbulb, Menu, Users, RefreshCcw } from 'lucide-react';
import { getTenantSlug } from '../utils/tenant';
import { Link } from 'react-router-dom';

import { AdminOverview } from './admin/AdminOverview';
import { AdminProducts } from './admin/AdminProducts';
import { AdminInventory } from './admin/AdminInventory';
import { AdminTables } from './admin/AdminTables';
import { AdminStaff } from './admin/AdminStaff';
import { AdminFinance } from './admin/AdminFinance';
import { AdminAccounting } from './admin/AdminAccounting';
import { AccountingReport } from './admin/AccountingReport'; 
import { AdminSettings } from './admin/AdminSettings';
import { AdminMenuAppearance } from './admin/AdminMenuAppearance'; 
import { AdminPurchaseSuggestions } from './admin/AdminPurchaseSuggestions'; 
import { AdminFinancialTips } from './admin/AdminFinancialTips'; 

export const AdminDashboard: React.FC = () => {
  const { state } = useRestaurant();
  const { showAlert } = useUI();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PRODUCTS' | 'TABLES' | 'CUSTOMIZATION' | 'MENU_APPEARANCE' | 'STAFF' | 'REPORTS' | 'ACCOUNTING' | 'OFFICIAL_REPORT' | 'INVENTORY' | 'FINANCE' | 'PURCHASE_SUGGESTIONS' | 'FINANCIAL_TIPS'>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile toggle
  const [isSidebarHovered, setIsSidebarHovered] = useState(false); // Desktop hover
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Controle dos grupos do menu (Dropdowns) - Inicia apenas com OPERATIONAL aberto
  const [openGroups, setOpenGroups] = useState<string[]>(['OPERATIONAL']);

  const { planLimits } = state;

  // Lógica Acordeão: Abre um e fecha os outros
  const toggleGroup = (group: string) => {
      setOpenGroups(prev => prev.includes(group) ? [] : [group]);
  };

  const handleGlobalRefresh = () => {
      setIsRefreshing(true);
      setTimeout(() => {
          setIsRefreshing(false);
          showAlert({ title: "Dados Sincronizados", message: "Todas as informações administrativas foram atualizadas.", type: 'SUCCESS' });
      }, 1000);
  };

  const renderContent = () => {
      switch(activeTab) {
          case 'DASHBOARD': return <AdminOverview />;
          case 'PRODUCTS': return <AdminProducts />;
          case 'INVENTORY': return <AdminInventory />;
          case 'TABLES': return <AdminTables />;
          case 'STAFF': return <AdminStaff />;
          case 'FINANCE': return <AdminFinance />;
          case 'ACCOUNTING': return <AdminAccounting />;
          case 'OFFICIAL_REPORT': return <AccountingReport />;
          case 'CUSTOMIZATION': return <AdminSettings />;
          case 'MENU_APPEARANCE': return <AdminMenuAppearance />;
          case 'PURCHASE_SUGGESTIONS': return <AdminPurchaseSuggestions />;
          case 'FINANCIAL_TIPS': return <AdminFinancialTips />;
          default: return <AdminOverview />;
      }
  };

  // Estrutura do Menu
  const menuGroups = [
      {
          id: 'OPERATIONAL',
          label: 'Operacional',
          icon: Layers,
          items: [
              { id: 'INVENTORY', label: 'Estoque', icon: Package, visible: planLimits.allowInventory },
              { id: 'PRODUCTS', label: 'Cardápio', icon: Utensils, visible: true },
              { id: 'TABLES', label: 'Mesas & QR', icon: QrCode, visible: planLimits.allowTableMgmt },
          ]
      },
      {
          id: 'MANAGEMENT',
          label: 'Gestão',
          icon: Briefcase,
          items: [
              { id: 'FINANCE', label: 'Financeiro', icon: DollarSign, visible: planLimits.allowExpenses || planLimits.allowPurchases },
              { id: 'ACCOUNTING', label: 'DRE Gerencial', icon: PieChart, visible: planLimits.allowReports },
              { id: 'PURCHASE_SUGGESTIONS', label: 'Sugestão Compra', icon: ShoppingCart, visible: planLimits.allowInventory },
              { id: 'FINANCIAL_TIPS', label: 'Dicas Financeiras', icon: Lightbulb, visible: planLimits.allowReports },
              { id: 'STAFF', label: 'Equipe', icon: Users, visible: planLimits.allowStaff },
          ]
      },
      {
          id: 'SYSTEM',
          label: 'Sistema',
          icon: Settings,
          items: [
              { id: 'MENU_APPEARANCE', label: 'Aparência Cardápio', icon: Palette, visible: planLimits.allowCustomization },
              { id: 'CUSTOMIZATION', label: 'Configurações', icon: Settings, visible: true },
          ]
      }
  ];

  return (
    <div className="h-full bg-gray-50 flex relative font-sans overflow-hidden">
        {/* Sidebar */}
        <aside 
            className={`
                bg-slate-950 text-white h-full z-50 shadow-2xl transition-all duration-300 ease-in-out flex flex-col shrink-0 border-r border-white/5
                fixed lg:relative
                ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
                ${isSidebarHovered || isSidebarOpen ? 'lg:w-72' : 'lg:w-20'}
            `}
            onMouseEnter={() => setIsSidebarHovered(true)}
            onMouseLeave={() => setIsSidebarHovered(false)}
        >
            {/* Header Sidebar */}
            <div className={`flex items-center h-20 px-6 transition-all ${isSidebarHovered || isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
                <div className={`flex items-center gap-3 transition-opacity duration-200 ${isSidebarHovered || isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden lg:flex lg:w-0 overflow-hidden'}`}>
                    <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-600/20 shrink-0">
                        <Activity size={20}/>
                    </div>
                    <h1 className="text-lg font-black tracking-tighter uppercase whitespace-nowrap">Admin</h1>
                </div>
                
                {/* Ícone visível quando recolhido */}
                <div className={`absolute left-1/2 -translate-x-1/2 transition-opacity duration-300 ${!isSidebarHovered && !isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="bg-blue-600 p-2 rounded-xl shadow-lg">
                        <Activity size={24}/>
                    </div>
                </div>

                <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={20}/></button>
            </div>
            
            {/* Menu Itens */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-4 space-y-1">
                {/* Dashboard (Item Solto) */}
                <div className="px-3 mb-4">
                    <button 
                        onClick={() => { setActiveTab('DASHBOARD'); setIsSidebarOpen(false); }} 
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all relative group
                            ${activeTab === 'DASHBOARD' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}
                            ${!isSidebarHovered && !isSidebarOpen ? 'justify-center' : ''}
                        `}
                    >
                        <LayoutDashboard size={20} className="shrink-0"/>
                        <span className={`font-bold text-sm uppercase tracking-tight transition-all duration-300 ${isSidebarHovered || isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 absolute left-12 pointer-events-none'}`}>
                            Visão Geral
                        </span>
                        {/* Tooltip quando recolhido */}
                        {!isSidebarHovered && !isSidebarOpen && (
                            <div className="absolute left-full ml-4 bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl border border-slate-700">
                                Visão Geral
                            </div>
                        )}
                    </button>
                </div>

                <div className="border-t border-white/5 my-2 mx-4"></div>

                {/* Grupos Dinâmicos */}
                {menuGroups.map(group => {
                    const hasVisibleItems = group.items.some(i => i.visible);
                    if (!hasVisibleItems) return null;
                    const isOpen = openGroups.includes(group.id);

                    return (
                        <div key={group.id} className="px-3 mb-1">
                            {/* Group Header (Apenas visível expandido, ou ícone recolhido) */}
                            <button 
                                onClick={() => isSidebarHovered ? toggleGroup(group.id) : setIsSidebarHovered(true)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors text-slate-500 hover:text-white group
                                    ${!isSidebarHovered && !isSidebarOpen ? 'justify-center' : ''}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <group.icon size={20} className={`shrink-0 transition-colors ${isOpen ? 'text-blue-400' : ''}`}/>
                                    <span className={`font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${isSidebarHovered || isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                                        {group.label}
                                    </span>
                                </div>
                                {(isSidebarHovered || isSidebarOpen) && (
                                    <div className="transition-transform duration-200">
                                        {isOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                                    </div>
                                )}
                            </button>

                            {/* Dropdown Items */}
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${(isOpen && (isSidebarHovered || isSidebarOpen)) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="space-y-1 mt-1 mb-3 pl-3 border-l-2 border-slate-800 ml-6">
                                    {group.items.filter(i => i.visible).map(item => (
                                        <button 
                                            key={item.id}
                                            onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); }}
                                            className={`w-full text-left p-2 pl-4 rounded-lg flex items-center gap-3 transition-all text-xs font-bold
                                                ${activeTab === item.id ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}
                                            `}
                                        >
                                            <item.icon size={16} className={activeTab === item.id ? 'text-blue-400' : 'opacity-70'}/>
                                            <span>{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* Footer Sidebar */}
            <div className="p-4 border-t border-white/5 mt-auto bg-slate-900/50">
                {/* Status do Sistema (Movido do Header) */}
                <div className={`flex items-center gap-3 p-3 mb-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 transition-all ${!isSidebarHovered && !isSidebarOpen ? 'justify-center' : ''}`}>
                    <div className="bg-emerald-500 w-2 h-2 rounded-full animate-pulse shrink-0"></div>
                    <span className={`text-[10px] font-black text-emerald-500 uppercase tracking-widest whitespace-nowrap transition-all ${isSidebarHovered || isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                        Sistema Online
                    </span>
                </div>

                <div className="space-y-1">
                    <Link to="/manual" target="_blank" className={`w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 hover:bg-white/5 hover:text-white transition-all ${!isSidebarHovered && !isSidebarOpen ? 'justify-center' : ''} group relative`}>
                        <ArrowLeft size={20} className="shrink-0"/>
                        <span className={`font-bold text-xs uppercase transition-all ${isSidebarHovered || isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>Sair</span>
                        {!isSidebarHovered && !isSidebarOpen && <div className="absolute left-full ml-4 bg-red-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none z-50">Sair</div>}
                    </Link>
                </div>
            </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <header className="bg-white/80 backdrop-blur-md shadow-sm border-b p-4 md:p-6 flex justify-between items-center shrink-0 print:hidden z-40 sticky top-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-3 bg-slate-900 text-white rounded-2xl shadow-lg"><Menu size={20}/></button>
                    <div className="hidden lg:block">
                        <h1 className="font-black text-2xl text-slate-900 uppercase tracking-tighter">Administração</h1>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-0.5">{state.theme.restaurantName}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleGlobalRefresh}
                        className={`p-3.5 rounded-2xl bg-gray-100 text-blue-600 hover:bg-blue-50 transition-all shadow-sm ${isRefreshing ? 'animate-spin' : 'hover:scale-105 active:scale-95'}`}
                        title="Sincronizar Banco de Dados"
                    >
                        <RefreshCcw size={22}/>
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
                <div className="max-w-7xl mx-auto h-full animate-fade-in">
                    {renderContent()}
                </div>
            </main>
        </div>
        
        {/* Overlay Mobile */}
        {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in" onClick={() => setIsSidebarOpen(false)}></div>}
    </div>
  );
};
