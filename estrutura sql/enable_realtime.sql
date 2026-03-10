-- Script para habilitar o Realtime (WebSockets) no Supabase para todas as tabelas do sistema ArloFlux

BEGIN;

-- Adiciona todas as tabelas utilizadas pelos contextos React à publicação do Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE 
    tenants,
    products,
    staff,
    rh_shifts,
    rh_time_entries,
    rh_taxes,
    rh_benefits,
    rh_payroll_settings,
    rh_inss_brackets,
    rh_irrf_brackets,
    plans,
    system_settings,
    saas_config,
    orders,
    order_items,
    service_calls,
    restaurant_tables,
    inventory_items,
    inventory_logs,
    inventory_recipes,
    suppliers,
    transactions,
    expenses,
    cash_movements,
    cash_sessions,
    tickets,
    security_incidents;

COMMIT;
