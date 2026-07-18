import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AUTOMATION_LEVEL_META,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DOMAIN_META,
  SERVICE_TYPE_META,
  deriveAutomationLevel,
  deriveServiceType,
  getDeliveredAssets,
  groupSpecsByDomain,
  useAtomicSpecs,
  useOrders,
} from '@aiops/shared';
import type { AssetCategory, AtomicServiceSpec, AutomationLevel, ServiceType } from '@aiops/shared';

const automationLevels: AutomationLevel[] = ['manual', 'semi', 'full'];
const SPEC_PAGE_SIZE = 6;

export default function MatrixDetailPage() {
  const { domainKey } = useParams();
  const navigate = useNavigate();
  const atomicSpecs = useAtomicSpecs();
  const { orders } = useOrders();
  const deliveredAssets = getDeliveredAssets();
  const [specPage, setSpecPage] = useState(1);
  const grouped = groupSpecsByDomain(atomicSpecs);
  const row = useMemo(() => grouped.find(item => item.key === domainKey), [grouped, domainKey]);

  const specs = row?.categories.flatMap(category => category.specs) ?? [];
  const specNames = new Set(specs.map(spec => spec.name));

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

  const typeCounts = useMemo(() => {
    const counts = new Map<ServiceType, number>();
    specs.forEach(spec => {
      const type = deriveServiceType(spec);
      counts.set(type, (counts.get(type) || 0) + 1);
    });
    return Array.from(counts.entries());
  }, [specs]);

  const assetCategories = useMemo(() => {
    const counts = deliveredAssets.reduce<Record<string, number>>((acc, asset) => {
      if (!specNames.has(asset.serviceName)) return acc;
      acc[asset.category] = (acc[asset.category] || 0) + 1;
      return acc;
    }, {} as Record<AssetCategory, number>);
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [deliveredAssets, specNames]);

  const specTotalPages = Math.max(1, Math.ceil(specs.length / SPEC_PAGE_SIZE));
  const specCurrentPage = Math.min(specPage, specTotalPages);
  const pagedSpecs = specs.slice((specCurrentPage - 1) * SPEC_PAGE_SIZE, specCurrentPage * SPEC_PAGE_SIZE);

  if (!row) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold">能力矩阵详情</h1>
        <p className="text-sm text-muted-foreground">未找到对应领域。</p>
        <Button variant="outline" onClick={() => navigate('/matrix')}>返回能力矩阵</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">能力矩阵详情</div>
          <h1 className="mt-1 text-xl font-bold text-foreground">{row.icon} {row.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">查看该领域下的服务明细、工单履约、资产沉淀与交付自动化结构。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/matrix')}>返回总览</Button>
          <Button variant="outline" onClick={() => navigate(`/service-catalog?domain=${encodeURIComponent(domainKey || '')}&type=atomic`)}>查看服务目录</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard title="服务数" value={specs.length} hint="该领域原子服务总数" />
        <SummaryCard title="履约" value={`${completedCount}/${orderCount || 0}`} hint="完成 / 总工单项" />
        <SummaryCard title="资产沉淀" value={assetCount} hint="关联已归档资产" />
        <SummaryCard title="分类数" value={row.categories.length} hint="当前领域下服务分类" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">服务明细</CardTitle>
              <div className="text-xs text-muted-foreground">共 {specs.length} 项，每页 {SPEC_PAGE_SIZE} 项</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pagedSpecs.map((spec, index) => (
              <SpecListItem key={spec.id} spec={spec} serial={(specCurrentPage - 1) * SPEC_PAGE_SIZE + index + 1} />
            ))}
            {specTotalPages > 1 && (
              <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
                <div className="text-xs text-muted-foreground">第 {specCurrentPage} / {specTotalPages} 页</div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" disabled={specCurrentPage <= 1} onClick={() => setSpecPage(page => Math.max(1, page - 1))}>
                    上一页
                  </Button>
                  <Button size="sm" variant="outline" disabled={specCurrentPage >= specTotalPages} onClick={() => setSpecPage(page => Math.min(specTotalPages, page + 1))}>
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">关联摘要</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">交付自动化等级</div>
              <div className="mt-1 text-xs text-muted-foreground">表示该领域服务在交付过程中的自动执行比例，当前用于能力矩阵的运营标签统计，后续应从服务目录元数据显式维护。</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {automationLevels.map(level => {
                  const count = specs.filter(spec => deriveAutomationLevel(spec) === level).length;
                  return (
                    <Badge key={level} className={AUTOMATION_LEVEL_META[level].badgeClass}>
                      {AUTOMATION_LEVEL_META[level].label} {count}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">服务形态分布</div>
              <div className="mt-2 space-y-2">
                {typeCounts.map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between rounded-md bg-white px-3 py-2">
                    <span className="text-foreground">{SERVICE_TYPE_META[type].label}</span>
                    <span className="text-sm font-medium text-primary">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">资产热点分类</div>
              <div className="mt-2 space-y-2">
                {assetCategories.length > 0 ? assetCategories.map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between rounded-md bg-white px-3 py-2">
                    <span className="text-foreground">{category}</span>
                    <span className="text-sm font-medium text-primary">{count}</span>
                  </div>
                )) : <div className="text-xs text-muted-foreground">该领域暂无已沉淀资产</div>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => navigate(`/service-catalog?domain=${encodeURIComponent(domainKey || '')}&type=atomic`)}>查看服务目录</Button>
              <Button size="sm" variant="outline" onClick={() => navigate(`/orders?q=${encodeURIComponent(row.name)}`)}>查看相关工单</Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/service-ledger')}>查看交付资产</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, hint }: { title: string; value: number | string; hint: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}

function SpecListItem({ spec, serial }: { spec: AtomicServiceSpec; serial: number }) {
  const automation = deriveAutomationLevel(spec);
  const type = deriveServiceType(spec);

  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
            {serial}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-foreground">{spec.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">{spec.description}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{SERVICE_TYPE_META[type].label}</Badge>
          <Badge className={AUTOMATION_LEVEL_META[automation].badgeClass}>{AUTOMATION_LEVEL_META[automation].label}</Badge>
          <Badge className={spec.status === 'online' ? 'bg-emerald-100 text-emerald-700' : spec.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}>
            {spec.status === 'online' ? '可申请' : spec.status === 'draft' ? '草稿' : '已下线'}
          </Badge>
        </div>
      </div>
      <div className="mt-3 grid gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600 md:grid-cols-2">
        <div>服务形态：{SERVICE_TYPE_META[type].description}</div>
        <div>当前状态：{spec.status === 'online' ? '已上线，可直接申请和统计履约' : spec.status === 'draft' ? '草稿中，待完善后上架' : '已下线，仅保留历史记录'}</div>
      </div>
    </div>
  );
}
