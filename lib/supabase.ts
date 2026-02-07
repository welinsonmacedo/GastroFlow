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
// Usamos um objeto fallback vazio para garantir que o acesso não quebre em runtimes incompatíveis
const env: any = import.meta.env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// Se as variáveis não estiverem definidas, cria um cliente com valores placeholder
// para evitar crash imediato, mas isSupabaseConfigured() retornará false.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);