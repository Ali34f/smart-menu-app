/**
 * Effective menu/ingredient permissions for API checks and client responses.
 * Staff: can edit existing items but cannot create or delete.
 */
exports.getEffectivePermissions = (user) => {
  if (!user) return {};
  const role = String(user.role || '')
    .toLowerCase()
    .trim();
  const raw =
    user.permissions && typeof user.permissions.toObject === 'function'
      ? user.permissions.toObject()
      : { ...(user.permissions || {}) };
  const p = { ...raw };
  if (role === 'staff') {
    return {
      ...p,
      canManageMenu: false,
      canManageIngredients: false,
      canEditMenu: true,
      canEditIngredients: true,
    };
  }
  // Owner / manager: always allowed to edit menu & ingredients. Create/delete still use canManage* flags.
  if (role === 'owner' || role === 'manager') {
    if (p.canManageMenu == null) p.canManageMenu = true;
    if (p.canManageIngredients == null) p.canManageIngredients = true;
    p.canEditMenu = true;
    p.canEditIngredients = true;
  }
  // Workspace operators switching restaurants always need edit access; DB flags may be unset/false on legacy accounts.
  if (role === 'platform_admin' || role === 'super_owner') {
    p.canEditMenu = true;
    p.canEditIngredients = true;
    if (p.canManageMenu !== false) p.canManageMenu = true;
    if (p.canManageIngredients !== false) p.canManageIngredients = true;
  }
  if (p.canManageMenu) p.canEditMenu = true;
  if (p.canManageIngredients) p.canEditIngredients = true;
  return p;
};
