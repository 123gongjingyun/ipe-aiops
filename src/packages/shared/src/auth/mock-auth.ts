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
  'zhou.ning',
  '周宁',
  'zhou.ning@getpre.cn',
  'applicant',
  '申请人',
  [...PORTAL_ALL_MENUS],
  [...PORTAL_APPLICANT_ACTIONS]
);

/** 系统管理员 */
export const MOCK_USER_PLATFORM_ADMIN: AuthUser = buildUser(
  'user-platform-admin-1',
  'chen.sy',
  '陈思远',
  'chen.sy@getpre.cn',
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

/** 交付担当 */
export const MOCK_USER_DELIVERY: AuthUser = buildUser(
  'user-delivery-1',
  'wang.qh',
  '王启航',
  'wang.qh@getpre.cn',
  'delivery-engineer',
  '交付担当',
  [
    'menu.portal.home',
    'menu.portal.catalog',
    'menu.portal.orders',
    'menu.portal.help',
    'menu.center.dashboard',
    'menu.center.orders',
    'menu.center.service-catalog',
    'menu.center.matrix',
    'menu.center.service-ledger',
    'menu.center.ops-integration',
    'menu.center.help',
  ],
  ['action.center.order.approve', 'action.center.catalog.manage']
);

/** 审批人 */
export const MOCK_USER_REVIEWER: AuthUser = buildUser(
  'user-reviewer-1',
  'zhao.sq',
  '赵思齐',
  'zhao.sq@getpre.cn',
  'reviewer',
  '审批人',
  [
    'menu.portal.home',
    'menu.portal.orders',
    'menu.portal.help',
    'menu.center.dashboard',
    'menu.center.orders',
    'menu.center.service-catalog',
    'menu.center.matrix',
    'menu.center.help',
  ],
  [...CENTER_ORDER_ACTIONS]
);

/** 运维人员 */
export const MOCK_USER_OPS: AuthUser = buildUser(
  'user-ops-1',
  'sun.ht',
  '孙海涛',
  'sun.ht@getpre.cn',
  'ops',
  '运维人员',
  [
    'menu.portal.home',
    'menu.portal.orders',
    'menu.portal.help',
    'menu.center.dashboard',
    'menu.center.orders',
    'menu.center.service-ledger',
    'menu.center.ops-integration',
    'menu.center.help',
  ],
  ['action.center.order.approve']
);

/** 安全管理员 */
export const MOCK_USER_SECURITY_ADMIN: AuthUser = buildUser(
  'user-security-1',
  'gao.lan',
  '高岚',
  'gao.lan@getpre.cn',
  'security-admin',
  '安全管理员',
  [
    'menu.portal.home',
    'menu.portal.orders',
    'menu.portal.help',
    'menu.center.dashboard',
    'menu.center.orders',
    'menu.center.ops-integration',
    'menu.center.help',
  ],
  ['action.center.order.approve', 'action.center.order.reject']
);

/** 全部 mock 用户列表 */
export const MOCK_USERS: AuthUser[] = [
  MOCK_USER_APPLICANT,
  MOCK_USER_PLATFORM_ADMIN,
  MOCK_USER_DELIVERY,
  MOCK_USER_REVIEWER,
  MOCK_USER_OPS,
  MOCK_USER_SECURITY_ADMIN,
];

/** 按用户名索引的 mock 用户映射 */
export const MOCK_USER_MAP: Record<string, AuthUser> = Object.fromEntries(
  MOCK_USERS.map(user => [user.username, user])
);

/** mock 账号密码映射表，所有演示账号统一密码 */
export const MOCK_CREDENTIALS: Record<string, string> = {
  'zhou.ning': '123456',
  'chen.sy': '123456',
  'wang.qh': '123456',
  'zhao.sq': '123456',
  'sun.ht': '123456',
  'gao.lan': '123456',
};

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
