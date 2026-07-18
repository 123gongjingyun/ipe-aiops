import { useNavigate } from 'react-router-dom';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, StatusBadge } from '@aiops/shared';
import type { Order } from '@aiops/shared';

interface PendingOrdersProps {
  orders: Order[];
}

export function PendingOrders({ orders }: PendingOrdersProps) {
  const navigate = useNavigate();
  const pending = orders.filter(o => o.status === 'pending' || o.status === 'reviewing' || o.status === 'processing').slice(0, 5);

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold mb-3">待处理工单</h3>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">工单号</TableHead>
              <TableHead className="text-xs">服务组合</TableHead>
              <TableHead className="text-xs">状态</TableHead>
              <TableHead className="text-xs">创建时间</TableHead>
              <TableHead className="text-xs">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                  暂无待处理工单
                </TableCell>
              </TableRow>
            ) : (
              pending.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="text-xs font-mono text-primary">{order.id}</TableCell>
                  <TableCell className="text-xs">{order.comboName}</TableCell>
                  <TableCell className="text-xs"><StatusBadge status={order.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{order.createdAt}</TableCell>
                  <TableCell>
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => navigate(`/order/${order.id}`)}
                    >
                      查看 &rarr;
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
