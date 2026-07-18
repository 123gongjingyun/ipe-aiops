import type { IntegrationStatusMap } from '../types';

interface IntegrationStatusProps {
  integrations: IntegrationStatusMap;
}

const labels = {
  pam: { label: 'PAM', icon: '🔑' },
  monitor: { label: '监控', icon: '📊' },
  logging: { label: '日志', icon: '📝' },
  backup: { label: '备份', icon: '💾' },
  security: { label: '安全', icon: '🛡️' },
};

export function IntegrationStatus({ integrations }: IntegrationStatusProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {(Object.keys(labels) as Array<keyof IntegrationStatusMap>).map(key => {
        const item = integrations[key];
        const info = labels[key];
        return (
          <div key={key} className={`text-center p-2 rounded-md text-xs ${
            item.status === 'active' ? 'bg-success-light text-success border border-success/20' :
            item.status === 'pending' ? 'bg-warning-light text-warning border border-warning/20' :
            'bg-muted text-muted-foreground border border-border'
          }`}>
            <div>{info.icon}</div>
            <div className="font-medium mt-1">{info.label}</div>
            <div>{item.status === 'active' ? '已接入' : item.status === 'pending' ? '待接入' : '未启用'}</div>
          </div>
        );
      })}
    </div>
  );
}
