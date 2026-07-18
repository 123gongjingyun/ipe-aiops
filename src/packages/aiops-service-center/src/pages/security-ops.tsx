import { Card, CardContent, CardHeader, CardTitle } from '@aiops/shared';
import { Shield } from 'lucide-react';

const TITLE = '安全运维';
const SUBTITLE = '安全事件响应、漏洞管理与合规审计';
const ICON = Shield;

const SERVICES = [
  { name: '漏洞管理', desc: '漏洞扫描、修复跟踪与补丁管理' },
  { name: '安全事件响应', desc: '安全事件定级、遏制与溯源' },
  { name: '合规审计', desc: '等保合规检查与审计日志' },
  { name: '威胁检测', desc: '实时威胁监控与告警研判' },
];

export default function SecurityOpsPage() {
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
