export const environment = {
  supabaseUrl: (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : process.env.VITE_SUPABASE_URL) || process.env.SUPABASE_URL || '',
  supabaseAnonKey: (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : process.env.VITE_SUPABASE_ANON_KEY) || process.env.SUPABASE_ANON_KEY || '',
  isProduction: (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.PROD : process.env.NODE_ENV === 'production') || false,
  appUrl: (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_APP_URL : process.env.VITE_APP_URL) || (typeof window !== 'undefined' ? window.location.origin : ''),
  geminiApiKey: (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_KEY : process.env.VITE_API_KEY) || process.env.API_KEY || '',
};

export const isSupabaseConfigured = () => {
  return Boolean(
    environment.supabaseUrl && 
    environment.supabaseAnonKey && 
    !environment.supabaseUrl.includes('Sua_Url')
  );
};
