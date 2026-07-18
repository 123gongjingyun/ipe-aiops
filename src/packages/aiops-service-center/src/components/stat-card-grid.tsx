import { Card, CardContent } from '@aiops/shared';
import type { Order } from '@aiops/shared';

interface StatCardGridProps {
  orders: Order[];
}

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '待处理', color: 'text-warning', bg: 'bg-warning-light border-warning/20' },
  reviewing: { label: '评审中', color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200' },
  processing: { label: '处理中', color: 'text-info', bg: 'bg-info-light border-info/20' },
  plan_confirming: { label: '待确认方案', color: 'text-info', bg: 'bg-info-light border-info/20' },
  delivering: { label: '交付中', color: 'text-error', bg: 'bg-error-light border-error/20' },
  completed: { label: '待验收', color: 'text-success', bg: 'bg-success-light border-success/20' },
  confirmed: { label: '已验收', color: 'text-success', bg: 'bg-success-light border-success/20' },
  archived: { label: '已归档', color: 'text-slate-700', bg: 'bg-slate-100 border-slate-200' },
};

export function StatCardGrid({ orders }: StatCardGridProps) {
  const counts = Object.entries(statusLabels).map(([status, config]) => ({
    ...config,
    count: orders.filter(o => o.status === status).length,
  }));

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
      {counts.map(item => (
        <Card key={item.label} className={`border ${item.bg}`}>
          <CardContent className="p-3 text-center">
            <div className="text-[10px] text-muted-foreground">{item.label}</div>
            <div className={`text-2xl font-bold ${item.color}`}>{item.count}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
