
import React from 'react';
// @ts-ignore
import { Routes, Route, Navigate } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';

// Sub-páginas
import { AdminOverview } from './admin/AdminOverview';
import { AdminProducts } from './admin/AdminProducts';
import { AdminInventory } from './admin/AdminInventory';
import { AdminTables } from './admin/AdminTables';
import { AdminStaff } from './admin/AdminStaff';
import { AdminFinance } from './admin/AdminFinance';
import { AdminAccounting } from './admin/AdminAccounting';
import { AdminSettings } from './admin/AdminSettings';
import { AdminMenuAppearance } from './admin/AdminMenuAppearance'; 
import { AdminPurchaseSuggestions } from './admin/AdminPurchaseSuggestions'; 
import { AdminFinancialTips } from './admin/AdminFinancialTips'; 

export const AdminDashboard: React.FC = () => {
  const { state } = useRestaurant();
  const { planLimits } = state;

  return (
    <div className="h-full bg-gray-50 min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto h-full">
            <Routes>
                {/* Dashboard Principal */}
                <Route path="/" element={<AdminOverview />} />
                
                {/* Rotas Operacionais */}
                <Route path="products" element={<AdminProducts />} />
                
                {planLimits.allowInventory && (
                    <>
                        <Route path="inventory" element={<AdminInventory />} />
                        <Route path="purchases" element={<AdminPurchaseSuggestions />} />
                    </>
                )}

                {planLimits.allowTableMgmt && <Route path="tables" element={<AdminTables />} />}
                {planLimits.allowStaff && <Route path="staff" element={<AdminStaff />} />}

                {/* Rotas Financeiras */}
                {(planLimits.allowExpenses || planLimits.allowPurchases) && (
                    <Route path="finance" element={<AdminFinance />} />
                )}
                
                {planLimits.allowReports && (
                    <>
                        <Route path="accounting" element={<AdminAccounting />} />
                        <Route path="tips" element={<AdminFinancialTips />} />
                    </>
                )}

                {/* Rotas de Configuração */}
                {planLimits.allowCustomization && <Route path="appearance" element={<AdminMenuAppearance />} />}
                <Route path="settings" element={<AdminSettings />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="" replace />} />
            </Routes>
        </div>
    </div>
  );
};