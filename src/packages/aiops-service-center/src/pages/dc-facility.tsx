import { Card, CardContent, CardHeader, CardTitle } from '@aiops/shared';
import { Building } from 'lucide-react';

const TITLE = '机房设施';
const SUBTITLE = '数据中心机房资源与环境管理';
const ICON = Building;

const SERVICES = [
  { name: '机位管理', desc: '服务器与网络设备机位分配' },
  { name: '综合布线', desc: '光纤/网线/电源布线管理' },
  { name: '环境监控', desc: '温湿度、电力、空调监控' },
  { name: '资产管理', desc: 'IT 资产台账与生命周期管理' },
];

export default function DCFacilityPage() {
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
