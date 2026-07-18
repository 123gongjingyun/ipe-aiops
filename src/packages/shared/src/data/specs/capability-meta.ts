import type { AtomicServiceSpec, AutomationLevel, ServiceType } from '../../types';

export const SERVICE_TYPE_META: Record<ServiceType, { label: string; description: string }> = {
  cloud: { label: '云开通', description: '云资源开通、实例申请、平台服务启用' },
  deploy: { label: '自建部署', description: '数据库、中间件、应用或资源构筑部署' },
  ops: { label: '运维操作', description: '巡检、变更、优化、恢复、点检类服务' },
  policy: { label: '策略配置', description: '策略、规则、参数、基线与规划类配置' },
  audit: { label: '评估审计', description: '扫描、测评、评审、备案、审计分析' },
  infra: { label: '基础设施', description: '网络、布线、接入、物理设施与底座能力' },
};

export const AUTOMATION_LEVEL_META: Record<AutomationLevel, { label: string; badgeClass: string }> = {
  manual: { label: '手动', badgeClass: 'bg-slate-100 text-slate-700' },
  semi: { label: '半自动', badgeClass: 'bg-amber-100 text-amber-700' },
  full: { label: '全自动', badgeClass: 'bg-emerald-100 text-emerald-700' },
};

export function deriveServiceType(spec: AtomicServiceSpec): ServiceType {
  if (spec.serviceType) return spec.serviceType;

  const text = `${spec.name} ${spec.category} ${spec.description}`;
  if (text.includes('云') || text.includes('开通') || text.includes('RDS')) return 'cloud';
  if (text.includes('部署') || text.includes('安装') || text.includes('构筑')) return 'deploy';
  if (text.includes('变更') || text.includes('恢复') || text.includes('优化') || text.includes('修复') || text.includes('点检')) return 'ops';
  if (text.includes('策略') || text.includes('配置') || text.includes('规划')) return 'policy';
  if (text.includes('评估') || text.includes('评审') || text.includes('测评') || text.includes('扫描') || text.includes('审查') || text.includes('审计') || text.includes('备案') || text.includes('分析')) return 'audit';
  return 'infra';
}

export function deriveAutomationLevel(spec: AtomicServiceSpec): AutomationLevel {
  if (spec.automationLevel) return spec.automationLevel;
  if (spec.deliveryMode === 'ai') return 'full';

  const text = `${spec.name} ${spec.category} ${spec.description}`;
  if (text.includes('配置') || text.includes('接入') || text.includes('策略') || text.includes('开通')) {
    return 'semi';
  }
  return 'manual';
}
