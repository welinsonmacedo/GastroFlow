
-- ==============================================================================
-- 31_RH_EXTENDED_FIELDS.SQL
-- Objetivo: Expandir tabela staff com dados completos de RH (CTPS, Endereço, Banco).
-- ==============================================================================

-- Dados Pessoais Estendidos
ALTER TABLE staff ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS mothers_name TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS fathers_name TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS marital_status TEXT; -- Solteiro, Casado, etc.
ALTER TABLE staff ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS education_level TEXT;

-- Documentação
ALTER TABLE staff ADD COLUMN IF NOT EXISTS rg_number TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS rg_issuer TEXT; -- Órgão Emissor
ALTER TABLE staff ADD COLUMN IF NOT EXISTS rg_state TEXT;   -- UF do RG
ALTER TABLE staff ADD COLUMN IF NOT EXISTS ctps_number TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS ctps_series TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS ctps_state TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS pis_pasep TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS voter_registration TEXT; -- Título de Eleitor

-- Endereço
ALTER TABLE staff ADD COLUMN IF NOT EXISTS address_zip TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS address_number TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS address_neighborhood TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS address_state TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS address_complement TEXT;

-- Dados Bancários (Para Pagamento)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bank_agency TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bank_account_type TEXT; -- Corrente, Poupança
ALTER TABLE staff ADD COLUMN IF NOT EXISTS pix_key TEXT;

NOTIFY pgrst, 'reload schema';
