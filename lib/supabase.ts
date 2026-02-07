import { createClient } from '@supabase/supabase-js';

// Access environment variables safely handling the missing type definitions for import.meta.env
// We cast to any to avoid "Property 'env' does not exist on type 'ImportMeta'" errors if types are missing.
const env = (import.meta as any).env || {};

// ATENÇÃO: Em projetos Vite, utilize import.meta.env.
// O process.env não existe no navegador e causará erro na Vercel.
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || '';

// Inicializa o cliente Supabase
// Se as URLs estiverem vazias, usa valores placeholder para não quebrar o createClient na inicialização.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder'
);

// Helper para verificar se o Supabase está configurado corretamente
export const isSupabaseConfigured = () => {
    return supabaseUrl.length > 0 && 
           supabaseKey.length > 0 && 
           supabaseUrl !== 'https://placeholder.supabase.co';
};