/**
 * NER-LIFELINE Role-Based Access Control (RBAC) Matrix
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Strict role boundaries ensuring that no operational role
 * can access or view workspaces belonging to other roles.
 */

export const ROLES = {
  ADMIN: 'admin',
  LOGISTICS_MANAGER: 'logistics_manager',
  FIELD_OFFICER: 'field_officer',
  DRIVER: 'driver',
};

export const ROLE_CONFIG = {
  [ROLES.ADMIN]: {
    id: ROLES.ADMIN,
    name: 'Administrator',
    label: 'State Command Administrator',
    badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-700',
    iconColor: 'text-purple-400',
    defaultRoute: '/admin-dashboard',
    allowedRoutes: [
      '/admin-dashboard',
      '/live-map',
      '/vehicles',
      '/shipments',
      '/incidents',
      '/risk-analysis',
      '/mesh',
      '/alerts',
      '/analytics',
      '/ai-assistant',
      '/settings',
    ],
    // Dedicated cockpits belonging strictly to their operational actors
    forbiddenRoutes: [
      '/manager-dashboard',
      '/driver-dashboard',
      '/field-officer',
    ],
  },
  [ROLES.LOGISTICS_MANAGER]: {
    id: ROLES.LOGISTICS_MANAGER,
    name: 'Logistics Manager',
    label: 'Logistics Operations Manager',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-700',
    iconColor: 'text-amber-400',
    defaultRoute: '/manager-dashboard',
    allowedRoutes: [
      '/manager-dashboard',
      '/shipments',
      '/vehicles',
      '/live-map',
      '/analytics',
      '/alerts',
      '/ai-assistant',
    ],
    forbiddenRoutes: [
      '/admin-dashboard',
      '/driver-dashboard',
      '/field-officer',
      '/incidents',
      '/risk-analysis',
      '/mesh',
      '/settings',
    ],
  },
  [ROLES.FIELD_OFFICER]: {
    id: ROLES.FIELD_OFFICER,
    name: 'Field Officer',
    label: 'Field Operations & Hazard Officer',
    badgeClass: 'bg-blue-950/80 text-blue-300 border-blue-700',
    iconColor: 'text-blue-400',
    defaultRoute: '/field-officer',
    allowedRoutes: [
      '/field-officer',
      '/incidents',
      '/risk-analysis',
      '/live-map',
      '/alerts',
      '/ai-assistant',
    ],
    forbiddenRoutes: [
      '/admin-dashboard',
      '/manager-dashboard',
      '/driver-dashboard',
      '/shipments',
      '/vehicles',
      '/mesh',
      '/analytics',
      '/settings',
    ],
  },
  [ROLES.DRIVER]: {
    id: ROLES.DRIVER,
    name: 'Driver',
    label: 'Emergency Fleet Driver',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-700',
    iconColor: 'text-emerald-400',
    defaultRoute: '/driver-dashboard',
    allowedRoutes: [
      '/driver-dashboard',
      '/live-map',
      '/alerts',
      '/ai-assistant',
    ],
    forbiddenRoutes: [
      '/admin-dashboard',
      '/manager-dashboard',
      '/field-officer',
      '/shipments',
      '/vehicles',
      '/incidents',
      '/risk-analysis',
      '/mesh',
      '/analytics',
      '/settings',
    ],
  },
};

/**
 * Validates if a role is permitted to access a given pathname
 */
export function isRouteAllowedForRole(role, pathname) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG[ROLES.ADMIN];
  // Check explicit forbidden list first
  const isForbidden = config.forbiddenRoutes.some(p => pathname === p || pathname.startsWith(p + '/'));
  if (isForbidden) return false;

  // Check allowed list
  return config.allowedRoutes.some(p => pathname === p || pathname.startsWith(p + '/'));
}

/**
 * Returns default home route for a role
 */
export function getDefaultRouteForRole(role) {
  return ROLE_CONFIG[role]?.defaultRoute || '/admin-dashboard';
}

/**
 * Returns friendly role name
 */
export function getRoleDisplayName(role) {
  return ROLE_CONFIG[role]?.name || 'Authorized Personnel';
}
