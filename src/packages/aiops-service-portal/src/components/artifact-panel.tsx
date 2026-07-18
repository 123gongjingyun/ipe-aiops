import type { ReactNode } from 'react';
import { Badge, Button } from '@aiops/shared/ui';

export type UploadedArtifact = {
  name: string;
  type: 'architecture' | 'config';
  sizeLabel: string;
};

export function ArtifactPanel({
  title,
  description,
  accent,
  artifacts,
  emptyHint,
  actions,
  onRemove,
}: {
  title: ReactNode;
  description: string;
  accent: 'primary' | 'secondary';
  artifacts: UploadedArtifact[];
  emptyHint: string;
  actions: ReactNode;
  onRemove: (index: number) => void;
}) {
  const accentClass = accent === 'primary'
    ? 'border-cyan-200 bg-cyan-50/60'
    : 'border-slate-200 bg-slate-50/60';

  return (
    <div className={`rounded-2xl border p-3 ${accentClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-0.5 text-xs leading-5 text-slate-600">{description}</div>
        </div>
        <Badge variant="outline">{artifacts.length} 份</Badge>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {actions}
      </div>
      {artifacts.length > 0 ? (
        <div className="mt-3 space-y-2">
          {artifacts.map((artifact, index) => (
            <div key={`${artifact.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-white bg-white px-3 py-2 shadow-sm">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-900">{artifact.name}</div>
                <div className="mt-0.5 text-xs text-slate-500">{artifact.sizeLabel}</div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 rounded-full px-2.5 text-xs text-slate-500"
                onClick={() => onRemove(index)}
              >
                移除
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-white bg-white/80 px-3 py-2.5 text-xs leading-5 text-slate-500">
          {emptyHint}
        </div>
      )}
    </div>
  );
}
