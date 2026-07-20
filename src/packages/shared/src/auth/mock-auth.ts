import type {
  ActionPermissionKey,
  AuthUser,
  CenterActionKey,
  CenterMenuKey,
  MenuPermissionKey,
  PortalActionKey,
  PortalMenuKey,
  RoleKey,
} from './auth-types';

/** 第一阶段 mock 账号密码映射，仅用于本地开发与演示 */
export interface MockCredential {
  username: string;
  password: string;
  user: AuthUser;
}

const PORTAL_APPLICANT_MENUS: PortalMenuKey[] = [
  'menu.portal.common-requests',
  'menu.portal.request-records',
];

const PORTAL_ALL_MENUS: PortalMenuKey[] = [
  'menu.portal.home',
  'menu.portal.common-requests',
  'menu.portal.request-records',
  'menu.portal.catalog',
  'menu.portal.orders',
  'menu.portal.help',
];

const PORTAL_APPLICANT_ACTIONS: PortalActionKey[] = [
  'action.portal.request.create',
  'action.portal.request.edit',
  'action.portal.request.export-pdf',
  'action.portal.request.export-excel',
  'action.portal.request.clone',
];

const CENTER_ALL_MENUS: CenterMenuKey[] = [
  'menu.center.dashboard',
  'menu.center.orders',
  'menu.center.service-catalog',
  'menu.center.matrix',
  'menu.center.service-ledger',
  'menu.center.ai-knowledge',
  'menu.center.ops-integration',
  'menu.center.settings',
  'menu.center.help',
];

const CENTER_ORDER_ACTIONS: CenterActionKey[] = [
  'action.center.order.approve',
  'action.center.order.reject',
];

function buildUser(
  id: string,
  username: string,
  displayName: string,
  email: string,
  roleKey: RoleKey,
  roleLabel: string,
  menus: MenuPermissionKey[],
  actions: ActionPermissionKey[]
): AuthUser {
  return {
    id,
    username,
    displayName,
    email,
    roleKeys: [roleKey],
    roleLabels: [roleLabel],
    effectiveMenuKeys: menus,
    effectiveActionKeys: actions,
    isActive: true,
  };
}

/** 申请人 */
export const MOCK_USER_APPLICANT: AuthUser = buildUser(
  'user-applicant-1',
  'gong.gy',
  '巩工',
  'gong.gy@getpre.cn',
  'applicant',
  '申请人',
  [...PORTAL_APPLICANT_MENUS],
  [...PORTAL_APPLICANT_ACTIONS]
);

/** 系统管理员 */
export const MOCK_USER_PLATFORM_ADMIN: AuthUser = buildUser(
  'user-platform-admin-1',
  'yang.gong',
  '杨工',
  'yang.gong@getpre.cn',
  'platform-admin',
  '系统管理员',
  [...PORTAL_ALL_MENUS, ...CENTER_ALL_MENUS],
  [
    ...PORTAL_APPLICANT_ACTIONS,
    ...CENTER_ORDER_ACTIONS,
    'action.center.role.manage',
    'action.center.template.manage',
    'action.center.catalog.manage',
  ]
);

/** 全部 mock 用户列表 */
export const MOCK_USERS: AuthUser[] = [
  MOCK_USER_APPLICANT,
  MOCK_USER_PLATFORM_ADMIN,
];

/** 按用户名索引的 mock 用户映射 */
export const MOCK_USER_MAP: Record<string, AuthUser> = Object.fromEntries(
  MOCK_USERS.map(user => [user.username, user])
);

/** mock 账号密码映射表，所有演示账号统一密码 */
export const MOCK_CREDENTIALS: Record<string, string> = {
  'gong.gy': '123456',
  'yang.gong': '123456',
};

/** 演示账号快速切换面板数据 */
export interface DemoAccount {
  username: string;
  displayName: string;
  roleLabel: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { username: 'gong.gy', displayName: '巩工', roleLabel: '申请人' },
  { username: 'yang.gong', displayName: '杨工', roleLabel: '系统管理员' },
];

/** 生成 mock accessToken */
export function buildMockAccessToken(username: string): string {
  return `mock-token-${username}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
}

/** 根据用户名密码查找 mock 用户 */
export function findMockUserByCredentials(
  username: string,
  password: string
): AuthUser | null {
  const expectedPassword = MOCK_CREDENTIALS[username];
  if (!expectedPassword || expectedPassword !== password) return null;
  const user = MOCK_USER_MAP[username];
  if (!user || !user.isActive) return null;
  return user;
}

/** 新用户注册时的默认 applicant 权限（仅 Portal 常见资源申请 + 资源申请单） */
export function buildDefaultApplicantUser(
  id: string,
  username: string,
  displayName: string,
  email?: string
): AuthUser {
  return buildUser(
    id,
    username,
    displayName,
    email ?? `${username}@getpre.cn`,
    'applicant',
    '申请人',
    [...PORTAL_APPLICANT_MENUS],
    [...PORTAL_APPLICANT_ACTIONS]
  );
}
