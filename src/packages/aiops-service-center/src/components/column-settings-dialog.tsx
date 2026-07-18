import { Checkbox, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@aiops/shared';
import { CheckSquare, RotateCcw, Square } from 'lucide-react';

export interface ColumnSettingItem {
  key: string;
  label: string;
  meta?: string;
}

export function ColumnSettingsDialog({
  open,
  title,
  description,
  items,
  selectedMap,
  onOpenChange,
  onToggle,
  onReset,
  onSelectAll,
  onClear,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  items: ColumnSettingItem[];
  selectedMap: Record<string, boolean>;
  onOpenChange: (open: boolean) => void;
  onToggle: (key: string) => void;
  onReset: () => void;
  onSelectAll: () => void;
  onClear: () => void;
  onConfirm: () => void;
}) {
  const selectedCount = items.filter(item => selectedMap[item.key]).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          已选择 {selectedCount} / {items.length} 项
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
          >
            <RotateCcw className="h-3 w-3" /> 恢复默认
          </button>
          <button
            onClick={onSelectAll}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
          >
            <CheckSquare className="h-3 w-3" /> 全选
          </button>
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
          >
            <Square className="h-3 w-3" /> 清空
          </button>
        </div>
        <div className="grid max-h-[440px] grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
          {items.map(item => {
            const checked = selectedMap[item.key];
            return (
              <label
                key={item.key}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:border-slate-300"
              >
                <Checkbox checked={checked} onCheckedChange={() => onToggle(item.key)} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-900">{item.label}</div>
                  {item.meta ? <div className="mt-0.5 truncate text-[11px] text-slate-500">{item.meta}</div> : null}
                </div>
              </label>
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => onOpenChange(false)} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
            取消
          </button>
          <button onClick={onConfirm} className="rounded-md bg-primary px-3 py-2 text-sm text-white hover:bg-primary/90">
            确认
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
