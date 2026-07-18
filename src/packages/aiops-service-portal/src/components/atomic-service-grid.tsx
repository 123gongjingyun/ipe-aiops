import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Tabs, TabsList, TabsTrigger, TabsContent, Button } from '@aiops/shared/ui';
import { groupSpecsByDomain } from '@aiops/shared/specs';
import { useAtomicSpecs } from '@aiops/shared/hooks';
import { resolveAtomicServiceUiProfile } from './atomic-service-ui-profiles';

const DOMAIN_HINTS: Record<string, { title: string; desc: string }> = {
  compute: { title: '资源单项申请', desc: '适用于已明确主机、云资源或存储诉求，需要按单项能力快速发起申请。' },
  database: { title: '资源单项申请', desc: '适用于已明确数据库类型、容量或高可用要求的场景。' },
  middleware: { title: '资源单项申请', desc: '适用于已明确消息、缓存、注册中心等中间件组件需求的场景。' },
  network: { title: '资源单项申请', desc: '适用于已明确网络访问、发布链路或域名入口要求的场景。' },
  paas: { title: '资源单项申请', desc: '适用于已明确容器平台、集群或平台侧配套能力需求的场景。' },
  security: { title: '资源单项申请', desc: '适用于需要单独申请安全防护、审计或合规能力的场景。' },
  dc: { title: '资源单项申请', desc: '适用于机房、机柜、网络接入等基础设施类需求。' },
};

export function AtomicServiceGrid() {
  const navigate = useNavigate();
  const atomicSpecs = useAtomicSpecs(undefined, 'online');

  const domains = useMemo(() => groupSpecsByDomain(atomicSpecs), [atomicSpecs]);

  const [activeDomain, setActiveDomain] = useState(domains[0]?.key ?? '');

  const handleApply = (serviceId: string) => {
    navigate(`/apply-service/${serviceId}`);
  };

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">按资源类型查看能力</h2>
          <p className="mt-1 text-sm text-muted-foreground">适用于已明确某一类资源、平台组件或基础设施需求，希望按单项能力逐个申请的场景。</p>
        </div>
      </div>
      <Tabs value={activeDomain} onValueChange={setActiveDomain}>
        <TabsList className="mb-4 flex-wrap h-auto gap-1 rounded-2xl bg-muted/50 p-1.5">
          {domains.map(domain => (
            <TabsTrigger key={domain.key} value={domain.key} className="rounded-xl text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
              {domain.icon} {domain.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {domains.map(domain => (
          <TabsContent key={domain.key} value={domain.key}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_100%)] px-4 py-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{domain.name}</div>
                <div className="mt-1 text-sm font-semibold text-foreground">{DOMAIN_HINTS[domain.key]?.title || '单项能力申请'}</div>
              </div>
              <div className="max-w-2xl text-sm leading-6 text-muted-foreground">{DOMAIN_HINTS[domain.key]?.desc || '确认所需能力后直接发起申请。'}</div>
            </div>
            {domain.categories.map(category => (
              <div key={category.name} className="mb-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-muted-foreground">{category.name}</h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">{category.specs.length} 项服务</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {category.specs.map(service => (
                    (() => {
                      const uiProfile = resolveAtomicServiceUiProfile(service);
                      return (
                        <Card
                          key={service.id}
                          className="group cursor-pointer rounded-[20px] border border-slate-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-muted-foreground/30 hover:shadow-[0_14px_24px_rgba(15,23,42,0.08)]"
                        >
                          <CardContent className="px-4 pt-4 pb-3 text-left">
                        <div className="min-h-[40px] text-sm font-medium leading-5 text-foreground">{service.name}</div>
                        <div className="mt-1 min-h-[60px] text-xs text-muted-foreground leading-5">
                          {service.serviceSummary || service.description}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">
                            {domain.name}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">
                            {category.name}
                          </span>
                          {uiProfile?.demoTag && (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">
                              {uiProfile.demoTag}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 pt-3 border-t border-border/60">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full rounded-full text-xs h-8 text-primary hover:bg-primary hover:text-white transition-colors"
                            onClick={() => handleApply(service.id)}
                          >
                            发起申请
                          </Button>
                        </div>
                          </CardContent>
                        </Card>
                      );
                    })()
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
