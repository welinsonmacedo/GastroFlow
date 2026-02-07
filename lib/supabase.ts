import { createClient } from '@supabase/supabase-js';

// ATENÇÃO: Em projetos Vite, utilize import.meta.env diretamente.
// O acesso dinâmico (ex: import.meta.env[key]) pode falhar no build de produção dependendo da configuração.
// Adicionamos um fallback "|| {}" para garantir que o código não quebre se .env for undefined.
const env = (import.meta as any).env || {};

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

// Inicializa o cliente Supabase
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder'
);

// Helper para verificar se o Supabase está configurado corretamente
export const isSupabaseConfigured = () => {
    return !!supabaseUrl && 
           !!supabaseKey && 
           supabaseUrl !== 'https://placeholder.supabase.co';
};