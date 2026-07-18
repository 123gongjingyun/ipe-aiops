import { DashboardHero } from '../components/dashboard-hero';
import { StatCardGrid } from '../components/stat-card-grid';
import { PendingOrders } from '../components/pending-orders';
import { DomainProgress } from '../components/domain-progress';
import { useOrders } from '@aiops/shared/hooks';

export function Dashboard() {
  const { orders } = useOrders();

  return (
    <div>
      <DashboardHero />
      <StatCardGrid orders={orders} />
      <PendingOrders orders={orders} />
      <DomainProgress orders={orders} />
    </div>
  );
}
