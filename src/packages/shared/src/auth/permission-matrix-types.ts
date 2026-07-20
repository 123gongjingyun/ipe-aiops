import type { ActionPermissionKey, CenterMenuKey, MenuPermissionKey, PortalMenuKey, RoleKey } from './auth-types';

/** 单个角色在权限矩阵中的配置 */
export interface RolePermissionMatrixEntry {
  roleKey: RoleKey;
  roleLabel: string;
  menuKeys: MenuPermissionKey[];
  actionKeys: ActionPermissionKey[];
}

/** 完整权限矩阵 */
export interface PermissionMatrix {
  version: number;
  updatedAt: string;
  entries: RolePermissionMatrixEntry[];
}

/** 权限矩阵变更监听器 */
export type PermissionMatrixSyncListener = () => void;

/** 权限配置项分组（用于可视化页面） */
export interface PermissionGroup {
  key: string;
  label: string;
  items: PermissionItem[];
}

export interface PermissionItem {
  key: MenuPermissionKey | ActionPermissionKey;
  label: string;
  description?: string;
}

/** Portal 菜单权限分组定义 */
export const PORTAL_MENU_PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: 'portal-menus',
    label: 'Portal 菜单',
    items: [
      { key: 'menu.portal.home', label: '资源申请工作台' },
      { key: 'menu.portal.common-requests', label: '常见资源申请' },
      { key: 'menu.portal.request-records', label: '资源申请单' },
      { key: 'menu.portal.catalog', label: '完整服务目录' },
      { key: 'menu.portal.orders', label: '我的工单' },
      { key: 'menu.portal.help', label: '帮助中心' },
    ],
  },
];

/** Center 菜单权限分组定义 */
export const CENTER_MENU_PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: 'center-menus',
    label: 'Center 菜单',
    items: [
      { key: 'menu.center.dashboard', label: '仪表板' },
      { key: 'menu.center.orders', label: '工单管理' },
      { key: 'menu.center.service-catalog', label: '服务目录' },
      { key: 'menu.center.matrix', label: '能力矩阵' },
      { key: 'menu.center.service-ledger', label: '交付资产' },
      { key: 'menu.center.ai-knowledge', label: 'AI知识库' },
      { key: 'menu.center.ops-integration', label: '运维集成中心' },
      { key: 'menu.center.settings', label: '设置' },
      { key: 'menu.center.help', label: '帮助中心' },
    ],
  },
];

/** 动作权限分组定义 */
export const ACTION_PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: 'portal-actions',
    label: 'Portal 动作',
    items: [
      { key: 'action.portal.request.create', label: '创建申请' },
      { key: 'action.portal.request.edit', label: '编辑申请' },
      { key: 'action.portal.request.export-pdf', label: '导出 PDF' },
      { key: 'action.portal.request.export-excel', label: '导出 Excel' },
      { key: 'action.portal.request.clone', label: '复制为新申请' },
    ],
  },
  {
    key: 'center-actions',
    label: 'Center 动作',
    items: [
      { key: 'action.center.order.approve', label: '审批通过' },
      { key: 'action.center.order.reject', label: '审批驳回' },
      { key: 'action.center.role.manage', label: '角色管理' },
      { key: 'action.center.template.manage', label: '模板管理' },
      { key: 'action.center.catalog.manage', label: '目录管理' },
    ],
  },
];

/** 所有权限分组 */
export const ALL_PERMISSION_GROUPS: PermissionGroup[] = [
  ...PORTAL_MENU_PERMISSION_GROUPS,
  ...CENTER_MENU_PERMISSION_GROUPS,
  ...ACTION_PERMISSION_GROUPS,
];

/** 判断 key 是否为菜单权限 */
export function isMenuPermissionKey(key: string): key is MenuPermissionKey {
  return key.startsWith('menu.');
}

/** 判断 key 是否为 Portal 菜单权限 */
export function isPortalMenuPermissionKey(key: string): key is PortalMenuKey {
  return key.startsWith('menu.portal.');
}

/** 判断 key 是否为 Center 菜单权限 */
export function isCenterMenuPermissionKey(key: string): key is CenterMenuKey {
  return key.startsWith('menu.center.');
}
