import { useNavigate } from 'react-router-dom';

export function DashboardHero() {
  const navigate = useNavigate();

  const steps = [
    { label: '申请', desc: '提交需求 · 形成工单' },
    { label: '架构评审', desc: '边界校验 · 风险前置' },
    { label: '审批受理', desc: 'ITSM审批 · 前台受理' },
    { label: '交付实施', desc: '方案确认 · 执行交付' },
    { label: '验收归档', desc: '确认结果 · 资产沉淀' },
  ];

  const tags = [
    { label: 'IPE 平台服务交付' },
    { label: 'AIOps/SRE 运行保障' },
    { label: 'DevSecOps 安全护栏' },
  ];

  return (
    <div className="rounded-lg mb-6 bg-[#FEF5F4] px-6 py-6 text-center">
      <div className="text-[11px] uppercase tracking-widest text-primary mb-3">
        GTMC AI-Native Delivery Center
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-1">
        GTMC 数智化交付中心（IPE/AIOps）
      </h1>
      <p className="text-muted-foreground text-sm mb-5">从技术交付到业务价值创造</p>

      <div className="flex items-center justify-center gap-2 mb-5">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="rounded-md px-4 py-2.5 text-center min-w-[88px] bg-white">
              <div className="text-xs font-semibold text-foreground mb-0.5">{step.label}</div>
              <div className="text-[11px] text-muted-foreground">{step.desc}</div>
            </div>
            {i < steps.length - 1 && (
              <span className="text-primary/50 text-sm">&rarr;</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2">
        {tags.map((tag, i) => (
          <span key={i} className="text-[11px] px-3.5 py-1 rounded-full bg-primary/10 text-primary">
            {tag.label}
          </span>
        ))}
      </div>

      <button
        onClick={() => window.open(`${window.location.origin}/center/#/handbook`, '_blank')}
        className="mt-4 text-sm text-primary hover:underline inline-flex items-center gap-1"
      >
        了解更多 →
      </button>
    </div>
  );
}
