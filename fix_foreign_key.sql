-- Execute este script no SQL Editor do Supabase para corrigir o erro de chave estrangeira

ALTER TABLE public.table_sessions
  DROP CONSTRAINT IF EXISTS table_sessions_table_id_fkey;

ALTER TABLE public.table_sessions
  ADD CONSTRAINT table_sessions_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.restaurant_tables (id) ON DELETE CASCADE;
