export const environment = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  isProduction: import.meta.env.PROD || false,
  appUrl: import.meta.env.VITE_APP_URL || window.location.origin,
  geminiApiKey: import.meta.env.VITE_API_KEY || (typeof process !== 'undefined' ? process.env?.API_KEY : '') || '',
};

export const isSupabaseConfigured = () => {
  return Boolean(
    environment.supabaseUrl && 
    environment.supabaseAnonKey && 
    !environment.supabaseUrl.includes('Sua_Url')
  );
};
