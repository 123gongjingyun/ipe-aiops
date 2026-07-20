import type { AuthSession, AuthUser } from './auth-types';

/** 本地存储 key，加 ipe_auth_ 前缀避免与其他模块冲突 */
const STORAGE_KEYS = {
  accessToken: 'ipe_auth_access_token',
  currentUser: 'ipe_auth_current_user',
  sessionMeta: 'ipe_auth_session_meta',
} as const;

function safeGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage 满或禁用，静默失败
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function getStoredAccessToken(): string | null {
  return safeGet<string>(STORAGE_KEYS.accessToken);
}

export function setStoredAccessToken(token: string): void {
  safeSet(STORAGE_KEYS.accessToken, token);
}

export function clearStoredAccessToken(): void {
  safeRemove(STORAGE_KEYS.accessToken);
}

export function getStoredCurrentUser(): AuthUser | null {
  return safeGet<AuthUser>(STORAGE_KEYS.currentUser);
}

export function setStoredCurrentUser(user: AuthUser): void {
  safeSet(STORAGE_KEYS.currentUser, user);
}

export function clearStoredCurrentUser(): void {
  safeRemove(STORAGE_KEYS.currentUser);
}

export function getStoredSessionMeta(): AuthSession | null {
  return safeGet<AuthSession>(STORAGE_KEYS.sessionMeta);
}

export function setStoredSessionMeta(session: AuthSession): void {
  safeSet(STORAGE_KEYS.sessionMeta, session);
}

export function clearStoredSessionMeta(): void {
  safeRemove(STORAGE_KEYS.sessionMeta);
}

/** 清空全部认证相关本地存储 */
export function clearAuthStorage(): void {
  clearStoredAccessToken();
  clearStoredCurrentUser();
  clearStoredSessionMeta();
}

/** 保存完整会话 */
export function persistAuthSession(session: AuthSession): void {
  setStoredAccessToken(session.accessToken);
  setStoredCurrentUser(session.currentUser);
  setStoredSessionMeta(session);
}
