import { RestaurantTheme } from './types';

export const DEFAULT_THEME: RestaurantTheme = {
  primaryColor: '#2563eb', // Blue-600
  backgroundColor: '#f3f4f6', // Gray-100
  fontColor: '#1f2937', // Gray-800
  logoUrl: '',
  restaurantName: 'GastroFlow'
};

// Dados Mockados foram removidos para garantir que o sistema utilize apenas o Supabase.
// Qualquer tentativa de uso de dados estáticos resultará em erro, forçando a integração correta.
