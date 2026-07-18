import { Link } from 'react-router-dom';
import { ArrowLeft, LayoutTemplate } from 'lucide-react';
import { HeroSection } from '../components/hero-section';
import { ComboCardGrid } from '../components/combo-card-grid';
import { AtomicServiceGrid } from '../components/atomic-service-grid';

export function Catalog() {
  return (
    <div>
      <section className="mb-6 rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_42%,#fef7f5_100%)] px-6 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <LayoutTemplate className="h-3.5 w-3.5" />
              降级补充入口
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">查找其他未在常见入口覆盖的服务项</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              这里继续保留原有组合服务和单项能力入口，但当前已经降级为补充路径。建议优先从“常见资源申请”进入；只有当前高频产品未覆盖时，再来这里查找其他服务项。
            </p>
          </div>
          <Link
            to="/common-requests"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            返回常见资源申请
          </Link>
        </div>
      </section>

      <HeroSection />
      <ComboCardGrid />
      <AtomicServiceGrid />
    </div>
  );
}
