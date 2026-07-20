import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
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
  updateRequestRecordApprovalNote,
  validateRequestReviewExport,
} from '@aiops/shared';
import { Textarea } from '@aiops/shared/ui';
import {
  ApplicationInfoGroupedRows,
  CompactFieldRows,
  ReviewExportSectionCard,
  ReviewExportToolbar,
  SummaryRows,
  UserRequirementGroupedRows,
} from '../components/request-review-export';

export function RequestReviewExportPage() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const record = getRequestRecord(id);
  const model = useMemo(() => (record ? buildRequestReviewExportModel(record) : null), [record]);
  const exportRootRef = useRef<HTMLDivElement | null>(null);
  const [validationResult, setValidationResult] = useState<RequestReviewExportValidationResult | null>(null);
  const [approvalNoteInput, setApprovalNoteInput] = useState(model?.approvalNoteSection.fields[0]?.value || '');
  const [approvalNoteSaved, setApprovalNoteSaved] = useState(false);
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
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
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
              background-color: #ffffff !important;
            }
            @page {
              size: A4;
              margin: 12mm;
            }
          }
        `}
      </style>

      <ReviewExportToolbar
        title={model.title}
        recordId={model.recordId}
        stage={model.stage}
        updatedAt={model.updatedAt}
        from={from}
        editPath={editPath}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
      />

      <ReviewExportSectionCard section={model.userRequirementsSection} prefix="A." tone="warm">
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
      </ReviewExportSectionCard>

      <ReviewExportSectionCard section={model.applicationInfoSection} prefix="B." tone="cool">
        {model.applicationInfoSection.groups ? (
          <ApplicationInfoGroupedRows groups={model.applicationInfoSection.groups} />
        ) : (
          <CompactFieldRows fields={model.applicationInfoSection.fields} />
        )}
      </ReviewExportSectionCard>

      <ReviewExportSectionCard section={model.reviewSummaryOverviewSection} prefix="C." tone="neutral" collapsible defaultExpanded>
        <SummaryRows fields={model.reviewSummaryOverviewSection.fields} />
      </ReviewExportSectionCard>

      <ReviewExportSectionCard section={model.approvalNoteSection}>
        <div className="rounded-[20px] border-2 border-dashed border-slate-300 bg-slate-50/70 px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-800">审批意见</div>
            <div className="text-xs text-slate-400">线下审批完成后，由申请人填写</div>
          </div>
          <Textarea
            value={approvalNoteInput}
            onChange={event => {
              setApprovalNoteInput(event.target.value);
              setApprovalNoteSaved(false);
            }}
            placeholder={model.approvalNoteSection.placeholder}
            className="review-print-approval review-print-text mt-3 min-h-[180px] resize-none whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm leading-7"
          />
          <div className="review-print-hidden mt-3 flex items-center justify-end gap-3">
            {approvalNoteSaved && <span className="text-xs text-emerald-600">已保存审批意见</span>}
            <Button
              type="button"
              size="sm"
              onClick={() => {
                updateRequestRecordApprovalNote(record.id, approvalNoteInput.trim());
                setApprovalNoteSaved(true);
                markRequestRecordsExported([record.id]);
              }}
            >
              保存审批意见
            </Button>
          </div>
        </div>
      </ReviewExportSectionCard>

      <div className="review-print-hidden">
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
    </div>
  );
}
