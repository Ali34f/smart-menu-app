export interface StoredPermissions {
  canManageMenu?: boolean;
  canEditMenu?: boolean;
  canManageIngredients?: boolean;
  canEditIngredients?: boolean;
  canManageAllergens?: boolean;
  canViewReports?: boolean;
  canManageStaff?: boolean;
}

function parsedPermissions(): StoredPermissions | null {
  const raw = localStorage.getItem('userPermissions');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredPermissions;
  } catch {
    return null;
  }
}

/** Owner, manager, platform: create/delete menu items */
export function canCreateOrDeleteMenu(): boolean {
  const p = parsedPermissions();
  if (p && typeof p.canManageMenu === 'boolean') {
    return p.canManageMenu;
  }
  const role = (localStorage.getItem('userRole') || '').toLowerCase();
  return ['owner', 'manager', 'platform_admin', 'super_owner'].includes(role);
}

/** View + edit existing menu items (includes staff) */
export function canEditMenuItems(): boolean {
  const p = parsedPermissions();
  if (p) {
    return !!(p.canEditMenu || p.canManageMenu);
  }
  const role = (localStorage.getItem('userRole') || '').toLowerCase();
  return ['owner', 'manager', 'staff', 'platform_admin', 'super_owner'].includes(role);
}

export function canCreateOrDeleteIngredients(): boolean {
  const p = parsedPermissions();
  if (p && typeof p.canManageIngredients === 'boolean') {
    return p.canManageIngredients;
  }
  const role = (localStorage.getItem('userRole') || '').toLowerCase();
  return ['owner', 'manager', 'platform_admin', 'super_owner'].includes(role);
}

export function canEditIngredients(): boolean {
  const p = parsedPermissions();
  if (p) {
    return !!(p.canEditIngredients || p.canManageIngredients);
  }
  const role = (localStorage.getItem('userRole') || '').toLowerCase();
  return ['owner', 'manager', 'staff', 'platform_admin', 'super_owner'].includes(role);
}
