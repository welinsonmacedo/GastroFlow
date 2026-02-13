
import React, { useState, useEffect, useCallback } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { useUI } from '../context/UIContext';
import { Button } from '../components/Button';
import { QRCodeGenerator } from '../components/QRCodeGenerator';
import { ImageUploader } from '../components/ImageUploader';
import { Product, ProductType, Role, User, InventoryItem, Expense, InventoryType, Supplier, PurchaseItemInput, PurchaseInstallment } from '../types';
import { LayoutDashboard, Utensils, QrCode, Printer, ExternalLink, Palette, Eye, EyeOff, Save, Copy, Plus, Users, ShieldCheck, Trash2, Edit, AlertTriangle, FileBarChart, X, ArrowUp, ArrowDown, LayoutGrid, List as ListIcon, Image as ImageIcon, Calendar, TrendingUp, Search, Loader2, Menu, Activity, CheckSquare, GripVertical, Link as LinkIcon, Share2, Lock, BookOpen, Package, DollarSign, Archive, TrendingDown, RefreshCcw, Layers, ArrowLeft, Truck, FileText, ClipboardList, FileSpreadsheet, PieChart, CreditCard, Info, MapPin, Phone, User as UserIcon } from 'lucide-react';
import { getTenantSlug } from '../utils/tenant';
import { supabase } from '../lib/supabase';
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

export const AdminDashboard: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { showAlert } = useUI();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PRODUCTS' | 'TABLES' | 'CUSTOMIZATION' | 'STAFF' | 'REPORTS' | 'ACCOUNTING' | 'OFFICIAL_REPORT' | 'INVENTORY' | 'FINANCE'>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { planLimits } = state;

  const handleGlobalRefresh = () => {
      setIsRefreshing(true);
      // Aqui poderíamos disparar re-fetches manuais de todos os contextos
      setTimeout(() => {
          setIsRefreshing(false);
          showAlert({ title: "Dados Sincronizados", message: "Todas as informações administrativas foram atualizadas com o banco de dados.", type: 'SUCCESS' });
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
          default: return <AdminOverview />;
      }
  };

  return (
    <div className="h-full bg-gray-50 flex relative font-sans overflow-hidden">
        {/* Sidebar */}
        <aside className={`bg-slate-950 text-white w-72 p-6 h-full z-50 transition-transform duration-300 shadow-2xl ${isSidebarOpen ? 'translate-x-0 absolute left-0 top-0' : '-translate-x-full absolute left-0 top-0'} lg:relative lg:translate-x-0 print:hidden flex flex-col shrink-0 border-r border-white/5`}>
            <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/20"><Activity size={24}/></div>
                    <h1 className="text-xl font-black tracking-tighter uppercase">Admin Panel</h1>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={20}/></button>
            </div>
            
            <nav className="space-y-1.5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                <button onClick={() => {setActiveTab('DASHBOARD'); setIsSidebarOpen(false);}} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'DASHBOARD' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><LayoutDashboard size={20}/> <span className="font-bold text-sm uppercase tracking-tight">Visão Geral</span></button>
                
                <div className="pt-6 pb-2 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-2">Operação</div>
                {planLimits.allowInventory && <button onClick={() => {setActiveTab('INVENTORY'); setIsSidebarOpen(false);}} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'INVENTORY' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Package size={20}/> <span className="font-bold text-sm uppercase tracking-tight">Estoque</span></button>}
                <button onClick={() => {setActiveTab('PRODUCTS'); setIsSidebarOpen(false);}} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'PRODUCTS' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Utensils size={20}/> <span className="font-bold text-sm uppercase tracking-tight">Cardápio</span></button>
                {planLimits.allowTableMgmt && <button onClick={() => {setActiveTab('TABLES'); setIsSidebarOpen(false);}} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'TABLES' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><QrCode size={20}/> <span className="font-bold text-sm uppercase tracking-tight">Mesas & QR</span></button>}
                
                <div className="pt-6 pb-2 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-2">Gestão</div>
                {(planLimits.allowExpenses || planLimits.allowPurchases) && <button onClick={() => {setActiveTab('FINANCE'); setIsSidebarOpen(false);}} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'FINANCE' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><DollarSign size={20}/> <span className="font-bold text-sm uppercase tracking-tight">Financeiro</span></button>}
                {planLimits.allowReports && (
                    <>
                        <button onClick={() => {setActiveTab('ACCOUNTING'); setIsSidebarOpen(false);}} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'ACCOUNTING' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><PieChart size={20}/> <span className="font-bold text-sm uppercase tracking-tight">DRE Gerencial</span></button>
                    </>
                )}
                {planLimits.allowStaff && <button onClick={() => {setActiveTab('STAFF'); setIsSidebarOpen(false);}} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'STAFF' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Users size={20}/> <span className="font-bold text-sm uppercase tracking-tight">Equipe</span></button>}
                
                <div className="pt-6 pb-2 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-2">Configurações</div>
                {planLimits.allowCustomization && <button onClick={() => {setActiveTab('CUSTOMIZATION'); setIsSidebarOpen(false);}} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'CUSTOMIZATION' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Palette size={20}/> <span className="font-bold text-sm uppercase tracking-tight">Aparência</span></button>}
            </nav>

            <div className="pt-6 border-t border-white/5 mt-auto space-y-2">
                <Link to="/manual" target="_blank" className="w-full text-left p-3 rounded-xl flex items-center gap-3 text-slate-500 hover:bg-white/5 hover:text-white transition-all">
                    <BookOpen size={20}/> <span className="font-bold text-xs uppercase">Manual</span>
                </Link>
                <Link to="/" className="w-full text-left p-3 rounded-xl flex items-center gap-3 text-red-400 hover:bg-red-500/10 transition-all">
                    <ArrowLeft size={20}/> <span className="font-bold text-xs uppercase">Sair</span>
                </Link>
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
                    <div className="bg-slate-900 text-white px-5 py-3 rounded-[1.5rem] flex items-center gap-3 shadow-xl shadow-slate-900/10">
                        <div className="bg-emerald-500 w-2 h-2 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Painel Conectado</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
                <div className="max-w-7xl mx-auto h-full animate-fade-in">
                    {renderContent()}
                </div>
            </main>
        </div>
        
        {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in" onClick={() => setIsSidebarOpen(false)}></div>}
    </div>
  );
};
