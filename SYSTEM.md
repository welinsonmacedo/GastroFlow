# Flux Eat - System Documentation

## Project Overview
Flux Eat is a comprehensive, multi-tenant restaurant and retail management system (SaaS) built with modern web technologies. It provides tailored interfaces for different roles (Owners, Managers, Cashiers, Waiters, Kitchen Staff) and business types (Restaurants, Retail/Commerce).

## Tech Stack
- **Frontend**: React 18+, TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS, Lucide React (Icons), Framer Motion (Animations)
- **State Management**: React Context API (AuthProvider, RestaurantProvider, StaffProvider, UIContext)
- **Backend/Database**: Supabase (PostgreSQL) - *Integrated via client-side SDK*
- **Routing**: React Router DOM

## Core Architecture
- **Multi-Tenancy**: The system is designed to support multiple restaurants/tenants, identified by `tenantId`.
- **Role-Based Access Control (RBAC)**: Access to modules and features is controlled by user roles (ADMIN, CASHIER, WAITER, KITCHEN, etc.) and custom permissions.
- **Context-Driven State**: Global state is managed through specialized contexts for Authentication, Restaurant Data, Staff Data, and UI controls.

## Modules & Dashboards

### 1. Módulo Gestor (Admin Dashboard)
Focused on high-level management and real-time monitoring.
- **Visão Geral (Overview)**: General business metrics and shortcuts.
- **Monitoramento (Monitoring)**: Real-time view of restaurant activity.
- *Note: Menu and QR Table management have been removed from this dashboard.*

### 2. Módulo Varejo (Commerce Dashboard)
Tailored for retail and over-the-counter sales operations.
- **PDV (POS)**: Point of sale interface for quick transactions.
- **Histórico (History)**: Sales history and transaction logs.
- **Rotas (Routes)**: Route management for distribution (Placeholder).
- *Note: Finance and Reports tabs have been removed from this dashboard.*

### 3. Módulo Caixa (Cashier Dashboard)
Dedicated interface for handling payments and orders.
- **PDV**: Order entry and payment processing.
- **Pedidos**: Management of active orders.

### 4. Módulo Garçom (Waiter App)
Mobile-first interface for table service.
- **Mesas**: Table selection and status view.
- **Novo Pedido**: Order taking interface.

### 5. Módulo Cozinha (Kitchen Display System - KDS)
Real-time display for kitchen staff.
- **Pedidos**: View incoming orders, mark as preparing or ready.

### 6. Módulo Estoque (Inventory Dashboard)
Comprehensive inventory management.
- **Items**: Manage ingredients and products.
- **Movimentações**: Track stock in/out.
- **Fornecedores**: Supplier management.

### 7. Módulo Financeiro (Finance Dashboard)
Financial health and reporting.
- **Visão Geral**: Revenue, expenses, and profit.
- **Despesas**: Expense tracking.

### 8. Módulo RH (Staff Dashboard)
Human resources and payroll management.
- **Colaboradores**: Employee profiles and roles.
- **Escalas**: Shift management.
- **Folha de Pagamento**: Payroll calculation and payslip generation.
- **Ponto**: Time clock records.

### 9. Módulo Auditoria (Audit Dashboard) **[NEW]**
System-wide audit logging and tracking.
- **Logs**: View detailed logs of user actions (Create, Update, Delete).
- **Filtros**: Filter by Module, User, Action, and Date.
- **Export**: Print or export audit logs.
- **Integration**: Automatically logs actions from Inventory and HR modules.

### 10. Módulo Cliente (Client App)
Self-service interface for end-customers.
- **Cardápio**: Browse menu and place orders.

### 11. Super Admin (SaaS Dashboard)
Platform administration.
- **Tenants**: Manage subscribed restaurants.
- **Plans**: Manage subscription plans and limits.

## Key Features
- **Audit Logging**: Centralized logging of critical system actions for security and accountability.
- **Payroll Management**: Automated calculations for salaries, overtime, and benefits.
- **Inventory Tracking**: Real-time stock updates based on sales.
- **Responsive Design**: Interfaces adapted for Desktop (Admin), Tablet (POS), and Mobile (Waiter).

## Recent Updates
- **Audit Module**: Implemented a dedicated Audit module to track system changes.
- **Dashboard Cleanup**:
    - Removed "Cardápio" and "Mesas QR" from the Admin Dashboard.
    - Removed "Financeiro" and "Relatórios" from the Commerce Dashboard.
- **HR Enhancements**: Added logic to limit salary advances to 40% of base salary.
