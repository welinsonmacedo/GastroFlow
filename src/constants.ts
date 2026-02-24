
export const PERMISSIONS_SCHEMA = {
    RESTAURANT: {
        label: "Restaurante",
        features: [
            { key: "rest_tables", label: "Salão & Mesas (Garçom)" },
            { key: "rest_kds", label: "Cozinha (KDS)" },
            { key: "rest_orders", label: "Caixa & Delivery" },
            { key: "rest_tv", label: "Painel TV" },
            { key: "rest_tables_config", label: "Cadastro de Mesas" },
            { key: "rest_menu", label: "Gestão de Cardápio" },
            { key: "rest_appearance", label: "Aparência do Cardápio" }
        ]
    },
    SNACKBAR: {
        label: "Lanchonete",
        features: [
            { key: "snack_pos", label: "Caixa Rápido" },
            { key: "snack_kds", label: "KDS Lanchonete" },
            { key: "snack_delivery", label: "Gestão de Entregas" },
            { key: "snack_menu", label: "Cardápio Lanchonete" }
        ]
    },
    COMMERCE: {
        label: "Comércio / Varejo",
        features: [
            { key: "pos_terminal", label: "PDV (Caixa Rápido)" },
            { key: "pos_sales", label: "Histórico de Vendas" },
            { key: "pos_routes", label: "Gestão de Rotas" }
        ]
    },
    DISTRIBUTOR: {
        label: "Distribuidora",
        features: [
            { key: "dist_sales", label: "Vendas Atacado" },
            { key: "dist_inventory", label: "Estoque de Grade" },
            { key: "dist_routes", label: "Logística & Rotas" }
        ]
    },
    INVENTORY: {
        label: "Estoque",
        features: [
            { key: "inv_items", label: "Gestão de Itens" },
            { key: "inv_new_item", label: "Cadastrar Itens" },
            { key: "inv_entry", label: "Entrada de Nota" },
            { key: "inv_count", label: "Balanço de Estoque" },
            { key: "inv_purchases", label: "Sugestões de Compra" },
            { key: "inv_suppliers", label: "Fornecedores" },
            { key: "inv_orders", label: "Ordens de Pedido" }
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
            { key: "fin_cashier", label: "Fluxo de Caixa" },
            { key: "fin_dre", label: "DRE Gerencial" },
            { key: "fin_bi", label: "Business Intelligence" },
            { key: "fin_reports", label: "Relatórios Financeiros" },
            { key: "fin_tips", label: "Dicas & Insights" }
        ]
    },
    MANAGER: {
        label: "Gestor",
        features: [
            { key: "admin_overview", label: "Visão Geral" },
            { key: "admin_monitoring", label: "Monitoramento" },
            { key: "admin_products", label: "Gestão de Produtos" },
            { key: "admin_tables", label: "Gestão de Mesas" }
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
            { key: "config_timeclock", label: "Ponto Eletrônico" },
            { key: "config_appearance", label: "Aparência & Marca" },
            { key: "config_staff", label: "Equipe & Acessos" }
        ]
    },
    AUDIT: {
        label: "Auditoria",
        features: [
            { key: "audit_view", label: "Visualizar Logs" },
            { key: "audit_export", label: "Exportar/Imprimir" }
        ]
    },
    SUPPORT: {
        label: "Suporte & Ajuda",
        features: [
            { key: "supp_chat", label: "Chat com Suporte" },
            { key: "supp_manual", label: "Manual do Sistema" }
        ]
    },
    TIMECLOCK: {
        label: "Ponto Eletrônico",
        features: [
            { key: "clock_register", label: "Registro de Ponto" },
            { key: "clock_history", label: "Meu Histórico" }
        ]
    }
};
