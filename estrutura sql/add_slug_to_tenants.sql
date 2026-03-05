-- Adiciona a coluna slug à tabela tenants, caso ela não exista
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS slug TEXT;

-- Cria um índice único para o slug para garantir performance e unicidade
CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_key ON public.tenants (slug);
