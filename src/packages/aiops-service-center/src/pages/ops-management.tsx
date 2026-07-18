import { Card, CardContent, CardHeader, CardTitle } from '@aiops/shared';
import { Settings } from 'lucide-react';

const TITLE = '运维管理';
const SUBTITLE = '标准化运维流程与自动化执行';
const ICON = Settings;

const SERVICES = [
  { name: '变更管理', desc: '变更申请、审批、执行与回滚' },
  { name: '发布管理', desc: '应用发布计划与灰度策略' },
  { name: '容量管理', desc: '资源容量规划与扩缩容' },
  { name: '知识库', desc: '运维知识沉淀与经验复用' },
];

export default function OpsManagementPage() {
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
