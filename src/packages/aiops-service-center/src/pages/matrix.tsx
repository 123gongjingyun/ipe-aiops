import { CapabilityMatrix } from '../components/capability-matrix';
import { useOrders } from '@aiops/shared';

export function Matrix() {
  const { orders } = useOrders();
  return <CapabilityMatrix orders={orders} />;
}
