ALTER TABLE public.table_sessions
  DROP CONSTRAINT IF EXISTS table_sessions_table_id_fkey,
  ADD CONSTRAINT table_sessions_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.restaurant_tables (id) ON DELETE CASCADE;
