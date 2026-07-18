import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CircleHelp, MessageCircleMore, QrCode } from 'lucide-react';
import { Button, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, loadSupportWidgetConfig, SUPPORT_WIDGET_EVENT } from '@aiops/shared';

function normalizeHref(href: string) {
  if (!href.trim()) return '#';
  return href;
}

export function SupportWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dragStateRef = useRef<{ pointerId: number; offsetX: number; offsetY: number; moved: boolean } | null>(null);
  const config = useMemo(() => loadSupportWidgetConfig(), [refreshKey]);
  const isApplyFlowRoute = location.pathname.startsWith('/apply/') || location.pathname.startsWith('/apply-service/');

  useEffect(() => {
    try {
      const storedPosition = window.localStorage.getItem('portal_support_widget_position');
      if (storedPosition) {
        const parsed = JSON.parse(storedPosition) as { x: number; y: number };
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setPosition(parsed);
        }
      }
    } catch {
      setPosition(null);
    }
  }, [isApplyFlowRoute]);

  useEffect(() => {
    const onRefresh = () => setRefreshKey(key => key + 1);
    window.addEventListener('storage', onRefresh);
    window.addEventListener(SUPPORT_WIDGET_EVENT, onRefresh);
    return () => {
      window.removeEventListener('storage', onRefresh);
      window.removeEventListener(SUPPORT_WIDGET_EVENT, onRefresh);
    };
  }, []);

  useEffect(() => {
    if (!position) return;
    window.localStorage.setItem('portal_support_widget_position', JSON.stringify(position));
  }, [position]);

  if (!config.enabled) return null;

  const fallbackPosition = isApplyFlowRoute ? { x: 24, y: 112 } : { x: 24, y: 24 };
  const widgetPosition = position ?? fallbackPosition;

  const clampPosition = (nextX: number, nextY: number) => {
    const widgetWidth = 64;
    const widgetHeight = 64;
    const maxX = Math.max(12, window.innerWidth - widgetWidth - 12);
    const maxY = Math.max(12, window.innerHeight - widgetHeight - 12);
    return {
      x: Math.min(Math.max(12, nextX), maxX),
      y: Math.min(Math.max(12, nextY), maxY),
    };
  };

  const handlePointerDown: React.PointerEventHandler<HTMLButtonElement> = event => {
    const bounds = event.currentTarget.getBoundingClientRect();
    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove: React.PointerEventHandler<HTMLButtonElement> = event => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) return;
    dragStateRef.current.moved = true;
    const next = clampPosition(
      window.innerWidth - event.clientX - 32 + dragStateRef.current.offsetX,
      window.innerHeight - event.clientY - 32 + dragStateRef.current.offsetY,
    );
    setPosition(next);
  };

  const handlePointerUp: React.PointerEventHandler<HTMLButtonElement> = event => {
    if (dragStateRef.current?.pointerId !== event.pointerId) return;
    const moved = dragStateRef.current.moved;
    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (!moved) setOpen(true);
  };

  return (
    <>
      <div
        className="fixed z-40 touch-none"
        style={{ right: `${widgetPosition.x}px`, bottom: `${widgetPosition.y}px` }}
      >
        <button
          type="button"
          aria-label="在线咨询入口"
          className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/15 bg-white text-primary shadow-[0_18px_36px_rgba(15,23,42,0.16)] transition-transform hover:-translate-y-0.5"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <span className="sr-only">{config.buttonLabel}</span>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-sm">
            <MessageCircleMore className="h-5 w-5" />
          </span>
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="max-w-md border-l border-slate-200 bg-[linear-gradient(180deg,#FFFDFC_0%,#FFFFFF_28%,#F8FAFC_100%)] px-5">
          <SheetHeader>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <CircleHelp className="h-3.5 w-3.5" />
              咨询与代申请入口
            </div>
            <SheetTitle className="mt-2">{config.panelTitle}</SheetTitle>
            <SheetDescription className="leading-6">{config.panelDescription}</SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">咨询信息</div>
              <div className="mt-2 grid gap-2 text-sm text-slate-700">
                <div>1. 应用或资源名称</div>
                <div>2. 环境类型：测试 / UAT / 生产</div>
                <div>3. 目标能力或服务范围</div>
                <div>4. 期望完成时间与关注事项</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{config.contactLabel}</div>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{config.contactValue}</div>
            </div>

            {config.qrCodeDataUrl && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  <QrCode className="h-3.5 w-3.5" />
                  扫码联系
                </div>
                <div className="mt-3 flex justify-center">
                  <img src={config.qrCodeDataUrl} alt="support qr code" className="h-44 w-44 rounded-2xl border border-slate-100 object-cover" />
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
              {config.footerNote}
            </div>

            <div className="flex flex-col gap-2">
              <a
                href={normalizeHref(config.primaryActionHref)}
                className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                {config.primaryActionLabel}
              </a>
              <Button variant="outline" className="h-11 rounded-full" onClick={() => setOpen(false)}>
                稍后处理
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
