import type {
  ActionPermissionKey,
  AuthUser,
  CenterMenuKey,
  MenuPermissionKey,
  PortalMenuKey,
  RoleKey,
} from './auth-types';

/** 判断用户是否拥有某个菜单权限 */
export function hasMenuAccess(
  user: AuthUser | null | undefined,
  menuKey: MenuPermissionKey
): boolean {
  if (!user || !user.isActive) return false;
  return user.effectiveMenuKeys.includes(menuKey);
}

/** 判断用户是否拥有某个动作权限 */
export function hasActionAccess(
  user: AuthUser | null | undefined,
  actionKey: ActionPermissionKey
): boolean {
  if (!user || !user.isActive) return false;
  return user.effectiveActionKeys.includes(actionKey);
}

/** 判断用户是否拥有任意一个指定权限（菜单或动作均可） */
export function hasAnyPermission(
  user: AuthUser | null | undefined,
  keys: MenuPermissionKey[] | ActionPermissionKey[]
): boolean {
  if (!user || !user.isActive) return false;
  if (keys.length === 0) return true;
  return keys.some(key =>
    (key as MenuPermissionKey).startsWith('menu.')
      ? hasMenuAccess(user, key as MenuPermissionKey)
      : hasActionAccess(user, key as ActionPermissionKey)
  );
}

/** 判断用户是否拥有所有指定权限 */
export function hasAllPermissions(
  user: AuthUser | null | undefined,
  keys: MenuPermissionKey[] | ActionPermissionKey[]
): boolean {
  if (!user || !user.isActive) return false;
  if (keys.length === 0) return true;
  return keys.every(key =>
    (key as MenuPermissionKey).startsWith('menu.')
      ? hasMenuAccess(user, key as MenuPermissionKey)
      : hasActionAccess(user, key as ActionPermissionKey)
  );
}

/** 根据角色 key 列表和角色到菜单/动作的映射，构建最终生效权限 */
export interface RolePermissionMapping {
  menus: MenuPermissionKey[];
  actions: ActionPermissionKey[];
}

export function buildEffectivePermissions(
  roleKeys: RoleKey[],
  roleMap: Record<RoleKey, RolePermissionMapping>
): {
  effectiveMenuKeys: MenuPermissionKey[];
  effectiveActionKeys: ActionPermissionKey[];
} {
  const menuSet = new Set<MenuPermissionKey>();
  const actionSet = new Set<ActionPermissionKey>();

  for (const roleKey of roleKeys) {
    const mapping = roleMap[roleKey];
    if (!mapping) continue;
    mapping.menus.forEach(key => menuSet.add(key));
    mapping.actions.forEach(key => actionSet.add(key));
  }

  return {
    effectiveMenuKeys: Array.from(menuSet),
    effectiveActionKeys: Array.from(actionSet),
  };
}

/** Portal 默认首页判断 */
export function getPortalDefaultPath(user: AuthUser): string {
  if (user.effectiveMenuKeys.includes('menu.portal.home')) return '/';
  if (user.effectiveMenuKeys.includes('menu.portal.orders')) return '/orders';
  if (user.effectiveMenuKeys.includes('menu.portal.common-requests')) return '/common-requests';
  if (user.effectiveMenuKeys.includes('menu.portal.request-records')) return '/request-records';
  if (user.effectiveMenuKeys.includes('menu.portal.catalog')) return '/catalog';
  if (user.effectiveMenuKeys.includes('menu.portal.help')) return '/help';
  return '/';
}

/** Center 默认首页判断 */
export function getCenterDefaultPath(user: AuthUser): string {
  if (hasMenuAccess(user, 'menu.center.dashboard')) return '/';
  if (hasMenuAccess(user, 'menu.center.orders')) return '/orders';
  if (hasMenuAccess(user, 'menu.center.ops-integration')) return '/ops-integration';
  if (hasMenuAccess(user, 'menu.center.service-ledger')) return '/service-ledger';
  if (hasMenuAccess(user, 'menu.center.service-catalog')) return '/service-catalog';
  if (hasMenuAccess(user, 'menu.center.matrix')) return '/matrix';
  if (hasMenuAccess(user, 'menu.center.help')) return '/help';
  return '/';
}

/** 多角色时按优先级选择默认首页（Portal） */
export function getPortalDefaultPathByRoles(roleKeys: RoleKey[]): string {
  const priority: RoleKey[] = [
    'platform-admin',
    'applicant',
    'delivery-engineer',
    'reviewer',
    'ops',
    'security-admin',
  ];
  const topRole = priority.find(role => roleKeys.includes(role));
  switch (topRole) {
    case 'applicant':
      return '/common-requests';
    case 'platform-admin':
      return '/';
    case 'delivery-engineer':
    case 'reviewer':
    case 'ops':
    case 'security-admin':
      return '/orders';
    default:
      return '/';
  }
}

/** 多角色时按优先级选择默认首页（Center） */
export function getCenterDefaultPathByRoles(roleKeys: RoleKey[]): string {
  const priority: RoleKey[] = [
    'platform-admin',
    'delivery-engineer',
    'ops',
    'security-admin',
    'reviewer',
  ];
  const topRole = priority.find(role => roleKeys.includes(role));
  switch (topRole) {
    case 'platform-admin':
      return '/';
    case 'delivery-engineer':
    case 'reviewer':
      return '/orders';
    case 'ops':
    case 'security-admin':
      return '/ops-integration';
    default:
      return '/';
  }
}

/** 类型守卫：判断 key 是否为 Portal 菜单 */
export function isPortalMenuKey(key: MenuPermissionKey): key is PortalMenuKey {
  return key.startsWith('menu.portal.');
}

/** 类型守卫：判断 key 是否为 Center 菜单 */
export function isCenterMenuKey(key: MenuPermissionKey): key is CenterMenuKey {
  return key.startsWith('menu.center.');
}

/** 判断用户是否有任意 Center 菜单权限 */
export function hasCenterAccess(user: AuthUser | null | undefined): boolean {
  if (!user || !user.isActive) return false;
  return user.effectiveMenuKeys.some(key => isCenterMenuKey(key));
}
