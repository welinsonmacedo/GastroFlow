
import { supabase } from './lib/supabase';

async function test() {
  const { data, error } = await supabase.from('saas_admins').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Data:', data);
  }
}

test();
