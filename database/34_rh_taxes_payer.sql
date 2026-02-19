
-- ==============================================================================
-- 34_RH_TAXES_PAYER.SQL
-- Objetivo: Distinguir impostos descontados do salário (EMPLOYEE) e encargos da empresa (EMPLOYER).
-- ==============================================================================

-- 1. Adicionar coluna payer_type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_taxes' AND column_name = 'payer_type') THEN
        ALTER TABLE rh_taxes ADD COLUMN payer_type TEXT DEFAULT 'EMPLOYEE' CHECK (payer_type IN ('EMPLOYEE', 'EMPLOYER'));
    END IF;
END $$;

-- 2. Atualizar políticas RLS (Reaplicar para garantir)
ALTER TABLE rh_taxes ENABLE ROW LEVEL SECURITY;

-- 3. Notificar reload
NOTIFY pgrst, 'reload schema';
