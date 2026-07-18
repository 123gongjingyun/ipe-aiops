import { Card, CardContent, CardHeader, CardTitle } from '@aiops/shared';
import { Activity } from 'lucide-react';

const TITLE = '监控中心';
const SUBTITLE = '统一的可观测性与监控管理平台';
const ICON = Activity;

const SERVICES = [
  { name: '监控面板管理', desc: 'Grafana/Prometheus 仪表板配置与管理' },
  { name: '告警规则配置', desc: '告警阈值、通知渠道与升级策略' },
  { name: '指标采集配置', desc: '应用与基础设施指标采集规则' },
  { name: 'SLO/SLA 监控', desc: '服务等级目标与可用性跟踪' },
];

export default function MonitoringCenterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ICON className="h-6 w-6" /> {TITLE}
        </h1>
        <p className="text-muted-foreground mt-1">{SUBTITLE}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SERVICES.map(s => (
          <Card key={s.name}>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{s.name}</CardTitle></CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">{s.desc}</p></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
