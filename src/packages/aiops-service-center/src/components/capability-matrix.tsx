import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  SERVICE_TYPE_META,
  deriveAutomationLevel,
  deriveServiceType,
  getDeliveredAssets,
  groupSpecsByDomain,
  useAtomicSpecs,
} from '@aiops/shared';
import type { AutomationLevel, Order, ServiceType } from '@aiops/shared';
import { Boxes, Bot, Grid3X3, Link2, PackageCheck } from 'lucide-react';
import { PageHeader } from './page-header';

interface CapabilityMatrixProps {
  orders: Order[];
}

const serviceTypes = Object.keys(SERVICE_TYPE_META) as ServiceType[];

function getAutomationTone(total: number, automated: number) {
  if (total === 0) return 'bg-white text-slate-400 border-border';
  const ratio = automated / total;
  if (ratio >= 1) return 'bg-sky-100 text-sky-800 border-sky-200';
  if (ratio >= 0.75) return 'bg-sky-50 text-sky-700 border-sky-100';
  if (ratio >= 0.4) return 'bg-slate-100 text-slate-700 border-slate-200';
  if (ratio > 0) return 'bg-slate-50 text-slate-600 border-slate-100';
  return 'bg-white text-slate-500 border-slate-200';
}

function getFulfillmentTone(completed: number, total: number) {
  if (total === 0) return 'bg-slate-50 text-slate-500';
  const ratio = completed / total;
  if (ratio >= 0.8) return 'bg-emerald-50 text-emerald-700';
  if (ratio >= 0.4) return 'bg-amber-50 text-amber-700';
  return 'bg-slate-50 text-slate-700';
}

function getAssetTone(assetCount: number) {
  if (assetCount >= 8) return 'bg-emerald-100 text-emerald-800';
  if (assetCount >= 3) return 'bg-emerald-50 text-emerald-700';
  if (assetCount > 0) return 'bg-slate-50 text-slate-700';
  return 'bg-slate-50 text-slate-500';
}

function SummaryCard({ title, value, hint }: { title: string; value: number | string; hint: string }) {
  const styles = ({
    '原子服务': {
      badge: 'bg-slate-100 text-slate-700',
      value: 'text-slate-900',
      panel: 'bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)]',
      iconWrap: 'bg-slate-100 text-slate-700',
      icon: Boxes,
    },
    '自动化覆盖': {
      badge: 'bg-sky-100 text-sky-700',
      value: 'text-sky-700',
      panel: 'bg-[linear-gradient(180deg,_#ffffff_0%,_#eff6ff_100%)]',
      iconWrap: 'bg-sky-100 text-sky-700',
      icon: Bot,
    },
    '工单关联': {
      badge: 'bg-amber-100 text-amber-700',
      value: 'text-amber-700',
      panel: 'bg-[linear-gradient(180deg,_#ffffff_0%,_#fff7ed_100%)]',
      iconWrap: 'bg-amber-100 text-amber-700',
      icon: Link2,
    },
    '资产沉淀': {
      badge: 'bg-emerald-100 text-emerald-700',
      value: 'text-emerald-700',
      panel: 'bg-[linear-gradient(180deg,_#ffffff_0%,_#ecfdf5_100%)]',
      iconWrap: 'bg-emerald-100 text-emerald-700',
      icon: PackageCheck,
    },
  } as const)[title] ?? {
    badge: 'bg-slate-100 text-slate-700',
    value: 'text-slate-900',
    panel: 'bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)]',
    iconWrap: 'bg-slate-100 text-slate-700',
    icon: Boxes,
  };
  const Icon = styles.icon;

  return (
    <Card className={`overflow-hidden border-slate-200 shadow-none ${styles.panel}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${styles.iconWrap}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="text-sm font-medium text-slate-700">{title}</div>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${styles.badge}`}>总览</span>
        </div>
        <div className={`mt-2 text-2xl font-bold ${styles.value}`}>{value}</div>
        <div className="mt-1 text-xs leading-5 text-slate-500">{hint}</div>
      </CardContent>
    </Card>
  );
}

export function CapabilityMatrix({ orders }: CapabilityMatrixProps) {
  const navigate = useNavigate();
  const atomicSpecs = useAtomicSpecs();
  const grouped = groupSpecsByDomain(atomicSpecs);
  const deliveredAssets = getDeliveredAssets();

  const domainRows = useMemo(() => grouped.map(domain => {
    const specs = domain.categories.flatMap(category => category.specs);
    const specNames = new Set(specs.map(spec => spec.name));
    const cells = serviceTypes.map(type => {
      const matched = specs.filter(spec => deriveServiceType(spec) === type);
      const online = matched.filter(spec => spec.status === 'online').length;
      const automated = matched.filter(spec => deriveAutomationLevel(spec) !== 'manual').length;
      return { type, total: matched.length, online, automated };
    });

    const orderCount = orders.reduce((count, order) => (
      count + order.serviceProgress.filter(progress => specNames.has(progress.name)).length
    ), 0);

    const completedCount = orders.reduce((count, order) => (
      count + order.serviceProgress.filter(progress =>
        specNames.has(progress.name) &&
        (progress.status === 'completed' || progress.status === 'confirmed'),
      ).length
    ), 0);

    const assetCount = deliveredAssets.filter(asset => specNames.has(asset.serviceName)).length;
    const onlineCount = specs.filter(spec => spec.status === 'online').length;
    const automatedCount = specs.filter(spec => deriveAutomationLevel(spec) !== 'manual').length;

    return {
      domain,
      cells,
      total: specs.length,
      onlineCount,
      orderCount,
      completedCount,
      assetCount,
      automatedCount,
    };
  }), [grouped, orders, deliveredAssets]);

  const automationStats = useMemo(() => (
    atomicSpecs.reduce<Record<AutomationLevel, number>>((acc, spec) => {
      const level = deriveAutomationLevel(spec);
      acc[level] += 1;
      return acc;
    }, { manual: 0, semi: 0, full: 0 })
  ), [atomicSpecs]);

  const totalOnline = atomicSpecs.filter(spec => spec.status === 'online').length;
  const totalOrderLinks = orders.reduce((sum, order) => sum + order.serviceProgress.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Grid3X3 className="h-5 w-5" />}
        title="能力矩阵"
        description="一级页面只保留能力总览。点击领域后进入二级详情页查看服务明细、工单履约和资产沉淀。"
      />

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard title="原子服务" value={atomicSpecs.length} hint={`已上线 ${totalOnline} 项`} />
        <SummaryCard title="自动化覆盖" value={automationStats.semi + automationStats.full} hint={`全自动 ${automationStats.full} / 半自动 ${automationStats.semi}`} />
        <SummaryCard title="工单关联" value={totalOrderLinks} hint="按服务进度统计关联工单项" />
        <SummaryCard title="资产沉淀" value={deliveredAssets.length} hint="来自已归档交付资产" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">能力总览矩阵</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="min-w-[180px] border-b p-2 text-left font-semibold">领域</th>
                  {serviceTypes.map(type => (
                    <th key={type} className="min-w-[120px] border-b p-2 text-center font-semibold">
                      {SERVICE_TYPE_META[type].label}
                    </th>
                  ))}
                  <th className="border-b p-2 text-center font-semibold">履约</th>
                  <th className="border-b p-2 text-center font-semibold">资产</th>
                </tr>
              </thead>
              <tbody>
                {domainRows.map(row => (
                  <tr key={row.domain.key} className="border-b last:border-b-0">
                    <td className="p-2">
                      <button
                        onClick={() => navigate(`/matrix/${row.domain.key}`)}
                        className="text-left hover:text-primary"
                      >
                        <div className="font-medium text-foreground">{row.domain.icon} {row.domain.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {row.onlineCount}/{row.total} 已上线 · {row.automatedCount}/{row.total} 已自动化
                        </div>
                      </button>
                    </td>
                    {row.cells.map(cell => {
                      const pct = cell.total > 0 ? Math.round((cell.automated / cell.total) * 100) : 0;
                      const cellTone = getAutomationTone(cell.total, cell.automated);
                      return (
                        <td key={cell.type} className="p-2 text-center">
                          {cell.total > 0 ? (
                            <button
                              onClick={() => navigate(`/matrix/${row.domain.key}`)}
                              className={`w-full rounded-lg border px-2 py-2 transition-colors hover:border-primary/40 ${cellTone}`}
                            >
                              <div className="text-sm font-semibold">{cell.total}</div>
                              <div className="text-[10px] opacity-80">{cell.online} 上线</div>
                              <div className="mt-1 text-[10px] font-medium">{pct}% 自动化</div>
                            </button>
                          ) : (
                            <div className="w-full rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2 py-2 text-slate-400">
                              <div className="text-sm font-semibold">0</div>
                              <div className="text-[10px]">0 上线</div>
                              <div className="mt-1 text-[10px] font-medium">0% 自动化</div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-2 text-center">
                      <div className={`rounded-lg px-2 py-2 ${getFulfillmentTone(row.completedCount, row.orderCount)}`}>
                        <div className="text-sm font-semibold">{row.completedCount}/{row.orderCount || 0}</div>
                        <div className="text-[10px] opacity-80">完成/总工单项</div>
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <div className={`rounded-lg px-2 py-2 ${getAssetTone(row.assetCount)}`}>
                        <div className="text-sm font-semibold">{row.assetCount}</div>
                        <div className="text-[10px] opacity-80">已沉淀</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
