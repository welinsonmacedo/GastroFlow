import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE public.table_sessions
        DROP CONSTRAINT IF EXISTS table_sessions_table_id_fkey;
      ALTER TABLE public.table_sessions
        ADD CONSTRAINT table_sessions_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.restaurant_tables (id) ON DELETE CASCADE;
    `
  });
  console.log({ data, error });
}

run();
