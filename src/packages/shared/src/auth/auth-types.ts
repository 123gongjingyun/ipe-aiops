/**
 * 统一认证类型定义
 *
 * 与《认证 Mock 数据与接口约定-2026-07-20》保持一致
 * 前端第一阶段先走 mock，第二阶段可平滑切换真实接口。
 */

/** 角色 key，与 src/data/role-definitions.ts 中的角色种子对齐 */
export type RoleKey =
  | 'platform-admin'
  | 'delivery-engineer'
  | 'applicant'
  | 'reviewer'
  | 'ops'
  | 'security-admin';

/** Portal 侧菜单权限 key */
export type PortalMenuKey =
  | 'menu.portal.home'
  | 'menu.portal.common-requests'
  | 'menu.portal.request-records'
  | 'menu.portal.catalog'
  | 'menu.portal.orders'
  | 'menu.portal.help';

/** Center 侧菜单权限 key */
export type CenterMenuKey =
  | 'menu.center.dashboard'
  | 'menu.center.orders'
  | 'menu.center.service-catalog'
  | 'menu.center.matrix'
  | 'menu.center.service-ledger'
  | 'menu.center.ai-knowledge'
  | 'menu.center.ops-integration'
  | 'menu.center.settings'
  | 'menu.center.help';

/** 所有菜单权限 key */
export type MenuPermissionKey = PortalMenuKey | CenterMenuKey;

/** Portal 侧动作权限 key（第一阶段仅收口关键动作） */
export type PortalActionKey =
  | 'action.portal.request.create'
  | 'action.portal.request.edit'
  | 'action.portal.request.export-pdf'
  | 'action.portal.request.export-excel'
  | 'action.portal.request.clone';

/** Center 侧动作权限 key（第一阶段仅收口关键动作） */
export type CenterActionKey =
  | 'action.center.order.approve'
  | 'action.center.order.reject'
  | 'action.center.role.manage'
  | 'action.center.template.manage'
  | 'action.center.catalog.manage';

/** 所有动作权限 key */
export type ActionPermissionKey = PortalActionKey | CenterActionKey;

/** 统一认证用户结构 */
export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  roleKeys: RoleKey[];
  roleLabels: string[];
  effectiveMenuKeys: MenuPermissionKey[];
  effectiveActionKeys: ActionPermissionKey[];
  isActive: boolean;
}

/** 统一会话结构 */
export interface AuthSession {
  accessToken: string;
  currentUser: AuthUser;
  issuedAt: string;
}

/** 登录请求 */
export interface LoginRequest {
  username: string;
  password: string;
}

/** 登录 / 注册 / 登出等认证接口的标准响应 */
export interface AuthApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

/** 登录接口响应数据 */
export interface LoginResponseData {
  accessToken: string;
  currentUser: AuthUser;
}

/** 当前用户信息响应数据 */
export interface MeResponseData {
  currentUser: AuthUser;
}

/** 登录页品牌配置 */
export interface LoginBrandConfig {
  /** 模块名，如「服务门户」「运营中心」 */
  moduleName: string;
  /** 登录页主标题 */
  title: string;
  /** 登录页副标题 */
  subtitle?: string;
  /** 登录成功后默认跳转路径 */
  defaultPath: string;
  /** 当前应用 key，用于区分 portal / center 的默认首页规则 */
  app: 'portal' | 'center';
}
