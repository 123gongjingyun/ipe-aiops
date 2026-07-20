import type { AuthUser, RoleKey } from './auth-types';
import { MOCK_USERS } from './mock-auth';
import type { PermissionMatrix, RolePermissionMatrixEntry } from './permission-matrix-types';

/** 根据 mock 用户构建默认权限矩阵 */
export function buildDefaultPermissionMatrix(): PermissionMatrix {
  const entries: RolePermissionMatrixEntry[] = MOCK_USERS.map(user => ({
    roleKey: user.roleKeys[0],
    roleLabel: user.roleLabels[0],
    menuKeys: [...user.effectiveMenuKeys],
    actionKeys: [...user.effectiveActionKeys],
  }));

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries,
  };
}

/** 根据角色 key 列表和权限矩阵，计算最终生效的菜单/动作权限 */
export function buildEffectivePermissionsFromMatrix(
  roleKeys: RoleKey[],
  matrix: PermissionMatrix | null
): {
  effectiveMenuKeys: AuthUser['effectiveMenuKeys'];
  effectiveActionKeys: AuthUser['effectiveActionKeys'];
} {
  const menuSet = new Set<AuthUser['effectiveMenuKeys'][number]>();
  const actionSet = new Set<AuthUser['effectiveActionKeys'][number]>();

  const entries = matrix?.entries ?? buildDefaultPermissionMatrix().entries;
  const entryMap = new Map(entries.map(entry => [entry.roleKey, entry]));

  for (const roleKey of roleKeys) {
    const entry = entryMap.get(roleKey);
    if (!entry) continue;
    entry.menuKeys.forEach(key => menuSet.add(key));
    entry.actionKeys.forEach(key => actionSet.add(key));
  }

  return {
    effectiveMenuKeys: Array.from(menuSet),
    effectiveActionKeys: Array.from(actionSet),
  };
}

/** 用权限矩阵覆盖用户的生效权限 */
export function applyPermissionMatrixToUser(
  user: AuthUser,
  matrix: PermissionMatrix | null
): AuthUser {
  const effective = buildEffectivePermissionsFromMatrix(user.roleKeys, matrix);
  return {
    ...user,
    effectiveMenuKeys: effective.effectiveMenuKeys,
    effectiveActionKeys: effective.effectiveActionKeys,
  };
}
