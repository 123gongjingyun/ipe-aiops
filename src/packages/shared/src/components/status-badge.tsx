import { Badge } from './ui/badge';
import type { OrderStatus } from '../types';

const statusConfig: Record<OrderStatus, { label: string; variant: 'warning' | 'info' | 'error' | 'success' | 'secondary' }> = {
  pending: { label: '待处理', variant: 'warning' },
  reviewing: { label: '评审中', variant: 'info' },
  processing: { label: '处理中', variant: 'info' },
  plan_confirming: { label: '待确认方案', variant: 'info' },
  delivering: { label: '交付中', variant: 'error' },
  completed: { label: '待验收', variant: 'success' },
  confirmed: { label: '已验收', variant: 'success' },
  archived: { label: '已归档', variant: 'secondary' },
};

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.pending;
  return <Badge variant={config.variant} className={className}>{config.label}</Badge>;
}
