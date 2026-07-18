import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import {
  buildRequestReviewExportModel,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  getRequestRecord,
  markRequestRecordsExported,
  type RequestReviewExportValidationResult,
  validateRequestReviewExport,
  type RequestReviewExportField,
  type RequestReviewExportFieldGroup,
  type RequestReviewExportSection,
} from '@aiops/shared';
import { Download, FileText, PencilLine, Undo2 } from 'lucide-react';

function CompactFieldRows({
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
          <div className={`whitespace-pre-wrap text-sm leading-5 ${field.empty ? 'text-slate-400' : 'text-slate-700'}`}>
            {field.value || field.placeholder}
          </div>
        </div>
      ))}
    </div>
  );
}

function UserRequirementGroupedRows({
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
                <div className={`whitespace-pre-wrap text-sm leading-5 ${field.empty ? 'text-slate-400' : 'text-slate-700'}`}>
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

function ApplicationInfoGroupedRows({
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
                <div className={`whitespace-pre-wrap text-sm leading-5 ${field.empty ? 'text-slate-400' : 'text-slate-700'}`}>
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

function SummaryRows({
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
                  className={`whitespace-pre-wrap text-sm leading-6 ${isHeading ? 'mt-3 font-semibold text-slate-900 first:mt-0' : isNumbered ? 'mt-2 text-slate-700 first:mt-0' : 'mt-1 text-slate-700 first:mt-0'}`}
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

function ExportSectionCard({
  section,
  prefix,
  tone = 'default',
  children,
}: {
  section: RequestReviewExportSection;
  prefix?: string;
  tone?: 'default' | 'warm' | 'cool' | 'neutral';
  children: React.ReactNode;
}) {
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
      <div className={`border-b border-slate-200 px-5 py-4 ${headerToneClass}`}>
        <h2 className="text-lg font-semibold text-slate-900">
          {prefix ? `${prefix} ${section.title}` : section.title}
        </h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

export function RequestReviewExportPage() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const record = getRequestRecord(id);
  const model = useMemo(() => (record ? buildRequestReviewExportModel(record) : null), [record]);
  const exportRootRef = useRef<HTMLDivElement | null>(null);
  const [validationResult, setValidationResult] = useState<RequestReviewExportValidationResult | null>(null);
  const from = searchParams.get('from');
  const product = searchParams.get('product') || record?.product || 'vm';
  const mode = searchParams.get('mode') || record?.mode || 'assistant';
  const autoExport = searchParams.get('autoExport');
  const autoExportTriggeredRef = useRef(false);
  const editPath = `/${mode === 'direct' ? 'direct-workbench' : 'guided-workbench'}?product=${product}&action=edit&sourceId=${id}`;

  if (!record || !model) {
    return <Navigate to="/request-records" replace />;
  }

  const runExportValidation = () => {
    const result = validateRequestReviewExport(record);
    if (!result.ready) {
      setValidationResult(result);
      return false;
    }
    return true;
  };

  const handleExportExcel = async () => {
    if (!runExportValidation()) return;
    const { downloadRequestReviewExcel } = await import('@aiops/shared');
    await downloadRequestReviewExcel(record);
    markRequestRecordsExported([record.id]);
  };

  const handleExportPdf = async () => {
    if (!runExportValidation()) return;
    if (!exportRootRef.current) return;
    const { downloadRequestReviewPdf } = await import('@aiops/shared');
    await downloadRequestReviewPdf(record, exportRootRef.current);
    markRequestRecordsExported([record.id]);
  };

  useEffect(() => {
    if (autoExport !== 'pdf') return;
    if (autoExportTriggeredRef.current) return;
    autoExportTriggeredRef.current = true;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('autoExport');
    window.history.replaceState(null, '', `${window.location.pathname}${nextParams.toString() ? `?${nextParams.toString()}` : ''}`);
    const timer = window.setTimeout(() => {
      void handleExportPdf();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [autoExport, searchParams]);

  return (
    <div ref={exportRootRef} className="space-y-5 print:space-y-4">
      <style>
        {`
          @media print {
            .review-print-hidden {
              display: none !important;
            }
            .review-print-card {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .review-print-text {
              white-space: pre-wrap;
              word-break: break-word;
            }
            .review-print-approval {
              min-height: 220px !important;
            }
            @page {
              size: A4;
              margin: 12mm;
            }
          }
        `}
      </style>

      <section className="rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#eef6ff_0%,#ffffff_38%,#f6f9fc_100%)] p-5 shadow-[0_24px_54px_rgba(15,23,42,0.08)] print:border-slate-300 print:bg-white print:shadow-none">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
              <FileText className="h-3.5 w-3.5" />
              HTML 评审预览
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{model.title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              当前页面用于审阅资源申请材料，内容以填写页确认后的申请信息和评审摘要概览为准。
            </p>
            <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">申请单号</div>
                <div className="mt-1 font-medium text-slate-800">{model.recordId}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">阶段</div>
                <div className="mt-1 font-medium text-slate-800">{model.stage}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">申请环境</div>
                <div className="mt-1 font-medium text-slate-800">{model.environment || '未填写'}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">最近更新时间</div>
                <div className="mt-1 font-medium text-slate-800">{model.updatedAt}</div>
              </div>
            </div>
          </div>

          <div className="review-print-hidden flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm xl:min-w-[320px]">
            <div className="text-sm font-medium text-slate-800">导出操作</div>
            <div className="flex flex-col gap-2">
              {from === 'workbench' && (
                <Button variant="outline" asChild>
                  <Link to={editPath}>
                    <PencilLine className="mr-2 h-4 w-4" />
                    返回继续编辑
                  </Link>
                </Button>
              )}
              <Button variant="outline" onClick={handleExportPdf}>
                <Download className="mr-2 h-4 w-4" />
                导出 PDF
              </Button>
              <Button variant="outline" onClick={handleExportExcel}>
                <Download className="mr-2 h-4 w-4" />
                导出 Excel
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/request-records">
                  <Undo2 className="mr-2 h-4 w-4" />
                  返回申请单列表
                </Link>
              </Button>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-xs leading-5 text-slate-500">
              当前页面先用于预览审阅；正式导出前会校验材料完整度，未补齐时会列出缺失项。
            </div>
          </div>
        </div>
      </section>

      <ExportSectionCard section={model.userRequirementsSection} prefix="A." tone="warm">
        {model.userRequirementsSection.hints && model.userRequirementsSection.hints.length > 0 && (
          <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm leading-5 text-slate-700">
            {model.userRequirementsSection.hints.map(hint => (
              <div key={hint}>{hint}</div>
            ))}
          </div>
        )}
        {model.userRequirementsSection.groups ? (
          <UserRequirementGroupedRows groups={model.userRequirementsSection.groups} />
        ) : (
          <CompactFieldRows fields={model.userRequirementsSection.fields} />
        )}
      </ExportSectionCard>

      <ExportSectionCard section={model.applicationInfoSection} prefix="B." tone="cool">
        {model.applicationInfoSection.groups ? (
          <ApplicationInfoGroupedRows groups={model.applicationInfoSection.groups} />
        ) : (
          <CompactFieldRows fields={model.applicationInfoSection.fields} />
        )}
      </ExportSectionCard>

      <ExportSectionCard section={model.reviewSummaryOverviewSection} prefix="C." tone="neutral">
        <SummaryRows fields={model.reviewSummaryOverviewSection.fields} />
      </ExportSectionCard>

      <ExportSectionCard section={model.approvalNoteSection}>
        <div className="rounded-[20px] border-2 border-dashed border-slate-300 bg-slate-50/70 px-4 py-5">
          <div className="text-sm font-medium text-slate-800">审批意见框</div>
          <div className="review-print-approval review-print-text mt-3 min-h-[180px] whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-400">
            {model.approvalNoteSection.fields[0]?.placeholder}
          </div>
        </div>
      </ExportSectionCard>

      <Dialog open={Boolean(validationResult)} onOpenChange={open => { if (!open) setValidationResult(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>当前申请材料未完成，暂不可导出正式评审材料</DialogTitle>
            <DialogDescription>
              评审预览可以继续查看；请先补齐以下阻断项后，再执行 PDF 或 Excel 导出。
            </DialogDescription>
          </DialogHeader>
          {validationResult && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                <div className="text-sm font-semibold text-rose-800">阻断项</div>
                <div className="mt-3 space-y-2">
                  {validationResult.blockingIssues.map(issue => (
                    <div key={`${issue.level}-${issue.key}`} className="rounded-xl bg-white px-3 py-2 text-sm text-rose-700">
                      {issue.reason}
                    </div>
                  ))}
                </div>
              </div>
              {validationResult.warningIssues.length > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                  <div className="text-sm font-semibold text-amber-800">建议补充项</div>
                  <div className="mt-3 space-y-2">
                    {validationResult.warningIssues.map(issue => (
                      <div key={`${issue.level}-${issue.key}`} className="rounded-xl bg-white px-3 py-2 text-sm text-amber-700">
                        {issue.reason}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
