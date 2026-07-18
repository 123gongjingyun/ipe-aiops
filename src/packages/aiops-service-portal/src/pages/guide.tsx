import { ArrowRight, CheckCircle2, FileCheck2, Files, LayoutTemplate, ListChecks } from 'lucide-react';
import { Link } from 'react-router-dom';

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

export function Guide() {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_48%,#fef7f5_100%)] px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <FileCheck2 className="h-3.5 w-3.5" />
              任务说明
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">填写说明</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              当前阶段以申请材料整理和线下评审导出为主，下面是准备建议和字段填写指引。
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">建议入口</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">新用户先走工作台，老用户可走服务目录</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[24px] border border-emerald-200 bg-[linear-gradient(180deg,#f6fffb_0%,#ffffff_100%)] p-5 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-700">
            <ListChecks className="h-5 w-5" />
            <span className="text-sm font-semibold">常见资源申请</span>
          </div>
          <h2 className="mt-3 text-xl font-semibold text-slate-900">从常见资源申请开始</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            不确定申请边界时，从常见资源申请进入，按步骤整理材料。
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            前往资源申请工作台
            <ArrowRight className="h-4 w-4" />
          </Link>
        </article>

        <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <LayoutTemplate className="h-5 w-5" />
            <span className="text-sm font-semibold">完整服务目录</span>
          </div>
          <h2 className="mt-3 text-xl font-semibold text-slate-900">按完整服务目录查找</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            当常见资源申请未覆盖当前场景时，可在服务目录里按组合服务或资源类型模板进入。
          </p>
          <Link
            to="/catalog"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            前往服务目录
            <ArrowRight className="h-4 w-4" />
          </Link>
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

      <section className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#fffdfa_0%,#ffffff_100%)] p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">导出后怎么用</h2>
        <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            当前阶段以导出线下评审材料为主，重点是把申请背景、资源诉求、附件和评审关注点整理清楚。
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            等用户验证通过后，再逐步与现有 Portal / Center 的正式流程打通，延伸到审批、交付和验收环节。
          </div>
        </div>
      </section>
    </div>
  );
}
