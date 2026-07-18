import { Card, CardContent, CardHeader, CardTitle } from '@aiops/shared';
import { AlertTriangle } from 'lucide-react';

const TITLE = '故障处理';
const SUBTITLE = '故障发现、定位、处置与复盘';
const ICON = AlertTriangle;

const SERVICES = [
  { name: '故障发现', desc: '告警关联分析与故障自动识别' },
  { name: '根因定位', desc: '多维度数据关联与根因推荐' },
  { name: '应急处置', desc: '应急预案执行与止损操作' },
  { name: '故障复盘', desc: '故障时间线重建与改进措施' },
];

export default function FaultHandlingPage() {
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
