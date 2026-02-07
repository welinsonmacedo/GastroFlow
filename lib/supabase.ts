import { createClient } from '@supabase/supabase-js';

// Declaração de tipos para TypeScript reconhecer as variáveis do Vite
declare global {
  interface ImportMeta {
    env: {
      VITE_SUPABASE_URL: string;
      VITE_SUPABASE_ANON_KEY: string;
      [key: string]: any;
    };
  }
}

// Verifica se import.meta.env existe antes de acessar propriedades.
// O uso de '&&' permite curto-circuito se env for undefined no runtime.
// Mantemos a string completa 'import.meta.env.VITE_...' para que o Vite possa fazer o replace estático no build.
const supabaseUrl = (import.meta.env && import.meta.env.VITE_SUPABASE_URL) || '';
const supabaseAnonKey = (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || '';

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// Se as variáveis não estiverem definidas, cria um cliente com valores placeholder
// para evitar crash imediato, mas isSupabaseConfigured() retornará false.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
