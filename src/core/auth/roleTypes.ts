export type AppRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'WAITER' | 'KITCHEN' | 'CASHIER';

export const ROLES: Record<string, AppRole> = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  WAITER: 'WAITER',
  KITCHEN: 'KITCHEN',
  CASHIER: 'CASHIER',
};
