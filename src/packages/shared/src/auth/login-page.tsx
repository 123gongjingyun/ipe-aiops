import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { useAuth } from './auth-context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import type { LoginBrandConfig } from './auth-types';
import {
  getCenterDefaultPathByRoles,
  getPortalDefaultPathByRoles,
} from './auth-permissions';
import { MOCK_CREDENTIALS } from './mock-auth';

export interface LoginPageProps {
  brand: LoginBrandConfig;
}

interface DemoAccount {
  username: string;
  displayName: string;
  roleLabel: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { username: 'zhou.ning', displayName: '周宁', roleLabel: '申请人' },
  { username: 'chen.sy', displayName: '陈思远', roleLabel: '系统管理员' },
  { username: 'wang.qh', displayName: '王启航', roleLabel: '交付担当' },
  { username: 'zhao.sq', displayName: '赵思齐', roleLabel: '审批人' },
  { username: 'sun.ht', displayName: '孙海涛', roleLabel: '运维人员' },
  { username: 'gao.lan', displayName: '高岚', roleLabel: '安全管理员' },
];

export function LoginPage({ brand }: LoginPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated, currentUser, isLoading, error, clearError } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    if (!username.trim() || !password.trim()) {
      setLocalError('请输入账号和密码');
      return;
    }

    setSubmitting(true);
    try {
      await login({ username: username.trim(), password });
      // 登录成功后由上面的 useEffect 处理跳转
    } catch {
      // error 已通过 context 设置
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoAccount = (demo: DemoAccount) => {
    setUsername(demo.username);
    setPassword(MOCK_CREDENTIALS[demo.username] || '123456');
    clearError();
    setLocalError(null);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-[#FFF5F6] via-white to-[#FFF5F6] px-4 py-12">
      <div className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_8px_32px_rgba(15,23,42,0.08)]">
        {/* 头部品牌 */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#C8102E] text-white shadow-sm">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1F2937]">{brand.title}</h1>
          {brand.subtitle && (
            <p className="mt-2 text-sm text-slate-500">{brand.subtitle}</p>
          )}
          <div className="mt-2 inline-flex items-center rounded-full border border-[#C8102E]/20 bg-[#C8102E]/5 px-2.5 py-0.5 text-xs font-medium text-[#C8102E]">
            {brand.moduleName}
          </div>
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium text-[#1F2937]">
              账号
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="请输入账号"
                autoComplete="username"
                className="h-11 border-slate-200 pl-10 text-[#1F2937] placeholder:text-slate-400 focus-visible:border-[#C8102E] focus-visible:ring-[#C8102E]/20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-[#1F2937]">
              密码
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
                className="h-11 border-slate-200 pl-10 pr-10 text-[#1F2937] placeholder:text-slate-400 focus-visible:border-[#C8102E] focus-visible:ring-[#C8102E]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {localError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{localError}</div>
          )}

          <Button
            type="submit"
            disabled={submitting || isLoading}
            className="h-11 w-full bg-[#C8102E] text-white hover:bg-[#9F1027] disabled:bg-slate-300"
          >
            {submitting || isLoading ? '登录中…' : '登录'}
          </Button>
        </form>

        {/* 演示账号快速切换 */}
        <div className="mt-8 border-t border-slate-100 pt-5">
          <p className="mb-3 text-xs font-medium text-slate-400">演示账号（点击快速填充）</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map(demo => (
              <button
                key={demo.username}
                type="button"
                onClick={() => fillDemoAccount(demo)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-xs transition-colors hover:border-[#C8102E]/30 hover:bg-[#FFF5F6]"
              >
                <span className="block font-medium text-[#1F2937]">{demo.displayName}</span>
                <span className="block mt-0.5 text-slate-500">{demo.roleLabel}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-400">演示环境密码统一为 123456</p>
        </div>
      </div>
    </div>
  );
}
