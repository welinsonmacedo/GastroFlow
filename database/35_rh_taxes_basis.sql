
-- ==============================================================================
-- 35_RH_TAXES_BASIS.SQL
-- Objetivo: Definir se o imposto incide sobre o Salário Base (ex: VT) ou Bruto (ex: INSS/FGTS).
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_taxes' AND column_name = 'calculation_basis') THEN
        ALTER TABLE rh_taxes ADD COLUMN calculation_basis TEXT DEFAULT 'GROSS_TOTAL' CHECK (calculation_basis IN ('GROSS_TOTAL', 'BASE_SALARY'));
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
