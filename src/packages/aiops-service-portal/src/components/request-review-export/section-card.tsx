import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { RequestReviewExportSection } from '@aiops/shared';

export function ReviewExportSectionCard({
  section,
  prefix,
  tone = 'default',
  collapsible = false,
  defaultExpanded = true,
  children,
}: {
  section: RequestReviewExportSection;
  prefix?: string;
  tone?: 'default' | 'warm' | 'cool' | 'neutral';
  collapsible?: boolean;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const headerToneClass =
    tone === 'warm'
      ? 'bg-amber-50/80'
      : tone === 'cool'
        ? 'bg-sky-50/80'
        : tone === 'neutral'
          ? 'bg-slate-50/90'
          : 'bg-white';

  return (
    <section className="review-print-card rounded-[24px] border border-slate-200 bg-white shadow-sm print:shadow-none">
      <div className={`flex items-center justify-between border-b border-slate-200 px-5 py-4 ${headerToneClass}`}>
        <h2 className="text-lg font-semibold text-slate-900">
          {prefix ? `${prefix} ${section.title}` : section.title}
        </h2>
        {collapsible && (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="review-print-hidden inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-200/50"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? '收起' : '展开'}
          </button>
        )}
      </div>
      {(!collapsible || expanded) && <div className="px-5 py-5">{children}</div>}
    </section>
  );
}
