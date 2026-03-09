export type AppRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'WAITER' | 'CASHIER' | 'KITCHEN';

export interface UserPermissions {
  canCreateOrder: boolean;
  canVoidOrder: boolean;
  canProcessPayment: boolean;
  canManageInventory: boolean;
  canManageStaff: boolean;
}
