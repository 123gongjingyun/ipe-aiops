import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth-context';

export interface RequireAuthProps {
  children: React.ReactNode;
  /** 未登录时跳转的登录页路径 */
  loginPath?: string;
}

/**
 * 路由级登录守卫
 *
 * 未登录时自动跳转到登录页，并携带当前路径便于登录后回跳。
 */
export function RequireAuth({ children, loginPath = '/login' }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${loginPath}?returnTo=${returnTo}`} replace />;
  }

  return <>{children}</>;
}
