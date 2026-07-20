import type { AuthApiResponse, AuthSession, AuthUser, LoginRequest, LoginResponseData, MeResponseData } from './auth-types';
import { buildDefaultApplicantUser, buildMockAccessToken, findMockUserByCredentials } from './mock-auth';

/** 是否启用 mock 认证 */
export const AUTH_MOCK_ENABLED = true;

/** 模拟网络延迟，便于联调时观察 loading 状态 */
const MOCK_DELAY_MS = 400;

function mockDelay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

class AuthApiError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AuthApiError';
  }
}

/** 登录 */
export async function login(request: LoginRequest): Promise<AuthSession> {
  if (AUTH_MOCK_ENABLED) {
    await mockDelay();
    const user = findMockUserByCredentials(request.username, request.password);
    if (!user) {
      throw new AuthApiError('账号或密码错误', 'AUTH_INVALID_CREDENTIALS');
    }
    const session: AuthSession = {
      accessToken: buildMockAccessToken(user.username),
      currentUser: user,
      issuedAt: new Date().toISOString(),
    };
    return session;
  }

  // 真实接口阶段使用
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const result = (await response.json()) as AuthApiResponse<LoginResponseData>;
  if (!result.success || !result.data) {
    throw new AuthApiError(result.message || '登录失败', 'AUTH_LOGIN_FAILED');
  }
  return {
    accessToken: result.data.accessToken,
    currentUser: result.data.currentUser,
    issuedAt: new Date().toISOString(),
  };
}

/** 注册：第一阶段保留能力，不默认开放 UI；mock 阶段默认赋予 applicant 角色 */
export async function register(request: {
  username: string;
  displayName: string;
  email?: string;
  password: string;
}): Promise<AuthApiResponse<LoginResponseData>> {
  if (AUTH_MOCK_ENABLED) {
    await mockDelay();
    const user = buildDefaultApplicantUser(
      `user-applicant-${Date.now()}`,
      request.username,
      request.displayName,
      request.email
    );
    return {
      success: true,
      message: '注册成功',
      data: {
        accessToken: buildMockAccessToken(user.username),
        currentUser: user,
      },
    };
  }

  const response = await fetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return (await response.json()) as AuthApiResponse<LoginResponseData>;
}

/** 获取当前用户 */
export async function fetchCurrentUser(accessToken: string): Promise<AuthUser> {
  if (AUTH_MOCK_ENABLED) {
    await mockDelay();
    const username = accessToken.replace(/^mock-token-/, '').replace(/-\d{8}$/, '');
    const { MOCK_USER_MAP } = await import('./mock-auth');
    const user = MOCK_USER_MAP[username];
    if (!user || !user.isActive) {
      throw new AuthApiError('登录已失效，请重新登录', 'AUTH_SESSION_INVALID');
    }
    return user;
  }

  const response = await fetch('/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const result = (await response.json()) as AuthApiResponse<MeResponseData>;
  if (!result.success || !result.data) {
    throw new AuthApiError(result.message || '获取用户信息失败', 'AUTH_ME_FAILED');
  }
  return result.data.currentUser;
}

/** 登出 */
export async function logout(accessToken: string): Promise<void> {
  if (AUTH_MOCK_ENABLED) {
    await mockDelay(200);
    return;
  }

  await fetch('/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export { AuthApiError };
