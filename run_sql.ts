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
  const sql = fs.readFileSync('./estrutura sql/restaurant_rpc_logic.sql', 'utf8');
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: sql
  });
  console.log({ data, error });
}

run();
