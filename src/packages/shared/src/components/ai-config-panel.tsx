import { Server, Database, Network, Layers, Boxes } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import type { OrchestratedPlan, ResourceRequest } from '../types';

interface AIConfigPanelProps {
  plan?: OrchestratedPlan | null;
  title?: string;
}

const RESOURCE_META: Record<ResourceRequest['type'], { label: string; icon: typeof Server; accent: string }> = {
  vm: { label: '计算', icon: Server, accent: 'bg-info-light text-info border-info/20' },
  db: { label: '数据库', icon: Database, accent: 'bg-warning-light text-warning border-warning/20' },
  network: { label: '网络', icon: Network, accent: 'bg-success-light text-success border-success/20' },
  paas: { label: 'PaaS', icon: Layers, accent: 'bg-primary/10 text-primary border-primary/20' },
  middleware: { label: '中间件', icon: Boxes, accent: 'bg-error-light text-error border-error/20' },
};

const INTEGRATION_LABELS: Record<string, string> = {
  monitor: '监控',
  logging: '日志',
  backup: '备份',
  security: '安全',
  pam: 'PAM',
};

export function AIConfigPanel({ plan, title = 'AI 推荐配置' }: AIConfigPanelProps) {
  const safePlan = plan ?? { summary: '暂无配置信息', estimatedTime: '-', resources: [], integrations: [] };
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{safePlan.summary}</p>
        <p className="text-xs text-muted-foreground">预计 {safePlan.estimatedTime}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {safePlan.resources.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">资源需求</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {safePlan.resources.map((r, i) => {
                  const meta = RESOURCE_META[r.type];
                  const Icon = meta.icon;
                  return (
                    <div key={i} className="rounded-md border bg-card p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${meta.accent}`}>
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                      </div>
                      <div className="text-sm font-medium leading-snug">{r.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 mb-2">{r.purpose}</div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {Object.entries(r.spec).map(([k, v]) => (
                          <span key={k} className="text-xs">
                            <span className="text-muted-foreground">{k}</span>
                            <span className="ml-1 font-medium text-foreground">{v}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {safePlan.integrations.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">集成服务</div>
              <div className="flex flex-wrap gap-2">
                {safePlan.integrations.map((int, i) => (
                  <Badge key={i} variant={int.enabled ? 'success' : 'secondary'} className="text-xs">
                    {INTEGRATION_LABELS[int.type] ?? int.type}
                    {int.enabled ? ' ✓' : ' ✗'}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
