import { RestaurantTheme, User, Product, Table, Order, Transaction, AuditLog } from '../types';

// Arquivo intencionalmente vazio.
// O sistema agora depende 100% do Supabase.
// Dados estáticos foram removidos.

export const getTenantData = (slug: string): any => {
    console.warn("getTenantData (mock) foi chamado, mas o sistema deve usar Supabase.");
    return null;
};
