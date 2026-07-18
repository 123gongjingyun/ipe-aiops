import type { DeliveryDetail } from '../types';
import type { AtomicServiceSpec } from '../types';
import { IntegrationStatus } from './integration-status';

interface DeliveryDetailPanelProps {
  detail?: DeliveryDetail;
  spec?: AtomicServiceSpec;
}

export function DeliveryDetailPanel({ detail, spec }: DeliveryDetailPanelProps) {
  // Spec-based rendering: use outputSchema to dynamically render fields
  if (spec && spec.outputSchema.length > 0) {
    const fields = spec.outputSchema;

    return (
      <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
        {fields.map(f => (
          <div key={f.key} className="flex items-center gap-2 py-1">
            <span className="text-xs text-muted-foreground w-24 shrink-0">{f.label}</span>
            <span className="text-sm font-mono">{f.defaultValue ?? '—'}</span>
          </div>
        ))}
      </div>
    );
  }

  // Fallback: if no spec and no detail, render nothing
  if (!detail) return null;

  // Original detail-based rendering
  // Helper to render key-value rows
  const KV = ({ label, value, copyable }: { label: string; value: string | number; copyable?: boolean }) => (
    <div className="flex items-center gap-2 py-1">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="text-sm font-mono">{value}</span>
      {copyable && (
        <button
          className="text-xs text-primary hover:underline"
          onClick={() => navigator.clipboard?.writeText(String(value))}
        >复制</button>
      )}
    </div>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-3">
      <div className="text-xs font-medium text-muted-foreground mb-1">{title}</div>
      {children}
    </div>
  );

  switch (detail.type) {
    case 'vm':
      return (
        <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
          <Section title="资产信息">
            <KV label="资产编号" value={detail.asset.assetId} copyable />
            <KV label="位置" value={detail.asset.location} />
            <KV label="机位" value={detail.asset.rackUnit} />
          </Section>
          <Section title="网络">
            <KV label="主机名" value={detail.network.hostname} />
            <KV label="IP地址" value={detail.network.ip} copyable />
            <KV label="VLAN" value={detail.network.vlan} />
          </Section>
          <Section title="规格">
            <KV label="CPU" value={detail.spec.cpu} />
            <KV label="内存" value={detail.spec.memory} />
            <KV label="系统盘" value={detail.spec.systemDisk} />
            <KV label="数据盘" value={detail.spec.dataDisk} />
            <KV label="操作系统" value={detail.spec.os} />
          </Section>
          <Section title="集成服务">
            <IntegrationStatus integrations={detail.integrations} />
          </Section>
        </div>
      );

    case 'db':
      return (
        <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
          <Section title="资产信息">
            <KV label="资产编号" value={detail.asset.assetId} copyable />
            <KV label="实例名" value={detail.asset.instance} />
          </Section>
          <Section title="连接信息">
            <KV label="主机" value={detail.connection.host} copyable />
            <KV label="端口" value={detail.connection.port} />
            <KV label="Schema" value={detail.connection.schema} />
          </Section>
          <Section title="高可用">
            <KV label="模式" value={detail.ha.mode} />
            <KV label="主节点" value={detail.ha.primary} copyable />
            <KV label="从节点" value={detail.ha.secondary} copyable />
          </Section>
          <Section title="集成服务">
            <IntegrationStatus integrations={detail.integrations} />
          </Section>
        </div>
      );

    case 'network':
      return (
        <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
          <Section title="连接">
            <KV label="VIP" value={detail.connection.vip} copyable />
            <KV label="域名" value={detail.connection.domain} copyable />
            <KV label="协议" value={detail.connection.protocol} />
            <KV label="端口" value={detail.connection.port} />
          </Section>
          <Section title="防火墙规则">
            {detail.firewall.rules.map((r, i) => (
              <KV key={i} label={`规则 ${i + 1}`} value={`${r.source} → ${r.target} (${r.action})`} />
            ))}
          </Section>
          <Section title="集成服务">
            <IntegrationStatus integrations={detail.integrations} />
          </Section>
        </div>
      );

    case 'paas':
      return (
        <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
          <Section title="集群">
            <KV label="集群名" value={detail.cluster.name} />
            <KV label="API Server" value={detail.cluster.apiServer} copyable />
            <KV label="版本" value={detail.cluster.version} />
          </Section>
          <Section title="命名空间">
            <KV label="名称" value={detail.namespace.name} />
            <KV label="节点数" value={detail.namespace.nodeCount} />
            <KV label="资源配额" value={detail.namespace.resourceQuota} />
          </Section>
          <Section title="集成服务">
            <IntegrationStatus integrations={detail.integrations} />
          </Section>
        </div>
      );

    case 'middleware':
      return (
        <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
          <Section title="连接">
            <KV label="地址" value={`${detail.connection.url}:${detail.connection.port}`} copyable />
            <KV label="协议" value={detail.connection.protocol} />
          </Section>
          <Section title="管理">
            <KV label="控制台" value={detail.management.console} copyable />
          </Section>
          <Section title="拓扑">
            {detail.topology.exchanges.length > 0 && <KV label="Exchanges" value={detail.topology.exchanges.join(', ')} />}
            {detail.topology.queues.length > 0 && <KV label="Queues" value={detail.topology.queues.join(', ')} />}
          </Section>
          <Section title="集成服务">
            <IntegrationStatus integrations={detail.integrations} />
          </Section>
        </div>
      );

    case 'monitor':
      return (
        <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
          <Section title="监控">
            <KV label="Grafana" value={detail.grafana.url} copyable />
            <KV label="Dashboard" value={detail.grafana.dashboard} />
            <KV label="Prometheus" value={detail.prometheus.url} />
            <KV label="Targets" value={detail.prometheus.targets} />
          </Section>
          <Section title="告警">
            {detail.alerts.map((a, i) => (
              <KV key={i} label={a.name} value={`${a.condition} → ${a.channel}`} />
            ))}
          </Section>
        </div>
      );

    case 'security':
      return (
        <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
          <Section title="WAF"><KV label="状态" value={detail.waf.status} /><KV label="规则数" value={detail.waf.rules} /></Section>
          <Section title="扫描"><KV label="报告" value={detail.scan.reportUrl} copyable /><KV label="风险等级" value={detail.scan.riskLevel} /></Section>
          <Section title="SSL"><KV label="域名" value={detail.ssl.domain} /><KV label="有效期" value={detail.ssl.expiry} /></Section>
        </div>
      );

    case 'backup':
      return (
        <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
          <Section title="策略">
            <KV label="调度" value={detail.policy.schedule} />
            <KV label="保留" value={detail.policy.retention} />
            <KV label="存储" value={detail.policy.storage} />
          </Section>
          <Section title="最近备份">
            <KV label="时间" value={detail.lastBackup.time} />
            <KV label="大小" value={detail.lastBackup.size} />
            <KV label="状态" value={detail.lastBackup.status} />
          </Section>
        </div>
      );

    case 'logging':
      return (
        <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
          <Section title="采集">
            <KV label="Agent" value={`${detail.agent.name} ${detail.agent.version}`} />
            <KV label="状态" value={detail.agent.status} />
          </Section>
          <Section title="集群">
            <KV label="ES节点" value={detail.cluster.esNodes} />
            <KV label="Kibana" value={detail.cluster.kibanaUrl} copyable />
            <KV label="索引模式" value={detail.cluster.indexPattern} />
          </Section>
        </div>
      );
  }
}
