
-- ==============================================================================
-- 17_ENSURE_DELIVERY_CONFIG.SQL
-- Objetivo: Garantir estrutura para configurações de Delivery.
-- As configurações ficam dentro do JSONB 'business_info' na tabela 'tenants'.
-- ==============================================================================

DO $$
BEGIN
    -- 1. Verifica se a coluna business_info existe na tabela tenants
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'business_info') THEN
        ALTER TABLE tenants ADD COLUMN business_info JSONB DEFAULT '{}';
    END IF;
END $$;

-- 2. Inicializa o array de deliverySettings vazio para tenants que ainda não têm
-- Isso evita erros de 'null' ao tentar ler a configuração diretamente via SQL ou API
UPDATE tenants
SET business_info = jsonb_set(
    COALESCE(business_info, '{}'),
    '{deliverySettings}',
    '[]'
)
WHERE business_info -> 'deliverySettings' IS NULL;

-- 3. Recarrega o Schema do Supabase
NOTIFY pgrst, 'reload schema';
