import type {
  ApplyWorkflowMode,
  InitiationFieldGroup,
  InitiationFieldSnapshot,
  InitiationFormSnapshot,
  InitiationInputMode,
  InitiationSectionSnapshot,
  InitiationStageDetail,
  InitiationStageStepSnapshot,
  OrderAiAnalysisSummary,
  OrderAttachment,
} from '../types';

type BuildInitiationSnapshotParams = {
  workflowMode: ApplyWorkflowMode;
  submittedAt: string;
  values: Record<string, string | boolean | undefined>;
  attachments?: OrderAttachment[];
  aiAnalysisSummary?: OrderAiAnalysisSummary;
  reviewFocus?: string[];
  steps?: InitiationStageStepSnapshot[];
  schemaVersion?: string;
};

const FIELD_LABELS: Record<string, string> = {
  systemCode: '系统编号',
  systemName: '系统名称',
  applicationName: '应用名称',
  applicationEnglishName: '应用英文名',
  applicationDescription: '应用描述',
  moduleName: '模块',
  businessDomain: '业务域',
  supplier: '应用供应商名称',
  environment: '申请环境',
  owner: '负责人',
  assignee: '担当',
  domainAccount: '域账号',
  businessCategory: '应用所属业务',
  mobile: '手机号码',
  email: '邮箱',
  permissionItems: '申请权限',
  priority: '优先级',
  timeRequirement: '期望交付时限',
  usageDuration: '使用时长',
  slaLevel: 'SLA等级',
  businessPurpose: '业务用途',
  businessGoal: '业务目标',
  scale: '规模等级',
  businessCriticality: '业务重要级别',
  region: '地域',
  zone: '可用区',
  resourcePool: '资源池',
  vpc: 'VPC',
  subnet: '子网',
  securityGroup: '安全组',
  ipAssignMode: 'IP分配方式',
  domainName: '域名',
  listenerProtocol: '监听协议',
  listenerPort: '监听端口',
  publicAccess: '公网访问',
  cpu: 'CPU',
  memory: '内存',
  instanceCount: '实例数量',
  systemDiskSize: '系统盘容量',
  dataDiskSize: '数据盘容量',
  osImage: '操作系统镜像',
  dbVersion: '数据库版本',
  deployMode: '部署方式',
  bucketName: 'Bucket名称',
  directoryName: '桶内目录名称',
  sfsName: 'SFS名称',
  akSkCount: 'AK/SK数量',
  configProfile: '配置选择',
  vmType: '类型',
  sourceAssetCode: '源资产编号',
  sourceAddress: '源地址',
  targetAsset: '目标资产',
  targetAddress: '目标地址',
  portType: '端口类型',
  portRange: '端口',
  backupPolicy: '备份策略',
  retentionPeriod: '备份保留周期',
  haRequirement: '高可用要求',
  securityLevel: '安全等级',
  certificateRequirement: '证书要求',
  auditRequirement: '审计要求',
};

const FIELD_GROUPS: Record<string, InitiationFieldGroup> = {
  systemCode: 'base_info',
  systemName: 'base_info',
  applicationName: 'base_info',
  applicationEnglishName: 'base_info',
  applicationDescription: 'base_info',
  moduleName: 'base_info',
  businessDomain: 'base_info',
  supplier: 'base_info',
  environment: 'base_info',
  owner: 'base_info',
  assignee: 'base_info',
  domainAccount: 'base_info',
  businessCategory: 'base_info',
  mobile: 'base_info',
  email: 'base_info',
  permissionItems: 'base_info',
  priority: 'base_info',
  timeRequirement: 'base_info',
  usageDuration: 'base_info',
  slaLevel: 'base_info',
  businessPurpose: 'request_goal',
  businessGoal: 'request_goal',
  scale: 'request_goal',
  businessCriticality: 'request_goal',
  region: 'network_access',
  zone: 'network_access',
  resourcePool: 'network_access',
  vpc: 'network_access',
  subnet: 'network_access',
  securityGroup: 'network_access',
  ipAssignMode: 'network_access',
  domainName: 'network_access',
  listenerProtocol: 'network_access',
  listenerPort: 'network_access',
  publicAccess: 'network_access',
  cpu: 'resource_spec',
  memory: 'resource_spec',
  instanceCount: 'resource_spec',
  systemDiskSize: 'resource_spec',
  dataDiskSize: 'resource_spec',
  osImage: 'resource_spec',
  dbVersion: 'resource_spec',
  deployMode: 'resource_spec',
  bucketName: 'resource_spec',
  directoryName: 'resource_spec',
  sfsName: 'resource_spec',
  akSkCount: 'resource_spec',
  configProfile: 'resource_spec',
  vmType: 'resource_spec',
  sourceAssetCode: 'network_access',
  sourceAddress: 'network_access',
  targetAsset: 'network_access',
  targetAddress: 'network_access',
  portType: 'network_access',
  portRange: 'network_access',
  backupPolicy: 'security_policy',
  retentionPeriod: 'security_policy',
  haRequirement: 'security_policy',
  securityLevel: 'security_policy',
  certificateRequirement: 'security_policy',
  auditRequirement: 'security_policy',
};

const FIELD_ALIASES: Record<string, string> = {
  targetEnv: 'environment',
  targetEnvironment: 'environment',
  domain: 'domainName',
  useDuration: 'usageDuration',
  appName: 'applicationName',
  system: 'systemName',
  ports: 'listenerPort',
};

const GROUP_TITLES: Record<InitiationFieldGroup, string> = {
  base_info: '基础信息',
  request_goal: '需求与目标',
  network_access: '网络与访问',
  resource_spec: '资源与规格',
  security_policy: '安全与策略',
  attachments: '附件',
  ai_summary: 'AI分析',
};

function stringifyValue(value: string | boolean | undefined) {
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  return String(value ?? '').trim();
}

export function normalizeInitiationValues(values: Record<string, string | boolean | undefined>) {
  const normalized: Record<string, string | boolean | undefined> = {};

  for (const [key, value] of Object.entries(values)) {
    const targetKey = FIELD_ALIASES[key] || key;
    normalized[targetKey] = value;
  }

  return normalized;
}

const DISPLAY_LABEL_ALIASES: Record<string, string> = {
  系统代码: '系统编号',
  所属系统: '系统编号',
  申请环境: '环境',
  所属环境: '环境',
  模块: '模块名称',
  应用名称: '应用名称',
  应用英文名称: '应用英文名',
  供应商: '应用供应商名称',
  使用时长: '使用时间',
  Bucket名称: '桶名称',
};

export function normalizeInitiationFieldLabel(label: string) {
  return DISPLAY_LABEL_ALIASES[label] || label;
}

function buildFieldSnapshots(values: Record<string, string | boolean | undefined>) {
  const normalized = normalizeInitiationValues(values);
  const snapshots: InitiationFieldSnapshot[] = [];

  for (const [key, value] of Object.entries(normalized)) {
    const displayValue = stringifyValue(value);
    if (!displayValue) continue;

    snapshots.push({
      key,
      label: FIELD_LABELS[key] || key,
      value: typeof value === 'boolean' ? String(value) : String(value),
      displayValue,
      group: FIELD_GROUPS[key] || 'request_goal',
      required: false,
      source: FIELD_ALIASES[key] ? 'derived' : 'user_input',
    });
  }

  return snapshots;
}

function buildSections(fields: InitiationFieldSnapshot[]): InitiationSectionSnapshot[] {
  const groups: InitiationFieldGroup[] = ['base_info', 'request_goal', 'network_access', 'resource_spec', 'security_policy'];

  return groups
    .map(group => ({
      id: group,
      title: GROUP_TITLES[group],
      fields: fields.filter(field => field.group === group),
    }))
    .filter(section => section.fields.length > 0);
}

function inferInputMode(
  normalizedValues: Record<string, string | boolean | undefined>,
  attachments: OrderAttachment[],
): InitiationInputMode {
  const hasArchitecture = attachments.some(item => item.kind === 'architecture');
  const hasConfig = attachments.some(item => item.kind === 'config');
  const hasBusiness = Boolean(stringifyValue(normalizedValues.businessGoal) || stringifyValue(normalizedValues.businessPurpose));

  if (hasArchitecture && hasConfig) return 'hybrid';
  if (hasArchitecture) return 'architecture_first';
  if (hasConfig) return 'config_guided';
  if (hasBusiness) return 'business_only';
  return 'business_only';
}

export function buildInitiationFormSnapshot({
  workflowMode,
  submittedAt,
  values,
  schemaVersion = '1.0.0',
}: BuildInitiationSnapshotParams): InitiationFormSnapshot {
  const fields = buildFieldSnapshots(values);

  return {
    schemaVersion,
    submittedAt,
    workflowMode,
    sections: buildSections(fields),
  };
}

export function buildInitiationStageDetail({
  submittedAt,
  values,
  attachments = [],
  aiAnalysisSummary,
  reviewFocus = [],
  steps = [],
}: BuildInitiationSnapshotParams): InitiationStageDetail {
  const normalizedValues = normalizeInitiationValues(values);
  const missingItems = aiAnalysisSummary?.missingItems || [];
  const riskHints = aiAnalysisSummary?.riskHints || [];
  const inputMode = inferInputMode(normalizedValues, attachments);

  return {
    inputMode,
    attachments,
    aiAnalysisSummary,
    missingItems,
    riskHints,
    reviewFocus,
    steps,
    exportSummary: [
      `发起时间：${submittedAt}`,
      `输入模式：${inputMode}`,
      reviewFocus.length ? `评审关注点：${reviewFocus.join('；')}` : '',
      missingItems.length ? `缺失项：${missingItems.join('；')}` : '',
      riskHints.length ? `风险提示：${riskHints.join('；')}` : '',
    ].filter(Boolean).join('\n'),
  };
}
