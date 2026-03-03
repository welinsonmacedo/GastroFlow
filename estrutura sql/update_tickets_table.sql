-- Script para adicionar colunas faltantes na tabela tickets

BEGIN;

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS tenant_name TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS description TEXT;

COMMIT;
