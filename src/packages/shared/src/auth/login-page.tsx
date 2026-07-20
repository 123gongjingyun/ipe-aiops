import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react';
import { useAuth } from './auth-context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/sonner';
import type { LoginBrandConfig } from './auth-types';
import {
  getCenterDefaultPathByRoles,
  getPortalDefaultPathByRoles,
} from './auth-permissions';
import { DEMO_ACCOUNTS, MOCK_CREDENTIALS } from './mock-auth';
import { register as apiRegister } from './auth-api';

export interface LoginPageProps {
  brand: LoginBrandConfig;
}

export function LoginPage({ brand }: LoginPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, setSession, isAuthenticated, currentUser, isLoading, error, clearError } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<'login' | 'register'>('login');

  // 登录字段
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // 注册字段
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerDisplayName, setRegisterDisplayName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerSubmitting, setRegisterSubmitting] = useState(false);

  const [localError, setLocalError] = useState<string | null>(null);
  const returnTo = searchParams.get('returnTo');

  // 已登录时按角色跳默认首页或 returnTo
  useEffect(() => {
    if (isAuthenticated && currentUser && !isLoading) {
      const target = returnTo
        ? decodeURIComponent(returnTo)
        : brand.app === 'center'
          ? getCenterDefaultPathByRoles(currentUser.roleKeys)
          : getPortalDefaultPathByRoles(currentUser.roleKeys);
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, currentUser, isLoading, navigate, returnTo, brand.app]);

  useEffect(() => {
    if (error) setLocalError(error);
  }, [error]);

  function switchMode(next: 'login' | 'register') {
    setMode(next);
    clearError();
    setLocalError(null);
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setLocalError(null);

    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLocalError('请输入账号和密码');
      return;
    }

    setLoginSubmitting(true);
    try {
      await login({ username: loginUsername.trim(), password: loginPassword });
      toast({
        variant: 'success',
        title: '登录成功，欢迎回来。',
        duration: 4000,
      });
    } catch {
      // error 已通过 context 设置
    } finally {
      setLoginSubmitting(false);
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setLocalError(null);

    if (!registerUsername.trim() || !registerDisplayName.trim() || !registerPassword.trim()) {
      setLocalError('请填写完整注册信息');
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      setLocalError('两次输入的密码不一致');
      return;
    }
    if (registerPassword.length < 6) {
      setLocalError('密码长度不能少于 6 位');
      return;
    }

    setRegisterSubmitting(true);
    try {
      const session = await apiRegister({
        username: registerUsername.trim(),
        displayName: registerDisplayName.trim(),
        email: registerEmail.trim() || undefined,
        password: registerPassword,
      });
      setSession(session);
      toast({
        variant: 'success',
        title: `注册并登录成功，欢迎 ${registerDisplayName.trim()}。`,
        duration: 4000,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '注册失败';
      setLocalError(message);
    } finally {
      setRegisterSubmitting(false);
    }
  }

  const fillDemoAccount = (demo: { username: string; displayName: string; roleLabel: string }) => {
    setLoginUsername(demo.username);
    setLoginPassword(MOCK_CREDENTIALS[demo.username] || '123456');
    setMode('login');
    clearError();
    setLocalError(null);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-[#FFF5F6] via-white to-[#FFF5F6] px-4 py-12">
      <div className="w-full max-w-[520px] rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_12px_40px_rgba(15,23,42,0.10)] sm:p-10">
        {/* 头部品牌 */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#C8102E] text-white shadow-sm">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1F2937] sm:text-3xl">{brand.title}</h1>
          {brand.subtitle && (
            <p className="mt-2 text-sm text-slate-500">{brand.subtitle}</p>
          )}
          <div className="mt-3 inline-flex items-center rounded-full border border-[#C8102E]/20 bg-[#C8102E]/5 px-3 py-1 text-xs font-medium text-[#C8102E]">
            {brand.moduleName}
          </div>
        </div>

        {/* 错误提示 */}
        {localError && (
          <div className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{localError}</div>
        )}

        {mode === 'login' ? (
          <>
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="login-username" className="text-sm font-medium text-[#1F2937]">
                  账号
                </label>
                <div className="relative">
                  <UserRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="login-username"
                    type="text"
                    value={loginUsername}
                    onChange={e => setLoginUsername(e.target.value)}
                    placeholder="请输入账号"
                    autoComplete="username"
                    className="h-12 border-slate-200 pl-11 text-[#1F2937] placeholder:text-slate-400 focus-visible:border-[#C8102E] focus-visible:ring-[#C8102E]/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password" className="text-sm font-medium text-[#1F2937]">
                  密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="请输入密码"
                    autoComplete="current-password"
                    className="h-12 border-slate-200 pl-11 pr-11 text-[#1F2937] placeholder:text-slate-400 focus-visible:border-[#C8102E] focus-visible:ring-[#C8102E]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loginSubmitting || isLoading}
                className="h-12 w-full bg-[#C8102E] text-base font-semibold text-white hover:bg-[#9F1027] disabled:bg-slate-300"
              >
                {loginSubmitting || isLoading ? '登录中…' : '登录'}
              </Button>
            </form>

            {/* 注册入口 */}
            <div className="mt-5 text-center text-sm text-slate-500">
              还没有账户？
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="ml-1 font-medium text-[#C8102E] hover:underline"
              >
                注册
              </button>
            </div>

            {/* 演示账号快速切换 */}
            <div className="mt-8 border-t border-slate-100 pt-6">
              <p className="mb-3 text-xs font-medium text-slate-400">演示账号（点击快速填充）</p>
              <div className="grid grid-cols-2 gap-3">
                {DEMO_ACCOUNTS.map(demo => (
                  <button
                    key={demo.username}
                    type="button"
                    onClick={() => fillDemoAccount(demo)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-left text-sm transition-colors hover:border-[#C8102E]/30 hover:bg-[#FFF5F6]"
                  >
                    <span className="block font-medium text-[#1F2937]">{demo.displayName}</span>
                    <span className="block mt-0.5 text-xs text-slate-500">{demo.roleLabel}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-slate-400">演示环境密码统一为 123456</p>
            </div>
          </>
        ) : (
          <>
            <form onSubmit={handleRegisterSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="register-username" className="text-sm font-medium text-[#1F2937]">
                  用户名
                </label>
                <div className="relative">
                  <UserRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="register-username"
                    type="text"
                    value={registerUsername}
                    onChange={e => setRegisterUsername(e.target.value)}
                    placeholder="建议使用工号或邮箱前缀"
                    autoComplete="username"
                    className="h-12 border-slate-200 pl-11 text-[#1F2937] placeholder:text-slate-400 focus-visible:border-[#C8102E] focus-visible:ring-[#C8102E]/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="register-display-name" className="text-sm font-medium text-[#1F2937]">
                  显示名
                </label>
                <Input
                  id="register-display-name"
                  type="text"
                  value={registerDisplayName}
                  onChange={e => setRegisterDisplayName(e.target.value)}
                  placeholder="如：巩工"
                  className="h-12 border-slate-200 text-[#1F2937] placeholder:text-slate-400 focus-visible:border-[#C8102E] focus-visible:ring-[#C8102E]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="register-email" className="text-sm font-medium text-[#1F2937]">
                  邮箱（可选）
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="register-email"
                    type="email"
                    value={registerEmail}
                    onChange={e => setRegisterEmail(e.target.value)}
                    placeholder="请输入邮箱"
                    autoComplete="email"
                    className="h-12 border-slate-200 pl-11 text-[#1F2937] placeholder:text-slate-400 focus-visible:border-[#C8102E] focus-visible:ring-[#C8102E]/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="register-password" className="text-sm font-medium text-[#1F2937]">
                  密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="register-password"
                    type={showRegisterPassword ? 'text' : 'password'}
                    value={registerPassword}
                    onChange={e => setRegisterPassword(e.target.value)}
                    placeholder="请设置密码（不少于 6 位）"
                    autoComplete="new-password"
                    className="h-12 border-slate-200 pl-11 pr-11 text-[#1F2937] placeholder:text-slate-400 focus-visible:border-[#C8102E] focus-visible:ring-[#C8102E]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="register-confirm-password" className="text-sm font-medium text-[#1F2937]">
                  确认密码
                </label>
                <Input
                  id="register-confirm-password"
                  type="password"
                  value={registerConfirmPassword}
                  onChange={e => setRegisterConfirmPassword(e.target.value)}
                  placeholder="请再次输入密码"
                  autoComplete="new-password"
                  className="h-12 border-slate-200 text-[#1F2937] placeholder:text-slate-400 focus-visible:border-[#C8102E] focus-visible:ring-[#C8102E]/20"
                />
              </div>

              <Button
                type="submit"
                disabled={registerSubmitting || isLoading}
                className="h-12 w-full bg-[#C8102E] text-base font-semibold text-white hover:bg-[#9F1027] disabled:bg-slate-300"
              >
                {registerSubmitting || isLoading ? '注册中…' : '注册并登录'}
              </Button>
            </form>

            {/* 登录入口 */}
            <div className="mt-5 text-center text-sm text-slate-500">
              已有账户？
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="ml-1 font-medium text-[#C8102E] hover:underline"
              >
                登录
              </button>
            </div>

            <div className="mt-6 text-center text-xs text-slate-400">
              注册即表示同意开通申请人权限，可发起常见资源申请与查看资源申请单。
            </div>
          </>
        )}
      </div>
    </div>
  );
}
