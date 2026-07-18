import { ArrowRight, FileText, LifeBuoy, WandSparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const menuNotes = [
  {
    title: '完整服务目录',
    description: '补充入口。当常见资源申请未覆盖当前场景时，再进入这里查找。',
    to: '/catalog',
  },
  {
    title: '我的工单',
    description: '审批、交付、验收阶段的工单查看入口，不是材料整理主路径。',
    to: '/orders',
  },
] as const;

export function Home() {
  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-[#dbe4f0] bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_42%,#f5f8fc_100%)] p-6 shadow-[0_24px_54px_rgba(15,23,42,0.08)]">
        <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
          <Link
            to="/common-requests"
            className="group rounded-[28px] border border-emerald-200 bg-[linear-gradient(135deg,#f4fbf7_0%,#ffffff_48%,#f7fbff_100%)] p-6 shadow-[0_18px_42px_rgba(16,185,129,0.10)] transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_22px_48px_rgba(16,185,129,0.16)]"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 shadow-sm">
              <WandSparkles className="h-3.5 w-3.5" />
              主入口
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-slate-900">开始新的资源申请</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              从 6 个高频资源类型中选择，快速进入申请材料填写。
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors group-hover:bg-emerald-700">
              进入常见资源申请
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          <div className="grid gap-4">
            <Link
              to="/request-records"
              className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="inline-flex items-center gap-2 text-slate-900">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-base font-semibold">资源申请单</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">查看草稿、已导出评审稿和当前申请材料记录。</p>
            </Link>

            <Link
              to="/help"
              className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="inline-flex items-center gap-2 text-slate-900">
                <LifeBuoy className="h-4 w-4 text-primary" />
                <span className="text-base font-semibold">帮助中心</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">查看平台说明、FAQ 和支持方式。</p>
            </Link>
          </div>
        </div>
      </div>

      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 pb-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">其他入口</div>
          <h2 className="text-xl font-semibold text-slate-900">边界说明</h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-500">
            仅在常见资源申请未覆盖，或需要查看审批后进展时使用。
          </p>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {menuNotes.map(note => (
            <Link
              key={note.title}
              to={note.to}
              className="rounded-[22px] border border-slate-200 bg-slate-50/60 px-5 py-5 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-base font-semibold text-slate-900">{note.title}</div>
                <span className="text-xs font-medium text-slate-400">查看</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{note.description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-4 rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-4 text-sm leading-6 text-slate-500">
          优先使用 <span className="font-medium text-slate-700">常见资源申请</span> 和 <span className="font-medium text-slate-700">资源申请单</span>；
          审批、交付、验收进展请到 <span className="font-medium text-slate-700">我的工单</span>。
        </div>
      </section>
    </section>
  );
}
