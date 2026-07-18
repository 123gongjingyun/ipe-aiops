import { Card, CardContent, CardHeader, CardTitle } from '@aiops/shared';
import { Brain } from 'lucide-react';
import { PageHeader } from '../components/page-header';

const TITLE = 'AI 知识库';
const SUBTITLE = 'AI 驱动的运维知识管理与智能问答';
const ICON = Brain;

const SERVICES = [
  { name: '知识图谱', desc: '运维实体关系与知识图谱构建' },
  { name: '智能问答', desc: '基于知识库的自然语言问答' },
  { name: '经验沉淀', desc: '运维案例自动归档与标签' },
  { name: '模型训练', desc: '运维场景 AI 模型管理与迭代' },
];

export default function AIKnowledgePage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={<ICON className="h-5 w-5" />} title={TITLE} description={SUBTITLE} />
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
