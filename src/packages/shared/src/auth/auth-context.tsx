import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthSession, AuthUser, LoginRequest } from './auth-types';
import { login as apiLogin, logout as apiLogout } from './auth-api';
import {
  clearAuthStorage,
  getStoredAccessToken,
  getStoredCurrentUser,
  persistAuthSession,
} from './auth-storage';
import { getPermissionMatrix, onPermissionMatrixSync } from './permission-matrix-store';
import { applyPermissionMatrixToUser } from './permission-matrix-builder';

export interface AuthContextValue {
  /** 当前登录用户，未登录为 null */
  currentUser: AuthUser | null;
  /** 是否正在初始化或登录中 */
  isLoading: boolean;
  /** 是否已登录 */
  isAuthenticated: boolean;
  /** 登录 */
  login: (request: LoginRequest) => Promise<void>;
  /** 登出 */
  logout: () => Promise<void>;
  /** 最近一次错误信息 */
  error: string | null;
  /** 手动清空错误 */
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
}

function applyMatrix(user: AuthUser): AuthUser;
function applyMatrix(user: AuthUser | null): AuthUser | null;
function applyMatrix(user: AuthUser | null): AuthUser | null {
  if (!user) return null;
  return applyPermissionMatrixToUser(user, getPermissionMatrix());
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** 初始化：从 localStorage 恢复会话 */
  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      try {
        const token = getStoredAccessToken();
        const storedUser = getStoredCurrentUser();
        if (!token) {
          if (!cancelled) setIsLoading(false);
          return;
        }

        // 本地已有 user 时先用它做快速恢复，避免白屏
        if (storedUser && storedUser.isActive && !cancelled) {
          setCurrentUser(applyMatrix(storedUser));
        }

        // mock 阶段 token 可直接解析出用户；真实接口阶段可在这里调用 fetchCurrentUser
        const { fetchCurrentUser } = await import('./auth-api');
        const refreshedUser = await fetchCurrentUser(token);
        if (!cancelled) {
          const appliedUser = applyMatrix(refreshedUser);
          setCurrentUser(appliedUser);
          const session: AuthSession = {
            accessToken: token,
            currentUser: appliedUser,
            issuedAt: new Date().toISOString(),
          };
          persistAuthSession(session);
        }
      } catch (err) {
        if (!cancelled) {
          setCurrentUser(null);
          clearAuthStorage();
          setError(err instanceof Error ? err.message : '会话恢复失败');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  /** 监听权限矩阵变化，实时刷新当前用户生效权限 */
  useEffect(() => {
    return onPermissionMatrixSync(() => {
      setCurrentUser(prev => applyMatrix(prev));
    });
  }, []);

  const login = useCallback(async (request: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const session = await apiLogin(request);
      const appliedUser = applyMatrix(session.currentUser);
      setCurrentUser(appliedUser);
      persistAuthSession({
        ...session,
        currentUser: appliedUser,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = getStoredAccessToken();
      if (token) {
        await apiLogout(token);
      }
    } catch {
      // 登出接口失败也清本地态
    } finally {
      setCurrentUser(null);
      clearAuthStorage();
      setError(null);
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isLoading,
      isAuthenticated: !!currentUser && currentUser.isActive,
      login,
      logout,
      error,
      clearError,
    }),
    [currentUser, isLoading, login, logout, error, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
