/**
 * Human-readable role for UI (sidebar, profile). Keeps raw role in API/localStorage.
 */
export function formatRoleLabel(role: string | undefined | null): string {
  const r = (role || '').toLowerCase().trim();
  if (r === 'platform_admin' || r === 'super_owner') return 'Admin';
  if (!r) return 'Staff';
  return r
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
