import { useEffect, useState, useMemo, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  buildInitiationFormSnapshot,
  buildInitiationStageDetail,
  createOrder,
  getSchemaTemplateConfigProfileBinding,
  getApprovalPolicy,
  getManagedConfigProfilesForSpec,
  getResolvedSpecSchemaFields,
  getResolvedSpecSchemaLayout,
  getApplyFieldStrategy,
  useConfigProfileGroups,
} from '@aiops/shared';
import { useSpec } from '@aiops/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@aiops/shared';
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Label, Switch, Textarea } from '@aiops/shared';
import type { OrchestratedPlan } from '@aiops/shared';
import type {
  ApprovalPolicy,
  ApprovalStageDefinition,
  ApprovalTriggerRule,
  AtomicServiceSpec,
  EnvironmentRecommendedFieldKey,
  FieldSchema,
  FormLayoutConfig,
  OrderApprovalStageSnapshot,
  OrderApprovalTriggerSnapshot,
  ProductionFieldDefinition,
  ServiceConfigProfile,
} from '@aiops/shared';
import { TemplateFormLayout } from './template-form-layout';
import { ApplyPageShell } from './apply-page-shell';
import { type UploadedArtifact } from './artifact-panel';
import {
  ARCHITECTURE_TEMPLATE_LABEL,
  ArchitectureArtifactField,
  formatArtifactSizeLabel,
} from './architecture-artifact-field';
import {
  CONTAINER_TRIAL_FIELD_DEFINITIONS,
  CLOUD_DB_TRIAL_FIELD_DEFINITIONS,
  MYSQL_TRIAL_FIELD_DEFINITIONS,
  NETWORK_LB_TRIAL_FIELD_DEFINITIONS,
  NETWORK_PUBLIC_LB_TRIAL_FIELD_DEFINITIONS,
  resolveAtomicServiceUiProfile,
} from './atomic-service-ui-profiles';
import {
  buildApplicantLayout,
  buildCloudDbTrialLayout,
  buildContainerTrialLayout,
  buildMysqlTrialLayout,
  buildNetworkLbTrialLayout,
  buildNetworkPublicLbTrialLayout,
  isStackedSingleColumnLayout,
  mergeLayoutWithFields,
  normalizeProductionFields,
  resolveSummaryFieldKeys,
  suppressDuplicateScenarioFields,
} from './apply-service-layout';

const APPLICANT_DEFAULTS: Record<string, string> = {
  dbVersion: '8.0',
  deployMode: 'primary-standby',
  backupPolicy: 'daily',
  listenerProtocol: 'HTTPS',
  listenerPort: '443',
};

function buildAiConfig(template: string, values: Record<string, string>, serviceName: string): string {
  return template
    .replace(/\{service\.name\}/g, serviceName)
    .replace(/\{(\w+)\}/g, (_, key) => values[key] || '');
}

function mapCloudDbProfileToDefaults(profile: ServiceConfigProfile) {
  const cpu = profile.cpu.replace(/\s*vCPU/i, '').trim();
  const memory = profile.memory.replace(/\s*GB/i, '').trim();
  const storageLabel = profile.disk.match(/(\d+)/)?.[1] || '';
  const backupDetail = profile.details?.备份策略 || '';

  return {
    cpu,
    memory,
    haMode: Number(profile.nodes) >= 3 ? '集群' : Number(profile.nodes) >= 2 ? '主从' : '单机',
    dataDiskSize: storageLabel,
    backupPolicy: backupDetail.includes('每周')
      ? 'weekly'
      : backupDetail
        ? 'daily'
        : 'on-demand',
  };
}

const CLOUD_DB_PACKAGE_KEYS = ['cpu', 'memory', 'haMode', 'dataDiskSize', 'backupPolicy'] as const;
const MYSQL_PACKAGE_KEYS = ['dbVersion', 'deployMode', 'dataDiskSize', 'backupPolicy', 'haRequirement'] as const;
const OBJECT_STORAGE_PACKAGE_KEYS = ['dataDiskSize', 'akSkCount', 'usageDuration', 'accessControl', 'securityLevel'] as const;
const VM_PRIVATE_PACKAGE_KEYS = ['cpu', 'memory', 'dataDiskSize', 'resourcePool', 'ipAssignMode'] as const;
const VM_PUBLIC_PACKAGE_KEYS = ['cpu', 'memory', 'dataDiskSize', 'securityLevel', 'haRequirement', 'publicAccess'] as const;
const CONTAINER_PACKAGE_KEYS = ['resourcePartition', 'instanceCount', 'cpuPerInstance', 'memoryPerInstance'] as const;
const TEMPLATE_RECOMMENDED_FIELD_KEYS: Record<EnvironmentRecommendedFieldKey, string> = {
  nodes: 'env_nodes',
  cpu: 'env_cpu',
  memory: 'env_memory',
  disk: 'env_disk',
  securityLevel: 'env_security_level',
};

type TemplateRecommendedFieldState = {
  initialized: boolean;
  overridden: boolean;
};

type PackageReferenceEntry = {
  environment: string;
  title: string;
  badges: string[];
  description?: string;
  details: Array<{ label: string; value: string }>;
};

function mapMysqlProfileToDefaults(profile: ServiceConfigProfile) {
  const storageLabel = profile.disk.match(/(\d+)/)?.[1] || '';
  const dbVersion = profile.details?.数据库版本 || profile.details?.中间件版本?.replace(/^MySQL\s*/i, '') || '';
  return {
    dbVersion: dbVersion || '8.0',
    deployMode: Number(profile.nodes) >= 3 ? 'cluster' : Number(profile.nodes) >= 2 ? 'primary-standby' : 'single',
    dataDiskSize: storageLabel,
    backupPolicy: profile.env === 'PROD' ? 'daily' : 'weekly',
    haRequirement: Number(profile.nodes) >= 3 ? 'multi-az' : Number(profile.nodes) >= 2 ? 'primary-standby' : 'none',
  };
}

function mapVmProfileToDefaults(
  profile: ServiceConfigProfile,
  scope: 'private' | 'public',
) {
  const cpu = profile.cpu.replace(/\s*vCPU/i, '').trim();
  const memory = profile.memory.replace(/\s*GB/i, '').trim();
  const dataDiskSize = profile.disk.match(/(\d+)/)?.[1] || '';
  const specLabel = `${cpu}C${memory}G`;
  const configProfile = `${profile.name} / ${specLabel} / ${profile.disk}`;

  if (scope === 'public') {
    return {
      cpu,
      memory,
      dataDiskSize,
      configProfile,
      securityLevel: profile.env === 'PROD' ? 'critical' : profile.env === 'UAT' ? 'important' : 'normal',
      haRequirement: profile.env === 'PROD' ? 'multi-az' : profile.env === 'UAT' ? 'primary-standby' : 'none',
      publicAccess: 'true',
    };
  }

  return {
    cpu,
    memory,
    dataDiskSize,
    configProfile,
    resourcePool: profile.env === 'PROD' ? '生产资源池' : profile.env === 'UAT' ? '验收资源池' : '开发资源池',
    ipAssignMode: 'auto',
  };
}

function getEnvironmentProfileValue(profile: ServiceConfigProfile, sourceKey: EnvironmentRecommendedFieldKey) {
  if (sourceKey === 'securityLevel') {
    return profile.details?.['安全等级'] ?? '';
  }
  return String(profile[sourceKey] ?? '');
}

function normalizeEnvironmentValue(value?: string) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'TEST') return 'UAT';
  if (normalized === 'PRODUCTION') return 'PROD';
  return normalized;
}

function formatBooleanLabel(value: string | boolean | undefined) {
  if (typeof value === 'boolean') return value ? '是' : '否';
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return '-';
  if (normalized === 'true') return '是';
  if (normalized === 'false') return '否';
  return value ? String(value) : '-';
}

function buildManagedProfileReferenceEntries(
  profiles: ServiceConfigProfile[],
  kind: 'mysql' | 'cloud-db' | 'vm-private' | 'vm-public',
): PackageReferenceEntry[] {
  return profiles.map(profile => {
    if (kind === 'mysql') {
      const defaults = mapMysqlProfileToDefaults(profile);
      return {
        environment: normalizeEnvironmentValue(profile.env),
        title: profile.name,
        badges: [profile.cpu, profile.memory, profile.disk],
        description: profile.description,
        details: [
          { label: '数据库版本', value: defaults.dbVersion || '-' },
          { label: '部署方式', value: defaults.deployMode || '-' },
          { label: '存储容量', value: defaults.dataDiskSize ? `${defaults.dataDiskSize} GB` : '-' },
          { label: '备份策略', value: defaults.backupPolicy || '-' },
          { label: '高可用要求', value: defaults.haRequirement || '-' },
        ],
      };
    }

    if (kind === 'cloud-db') {
      const defaults = mapCloudDbProfileToDefaults(profile);
      return {
        environment: normalizeEnvironmentValue(profile.env),
        title: profile.name,
        badges: [profile.cpu, profile.memory, profile.disk],
        description: profile.description,
        details: [
          { label: 'CPU', value: defaults.cpu ? `${defaults.cpu} C` : '-' },
          { label: '内存', value: defaults.memory ? `${defaults.memory} GB` : '-' },
          { label: '高可用模式', value: defaults.haMode || '-' },
          { label: '存储容量', value: defaults.dataDiskSize ? `${defaults.dataDiskSize} GB` : '-' },
          { label: '备份策略', value: defaults.backupPolicy || '-' },
        ],
      };
    }

    const defaults = mapVmProfileToDefaults(profile, kind === 'vm-public' ? 'public' : 'private');
    return {
      environment: normalizeEnvironmentValue(profile.env),
      title: profile.name,
      badges: [profile.cpu, profile.memory, profile.disk],
      description: profile.description,
      details: kind === 'vm-public'
        ? [
            { label: 'CPU', value: defaults.cpu ? `${defaults.cpu} C` : '-' },
            { label: '内存', value: defaults.memory ? `${defaults.memory} GB` : '-' },
            { label: '磁盘', value: defaults.dataDiskSize ? `${defaults.dataDiskSize} GB` : '-' },
            { label: '安全等级', value: defaults.securityLevel || '-' },
            { label: '高可用要求', value: defaults.haRequirement || '-' },
            { label: '公网访问', value: formatBooleanLabel(defaults.publicAccess) },
          ]
        : [
            { label: 'CPU', value: defaults.cpu ? `${defaults.cpu} C` : '-' },
            { label: '内存', value: defaults.memory ? `${defaults.memory} GB` : '-' },
            { label: '磁盘', value: defaults.dataDiskSize ? `${defaults.dataDiskSize} GB` : '-' },
            { label: '资源池', value: defaults.resourcePool || '-' },
            { label: 'IP分配方式', value: defaults.ipAssignMode || '-' },
          ],
    };
  });
}

function buildTemplateGroupReferenceEntries(
  profiles: ServiceConfigProfile[],
  enabledFields: EnvironmentRecommendedFieldKey[],
): PackageReferenceEntry[] {
  const fieldLabels: Record<EnvironmentRecommendedFieldKey, string> = {
    nodes: '节点数',
    cpu: 'CPU',
    memory: '内存',
    disk: '磁盘',
    securityLevel: '安全等级',
  };

  return profiles.map(profile => ({
    environment: normalizeEnvironmentValue(profile.env),
    title: profile.name,
    badges: [profile.cpu, profile.memory, profile.disk],
    description: profile.description,
    details: enabledFields.map(field => ({
      label: fieldLabels[field],
      value: getEnvironmentProfileValue(profile, field) || '-',
    })),
  }));
}

function buildObjectStorageReferenceEntries(environments: string[], businessCategory?: string) {
  return environments.map(environment => {
    const pkg = resolveObjectStoragePackage(environment, businessCategory);
    return {
      environment: normalizeEnvironmentValue(environment),
      title: pkg.name,
      badges: [...pkg.summary],
      description: '对象存储环境默认推荐套餐，供申请时对照参考。',
      details: [
        { label: '容量', value: `${pkg.defaults.dataDiskSize} GB` },
        { label: 'AK/SK 数量', value: `${pkg.defaults.akSkCount}` },
        { label: '使用时长', value: pkg.defaults.usageDuration },
        { label: '访问控制', value: pkg.defaults.accessControl },
        { label: '安全等级', value: pkg.defaults.securityLevel },
      ],
    };
  });
}

function buildContainerReferenceEntries(environments: string[]) {
  return environments.map(environment => {
    const pkg = resolveContainerTrialPackage(environment);
    return {
      environment: normalizeEnvironmentValue(environment),
      title: pkg.name,
      badges: [...pkg.summary],
      description: '容器试点环境默认推荐套餐，供申请时对照参考。',
      details: [
        { label: '资源分区', value: pkg.defaults.resourcePartition },
        { label: '实例数', value: pkg.defaults.instanceCount },
        { label: '单实例 CPU', value: pkg.defaults.cpuPerInstance },
        { label: '单实例内存', value: pkg.defaults.memoryPerInstance },
        { label: '流水线访问', value: formatBooleanLabel(pkg.booleans.requiresPipelineAccess) },
        { label: 'EFK 访问', value: formatBooleanLabel(pkg.booleans.requiresEfkAccess) },
      ],
    };
  });
}

function resolveObjectStoragePackage(
  environment: string | undefined,
  businessCategory: string | undefined,
) {
  if (environment === 'PROD' && businessCategory === 'production') {
    return {
      name: '生产核心持久版',
      summary: ['1024 GB', '2 个 AK/SK', '长期', '私有'],
      defaults: {
        dataDiskSize: '1024',
        akSkCount: '2',
        usageDuration: 'long-term',
        accessControl: 'private',
        securityLevel: 'critical',
      },
    };
  }
  if (environment === 'PROD') {
    return {
      name: '生产共享存储版',
      summary: ['500 GB', '2 个 AK/SK', '长期', '私有'],
      defaults: {
        dataDiskSize: '500',
        akSkCount: '2',
        usageDuration: 'long-term',
        accessControl: 'private',
        securityLevel: 'important',
      },
    };
  }
  if ((environment === 'UAT' || environment === 'SIT') && businessCategory === 'production') {
    return {
      name: '验收稳态版',
      summary: ['300 GB', '1 个 AK/SK', '长期', '私有'],
      defaults: {
        dataDiskSize: '300',
        akSkCount: '1',
        usageDuration: 'long-term',
        accessControl: 'private',
        securityLevel: 'important',
      },
    };
  }
  if (environment === 'UAT' || environment === 'SIT') {
    return {
      name: '测试验收版',
      summary: ['200 GB', '1 个 AK/SK', '长期', '私有'],
      defaults: {
        dataDiskSize: '200',
        akSkCount: '1',
        usageDuration: 'long-term',
        accessControl: 'private',
        securityLevel: 'normal',
      },
    };
  }
  return {
    name: '开发轻量版',
    summary: ['100 GB', '1 个 AK/SK', '临时', '私有'],
    defaults: {
      dataDiskSize: '100',
      akSkCount: '1',
      usageDuration: 'temporary',
      accessControl: 'private',
      securityLevel: 'normal',
    },
  };
}

function resolveContainerTrialPackage(environment: string | undefined) {
  if (environment === 'PROD') {
    return {
      name: '生产标准容器版',
      summary: ['2 实例', '2C / 4G', 'LAN 分区', '推荐开通 EFK'],
      defaults: {
        resourcePartition: 'LAN',
        instanceCount: '2',
        cpuPerInstance: '2',
        memoryPerInstance: '4',
      },
      booleans: {
        requiresPipelineAccess: false,
        requiresEfkAccess: true,
      },
    };
  }
  if (environment === 'PERF') {
    return {
      name: '压测扩容容器版',
      summary: ['2 实例', '4C / 8G', 'LAN 分区', '推荐开通 EFK'],
      defaults: {
        resourcePartition: 'LAN',
        instanceCount: '2',
        cpuPerInstance: '4',
        memoryPerInstance: '8',
      },
      booleans: {
        requiresPipelineAccess: false,
        requiresEfkAccess: true,
      },
    };
  }
  if (environment === 'UAT' || environment === 'SIT') {
    return {
      name: '验收联调容器版',
      summary: ['1 实例', '2C / 4G', 'LAN 分区', 'EFK 可按需开通'],
      defaults: {
        resourcePartition: 'LAN',
        instanceCount: '1',
        cpuPerInstance: '2',
        memoryPerInstance: '4',
      },
      booleans: {
        requiresPipelineAccess: false,
        requiresEfkAccess: true,
      },
    };
  }
  return {
    name: '开发轻量容器版',
    summary: ['1 实例', '1C / 2G', 'LAN 分区', '默认不启 EFK'],
    defaults: {
      resourcePartition: 'LAN',
      instanceCount: '1',
      cpuPerInstance: '1',
      memoryPerInstance: '2',
    },
    booleans: {
      requiresPipelineAccess: false,
      requiresEfkAccess: false,
    },
  };
}

function resolveSpecPreset(specValue: string | undefined) {
  const presetMap: Record<string, { cpu: string; memory: string }> = {
    '2C4G': { cpu: '2', memory: '4' },
    '4C8G': { cpu: '4', memory: '8' },
    '8C16G': { cpu: '8', memory: '16' },
    '16C32G': { cpu: '16', memory: '32' },
    '16C64G': { cpu: '16', memory: '64' },
  };
  return specValue ? presetMap[specValue] : undefined;
}

function enrichAnswersWithDerivedSpec(values: Record<string, string>) {
  const preset = resolveSpecPreset(values.spec);
  if (!preset) return values;
  return {
    ...values,
    cpu: values.cpu || preset.cpu,
    memory: values.memory || preset.memory,
  };
}

function buildOrchestratedPlan(serviceName: string, estimatedTime: string): OrchestratedPlan {
  return {
    summary: `${serviceName} 交付方案`,
    estimatedTime,
    resources: [{ type: 'vm', name: serviceName, spec: {}, purpose: '按申请配置交付' }],
    integrations: [
      { type: 'monitor', enabled: true, config: { dashboard: 'Grafana 服务总览' } },
      { type: 'logging', enabled: true, config: { detail: '日志采集已接入' } },
      { type: 'backup', enabled: true, config: { schedule: '每日增量备份' } },
    ],
  };
}

function clonePlan(plan: OrchestratedPlan): OrchestratedPlan {
  return {
    summary: plan.summary,
    estimatedTime: plan.estimatedTime,
    resources: plan.resources.map(resource => ({
      ...resource,
      spec: { ...resource.spec },
    })),
    integrations: plan.integrations.map(integration => ({
      ...integration,
      config: { ...integration.config },
    })),
  };
}

const INTEGRATION_LABELS: Record<string, string> = {
  monitor: '监控',
  logging: '日志',
  backup: '备份',
  security: '安全',
  pam: 'PAM',
};

function buildMysqlTrialPlan(values: Record<string, string>): OrchestratedPlan {
  const appName = values.applicationName || 'MySQL部署';
  const env = values.environment || 'DEV';
  const deployMode = values.deployMode || 'primary-standby';
  const version = values.dbVersion || '8.0';
  const storage = values.dataDiskSize || '200';
  const businessCriticality = values.businessCriticality || 'standard';
  const haRequirement = values.haRequirement || 'primary-standby';
  const backupPolicy = values.backupPolicy || 'daily';

  const preset = env === 'PROD'
    ? { cpu: '8C', memory: '32G', estimatedTime: '2-3 工作日' }
    : env === 'UAT'
      ? { cpu: '4C', memory: '8G', estimatedTime: '2 工作日' }
      : { cpu: '2C', memory: '4G', estimatedTime: '1-2 工作日' };

  const resolvedHa = deployMode === 'cluster'
    ? '集群'
    : deployMode === 'single'
      ? '单机'
      : haRequirement === 'multi-az'
        ? '多可用区'
        : '主备';

  const nonStandard = (
    (env === 'PROD' && businessCriticality === 'critical' && resolvedHa === '单机')
    || Number(storage) > 1024
    || resolvedHa === '多可用区'
  );

  return {
    summary: nonStandard ? `${appName} 非标 MySQL 交付建议` : `${appName} 标准 MySQL 交付方案`,
    estimatedTime: preset.estimatedTime,
    resources: [
      {
        type: 'db',
        name: `${appName} MySQL 实例`,
        spec: {
          cpu: preset.cpu,
          memory: preset.memory,
          storage: `${storage}G`,
          engine: `MySQL ${version}`,
          ha: resolvedHa,
        },
        purpose: '承载业务数据库',
      },
    ],
    integrations: [
      { type: 'monitor', enabled: true, config: { dashboard: 'Grafana 数据库总览' } },
      { type: 'logging', enabled: true, config: { detail: '数据库日志建议接入统一日志平台' } },
      { type: 'backup', enabled: backupPolicy !== 'on-demand', config: { schedule: backupPolicy === 'weekly' ? '每周备份' : '每日备份' } },
      { type: 'security', enabled: env === 'PROD' || businessCriticality !== 'standard', config: { detail: '建议按数据库标准安全基线执行' } },
    ],
  };
}

function buildContainerTrialPlan(
  serviceName: string,
  values: Record<string, string>,
  booleanValues: Record<string, boolean>,
): OrchestratedPlan {
  const env = values.environment || 'DEV';
  const appName = values.applicationEnglishName || serviceName;
  const instances = Number(values.instanceCount || '1') || 1;
  const cpu = Number(values.cpuPerInstance || '1') || 1;
  const memory = Number(values.memoryPerInstance || '2') || 2;
  const totalCpu = instances * cpu;
  const totalMemory = instances * memory;

  return {
    summary: `${appName} 容器资源交付方案`,
    estimatedTime: env === 'PROD' ? '2-3 工作日' : env === 'PERF' ? '2 工作日' : '1-2 工作日',
    resources: [
      {
        type: 'paas',
        name: `${appName} 容器资源`,
        spec: {
          environment: env,
          partition: values.resourcePartition || 'LAN',
          namespace: values.namespace || '待补充',
          instances: String(instances),
          cpuPerInstance: `${cpu}C`,
          memoryPerInstance: `${memory}G`,
          totalCpu: `${totalCpu}C`,
          totalMemory: `${totalMemory}G`,
        },
        purpose: values.applicationDescription || '承载容器化应用实例',
      },
    ],
    integrations: [
      { type: 'monitor', enabled: true, config: { dashboard: 'Grafana 容器总览' } },
      { type: 'logging', enabled: booleanValues.requiresEfkAccess ?? false, config: { detail: '容器日志接入 EFK 平台' } },
      { type: 'security', enabled: env === 'PROD', config: { detail: '按容器平台安全基线执行' } },
      { type: 'backup', enabled: false, config: { schedule: '容器配置不单独备份，按平台策略执行' } },
    ],
  };
}

function PackageReferenceDialog({
  open,
  onOpenChange,
  title,
  description,
  entries,
  selectedEnvironment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  entries: PackageReferenceEntry[];
  selectedEnvironment?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {entries.map(entry => {
            const isCurrent = normalizeEnvironmentValue(entry.environment) === normalizeEnvironmentValue(selectedEnvironment);
            return (
              <div
                key={`${entry.environment}-${entry.title}`}
                className={`rounded-2xl border px-4 py-4 shadow-sm ${
                  isCurrent
                    ? 'border-sky-300 bg-sky-50/80'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{entry.environment}</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">{entry.title}</div>
                  </div>
                  {isCurrent && (
                    <span className="rounded-full border border-sky-300 bg-white px-2.5 py-1 text-[11px] font-medium text-sky-700">
                      当前环境
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {entry.badges.map(badge => (
                    <span key={`${entry.environment}-${badge}`} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700">
                      {badge}
                    </span>
                  ))}
                </div>
                {entry.description && (
                  <div className="mt-3 text-xs leading-5 text-slate-600">
                    {entry.description}
                  </div>
                )}
                <div className="mt-4 space-y-2">
                  {entry.details.map(detail => (
                    <div key={`${entry.environment}-${detail.label}`} className="flex items-start justify-between gap-3 text-xs">
                      <span className="text-slate-500">{detail.label}</span>
                      <span className="text-right font-medium text-slate-700">{detail.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function isNonStandardPlan(summary: string) {
  return summary.includes('非标');
}

function resolveApprovalStages(
  environment: string | undefined,
  policy: ReturnType<typeof getApprovalPolicy>,
) {
  if (!policy) return [];
  const override = policy.environmentOverrides?.find(item => item.environment === environment);
  return override?.stages || policy.defaultStages;
}

function getRuleFieldValue(
  rule: ApprovalTriggerRule,
  textValues: Record<string, string>,
  booleanValues: Record<string, boolean>,
) {
  if (typeof rule.value === 'boolean') {
    return booleanValues[rule.fieldKey];
  }
  return textValues[rule.fieldKey];
}

function matchesTriggerRule(
  rule: ApprovalTriggerRule,
  textValues: Record<string, string>,
  booleanValues: Record<string, boolean>,
) {
  const fieldValue = getRuleFieldValue(rule, textValues, booleanValues);

  switch (rule.operator) {
    case 'eq':
      return fieldValue === rule.value;
    case 'neq':
      return fieldValue !== undefined && fieldValue !== rule.value;
    case 'contains':
      return String(fieldValue || '').includes(String(rule.value));
    case 'gt':
      return Number(fieldValue) > Number(rule.value);
    default:
      return false;
  }
}

function getTriggeredRules(
  policy: ApprovalPolicy | undefined,
  textValues: Record<string, string>,
  booleanValues: Record<string, boolean>,
) {
  if (!policy?.triggerRules?.length) return [];
  return policy.triggerRules.filter(rule => matchesTriggerRule(rule, textValues, booleanValues));
}

function mergeApprovalStages(
  baseStages: ApprovalStageDefinition[],
  triggeredRules: ApprovalTriggerRule[],
  policy: ApprovalPolicy | undefined,
) {
  if (!policy) return baseStages;

  const stageMap = new Map(baseStages.map(stage => [stage.stageCode, stage]));
  const allKnownStages = [
    ...policy.defaultStages,
    ...(policy.environmentOverrides?.flatMap(item => item.stages) || []),
  ];

  triggeredRules
    .flatMap(rule => rule.appendStages)
    .forEach(stageCode => {
      if (stageMap.has(stageCode)) return;
      const matchedStage = allKnownStages.find(stage => stage.stageCode === stageCode);
      if (matchedStage) {
        stageMap.set(stageCode, matchedStage);
      }
    });

  return Array.from(stageMap.values());
}

function formatRuleValue(rule: ApprovalTriggerRule) {
  if (typeof rule.value === 'boolean') {
    return rule.value ? '是' : '否';
  }
  return String(rule.value);
}

function buildApprovalStageSnapshots(
  baseStages: ApprovalStageDefinition[],
  effectiveStages: ApprovalStageDefinition[],
): OrderApprovalStageSnapshot[] {
  const baseStageCodes = new Set(baseStages.map(stage => stage.stageCode));
  return effectiveStages.map(stage => ({
    stageCode: stage.stageCode,
    stageName: stage.stageName,
    role: stage.role,
    required: stage.required,
    sla: stage.sla,
    source: baseStageCodes.has(stage.stageCode) ? 'base' : 'trigger',
  }));
}

function buildApprovalTriggerSnapshots(
  triggeredRules: ApprovalTriggerRule[],
  effectiveStages: ApprovalStageDefinition[],
  fieldDefs: ProductionFieldDefinition[],
  fields: FieldSchema[],
): OrderApprovalTriggerSnapshot[] {
  return triggeredRules.map(rule => {
    const field = fieldDefs.find(item => item.key === rule.fieldKey) || fields.find(item => item.key === rule.fieldKey);
    const appendedStages = effectiveStages.filter(stage => rule.appendStages.includes(stage.stageCode));
    return {
      fieldKey: rule.fieldKey,
      fieldLabel: field?.label || rule.fieldKey,
      operator: rule.operator,
      expectedValue: formatRuleValue(rule),
      appendedStageCodes: appendedStages.map(stage => stage.stageCode),
      appendedStageNames: appendedStages.map(stage => stage.stageName),
    };
  });
}

export function ApplyService() {
  const navigate = useNavigate();
  const { serviceId } = useParams<{ serviceId: string }>();

  const spec = useSpec(serviceId ?? '') as AtomicServiceSpec | undefined;
  const configProfileGroups = useConfigProfileGroups();
  const uiProfile = resolveAtomicServiceUiProfile(spec);
  const isMysqlTrial = uiProfile?.formVariant === 'mysqlTrial';
  const isCloudDbTrial = uiProfile?.formVariant === 'cloudDbTrial';
  const isNetworkLbTrial = uiProfile?.formVariant === 'networkLbTrial';
  const isNetworkPublicLbTrial = uiProfile?.formVariant === 'networkPublicLbTrial';
  const isContainerTrial = uiProfile?.formVariant === 'containerTrial';
  const isVmPrivateTrial =
    spec?.id === 'cloud-vm-private'
    || spec?.id === 'cloud-vm-virtual'
    || spec?.serviceCode === 'ecs-private-create';
  const isVmPublicTrial = spec?.id === 'cloud-vm-public' || spec?.serviceCode === 'ecs-public-create';
  const isVmTrial = isVmPrivateTrial || isVmPublicTrial;
  const isArchitectureAwareTrial = Boolean(uiProfile?.architectureRequired);
  const demoTag = uiProfile?.demoTag;
  const trialGridClassName = uiProfile?.formVariant ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3' : undefined;

  const effectiveProductionFieldDefs = useMemo<ProductionFieldDefinition[]>(
    () => {
      const baseFields = spec?.productionInputFields ?? [];
      if (isMysqlTrial && spec?.productionInputFields) {
        const mysqlBaseFields = spec.productionInputFields;
        return [
          ...mysqlBaseFields,
          ...MYSQL_TRIAL_FIELD_DEFINITIONS.filter(field => !mysqlBaseFields.some(item => item.key === field.key)),
        ];
      }
      if (isCloudDbTrial) {
        return [
          ...baseFields,
          ...CLOUD_DB_TRIAL_FIELD_DEFINITIONS.filter(field => !baseFields.some(item => item.key === field.key)),
        ];
      }
      if (isNetworkLbTrial) {
        return [
          ...baseFields,
          ...NETWORK_LB_TRIAL_FIELD_DEFINITIONS.filter(field => !baseFields.some(item => item.key === field.key)),
        ];
      }
      if (isNetworkPublicLbTrial) {
        return [
          ...baseFields,
          ...NETWORK_PUBLIC_LB_TRIAL_FIELD_DEFINITIONS.filter(field => !baseFields.some(item => item.key === field.key)),
        ];
      }
      if (isContainerTrial) {
        return [
          ...baseFields,
          ...CONTAINER_TRIAL_FIELD_DEFINITIONS.filter(field => !baseFields.some(item => item.key === field.key)),
        ];
      }
      if (!spec?.productionInputFields) return [];
      return [
        ...spec.productionInputFields,
      ];
    },
    [isCloudDbTrial, isContainerTrial, isMysqlTrial, isNetworkLbTrial, isNetworkPublicLbTrial, spec],
  );
  const productionFields = useMemo<FieldSchema[]>(
    () => {
      if (effectiveProductionFieldDefs.length === 0) return [];
      return normalizeProductionFields(effectiveProductionFieldDefs);
    },
    [effectiveProductionFieldDefs],
  );
  const fields = useMemo<FieldSchema[]>(
    () => {
      if (!spec) return [];
      const resolvedFields = suppressDuplicateScenarioFields(
        productionFields,
        getResolvedSpecSchemaFields(spec, 'input'),
      );
      return [
        ...productionFields,
        ...resolvedFields.filter(field => !productionFields.some(item => item.key === field.key)),
      ];
    },
    [spec, productionFields],
  );
  const resolvedLayout = useMemo(() => (spec ? getResolvedSpecSchemaLayout(spec, 'input') : { sections: [] }), [spec]);
  const layout = useMemo(
    () => {
      if (isMysqlTrial) return buildMysqlTrialLayout(fields);
      if (isCloudDbTrial) return buildCloudDbTrialLayout(fields);
      if (isContainerTrial) return buildContainerTrialLayout(fields);
      if (isNetworkLbTrial) return buildNetworkLbTrialLayout(fields);
      if (isNetworkPublicLbTrial) return buildNetworkPublicLbTrialLayout(fields);
      if (isVmTrial && resolvedLayout.sections.length > 0 && isStackedSingleColumnLayout(resolvedLayout)) {
        return buildApplicantLayout(fields);
      }
      if (resolvedLayout.sections.length > 0) return mergeLayoutWithFields(resolvedLayout, fields);
      return effectiveProductionFieldDefs.length > 0 ? buildApplicantLayout(fields) : mergeLayoutWithFields(resolvedLayout, fields);
    },
    [effectiveProductionFieldDefs.length, fields, isCloudDbTrial, isContainerTrial, isMysqlTrial, isNetworkLbTrial, isNetworkPublicLbTrial, isVmTrial, resolvedLayout],
  );
  const approvalPolicy = useMemo(() => (spec?.approvalPolicyId ? getApprovalPolicy(spec.approvalPolicyId) : undefined), [spec]);
  const environmentStrategy = useMemo(
    () => (spec ? getApplyFieldStrategy(spec, 'environment') : undefined),
    [spec],
  );

  const estimatedTime = spec
    ? `${spec.delivery.autoDays}-${spec.delivery.manualDays} 工作日`
    : '';

  const aiConfigTemplate = spec
    ? `${spec.name}交付方案 · 自动编排`
    : '';

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [booleanAnswers, setBooleanAnswers] = useState<Record<string, boolean>>({});
  const [templateRecommendedFieldState, setTemplateRecommendedFieldState] = useState<Record<string, TemplateRecommendedFieldState>>({});
  const [plan, setPlan] = useState<OrchestratedPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [packageReferenceOpen, setPackageReferenceOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [architectureFileName, setArchitectureFileName] = useState('');
  const defaultEnvironment = spec?.supportedEnvironments?.[0]
    || effectiveProductionFieldDefs.find(field => field.key === 'environment')?.options?.[0]?.value;
  const fieldKeys = useMemo(() => new Set(fields.map(field => field.key)), [fields]);
  const managedConfigProfiles = useMemo(
    () => (spec ? getManagedConfigProfilesForSpec(spec.id, spec.configProfiles || []) : []),
    [spec],
  );
  const effectiveDefaultEnvironment = String(
    environmentStrategy?.defaultValue
    || defaultEnvironment
    || managedConfigProfiles[0]?.env
    || '',
  );
  const selectedEnvironment =
    answers.environment || effectiveDefaultEnvironment;
  const templateBinding = useMemo(
    () => (spec?.inputTemplateId ? getSchemaTemplateConfigProfileBinding(spec.inputTemplateId) : undefined),
    [spec?.inputTemplateId],
  );
  const templateEnvironmentConfig = templateBinding?.environmentConfig;
  const selectedTemplateProfileGroups = useMemo(
    () => configProfileGroups.filter(group => templateBinding?.groupKeys.includes(group.key)),
    [configProfileGroups, templateBinding?.groupKeys],
  );
  const templateRecommendedGroup = useMemo(() => {
    if (!templateEnvironmentConfig?.profileGroupKey) return undefined;
    return configProfileGroups.find(group => group.key === templateEnvironmentConfig.profileGroupKey);
  }, [configProfileGroups, templateEnvironmentConfig?.profileGroupKey]);
  const templateEnvironmentFieldKey = templateEnvironmentConfig?.environmentFieldKey || 'environment';
  const selectedTemplateEnvironmentValue = answers[templateEnvironmentFieldKey] || selectedEnvironment;
  const selectedTemplateEnvironmentProfile = useMemo(() => {
    if (!templateRecommendedGroup || !selectedTemplateEnvironmentValue) return undefined;
    return templateRecommendedGroup.profiles.find(profile => (
      normalizeEnvironmentValue(profile.env) === normalizeEnvironmentValue(selectedTemplateEnvironmentValue)
    ));
  }, [selectedTemplateEnvironmentValue, templateRecommendedGroup]);
  const selectedConfigProfile = useMemo(
    () => managedConfigProfiles.find(profile => profile.env === selectedEnvironment),
    [managedConfigProfiles, selectedEnvironment],
  );
  const selectedCloudDbPackageDefaults = useMemo(
    () => (selectedConfigProfile ? mapCloudDbProfileToDefaults(selectedConfigProfile) : undefined),
    [selectedConfigProfile],
  );
  const selectedMysqlPackageDefaults = useMemo(
    () => (isMysqlTrial && selectedConfigProfile ? mapMysqlProfileToDefaults(selectedConfigProfile) : undefined),
    [isMysqlTrial, selectedConfigProfile],
  );
  const selectedVmPackageDefaults = useMemo(
    () => (
      isVmTrial && selectedConfigProfile
        ? mapVmProfileToDefaults(selectedConfigProfile, isVmPublicTrial ? 'public' : 'private')
        : undefined
    ),
    [isVmPublicTrial, isVmTrial, selectedConfigProfile],
  );
  const selectedObjectStoragePackage = useMemo(
    () => (
      spec?.id === 'obj-storage'
        ? resolveObjectStoragePackage(selectedEnvironment, answers.businessCategory)
        : undefined
    ),
    [answers.businessCategory, selectedEnvironment, spec?.id],
  );
  const selectedContainerTrialPackage = useMemo(
    () => (isContainerTrial ? resolveContainerTrialPackage(selectedEnvironment) : undefined),
    [isContainerTrial, selectedEnvironment],
  );
  const packageReferenceEntries = useMemo(() => {
    if (isMysqlTrial) return buildManagedProfileReferenceEntries(managedConfigProfiles, 'mysql');
    if (isCloudDbTrial) return buildManagedProfileReferenceEntries(managedConfigProfiles, 'cloud-db');
    if (isVmTrial) return buildManagedProfileReferenceEntries(
      managedConfigProfiles,
      isVmPublicTrial ? 'vm-public' : 'vm-private',
    );
    if (spec?.id === 'obj-storage') {
      return buildObjectStorageReferenceEntries(spec.supportedEnvironments || ['DEV', 'UAT', 'PROD'], answers.businessCategory);
    }
    if (isContainerTrial) {
      return buildContainerReferenceEntries(spec?.supportedEnvironments || ['DEV', 'SIT', 'UAT', 'PERF', 'PROD']);
    }
    if (templateRecommendedGroup && templateEnvironmentConfig) {
      const enabledFields = (templateEnvironmentConfig.fields ?? [])
        .filter(field => field.enabled)
        .map(field => field.key);
      return buildTemplateGroupReferenceEntries(templateRecommendedGroup.profiles, enabledFields);
    }
    return [];
  }, [
    answers.businessCategory,
    isCloudDbTrial,
    isContainerTrial,
    isMysqlTrial,
    isVmPublicTrial,
    isVmTrial,
    managedConfigProfiles,
    spec?.id,
    spec?.supportedEnvironments,
    templateEnvironmentConfig,
    templateRecommendedGroup,
  ]);
  const packageReferenceTitle = useMemo(() => {
    if (isMysqlTrial || isCloudDbTrial || isVmTrial || spec?.id === 'obj-storage' || isContainerTrial) {
      return `${spec?.name || '当前服务'} 套餐参考`;
    }
    if (templateRecommendedGroup) return `${templateRecommendedGroup.title} 套餐参考`;
    return '套餐参考';
  }, [isCloudDbTrial, isContainerTrial, isMysqlTrial, isVmTrial, spec?.id, spec?.name, templateRecommendedGroup]);
  const packageReferenceDescription = useMemo(() => {
    if (isMysqlTrial || isCloudDbTrial || isVmTrial) {
      return '展示当前服务在不同环境下绑定的最新标准套餐，供发起时对照参考。';
    }
    if (spec?.id === 'obj-storage' || isContainerTrial) {
      return '展示当前服务在不同环境下的默认推荐套餐，供修改表单后回看原始参考。';
    }
    if (templateRecommendedGroup) {
      return `展示 ${templateRecommendedGroup.title} 下不同环境的模板推荐套餐，供当前表单字段对照参考。`;
    }
    return '展示当前服务可用的环境套餐参考。';
  }, [isCloudDbTrial, isContainerTrial, isMysqlTrial, isVmTrial, spec?.id, templateRecommendedGroup]);
  const showPackageReferenceButton = packageReferenceEntries.length > 0;
  const showEnvironmentField = environmentStrategy?.behavior !== 'hidden';
  const isEnvironmentReadonly = environmentStrategy?.behavior === 'readonly';
  const templateRecommendedFieldKeys = useMemo(
    () => new Set(
      (templateEnvironmentConfig?.fields ?? [])
        .filter(field => field.enabled)
        .map(field => TEMPLATE_RECOMMENDED_FIELD_KEYS[field.key])
        .filter(Boolean),
    ),
    [templateEnvironmentConfig],
  );
  const visibleFields = useMemo(
    () => fields.filter(field => field.key !== 'environment' || showEnvironmentField),
    [fields, showEnvironmentField],
  );
  const visibleLayout = useMemo(() => ({
    sections: layout.sections
      .map(section => ({
        ...section,
        rows: section.rows
          .map(row => ({
            ...row,
            columns: row.columns.filter(column => column.fieldKey !== 'environment' || showEnvironmentField),
          }))
          .filter(row => row.columns.length > 0),
      }))
      .filter(section => section.rows.length > 0),
  }), [layout, showEnvironmentField]);

  useEffect(() => {
    if (!effectiveDefaultEnvironment) return;
    setAnswers(prev => (
      prev.environment
        ? prev
        : { ...prev, environment: effectiveDefaultEnvironment }
    ));
  }, [effectiveDefaultEnvironment]);

  const setAnswersWithTemplateTracking = (nextValues: Record<string, string>) => {
    setTemplateRecommendedFieldState(prev => {
      if (templateRecommendedFieldKeys.size === 0) return prev;
      const nextState = { ...prev };
      let changed = false;
      templateRecommendedFieldKeys.forEach(fieldKey => {
        if (!(fieldKey in nextValues)) return;
        if (nextValues[fieldKey] === answers[fieldKey]) return;
        nextState[fieldKey] = {
          initialized: prev[fieldKey]?.initialized ?? true,
          overridden: true,
        };
        changed = true;
      });
      return changed ? nextState : prev;
    });
    setAnswers(nextValues);
  };

  useEffect(() => {
    if (!templateEnvironmentConfig || !selectedTemplateEnvironmentProfile) return;

    setAnswers(prev => {
      const next = { ...prev };
      let changed = false;

      templateEnvironmentConfig.fields.forEach(field => {
        if (!field.enabled) return;
        const targetFieldKey = TEMPLATE_RECOMMENDED_FIELD_KEYS[field.key];
        if (!targetFieldKey) return;
        const fieldState = templateRecommendedFieldState[targetFieldKey];
        const shouldPreserve = templateEnvironmentConfig.preserveOverrides !== false && fieldState?.overridden;
        if (shouldPreserve) return;
        const nextValue = getEnvironmentProfileValue(selectedTemplateEnvironmentProfile, field.key);
        if (String(next[targetFieldKey] || '') !== String(nextValue || '')) {
          next[targetFieldKey] = nextValue;
          changed = true;
        }
      });

      return changed ? next : prev;
    });

    setTemplateRecommendedFieldState(current => {
      const next = { ...current };
      templateEnvironmentConfig.fields.forEach(field => {
        if (!field.enabled) return;
        const targetFieldKey = TEMPLATE_RECOMMENDED_FIELD_KEYS[field.key];
        if (!targetFieldKey) return;
        const state = next[targetFieldKey];
        if (templateEnvironmentConfig.preserveOverrides !== false && state?.overridden) return;
        next[targetFieldKey] = {
          initialized: true,
          overridden: state?.overridden ?? false,
        };
      });
      return next;
    });
  }, [selectedTemplateEnvironmentProfile, templateEnvironmentConfig, templateRecommendedFieldState]);

  useEffect(() => {
    if (fieldKeys.size === 0) return;
    setAnswers(prev => {
      let changed = false;
      const next = { ...prev };

      Object.entries(APPLICANT_DEFAULTS).forEach(([key, value]) => {
        if (!fieldKeys.has(key) || String(next[key] || '').trim()) return;
        next[key] = value;
        changed = true;
      });

      if (fieldKeys.has('listenerProtocol') && !String(next.listenerProtocol || '').trim()) {
        next.listenerProtocol = 'HTTPS';
        changed = true;
      }

      if (fieldKeys.has('listenerPort') && !String(next.listenerPort || '').trim() && next.listenerProtocol === 'HTTPS') {
        next.listenerPort = '443';
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [fieldKeys]);

  useEffect(() => {
    if (!fieldKeys.has('listenerProtocol') || !fieldKeys.has('listenerPort')) return;

    setAnswers(prev => {
      const protocol = prev.listenerProtocol;
      const currentPort = prev.listenerPort;
      if (!protocol) return prev;

      const recommendedPort = protocol === 'HTTP'
        ? '80'
        : protocol === 'HTTPS'
          ? '443'
          : '';

      if (!recommendedPort) return prev;
      if (currentPort && currentPort !== '80' && currentPort !== '443') return prev;
      if (currentPort === recommendedPort) return prev;

      return {
        ...prev,
        listenerPort: recommendedPort,
      };
    });
  }, [answers.listenerProtocol, fieldKeys]);

  useEffect(() => {
    if (!isCloudDbTrial || !selectedConfigProfile) return;

    const packageDefaults = mapCloudDbProfileToDefaults(selectedConfigProfile);
    setAnswers(prev => {
      const next = { ...prev };
      let changed = false;

      if (prev.recommendedProfileId !== selectedConfigProfile.id) {
        next.recommendedProfileId = selectedConfigProfile.id;
        next.recommendedProfileName = selectedConfigProfile.name;
        changed = true;
      }

      Object.entries(packageDefaults).forEach(([key, value]) => {
        if (String(prev[key] || '').trim() === String(value).trim()) return;
        if (prev.recommendedProfileId && prev.recommendedProfileId === selectedConfigProfile.id && String(prev[key] || '').trim()) return;
        next[key] = value;
        changed = true;
      });

      return changed ? next : prev;
    });
  }, [isCloudDbTrial, selectedConfigProfile]);

  useEffect(() => {
    if (!isMysqlTrial || !selectedConfigProfile) return;

    const packageDefaults = mapMysqlProfileToDefaults(selectedConfigProfile);
    setAnswers(prev => {
      const next = { ...prev };
      let changed = false;

      if (prev.recommendedProfileId !== selectedConfigProfile.id) {
        next.recommendedProfileId = selectedConfigProfile.id;
        next.recommendedProfileName = selectedConfigProfile.name;
        changed = true;
      }

      Object.entries(packageDefaults).forEach(([key, value]) => {
        if (String(prev[key] || '').trim() === String(value).trim()) return;
        if (prev.recommendedProfileId && prev.recommendedProfileId === selectedConfigProfile.id && String(prev[key] || '').trim()) return;
        next[key] = value;
        changed = true;
      });

      return changed ? next : prev;
    });
  }, [isMysqlTrial, selectedConfigProfile]);

  useEffect(() => {
    if (spec?.id !== 'obj-storage' || !selectedObjectStoragePackage) return;

    setAnswers(prev => {
      const next = { ...prev };
      let changed = false;

      if (prev.recommendedProfileId !== selectedObjectStoragePackage.name) {
        next.recommendedProfileId = selectedObjectStoragePackage.name;
        next.recommendedProfileName = selectedObjectStoragePackage.name;
        changed = true;
      }

      Object.entries(selectedObjectStoragePackage.defaults).forEach(([key, value]) => {
        if (String(prev[key] || '').trim() === String(value).trim()) return;
        if (prev.recommendedProfileId && prev.recommendedProfileId === selectedObjectStoragePackage.name && String(prev[key] || '').trim()) return;
        next[key] = value;
        changed = true;
      });

      return changed ? next : prev;
    });
  }, [selectedObjectStoragePackage, spec?.id]);

  useEffect(() => {
    if (!isContainerTrial || !selectedContainerTrialPackage) return;

    setAnswers(prev => {
      const next = { ...prev };
      let changed = false;

      if (prev.recommendedProfileId !== selectedContainerTrialPackage.name) {
        next.recommendedProfileId = selectedContainerTrialPackage.name;
        next.recommendedProfileName = selectedContainerTrialPackage.name;
        changed = true;
      }

      Object.entries(selectedContainerTrialPackage.defaults).forEach(([key, value]) => {
        if (String(prev[key] || '').trim() === String(value).trim()) return;
        if (prev.recommendedProfileId && prev.recommendedProfileId === selectedContainerTrialPackage.name && String(prev[key] || '').trim()) return;
        next[key] = value;
        changed = true;
      });

      return changed ? next : prev;
    });

    setBooleanAnswers(prev => {
      const next = { ...prev };
      let changed = false;

      Object.entries(selectedContainerTrialPackage.booleans).forEach(([key, value]) => {
        if (prev[key] !== undefined) return;
        next[key] = value;
        changed = true;
      });

      return changed ? next : prev;
    });
  }, [isContainerTrial, selectedContainerTrialPackage]);

  useEffect(() => {
    if (!isVmTrial || !selectedConfigProfile || !selectedVmPackageDefaults) return;

    setAnswers(prev => {
      const next = { ...prev };
      let changed = false;

      if (prev.recommendedProfileId !== selectedConfigProfile.id) {
        next.recommendedProfileId = selectedConfigProfile.id;
        next.recommendedProfileName = selectedConfigProfile.name;
        changed = true;
      }

      Object.entries(selectedVmPackageDefaults).forEach(([key, value]) => {
        if (String(prev[key] || '').trim() === String(value).trim()) return;
        if (prev.recommendedProfileId && prev.recommendedProfileId === selectedConfigProfile.id && String(prev[key] || '').trim()) return;
        next[key] = value;
        changed = true;
      });

      return changed ? next : prev;
    });
  }, [isVmTrial, selectedConfigProfile, selectedVmPackageDefaults]);

  const isCloudDbPackageCustomized = useMemo(() => {
    if (!isCloudDbTrial || !selectedCloudDbPackageDefaults) return false;
    return CLOUD_DB_PACKAGE_KEYS.some(key => {
      const currentValue = String(answers[key] || '').trim();
      const defaultValue = String(selectedCloudDbPackageDefaults[key] || '').trim();
      return currentValue && currentValue !== defaultValue;
    });
  }, [answers, isCloudDbTrial, selectedCloudDbPackageDefaults]);
  const isMysqlPackageCustomized = useMemo(() => {
    if (!isMysqlTrial || !selectedMysqlPackageDefaults) return false;
    return MYSQL_PACKAGE_KEYS.some(key => {
      const currentValue = String(answers[key] || '').trim();
      const defaultValue = String(selectedMysqlPackageDefaults[key] || '').trim();
      return currentValue && currentValue !== defaultValue;
    });
  }, [answers, isMysqlTrial, selectedMysqlPackageDefaults]);
  const isObjectStoragePackageCustomized = useMemo(() => {
    if (spec?.id !== 'obj-storage' || !selectedObjectStoragePackage) return false;
    return OBJECT_STORAGE_PACKAGE_KEYS.some(key => {
      const currentValue = String(answers[key] || '').trim();
      const defaultValue = String(selectedObjectStoragePackage.defaults[key] || '').trim();
      return currentValue && currentValue !== defaultValue;
    });
  }, [answers, selectedObjectStoragePackage, spec?.id]);
  const isVmPackageCustomized = useMemo(() => {
    if (!isVmTrial || !selectedVmPackageDefaults) return false;
    const packageKeys = isVmPublicTrial ? VM_PUBLIC_PACKAGE_KEYS : VM_PRIVATE_PACKAGE_KEYS;
    return packageKeys.some(key => {
      const currentValue = String(answers[key] || '').trim();
      const defaultValue = String(selectedVmPackageDefaults[key] || '').trim();
      return currentValue && currentValue !== defaultValue;
    });
  }, [answers, isVmPublicTrial, isVmTrial, selectedVmPackageDefaults]);
  const isContainerPackageCustomized = useMemo(() => {
    if (!isContainerTrial || !selectedContainerTrialPackage) return false;
    const textCustomized = CONTAINER_PACKAGE_KEYS.some(key => {
      const currentValue = String(answers[key] || '').trim();
      const defaultValue = String(selectedContainerTrialPackage.defaults[key] || '').trim();
      return currentValue && currentValue !== defaultValue;
    });
    const booleanCustomized = Object.entries(selectedContainerTrialPackage.booleans).some(([key, value]) => (
      booleanAnswers[key] !== undefined && booleanAnswers[key] !== value
    ));
    return textCustomized || booleanCustomized;
  }, [answers, booleanAnswers, isContainerTrial, selectedContainerTrialPackage]);

  const baseApprovalStages = useMemo(
    () => resolveApprovalStages(selectedEnvironment, approvalPolicy),
    [approvalPolicy, selectedEnvironment],
  );
  const triggeredApprovalRules = useMemo(
    () => getTriggeredRules(approvalPolicy, answers, booleanAnswers),
    [approvalPolicy, answers, booleanAnswers],
  );
  const effectiveApprovalStages = useMemo(
    () => mergeApprovalStages(baseApprovalStages, triggeredApprovalRules, approvalPolicy),
    [approvalPolicy, baseApprovalStages, triggeredApprovalRules],
  );
  const approvalStageSnapshots = useMemo(
    () => buildApprovalStageSnapshots(baseApprovalStages, effectiveApprovalStages),
    [baseApprovalStages, effectiveApprovalStages],
  );
  const approvalTriggerSnapshots = useMemo(
    () => buildApprovalTriggerSnapshots(triggeredApprovalRules, effectiveApprovalStages, effectiveProductionFieldDefs, fields),
    [triggeredApprovalRules, effectiveApprovalStages, effectiveProductionFieldDefs, fields],
  );
  const summaryItems = useMemo(() => {
    const summaryFieldKeys = resolveSummaryFieldKeys(visibleFields);
    return visibleFields
      .filter(field => summaryFieldKeys.includes(field.key))
      .slice(0, 8)
      .map(field => {
        const rawBoolean = booleanAnswers[field.key];
        const rawText = answers[field.key];
        const optionLabel = field.options?.find(option => option.value === rawText)?.label;
        const value = field.type === 'boolean'
          ? (rawBoolean ? '是' : '否')
          : optionLabel || rawText || '—';
        return { key: field.key, label: field.label, value };
      })
      .filter(item => item.value !== '—');
  }, [answers, booleanAnswers, visibleFields]);

  if (!spec) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">服务不存在</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>返回首页</Button>
      </div>
    );
  }

  const handleGenerateAI = () => {
    if (isArchitectureAwareTrial && !hasArchitectureAttachment) {
      setValidationMessage('请先上传架构图，当前环节已按必填处理。');
      return;
    }

    const missingRequired = effectiveProductionFieldDefs.filter(field => {
      const textValue = answers[field.key];
      const booleanValue = booleanAnswers[field.key];
      const requiredInCurrentEnv = field.required || (field.conditionalRequired && selectedEnvironment === 'PROD');
      if (!requiredInCurrentEnv) return false;
      if (field.type === 'boolean') return booleanValue === undefined;
      return !String(textValue || '').trim();
    });
    if (missingRequired.length > 0) {
      const requiredLabel = missingRequired.map(field => field.label).join('、');
      setValidationMessage(`请先在表单中补全以下字段：${requiredLabel}`);
      return;
    }
    setValidationMessage(null);
    setLoading(true);
    setTimeout(() => {
      const p = clonePlan(
        isMysqlTrial
          ? buildMysqlTrialPlan(answers)
          : isContainerTrial
            ? buildContainerTrialPlan(spec!.name, answers, booleanAnswers)
            : buildOrchestratedPlan(spec!.name, estimatedTime),
      );
      setPlan(p);
      setLoading(false);
      setStep(1);
    }, 1500);
  };

  const handleSubmit = () => {
    const mergedAnswers = enrichAnswersWithDerivedSpec({
      ...answers,
      ...Object.fromEntries(Object.entries(booleanAnswers).map(([key, value]) => [key, value ? 'true' : 'false'])),
    });
    const submittedAt = new Date().toLocaleString('zh-CN');
    const aiConfigText = buildAiConfig(aiConfigTemplate, mergedAnswers, spec!.name);
    const initiationValues: Record<string, string | boolean | undefined> = {
      ...answers,
      ...booleanAnswers,
      ...mergedAnswers,
      applicationName: mergedAnswers.applicationName || mergedAnswers.systemName || spec!.name,
      systemName: mergedAnswers.systemName || mergedAnswers.applicationName || spec!.name,
    };
    const initiationForm = buildInitiationFormSnapshot({
      workflowMode: 'atomic_service',
      submittedAt,
      values: initiationValues,
      schemaVersion: spec!.inputTemplateVersionId || spec!.version,
    });
    const initiationStageDetail = buildInitiationStageDetail({
      workflowMode: 'atomic_service',
      submittedAt,
      values: initiationValues,
      reviewFocus: approvalStageSnapshots.map(stage => `${stage.stageName}(${stage.role})`),
      steps: [
        {
          stepCode: 'input',
          stepName: '申请表单填写',
          status: 'completed',
          summary: `已按 ${selectedEnvironment} 环境完成申请参数填写`,
          enteredAt: submittedAt,
          completedAt: submittedAt,
        },
        {
          stepCode: 'approval-precheck',
          stepName: '审批链预判',
          status: 'completed',
          summary: approvalStageSnapshots.length > 0 ? `已识别 ${approvalStageSnapshots.length} 个审批节点` : '未识别额外审批节点',
          enteredAt: submittedAt,
          completedAt: submittedAt,
        },
      ],
      schemaVersion: spec!.inputTemplateVersionId || spec!.version,
    });
    const order = createOrder({
      comboId: spec!.id,
      comboName: spec!.name,
      services: [spec!.name],
      aiConfig: aiConfigText,
      answers: mergedAnswers,
      extras: {},
      initiationForm,
      initiationStageDetail,
      approvalStages: approvalStageSnapshots,
      approvalTriggers: approvalTriggerSnapshots,
      sourceSpecId: spec!.id,
      formSchemaVersion: spec!.inputTemplateVersionId || spec!.version,
      outputSchemaVersion: spec!.outputTemplateVersionId || spec!.version,
      orchestratedPlan: plan || undefined,
    });
    setOrderId(order.id);
    setStep(2);
  };

  const updatePlanField = (field: 'summary' | 'estimatedTime', value: string) => {
    setPlan(current => current ? { ...current, [field]: value } : current);
  };

  const updatePlanResource = (resourceIndex: number, field: 'name' | 'purpose', value: string) => {
    setPlan(current => {
      if (!current) return current;
      return {
        ...current,
        resources: current.resources.map((resource, index) => (
          index === resourceIndex ? { ...resource, [field]: value } : resource
        )),
      };
    });
  };

  const updatePlanResourceSpec = (resourceIndex: number, specKey: string, value: string) => {
    setPlan(current => {
      if (!current) return current;
      return {
        ...current,
        resources: current.resources.map((resource, index) => (
          index === resourceIndex
            ? {
                ...resource,
                spec: {
                  ...resource.spec,
                  [specKey]: value,
                },
              }
            : resource
        )),
      };
    });
  };

  const updatePlanIntegrationEnabled = (integrationIndex: number, enabled: boolean) => {
    setPlan(current => {
      if (!current) return current;
      return {
        ...current,
        integrations: current.integrations.map((integration, index) => (
          index === integrationIndex ? { ...integration, enabled } : integration
        )),
      };
    });
  };

  const updatePlanIntegrationConfig = (integrationIndex: number, configKey: string, value: string) => {
    setPlan(current => {
      if (!current) return current;
      return {
        ...current,
        integrations: current.integrations.map((integration, index) => (
          index === integrationIndex
            ? {
                ...integration,
                config: {
                  ...integration.config,
                  [configKey]: value,
                },
              }
            : integration
        )),
      };
    });
  };

  const enabledIntegrationCount = plan?.integrations.filter(integration => integration.enabled).length ?? 0;
  const hasArchitectureAttachment = Boolean(architectureFileName.trim());
  const architectureArtifacts: UploadedArtifact[] = hasArchitectureAttachment
    ? [{ name: architectureFileName, type: 'architecture', sizeLabel: answers.architectureFileSizeLabel || '已作为 AI 推荐增强输入引用' }]
    : [];

  const handleArchitectureFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setArchitectureFileName(file.name);
    setAnswers(prev => ({
      ...prev,
      architectureTemplateName: ARCHITECTURE_TEMPLATE_LABEL,
      architectureFileName: file.name,
      architectureFileSizeLabel: formatArtifactSizeLabel(file, '已作为 AI 推荐增强输入引用'),
      architectureAiInput: 'enabled',
    }));
    event.target.value = '';
  };

  const handleClearArchitectureFile = () => {
    setArchitectureFileName('');
    setAnswers(prev => ({
      ...prev,
      architectureTemplateName: ARCHITECTURE_TEMPLATE_LABEL,
      architectureFileName: '',
      architectureFileSizeLabel: '',
      architectureAiInput: 'disabled',
    }));
  };

  const steps = ['需求描述', 'AI 推荐', '提交成功'];

  return (
    <ApplyPageShell>
      {/* Progress Steps */}
      <div className="flex items-center gap-0">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                i < step
                  ? 'bg-primary text-primary-foreground'
                  : i === step
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {i < step ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`text-sm whitespace-nowrap ${
                i <= step ? 'text-foreground font-medium' : 'text-muted-foreground'
              }`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-4 transition-colors ${
                i < step ? 'bg-primary' : 'bg-border'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Form */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">{spec.name}</CardTitle>
              {demoTag && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                  {demoTag}
                </span>
              )}
            </div>
            <CardDescription>{spec.serviceSummary || spec.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {(spec.supportedEnvironments?.length || spec.deliveryOutputs?.length || approvalPolicy) && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70">
                <button
                  type="button"
                  onClick={() => setGuideOpen(value => !value)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">申请概览</div>
                    <div className="mt-1 text-xs text-slate-500">环境 / 审批 / 交付物</div>
                  </div>
                  <span className="text-xs text-slate-500">{guideOpen ? '收起' : '展开'}</span>
                </button>
                {guideOpen && (
                  <div className="grid gap-3 border-t border-slate-200 px-4 py-3 md:grid-cols-3">
                    <div className="rounded-xl bg-white px-3 py-3">
                      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">环境</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(spec.supportedEnvironments || []).map(env => (
                          <span key={env} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700">{env}</span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-3">
                      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">审批</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {effectiveApprovalStages.map(stage => (
                          <span key={stage.stageCode} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700">{stage.stageName}</span>
                        ))}
                        {!approvalPolicy && <span className="text-xs text-slate-500">标准评审</span>}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-3">
                      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">交付物</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(spec.deliveryOutputs || []).map(output => (
                          <span key={output.key} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700">{output.label}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-4">
              {isMysqlTrial && selectedConfigProfile && (
                <div className="rounded-2xl border border-sky-200 bg-[linear-gradient(180deg,rgba(240,249,255,0.95)_0%,rgba(255,255,255,0.98)_100%)] px-4 py-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-600">推荐套餐</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-slate-900">{selectedConfigProfile.name}</div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          isMysqlPackageCustomized
                            ? 'border border-amber-200 bg-amber-50 text-amber-700'
                            : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}>
                          {isMysqlPackageCustomized ? '已改为自定义配置' : '已按默认套餐带出'}
                        </span>
                      </div>
                      <div className="mt-1 text-xs leading-5 text-slate-600">
                        已按 {selectedEnvironment || '当前环境'} 默认带出部署方式、容量、备份与高可用策略，你仍可继续修改。
                      </div>
                      {showPackageReferenceButton && (
                        <Button variant="ghost" className="mt-2 h-7 px-2 text-xs text-sky-700 hover:text-sky-800" onClick={() => setPackageReferenceOpen(true)}>
                          查看套餐参考
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs text-slate-700">{selectedConfigProfile.cpu}</span>
                      <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs text-slate-700">{selectedConfigProfile.memory}</span>
                      <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs text-slate-700">{selectedConfigProfile.disk}</span>
                    </div>
                  </div>
                </div>
              )}
              {isCloudDbTrial && selectedConfigProfile && (
                <div className="rounded-2xl border border-sky-200 bg-[linear-gradient(180deg,rgba(240,249,255,0.95)_0%,rgba(255,255,255,0.98)_100%)] px-4 py-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-600">推荐套餐</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-slate-900">{selectedConfigProfile.name}</div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          isCloudDbPackageCustomized
                            ? 'border border-amber-200 bg-amber-50 text-amber-700'
                            : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}>
                          {isCloudDbPackageCustomized ? '已改为自定义配置' : '已按默认套餐带出'}
                        </span>
                      </div>
                      <div className="mt-1 text-xs leading-5 text-slate-600">
                        已按 {selectedEnvironment || '当前环境'} 默认带出 CPU、内存、容量、高可用与备份策略，你仍可继续修改。
                      </div>
                      {showPackageReferenceButton && (
                        <Button variant="ghost" className="mt-2 h-7 px-2 text-xs text-sky-700 hover:text-sky-800" onClick={() => setPackageReferenceOpen(true)}>
                          查看套餐参考
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs text-slate-700">{selectedConfigProfile.cpu}</span>
                      <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs text-slate-700">{selectedConfigProfile.memory}</span>
                      <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs text-slate-700">{selectedConfigProfile.disk}</span>
                    </div>
                  </div>
                </div>
              )}
              {spec?.id === 'obj-storage' && selectedObjectStoragePackage && (
                <div className="rounded-2xl border border-sky-200 bg-[linear-gradient(180deg,rgba(240,249,255,0.95)_0%,rgba(255,255,255,0.98)_100%)] px-4 py-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-600">推荐套餐</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-slate-900">{selectedObjectStoragePackage.name}</div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          isObjectStoragePackageCustomized
                            ? 'border border-amber-200 bg-amber-50 text-amber-700'
                            : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}>
                          {isObjectStoragePackageCustomized ? '已改为自定义配置' : '已按默认套餐带出'}
                        </span>
                      </div>
                      <div className="mt-1 text-xs leading-5 text-slate-600">
                        已按 {selectedEnvironment || '当前环境'} 默认带出容量、AK/SK、使用时长与访问控制策略，你仍可继续修改。
                      </div>
                      {showPackageReferenceButton && (
                        <Button variant="ghost" className="mt-2 h-7 px-2 text-xs text-sky-700 hover:text-sky-800" onClick={() => setPackageReferenceOpen(true)}>
                          查看套餐参考
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedObjectStoragePackage.summary.map(item => (
                        <span key={item} className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs text-slate-700">{item}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {isContainerTrial && selectedContainerTrialPackage && (
                <div className="rounded-2xl border border-sky-200 bg-[linear-gradient(180deg,rgba(240,249,255,0.95)_0%,rgba(255,255,255,0.98)_100%)] px-4 py-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-600">推荐套餐</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-slate-900">{selectedContainerTrialPackage.name}</div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          isContainerPackageCustomized
                            ? 'border border-amber-200 bg-amber-50 text-amber-700'
                            : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}>
                          {isContainerPackageCustomized ? '已改为自定义配置' : '已按默认套餐带出'}
                        </span>
                      </div>
                      <div className="mt-1 text-xs leading-5 text-slate-600">
                        已按 {selectedEnvironment || '当前环境'} 默认带出容器实例数、单实例规格和基础平台接入项，你仍可继续修改。
                      </div>
                      {showPackageReferenceButton && (
                        <Button variant="ghost" className="mt-2 h-7 px-2 text-xs text-sky-700 hover:text-sky-800" onClick={() => setPackageReferenceOpen(true)}>
                          查看套餐参考
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedContainerTrialPackage.summary.map(item => (
                        <span key={item} className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs text-slate-700">{item}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {isVmTrial && selectedConfigProfile && selectedVmPackageDefaults && (
                <div className="rounded-2xl border border-sky-200 bg-[linear-gradient(180deg,rgba(240,249,255,0.95)_0%,rgba(255,255,255,0.98)_100%)] px-4 py-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-600">推荐套餐</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-slate-900">{selectedConfigProfile.name}</div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          isVmPackageCustomized
                            ? 'border border-amber-200 bg-amber-50 text-amber-700'
                            : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}>
                          {isVmPackageCustomized ? '已改为自定义配置' : '已按默认套餐带出'}
                        </span>
                      </div>
                      <div className="mt-1 text-xs leading-5 text-slate-600">
                        已按 {selectedEnvironment || '当前环境'} 默认带出 CPU、内存、磁盘与运行策略，你仍可继续修改。
                      </div>
                      {showPackageReferenceButton && (
                        <Button variant="ghost" className="mt-2 h-7 px-2 text-xs text-sky-700 hover:text-sky-800" onClick={() => setPackageReferenceOpen(true)}>
                          查看套餐参考
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs text-slate-700">{selectedConfigProfile.cpu}</span>
                      <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs text-slate-700">{selectedConfigProfile.memory}</span>
                      <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs text-slate-700">{selectedConfigProfile.disk}</span>
                      <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs text-slate-700">
                        {isVmPublicTrial ? '公网接入' : '私网交付'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {templateEnvironmentConfig && selectedTemplateProfileGroups.length !== 0 && selectedTemplateEnvironmentProfile && (
                <div className="rounded-2xl border border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.9)_0%,rgba(255,255,255,0.98)_100%)] px-4 py-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600">模板推荐</div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">
                        {selectedTemplateEnvironmentProfile.name || '当前环境默认套餐'}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-slate-600">
                        已按 {selectedTemplateEnvironmentValue || '当前环境'} 从 {templateRecommendedGroup?.title || '已绑定套餐分类'} 带出模板推荐字段，你仍可继续修改。
                      </div>
                      {showPackageReferenceButton && (
                        <Button variant="ghost" className="mt-2 h-7 px-2 text-xs text-emerald-700 hover:text-emerald-800" onClick={() => setPackageReferenceOpen(true)}>
                          查看套餐参考
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs text-slate-700">
                        环境字段：{templateEnvironmentFieldKey}
                      </span>
                      <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs text-slate-700">
                        推荐来源：{templateRecommendedGroup?.title || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {showPackageReferenceButton && (
                <PackageReferenceDialog
                  open={packageReferenceOpen}
                  onOpenChange={setPackageReferenceOpen}
                  title={packageReferenceTitle}
                  description={packageReferenceDescription}
                  entries={packageReferenceEntries}
                  selectedEnvironment={templateRecommendedGroup ? selectedTemplateEnvironmentValue : selectedEnvironment}
                />
              )}
              <TemplateFormLayout
                fields={visibleFields}
                layout={visibleLayout}
                textValues={answers}
                setTextValues={setAnswersWithTemplateTracking}
                booleanValues={booleanAnswers}
                setBooleanValues={setBooleanAnswers}
                gridClassName={trialGridClassName}
              />
              {isArchitectureAwareTrial && (
                <ArchitectureArtifactField
                  required
                  description={hasArchitectureAttachment ? '已上传架构图，系统会优先按拓扑材料生成建议。' : '请先上传架构图，用于识别组件关系、网络边界和高可用拓扑。'}
                  artifacts={architectureArtifacts}
                  emptyHint="请上传按模板补充完成的架构图。建议至少标注调用方、数据库位置、访问链路、主备/集群和容灾诉求。"
                  hintText="请直接基于平台提供的架构图模版补充内容，保留模板里的参考元素，在模板基础上完善应用、链路、数据库和部署关系后上传即可。"
                  inputId="atomic-architecture-file-upload"
                  onFileChange={handleArchitectureFileChange}
                  onRemove={() => handleClearArchitectureFile()}
                />
              )}
              {showEnvironmentField && isEnvironmentReadonly ? (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                  <div className="text-xs font-medium text-slate-500">目标环境</div>
                  <div className="text-sm text-slate-900">{selectedEnvironment || '—'}</div>
                </div>
              ) : null}
            </div>

            {selectedEnvironment === 'PROD' && effectiveProductionFieldDefs.some(field => field.conditionalRequired) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
                PROD 申请，请确认安全、备份和高可用配置。
              </div>
            )}

            {triggeredApprovalRules.length > 0 && (
              <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-sky-900">
                <div className="font-medium">已触发附加审批</div>
                <div className="mt-2 space-y-1.5 text-xs leading-5 text-sky-800">
                  {triggeredApprovalRules.map(rule => {
                    const field = effectiveProductionFieldDefs.find(item => item.key === rule.fieldKey) || fields.find(item => item.key === rule.fieldKey);
                    const matchedStages = effectiveApprovalStages
                      .filter(stage => rule.appendStages.includes(stage.stageCode))
                      .map(stage => stage.stageName)
                      .join('、');

                    return (
                      <div key={`${rule.fieldKey}-${rule.operator}-${String(rule.value)}`}>
                        {field?.label || rule.fieldKey} 满足「{rule.operator} {formatRuleValue(rule)}」，已追加 {matchedStages || '审批'}。
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {summaryItems.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-medium text-foreground">关键信息确认</div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {summaryItems.map(item => (
                    <div key={item.key} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 gap-3">
                      <div className="text-xs text-slate-500">{item.label}</div>
                      <div className="text-sm text-right text-slate-900">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {validationMessage && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-rose-800">
                {validationMessage}
              </div>
            )}

            <div className="flex justify-end">
              <Button className="min-w-[220px]" onClick={handleGenerateAI}>
                下一步：生成需求建议
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: AI Config */}
      {step === 1 && plan && (
        <div className="space-y-4">
          {loading && (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-4xl mb-4 animate-pulse">🤖</div>
                <p className="text-sm text-muted-foreground">AI 正在分析需求并生成建议内容...</p>
              </CardContent>
            </Card>
          )}
          {!loading && (
            <>
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">AI 推荐方案确认</CardTitle>
                      <CardDescription className="mt-1">请优先确认资源主体和交付时长，平台默认能力已自动带出。</CardDescription>
                    </div>
                    <div className={`rounded-full border px-3 py-1 text-xs ${
                      isNonStandardPlan(plan.summary)
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}>
                      {isNonStandardPlan(plan.summary) ? '非标方案' : '标准方案'}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">建议依据</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">表单字段</span>
                      {isArchitectureAwareTrial && (
                        <span className={`rounded-full border px-3 py-1 text-xs ${
                          hasArchitectureAttachment
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white text-slate-500'
                        }`}>
                          {hasArchitectureAttachment ? `架构图：${architectureFileName}` : '当前未上传架构图'}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 text-xs leading-5 text-slate-500">
                      {isArchitectureAwareTrial
                        ? (
                          hasArchitectureAttachment
                            ? 'AI 推荐将同时参考表单字段和已上传的架构图，用于校正部署方式、容量和容灾建议。'
                            : '当前推荐仅基于表单字段生成。如需更准确建议，可返回上一步上传架构图。'
                        )
                        : '当前推荐基于表单字段和标准交付规则生成。'}
                    </div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.9fr)]">
                    <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#FCFEFF_0%,#F5F9FC_100%)] p-4 shadow-sm">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">方案摘要</div>
                      <div className="mt-3 space-y-2">
                        <Label htmlFor="plan-summary" className="sr-only">方案摘要</Label>
                        <Textarea
                          id="plan-summary"
                          rows={3}
                          value={plan.summary}
                          onChange={event => updatePlanField('summary', event.target.value)}
                        />
                      </div>
                      <div className="mt-3 text-xs text-slate-500">
                        建议概括本次资源交付的标准程度、目标对象和交付边界。
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">预计交付时长</div>
                        <div className="mt-3 space-y-2">
                          <Label htmlFor="plan-estimated-time" className="sr-only">预计交付时长</Label>
                          <Input
                            id="plan-estimated-time"
                            value={plan.estimatedTime}
                            onChange={event => updatePlanField('estimatedTime', event.target.value)}
                          />
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">方案概览</div>
                        <div className="mt-3 grid gap-2">
                          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                            <span className="text-xs text-slate-500">资源项</span>
                            <span className="text-sm font-medium text-slate-900">{plan.resources.length} 项</span>
                          </div>
                          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                            <span className="text-xs text-slate-500">默认能力</span>
                            <span className="text-sm font-medium text-slate-900">{enabledIntegrationCount}/{plan.integrations.length}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-foreground">资源清单</div>
                        <div className="mt-1 text-xs text-slate-500">这是本次交付的主体资源，建议优先确认名称、用途和规格。</div>
                      </div>
                      <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                        已生成 {plan.resources.length} 项资源
                      </div>
                    </div>
                    <div className="space-y-3">
                      {plan.resources.map((resource, resourceIndex) => (
                        <div key={`${resource.type}-${resourceIndex}`} className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#FFFFFF_0%,#F7FAFC_100%)] p-5 shadow-sm">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium text-slate-900">{resource.name || `资源 ${resourceIndex + 1}`}</div>
                              <div className="mt-1 text-xs text-slate-500">{resource.type.toUpperCase()} 交付对象</div>
                            </div>
                            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
                              {resource.type}
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`resource-name-${resourceIndex}`}>资源名称</Label>
                              <Input
                                id={`resource-name-${resourceIndex}`}
                                value={resource.name}
                                onChange={event => updatePlanResource(resourceIndex, 'name', event.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`resource-purpose-${resourceIndex}`}>用途说明</Label>
                              <Input
                                id={`resource-purpose-${resourceIndex}`}
                                value={resource.purpose}
                                onChange={event => updatePlanResource(resourceIndex, 'purpose', event.target.value)}
                              />
                            </div>
                          </div>
                          {Object.keys(resource.spec).length > 0 && (
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              {Object.entries(resource.spec).map(([specKey, specValue]) => (
                                <div key={specKey} className="space-y-2">
                                  <Label htmlFor={`resource-${resourceIndex}-spec-${specKey}`}>{specKey}</Label>
                                  <Input
                                    id={`resource-${resourceIndex}-spec-${specKey}`}
                                    value={String(specValue)}
                                    onChange={event => updatePlanResourceSpec(resourceIndex, specKey, event.target.value)}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70">
                      <button
                        type="button"
                        onClick={() => setIntegrationsOpen(value => !value)}
                        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                      >
                        <div>
                          <div className="text-sm font-medium text-foreground">平台默认配套能力</div>
                          <div className="mt-1 text-xs text-slate-500">
                            监控、日志、备份、安全按平台标准默认带出，如需调整再展开查看。
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-xs text-slate-500">{enabledIntegrationCount}/{plan.integrations.length} 已启用</div>
                          <div className="mt-1 text-xs text-slate-500">{integrationsOpen ? '收起' : '展开'}</div>
                        </div>
                      </button>
                      {integrationsOpen && (
                        <div className="space-y-3 border-t border-slate-200 px-4 py-4">
                          {plan.integrations.map((integration, integrationIndex) => (
                            <div key={`${integration.type}-${integrationIndex}`} className="rounded-xl border border-slate-200 bg-white p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-sm font-medium text-slate-900">
                                    {INTEGRATION_LABELS[integration.type] ?? integration.type}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    按需启用并调整当前集成参数。
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-500">{integration.enabled ? '已启用' : '未启用'}</span>
                                  <Switch
                                    checked={integration.enabled}
                                    onCheckedChange={checked => updatePlanIntegrationEnabled(integrationIndex, checked)}
                                  />
                                </div>
                              </div>
                              {Object.keys(integration.config).length > 0 && (
                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                  {Object.entries(integration.config).map(([configKey, configValue]) => (
                                    <div key={configKey} className="space-y-2">
                                      <Label htmlFor={`integration-${integrationIndex}-config-${configKey}`}>{configKey}</Label>
                                      <Input
                                        id={`integration-${integrationIndex}-config-${configKey}`}
                                        value={String(configValue)}
                                        onChange={event => updatePlanIntegrationConfig(integrationIndex, configKey, event.target.value)}
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setStep(0); setPlan(null); }}>重新填写</Button>
                <Button className="min-w-[220px]" onClick={handleSubmit}>确认并提交申请</Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Success */}
      {step === 2 && orderId && (
        <Card>
          <CardContent className="py-10">
            <div className="mx-auto max-w-xl rounded-[28px] border border-emerald-200 bg-[linear-gradient(180deg,#F4FFF7_0%,#FFFFFF_100%)] px-6 py-8 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-light">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">已提交</div>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">申请提交成功</h2>
              <p className="mt-1 text-sm text-slate-600">当前申请已进入流转。</p>
              <p className="mt-2 text-sm text-slate-600">
                工单号：<span className="font-mono text-primary font-medium">{orderId}</span>
              </p>
              <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-3 text-left">
                <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
                  <div className="text-[11px] text-slate-500">下一步</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">查看审批与方案确认</div>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
                  <div className="text-[11px] text-slate-500">交付结果</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">交付后进入待验收</div>
                </div>
              </div>
              <div className="mt-6 flex gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate('/orders')}>查看我的工单</Button>
                <Button onClick={() => navigate(`/order/${orderId}`)}>查看工单详情</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </ApplyPageShell>
  );
}
