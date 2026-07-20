import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './auth-context';
import { hasMenuAccess } from './auth-permissions';
import { ForbiddenPage } from './forbidden-page';
import type { MenuPermissionKey } from './auth-types';

export interface RequireMenuAccessProps {
  children: React.ReactNode;
  /** 需要拥有的菜单权限 key */
  menuKey: MenuPermissionKey;
  /** 无权限时的处理方式：跳转（默认）或渲染 403 页面 */
  fallbackType?: 'redirect' | 'forbidden';
  /** 无权限时的跳转路径，fallbackType 为 redirect 时生效 */
  fallbackPath?: string;
}

/**
 * 页面级菜单权限守卫
 *
 * 有登录但无当前页面菜单权限时：
 * - 默认跳转到 fallbackPath（通常是首页）
 * - 也可通过 fallbackType="forbidden" 渲染 403 页面
 */
export function RequireMenuAccess({
  children,
  menuKey,
  fallbackType = 'redirect',
  fallbackPath = '/',
}: RequireMenuAccessProps) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  if (!hasMenuAccess(currentUser, menuKey)) {
    if (fallbackType === 'forbidden') {
      return <ForbiddenPage onBack={() => navigate(fallbackPath)} />;
    }
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
