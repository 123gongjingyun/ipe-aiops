import type { RequestReviewExportField, RequestReviewExportFieldGroup } from '@aiops/shared';

export function CompactFieldRows({
  fields,
}: {
  fields: RequestReviewExportField[];
}) {
  return (
    <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {fields.map(field => (
        <div
          key={`${field.key}-${field.label}`}
          className={`grid gap-2 px-4 py-2 md:grid-cols-[190px_minmax(0,1fr)] ${
            field.highlight === 'pink' ? 'bg-rose-50/70' : ''
          }`}
        >
          <div className="text-sm font-medium leading-5 text-slate-800">{field.label}</div>
          <div className={`review-print-text whitespace-pre-wrap text-sm leading-5 ${field.empty ? 'text-slate-400' : 'text-slate-700'}`}>
            {field.value || field.placeholder}
          </div>
        </div>
      ))}
    </div>
  );
}

export function UserRequirementGroupedRows({
  groups,
}: {
  groups: RequestReviewExportFieldGroup[];
}) {
  return (
    <div className="space-y-4">
      {groups.map(group => (
        <section key={group.key} className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-amber-50/80 px-4 py-2.5 text-sm font-semibold text-slate-900">
            {group.title}
          </div>
          <div className="divide-y divide-slate-200">
            {group.fields.map(field => (
              <div key={`${field.key}-${field.label}`} className="grid gap-3 px-4 py-2.5 md:grid-cols-[240px_minmax(0,1fr)]">
                <div className="min-w-0 text-sm font-medium leading-5 text-slate-800">{field.label}</div>
                <div className={`review-print-text whitespace-pre-wrap text-sm leading-5 ${field.empty ? 'text-slate-400' : 'text-slate-700'}`}>
                  {(field.value || field.placeholder).replace(/\n+/g, ' ')}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function ApplicationInfoGroupedRows({
  groups,
}: {
  groups: RequestReviewExportFieldGroup[];
}) {
  return (
    <div className="space-y-4">
      {groups.map(group => (
        <section key={group.key} className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-sky-50/80 px-4 py-2.5 text-sm font-semibold text-slate-900">
            {group.title}
          </div>
          <div className="divide-y divide-slate-200">
            {group.fields.map(field => (
              <div key={`${field.key}-${field.label}`} className="grid gap-2 px-4 py-2 md:grid-cols-[190px_minmax(0,1fr)]">
                <div className="text-sm font-medium leading-5 text-slate-800">{field.label}</div>
                <div className={`review-print-text whitespace-pre-wrap text-sm leading-5 ${field.empty ? 'text-slate-400' : 'text-slate-700'}`}>
                  {(field.value || field.placeholder).replace(/\n+/g, ' ')}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function SummaryRows({
  fields,
}: {
  fields: RequestReviewExportField[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
      {fields.map(field => {
        const text = field.value || field.placeholder;
        const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
        return (
          <div key={`${field.key}-${field.label}`} className={`${field.empty ? 'text-slate-400' : 'text-slate-700'}`}>
            {lines.map(line => {
              const isHeading = /^[一二三四五六七八九十]+、/.test(line);
              const isNumbered = /^\d+\./.test(line);
              return (
                <div
                  key={line}
                  className={`review-print-text whitespace-pre-wrap text-sm leading-6 ${isHeading ? 'mt-3 font-semibold text-slate-900 first:mt-0' : isNumbered ? 'mt-2 text-slate-700 first:mt-0' : 'mt-1 text-slate-700 first:mt-0'}`}
                >
                  {line}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
