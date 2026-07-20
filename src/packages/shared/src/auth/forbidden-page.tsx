import { ShieldAlert } from 'lucide-react';

export interface ForbiddenPageProps {
  /** 页面标题 */
  title?: string;
  /** 提示文案 */
  message?: string;
  /** 返回按钮文案 */
  backText?: string;
  /** 返回按钮点击回调 */
  onBack?: () => void;
}

/**
 * 403 无权限页面
 *
 * 当用户已登录但无当前页面菜单权限时展示。
 */
export function ForbiddenPage({
  title = '暂无访问权限',
  message = '当前账号暂无该页面访问权限，请联系管理员或返回其他页面。',
  backText = '返回首页',
  onBack,
}: ForbiddenPageProps) {
  return (
    <div className="flex min-h-[calc(100vh-200px)] w-full items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_8px_32px_rgba(15,23,42,0.08)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-[#C8102E] px-5 text-sm font-medium text-white transition-colors hover:bg-[#9F1027]"
          >
            {backText}
          </button>
        )}
      </div>
    </div>
  );
}
