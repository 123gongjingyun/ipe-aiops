import { useNavigate } from 'react-router-dom';
import { useOrders } from '@aiops/shared/hooks';
import { Button } from '@aiops/shared/ui';
import { OrderCard } from '@aiops/shared';

export function RecentOrders() {
  const navigate = useNavigate();
  const { orders } = useOrders();
  const recent = orders.slice(0, 3);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">最近申请</h2>
        <Button variant="ghost" size="sm" onClick={() => navigate('/orders')}>
          查看全部 →
        </Button>
      </div>
      {recent.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center bg-muted/30 rounded-lg">
          暂无申请记录
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {recent.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => navigate(`/order/${order.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
