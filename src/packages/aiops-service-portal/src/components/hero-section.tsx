import { useNavigate } from 'react-router-dom';

export function HeroSection() {
  const navigate = useNavigate();

  const steps = [
    { label: '需求发起与架构评审', result: '提交业务目标、环境诉求与补充材料，由客户与供应商架构师确认建设边界和实施可行性。' },
    { label: 'ITSM / 资源审批', result: '由相关审批角色确认必要性、优先级、风险边界、资源准入条件和审批结果。' },
    { label: '前台受理与方案确认', result: '审批通过后由交付中心前台正式受理，形成实施方案、资源清单和配合事项，并由申请方确认。' },
    { label: '交付实施', result: '按确认方案执行资源开通、配置部署、联调验证与过程跟踪。' },
    { label: '验收归档', result: '确认交付结果，沉淀资产台账、配置信息与后续运维依据。' },
  ];

  return (
    <div className="rounded-[28px] mb-6 border border-[#E8B7AF] bg-[linear-gradient(135deg,#FFF6F2_0%,#FDEFE8_35%,#FFF9F4_100%)] px-6 py-6 shadow-[0_22px_48px_rgba(148,35,25,0.09)] ring-1 ring-white/70">
      <div className="text-[11px] uppercase tracking-[0.28em] text-primary/80 mb-3">
        GTMC AI-Native Delivery Portal
      </div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            GTMC 数智化交付门户（IPE/AIOps）
          </h1>
          <p className="text-muted-foreground text-sm leading-6">
            面向业务申请、架构评审与交付协同的统一入口，覆盖需求发起、架构评审、ITSM / 资源审批、交付中心前台受理、实施交付到验收归档的完整流程。
          </p>
        </div>
        <div className="rounded-2xl border border-[#E9CDC7] bg-white/92 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">交付主线</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">需求发起 → 架构评审 → ITSM审批 → 前台受理 → 交付实施 → 验收归档</div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-5">
        {steps.map((step, i) => (
          <div key={step.label} className="relative min-h-[162px] rounded-2xl border border-[#EACFC8] bg-[linear-gradient(180deg,#FFFDFB_0%,#FFF7F3_100%)] px-4 py-3 text-left shadow-[0_10px_20px_rgba(15,23,42,0.05)]">
            {i < steps.length - 1 && (
              <div className="pointer-events-none absolute right-[-24px] top-1/2 hidden h-3 w-12 -translate-y-1/2 items-center lg:flex">
                <div className="relative h-[2px] w-full rounded-full bg-[linear-gradient(90deg,rgba(235,10,30,0.18)_0%,rgba(235,10,30,0.4)_72%,rgba(235,10,30,0.55)_100%)]">
                  <div className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 rounded-[2px] border-r-2 border-t-2 border-primary/55 bg-transparent" />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white shadow-sm">
                {i + 1}
              </div>
              <div className="min-h-[28px] text-[11px] font-semibold leading-4 text-primary">{step.label}</div>
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-600">{step.result}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="max-w-3xl text-xs leading-5 text-slate-500">
          既可以按高频业务场景一键发起组合服务，也可以按资源类型逐项申请原子能力，提交后持续查看审批节点、交付进度和最终资产。
        </div>
        <button
          onClick={() => navigate('/help')}
          className="rounded-full border border-primary/15 bg-white px-4 py-2 text-xs font-medium text-primary transition-colors hover:border-primary/30 hover:bg-primary/5"
        >
          查看平台说明 →
        </button>
      </div>
    </div>
  );
}
