import { Card, CardContent } from './ui/card';
import { StatusBadge } from './status-badge';
import type { Order } from '../types';
import { formatDate } from '../lib/utils';

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
  onHover?: () => void;
}

export function OrderCard({ order, onClick, onHover }: OrderCardProps) {
  return (
    <Card
      className={`cursor-pointer hover:border-border-hover transition-colors ${onClick ? '' : ''}`}
      onClick={onClick}
      onMouseEnter={onHover}
      onFocus={onHover}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={event => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-mono text-primary">{order.id}</span>
          <StatusBadge status={order.status} />
        </div>
        <div className="font-medium text-sm mb-1">{order.comboName}</div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{order.services.length} 个服务</span>
          <span>{order.createdAt}</span>
        </div>
      </CardContent>
    </Card>
  );
}
