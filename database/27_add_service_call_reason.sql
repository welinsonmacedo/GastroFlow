
-- ==============================================================================
-- 27_ADD_SERVICE_CALL_REASON.SQL
-- Objetivo: Adicionar motivo ao chamado do garçom (ex: "Pedir Conta - Pix")
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_calls' AND column_name = 'reason') THEN
        ALTER TABLE service_calls ADD COLUMN reason TEXT;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
