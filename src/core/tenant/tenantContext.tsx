import React, { createContext, useContext, useState, useEffect } from 'react';
import { resolveTenantFromUrl } from './tenantResolver';
import { supabase } from '../api/supabaseClient';
import { logger } from '../logger/logger';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  logo_url?: string;
  is_active: boolean;
}

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  isLoading: true,
  error: null,
});

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenant = async () => {
      const slug = resolveTenantFromUrl();
      if (!slug) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('id, slug, name, logo_url, is_active')
          .eq('slug', slug)
          .single();

        if (error) throw error;
        setTenant(data);
      } catch (err: any) {
        logger.error('Erro ao carregar tenant:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenant();
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, isLoading, error }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
