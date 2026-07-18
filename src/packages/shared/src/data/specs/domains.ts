import type { AtomicServiceSpec } from '../../types';

export interface DomainInfo {
  name: string;
  icon: string;
}

export interface GroupedCategory {
  name: string;
  specs: AtomicServiceSpec[];
}

export interface GroupedDomain {
  key: string;
  name: string;
  icon: string;
  categories: GroupedCategory[];
}

export const DOMAIN_META: Record<string, DomainInfo> = {
  compute: { name: '计算资源', icon: '🖥️' },
  database: { name: '数据库', icon: '🗄️' },
  middleware: { name: '中间件', icon: '⚙️' },
  network: { name: '网络', icon: '🌐' },
  paas: { name: 'PaaS', icon: '☁️' },
  security: { name: '安全合规', icon: '🔐' },
  dc: { name: '机房设施', icon: '🏢' },
};

export function groupSpecsByDomain(specs: AtomicServiceSpec[]): GroupedDomain[] {
  const domainOrder = Object.keys(DOMAIN_META);
  const domainMap = new Map<string, Map<string, AtomicServiceSpec[]>>();

  for (const spec of specs) {
    if (!domainMap.has(spec.domain)) {
      domainMap.set(spec.domain, new Map());
    }
    const categories = domainMap.get(spec.domain)!;
    if (!categories.has(spec.category)) {
      categories.set(spec.category, []);
    }
    categories.get(spec.category)!.push(spec);
  }

  return domainOrder
    .filter(key => domainMap.has(key))
    .map(key => ({
      key,
      ...DOMAIN_META[key],
      categories: Array.from(domainMap.get(key)!.entries()).map(([name, specs]) => ({ name, specs })),
    }));
}
