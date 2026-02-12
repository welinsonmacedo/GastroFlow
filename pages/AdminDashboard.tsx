
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

// Import Pages
import { AdminOverview } from './admin/AdminOverview';
import { AdminProducts } from './admin/AdminProducts';
import { AdminInventory } from './admin/AdminInventory';
import { AdminTables } from './admin/AdminTables';
import { AdminStaff } from './admin/AdminStaff';
import { AdminFinance } from './admin/AdminFinance';
import { AdminAccounting } from './admin/AdminAccounting';
import { AccountingReport } from './admin/AccountingReport'; // NEW
import { AdminSettings } from './admin/AdminSettings';

export const AdminDashboard: React.FC = () => {
  const { state, dispatch } = useRestaurant();
  const { showAlert, showConfirm } = useUI();
  // Added 'OFFICIAL_REPORT' to the tabs
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PRODUCTS' | 'TABLES' | 'CUSTOMIZATION' | 'STAFF' | 'REPORTS' | 'ACCOUNTING' | 'OFFICIAL_REPORT' | 'INVENTORY' | 'FINANCE'>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { planLimits } = state;

  const renderContent = () => {
      switch(activeTab) {
          case 'DASHBOARD': return <AdminOverview />;
          case 'PRODUCTS': return <AdminProducts />;
          case 'INVENTORY': return <AdminInventory />;
          case 'TABLES': return <AdminTables />;
          case 'STAFF': return <AdminStaff />;
          case 'FINANCE': return <AdminFinance />;
          case 'ACCOUNTING': return <AdminAccounting />; // DRE Gerencial
          case 'OFFICIAL_REPORT': return <AccountingReport />; // Relatório Contábil A4
          case 'CUSTOMIZATION': return <AdminSettings />;
          default: return <AdminOverview />;
      }
  };

  // MODIFICAÇÃO: "h-full" em vez de "min-h-screen" para não estourar o container pai.
  return (
    <div className="h-full bg-gray-100 flex relative font-sans overflow-hidden">
        {/* Sidebar */}
        <div className={`bg-slate-900 text-white w-72 p-6 h-full z-50 transition-transform duration-300 shadow-xl ${isSidebarOpen ? 'translate-x-0 absolute left-0 top-0' : '-translate-x-full absolute left-0 top-0'} lg:relative lg:translate-x-0 print:hidden flex flex-col shrink-0`}>
            <div className="flex justify-between items-center mb-10">
                <h1 className="text-xl font-bold tracking-tight">Painel Admin</h1>
                <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-slate-800 rounded"><X size={20}/></button>
            </div>
            
            <nav className="space-y-1 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                <button onClick={() => {setActiveTab('DASHBOARD'); setIsSidebarOpen(false);}} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'DASHBOARD' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}><LayoutDashboard size={20}/> <span className="font-medium">Visão Geral</span></button>
                
                <div className="pt-4 pb-2 text-xs font-bold text-slate-500 uppercase">Operação</div>
                {planLimits.allowInventory && <button onClick={() => {setActiveTab('INVENTORY'); setIsSidebarOpen(false);}} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'INVENTORY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}><Package size={20}/> <span className="font-medium">Estoque & Compras</span></button>}
                <button onClick={() => {setActiveTab('PRODUCTS'); setIsSidebarOpen(false);}} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'PRODUCTS' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}><Utensils size={20}/> <span className="font-medium">Cardápio Digital</span></button>
                {planLimits.allowTableMgmt && <button onClick={() => {setActiveTab('TABLES'); setIsSidebarOpen(false);}} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'TABLES' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}><QrCode size={20}/> <span className="font-medium">Mesas & QR</span></button>}
                
                <div className="pt-4 pb-2 text-xs font-bold text-slate-500 uppercase">Administrativo</div>
                {(planLimits.allowExpenses || planLimits.allowPurchases) && <button onClick={() => {setActiveTab('FINANCE'); setIsSidebarOpen(false);}} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'FINANCE' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}><DollarSign size={20}/> <span className="font-medium">Financeiro</span></button>}
                {planLimits.allowReports && (
                    <>
                        <button onClick={() => {setActiveTab('ACCOUNTING'); setIsSidebarOpen(false);}} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'ACCOUNTING' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}><PieChart size={20}/> <span className="font-medium">DRE Gerencial</span></button>
                        <button onClick={() => {setActiveTab('OFFICIAL_REPORT'); setIsSidebarOpen(false);}} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'OFFICIAL_REPORT' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}><FileText size={20}/> <span className="font-medium">Relatório Contábil</span></button>
                    </>
                )}
                {planLimits.allowStaff && <button onClick={() => {setActiveTab('STAFF'); setIsSidebarOpen(false);}} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'STAFF' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}><Users size={20}/> <span className="font-medium">Equipe & Acesso</span></button>}
                
                <div className="pt-4 pb-2 text-xs font-bold text-slate-500 uppercase">Sistema</div>
                {planLimits.allowCustomization && <button onClick={() => {setActiveTab('CUSTOMIZATION'); setIsSidebarOpen(false);}} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'CUSTOMIZATION' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}><Palette size={20}/> <span className="font-medium">Configurações</span></button>}
            </nav>

            <div className="pt-6 border-t border-slate-800 mt-auto space-y-1">
                <Link to={`/manual?restaurant=${state.tenantSlug}`} target="_blank" className="w-full text-left p-3 rounded-lg flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                    <BookOpen size={20}/> <span className="font-medium">Manual do Sistema</span>
                </Link>
                <Link to="/" className="w-full text-left p-3 rounded-lg flex items-center gap-3 text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors">
                    <ArrowLeft size={20}/> <span className="font-medium">Sair do Painel</span>
                </Link>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            {/* Mobile Header */}
            <header className="bg-white shadow-sm border-b p-4 lg:hidden flex justify-between items-center shrink-0 print:hidden">
                <h1 className="font-bold text-lg text-gray-800">Admin</h1>
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-gray-100 rounded text-gray-600"><Menu size={24}/></button>
            </header>

            {/* Main Content Scrollable - MUDANÇA: h-full */}
            <main className="flex-1 overflow-y-auto p-4 lg:p-8">
                <div className="max-w-7xl mx-auto h-full">
                    {renderContent()}
                </div>
            </main>
        </div>
        
        {/* Overlay for Mobile Sidebar */}
        {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
    </div>
  );
};
