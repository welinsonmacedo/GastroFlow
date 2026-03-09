import { AppRole } from './roleTypes';

const roleHierarchy: Record<AppRole, number> = {
  'SUPER_ADMIN': 100,
  'ADMIN': 50,
  'MANAGER': 40,
  'CASHIER': 30,
  'KITCHEN': 20,
  'WAITER': 10,
};

export const hasPermission = (userRole: AppRole | undefined | null, requiredRole: AppRole): boolean => {
  if (!userRole) return false;
  
  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
};

export const canAccessModule = (userRole: AppRole | undefined | null, module: 'FINANCE' | 'KITCHEN' | 'ORDERS' | 'SETTINGS'): boolean => {
  if (!userRole) return false;
  if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') return true;

  switch (module) {
    case 'FINANCE':
      return userRole === 'MANAGER' || userRole === 'CASHIER';
    case 'KITCHEN':
      return userRole === 'KITCHEN' || userRole === 'MANAGER';
    case 'ORDERS':
      return userRole === 'WAITER' || userRole === 'MANAGER' || userRole === 'CASHIER';
    case 'SETTINGS':
      return userRole === 'MANAGER';
    default:
      return false;
  }
};
