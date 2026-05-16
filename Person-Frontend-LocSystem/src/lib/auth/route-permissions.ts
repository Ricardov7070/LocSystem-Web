export type AppRole = 'ADMIN' | 'OPERATOR' | 'AUDITOR' | 'OLHEIRO' | 'LINKED_USER' | 'LINKEDUSER';

const roleAliases: Record<string, 'ADMIN' | 'OPERATOR' | 'AUDITOR'> = {
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  AUDITOR: 'AUDITOR',
  OLHEIRO: 'OPERATOR',
  LINKED_USER: 'AUDITOR',
  LINKEDUSER: 'AUDITOR',
};

export const routePermissions: Record<string, Array<'ADMIN' | 'OPERATOR' | 'AUDITOR'>> = {
  '/': ['ADMIN', 'OPERATOR', 'AUDITOR'],
  '/dashboard': ['ADMIN', 'OPERATOR', 'AUDITOR'],
  '/profile': ['ADMIN', 'OPERATOR', 'AUDITOR'],
  '/vehicles': ['ADMIN', 'OPERATOR', 'AUDITOR'],
  '/vehicles/imports': ['ADMIN', 'OPERATOR', 'AUDITOR'],
  '/wallets': ['ADMIN'],
  '/legal-advisories': ['ADMIN'],
  '/counties': ['OPERATOR'],
  '/search-by-county': ['ADMIN', 'AUDITOR'],
  '/users/operators': ['ADMIN'],
  '/users/advisory-users': ['ADMIN'],
  '/users/my-deputies': ['OPERATOR'],
  '/pricing': ['ADMIN'],
  '/incidences': ['ADMIN', 'OPERATOR', 'AUDITOR'],
  '/incidences-retroactive': ['ADMIN', 'OPERATOR', 'AUDITOR'],
  '/vehicle-announcements': ['ADMIN'],
  '/sessions': ['ADMIN'],
  '/banidos': ['ADMIN'],
  '/logs': ['ADMIN'],
};

export function normalizeRole(role?: string): 'ADMIN' | 'OPERATOR' | 'AUDITOR' | undefined {
  const cleaned = role?.trim().toUpperCase();
  if (!cleaned) return undefined;
  return roleAliases[cleaned];
}

export function hasRouteAccessByRole(route: string, userRole?: string): boolean {
  const normalizedRole = normalizeRole(userRole);
  if (!normalizedRole) {
    return false;
  }

  let allowedRoles = routePermissions[route];

  if (!allowedRoles) {
    const parentRoute = route.split('/').slice(0, -1).join('/');
    allowedRoles = routePermissions[parentRoute];
  }

  if (!allowedRoles) {
    return normalizedRole === 'ADMIN';
  }

  return allowedRoles.includes(normalizedRole);
}