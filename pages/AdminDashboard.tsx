
import React, { useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { Link } from 'react-router-dom';
import { 
    LayoutDashboard, Utensils, QrCode, Palette, Users, 
    FileSpreadsheet, Package, DollarSign, ArrowLeft, Menu, X, BookOpen 
} from 'lucide-react';

// Sub-Pages Import
import { AdminOverview } from './admin/AdminOverview';
import { AdminProducts } from './admin/AdminProducts';
import { AdminInventory } from './admin/AdminInventory';
import { AdminTables } from './admin/AdminTables';
import { AdminStaff } from './admin/AdminStaff';
import { AdminFinance } from './admin/AdminFinance';
import { AdminAccounting } from './admin/AdminAccounting';
import { AdminSettings } from './admin/AdminSettings';

export const AdminDashboard: React.FC = () => {
  const { state } = useRestaurant();
  const { planLimits, tenantSlug } = state;
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PRODUCTS' | 'TABLES' | 'CUSTOMIZATION' | 'STAFF' | 'ACCOUNTING' | 'INVENTORY' | 'FINANCE'>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderContent = () => {
      switch(activeTab) {
          case 'DASHBOARD': return <AdminOverview />;
          case 'PRODUCTS': return <AdminProducts />;
          case 'INVENTORY': return <AdminInventory />;
          case 'TABLES': return <AdminTables />;
          case 'STAFF': return <AdminStaff />;
          case 'FINANCE': return <AdminFinance />;
          case 'ACCOUNTING': return <AdminAccounting />;
          case 'CUSTOMIZATION': return <AdminSettings />;
          default: return <AdminOverview />;
      }
  };

  const NavButton = ({ tab, label, icon: Icon, requiredFeature }: any) => {
      if (requiredFeature && !planLimits[requiredFeature]) return null;
      return (
        <button 
            onClick={() => { setActiveTab(tab); setIsSidebarOpen(false); }} 
            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
        >
            <Icon size={20}/> <span className="font-medium">{label}</span>
        </button>
      );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex relative font-sans">
        {/* Sidebar */}
        <div className={`bg-slate-900 text-white w-72 p-6 fixed h-full z-50 transition-transform duration-300 shadow-xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 print:hidden flex flex-col`}>
            <div className="flex justify-between items-center mb-10">
                <h1 className="text-xl font-bold tracking-tight">Painel Admin</h1>
                <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-slate-800 rounded"><X size={20}/></button>
            </div>
            
            <nav className="space-y-1 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                <NavButton tab="DASHBOARD" label="Visão Geral" icon={LayoutDashboard} />
                <div className="pt-4 pb-2 text-xs font-bold text-slate-500 uppercase">Operação</div>
                <NavButton tab="INVENTORY" label="Estoque & Compras" icon={Package} requiredFeature="allowInventory" />
                <NavButton tab="PRODUCTS" label="Cardápio Digital" icon={Utensils} />
                <NavButton tab="TABLES" label="Mesas & QR" icon={QrCode} requiredFeature="allowTableMgmt" />
                
                <div className="pt-4 pb-2 text-xs font-bold text-slate-500 uppercase">Administrativo</div>
                <NavButton tab="FINANCE" label="Financeiro" icon={DollarSign} requiredFeature="allowExpenses" />
                <NavButton tab="ACCOUNTING" label="Relatórios (DRE)" icon={FileSpreadsheet} requiredFeature="allowReports" />
                <NavButton tab="STAFF" label="Equipe & Acesso" icon={Users} requiredFeature="allowStaff" />
                
                <div className="pt-4 pb-2 text-xs font-bold text-slate-500 uppercase">Sistema</div>
                <NavButton tab="CUSTOMIZATION" label="Personalização" icon={Palette} requiredFeature="allowCustomization" />
            </nav>

            <div className="pt-6 border-t border-slate-800 mt-auto space-y-1">
                {/* Correção aqui: Adicionando ?restaurant=slug */}
                <Link to={`/manual?restaurant=${tenantSlug}`} target="_blank" className="w-full text-left p-3 rounded-lg flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                    <BookOpen size={20}/> <span className="font-medium">Manual do Sistema</span>
                </Link>
                <Link to="/" className="w-full text-left p-3 rounded-lg flex items-center gap-3 text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors">
                    <ArrowLeft size={20}/> <span className="font-medium">Sair do Painel</span>
                </Link>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
            {/* Mobile Header */}
            <header className="bg-white shadow-sm border-b p-4 lg:hidden flex justify-between items-center shrink-0">
                <h1 className="font-bold text-lg text-gray-800">Admin</h1>
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-gray-100 rounded text-gray-600"><Menu size={24}/></button>
            </header>

            {/* Main Content Scrollable */}
            <main className="flex-1 overflow-y-auto p-4 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    {renderContent()}
                </div>
            </main>
        </div>
        
        {/* Overlay for Mobile Sidebar */}
        {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
    </div>
  );
};
