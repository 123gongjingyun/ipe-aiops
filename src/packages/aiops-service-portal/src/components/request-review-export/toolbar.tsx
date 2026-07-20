import { Link } from 'react-router-dom';
import { Button } from '@aiops/shared';
import { Download, FileText, PencilLine, Undo2 } from 'lucide-react';

interface ReviewExportToolbarProps {
  title: string;
  recordId: string;
  stage: string;
  updatedAt: string;
  from?: string | null;
  editPath: string;
  onExportPdf: () => void;
  onExportExcel: () => void;
}

export function ReviewExportToolbar({
  title,
  recordId,
  stage,
  updatedAt,
  from,
  editPath,
  onExportPdf,
  onExportExcel,
}: ReviewExportToolbarProps) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#eef6ff_0%,#ffffff_38%,#f6f9fc_100%)] p-5 shadow-[0_24px_54px_rgba(15,23,42,0.08)] print:border-slate-300 print:bg-white print:shadow-none">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-4xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
            <FileText className="h-3.5 w-3.5" />
            HTML 评审预览
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            当前页面用于审阅资源申请材料，内容以填写页确认后的申请信息和评审摘要概览为准。
          </p>
          <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">申请单号</div>
              <div className="mt-1 font-medium text-slate-800">{recordId}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">阶段</div>
              <div className="mt-1 font-medium text-slate-800">{stage}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">最近更新时间</div>
              <div className="mt-1 font-medium text-slate-800">{updatedAt}</div>
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
            <Button variant="outline" onClick={onExportPdf}>
              <Download className="mr-2 h-4 w-4" />
              导出 PDF
            </Button>
            <Button variant="outline" onClick={onExportExcel}>
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
  );
}
