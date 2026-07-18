import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Button } from '@aiops/shared/ui';
import { useComboSpecs } from '@aiops/shared/hooks';

const CARD_TONES: Record<string, { shell: string; icon: string; chip: string; footer: string; panel: string }> = {
  'combo-internet-app': {
    shell: 'border-[#E5C7BC] bg-[linear-gradient(180deg,#FFF8F5_0%,#FFFFFF_42%)] shadow-[0_12px_24px_rgba(148,35,25,0.06)]',
    icon: 'bg-[#FFF3EE] text-[#B45309]',
    chip: 'border-[#F2D6CA] bg-[#FFF6F1] text-[#9A3412]',
    footer: 'text-[#9A3412]',
    panel: 'border-[#F3DDD4] bg-white/95',
  },
  'combo-test': {
    shell: 'border-[#CFE0F3] bg-[linear-gradient(180deg,#F8FBFF_0%,#FFFFFF_42%)] shadow-[0_12px_24px_rgba(37,99,235,0.06)]',
    icon: 'bg-[#EEF6FF] text-[#2563EB]',
    chip: 'border-[#D9E8FB] bg-[#F3F8FF] text-[#1D4ED8]',
    footer: 'text-[#1D4ED8]',
    panel: 'border-[#DCE9F8] bg-white/95',
  },
  'combo-data': {
    shell: 'border-[#D8E7D2] bg-[linear-gradient(180deg,#FBFDF8_0%,#FFFFFF_42%)] shadow-[0_12px_24px_rgba(22,101,52,0.06)]',
    icon: 'bg-[#F1F8EE] text-[#15803D]',
    chip: 'border-[#DCEFD5] bg-[#F4FBF1] text-[#166534]',
    footer: 'text-[#166534]',
    panel: 'border-[#E0EFDB] bg-white/95',
  },
  'combo-ha': {
    shell: 'border-[#E8D9BD] bg-[linear-gradient(180deg,#FFFDF7_0%,#FFFFFF_42%)] shadow-[0_12px_24px_rgba(161,98,7,0.06)]',
    icon: 'bg-[#FFF7E8] text-[#A16207]',
    chip: 'border-[#F1E3BF] bg-[#FFFAED] text-[#A16207]',
    footer: 'text-[#92400E]',
    panel: 'border-[#F2E6C6] bg-white/95',
  },
};

const COMBO_HINTS: Record<string, { summary: string; deliverable: string }> = {
  'combo-internet-app': {
    summary: '面向新应用上线场景，一次性梳理应用部署、数据库、域名访问和网络发布需求，减少多团队往返沟通。',
    deliverable: '交付域名与入口链路、容器或主机运行环境、数据库实例，以及日志、备份、安全等基础配套能力。',
  },
  'combo-test': {
    summary: '面向开发联调、功能验证和验收准备场景，快速申请一套可直接用于测试的完整环境。',
    deliverable: '交付测试所需计算资源、基础中间件、日志与监控能力，便于后续联调、回归和验收使用。',
  },
  'combo-data': {
    summary: '面向数据分析、报表处理和数据治理场景，统一规划平台底座、存储能力和运行保障方案。',
    deliverable: '交付数据库或数据平台集群，并同步准备监控、备份、权限控制和运行保障能力。',
  },
  'combo-ha': {
    summary: '面向关键生产系统建设，按高可用、容灾和连续性要求设计整体运行环境与交付策略。',
    deliverable: '交付多可用区生产环境、负载均衡与高可用数据库方案，并覆盖监控、备份和故障切换相关能力。',
  },
};

export function ComboCardGrid() {
  const navigate = useNavigate();
  const combos = useComboSpecs('online');

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">快速开始</h2>
          <p className="mt-1 text-sm text-muted-foreground">适用于已经明确业务场景，希望按整套环境、组件和配套能力一起发起申请的场景。</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {combos.map(combo => (
          (() => {
            const hint = COMBO_HINTS[combo.id] ?? {
              summary: combo.description,
              deliverable: '提交后可在“我的工单”查看方案、进度和交付资产。',
            };
            const tone = CARD_TONES[combo.id] ?? CARD_TONES['combo-internet-app'];
            return (
          <Card
            key={combo.id}
            className={`cursor-pointer rounded-[22px] border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(15,23,42,0.08)] ${tone.shell}`}
            onClick={() => navigate(`/apply/${combo.id}`)}
          >
            <CardContent className="p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-sm ring-1 ring-white/80 ${tone.icon}`}>
                    {combo.icon}
                  </div>
                  <div className="min-w-0">
                    <div className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${tone.chip}`}>
                      {combo.display?.category || '组合服务'}
                    </div>
                    <h3 className="mt-2 min-h-[40px] text-[15px] font-semibold leading-5 text-slate-900">
                      {combo.name}
                    </h3>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 rounded-full border border-white/80 bg-white/90 px-3 text-xs text-slate-700 transition-colors hover:bg-slate-900 hover:text-white"
                  onClick={(e) => { e.stopPropagation(); navigate(`/apply/${combo.id}`); }}
                >
                  发起需求
                </Button>
              </div>

              <div className={`rounded-2xl border px-3 py-3 ${tone.panel}`}>
                <div className="min-h-[68px] text-sm font-medium leading-6 text-slate-900">
                  {hint.summary}
                </div>
                <div className="mt-2 rounded-xl bg-slate-50/80 px-3 py-2 text-xs leading-5 text-slate-600">
                  {hint.deliverable}
                </div>
              </div>

              <div className="mt-3 flex min-h-[30px] flex-wrap gap-1.5">
                {combo.tags.map(tag => (
                  <span key={tag} className={`rounded-full border px-2 py-0.5 text-[10px] ${tone.chip}`}>
                    {tag}
                  </span>
                ))}
              </div>

              <div className={`mt-3 grid grid-cols-3 gap-2 border-t border-black/5 pt-3 text-[11px] ${tone.footer}`}>
                <div className="rounded-2xl bg-white/80 px-2.5 py-2 text-center">
                  <div className="text-[10px] text-slate-500">对象</div>
                  <div className="mt-1 font-medium">{combo.targetAudience === 'business' ? '业务申请' : '架构申请'}</div>
                </div>
                <div className="rounded-2xl bg-white/80 px-2.5 py-2 text-center">
                  <div className="text-[10px] text-slate-500">SLA</div>
                  <div className="mt-1 font-medium">{combo.sla.level.toUpperCase()}</div>
                </div>
                <div className="rounded-2xl bg-white/80 px-2.5 py-2 text-center">
                  <div className="text-[10px] text-slate-500">节点</div>
                  <div className="mt-1 font-medium">{combo.assembly.deliveryFlow.length} 个</div>
                </div>
              </div>
            </CardContent>
          </Card>
            );
          })()
        ))}
      </div>
    </div>
  );
}
