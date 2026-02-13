
import { RestaurantTheme } from './types';

export const DEFAULT_THEME: RestaurantTheme = {
  primaryColor: '#22c55e', // Green-500 (Flux Eat Brand)
  backgroundColor: '#f3f4f6', // Gray-100
  fontColor: '#1f2937', // Gray-800
  logoUrl: '',
  restaurantName: 'Flux Eat'
};

// Dados Mockados foram removidos para garantir que o sistema utilize apenas o Supabase.
// Qualquer tentativa de uso de dados estáticos resultará em erro, forçando a integração correta.
