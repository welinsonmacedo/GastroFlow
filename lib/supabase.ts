import { createClient } from '@supabase/supabase-js';

// Access environment variables safely to avoid "Cannot read properties of undefined"
// This handles cases where import.meta.env might be undefined in certain environments
const env = (import.meta as any).env || {};

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// If not configured, we create a client with dummy values to prevent runtime crashes on import.
// The app logic should rely on isSupabaseConfigured() to decide whether to make calls.
// We use a valid URL format to satisfy the constructor validation.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
