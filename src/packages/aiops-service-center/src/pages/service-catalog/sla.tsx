import {
  SLA_PRESETS,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
} from '@aiops/shared';
import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../components/page-header';

const SLA_META: Record<string, { label: string; color: string; desc: string }> = {
  gold: { label: '金牌 SLA', color: 'bg-amber-100 text-amber-700', desc: '最高服务等级，适用于核心生产业务' },
  silver: { label: '银牌 SLA', color: 'bg-gray-100 text-gray-600', desc: '标准服务等级，适用于一般业务系统' },
  bronze: { label: '铜牌 SLA', color: 'bg-orange-100 text-orange-700', desc: '基础服务等级，适用于非关键系统' },
};

const FIELDS: { key: keyof typeof SLA_PRESETS.gold; label: string }[] = [
  { key: 'availability', label: '可用性' },
  { key: 'rto', label: 'RTO（恢复时间）' },
  { key: 'rpo', label: 'RPO（恢复点）' },
  { key: 'responseTime', label: '响应时间' },
  { key: 'maintenanceWindow', label: '维护窗口' },
  { key: 'escalationPolicy', label: '升级策略' },
];

export function SLAManagement() {
  return (
    <div>
      <div className="mb-6">
        <PageHeader
          icon={<ShieldCheck className="h-5 w-5" />}
          title="SLA 管理"
          description="统一查看和维护平台服务等级协议，明确不同业务场景下的可用性、恢复和响应标准。"
        />
      </div>

      <div className="space-y-6">
        {Object.entries(SLA_PRESETS).map(([key, sla]) => {
          const meta = SLA_META[key];
          return (
            <Card key={key}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{meta.label}</CardTitle>
                  <Badge className={meta.color}>{sla.level.toUpperCase()}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{meta.desc}</p>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-40">指标</TableHead>
                        <TableHead>配置值</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {FIELDS.map(field => (
                        <TableRow key={field.key}>
                          <TableCell className="font-medium text-sm">{field.label}</TableCell>
                          <TableCell className="text-sm">{sla[field.key]}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
