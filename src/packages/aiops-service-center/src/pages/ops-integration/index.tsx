import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, getDeliveredAssets, useOrders } from '@aiops/shared';
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowRight,
  Building,
  ClipboardCheck,
  LayoutDashboard,
  Settings,
  Shield,
} from 'lucide-react';
import { PageHeader } from '../../components/page-header';

interface ServiceItem {
  key: string;
  label: string;
  isExtended?: boolean;
}

interface DomainConfig {
  key: string;
  label: string;
  role: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  services: ServiceItem[];
}

interface LayerConfig {
  key: string;
  eyebrow: string;
  title: string;
  summary: string;
  accent: string;
  lightAccent: string;
  borderAccent: string;
  textAccent: string;
  domains: string[];
  status: (metrics: ReturnType<typeof useOpsMetrics>) => { label: string; value: string; tone: 'neutral' | 'info' | 'warning' | 'success' };
}

const DOMAIN_CONFIGS: Record<string, DomainConfig> = {
  'dc-facility': {
    key: 'dc-facility',
    label: '机房设施',
    role: '底座承载',
    icon: Building,
    path: '/dc-facility',
    services: [
      { key: 'rack', label: '机位管理' },
      { key: 'cabling', label: '综合布线' },
      { key: 'environment', label: '环境监控' },
      { key: 'asset', label: '资产管理' },
      { key: 'backup', label: '备份恢复', isExtended: true },
      { key: 'network', label: '网络拓扑', isExtended: true },
    ],
  },
  'monitoring-center': {
    key: 'monitoring-center',
    label: '监控中心',
    role: '持续感知',
    icon: Activity,
    path: '/monitoring-center',
    services: [
      { key: 'dashboard', label: '监控面板' },
      { key: 'alert-rule', label: '告警规则' },
      { key: 'metric', label: '指标采集' },
      { key: 'slo', label: 'SLO/SLA' },
      { key: 'log', label: '日志检索', isExtended: true },
      { key: 'alert-ops', label: '告警运营', isExtended: true },
    ],
  },
  'security-ops': {
    key: 'security-ops',
    label: '安全运维',
    role: '风险防护',
    icon: Shield,
    path: '/security-ops',
    services: [
      { key: 'vuln', label: '漏洞管理' },
      { key: 'incident', label: '事件响应' },
      { key: 'compliance', label: '合规审计' },
      { key: 'threat', label: '威胁检测' },
    ],
  },
  'fault-handling': {
    key: 'fault-handling',
    label: '故障处理',
    role: '事件闭环',
    icon: AlertTriangle,
    path: '/fault-handling',
    services: [
      { key: 'discovery', label: '故障发现' },
      { key: 'rca', label: '根因定位' },
      { key: 'emergency', label: '应急处置' },
      { key: 'review', label: '故障复盘' },
    ],
  },
  'ops-management': {
    key: 'ops-management',
    label: '运维管理',
    role: '治理收敛',
    icon: Settings,
    path: '/ops-management',
    services: [
      { key: 'change', label: '变更管理' },
      { key: 'release', label: '发布管理' },
      { key: 'capacity', label: '容量管理' },
      { key: 'knowledge', label: '知识库' },
    ],
  },
};

const LAYERS: LayerConfig[] = [
  {
    key: 'facility',
    eyebrow: '01',
    title: '基础设施层',
    summary: '容量、环境、供给和承载类问题，从机房设施与资产配置进入。',
    accent: 'bg-slate-900',
    lightAccent: 'bg-slate-50',
    borderAccent: 'border-slate-200',
    textAccent: 'text-slate-700',
    domains: ['dc-facility'],
    status: metrics => ({
      label: '交付前台受理',
      value: `${metrics.frontDeskAcceptance} 个待受理`,
      tone: metrics.frontDeskAcceptance > 0 ? 'info' : 'neutral',
    }),
  },
  {
    key: 'observe',
    eyebrow: '02',
    title: '感知与防护层',
    summary: '判断异常、暴露面和安全水位，从监控、安全与日志告警进入。',
    accent: 'bg-blue-600',
    lightAccent: 'bg-blue-50',
    borderAccent: 'border-blue-200',
    textAccent: 'text-blue-700',
    domains: ['monitoring-center', 'security-ops'],
    status: metrics => ({
      label: '用户待确认方案',
      value: `${metrics.planConfirming} 个待确认`,
      tone: metrics.planConfirming > 0 ? 'warning' : 'neutral',
    }),
  },
  {
    key: 'incident',
    eyebrow: '03',
    title: '运行处置层',
    summary: '问题已确认后，转入故障处理完成恢复、定位与复盘。',
    accent: 'bg-amber-600',
    lightAccent: 'bg-amber-50',
    borderAccent: 'border-amber-200',
    textAccent: 'text-amber-700',
    domains: ['fault-handling'],
    status: metrics => ({
      label: '交付执行',
      value: `${metrics.delivering} 个交付中`,
      tone: metrics.delivering > 0 ? 'warning' : 'neutral',
    }),
  },
  {
    key: 'governance',
    eyebrow: '04',
    title: '运营治理层',
    summary: '把变更、发布、容量和知识收回到运维管理，减少重复成本。',
    accent: 'bg-emerald-600',
    lightAccent: 'bg-emerald-50',
    borderAccent: 'border-emerald-200',
    textAccent: 'text-emerald-700',
    domains: ['ops-management'],
    status: metrics => ({
      label: '资产台账',
      value: `${metrics.archivedAssets} 个资产记录`,
      tone: metrics.archivedAssets > 0 ? 'success' : 'neutral',
    }),
  },
];

const TONE_STYLES = {
  neutral: 'bg-slate-100 text-slate-600',
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
  success: 'bg-emerald-100 text-emerald-700',
};

function useOpsMetrics() {
  const { allOrders } = useOrders();

  return useMemo(() => {
    const frontDeskAcceptance = allOrders.filter(o =>
      o.status === 'processing' &&
      o.itsm?.status === 'approved' &&
      o.deliveryAcceptance?.status !== 'plan_ready'
    ).length;
    const planConfirming = allOrders.filter(o => o.status === 'plan_confirming').length;
    const delivering = allOrders.filter(o => o.status === 'delivering').length;
    const archivedAssets = getDeliveredAssets().length;

    return {
      frontDeskAcceptance,
      planConfirming,
      delivering,
      archivedAssets,
    };
  }, [allOrders]);
}

export function OpsIntegration() {
  const navigate = useNavigate();
  const metrics = useOpsMetrics();

  const kpiCards = [
    {
      key: 'active',
      icon: Activity,
      label: '交付前台受理',
      value: metrics.frontDeskAcceptance,
      desc: 'ITSM / 资源审批通过后，由交付中心前台正式受理',
      tone: metrics.frontDeskAcceptance > 0 ? ('text-blue-600' as const) : ('text-slate-700' as const),
      bg: 'bg-blue-50',
    },
    {
      key: 'plan',
      icon: ClipboardCheck,
      label: '用户待确认方案',
      value: metrics.planConfirming,
      desc: '交付前台组织形成实施方案，等待申请人确认',
      tone: metrics.planConfirming > 0 ? ('text-amber-600' as const) : ('text-slate-700' as const),
      bg: 'bg-amber-50',
    },
    {
      key: 'assets',
      icon: Archive,
      label: '交付资产台账',
      value: metrics.archivedAssets,
      desc: '交付完成、验收或归档后沉淀的资产与配置记录',
      tone: metrics.archivedAssets > 0 ? ('text-emerald-600' as const) : ('text-slate-700' as const),
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<LayoutDashboard className="h-5 w-5" />}
        title="运维集成中心"
        description="作为交付到运行的协同入口，展示 ITSM / 资源审批通过后的交付中心前台受理事项、用户待确认的实施方案，以及交付完成后沉淀的资产台账。"
        actions={(
          <button
            onClick={() => navigate('/monitoring-center')}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            <Activity className="h-4 w-4" />
            进入监控中心
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      />

      <section className="grid gap-3 md:grid-cols-3">
        {kpiCards.map(kpi => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.key} className="border-slate-200 bg-white shadow-none">
              <CardContent className="p-3.5">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.bg}`}>
                  <Icon className={`h-4 w-4 ${kpi.tone}`} />
                </div>
                <div className="mt-2">
                  <div className={`text-2xl font-bold ${kpi.tone}`}>{kpi.value}</div>
                  <div className="text-sm font-medium text-slate-800">{kpi.label}</div>
                  <div className="text-xs text-slate-500">{kpi.desc}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Layer matrix */}
      <section>
          <div className="mb-3 flex items-center gap-2 px-1">
          <div className="text-sm font-medium text-slate-900">运行分层入口</div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">4 层 · 5 域</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {LAYERS.map(layer => {
            const status = layer.status(metrics);

            return (
              <Card
                key={layer.key}
                className={`overflow-hidden border-slate-200 shadow-none ${layer.lightAccent}`}
              >
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white ${layer.accent}`}
                    >
                      {layer.eyebrow}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-[15px] font-semibold text-slate-900">{layer.title}</div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TONE_STYLES[status.tone]}`}
                        >
                          {status.label} · {status.value}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs leading-5 text-slate-600">{layer.summary}</p>
                    </div>
                  </div>

                  {/* Domain entries */}
                  <div
                    className={`mt-3 grid gap-2.5 ${layer.domains.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}
                  >
                    {layer.domains.map(domainKey => {
                      const domain = DOMAIN_CONFIGS[domainKey];
                      const DomainIcon = domain.icon;

                      return (
                        <button
                          key={domain.key}
                          onClick={() => navigate(domain.path)}
                          className="group flex flex-col rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-700">
                              <DomainIcon className="h-4 w-4" />
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
                          </div>

                          <div className="mt-2">
                            <div className="text-sm font-semibold text-slate-900">{domain.label}</div>
                            <div className={`text-[10px] uppercase tracking-[0.12em] ${layer.textAccent}`}>
                              {domain.role}
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {domain.services.map(service => (
                              <span
                                key={service.key}
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                                  service.isExtended
                                    ? `${layer.lightAccent} ${layer.textAccent} ring-1 ${layer.borderAccent}`
                                    : 'bg-slate-50 text-slate-600 ring-1 ring-slate-100'
                                }`}
                              >
                                {service.label}
                              </span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
