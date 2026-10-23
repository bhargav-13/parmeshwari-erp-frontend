export type UserRole = 'ROLE_ADMIN' | 'ROLE_OWNER' | 'ROLE_GROUND_FLOOR' | 'ROLE_FIRST_FLOOR';
export type UserFloor = 'GROUND_FLOOR' | 'FIRST_FLOOR';

function decodeJwtPayload(token: string): any {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function getUserRoles(): UserRole[] {
  const token = localStorage.getItem('accessToken');
  if (!token) return [];
  const payload = decodeJwtPayload(token);
  return payload?.roles ?? [];
}

export function isOwner(): boolean {
  return getUserRoles().includes('ROLE_OWNER');
}

export function isAdminOrOwner(): boolean {
  const roles = getUserRoles();
  return roles.includes('ROLE_ADMIN') || roles.includes('ROLE_OWNER');
}

/** The floor a Ground Floor / First Floor user is kept to; null for Admin and Owner. */
export function getUserFloor(): UserFloor | null {
  const roles = getUserRoles();
  if (roles.includes('ROLE_GROUND_FLOOR')) return 'GROUND_FLOOR';
  if (roles.includes('ROLE_FIRST_FLOOR')) return 'FIRST_FLOOR';
  return null;
}

export function getRoleLabel(): string {
  const roles = getUserRoles();
  if (roles.includes('ROLE_OWNER')) return 'Owner';
  if (roles.includes('ROLE_ADMIN')) return 'Admin';
  if (roles.includes('ROLE_GROUND_FLOOR')) return 'Ground Floor';
  if (roles.includes('ROLE_FIRST_FLOOR')) return 'First Floor';
  return 'User';
}

/** Whether the user may pick this floor in a form; floor staff may pick only their own. */
export function canPickFloor(floor: UserFloor): boolean {
  const own = getUserFloor();
  return own === null || own === floor;
}

const FLOOR_PAGES: Record<UserFloor, string> = {
  GROUND_FLOOR: '/ground-floor',
  FIRST_FLOOR: '/first-floor',
};

/**
 * Whether the signed-in user may open a page. The backend enforces the same rules; this only
 * keeps menus and links to what the user can actually use.
 */
export function canOpen(path: string): boolean {
  if (isAdminOrOwner()) return true;
  const floor = getUserFloor();
  if (path.startsWith('/cashflow') || path.startsWith('/settings')) return false;
  if (path.startsWith('/casting')) return floor === 'GROUND_FLOOR';
  // The other floor's Inventory, Orders, Invoices and Payment Reminder pages
  const otherFloor = floor === 'GROUND_FLOOR' ? 'FIRST_FLOOR' : 'GROUND_FLOOR';
  if (floor && path.endsWith(FLOOR_PAGES[otherFloor])) return false;
  return true;
}
