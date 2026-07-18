import { useAtomicSpecs, groupSpecsByDomain } from '@aiops/shared';
import type { Order } from '@aiops/shared';

interface DomainProgressProps {
  orders: Order[];
}

export function DomainProgress({ orders }: DomainProgressProps) {
  const atomicSpecs = useAtomicSpecs();
  const grouped = groupSpecsByDomain(atomicSpecs);

  // Count completed services per domain
  const domainStats = grouped.map(domain => {
    const domainServices = new Set(
      domain.categories.flatMap(c => c.specs.map(s => s.name))
    );
    // Count orders that have services matching this domain
    let completed = 0;
    let total = 0;
    orders.forEach(order => {
      order.serviceProgress.forEach(sp => {
        if (domainServices.has(sp.name)) {
          total++;
          if (sp.status === 'completed' || sp.status === 'confirmed') completed++;
        }
      });
    });
    return { ...domain, completed, total };
  });

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">能力领域执行状态</h3>
      <div className="grid grid-cols-2 gap-2">
        {domainStats.map(domain => {
          const pct = domain.total > 0 ? Math.round((domain.completed / domain.total) * 100) : 0;
          return (
            <div key={domain.key} className="bg-white border rounded-lg p-3">
              <div className="text-xs font-medium text-foreground mb-1">
                {domain.icon} {domain.name}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{domain.completed}/{domain.total}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
