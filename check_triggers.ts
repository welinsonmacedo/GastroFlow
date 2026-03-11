import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...rest] = line.split('=');
  const value = rest.join('=');
  if (key && value) acc[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
  return acc;
}, {} as Record<string, string>);

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT trigger_name, event_manipulation, event_object_table, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'purchase_orders';
    `
  });
  console.log(JSON.stringify({ data, error }, null, 2));
}

run();
