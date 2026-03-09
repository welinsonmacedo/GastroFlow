import { supabase } from './supabaseClient';
import { logger } from '../logger/logger';

export const apiClient = {
  async get(endpoint: string, params?: Record<string, any>) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const url = new URL(endpoint, window.location.origin);
      if (params) {
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        }
      });

      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      logger.error(`GET ${endpoint} failed`, error);
      throw error;
    }
  },

  async post(endpoint: string, body: any) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      logger.error(`POST ${endpoint} failed`, error);
      throw error;
    }
  }
};
