import { AppRole, UserPermissions } from './roleTypes';

const rolePermissions: Record<AppRole, UserPermissions> = {
  SUPER_ADMIN: { canCreateOrder: true, canVoidOrder: true, canProcessPayment: true, canManageInventory: true, canManageStaff: true },
  ADMIN: { canCreateOrder: true, canVoidOrder: true, canProcessPayment: true, canManageInventory: true, canManageStaff: true },
  MANAGER: { canCreateOrder: true, canVoidOrder: true, canProcessPayment: true, canManageInventory: true, canManageStaff: true },
  WAITER: { canCreateOrder: true, canVoidOrder: false, canProcessPayment: false, canManageInventory: false, canManageStaff: false },
  CASHIER: { canCreateOrder: true, canVoidOrder: true, canProcessPayment: true, canManageInventory: false, canManageStaff: false },
  KITCHEN: { canCreateOrder: false, canVoidOrder: false, canProcessPayment: false, canManageInventory: true, canManageStaff: false },
};

export const getPermissionsForRole = (role: AppRole): UserPermissions => {
  return rolePermissions[role];
};

export const hasPermission = (role: AppRole, permission: keyof UserPermissions): boolean => {
  return rolePermissions[role][permission];
};
