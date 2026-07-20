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
    progress: 'bg-emerald-500',
  },
  error: {
    accent: 'bg-red-500',
    progress: 'bg-red-500',
  },
  info: {
    accent: 'bg-[#C8102E]',
    progress: 'bg-[#C8102E]',
  },
  warning: {
    accent: 'bg-amber-500',
    progress: 'bg-amber-500',
  },
};

let toastIdCounter = 0;

const TOAST_ANIMATION_STYLES = `
@keyframes ipe-toast-progress {
  from { width: 100%; }
  to { width: 0%; }
}
`;

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

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      <style>{TOAST_ANIMATION_STYLES}</style>
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
  const duration = toast.duration ?? 4000;

  return (
    <div
      className="pointer-events-auto relative flex w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.12)] animate-in slide-in-from-right-full fade-in duration-300"
      role="alert"
    >
      {/* 左侧高亮条 */}
      <div className={`w-1.5 shrink-0 ${styles.accent}`} />
      <div className="flex min-w-0 flex-1 items-center justify-between px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className={`h-2 w-2 shrink-0 rounded-full ${styles.accent}`} />
          <p className="truncate text-sm font-medium text-slate-900">
            {toast.title}
            {toast.description && (
              <span className="ml-1 font-normal text-slate-600">{toast.description}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="ml-2 shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="关闭提示"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* 底部动态进度条 */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100">
        <div
          className={`h-full ${styles.progress}`}
          style={{
            width: '100%',
            animation: `ipe-toast-progress ${duration}ms linear forwards`,
          }}
        />
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
  window.dispatchEvent(
    new CustomEvent('ipe-global-toast', { detail: options })
  );
}

export { ToastContext };
