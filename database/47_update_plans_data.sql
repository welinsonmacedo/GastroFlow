-- 47_update_plans_data.sql
-- Objetivo: Atualizar ou Inserir planos padrão com os limites e módulos corretos.

-- 1. Plano FREE (Básico)
INSERT INTO plans (key, name, price, period, features, limits, is_popular, button_text)
VALUES (
    'FREE', 
    'Plano Gratuito', 
    'R$ 0,00', 
    '/mês', 
    ARRAY['Gestão de Mesas', 'Cardápio Digital', 'Até 2 Garçons'],
    '{
        "maxTables": 10,
        "maxStaff": 2,
        "allowKds": false,
        "allowCashier": true,
        "allowReports": false,
        "allowInventory": false,
        "allowPurchases": false,
        "allowExpenses": false,
        "allowStaff": true,
        "allowTableMgmt": true,
        "allowCustomization": false,
        "allowHR": false,
        "allowedModules": ["RESTAURANT"],
        "allowedFeatures": ["restaurant_waiter", "restaurant_cashier", "admin_products", "admin_tables"]
    }'::jsonb,
    false,
    'Começar Grátis'
)
ON CONFLICT (key) DO UPDATE SET
    limits = EXCLUDED.limits,
    features = EXCLUDED.features;

-- 2. Plano STARTER (Intermediário)
INSERT INTO plans (key, name, price, period, features, limits, is_popular, button_text)
VALUES (
    'STARTER', 
    'Plano Inicial', 
    'R$ 99,00', 
    '/mês', 
    ARRAY['KDS (Cozinha)', 'Frente de Caixa', 'Estoque Básico', 'Até 5 Garçons'],
    '{
        "maxTables": 30,
        "maxStaff": 5,
        "allowKds": true,
        "allowCashier": true,
        "allowReports": true,
        "allowInventory": true,
        "allowPurchases": false,
        "allowExpenses": true,
        "allowStaff": true,
        "allowTableMgmt": true,
        "allowCustomization": true,
        "allowHR": false,
        "allowedModules": ["RESTAURANT", "SNACKBAR", "INVENTORY", "FINANCE", "MANAGER", "CONFIG"],
        "allowedFeatures": [
            "restaurant_waiter", "restaurant_kds", "restaurant_cashier",
            "snackbar_pos", "snackbar_kds",
            "inventory_manage",
            "finance_expenses", "finance_reports",
            "admin_overview", "admin_products", "admin_tables",
            "config_business", "config_operations"
        ]
    }'::jsonb,
    true,
    'Assinar Starter'
)
ON CONFLICT (key) DO UPDATE SET
    limits = EXCLUDED.limits,
    features = EXCLUDED.features;

-- 3. Plano PRO (Completo)
INSERT INTO plans (key, name, price, period, features, limits, is_popular, button_text)
VALUES (
    'PRO', 
    'Plano Profissional', 
    'R$ 199,00', 
    '/mês', 
    ARRAY['Tudo Ilimitado', 'RH & Ponto', 'Múltiplos Estoques', 'BI Financeiro'],
    '{
        "maxTables": -1,
        "maxStaff": -1,
        "allowKds": true,
        "allowCashier": true,
        "allowReports": true,
        "allowInventory": true,
        "allowPurchases": true,
        "allowExpenses": true,
        "allowStaff": true,
        "allowTableMgmt": true,
        "allowCustomization": true,
        "allowHR": true,
        "allowedModules": ["RESTAURANT", "SNACKBAR", "DISTRIBUTOR", "COMMERCE", "INVENTORY", "HR", "MANAGER", "FINANCE", "CONFIG"],
        "allowedFeatures": [
            "restaurant_waiter", "restaurant_kds", "restaurant_cashier",
            "snackbar_pos", "snackbar_kds", "snackbar_call_panel",
            "distributor_sales", "distributor_routes", "distributor_inventory",
            "commerce_pos", "commerce_finance", "commerce_reports",
            "inventory_manage", "inventory_purchases", "inventory_suppliers",
            "rh_staff_list", "rh_attendance", "rh_schedules", "rh_payroll",
            "admin_overview", "admin_products", "admin_tables",
            "finance_expenses", "finance_dre", "finance_bi", "finance_reports", "finance_tips",
            "config_business", "config_operations", "config_delivery", "config_finance_settings", "config_security", "config_appearance", "config_staff"
        ]
    }'::jsonb,
    false,
    'Assinar PRO'
)
ON CONFLICT (key) DO UPDATE SET
    limits = EXCLUDED.limits,
    features = EXCLUDED.features;
