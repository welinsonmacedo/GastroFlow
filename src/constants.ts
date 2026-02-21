
export const PERMISSIONS_SCHEMA = {
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
