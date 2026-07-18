import { CheckCircle2, FileCheck2, Files, LayoutTemplate, ListChecks } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@aiops/shared';

const preparationItems = [
  '系统名称、应用名称、申请环境、业务目标',
  '预估资源类型、容量规模、访问方式与网络要求',
  '高可用、备份、SLA、安全或容灾要求',
  '架构图、系统上下游关系和必要补充说明',
];

const fieldGuides = [
  {
    title: '业务目标',
    description: '说明这次申请要解决什么问题、支撑什么业务场景、目标上线阶段是什么。避免只写“申请资源”这类空泛描述。',
  },
  {
    title: '网络与访问',
    description: '明确是否公网访问、域名和端口诉求、是否需要系统互访，以及上下游访问边界。',
  },
  {
    title: 'SLA / 安全 / 容灾',
    description: '说明是否生产、是否双活/高可用、备份恢复要求、安全等级和合规要求。',
  },
  {
    title: '架构图与附件',
    description: '优先准备能说明链路、组件、数据库、中间件、外联关系的架构图，减少评审时往返补材料。',
  },
] as const;

export function FillGuideDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>填写说明</DialogTitle>
        </DialogHeader>

        <div className="max-h-[78vh] space-y-6 overflow-y-auto pr-1">
          <section className="rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_48%,#fef7f5_100%)] px-5 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <FileCheck2 className="h-3.5 w-3.5" />
                  任务说明
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  这里主要说明：当前阶段的申请材料应该如何准备、从哪里开始填，以及导出后怎么用于线下评审。
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">建议入口</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">不确定怎么写时可先用引导填写</div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-[24px] border border-emerald-200 bg-[linear-gradient(180deg,#f6fffb_0%,#ffffff_100%)] p-5 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-700">
                <ListChecks className="h-5 w-5" />
                <span className="text-sm font-semibold">引导填写</span>
              </div>
              <h2 className="mt-3 text-xl font-semibold text-slate-900">不知道从何下手时</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                进入填写后选择引导模式，系统会按步骤逐项提示你补充材料，减少漏填和来回沟通。
              </p>
            </article>

            <article className="rounded-[24px] border border-sky-200 bg-sky-50/70 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sky-700">
                <LayoutTemplate className="h-5 w-5" />
                <span className="text-sm font-semibold">直接填写</span>
              </div>
              <h2 className="mt-3 text-xl font-semibold text-slate-900">已明确申请内容时</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                进入填写后选择直接模式，可一次性展开全部表单，把环境、规模、网络和补充材料填完整。
              </p>
            </article>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900">
              <Files className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">开始前建议准备</h2>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {preparationItems.map(item => (
                <div key={item} className="flex items-start gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">高频字段填写建议</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {fieldGuides.map(item => (
                <article key={item.title} className="rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
