import type { AtomicServiceSpec, ProductionFieldDefinition } from '@aiops/shared';

export type AtomicServiceUiProfile = {
  architectureRequired?: boolean;
  formVariant?: 'mysqlTrial' | 'cloudDbTrial' | 'networkLbTrial' | 'networkPublicLbTrial' | 'containerTrial';
  demoTag?: string;
};

type AtomicServiceUiProfileRule = {
  matchKeys: string[];
  profile: AtomicServiceUiProfile;
};

export const MYSQL_TRIAL_FIELD_DEFINITIONS: ProductionFieldDefinition[] = [
  { key: 'applicationEnglishName', label: '应用英文名', type: 'text', required: true, category: '基础信息' },
  { key: 'applicationDescription', label: '应用描述', type: 'textarea', required: true, category: '需求与目标' },
  { key: 'businessPurpose', label: '业务用途', type: 'textarea', required: true, category: '需求与目标' },
  {
    key: 'businessCriticality',
    label: '业务重要级别',
    type: 'select',
    required: false,
    category: '需求与目标',
    options: [
      { label: '普通', value: 'standard' },
      { label: '重要', value: 'important' },
      { label: '核心', value: 'critical' },
    ],
  },
  { key: 'databaseName', label: '数据库名', type: 'text', required: false, category: '数据库配置' },
  {
    key: 'charset',
    label: '字符集/编码',
    type: 'text',
    required: false,
    category: '数据库配置',
    placeholder: '如：utf8mb4 / utf8mb4_unicode_ci',
  },
  {
    key: 'rtoTarget',
    label: 'RTO目标',
    type: 'select',
    required: false,
    category: 'SLA 与安全',
    options: [
      { label: '4小时内', value: '4h' },
      { label: '24小时内', value: '24h' },
      { label: '按需确认', value: 'custom' },
    ],
  },
  {
    key: 'rpoTarget',
    label: 'RPO目标',
    type: 'select',
    required: false,
    category: 'SLA 与安全',
    options: [
      { label: '15分钟内', value: '15m' },
      { label: '1小时内', value: '1h' },
      { label: '24小时内', value: '24h' },
    ],
  },
  { key: 'resourceRemark', label: '补充说明', type: 'textarea', required: false, category: '用户调整' },
];

export const CLOUD_DB_TRIAL_FIELD_DEFINITIONS: ProductionFieldDefinition[] = [
  { key: 'applicationName', label: '应用名称', type: 'text', required: true, category: '基础信息' },
  { key: 'applicationEnglishName', label: '应用英文名', type: 'text', required: true, category: '基础信息' },
  {
    key: 'environment',
    label: '申请环境',
    type: 'select',
    required: true,
    category: '基础信息',
    options: [
      { label: 'DEV', value: 'DEV' },
      { label: 'UAT', value: 'UAT' },
      { label: 'PROD', value: 'PROD' },
    ],
  },
  { key: 'applicationDescription', label: '应用描述', type: 'textarea', required: true, category: '需求与目标' },
  { key: 'businessPurpose', label: '业务用途', type: 'textarea', required: true, category: '需求与目标' },
  { key: 'databaseName', label: '数据库名', type: 'text', required: false, category: '数据库配置' },
  { key: 'cpu', label: 'CPU(C)', type: 'integer', required: true, category: '数据库配置', placeholder: '如：2、4、8' },
  { key: 'memory', label: '内存(GB)', type: 'integer', required: true, category: '数据库配置', placeholder: '如：4、8、16、32' },
  { key: 'dataDiskSize', label: '存储容量(GB)', type: 'integer', required: true, category: '数据库配置', placeholder: '如：100、200、500' },
  {
    key: 'backupPolicy',
    label: '备份策略',
    type: 'select',
    required: false,
    category: 'SLA 与安全',
    options: [
      { label: '每日', value: 'daily' },
      { label: '每周', value: 'weekly' },
      { label: '按需确认', value: 'on-demand' },
    ],
  },
  {
    key: 'securityLevel',
    label: '安全等级',
    type: 'select',
    required: false,
    category: 'SLA 与安全',
    options: [
      { label: '普通', value: 'normal' },
      { label: '重要', value: 'important' },
      { label: '核心', value: 'critical' },
    ],
  },
  { key: 'resourceRemark', label: '补充说明', type: 'textarea', required: false, category: '用户调整' },
];

export const NETWORK_LB_TRIAL_FIELD_DEFINITIONS: ProductionFieldDefinition[] = [
  { key: 'applicationName', label: '应用名称', type: 'text', required: true, category: '基础信息' },
  { key: 'applicationEnglishName', label: '应用英文名', type: 'text', required: true, category: '基础信息' },
  {
    key: 'environment',
    label: '申请环境',
    type: 'select',
    required: true,
    category: '基础信息',
    options: [
      { label: 'UAT', value: 'UAT' },
      { label: 'PROD', value: 'PROD' },
    ],
  },
  { key: 'applicationDescription', label: '应用描述', type: 'textarea', required: true, category: '需求与目标' },
  { key: 'businessPurpose', label: '业务用途', type: 'textarea', required: true, category: '需求与目标' },
  { key: 'backendAddress', label: '后端服务地址', type: 'text', required: true, category: '负载配置', placeholder: '如：10.10.10.21:8080 或服务组说明' },
  {
    key: 'listenerProtocol',
    label: '监听协议',
    type: 'select',
    required: true,
    category: '负载配置',
    options: [
      { label: 'HTTP', value: 'HTTP' },
      { label: 'HTTPS', value: 'HTTPS' },
      { label: 'TCP', value: 'TCP' },
    ],
  },
  { key: 'listenerPort', label: '监听端口', type: 'integer', required: true, category: '负载配置', placeholder: '如：80、443、8080' },
  {
    key: 'haRequirement',
    label: '高可用要求',
    type: 'select',
    required: false,
    category: 'SLA 与安全',
    options: [
      { label: '无', value: 'none' },
      { label: '主备', value: 'primary-standby' },
      { label: '多可用区', value: 'multi-az' },
    ],
  },
  {
    key: 'securityLevel',
    label: '安全等级',
    type: 'select',
    required: false,
    category: 'SLA 与安全',
    options: [
      { label: '普通', value: 'normal' },
      { label: '重要', value: 'important' },
      { label: '核心', value: 'critical' },
    ],
  },
  { key: 'resourceRemark', label: '补充说明', type: 'textarea', required: false, category: '用户调整' },
];

export const NETWORK_PUBLIC_LB_TRIAL_FIELD_DEFINITIONS: ProductionFieldDefinition[] = [
  { key: 'applicationName', label: '应用名称', type: 'text', required: true, category: '基础信息' },
  { key: 'applicationEnglishName', label: '应用英文名', type: 'text', required: true, category: '基础信息' },
  {
    key: 'environment',
    label: '申请环境',
    type: 'select',
    required: true,
    category: '基础信息',
    options: [
      { label: 'UAT', value: 'UAT' },
      { label: 'PROD', value: 'PROD' },
    ],
  },
  { key: 'applicationDescription', label: '应用描述', type: 'textarea', required: true, category: '需求与目标' },
  { key: 'businessPurpose', label: '业务用途', type: 'textarea', required: true, category: '需求与目标' },
  { key: 'domainName', label: '发布域名', type: 'text', required: true, category: '公网发布', placeholder: '如：portal.example.com' },
  { key: 'backendAddress', label: '后端服务地址', type: 'text', required: true, category: '公网发布', placeholder: '如：10.10.10.21:8080 或服务组说明' },
  {
    key: 'listenerProtocol',
    label: '监听协议',
    type: 'select',
    required: true,
    category: '公网发布',
    options: [
      { label: 'HTTP', value: 'HTTP' },
      { label: 'HTTPS', value: 'HTTPS' },
      { label: 'TCP', value: 'TCP' },
    ],
  },
  { key: 'listenerPort', label: '监听端口', type: 'integer', required: true, category: '公网发布', placeholder: '如：80、443、8443' },
  {
    key: 'certificateRequirement',
    label: '需要平台协助配置证书',
    type: 'boolean',
    required: false,
    category: 'SLA 与安全',
  },
  {
    key: 'securityLevel',
    label: '安全等级',
    type: 'select',
    required: false,
    category: 'SLA 与安全',
    options: [
      { label: '普通', value: 'normal' },
      { label: '重要', value: 'important' },
      { label: '核心', value: 'critical' },
    ],
  },
  { key: 'resourceRemark', label: '补充说明', type: 'textarea', required: false, category: '用户调整' },
];

export const CONTAINER_TRIAL_FIELD_DEFINITIONS: ProductionFieldDefinition[] = [
  {
    key: 'environment',
    label: '申请环境',
    type: 'select',
    required: true,
    category: '基础信息',
    options: [
      { label: 'DEV', value: 'DEV' },
      { label: 'SIT', value: 'SIT' },
      { label: 'UAT', value: 'UAT' },
      { label: 'PERF', value: 'PERF' },
      { label: 'PROD', value: 'PROD' },
    ],
  },
  {
    key: 'resourcePartition',
    label: '资源分区',
    type: 'select',
    required: true,
    category: '基础信息',
    options: [
      { label: 'LAN', value: 'LAN' },
      { label: 'DMZ', value: 'DMZ' },
      { label: 'WAN', value: 'WAN' },
    ],
  },
  { key: 'systemCode', label: '系统代码', type: 'text', required: true, category: '基础信息' },
  { key: 'systemName', label: '系统名称', type: 'text', required: true, category: '基础信息' },
  { key: 'supplierName', label: '供应商名称', type: 'text', required: true, category: '租户信息' },
  { key: 'supplierShortName', label: '供应商英文简写', type: 'text', required: true, category: '租户信息' },
  { key: 'supplierId', label: '供应商编号', type: 'text', required: false, category: '租户信息' },
  { key: 'contactName', label: '申请人姓名', type: 'text', required: true, category: '租户信息' },
  { key: 'contactAccount', label: '申请人英文账号', type: 'text', required: true, category: '租户信息' },
  { key: 'contactEmail', label: '申请人邮箱', type: 'text', required: false, category: '租户信息' },
  { key: 'applicationEnglishName', label: '应用英文名称', type: 'text', required: true, category: '容器资源' },
  { key: 'businessDomain', label: '应用所属业务', type: 'text', required: true, category: '容器资源' },
  { key: 'namespace', label: '命名空间', type: 'text', required: true, category: '容器资源' },
  { key: 'applicationDescription', label: '应用描述', type: 'textarea', required: true, category: '容器资源' },
  { key: 'instanceCount', label: '实例个数', type: 'integer', required: true, category: '容器资源', placeholder: '如：1、2、3' },
  { key: 'cpuPerInstance', label: '单实例 CPU(C)', type: 'integer', required: true, category: '容器资源', placeholder: '如：2、4' },
  { key: 'memoryPerInstance', label: '单实例内存(G)', type: 'integer', required: true, category: '容器资源', placeholder: '如：4、8' },
  {
    key: 'requiresPipelineAccess',
    label: '通过 DCS 流水线打包',
    type: 'boolean',
    required: false,
    category: '平台集成',
  },
  {
    key: 'requiresEfkAccess',
    label: '开通 EFK 日志权限',
    type: 'boolean',
    required: false,
    category: '平台集成',
  },
  { key: 'resourceRemark', label: '补充说明', type: 'textarea', required: false, category: '用户调整' },
];

const ATOMIC_SERVICE_UI_PROFILE_RULES: AtomicServiceUiProfileRule[] = [
  {
    matchKeys: ['db-mysql', 'mysql-create'],
    profile: { architectureRequired: true, formVariant: 'mysqlTrial', demoTag: '近生产表单' },
  },
  {
    matchKeys: ['cloud-db-create'],
    profile: { architectureRequired: true, formVariant: 'cloudDbTrial', demoTag: '近生产表单' },
  },
  {
    matchKeys: ['net-f5-domain', 'lb-public-create'],
    profile: { architectureRequired: true, formVariant: 'networkPublicLbTrial', demoTag: '近生产表单' },
  },
  {
    matchKeys: ['net-f5-lb'],
    profile: { architectureRequired: true, formVariant: 'networkLbTrial', demoTag: '近生产表单' },
  },
  {
    matchKeys: ['cloud-vm-private', 'ecs-private-create'],
    profile: { architectureRequired: true, demoTag: '近生产表单' },
  },
  {
    matchKeys: ['cloud-vm-virtual'],
    profile: { architectureRequired: true },
  },
  {
    matchKeys: ['cloud-vm-public', 'ecs-public-create'],
    profile: { architectureRequired: true, demoTag: '近生产表单' },
  },
  {
    matchKeys: ['paas-dce4', 'paas-resource'],
    profile: { architectureRequired: true, formVariant: 'containerTrial', demoTag: '近生产表单' },
  },
  {
    matchKeys: ['obj-storage', 'oss-create'],
    profile: { architectureRequired: true },
  },
];

export function resolveAtomicServiceUiProfile(
  spec: Pick<AtomicServiceSpec, 'id'> & { serviceCode?: string | undefined } | undefined,
) {
  if (!spec) return undefined;
  const matchKeys = [spec.id, spec.serviceCode].filter(Boolean) as string[];
  return ATOMIC_SERVICE_UI_PROFILE_RULES.find(rule => (
    rule.matchKeys.some(key => matchKeys.includes(key))
  ))?.profile;
}
