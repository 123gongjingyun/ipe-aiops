import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { X } from 'lucide-react';

export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  variant?: 'success' | 'error' | 'info' | 'warning';
}

interface ToastItem extends ToastOptions {
  id: string;
  createdAt: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES = {
  success: {
    accent: 'bg-emerald-500',
    icon: 'text-emerald-500',
  },
  error: {
    accent: 'bg-red-500',
    icon: 'text-red-500',
  },
  info: {
    accent: 'bg-[#C8102E]',
    icon: 'text-[#C8102E]',
  },
  warning: {
    accent: 'bg-amber-500',
    icon: 'text-amber-500',
  },
};

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((options: ToastOptions) => {
    const id = `toast-${++toastIdCounter}-${Date.now()}`;
    const item: ToastItem = {
      ...options,
      id,
      duration: options.duration ?? 4000,
      variant: options.variant ?? 'info',
      createdAt: Date.now(),
    };
    setToasts(prev => [...prev, item]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map(item =>
      window.setTimeout(() => dismiss(item.id), item.duration)
    );
    return () => {
      timers.forEach(timer => window.clearTimeout(timer));
    };
  }, [toasts, dismiss]);

  useEffect(() => {
    function onGlobalToast(e: Event) {
      const detail = (e as CustomEvent<ToastOptions>).detail;
      if (detail) toast(detail);
    }
    window.addEventListener('ipe-global-toast', onGlobalToast);
    return () => window.removeEventListener('ipe-global-toast', onGlobalToast);
  }, [toast]);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed right-0 top-0 z-[100] flex w-full max-w-[420px] flex-col gap-3 p-4 sm:p-6">
      {toasts.map(item => (
        <ToastCard key={item.id} toast={item} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const styles = VARIANT_STYLES[toast.variant ?? 'info'];

  return (
    <div
      className="pointer-events-auto flex w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.12)] animate-in slide-in-from-right-full fade-in duration-300"
      role="alert"
    >
      {/* 左侧高亮条 */}
      <div className={`w-1.5 shrink-0 ${styles.accent}`} />
      <div className="flex flex-1 items-start gap-3 px-4 py-3.5">
        <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-current opacity-80" />
        <div className="min-w-0 flex-1">
          {toast.title && (
            <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
          )}
          {toast.description && (
            <p className="mt-0.5 text-sm leading-5 text-slate-600">{toast.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="关闭提示"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

/** 全局 toast API，需在 ToastProvider 内使用 */
export function toast(options: ToastOptions): void {
  if (typeof window === 'undefined') return;
  // 通过自定义事件触发，供未在 Provider 内消费的地方使用
  window.dispatchEvent(
    new CustomEvent('ipe-global-toast', { detail: options })
  );
}

export { ToastContext };
