import { useState } from 'react';
import { Server, Database, Network, Layers, Boxes, Activity, Shield, HardDrive, FileText, ChevronDown } from 'lucide-react';
import { StatusBadge } from './status-badge';
import { DeliveryDetailPanel } from './delivery-detail-panel';
import { Button } from './ui/button';
import type { ServiceProgress, DeliveryDetail } from '../types';

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-warning/60',
  reviewing: 'bg-sky-500/70',
  processing: 'bg-info animate-pulse',
  plan_confirming: 'bg-info/70',
  delivering: 'bg-primary animate-pulse',
  completed: 'bg-success',
  confirmed: 'bg-success',
};

const SERVICE_ICON: Record<string, typeof Server> = {
  vm: Server, database: Database, db: Database, mysql: Database,
  network: Network, lb: Network, vip: Network, firewall: Network,
  paas: Layers, k8s: Layers, namespace: Layers,
  middleware: Boxes, mq: Boxes, rabbitmq: Boxes, redis: Boxes,
  monitor: Activity, grafana: Activity, prometheus: Activity,
  security: Shield, waf: Shield, ssl: Shield,
  backup: HardDrive,
  logging: FileText, elk: FileText, kibana: FileText,
};

function matchIcon(name: string) {
  const lower = name.toLowerCase();
  for (const [keyword, icon] of Object.entries(SERVICE_ICON)) {
    if (lower.includes(keyword)) return icon;
  }
  return Server;
}

function getDeliverySummary(detail: DeliveryDetail): string {
  switch (detail.type) {
    case 'vm': return `IP: ${detail.network.ip}`;
    case 'db': return `Host: ${detail.connection.host}`;
    case 'network': return `VIP: ${detail.connection.vip}`;
    case 'paas': return `${detail.cluster.name}`;
    case 'middleware': return `${detail.connection.url}`;
    case 'monitor': return `${detail.grafana.url}`;
    case 'security': return `WAF: ${detail.waf.status}`;
    case 'backup': return `${detail.policy.schedule}`;
    case 'logging': return `${detail.agent.name}`;
    default: return '';
  }
}

interface ServiceProgressCardProps {
  service: ServiceProgress;
  onAction?: (serviceName: string) => void;
  onModify?: (serviceName: string) => void;
  actionLabel?: string;
  showAction?: boolean;
}

export function ServiceProgressCard({ service, onAction, onModify, actionLabel = '开始交付', showAction = false }: ServiceProgressCardProps) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = service.status === 'completed' && service.deliveryDetail;
  const Icon = matchIcon(service.name);
  const isExpanded = expanded && service.deliveryDetail;

  return (
    <div className="rounded-md border bg-card transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${STATUS_DOT[service.status]?.replace('animate-pulse', '') ? 'bg-muted' : 'bg-muted'}`}>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{service.name}</span>
              <StatusBadge status={service.status} />
            </div>
            {service.deliveryDetail && !isExpanded && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {getDeliverySummary(service.deliveryDetail)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canExpand && (
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="gap-1">
              {expanded ? '收起' : '详情'}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </Button>
          )}
          {showAction && (service.status === 'pending' || service.status === 'processing') && onAction && (
            <Button size="sm" onClick={() => onAction(service.name)}>
              {service.status === 'pending' ? '开始交付' : '标记完成'}
            </Button>
          )}
          {showAction && service.status === 'completed' && onModify && (
            <Button variant="outline" size="sm" onClick={() => onModify(service.name)}>
              修改交付
            </Button>
          )}
        </div>
      </div>
      {isExpanded && (
        <div className="px-3 pb-3 border-t">
          <div className="pt-3">
            <DeliveryDetailPanel detail={service.deliveryDetail!} />
          </div>
        </div>
      )}
    </div>
  );
}
