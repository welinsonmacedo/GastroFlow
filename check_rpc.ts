import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('close_table', {
    p_tenant_id: '00000000-0000-0000-0000-000000000000',
    p_table_id: '00000000-0000-0000-0000-000000000000'
  });
  console.log('Test close_table:', { data, error });
}

run();
