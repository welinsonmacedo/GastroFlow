
-- ==============================================================================
-- 23_ADD_ALLOWED_FEATURES.SQL
-- Objetivo: Permitir controle granular de abas dentro dos módulos.
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'allowed_features') THEN
        ALTER TABLE tenants ADD COLUMN allowed_features TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- Opcional: Popular com todas as features para tenants existentes para não bloquear acesso imediato
-- (Comentado por segurança, descomente se quiser migrar automaticamente)
-- UPDATE tenants 
-- SET allowed_features = '{restaurant_waiter,restaurant_kds,restaurant_cashier,commerce_pos,commerce_inventory,commerce_finance,commerce_reports,admin_overview,admin_products,admin_tables,admin_inventory,finance_expenses,finance_dre,finance_bi,finance_reports,finance_tips,config_general,config_appearance,config_staff}' 
-- WHERE allowed_features IS NULL OR allowed_features = '{}';

NOTIFY pgrst, 'reload schema';
