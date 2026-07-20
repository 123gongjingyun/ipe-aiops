import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Download,
  FileText,
  LayoutTemplate,
  Lightbulb,
  ListChecks,
  Save,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
  getRequestRecord,
  markRequestRecordsExported,
  REQUEST_REQUIREMENT_CATEGORIES,
  saveRequestRecord,
  type RequestRecordDraftPayload,
  type RequestReviewExportValidationResult,
  validateRequestReviewExportDraft,
} from '@aiops/shared';

type WorkbenchMode = 'assistant' | 'direct';

type VmComponentConfig = {
  deploymentMode: string;
  specProfile: string;
  configLabel: string;
  cpu: string;
  memory: string;
  nodeCount: string;
  diskType: string;
  systemDisk: string;
  dataDisk: string;
  configReference: string;
};

type VmComponentConfigState = Record<string, VmComponentConfig>;

type DraftState = {
  systemCode: string;
  moduleName: string;
  owner: string;
  systemName: string;
  applicationName: string;
  environment: string;
  userType: string;
  appType: string;
  clientType: string;
  businessGoal: string;
  integrationSystems: string;
  accessScope: string;
  resourceNeed: string;
  slaRequirement: string;
  architectureNote: string;
  // 虚拟机申请用户需求区（按 Excel 8 大类压缩为 5 个存储字段）
  userRequirementBackground: string;
  userRequirementUsers: string;
  userRequirementOps: string;
  userRequirementCloud: string;
  userRequirementNetwork: string;
  vmResourceMode: string;
  vmDeploymentMode: string;
  vmComponentSelection: string;
  vmSpecProfile: string;
  vmQuantity: string;
  vmDiskType: string;
  vmSystemDisk: string;
  vmDataDisk: string;
  vmConfigReference: string;
  vmComponentConfigs: string;
  containerInstanceCount: string;
  containerCpuPerInstance: string;
  containerMemoryPerInstance: string;
  containerCpu: string;
  containerMemory: string;
  containerRemark: string;
  containerSupplier: string;
  containerSystemCode: string;
  containerResourceZone: string;
  containerAppName: string;
  obsBucketName: string;
  obsDirectory: string;
  obsCapacity: string;
  obsLifecycle: string;
  obsAccessPolicy: string;
  obsSupplier: string;
  obsBusinessDomain: string;
  obsAkSkCount: string;
  obsDomainAccount: string;
  sfsName: string;
  sfsCapacity: string;
  sfsLifecycle: string;
  sfsProtocol: string;
  sfsSupplier: string;
  sfsBusinessDomain: string;
  sfsDomainAccount: string;
  permissionAccount: string;
  permissionName: string;
  permissionPhone: string;
  permissionEmail: string;
  permissionScope: string;
  permissionReason: string;
  permissionTypeOther: string;
  permissionType: string;
  networkSource: string;
  networkTarget: string;
  networkPortType: string;
  networkPortRange: string;
  networkProtocol: string;
  networkReason: string;
  networkSourceAsset: string;
  networkTargetAsset: string;
};

type DraftField = keyof DraftState;

type RequirementProject = {
  id: string;
  title: string;
  description: string;
  placeholder: string;
  quickOptions: string[];
  hint: string;
  allowExplicitNone?: boolean;
  forbidContainingNoneText?: boolean;
};

type RequirementCategory = {
  id: string;
  field: DraftField;
  title: string;
  description?: string;
  projects: RequirementProject[];
};

function NumericInput({
  value,
  onChange,
  unit,
  min = 0,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  unit: string;
  min?: number;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center rounded-md border border-input bg-background px-3 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <Input
        type="number"
        min={min}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="border-0 bg-transparent px-0 focus-visible:ring-0"
      />
      <span className="whitespace-nowrap text-sm text-slate-500">{unit}</span>
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="text-sm font-medium text-slate-700">
      {children}
      {required ? <span className="ml-0.5 text-red-500">*</span> : <span className="ml-1 text-xs font-normal text-slate-400">(选填)</span>}
    </span>
  );
}

const requirementCategories: RequirementCategory[] = [
  {
    id: 'background',
    field: 'userRequirementBackground',
    title: '1. 背景',
    description: '确认本次申请的业务背景与目标。',
    projects: [
      {
        id: 'purpose',
        title: '1.1 申请目的 / 背景',
        description: '本次申请的主要业务背景、项目目标或阶段。',
        placeholder: '为经销商门户 UAT 环境申请资源，验证登录和订单查询链路。',
        quickOptions: ['新增功能上线', 'UAT 联调', 'SIT 测试', '生产扩容', '压测验证', 'POC 试点'],
        hint: '评审时判断业务优先级、上线计划和资源紧急程度。',
        allowExplicitNone: false,
        forbidContainingNoneText: true,
      },
    ],
  },
  {
    id: 'users',
    field: 'userRequirementUsers',
    title: '2. 用户相关',
    description: '使用本系统的用户特征与访问方式。',
    projects: [
      {
        id: 'userGroup',
        title: '2.1 使用用户群体',
        description: '最终使用本系统的用户类型。',
        placeholder: '内部员工 + 经销商',
        quickOptions: ['内部员工', '经销商', '合作伙伴', '外部客户', '供应商'],
        hint: '决定公网访问、安全边界、认证方式和网络策略。',
      },
      {
        id: 'userScale',
        title: '2.2 用户规模 / 并发量',
        description: '预估用户数量、同时在线数或并发请求数。',
        placeholder: '日均 1000 人访问，峰值并发 200。',
        quickOptions: ['日均 1000 人', '峰值并发 200', '日活 1 万', '峰值并发 1000'],
        hint: '直接影响规格档位、集群方案和扩展性设计。',
      },
      {
        id: 'userRegion',
        title: '2.3 用户使用地域',
        description: '用户主要访问地域。',
        placeholder: '中国大陆（华南区为主）',
        quickOptions: ['中国大陆', '海外', '华南区', '华北区', '工厂园区'],
        hint: '用于判断网络区域、时延要求和跨境合规。',
      },
      {
        id: 'userTime',
        title: '2.4 用户使用时间分布',
        description: '业务高峰时段。',
        placeholder: '工作日 9:00-18:00，月末访问量翻倍。',
        quickOptions: ['工作日 9-18 点', '月末集中', '季度末集中', '7×24 均匀'],
        hint: '帮助设计弹性扩缩容、维护窗口和压测计划。',
      },
      {
        id: 'userAccess',
        title: '2.5 用户访问方式',
        description: '用户通过何种终端访问。',
        placeholder: 'PC Web + H5 混合',
        quickOptions: ['PC Web', 'H5', 'App', '小程序', 'API', '多终端混合'],
        hint: '影响域名发布、认证链路和移动端适配要求。',
        allowExplicitNone: false,
        forbidContainingNoneText: true,
      },
      {
        id: 'userRole',
        title: '2.6 用户权限 / 角色要求',
        description: '是否需要分角色、分权限。',
        placeholder: '管理员、普通用户、只读用户。',
        quickOptions: ['管理员', '普通用户', '只读用户', '审批角色', '业务角色'],
        hint: '评审数据权限隔离和后台管理需求。',
      },
      {
        id: 'userAuth',
        title: '2.7 用户认证方式',
        description: '登录认证方式。',
        placeholder: '统一认证（SSO）',
        quickOptions: ['统一认证（SSO）', 'AD 域账号', '短信验证码', 'OAuth2', 'LDAP'],
        hint: '决定是否需要对接统一认证、AD 域或 OAuth 服务。',
      },
    ],
  },
  {
    id: 'ops',
    field: 'userRequirementOps',
    title: '3. 运维相关',
    description: '服务时间、备份、监控与运维分工。',
    projects: [
      {
        id: 'serviceTime',
        title: '3.1 服务时间 / 可用性要求',
        description: '系统需要的服务时间。',
        placeholder: '7×24',
        quickOptions: ['7×24', '5×8', '工作日 8-20 点'],
        hint: '决定是否需要高可用、双活或容灾方案。',
      },
      {
        id: 'maintenanceWindow',
        title: '3.2 维护窗口',
        description: '可接受的停机维护时段。',
        placeholder: '每周日凌晨 2:00-6:00',
        quickOptions: ['每周日凌晨 2-6 点', '工作日 22-6 点', '无固定窗口'],
        hint: '用于安排补丁更新、发布窗口和计划内停机。',
      },
      {
        id: 'backup',
        title: '3.3 备份 / 恢复要求',
        description: '数据备份策略与恢复要求。',
        placeholder: '每日全量备份，保留 7 天。',
        quickOptions: ['每日全量', '每日增量', '每周全量', '保留 7 天', '保留 30 天'],
        hint: '评审 RTO/RPO 和数据恢复能力。',
      },
      {
        id: 'monitor',
        title: '3.4 监控 / 告警要求',
        description: '是否需要接入监控告警。',
        placeholder: '接入统一监控平台，CPU>80% 告警。',
        quickOptions: ['接入统一监控平台', 'CPU>80% 告警', '内存>80% 告警', '磁盘>80% 告警', '接口失败率告警'],
        hint: '影响监控接入、告警策略和运维交接。',
      },
      {
        id: 'opsOwner',
        title: '3.5 运维责任分工',
        description: '应用运维与基础设施运维分工。',
        placeholder: '应用层由业务方负责，OS 层由云运维负责。',
        quickOptions: ['业务方负责应用', '云运维负责 OS', '共同负责', '待定'],
        hint: '明确后续故障处理、权限申请和变更责任方。',
      },
    ],
  },
  {
    id: 'cloud',
    field: 'userRequirementCloud',
    title: '4. 云服务提供',
    description: '所需云服务类型与使用周期。',
    projects: [
      {
        id: 'cloudService',
        title: '4.1 所需云服务类型',
        description: '需要的云服务类别。',
        placeholder: '云主机、MySQL、Redis、负载均衡。',
        quickOptions: ['云主机', '对象存储', 'MySQL', 'Redis', 'RabbitMQ', 'Kafka', '负载均衡'],
        hint: '直接决定需要开通哪些云产品和组件能力。',
      },
      {
        id: 'cloudCycle',
        title: '4.2 资源使用周期',
        description: '资源的预计使用时长。',
        placeholder: '6 个月（项目周期）',
        quickOptions: ['长期', '3 个月', '6 个月', '12 个月', '项目周期'],
        hint: '影响资源计费方式、到期提醒和回收策略。',
      },
    ],
  },
  {
    id: 'middleware',
    field: 'userRequirementCloud',
    title: '5. 中间件 & 数据库要件',
    description: '数据库、中间件类型与性能容量预估。',
    projects: [
      {
        id: 'middlewareType',
        title: '5.1 数据库 / 中间件类型',
        description: '需要的具体产品。',
        placeholder: 'MySQL 8.0、Redis 6.x。',
        quickOptions: ['MySQL 8.0', 'Redis 6.x', 'RabbitMQ', 'Kafka', 'PostgreSQL', 'MongoDB'],
        hint: '决定组件能力选择和版本兼容性要求。',
      },
      {
        id: 'middlewareCapacity',
        title: '5.2 性能 / 容量预估',
        description: 'TPS/QPS、数据量、连接数等。',
        placeholder: '日均 QPS 5000，峰值 QPS 20000，数据量 500GB。',
        quickOptions: ['日均 QPS 5000', '峰值 QPS 20000', '数据量 500GB', '连接数 1000'],
        hint: '用于核对规格档位、节点数和高可用方案。',
      },
    ],
  },
  {
    id: 'server',
    field: 'userRequirementCloud',
    title: '6. 服务器基础侧要件',
    description: '操作系统、计算规格与部署方式。',
    projects: [
      {
        id: 'os',
        title: '6.1 操作系统要求',
        description: 'OS 类型和版本。',
        placeholder: 'CentOS 7.9',
        quickOptions: ['CentOS 7.9', 'Rocky Linux 8', 'Windows Server 2019', 'Ubuntu 20.04'],
        hint: '影响镜像选择、补丁策略和许可合规。',
      },
      {
        id: 'spec',
        title: '6.2 计算规格要求',
        description: 'CPU、内存、磁盘初步要求。',
        placeholder: '4C8G',
        quickOptions: ['2C4G', '4C8G', '8C16G', '16C32G'],
        hint: '初步规格，最终以评审和压测结果为准。',
      },
      {
        id: 'deploy',
        title: '6.3 部署方式',
        description: '单机、集群、容器化等。',
        placeholder: '双机集群',
        quickOptions: ['单机部署', '双机集群', '3 节点集群', 'Kubernetes 容器', '主从架构'],
        hint: '决定高可用、故障转移和扩展方式。',
      },
    ],
  },
  {
    id: 'security',
    field: 'userRequirementOps',
    title: '7. 安全要件',
    description: '数据安全、访问控制、审计与合规。',
    projects: [
      {
        id: 'dataSecurity',
        title: '7.1 数据安全 / 加密要求',
        description: '数据传输和存储加密。',
        placeholder: 'HTTPS 传输，数据库敏感字段加密。',
        quickOptions: ['HTTPS 传输', '数据库敏感字段加密', 'TLS', 'AES 加密'],
        hint: '评审数据加密、脱敏和传输安全要求。',
      },
      {
        id: 'accessControl',
        title: '7.2 访问控制要求',
        description: '网络隔离、白名单、防火墙。',
        placeholder: '仅内网访问，指定 IP 白名单。',
        quickOptions: ['仅内网访问', '指定 IP 白名单', '堡垒机访问', 'VPN 访问'],
        hint: '影响网络区域划分、安全组和防火墙策略。',
      },
      {
        id: 'audit',
        title: '7.3 审计 / 日志要求',
        description: '操作审计和日志保留。',
        placeholder: '操作日志保留 180 天。',
        quickOptions: ['操作日志保留 180 天', '访问日志保留 90 天', '审计日志保留 1 年'],
        hint: '决定日志采集、保留周期和审计合规。',
      },
      {
        id: 'compliance',
        title: '7.4 合规要求',
        description: '等保、GDPR、行业合规。',
        placeholder: '等保三级',
        quickOptions: ['等保二级', '等保三级', 'GDPR', '行业合规'],
        hint: '影响安全架构、测评要求和材料准备。',
      },
      {
        id: 'patch',
        title: '7.5 漏洞 / 补丁管理',
        description: '安全补丁和漏洞修复要求。',
        placeholder: '高危漏洞 7 个工作日内修复。',
        quickOptions: ['高危漏洞 7 个工作日', '高危漏洞 15 个工作日', '月度补丁更新'],
        hint: '明确漏洞修复 SLA 和运维流程。',
      },
    ],
  },
  {
    id: 'network',
    field: 'userRequirementNetwork',
    title: '8. 网络需求',
    description: '网络区域、访问边界、域名与带宽。',
    projects: [
      {
        id: 'networkZone',
        title: '8.1 网络区域',
        description: '业务网、管理网、DMZ 等。',
        placeholder: '业务网 B 区',
        quickOptions: ['业务网 A 区', '业务网 B 区', '管理网', 'DMZ'],
        hint: '决定虚拟机部署的网络分区。',
      },
      {
        id: 'publicAccess',
        title: '8.2 公网访问需求',
        description: '是否需要公网访问。',
        placeholder: '需要公网域名发布',
        quickOptions: ['不需要公网', '需要公网域名发布', '需要公网 IP', '仅内网'],
        hint: '影响域名、WAF、安全组和发布流程。',
      },
      {
        id: 'domain',
        title: '8.3 域名 / DNS 需求',
        description: '是否需要域名和解析。',
        placeholder: '需要 xxx.company.com',
        quickOptions: ['需要新域名', '使用现有域名', '不需要域名', '需要 DNS 解析'],
        hint: '明确域名申请、解析变更和证书需求。',
      },
      {
        id: 'loadBalancer',
        title: '8.4 负载均衡需求',
        description: '是否需要 LB。',
        placeholder: '需要 4 层负载均衡',
        quickOptions: ['4 层负载均衡', '7 层负载均衡', '不需要 LB'],
        hint: '决定高可用入口和流量分发方案。',
      },
      {
        id: 'ports',
        title: '8.5 端口 / 协议需求',
        description: '需要开放的端口和协议。',
        placeholder: 'TCP 80/443/3306',
        quickOptions: ['TCP 80/443', 'TCP 3306', 'TCP 22', 'UDP 53'],
        hint: '用于开通常访策略和安全组规则。',
      },
      {
        id: 'whitelist',
        title: '8.6 系统互访 / 白名单',
        description: '与其他系统的互访关系。',
        placeholder: '需访问订单中心 10.x.x.x:8080',
        quickOptions: ['需访问订单中心', '需访问统一认证', '需访问短信网关', '需访问报表平台'],
        hint: '明确上下游调用关系和网络策略。',
      },
      {
        id: 'vpn',
        title: '8.7 专线 / VPN 需求',
        description: '是否需要专线或 VPN。',
        placeholder: '工厂通过专线访问',
        quickOptions: ['不需要', '工厂专线接入', 'SSL VPN', 'IPSec VPN'],
        hint: '影响跨地域、工厂或合作伙伴接入方案。',
      },
      {
        id: 'bandwidth',
        title: '8.8 带宽 / 时延要求',
        description: '网络带宽和时延。',
        placeholder: '带宽 100Mbps，时延 < 50ms',
        quickOptions: ['10Mbps', '50Mbps', '100Mbps', '时延 < 50ms', '时延 < 100ms'],
        hint: '用于评估网络规划和链路质量。',
      },
      {
        id: 'haNetwork',
        title: '8.9 高可用网络',
        description: '是否需要双网卡、双链路。',
        placeholder: '需要双网卡绑定',
        quickOptions: ['双网卡绑定', '双链路冗余', '单网卡', '不需要'],
        hint: '影响网络冗余和故障切换能力。',
      },
      {
        id: 'cdn',
        title: '8.10 CDN / 加速需求',
        description: '是否需要 CDN。',
        placeholder: '静态资源使用 CDN',
        quickOptions: ['静态资源 CDN', '全站加速', '不需要'],
        hint: '明确静态资源加速和边缘分发需求。',
      },
      {
        id: 'securityDevice',
        title: '8.11 网络安全设备',
        description: 'WAF、IPS 等。',
        placeholder: '公网入口需 WAF 防护',
        quickOptions: ['WAF', 'IPS', 'IDS', '防火墙', '不需要'],
        hint: '决定公网入口安全防护设备。',
      },
    ],
  },
];

function extractBlocksForSharedCategory(
  raw: string,
  category: (typeof REQUEST_REQUIREMENT_CATEGORIES)[number],
): string {
  if (!raw.trim()) return '';
  const blocks = raw.split(/(?=【)/).filter(Boolean);
  const categoryBlocks = blocks.filter(block =>
    category.projects.some(project => block.startsWith(`【${project.title}】`)),
  );
  return categoryBlocks.join('\n\n');
}

function getSharedCategoryRawText(
  draft: Partial<DraftState>,
  category: (typeof REQUEST_REQUIREMENT_CATEGORIES)[number],
): string {
  if (category.id === 'cloud') {
    const separate = (draft as Partial<RequestRecordDraftPayload>).userRequirementCloudService || '';
    if (separate.trim()) return separate;
    const aggregate = draft.userRequirementCloud || '';
    return extractBlocksForSharedCategory(aggregate, category);
  }
  if (category.id === 'middleware' || category.id === 'server') {
    const aggregate = draft.userRequirementCloud || '';
    return extractBlocksForSharedCategory(aggregate, category);
  }
  if (category.id === 'security') {
    const aggregate = draft.userRequirementOps || '';
    return extractBlocksForSharedCategory(aggregate, category);
  }
  return (draft[category.field as keyof Partial<DraftState>] as string | undefined) || '';
}

function parseRequirementAnswersFromDraft(draft: Partial<DraftState>): Record<string, string> {
  const answers: Record<string, string> = {};
  REQUEST_REQUIREMENT_CATEGORIES.forEach(category => {
    const raw = getSharedCategoryRawText(draft, category);
    if (!raw.trim()) return;
    const blocks = raw.split(/(?=【)/).filter(Boolean);
    blocks.forEach(block => {
      const matchedProject = category.projects.find(project => block.startsWith(`【${project.title}】`));
      if (!matchedProject) return;
      const content = block.replace(`【${matchedProject.title}】`, '').trim();
      if (content) {
        answers[`${category.id}/${matchedProject.id}`] = content;
      }
    });
  });
  return answers;
}

function containsStandaloneNoneText(value: string) {
  return /(^|[\s，。,；;：:（）()【】\[\]、])无($|[\s，。,；;：:（）()【】\[\]、])/.test(value.trim());
}

function isRequirementAnswerInvalid(project: RequirementProject, value: string) {
  if (!value.trim()) return false;
  if (project.allowExplicitNone === false && containsStandaloneNoneText(value)) return true;
  return false;
}

function buildRequirementFieldText(
  category: RequirementCategory,
  requirementAnswers: Record<string, string>,
) {
  return category.projects
    .map(project => {
      const answer = requirementAnswers[`${category.id}/${project.id}`] || '';
      if (!answer.trim()) return '';
      return `【${project.title}】\n${answer}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

function normalizeCapacityValue(value: string) {
  return value.replace(/[^0-9.]/g, '').trim();
}

function inferVmDeploymentModeFromRequirementAnswer(value: string) {
  const normalized = value.trim();
  if (!normalized) return '';
  if (/单机|单节点/i.test(normalized)) return '单机部署';
  if (/集群|双机|主从|多节点|3节点/i.test(normalized)) return '集群部署';
  return normalized;
}

function inlineRequirementText(value: string) {
  const normalized = value.trim();
  if (!normalized) return '';
  const sections = normalized.split(/\n(?=【)/).filter(Boolean);
  if (sections.length === 0) return normalized.replace(/\n+/g, ' ').trim();
  return sections
    .map(section => {
      const match = section.match(/^【([^】]+)】\n?([\s\S]*)$/);
      if (!match) return section.replace(/\n+/g, ' ').trim();
      const [, title, content] = match;
      return `【${title.trim()}】 ${content.replace(/\n+/g, ' ').trim()}`.trim();
    })
    .join('；');
}

function applyVmSceneInference(input: string, currentEnvironment: string) {
  const normalized = input.trim();
  const draftPatch: Partial<DraftState> = {};
  const answersPatch: Record<string, string> = {};
  if (!normalized) return { draftPatch, answersPatch };

  // 环境
  if (/生产|prod/i.test(normalized)) draftPatch.environment = 'PROD';
  else if (/压测|压力|性能测试/i.test(normalized)) draftPatch.environment = '压测';
  else if (/uat|验收/i.test(normalized)) draftPatch.environment = 'UAT';
  else if (/sit|测试/i.test(normalized)) draftPatch.environment = 'SIT';

  // 系统名称
  const systemMatch = normalized.match(/(?:为|给)\s*([^\s，。,；;]+?(?:系统|平台|门户|中心))/i) ||
    normalized.match(/([^\s，。,；;]+?(?:系统|平台|门户|中心))/i);
  if (systemMatch?.[1]) draftPatch.systemName = systemMatch[1].trim();

  // 模块名称
  const moduleMatch = normalized.match(/(?:模块|应用)\s*[为是:]?\s*([^\s，。,；;]+)/i);
  if (moduleMatch?.[1]) draftPatch.moduleName = moduleMatch[1].trim();

  // 担当
  const ownerMatch = normalized.match(/(?:担当|负责人|联系人)\s*[为是:]?\s*([^\s，。,；;]+)/i);
  if (ownerMatch?.[1]) draftPatch.owner = ownerMatch[1].trim();

  // 申请模式
  if (/裸机|仅虚拟机|只要主机|只申请主机/i.test(normalized)) {
    draftPatch.vmResourceMode = '仅申请虚拟机裸机资源';
  } else if (/一体机|综合一体/i.test(normalized)) {
    draftPatch.vmResourceMode = '综合一体机部署';
  } else if (/组件|MySQL|Redis|RabbitMQ|Kafka|数据库|中间件|缓存/i.test(normalized)) {
    draftPatch.vmResourceMode = '虚拟机 + 组件组合分开部署';
  }
  // 如果当前环境不支持推断出的模式，回退到默认
  const modeOptions = vmResourceModeOptionsByEnvironment[draftPatch.environment || currentEnvironment] || vmResourceModeOptionsByEnvironment.UAT;
  if (draftPatch.vmResourceMode && !modeOptions.includes(draftPatch.vmResourceMode)) {
    draftPatch.vmResourceMode = modeOptions[0] || '';
  }

  // 规格档位 + 磁盘联动
  const specMatch = normalized.match(/(\d+C\s*\d+G)/i);
  if (specMatch) {
    const specKey = specMatch[1].replace(/\s+/g, '').toUpperCase();
    draftPatch.vmSpecProfile = specKey;
    const envProfiles = vmSpecProfiles[draftPatch.environment as keyof typeof vmSpecProfiles] || vmSpecProfiles.UAT;
    const matchedProfile = envProfiles.find(p => p.key === specKey);
    if (matchedProfile) {
      draftPatch.vmDiskType = matchedProfile.diskType;
      draftPatch.vmSystemDisk = normalizeCapacityValue(matchedProfile.systemDisk);
      draftPatch.vmDataDisk = normalizeCapacityValue(matchedProfile.dataDisk);
    }
  }

  // 数量
  const quantityMatch = normalized.match(/(\d+)\s*(台|节点|台主机|主机)/i);
  if (quantityMatch) draftPatch.vmQuantity = `${quantityMatch[1]} 台`;

  // 背景
  answersPatch['background/purpose'] = normalized;

  // 用户群体
  const users: string[] = [];
  if (/内部员工|内部|办公/i.test(normalized)) users.push('内部员工');
  if (/经销商/i.test(normalized)) users.push('经销商');
  if (/合作伙伴/i.test(normalized)) users.push('合作伙伴');
  if (/外部客户|客户/i.test(normalized)) users.push('外部客户');
  if (users.length) answersPatch['users/userGroup'] = users.join('、');

  // 访问方式
  const access: string[] = [];
  if (/PC|Web|浏览器/i.test(normalized)) access.push('PC Web');
  if (/H5|移动端|App|小程序/i.test(normalized)) access.push('H5 / 移动端');
  if (/API|接口/i.test(normalized)) access.push('API 调用');
  if (access.length) answersPatch['users/userAccess'] = access.join('、');

  // 云服务
  const cloud: string[] = [];
  if (/云主机|虚拟机|主机|服务器/i.test(normalized)) cloud.push('云主机');
  if (/MySQL|数据库/i.test(normalized)) cloud.push('MySQL');
  if (/Redis|缓存/i.test(normalized)) cloud.push('Redis');
  if (/RabbitMQ|MQ|消息/i.test(normalized)) cloud.push('RabbitMQ');
  if (/Kafka/i.test(normalized)) cloud.push('Kafka');
  if (/负载均衡|LB/i.test(normalized)) cloud.push('负载均衡');
  if (/对象存储|OSS/i.test(normalized)) cloud.push('对象存储');
  if (cloud.length) answersPatch['cloud/cloudService'] = cloud.join('、');

  // 组件能力
  const components = cloud.filter(c => ['MySQL', 'Redis', 'RabbitMQ', 'Kafka'].includes(c));
  if (components.length && draftPatch.vmResourceMode && draftPatch.vmResourceMode !== '仅申请虚拟机裸机资源') {
    draftPatch.vmComponentSelection = components.join('、');
  }

  // 网络
  const network: string[] = [];
  if (/公网|域名|互联网/i.test(normalized)) network.push('需要公网域名发布');
  if (/内网|办公网/i.test(normalized)) network.push('仅内网访问');
  if (/互访|上下游|白名单/i.test(normalized)) network.push('系统互访 / 白名单');
  if (network.length) answersPatch['network/publicAccess'] = network.join('、');

  return { draftPatch, answersPatch };
}

type VmSpecProfileDetails = {
  resourceCpuDetail: string;
  resourceMemoryDetail: string;
  resourceSystemDisk: string;
  resourceDataDisk: string;
  diskTypeDescription: string;
  scenarioUsage: string;
  scenarioUserScale: string;
  architectureType?: string;
  diskIops?: string;
  diskThroughput?: string;
  recommendationLevel?: string;
  priceLevel?: string;
  technicalNotes?: string;
  // MySQL
  masterCpuDetail?: string;
  masterMemoryDetail?: string;
  masterSystemDisk?: string;
  masterDataDisk?: string;
  masterConnections?: string;
  masterDailyQps?: string;
  masterPeakQps?: string;
  // RabbitMQ
  concurrentConnections?: string;
  messageThroughput?: string;
  queueCount?: string;
  haFeatures?: string;
  // Redis
  maxConnections?: string;
  opsPerSecond?: string;
  memoryUsage?: string;
  hitRate?: string;
  dataSize?: string;
  persistenceMode?: string;
  // Kafka
  throughput?: string;
  partitionCount?: string;
  replicationFactor?: string;
  brokerCount?: string;
  retentionPeriod?: string;
};

type VmSpecProfile = {
  key: string;
  cpu: string;
  memory: string;
  diskType: string;
  systemDisk: string;
  dataDisk: string;
  details: VmSpecProfileDetails;
};

type VmComponentProfile = VmSpecProfile & {
  configLabel: string;
  nodeCount: string;
};

type VmComponentDeployment = {
  deploymentMode: string;
  profiles: VmComponentProfile[];
};

const defaultDraft: DraftState = {
  systemCode: '',
  moduleName: '',
  owner: '',
  systemName: '',
  applicationName: '',
  environment: 'SIT',
  userType: '',
  appType: '',
  clientType: '',
  businessGoal: '',
  integrationSystems: '',
  accessScope: '',
  resourceNeed: '',
  slaRequirement: '',
  architectureNote: '',
  userRequirementBackground: '',
  userRequirementUsers: '',
  userRequirementOps: '',
  userRequirementCloud: '',
  userRequirementNetwork: '',
  vmResourceMode: '',
  vmDeploymentMode: '',
  vmComponentSelection: '',
  vmSpecProfile: '',
  vmQuantity: '',
  vmDiskType: '',
  vmSystemDisk: '',
  vmDataDisk: '',
  vmConfigReference: '',
  vmComponentConfigs: '',
  containerInstanceCount: '',
  containerCpuPerInstance: '',
  containerMemoryPerInstance: '',
  containerCpu: '',
  containerMemory: '',
  containerRemark: '',
  containerSupplier: '',
  containerSystemCode: '',
  containerResourceZone: '',
  containerAppName: '',
  obsBucketName: '',
  obsDirectory: '',
  obsCapacity: '',
  obsLifecycle: '',
  obsAccessPolicy: '',
  obsSupplier: '',
  obsBusinessDomain: '',
  obsAkSkCount: '',
  obsDomainAccount: '',
  sfsName: '',
  sfsCapacity: '',
  sfsLifecycle: '',
  sfsProtocol: '',
  sfsSupplier: '',
  sfsBusinessDomain: '',
  sfsDomainAccount: '',
  permissionAccount: '',
  permissionName: '',
  permissionPhone: '',
  permissionEmail: '',
  permissionScope: '',
  permissionReason: '',
  permissionTypeOther: '',
  permissionType: '',
  networkSource: '',
  networkTarget: '',
  networkPortType: '',
  networkPortRange: '',
  networkProtocol: '',
  networkReason: '',
  networkSourceAsset: '',
  networkTargetAsset: '',
};

const vmEnvironmentOptions = ['SIT', 'UAT', '压测', 'PROD'] as const;

const vmResourceModeOptionsByEnvironment: Record<string, string[]> = {
  SIT: ['仅申请虚拟机裸机资源'],
  UAT: ['虚拟机 + 组件组合分开部署', '综合一体机部署'],
  压测: ['虚拟机 + 组件组合分开部署', '综合一体机部署'],
  PROD: ['虚拟机 + 组件组合分开部署', '综合一体机部署'],
  DEV: ['仅申请虚拟机裸机资源'],
};

const vmDeploymentModeOptions = ['单机部署', '集群部署'] as const;

const userTypeOptions = ['内部办公系统', '对外业务系统', '经销商/合作伙伴系统', '其他'] as const;
const appTypeOptions = ['门户 / Web 应用', 'API 服务', '数据服务 / 报表', '其他'] as const;
const clientTypeOptions = ['PC Web', 'H5 / 移动端', 'API 调用', '多终端混合', '其他'] as const;

const vmComponentOptions = ['MySQL', 'RabbitMQ', 'Redis', 'Kafka'] as const;
const businessDomainOptions = ['核心交易', '内部办公', '数据分析', '对外服务', '测试支撑', '其他'] as const;
const permissionTypeOptions = ['PAM权限', '容器平台权限', '博睿平台', 'IAM权限', '流水线', '日志平台', 'Gitlab代码库', 'VPN访问Github', '其他'] as const;

const vmSpecProfiles = {
  SIT: [
    {
      key: '2C4G',
      cpu: '2C',
      memory: '4GB',
      diskType: '高IO',
      systemDisk: '80GB',
      dataDisk: '100GB',
      details: {
        resourceCpuDetail: '2C',
        resourceMemoryDetail: '4GB',
        resourceSystemDisk: '80GB',
        resourceDataDisk: '100GB',
        diskTypeDescription: '适合基础联调与测试验证，默认高IO磁盘。',
        scenarioUsage: '基础联调、功能验证',
        scenarioUserScale: '轻量内部测试',
        architectureType: 'x86 单机/集群',
        diskIops: '3000',
        diskThroughput: '100MB/s',
        recommendationLevel: '标准',
        priceLevel: '中',
        technicalNotes: '默认高IO磁盘，具体以评审为准。'
      },
    },
    {
      key: '4C8G',
      cpu: '4C',
      memory: '8GB',
      diskType: '高IO',
      systemDisk: '80GB',
      dataDisk: '200GB',
      details: {
        resourceCpuDetail: '4C',
        resourceMemoryDetail: '8GB',
        resourceSystemDisk: '80GB',
        resourceDataDisk: '200GB',
        diskTypeDescription: '适合并发稍高的 SIT 验证。',
        scenarioUsage: '接口联调、模块联测',
        scenarioUserScale: '中等规模测试',
        architectureType: 'x86 单机/集群',
        diskIops: '3000',
        diskThroughput: '100MB/s',
        recommendationLevel: '标准',
        priceLevel: '中',
        technicalNotes: '默认高IO磁盘，具体以评审为准。'
      },
    },
  ],
  UAT: [
    {
      key: '2C4G',
      cpu: '2C',
      memory: '4GB',
      diskType: '高IO',
      systemDisk: '80GB',
      dataDisk: '100GB',
      details: {
        resourceCpuDetail: '2C',
        resourceMemoryDetail: '4GB',
        resourceSystemDisk: '80GB',
        resourceDataDisk: '100GB',
        diskTypeDescription: '适合单机轻量验收链路。',
        scenarioUsage: '轻量 UAT 验收',
        scenarioUserScale: '单系统验收',
        architectureType: 'x86 单机/集群',
        diskIops: '3000',
        diskThroughput: '100MB/s',
        recommendationLevel: '标准',
        priceLevel: '中',
        technicalNotes: '默认高IO磁盘，具体以评审为准。'
      },
    },
    {
      key: '4C8G',
      cpu: '4C',
      memory: '8GB',
      diskType: '高IO',
      systemDisk: '80GB',
      dataDisk: '200GB',
      details: {
        resourceCpuDetail: '4C',
        resourceMemoryDetail: '8GB',
        resourceSystemDisk: '80GB',
        resourceDataDisk: '200GB',
        diskTypeDescription: '适合常规门户、接口联调和数据库配套部署。',
        scenarioUsage: '常规 UAT 联调',
        scenarioUserScale: '中等业务规模',
        architectureType: 'x86 单机/集群',
        diskIops: '3000',
        diskThroughput: '100MB/s',
        recommendationLevel: '标准',
        priceLevel: '中',
        technicalNotes: '默认高IO磁盘，具体以评审为准。'
      },
    },
    {
      key: '8C16G',
      cpu: '8C',
      memory: '16GB',
      diskType: '超高IO',
      systemDisk: '100GB',
      dataDisk: '300GB',
      details: {
        resourceCpuDetail: '8C',
        resourceMemoryDetail: '16GB',
        resourceSystemDisk: '100GB',
        resourceDataDisk: '300GB',
        diskTypeDescription: '适合较完整联调和压测前置验证。',
        scenarioUsage: '复杂 UAT、准压测验证',
        scenarioUserScale: '较大业务规模',
        architectureType: 'x86 单机/集群',
        diskIops: '3000',
        diskThroughput: '100MB/s',
        recommendationLevel: '标准',
        priceLevel: '中',
        technicalNotes: '默认高IO磁盘，具体以评审为准。'
      },
    },
  ],
  压测: [
    {
      key: '4C8G',
      cpu: '4C',
      memory: '8GB',
      diskType: '超高IO',
      systemDisk: '100GB',
      dataDisk: '300GB',
      details: {
        resourceCpuDetail: '4C',
        resourceMemoryDetail: '8GB',
        resourceSystemDisk: '100GB',
        resourceDataDisk: '300GB',
        diskTypeDescription: '适合压测前置验证和中等并发压测。',
        scenarioUsage: '压测验证',
        scenarioUserScale: '中等并发规模',
        architectureType: 'x86 单机/集群',
        diskIops: '3000',
        diskThroughput: '100MB/s',
        recommendationLevel: '标准',
        priceLevel: '中',
        technicalNotes: '默认高IO磁盘，具体以评审为准。'
      },
    },
    {
      key: '8C16G',
      cpu: '8C',
      memory: '16GB',
      diskType: '超高IO',
      systemDisk: '100GB',
      dataDisk: '500GB',
      details: {
        resourceCpuDetail: '8C',
        resourceMemoryDetail: '16GB',
        resourceSystemDisk: '100GB',
        resourceDataDisk: '500GB',
        diskTypeDescription: '适合更高压力或多组件压测组合。',
        scenarioUsage: '高压压测',
        scenarioUserScale: '高并发压测规模',
        architectureType: 'x86 单机/集群',
        diskIops: '3000',
        diskThroughput: '100MB/s',
        recommendationLevel: '标准',
        priceLevel: '中',
        technicalNotes: '默认高IO磁盘，具体以评审为准。'
      },
    },
  ],
  PROD: [
    {
      key: '4C8G',
      cpu: '4C',
      memory: '8GB',
      diskType: '超高IO',
      systemDisk: '100GB',
      dataDisk: '200GB',
      details: {
        resourceCpuDetail: '4C',
        resourceMemoryDetail: '8GB',
        resourceSystemDisk: '100GB',
        resourceDataDisk: '200GB',
        diskTypeDescription: '适合轻量单机型生产业务。',
        scenarioUsage: '轻量生产业务',
        scenarioUserScale: '小规模在线业务',
        architectureType: 'x86 单机/集群',
        diskIops: '3000',
        diskThroughput: '100MB/s',
        recommendationLevel: '标准',
        priceLevel: '中',
        technicalNotes: '默认高IO磁盘，具体以评审为准。'
      },
    },
    {
      key: '8C16G',
      cpu: '8C',
      memory: '16GB',
      diskType: '超高IO',
      systemDisk: '100GB',
      dataDisk: '300GB',
      details: {
        resourceCpuDetail: '8C',
        resourceMemoryDetail: '16GB',
        resourceSystemDisk: '100GB',
        resourceDataDisk: '300GB',
        diskTypeDescription: '适合常规业务主机和中间件承载。',
        scenarioUsage: '常规生产业务',
        scenarioUserScale: '中等在线业务规模',
        architectureType: 'x86 单机/集群',
        diskIops: '3000',
        diskThroughput: '100MB/s',
        recommendationLevel: '标准',
        priceLevel: '中',
        technicalNotes: '默认高IO磁盘，具体以评审为准。'
      },
    },
    {
      key: '16C32G',
      cpu: '16C',
      memory: '32GB',
      diskType: '超高IO',
      systemDisk: '120GB',
      dataDisk: '500GB',
      details: {
        resourceCpuDetail: '16C',
        resourceMemoryDetail: '32GB',
        resourceSystemDisk: '120GB',
        resourceDataDisk: '500GB',
        diskTypeDescription: '适合高并发或多组件承载场景，建议结合高可用方案。',
        scenarioUsage: '高并发生产业务',
        scenarioUserScale: '大规模在线业务',
        architectureType: 'x86 单机/集群',
        diskIops: '3000',
        diskThroughput: '100MB/s',
        recommendationLevel: '标准',
        priceLevel: '中',
        technicalNotes: '默认高IO磁盘，具体以评审为准。'
      },
    },
  ],
  DEV: [
    {
      key: '2C4G',
      cpu: '2C',
      memory: '4GB',
      diskType: '高IO',
      systemDisk: '80GB',
      dataDisk: '100GB',
      details: {
        resourceCpuDetail: '2C',
        resourceMemoryDetail: '4GB',
        resourceSystemDisk: '80GB',
        resourceDataDisk: '100GB',
        diskTypeDescription: '适合开发环境联调。',
        scenarioUsage: '开发联调',
        scenarioUserScale: '开发验证',
        architectureType: 'x86 单机/集群',
        diskIops: '3000',
        diskThroughput: '100MB/s',
        recommendationLevel: '标准',
        priceLevel: '中',
        technicalNotes: '默认高IO磁盘，具体以评审为准。'
      },
    },
    {
      key: '4C8G',
      cpu: '4C',
      memory: '8GB',
      diskType: '高IO',
      systemDisk: '80GB',
      dataDisk: '200GB',
      details: {
        resourceCpuDetail: '4C',
        resourceMemoryDetail: '8GB',
        resourceSystemDisk: '80GB',
        resourceDataDisk: '200GB',
        diskTypeDescription: '适合需要数据库或中间件配套的开发验证。',
        scenarioUsage: '开发 + 组件验证',
        scenarioUserScale: '中等开发测试规模',
        architectureType: 'x86 单机/集群',
        diskIops: '3000',
        diskThroughput: '100MB/s',
        recommendationLevel: '标准',
        priceLevel: '中',
        technicalNotes: '默认高IO磁盘，具体以评审为准。'
      },
    },
  ],
} as const;

const vmComponentProfilesByEnvironment: Record<string, Record<string, VmComponentDeployment[]>> = {
  UAT: {
    MySQL: [
      {
        deploymentMode: '单机',
        profiles: [
          {
            key: '2C4G',
            configLabel: 'MySQL 单机 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '100GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '100GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 100GB。',
              scenarioUsage: '配置A-小型',
              scenarioUserScale: '参考配置：配置A-小型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              masterCpuDetail: '2C',
              masterMemoryDetail: '4GB',
              masterSystemDisk: '80GB',
              masterDataDisk: '100GB',
              masterConnections: '500',
              masterDailyQps: '1000',
              masterPeakQps: '3000'
            },
          },
          {
            key: '4C8G',
            configLabel: 'MySQL 单机 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: '配置B-中型',
              scenarioUserScale: '参考配置：配置B-中型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              masterCpuDetail: '2C',
              masterMemoryDetail: '4GB',
              masterSystemDisk: '80GB',
              masterDataDisk: '100GB',
              masterConnections: '500',
              masterDailyQps: '1000',
              masterPeakQps: '3000'
            },
          },
        ],
      },
    ],
    RabbitMQ: [
      {
        deploymentMode: '单机',
        profiles: [
          {
            key: '2C4G',
            configLabel: 'RabbitMQ 单机 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '100GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '100GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 100GB。',
              scenarioUsage: '配置A-小型',
              scenarioUserScale: '参考配置：配置A-小型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              concurrentConnections: '1000',
              messageThroughput: '5000 msg/s',
              queueCount: '50',
              haFeatures: '镜像队列'
            },
          },
          {
            key: '4C8G',
            configLabel: 'RabbitMQ 单机 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: '配置B-中型',
              scenarioUserScale: '参考配置：配置B-中型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              concurrentConnections: '1000',
              messageThroughput: '5000 msg/s',
              queueCount: '50',
              haFeatures: '镜像队列'
            },
          },
        ],
      },
    ],
    Redis: [
      {
        deploymentMode: '单节点',
        profiles: [
          {
            key: '2C4G',
            configLabel: 'Redis 单节点 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '100GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '100GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 100GB。',
              scenarioUsage: 'Redis 小型配置',
              scenarioUserScale: '参考配置：配置A-小型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
          {
            key: '4C8G',
            configLabel: 'Redis 单节点 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: 'Redis 中型配置',
              scenarioUserScale: '参考配置：配置B-中型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
          {
            key: '8C16G',
            configLabel: 'Redis 单节点 8C16G',
            cpu: '8C',
            memory: '16GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '500GB',
            details: {
              resourceCpuDetail: '8C',
              resourceMemoryDetail: '16GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '500GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 500GB。',
              scenarioUsage: 'Redis 大型配置',
              scenarioUserScale: '参考配置：配置C-大型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
        ],
      },
      {
        deploymentMode: '3主3从集群',
        profiles: [
          {
            key: '2C4G',
            configLabel: 'Redis 3主3从集群 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '100GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '100GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 100GB。',
              scenarioUsage: 'Redis 3主3从集群 小型配置',
              scenarioUserScale: '参考配置：集群A-小型3主3从',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
          {
            key: '2C4G',
            configLabel: 'Redis 3主3从集群 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '100GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '100GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 100GB。',
              scenarioUsage: 'Redis 一主2从3哨兵 小型配置',
              scenarioUserScale: '参考配置：集群A-小型哨兵',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
          {
            key: '4C8G',
            configLabel: 'Redis 3主3从集群 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: 'Redis 3主3从集群 中型配置',
              scenarioUserScale: '参考配置：集群B-中型3主3从',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
          {
            key: '4C8G',
            configLabel: 'Redis 3主3从集群 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: 'Redis 一主2从3哨兵 中型配置',
              scenarioUserScale: '参考配置：集群B-中型哨兵',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
          {
            key: '8C16G',
            configLabel: 'Redis 3主3从集群 8C16G',
            cpu: '8C',
            memory: '16GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '500GB',
            details: {
              resourceCpuDetail: '8C',
              resourceMemoryDetail: '16GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '500GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 500GB。',
              scenarioUsage: 'Redis 3主3从集群 大型配置',
              scenarioUserScale: '参考配置：集群C-大型3主3从',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
        ],
      },
      {
        deploymentMode: '哨兵模式',
        profiles: [
          {
            key: '8C16G',
            configLabel: 'Redis 哨兵模式 8C16G',
            cpu: '8C',
            memory: '16GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '500GB',
            details: {
              resourceCpuDetail: '8C',
              resourceMemoryDetail: '16GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '500GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 500GB。',
              scenarioUsage: 'Redis 一主2从3哨兵 大型配置',
              scenarioUserScale: '参考配置：哨兵C-大型哨兵',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
        ],
      },
    ],
    Kafka: [
      {
        deploymentMode: '单节点',
        profiles: [
          {
            key: '2C4G',
            configLabel: 'Kafka 单节点 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: 'Kafka 小型配置',
              scenarioUserScale: '参考配置：配置A-小型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
          {
            key: '4C8G',
            configLabel: 'Kafka 单节点 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '500GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '500GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 500GB。',
              scenarioUsage: 'Kafka 中型配置',
              scenarioUserScale: '参考配置：配置B-中型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
        ],
      },
      {
        deploymentMode: '3节点集群',
        profiles: [
          {
            key: '2C4G',
            configLabel: 'Kafka 3节点集群 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '3 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: 'Kafka 3节点集群 小型配置',
              scenarioUserScale: '参考配置：集群A-小型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
          {
            key: '4C8G',
            configLabel: 'Kafka 3节点集群 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '3 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '500GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '500GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 500GB。',
              scenarioUsage: 'Kafka 3节点集群 中型配置',
              scenarioUserScale: '参考配置：集群B-中型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
          {
            key: '8C16G',
            configLabel: 'Kafka 3节点集群 8C16G',
            cpu: '8C',
            memory: '16GB',
            nodeCount: '3 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '1000GB',
            details: {
              resourceCpuDetail: '8C',
              resourceMemoryDetail: '16GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '1000GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 1000GB。',
              scenarioUsage: 'Kafka 3节点集群 大型配置',
              scenarioUserScale: '参考配置：集群C-大型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
        ],
      },
      {
        deploymentMode: 'Kafka+Zookeeper 组合',
        profiles: [
          {
            key: '2C4G',
            configLabel: 'Kafka Kafka+Zookeeper 组合 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: 'Kafka3节点+Zookeeper3节点 小型配置',
              scenarioUserScale: '参考配置：组合A-小型Kafka3加Zookeeper3',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
          {
            key: '4C8G',
            configLabel: 'Kafka Kafka+Zookeeper 组合 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '500GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '500GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 500GB。',
              scenarioUsage: 'Kafka3节点+Zookeeper3节点 中型配置',
              scenarioUserScale: '参考配置：组合B-中型Kafka3加Zookeeper3',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
          {
            key: '8C16G',
            configLabel: 'Kafka Kafka+Zookeeper 组合 8C16G',
            cpu: '8C',
            memory: '16GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '1000GB',
            details: {
              resourceCpuDetail: '8C',
              resourceMemoryDetail: '16GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '1000GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 1000GB。',
              scenarioUsage: 'Kafka3节点+Zookeeper3节点 大型配置',
              scenarioUserScale: '参考配置：组合C-大型Kafka3加Zookeeper3',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
        ],
      },
    ],
  },
  压测: {
    MySQL: [
      {
        deploymentMode: '单机',
        profiles: [
          {
            key: '2C4G',
            configLabel: 'MySQL 单机 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '100GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '100GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 100GB。',
              scenarioUsage: '配置A-小型',
              scenarioUserScale: '参考配置：配置A-小型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              masterCpuDetail: '2C',
              masterMemoryDetail: '4GB',
              masterSystemDisk: '80GB',
              masterDataDisk: '100GB',
              masterConnections: '500',
              masterDailyQps: '1000',
              masterPeakQps: '3000'
            },
          },
          {
            key: '4C8G',
            configLabel: 'MySQL 单机 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: '配置B-中型',
              scenarioUserScale: '参考配置：配置B-中型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              masterCpuDetail: '2C',
              masterMemoryDetail: '4GB',
              masterSystemDisk: '80GB',
              masterDataDisk: '100GB',
              masterConnections: '500',
              masterDailyQps: '1000',
              masterPeakQps: '3000'
            },
          },
        ],
      },
    ],
    RabbitMQ: [
      {
        deploymentMode: '单机',
        profiles: [
          {
            key: '2C4G',
            configLabel: 'RabbitMQ 单机 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '100GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '100GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 100GB。',
              scenarioUsage: '配置A-小型',
              scenarioUserScale: '参考配置：配置A-小型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              concurrentConnections: '1000',
              messageThroughput: '5000 msg/s',
              queueCount: '50',
              haFeatures: '镜像队列'
            },
          },
          {
            key: '4C8G',
            configLabel: 'RabbitMQ 单机 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: '配置B-中型',
              scenarioUserScale: '参考配置：配置B-中型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              concurrentConnections: '1000',
              messageThroughput: '5000 msg/s',
              queueCount: '50',
              haFeatures: '镜像队列'
            },
          },
        ],
      },
    ],
    Redis: [
      {
        deploymentMode: '单节点',
        profiles: [
          {
            key: '2C4G',
            configLabel: 'Redis 单节点 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '100GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '100GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 100GB。',
              scenarioUsage: 'Redis 小型配置',
              scenarioUserScale: '参考配置：配置A-小型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
          {
            key: '4C8G',
            configLabel: 'Redis 单节点 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: 'Redis 中型配置',
              scenarioUserScale: '参考配置：配置B-中型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
          {
            key: '8C16G',
            configLabel: 'Redis 单节点 8C16G',
            cpu: '8C',
            memory: '16GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '500GB',
            details: {
              resourceCpuDetail: '8C',
              resourceMemoryDetail: '16GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '500GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 500GB。',
              scenarioUsage: 'Redis 大型配置',
              scenarioUserScale: '参考配置：配置C-大型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
        ],
      },
      {
        deploymentMode: '3主3从集群',
        profiles: [
          {
            key: '2C4G',
            configLabel: 'Redis 3主3从集群 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '100GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '100GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 100GB。',
              scenarioUsage: 'Redis 3主3从集群 小型配置',
              scenarioUserScale: '参考配置：集群A-小型3主3从',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
          {
            key: '2C4G',
            configLabel: 'Redis 3主3从集群 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '100GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '100GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 100GB。',
              scenarioUsage: 'Redis 一主2从3哨兵 小型配置',
              scenarioUserScale: '参考配置：集群A-小型哨兵',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
          {
            key: '4C8G',
            configLabel: 'Redis 3主3从集群 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: 'Redis 3主3从集群 中型配置',
              scenarioUserScale: '参考配置：集群B-中型3主3从',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
          {
            key: '4C8G',
            configLabel: 'Redis 3主3从集群 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: 'Redis 一主2从3哨兵 中型配置',
              scenarioUserScale: '参考配置：集群B-中型哨兵',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
          {
            key: '8C16G',
            configLabel: 'Redis 3主3从集群 8C16G',
            cpu: '8C',
            memory: '16GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '500GB',
            details: {
              resourceCpuDetail: '8C',
              resourceMemoryDetail: '16GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '500GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 500GB。',
              scenarioUsage: 'Redis 3主3从集群 大型配置',
              scenarioUserScale: '参考配置：集群C-大型3主3从',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
          {
            key: '8C16G',
            configLabel: 'Redis 3主3从集群 8C16G',
            cpu: '8C',
            memory: '16GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '500GB',
            details: {
              resourceCpuDetail: '8C',
              resourceMemoryDetail: '16GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '500GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 500GB。',
              scenarioUsage: 'Redis 一主2从3哨兵 大型配置',
              scenarioUserScale: '参考配置：集群D-超大型哨兵',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
        ],
      },
      {
        deploymentMode: '哨兵模式',
        profiles: [
          {
            key: '8C16G',
            configLabel: 'Redis 哨兵模式 8C16G',
            cpu: '8C',
            memory: '16GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '500GB',
            details: {
              resourceCpuDetail: '8C',
              resourceMemoryDetail: '16GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '500GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 500GB。',
              scenarioUsage: 'Redis 一主2从3哨兵 大型配置',
              scenarioUserScale: '参考配置：哨兵C-大型哨兵',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
        ],
      },
    ],
    Kafka: [
      {
        deploymentMode: '单节点',
        profiles: [
          {
            key: '2C4G',
            configLabel: 'Kafka 单节点 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: 'Kafka 小型配置',
              scenarioUserScale: '参考配置：配置A-小型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
          {
            key: '4C8G',
            configLabel: 'Kafka 单节点 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '500GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '500GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 500GB。',
              scenarioUsage: 'Kafka 中型配置',
              scenarioUserScale: '参考配置：配置B-中型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
        ],
      },
      {
        deploymentMode: '3节点集群',
        profiles: [
          {
            key: '2C4G',
            configLabel: 'Kafka 3节点集群 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '3 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: 'Kafka 3节点集群 小型配置',
              scenarioUserScale: '参考配置：集群A-小型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
          {
            key: '4C8G',
            configLabel: 'Kafka 3节点集群 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '3 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '500GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '500GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 500GB。',
              scenarioUsage: 'Kafka 3节点集群 中型配置',
              scenarioUserScale: '参考配置：集群B-中型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
          {
            key: '8C16G',
            configLabel: 'Kafka 3节点集群 8C16G',
            cpu: '8C',
            memory: '16GB',
            nodeCount: '3 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '1000GB',
            details: {
              resourceCpuDetail: '8C',
              resourceMemoryDetail: '16GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '1000GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 1000GB。',
              scenarioUsage: 'Kafka 3节点集群 大型配置',
              scenarioUserScale: '参考配置：集群C-大型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
        ],
      },
      {
        deploymentMode: 'Kafka+Zookeeper 组合',
        profiles: [
          {
            key: '2C4G',
            configLabel: 'Kafka Kafka+Zookeeper 组合 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: 'Kafka3节点+Zookeeper3节点 小型配置',
              scenarioUserScale: '参考配置：组合A-小型Kafka3加Zookeeper3',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
          {
            key: '4C8G',
            configLabel: 'Kafka Kafka+Zookeeper 组合 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '500GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '500GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 500GB。',
              scenarioUsage: 'Kafka3节点+Zookeeper3节点 中型配置',
              scenarioUserScale: '参考配置：组合B-中型Kafka3加Zookeeper3',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
          {
            key: '8C16G',
            configLabel: 'Kafka Kafka+Zookeeper 组合 8C16G',
            cpu: '8C',
            memory: '16GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '1000GB',
            details: {
              resourceCpuDetail: '8C',
              resourceMemoryDetail: '16GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '1000GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 1000GB。',
              scenarioUsage: 'Kafka3节点+Zookeeper3节点 大型配置',
              scenarioUserScale: '参考配置：组合C-大型Kafka3加Zookeeper3',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
        ],
      },
    ],
  },
  PROD: {
    MySQL: [
      {
        deploymentMode: '主从',
        profiles: [
          {
            key: '2C4G',
            configLabel: 'MySQL 主从 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '2 节点',
            diskType: '超高IO',
            systemDisk: '80GB',
            dataDisk: '100GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '100GB',
              diskTypeDescription: '超高IO 磁盘，系统盘 80GB，数据盘 100GB。',
              scenarioUsage: '配置A-小型主从',
              scenarioUserScale: '参考配置：配置A-小型主从',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              masterCpuDetail: '2C',
              masterMemoryDetail: '4GB',
              masterSystemDisk: '80GB',
              masterDataDisk: '100GB',
              masterConnections: '500',
              masterDailyQps: '1000',
              masterPeakQps: '3000'
            },
          },
          {
            key: '4C8G',
            configLabel: 'MySQL 主从 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '2 节点',
            diskType: '超高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '超高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: '配置B-标准主从',
              scenarioUserScale: '参考配置：配置B-标准主从',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              masterCpuDetail: '2C',
              masterMemoryDetail: '4GB',
              masterSystemDisk: '80GB',
              masterDataDisk: '100GB',
              masterConnections: '500',
              masterDailyQps: '1000',
              masterPeakQps: '3000'
            },
          },
          {
            key: '8C16G',
            configLabel: 'MySQL 主从 8C16G',
            cpu: '8C',
            memory: '16GB',
            nodeCount: '2 节点',
            diskType: '超高IO',
            systemDisk: '80GB',
            dataDisk: '500GB',
            details: {
              resourceCpuDetail: '8C',
              resourceMemoryDetail: '16GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '500GB',
              diskTypeDescription: '超高IO 磁盘，系统盘 80GB，数据盘 500GB。',
              scenarioUsage: '配置C-高性能主从',
              scenarioUserScale: '参考配置：配置C-高性能主从',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              masterCpuDetail: '2C',
              masterMemoryDetail: '4GB',
              masterSystemDisk: '80GB',
              masterDataDisk: '100GB',
              masterConnections: '500',
              masterDailyQps: '1000',
              masterPeakQps: '3000'
            },
          },
        ],
      },
    ],
    RabbitMQ: [
      {
        deploymentMode: '集群',
        profiles: [
          {
            key: '2C4G',
            configLabel: 'RabbitMQ 集群 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '3 节点',
            diskType: '超高IO',
            systemDisk: '80GB',
            dataDisk: '100GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '100GB',
              diskTypeDescription: '超高IO 磁盘，系统盘 80GB，数据盘 100GB。',
              scenarioUsage: '配置A-小型集群',
              scenarioUserScale: '参考配置：配置A-小型集群',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              concurrentConnections: '1000',
              messageThroughput: '5000 msg/s',
              queueCount: '50',
              haFeatures: '镜像队列'
            },
          },
          {
            key: '4C8G',
            configLabel: 'RabbitMQ 集群 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '3 节点',
            diskType: '超高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '超高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: '配置B-标准集群',
              scenarioUserScale: '参考配置：配置B-标准集群',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              concurrentConnections: '1000',
              messageThroughput: '5000 msg/s',
              queueCount: '50',
              haFeatures: '镜像队列'
            },
          },
        ],
      },
    ],
    Redis: [
      {
        deploymentMode: '单节点',
        profiles: [
          {
            key: '2C4G',
            configLabel: 'Redis 单节点 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '100GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '100GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 100GB。',
              scenarioUsage: 'Redis 小型配置',
              scenarioUserScale: '参考配置：配置A-小型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
          {
            key: '4C8G',
            configLabel: 'Redis 单节点 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: 'Redis 中型配置',
              scenarioUserScale: '参考配置：配置B-中型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
          {
            key: '8C16G',
            configLabel: 'Redis 单节点 8C16G',
            cpu: '8C',
            memory: '16GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '500GB',
            details: {
              resourceCpuDetail: '8C',
              resourceMemoryDetail: '16GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '500GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 500GB。',
              scenarioUsage: 'Redis 大型配置',
              scenarioUserScale: '参考配置：配置C-大型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
        ],
      },
      {
        deploymentMode: '3主3从集群',
        profiles: [
          {
            key: '2C4G',
            configLabel: 'Redis 3主3从集群 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '100GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '100GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 100GB。',
              scenarioUsage: 'Redis 3主3从集群 小型配置',
              scenarioUserScale: '参考配置：集群A-小型3主3从',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
          {
            key: '2C4G',
            configLabel: 'Redis 3主3从集群 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '100GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '100GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 100GB。',
              scenarioUsage: 'Redis 一主2从3哨兵 小型配置',
              scenarioUserScale: '参考配置：集群A-小型哨兵',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
          {
            key: '4C8G',
            configLabel: 'Redis 3主3从集群 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: 'Redis 3主3从集群 中型配置',
              scenarioUserScale: '参考配置：集群B-中型3主3从',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
          {
            key: '4C8G',
            configLabel: 'Redis 3主3从集群 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: 'Redis 一主2从3哨兵 中型配置',
              scenarioUserScale: '参考配置：集群B-中型哨兵',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
          {
            key: '8C16G',
            configLabel: 'Redis 3主3从集群 8C16G',
            cpu: '8C',
            memory: '16GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '500GB',
            details: {
              resourceCpuDetail: '8C',
              resourceMemoryDetail: '16GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '500GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 500GB。',
              scenarioUsage: 'Redis 3主3从集群 大型配置',
              scenarioUserScale: '参考配置：集群C-大型3主3从',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
          {
            key: '8C16G',
            configLabel: 'Redis 3主3从集群 8C16G',
            cpu: '8C',
            memory: '16GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '500GB',
            details: {
              resourceCpuDetail: '8C',
              resourceMemoryDetail: '16GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '500GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 500GB。',
              scenarioUsage: 'Redis 一主2从3哨兵 大型配置',
              scenarioUserScale: '参考配置：集群C-大型哨兵',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              maxConnections: '10000',
              opsPerSecond: '50000',
              memoryUsage: '70%',
              hitRate: '90%',
              dataSize: '10GB',
              persistenceMode: 'RDB + AOF'
            },
          },
        ],
      },
    ],
    Kafka: [
      {
        deploymentMode: '单节点',
        profiles: [
          {
            key: '2C4G',
            configLabel: 'Kafka 单节点 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: 'Kafka 小型配置',
              scenarioUserScale: '参考配置：配置A-小型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
          {
            key: '4C8G',
            configLabel: 'Kafka 单节点 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '500GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '500GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 500GB。',
              scenarioUsage: 'Kafka 中型配置',
              scenarioUserScale: '参考配置：配置B-中型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
          {
            key: '8C16G',
            configLabel: 'Kafka 单节点 8C16G',
            cpu: '8C',
            memory: '16GB',
            nodeCount: '1 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '1000GB',
            details: {
              resourceCpuDetail: '8C',
              resourceMemoryDetail: '16GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '1000GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 1000GB。',
              scenarioUsage: 'Kafka 大型配置',
              scenarioUserScale: '参考配置：配置C-大型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
        ],
      },
      {
        deploymentMode: '3节点集群',
        profiles: [
          {
            key: '2C4G',
            configLabel: 'Kafka 3节点集群 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '3 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: 'Kafka 3节点集群 小型配置',
              scenarioUserScale: '参考配置：集群A-小型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
          {
            key: '4C8G',
            configLabel: 'Kafka 3节点集群 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '3 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '500GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '500GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 500GB。',
              scenarioUsage: 'Kafka 3节点集群 中型配置',
              scenarioUserScale: '参考配置：集群B-中型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
          {
            key: '8C16G',
            configLabel: 'Kafka 3节点集群 8C16G',
            cpu: '8C',
            memory: '16GB',
            nodeCount: '3 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '1000GB',
            details: {
              resourceCpuDetail: '8C',
              resourceMemoryDetail: '16GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '1000GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 1000GB。',
              scenarioUsage: 'Kafka 3节点集群 大型配置',
              scenarioUserScale: '参考配置：集群C-大型',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
        ],
      },
      {
        deploymentMode: 'Kafka+Zookeeper 组合',
        profiles: [
          {
            key: '2C4G',
            configLabel: 'Kafka Kafka+Zookeeper 组合 2C4G',
            cpu: '2C',
            memory: '4GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '200GB',
            details: {
              resourceCpuDetail: '2C',
              resourceMemoryDetail: '4GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '200GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 200GB。',
              scenarioUsage: 'Kafka3节点+Zookeeper3节点 小型配置',
              scenarioUserScale: '参考配置：组合A-小型Kafka3加Zookeeper3',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
          {
            key: '4C8G',
            configLabel: 'Kafka Kafka+Zookeeper 组合 4C8G',
            cpu: '4C',
            memory: '8GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '500GB',
            details: {
              resourceCpuDetail: '4C',
              resourceMemoryDetail: '8GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '500GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 500GB。',
              scenarioUsage: 'Kafka3节点+Zookeeper3节点 中型配置',
              scenarioUserScale: '参考配置：组合B-中型Kafka3加Zookeeper3',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
          {
            key: '8C16G',
            configLabel: 'Kafka Kafka+Zookeeper 组合 8C16G',
            cpu: '8C',
            memory: '16GB',
            nodeCount: '6 节点',
            diskType: '高IO',
            systemDisk: '80GB',
            dataDisk: '1000GB',
            details: {
              resourceCpuDetail: '8C',
              resourceMemoryDetail: '16GB',
              resourceSystemDisk: '80GB',
              resourceDataDisk: '1000GB',
              diskTypeDescription: '高IO 磁盘，系统盘 80GB，数据盘 1000GB。',
              scenarioUsage: 'Kafka3节点+Zookeeper3节点 大型配置',
              scenarioUserScale: '参考配置：组合C-大型Kafka3加Zookeeper3',
              architectureType: 'x86 单机/集群',
              diskIops: '3000',
              diskThroughput: '100MB/s',
              recommendationLevel: '标准',
              priceLevel: '中',
              technicalNotes: '默认高IO磁盘，具体以评审为准。',
              throughput: '10000 msg/s',
              partitionCount: '12',
              replicationFactor: '3',
              brokerCount: '3',
              retentionPeriod: '7天'
            },
          },
        ],
      },
    ],
  },
};


function buildVmConfigReference(draft: DraftState) {
  const profiles = vmSpecProfiles[draft.environment as keyof typeof vmSpecProfiles] || vmSpecProfiles.UAT;
  const selected = profiles.find(item => item.key === draft.vmSpecProfile);
  const base = selected
    ? [
        `CPU详情：${selected.details.resourceCpuDetail}`,
        `内存详情：${selected.details.resourceMemoryDetail}`,
        `系统盘：${selected.details.resourceSystemDisk}`,
        `数据盘：${selected.details.resourceDataDisk}`,
        `磁盘说明：${selected.details.diskTypeDescription}`,
        `适用场景：${selected.details.scenarioUsage}`,
        `用户规模：${selected.details.scenarioUserScale}`,
      ].join('\n')
    : '';
  const parts = [
    draft.environment ? `环境：${draft.environment}` : '',
    draft.vmResourceMode ? `模式：${draft.vmResourceMode}` : '',
    draft.vmDeploymentMode ? `部署：${draft.vmDeploymentMode}` : '',
    draft.vmSpecProfile ? `规格：${draft.vmSpecProfile}` : '',
    draft.vmQuantity ? `数量：${draft.vmQuantity}` : '',
    draft.vmDiskType ? `磁盘类型：${draft.vmDiskType}` : '',
    draft.vmSystemDisk ? `系统盘：${draft.vmSystemDisk}GB` : '',
    draft.vmDataDisk ? `数据盘：${draft.vmDataDisk}GB` : '',
    draft.vmComponentSelection ? `组件：${draft.vmComponentSelection}` : '',
  ].filter(Boolean);

  return [base, parts.length > 0 ? parts.join(' · ') : '待选择环境和规格后生成配置参考。'].filter(Boolean).join('\n');
}

function buildVmComponentReference(component: string, config: VmComponentConfig) {
  return [
    `${component} 配置参考`,
    config.deploymentMode ? `部署方式：${config.deploymentMode}` : '',
    config.configLabel ? `配置名称：${config.configLabel}` : '',
    config.specProfile ? `规格：${config.specProfile}` : '',
    config.nodeCount ? `节点数：${config.nodeCount}` : '',
    config.cpu ? `CPU：${config.cpu}` : '',
    config.memory ? `内存：${config.memory}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

function getVmComponentDeployments(environment: string, component: string) {
  return vmComponentProfilesByEnvironment[environment]?.[component] || vmComponentProfilesByEnvironment.UAT[component] || [];
}

function getVmComponentProfiles(environment: string, component: string, deploymentMode: string) {
  const deployment = getVmComponentDeployments(environment, component).find(item => item.deploymentMode === deploymentMode);
  return deployment?.profiles || [];
}

const vmProfileDetailLabels: Record<string, string> = {
  resourceCpuDetail: 'CPU详情',
  resourceMemoryDetail: '内存详情',
  resourceSystemDisk: '系统盘',
  resourceDataDisk: '数据盘',
  diskTypeDescription: '磁盘类型说明',
  scenarioUsage: '适用场景',
  scenarioUserScale: '用户规模',
  architectureType: '架构类型',
  diskIops: '磁盘IOPS',
  diskThroughput: '磁盘吞吐量',
  recommendationLevel: '推荐等级',
  priceLevel: '价格等级',
  technicalNotes: '技术说明',
  masterCpuDetail: 'CPU详情',
  masterMemoryDetail: '内存详情',
  masterSystemDisk: '系统盘',
  masterDataDisk: '数据盘',
  masterConnections: '最大连接数',
  masterDailyQps: '日均QPS',
  masterPeakQps: '峰值QPS',
  concurrentConnections: '并发连接数',
  messageThroughput: '消息吞吐量',
  queueCount: '队列数量',
  haFeatures: '高可用特性',
  maxConnections: '最大连接数',
  opsPerSecond: '每秒操作数',
  memoryUsage: '内存使用',
  hitRate: '缓存命中率',
  dataSize: '数据容量',
  persistenceMode: '持久化模式',
  throughput: '消息吞吐量',
  partitionCount: '分区数量',
  replicationFactor: '副本因子',
  brokerCount: 'Broker节点数',
  retentionPeriod: '消息保留期',
};

function buildVmProfileDetails(profile: VmSpecProfile | VmComponentProfile) {
  const lines = Object.entries(profile.details)
    .filter(([, value]) => value && String(value).trim().length > 0)
    .map(([key, value]) => `${vmProfileDetailLabels[key] || key}：${value}`);
  return Array.from(new Set(lines)).join('\n');
}

function buildAssistantSummary(draft: DraftState) {
  const suggestions: string[] = [];
  if (draft.userType.includes('经销商') || draft.userType.includes('合作伙伴')) {
    suggestions.push('识别到外部合作伙伴访问场景，建议后续重点确认公网访问、安全边界和认证方式。');
  } else if (draft.userType.includes('对外业务')) {
    suggestions.push('识别到对外业务系统，建议补充域名、端口和上下游访问边界。');
  } else if (draft.userType.includes('内部办公')) {
    suggestions.push('识别到内部办公场景，可优先按内网访问和基础 SLA 口径准备材料。');
  }
  if (draft.appType.includes('门户') || draft.appType.includes('Web')) {
    suggestions.push('当前更像门户 / Web 应用，通常会涉及运行环境、网络发布以及数据库或缓存配套。');
  } else if (draft.appType.includes('API')) {
    suggestions.push('当前更像 API 服务，建议后续补充系统互访、调用方和接口安全要求。');
  } else if (draft.appType.includes('数据服务')) {
    suggestions.push('当前更像数据服务或报表类场景，建议重点确认数据库、存储和权限隔离要求。');
  }
  if (draft.clientType.includes('H5') || draft.clientType.includes('移动端')) {
    suggestions.push('识别到移动端 / H5 访问终端，建议补充认证方式、域名发布和外网访问链路。');
  } else if (draft.clientType.includes('API')) {
    suggestions.push('识别到 API 调用场景，建议补充调用方范围、接口安全和系统互访边界。');
  } else if (draft.clientType.includes('多终端')) {
    suggestions.push('识别到多终端混合访问，建议分别确认 PC、移动端和接口调用链路。');
  }
  if (draft.accessScope.includes('公网')) suggestions.push('已识别公网访问倾向，待补域名、监听端口和网络边界。');
  if (draft.integrationSystems.trim()) suggestions.push('已检测到上下游对接系统，建议后续补充互访带宽、网络策略和接口认证要求。');
  if (draft.resourceNeed.includes('数据库') || draft.resourceNeed.includes('缓存') || draft.resourceNeed.includes('中间件')) {
    suggestions.push('已识别数据库 / 中间件诉求，建议后续补充版本、容量和高可用要求。');
  }
  return suggestions;
}

function completionRate(draft: DraftState, product: string, vmComponentConfigs: VmComponentConfigState) {
  const missingCount = buildMissingItems(draft, product, vmComponentConfigs).length;
  const totalCount = (() => {
    if (product === 'vm') {
      let count = 16;
      const selectedComponents = draft.vmComponentSelection
        .split('、')
        .map(item => item.trim())
        .filter(Boolean);
      if (shouldShowVmComponents(draft.vmResourceMode) && selectedComponents.length === 0) {
        count += 1;
      }
      count += selectedComponents.length * 4;
      return count;
    }
    return 10;
  })();

  const completed = Math.max(0, totalCount - missingCount);
  return Math.round((completed / Math.max(totalCount, 1)) * 100);
}

function buildMissingItems(draft: DraftState, product: string, vmComponentConfigs: VmComponentConfigState) {
  const items: string[] = [];
  if (product === 'vm') {
    const resolvedDeploymentMode = inferVmDeploymentModeFromRequirementAnswer(draft.vmDeploymentMode || '');
    if (!draft.systemName.trim()) items.push('系统名称');
    if (!draft.systemCode.trim()) items.push('系统编号');
    if (!draft.moduleName.trim()) items.push('模块名称');
    if (!draft.owner.trim()) items.push('担当');
    if (!draft.userRequirementBackground.trim()) items.push('背景');
    if (!draft.userRequirementUsers.trim()) items.push('用户相关');
    if (!draft.userRequirementOps.trim()) items.push('运维与安全要求');
    if (!draft.userRequirementCloud.trim()) items.push('云服务与资源诉求');
    if (!draft.userRequirementNetwork.trim()) items.push('网络需求');
    if (!draft.vmResourceMode.trim()) items.push('虚拟机申请模式');
    if (!resolvedDeploymentMode.trim()) items.push('部署方式');
    if (!draft.vmSpecProfile.trim()) items.push('规格档位');
    if (!draft.vmQuantity.trim()) items.push('申请数量');
    if (!draft.vmDiskType.trim()) items.push('磁盘类型');
    if (!draft.vmSystemDisk.trim()) items.push('系统盘');
    if (!draft.vmDataDisk.trim()) items.push('数据盘');
    const selectedComponents = draft.vmComponentSelection
      .split('、')
      .map(item => item.trim())
      .filter(Boolean);
    if (shouldShowVmComponents(draft.vmResourceMode) && selectedComponents.length === 0) {
      items.push('组件能力选择');
    }
    selectedComponents.forEach(component => {
      const config = vmComponentConfigs[component];
      if (!config?.deploymentMode.trim()) items.push(`${component} 部署方式`);
      if (!config?.specProfile.trim()) items.push(`${component} 规格档位`);
      if (!config?.configLabel.trim()) items.push(`${component} 配置名称`);
      if (!config?.nodeCount.trim()) items.push(`${component} 节点数`);
    });
    return items;
  }

  if ((product === 'vm' || product === 'obs' || product === 'sfs' || product === 'network') && !draft.systemName.trim()) {
    items.push('系统名称');
  }
  if ((product === 'vm' || product === 'obs' || product === 'sfs') && !draft.owner.trim()) {
    items.push('担当');
  }
  if (!draft.userRequirementBackground.trim()) items.push('背景');
  if (!draft.userRequirementUsers.trim()) items.push('用户相关');
  if (!draft.userRequirementOps.trim()) items.push('运维与安全要求');
  if (!draft.userRequirementCloud.trim()) items.push('云服务与资源诉求');
  if (!draft.userRequirementNetwork.trim()) items.push('网络需求');
  if (product === 'container') {
    if (!draft.containerSupplier.trim()) items.push('供应商');
    if (!draft.containerSystemCode.trim()) items.push('系统代码');
    if (!draft.containerResourceZone.trim()) items.push('资源分区');
    if (!draft.containerAppName.trim()) items.push('应用英文名称');
    if (!draft.containerInstanceCount.trim()) items.push('实例个数');
    if (!draft.containerCpuPerInstance.trim()) items.push('CPU（单实例）');
    if (!draft.containerMemoryPerInstance.trim()) items.push('内存（单实例）');
    if (!draft.containerCpu.trim()) items.push('总 CPU');
    if (!draft.containerMemory.trim()) items.push('总内存');
  } else if (product === 'obs') {
    if (!draft.obsSupplier.trim()) items.push('应用供应商名称');
    if (!draft.obsBusinessDomain.trim()) items.push('应用所属业务');
    if (!draft.obsBucketName.trim()) items.push('桶名称');
    if (!draft.obsAkSkCount.trim()) items.push('AK/SK 数量');
  } else if (product === 'sfs') {
    if (!draft.sfsBusinessDomain.trim()) items.push('应用所属业务');
    if (!draft.sfsSupplier.trim()) items.push('应用供应商名称');
    if (!draft.sfsName.trim()) items.push('SFS 名称');
    if (!draft.sfsCapacity.trim()) items.push('容量');
    if (!draft.sfsLifecycle.trim()) items.push('使用周期');
  } else if (product === 'permission') {
    if (!draft.permissionType.trim()) items.push('申请权限类型');
    if (draft.permissionType.split('、').includes('其他') && !draft.permissionTypeOther.trim()) items.push('其他权限类型');
    if (!draft.permissionAccount.trim()) items.push('域账号');
    if (!draft.permissionName.trim()) items.push('姓名');
    if (!draft.permissionPhone.trim()) items.push('手机号');
    if (!draft.permissionEmail.trim()) items.push('邮箱');
    if (!draft.permissionReason.trim()) items.push('申请原因');
  } else if (product === 'network') {
    if (!draft.networkSourceAsset.trim()) items.push('源资产编号');
    if (!draft.networkTargetAsset.trim()) items.push('目标资产（资产名称）');
    if (!draft.networkSource.trim()) items.push('源端地址');
    if (!draft.networkTarget.trim()) items.push('目标端地址');
    if (!draft.networkPortType.trim()) items.push('端口类型');
    if (!draft.networkPortRange.trim()) items.push('端口范围');
  }
  return items;
}

function buildStructuredResults(draft: DraftState, product: string, vmComponentConfigs: VmComponentConfigState) {
  if (product === 'vm') {
    const resolvedDeploymentMode = inferVmDeploymentModeFromRequirementAnswer(draft.vmDeploymentMode || '');
    const baseResults = [
      { field: 'systemCode' as DraftField, label: '系统编号', value: draft.systemCode, placeholder: '待补充系统编号' },
      { field: 'moduleName' as DraftField, label: '模块名称', value: draft.moduleName, placeholder: '待补充模块名称' },
      { field: 'systemName' as DraftField, label: '系统名称', value: draft.systemName, placeholder: '待补充系统名称' },
      { field: 'owner' as DraftField, label: '担当', value: draft.owner, placeholder: '待补充担当' },
      { field: 'userRequirementBackground' as DraftField, label: '背景', value: draft.userRequirementBackground, placeholder: '待补充背景说明' },
      { field: 'userRequirementUsers' as DraftField, label: '用户相关', value: draft.userRequirementUsers, placeholder: '待补充用户相关说明' },
      { field: 'userRequirementOps' as DraftField, label: '运维与安全要求', value: draft.userRequirementOps, placeholder: '待补充运维与安全要求' },
      { field: 'userRequirementCloud' as DraftField, label: '云服务与资源诉求', value: draft.userRequirementCloud, placeholder: '待补充云服务与资源诉求' },
      { field: 'userRequirementNetwork' as DraftField, label: '网络需求', value: draft.userRequirementNetwork, placeholder: '待补充网络需求' },
      { field: 'vmResourceMode' as DraftField, label: '申请模式', value: draft.vmResourceMode, placeholder: '待补充虚拟机申请模式' },
      { field: 'vmDeploymentMode' as DraftField, label: '部署方式', value: resolvedDeploymentMode, placeholder: '待补充单机或集群部署方式' },
      { field: 'vmComponentSelection' as DraftField, label: '组件能力选择', value: draft.vmComponentSelection, placeholder: '待补充组件能力选择' },
      { field: 'vmSpecProfile' as DraftField, label: '虚拟机规格档位', value: draft.vmSpecProfile, placeholder: '待补充规格档位' },
      { field: 'vmQuantity' as DraftField, label: '申请数量', value: draft.vmQuantity, placeholder: '待补充申请数量' },
      { field: 'vmDiskType' as DraftField, label: '虚拟机磁盘类型', value: draft.vmDiskType, placeholder: '待补充磁盘类型' },
      { field: 'vmSystemDisk' as DraftField, label: '虚拟机系统盘', value: draft.vmSystemDisk, placeholder: '待补充系统盘' },
      { field: 'vmDataDisk' as DraftField, label: '虚拟机数据盘', value: draft.vmDataDisk, placeholder: '待补充数据盘' },
      { field: 'vmConfigReference' as DraftField, label: '虚拟机配置参考', value: draft.vmConfigReference, placeholder: '待生成配置参考' },
    ];

    const componentResults = draft.vmComponentSelection
      .split('、')
      .map(item => item.trim())
      .filter(Boolean)
      .map(component => {
        const config = vmComponentConfigs[component];
        return {
          field: 'vmComponentSelection' as DraftField,
          label: `${component} 配置`,
          value: config
            ? [
                config.deploymentMode ? `部署：${config.deploymentMode}` : '',
                config.configLabel ? `配置：${config.configLabel}` : '',
                config.specProfile ? `规格：${config.specProfile}` : '',
                config.nodeCount ? `节点：${config.nodeCount}` : '',
                config.cpu ? `CPU：${config.cpu}` : '',
                config.memory ? `内存：${config.memory}` : '',
              ]
                .filter(Boolean)
                .join(' · ')
            : '',
          placeholder: `待补充 ${component} 的部署方式和规格配置`,
        };
      });

    return [...baseResults, ...componentResults];
  }

  const requirementResults = [
    { field: 'userRequirementBackground' as DraftField, label: '背景', value: draft.userRequirementBackground, placeholder: '待补充背景说明' },
    { field: 'userRequirementUsers' as DraftField, label: '用户相关', value: draft.userRequirementUsers, placeholder: '待补充用户相关说明' },
    { field: 'userRequirementOps' as DraftField, label: '运维与安全要求', value: draft.userRequirementOps, placeholder: '待补充运维与安全要求' },
    { field: 'userRequirementCloud' as DraftField, label: '云服务与资源诉求', value: draft.userRequirementCloud, placeholder: '待补充云服务与资源诉求' },
    { field: 'userRequirementNetwork' as DraftField, label: '网络需求', value: draft.userRequirementNetwork, placeholder: '待补充网络需求' },
  ];

  const visibleCommonResults = (() => {
    const systemNameResult = { field: 'systemName' as DraftField, label: '系统名称', value: draft.systemName, placeholder: '待补充系统名称' };
    const ownerResult = { field: 'owner' as DraftField, label: '担当', value: draft.owner, placeholder: '待补充担当' };
    const environmentResult = { field: 'environment' as DraftField, label: '申请环境', value: draft.environment, placeholder: '待补充申请环境' };
    switch (product) {
      case 'container':
        return [environmentResult];
      case 'obs':
      case 'sfs':
        return [systemNameResult, ownerResult, environmentResult];
      case 'network':
        return [systemNameResult, environmentResult];
      case 'permission':
      default:
        return [];
    }
  })();

  if (product === 'container') {
    return [
      ...visibleCommonResults,
      ...requirementResults,
      { field: 'containerSupplier' as DraftField, label: '供应商', value: draft.containerSupplier, placeholder: '待补充供应商' },
      { field: 'containerSystemCode' as DraftField, label: '系统代码', value: draft.containerSystemCode, placeholder: '待补充系统代码' },
      { field: 'containerResourceZone' as DraftField, label: '资源分区', value: draft.containerResourceZone, placeholder: '待补充资源分区' },
      { field: 'containerAppName' as DraftField, label: '应用英文名称', value: draft.containerAppName, placeholder: '待补充应用英文名称' },
      { field: 'containerInstanceCount' as DraftField, label: '实例个数', value: draft.containerInstanceCount, placeholder: '待补充实例个数' },
      { field: 'containerCpuPerInstance' as DraftField, label: 'CPU（单实例）', value: draft.containerCpuPerInstance, placeholder: '待补充 CPU（单实例）' },
      { field: 'containerMemoryPerInstance' as DraftField, label: '内存（单实例）', value: draft.containerMemoryPerInstance, placeholder: '待补充内存（单实例）' },
      { field: 'containerCpu' as DraftField, label: '总 CPU', value: draft.containerCpu, placeholder: '待补充总 CPU' },
      { field: 'containerMemory' as DraftField, label: '总内存', value: draft.containerMemory, placeholder: '待补充总内存' },
      { field: 'containerRemark' as DraftField, label: '备注', value: draft.containerRemark, placeholder: '待补充备注' },
    ];
  }
  if (product === 'obs') {
    return [
      ...visibleCommonResults,
      ...requirementResults,
      { field: 'obsSupplier' as DraftField, label: '应用供应商名称', value: draft.obsSupplier, placeholder: '待补充应用供应商名称' },
      { field: 'obsBusinessDomain' as DraftField, label: '应用所属业务', value: draft.obsBusinessDomain, placeholder: '待补充应用所属业务' },
      { field: 'obsBucketName' as DraftField, label: '桶名称', value: draft.obsBucketName, placeholder: '待补充桶名称' },
      { field: 'obsDirectory' as DraftField, label: '桶内目录名称', value: draft.obsDirectory, placeholder: '待补充桶内目录名称' },
      { field: 'obsAkSkCount' as DraftField, label: 'AK/SK 数量', value: draft.obsAkSkCount, placeholder: '待补充 AK/SK 数量' },
      { field: 'obsDomainAccount' as DraftField, label: '域账号', value: draft.obsDomainAccount, placeholder: '待补充域账号' },
    ];
  }
  if (product === 'sfs') {
    return [
      ...visibleCommonResults,
      ...requirementResults,
      { field: 'sfsBusinessDomain' as DraftField, label: '应用所属业务', value: draft.sfsBusinessDomain, placeholder: '待补充应用所属业务' },
      { field: 'sfsSupplier' as DraftField, label: '应用供应商名称', value: draft.sfsSupplier, placeholder: '待补充应用供应商名称' },
      { field: 'sfsName' as DraftField, label: 'SFS 名称', value: draft.sfsName, placeholder: '待补充 SFS 名称' },
      { field: 'sfsCapacity' as DraftField, label: '容量', value: draft.sfsCapacity, placeholder: '待补充容量' },
      { field: 'sfsLifecycle' as DraftField, label: '使用周期', value: draft.sfsLifecycle, placeholder: '待补充使用周期' },
      { field: 'sfsDomainAccount' as DraftField, label: '域账号', value: draft.sfsDomainAccount, placeholder: '待补充域账号' },
    ];
  }
  if (product === 'permission') {
    return [
      ...visibleCommonResults,
      ...requirementResults,
      { field: 'permissionType' as DraftField, label: '申请权限类型', value: draft.permissionType, placeholder: '待补充申请权限类型' },
      { field: 'permissionTypeOther' as DraftField, label: '其他权限类型', value: draft.permissionTypeOther, placeholder: '待补充其他权限类型' },
      { field: 'permissionAccount' as DraftField, label: '域账号', value: draft.permissionAccount, placeholder: '待补充域账号' },
      { field: 'permissionName' as DraftField, label: '姓名', value: draft.permissionName, placeholder: '待补充姓名' },
      { field: 'permissionPhone' as DraftField, label: '手机号', value: draft.permissionPhone, placeholder: '待补充手机号' },
      { field: 'permissionEmail' as DraftField, label: '邮箱', value: draft.permissionEmail, placeholder: '待补充邮箱' },
      { field: 'permissionReason' as DraftField, label: '申请原因', value: draft.permissionReason, placeholder: '待补充申请原因' },
    ];
  }
  if (product === 'network') {
    return [
      ...visibleCommonResults,
      ...requirementResults,
      { field: 'networkSourceAsset' as DraftField, label: '源资产编号', value: draft.networkSourceAsset, placeholder: '待补充源资产编号' },
      { field: 'networkTargetAsset' as DraftField, label: '目标资产（资产名称）', value: draft.networkTargetAsset, placeholder: '待补充目标资产' },
      { field: 'networkSource' as DraftField, label: '源端地址', value: draft.networkSource, placeholder: '待补充源端地址' },
      { field: 'networkTarget' as DraftField, label: '目标端地址', value: draft.networkTarget, placeholder: '待补充目标端地址' },
      { field: 'networkPortType' as DraftField, label: '端口类型', value: draft.networkPortType, placeholder: '待补充端口类型' },
      { field: 'networkPortRange' as DraftField, label: '端口范围', value: draft.networkPortRange, placeholder: '待补充端口范围' },
      { field: 'networkReason' as DraftField, label: '开通原因（补充）', value: draft.networkReason, placeholder: '待补充开通原因' },
    ];
  }
  return [...visibleCommonResults, ...requirementResults];
}

function buildWorkbenchReviewSummaryOverview(
  draft: DraftState,
  product: string,
  vmComponentConfigs: VmComponentConfigState,
) {
  if (product !== 'vm') {
    return [
      '一、总体说明',
      `1. 本次申请系统为 ${draft.systemName || '待补充系统名称'}，模块为 ${draft.moduleName || '待补充模块名称'}，担当为 ${draft.owner || '待补充担当'}。`,
      `2. 当前申请环境为 ${draft.environment || '待补充申请环境'}。`,
      `3. 申请背景为：${draft.userRequirementBackground || '待补充背景说明。'}`,
      '二、申请信息',
      `4. 用户相关要求为：${draft.userRequirementUsers || '待补充用户相关说明。'}`,
      `5. 运维与安全要求为：${draft.userRequirementOps || '待补充运维与安全要求。'}`,
      `6. 网络需求为：${draft.userRequirementNetwork || '待补充网络需求。'}`,
    ].join('\n');
  }

  const selectedComponents = draft.vmComponentSelection
    .split('、')
    .map(item => item.trim())
    .filter(Boolean);
  const componentSummaries = selectedComponents.map(component => {
    const config = vmComponentConfigs[component];
    if (!config) return `${component}：待补充配置`;
    return [
      component,
      config.deploymentMode ? `部署 ${config.deploymentMode}` : '',
      config.configLabel ? `配置 ${config.configLabel}` : '',
      config.specProfile ? `规格 ${config.specProfile}` : '',
      config.nodeCount ? `节点 ${config.nodeCount}` : '',
    ]
      .filter(Boolean)
      .join('，');
  });

  return [
    '一、总体说明',
    `1. 本次申请系统为 ${draft.systemName || '待补充系统名称'}，模块为 ${draft.moduleName || '待补充模块名称'}，担当为 ${draft.owner || '待补充担当'}。`,
    `2. 当前申请环境为 ${draft.environment || '待补充申请环境'}，申请模式为 ${draft.vmResourceMode || '待补充申请模式'}，主机部署方式为 ${draft.vmDeploymentMode || '待补充部署方式'}。`,
    `3. 申请背景为：${draft.userRequirementBackground || '待补充背景说明。'}`,
    '二、资源摘要',
    `4. 虚拟机规格为 ${draft.vmSpecProfile || '待补充规格档位'}，数量 ${draft.vmQuantity || '待补充申请数量'}，磁盘配置为 ${draft.vmDiskType || '待补充磁盘类型'} / 系统盘 ${draft.vmSystemDisk ? `${draft.vmSystemDisk}GB` : '待补充'} / 数据盘 ${draft.vmDataDisk ? `${draft.vmDataDisk}GB` : '待补充'}。`,
    `5. 组件配置为：${componentSummaries.length > 0 ? componentSummaries.join('；') : '当前未选择组件能力。'}`,
    `6. 云服务与资源诉求为：${inlineRequirementText(draft.userRequirementCloud) || '待补充云服务与资源诉求。'}`,
    '三、协同与评审关注点',
    `7. 用户相关要求为：${inlineRequirementText(draft.userRequirementUsers) || '待补充用户相关说明。'}`,
    `8. 运维与安全要求为：${inlineRequirementText(draft.userRequirementOps) || '待补充运维与安全要求。'}`,
    `9. 网络需求为：${inlineRequirementText(draft.userRequirementNetwork) || '待补充网络需求。'}`,
  ].join('\n');
}

function buildExportDraftPayload(
  draft: DraftState,
  vmComponentConfigs: VmComponentConfigState,
  requirementAnswers: Record<string, string>,
): RequestRecordDraftPayload {
  const categoryTexts = Object.fromEntries(
    REQUEST_REQUIREMENT_CATEGORIES.map(category => {
      const text = category.projects
        .map(project => {
          const legacyKey = `${category.id}/${project.id}`;
          const directAnswer = requirementAnswers[legacyKey] || '';
          if (directAnswer.trim()) {
            return `【${project.title}】\n${directAnswer}`;
          }

          const fallbackAnswer = (() => {
            if (category.id === 'server' && project.id === 'deploy') {
              return draft.vmDeploymentMode || '';
            }
            return '';
          })();

          if (!fallbackAnswer.trim()) return '';
          return `【${project.title}】\n${fallbackAnswer}`;
        })
        .filter(Boolean)
        .join('\n\n');
      return [category.id, text];
    }),
  ) as Record<string, string>;

  const inferredDeploymentMode = inferVmDeploymentModeFromRequirementAnswer(
    requirementAnswers['server/deploy'] || draft.vmDeploymentMode,
  );

  return {
    ...draft,
    userRequirementBackground: categoryTexts.background || draft.userRequirementBackground,
    userRequirementUsers: categoryTexts.users || draft.userRequirementUsers,
    userRequirementOps: [categoryTexts.ops, categoryTexts.security].filter(Boolean).join('\n\n') || draft.userRequirementOps,
    userRequirementCloud: [categoryTexts.cloud, categoryTexts.middleware, categoryTexts.server].filter(Boolean).join('\n\n') || draft.userRequirementCloud,
    userRequirementCloudService: categoryTexts.cloud || '',
    userRequirementMiddleware: categoryTexts.middleware || '',
    userRequirementServer: categoryTexts.server || '',
    userRequirementNetwork: categoryTexts.network || draft.userRequirementNetwork,
    vmDeploymentMode: inferredDeploymentMode || draft.vmDeploymentMode,
    vmComponentConfigs: JSON.stringify(vmComponentConfigs),
  } as RequestRecordDraftPayload;
}

function normalizeDraft(input?: Partial<DraftState> | null): DraftState {
  return {
    ...defaultDraft,
    ...input,
    systemCode: input?.systemCode || '',
    moduleName: input?.moduleName || '',
    owner: input?.owner || '',
    userRequirementBackground: input?.userRequirementBackground || '',
    userRequirementUsers: input?.userRequirementUsers || '',
    userRequirementOps: input?.userRequirementOps || '',
    userRequirementCloud: input?.userRequirementCloud || '',
    userRequirementNetwork: input?.userRequirementNetwork || '',
    vmResourceMode: input?.vmResourceMode || '',
    vmDeploymentMode: input?.vmDeploymentMode || '',
    vmComponentSelection: input?.vmComponentSelection || '',
    vmSpecProfile: input?.vmSpecProfile || '',
    vmQuantity: input?.vmQuantity || '',
    vmDiskType: input?.vmDiskType || '',
    vmSystemDisk: input?.vmSystemDisk || '',
    vmDataDisk: input?.vmDataDisk || '',
    vmConfigReference: input?.vmConfigReference || '',
    vmComponentConfigs: input?.vmComponentConfigs || '',
    containerInstanceCount: input?.containerInstanceCount || '',
    containerCpuPerInstance: input?.containerCpuPerInstance || '',
    containerMemoryPerInstance: input?.containerMemoryPerInstance || '',
    containerCpu: input?.containerCpu || '',
    containerMemory: input?.containerMemory || '',
    containerRemark: input?.containerRemark || '',
    containerSupplier: input?.containerSupplier || '',
    containerSystemCode: input?.containerSystemCode || '',
    containerResourceZone: input?.containerResourceZone || '',
    containerAppName: input?.containerAppName || '',
    obsBucketName: input?.obsBucketName || '',
    obsDirectory: input?.obsDirectory || '',
    obsCapacity: input?.obsCapacity || '',
    obsLifecycle: input?.obsLifecycle || '',
    obsAccessPolicy: input?.obsAccessPolicy || '',
    obsSupplier: input?.obsSupplier || '',
    obsBusinessDomain: input?.obsBusinessDomain || '',
    obsAkSkCount: input?.obsAkSkCount || '',
    obsDomainAccount: input?.obsDomainAccount || '',
    sfsName: input?.sfsName || '',
    sfsCapacity: input?.sfsCapacity || '',
    sfsLifecycle: input?.sfsLifecycle || '',
    sfsProtocol: input?.sfsProtocol || '',
    sfsSupplier: input?.sfsSupplier || '',
    sfsBusinessDomain: input?.sfsBusinessDomain || '',
    sfsDomainAccount: input?.sfsDomainAccount || '',
    permissionAccount: input?.permissionAccount || '',
    permissionName: input?.permissionName || '',
    permissionPhone: input?.permissionPhone || '',
    permissionEmail: input?.permissionEmail || '',
    permissionScope: input?.permissionScope || '',
    permissionReason: input?.permissionReason || '',
    permissionTypeOther: input?.permissionTypeOther || '',
    permissionType: input?.permissionType || '',
    networkSource: input?.networkSource || '',
    networkTarget: input?.networkTarget || '',
    networkPortType: input?.networkPortType || '',
    networkPortRange: input?.networkPortRange || '',
    networkProtocol: input?.networkProtocol || '',
    networkReason: input?.networkReason || '',
    networkSourceAsset: input?.networkSourceAsset || '',
    networkTargetAsset: input?.networkTargetAsset || '',
  };
}

function shouldShowVmComponents(mode: string) {
  return mode.includes('组件组合') || mode.includes('综合一体');
}

function parseVmComponentConfigs(raw: string): VmComponentConfigState {
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw) as VmComponentConfigState;
  } catch {
    return {};
  }
}

function Workbench({ initialMode }: { initialMode: WorkbenchMode }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<WorkbenchMode>(initialMode);
  const [draft, setDraft] = useState<DraftState>(defaultDraft);
  const [vmComponentConfigs, setVmComponentConfigs] = useState<VmComponentConfigState>({});
  const [highlightedFields, setHighlightedFields] = useState<DraftField[]>([]);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState('');
  const [collapsedRequirementCategories, setCollapsedRequirementCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    requirementCategories.forEach(category => {
      if (category.id !== 'background') initial[category.id] = true;
    });
    return initial;
  });
  const [requirementCollapsed, setRequirementCollapsed] = useState(false);
  const [requirementAnswers, setRequirementAnswers] = useState<Record<string, string>>({});
  const [vmSceneDescription, setVmSceneDescription] = useState('');
  const [wizardStep, setWizardStep] = useState(0);
  const [stageOneCollapsed, setStageOneCollapsed] = useState(false);
  const [vmBaseConfigCollapsed, setVmBaseConfigCollapsed] = useState(false);
  const [collapsedVmComponents, setCollapsedVmComponents] = useState<Record<string, boolean>>({});
  const [showWorkflowHint, setShowWorkflowHint] = useState(false);
  const [showQuickStartHint, setShowQuickStartHint] = useState(false);
  const [exportValidationResult, setExportValidationResult] = useState<RequestReviewExportValidationResult | null>(null);
  const product = searchParams.get('product') || '';
  const action = searchParams.get('action') || '';
  const sourceId = searchParams.get('sourceId') || '';
  const isCloneMode = action === 'clone' && Boolean(sourceId);
  const sourceRecord = isCloneMode ? getRequestRecord(sourceId) : null;

  const getRequirementKey = (categoryId: string, projectId: string) => `${categoryId}/${projectId}`;

  const productMeta = {
    vm: { title: '虚拟机申请', hint: '这里会继续帮你确认环境、部署方式、是否需要数据库或中间件，以及配置参考。' },
    container: { title: '容器申请', hint: '这里会继续确认实例数量、CPU、内存和应用基础信息。' },
    obs: { title: 'OBS 申请', hint: '这里会继续确认桶、目录、容量和使用周期等信息。' },
    sfs: { title: 'SFS 申请', hint: '这里会继续确认文件存储名称、容量和使用周期。' },
    permission: { title: '用户权限申请', hint: '这里会继续确认账号信息、联系人和权限范围。' },
    network: { title: '网络策略申请', hint: '这里会继续确认源目标地址、端口和开通原因。' },
  } as const;

  const currentProduct = productMeta[product as keyof typeof productMeta] || null;
  const isVmProduct = product === 'vm';

  // 将用户需求区各小项回答同步到 DraftState 对应大字段
  useEffect(() => {
    setDraft(current => {
      const next = { ...current };
      const categoryTexts = Object.fromEntries(
        requirementCategories.map(category => [category.id, buildRequirementFieldText(category, requirementAnswers)]),
      ) as Record<string, string>;
      next.userRequirementBackground = categoryTexts.background || '';
      next.userRequirementUsers = categoryTexts.users || '';
      next.userRequirementNetwork = categoryTexts.network || '';
      next.userRequirementOps = [categoryTexts.ops, categoryTexts.security].filter(Boolean).join('\n\n');
      next.userRequirementCloud = [categoryTexts.cloud, categoryTexts.middleware, categoryTexts.server].filter(Boolean).join('\n\n');
      return next;
    });
  }, [requirementAnswers]);

  const modeTheme =
    mode === 'assistant'
      ? {
          shell: 'border-emerald-100 bg-[linear-gradient(180deg,#f0fdf4_0%,#ffffff_100%)]',
          accentBorder: 'border-emerald-200',
          accentSoft: 'bg-emerald-50 text-emerald-700',
          accentText: 'text-emerald-700',
          contentBorder: 'border-emerald-100',
          contentBg: 'bg-emerald-50/25',
          progress: 'bg-emerald-500',
        }
      : {
          shell: 'border-amber-100 bg-[linear-gradient(180deg,#fffbeb_0%,#ffffff_100%)]',
          accentBorder: 'border-amber-200',
          accentSoft: 'bg-amber-50 text-amber-700',
          accentText: 'text-amber-700',
          contentBorder: 'border-amber-100',
          contentBg: 'bg-amber-50/25',
          progress: 'bg-amber-500',
        };
  const vmProfiles = vmSpecProfiles[draft.environment as keyof typeof vmSpecProfiles] || vmSpecProfiles.UAT;
  const currentVmProfile = vmProfiles.find(item => item.key === draft.vmSpecProfile) || null;
  const vmResourceModeOptions = vmResourceModeOptionsByEnvironment[draft.environment] || vmResourceModeOptionsByEnvironment.UAT;

  useEffect(() => {
    if (!isVmProduct) return;
    setDraft(current => {
      const nextReference = buildVmConfigReference(current);
      if (nextReference === current.vmConfigReference) return current;
      return { ...current, vmConfigReference: nextReference };
    });
  }, [draft.environment, draft.vmSpecProfile, isVmProduct]);

  useEffect(() => {
    if (!isVmProduct || draft.vmDeploymentMode.trim()) return;
    const deployAnswer = requirementAnswers[getRequirementKey('server', 'deploy')] || '';
    const inferredMode = inferVmDeploymentModeFromRequirementAnswer(deployAnswer);
    if (!inferredMode) return;
    setDraft(current => {
      if (current.vmDeploymentMode.trim()) return current;
      return { ...current, vmDeploymentMode: inferredMode };
    });
  }, [draft.vmDeploymentMode, isVmProduct, requirementAnswers]);

  useEffect(() => {
    if (!isVmProduct) return;
    setDraft(current => {
      const nextMode = vmResourceModeOptionsByEnvironment[current.environment]?.[0] || '';
      const shouldResetMode = current.vmResourceMode && vmResourceModeOptionsByEnvironment[current.environment] && !vmResourceModeOptionsByEnvironment[current.environment].includes(current.vmResourceMode);
      if (!shouldResetMode && current.vmResourceMode) return current;
      return {
        ...current,
        vmResourceMode: current.vmResourceMode && !shouldResetMode ? current.vmResourceMode : nextMode,
        vmComponentSelection: nextMode.includes('仅申请虚拟机裸机资源') ? '' : current.vmComponentSelection,
      };
    });
    if (draft.environment === 'SIT') {
      setVmComponentConfigs({});
    }
  }, [draft.environment, isVmProduct]);

  useEffect(() => {
    const sourceId = searchParams.get('sourceId');
    const action = searchParams.get('action');
    if (!sourceId || !action) return;

    const record = getRequestRecord(sourceId);
    if (!record) return;

    const sourceDraft = normalizeDraft(record.draft);
    if (action === 'clone') {
      sourceDraft.systemCode = '';
    }

    setDraft(sourceDraft);
    setVmComponentConfigs(parseVmComponentConfigs(record.draft.vmComponentConfigs || ''));
    setRequirementAnswers(parseRequirementAnswersFromDraft(record.draft));
    setMode(record.mode);
    setActiveRecordId(action === 'edit' ? record.id : null);
    setCollapsedVmComponents({});
  }, [searchParams]);

  useEffect(() => {
    setWizardStep(0);
  }, [mode]);

  // 引导模式下：阶段1当前步骤展开，已走过的步骤折叠，未走过的步骤不显示；进入阶段2后阶段1整体折叠
  useEffect(() => {
    if (mode !== 'assistant') return;
    const activeCategoryId = wizardSteps[wizardStep]?.categoryId;
    setCollapsedRequirementCategories(current => {
      const next: Record<string, boolean> = {};
      requirementCategories.forEach(category => {
        next[category.id] = category.id !== activeCategoryId;
      });
      return next;
    });
    setStageOneCollapsed(wizardStep === 8);
  }, [mode, wizardStep]);

  const progress = useMemo(() => completionRate(draft, product, vmComponentConfigs), [draft, product, vmComponentConfigs]);
  const suggestions = useMemo(() => buildAssistantSummary(draft), [draft]);
  const missingItems = useMemo(() => buildMissingItems(draft, product, vmComponentConfigs), [draft, product, vmComponentConfigs]);
  const structuredResults = useMemo(() => buildStructuredResults(draft, product, vmComponentConfigs), [draft, product, vmComponentConfigs]);

  const markFieldsUpdated = (fields: DraftField[]) => {
    const nextFields = Array.from(new Set(fields.filter(Boolean)));
    if (nextFields.length === 0) return;
    setHighlightedFields(nextFields);
    window.setTimeout(() => {
      setHighlightedFields(current => current.filter(field => !nextFields.includes(field)));
    }, 1800);
  };

  const updateDraft = (key: DraftField, value: string) => {
    setDraft(current => ({ ...current, [key]: value }));
    markFieldsUpdated([key]);
  };

  const handleSaveRequestRecord = () => {
    const saved = saveRequestRecord({
      id: activeRecordId || undefined,
      product,
      mode,
      reviewSummaryOverview: buildWorkbenchReviewSummaryOverview(draft, product, vmComponentConfigs),
      draft: buildExportDraftPayload(draft, vmComponentConfigs, requirementAnswers),
    });
    setActiveRecordId(saved.id);
    setSaveNotice(`已保存申请单 ${saved.id}`);
    window.setTimeout(() => navigate('/request-records'), 600);
  };

  const saveCurrentRequestRecord = () => {
    const saved = saveRequestRecord({
      id: activeRecordId || undefined,
      product,
      mode,
      reviewSummaryOverview: buildWorkbenchReviewSummaryOverview(draft, product, vmComponentConfigs),
      draft: buildExportDraftPayload(draft, vmComponentConfigs, requirementAnswers),
    });
    setActiveRecordId(saved.id);
    setSaveNotice(`已保存申请单 ${saved.id}`);
    return saved;
  };

  const validateCurrentDraftForExport = () => {
    const result = validateRequestReviewExportDraft(buildExportDraftPayload(draft, vmComponentConfigs, requirementAnswers));
    if (!result.ready) {
      setExportValidationResult(result);
      return null;
    }
    return result;
  };

  const handleOpenReviewExport = () => {
    const record = saveCurrentRequestRecord();
    navigate(`/request-review-export/${record.id}?from=workbench&product=${product || 'vm'}&mode=${mode}`);
  };

  const handleExportCurrentExcel = async () => {
    if (!validateCurrentDraftForExport()) return;
    const record = saveCurrentRequestRecord();
    const { downloadRequestReviewExcel } = await import('@aiops/shared');
    await downloadRequestReviewExcel(record);
    markRequestRecordsExported([record.id]);
  };

  const handleExportCurrentPdf = () => {
    if (!validateCurrentDraftForExport()) return;
    const record = saveCurrentRequestRecord();
    navigate(`/request-review-export/${record.id}?from=workbench&product=${product || 'vm'}&mode=${mode}&autoExport=pdf`);
    markRequestRecordsExported([record.id]);
  };

  const toggleVmComponent = (component: string) => {
    setDraft(current => {
      const currentItems = current.vmComponentSelection
        .split('、')
        .map(item => item.trim())
        .filter(Boolean);
      const nextItems = currentItems.includes(component)
        ? currentItems.filter(item => item !== component)
        : [...currentItems, component];
      return {
        ...current,
        vmComponentSelection: nextItems.join('、'),
      };
    });
    setVmComponentConfigs(current => {
      const next = { ...current };
      if (next[component]) {
        delete next[component];
        return next;
      }
      next[component] = {
        deploymentMode: '',
        specProfile: '',
        configLabel: '',
        cpu: '',
        memory: '',
        nodeCount: '',
        diskType: '',
        systemDisk: '',
        dataDisk: '',
        configReference: '',
      };
      return next;
    });
    markFieldsUpdated(['vmComponentSelection']);
  };

  const selectVmProfile = (profileKey: string) => {
    const selected = vmProfiles.find(item => item.key === profileKey);
    if (!selected) return;
    setDraft(current => ({
      ...current,
      vmSpecProfile: selected.key,
      vmDiskType: selected.diskType,
      vmSystemDisk: normalizeCapacityValue(selected.systemDisk),
      vmDataDisk: normalizeCapacityValue(selected.dataDisk),
    }));
    markFieldsUpdated(['vmSpecProfile', 'vmDiskType', 'vmSystemDisk', 'vmDataDisk']);
  };

  useEffect(() => {
    if (product !== 'container') return;
    const instanceCount = parseInt(draft.containerInstanceCount, 10) || 0;
    const cpuPerInstance = parseInt(draft.containerCpuPerInstance, 10) || 0;
    const memoryPerInstance = parseInt(draft.containerMemoryPerInstance, 10) || 0;
    if (instanceCount > 0 && cpuPerInstance > 0 && memoryPerInstance > 0) {
      setDraft(current => ({
        ...current,
        containerCpu: String(instanceCount * cpuPerInstance),
        containerMemory: String(instanceCount * memoryPerInstance),
      }));
      markFieldsUpdated(['containerCpu', 'containerMemory']);
    }
  }, [product, draft.containerInstanceCount, draft.containerCpuPerInstance, draft.containerMemoryPerInstance]);

  const togglePermissionType = (option: string) => {
    setDraft(current => {
      const currentItems = current.permissionType
        .split('、')
        .map(item => item.trim())
        .filter(Boolean);
      const nextItems = currentItems.includes(option)
        ? currentItems.filter(item => item !== option)
        : [...currentItems, option];
      return { ...current, permissionType: nextItems.join('、') };
    });
    markFieldsUpdated(['permissionType']);
  };

  const updateVmComponentConfig = (component: string, patch: Partial<VmComponentConfig>) => {
    setVmComponentConfigs(current => {
      const seed = current[component] || {
        deploymentMode: '',
        specProfile: '',
        configLabel: '',
        cpu: '',
        memory: '',
        nodeCount: '',
        diskType: '',
        systemDisk: '',
        dataDisk: '',
        configReference: '',
      };
      const nextConfig = { ...seed, ...patch };
      if (patch.deploymentMode) {
        nextConfig.specProfile = '';
        nextConfig.configLabel = '';
        nextConfig.cpu = '';
        nextConfig.memory = '';
        nextConfig.nodeCount = '';
        nextConfig.diskType = '';
        nextConfig.systemDisk = '';
        nextConfig.dataDisk = '';
        nextConfig.configReference = buildVmComponentReference(component, nextConfig);
      }
      if (patch.specProfile) {
        const selected = getVmComponentProfiles(draft.environment, component, nextConfig.deploymentMode).find(item => item.key === patch.specProfile);
        if (selected) {
          nextConfig.configLabel = selected.configLabel;
          nextConfig.cpu = selected.cpu;
          nextConfig.memory = selected.memory;
          nextConfig.nodeCount = selected.nodeCount;
          nextConfig.diskType = selected.diskType;
          nextConfig.systemDisk = normalizeCapacityValue(selected.systemDisk);
          nextConfig.dataDisk = normalizeCapacityValue(selected.dataDisk);
          nextConfig.configReference = buildVmComponentReference(component, {
            ...nextConfig,
            specProfile: selected.key,
            configLabel: selected.configLabel,
            cpu: selected.cpu,
            memory: selected.memory,
            nodeCount: selected.nodeCount,
            diskType: selected.diskType,
            systemDisk: selected.systemDisk,
            dataDisk: selected.dataDisk,
          });
        }
      } else {
        nextConfig.configReference = buildVmComponentReference(component, nextConfig);
      }
      return { ...current, [component]: nextConfig };
    });
  };

  const toggleVmComponentCollapsed = (component: string) => {
    setCollapsedVmComponents(current => ({ ...current, [component]: !current[component] }));
  };

  const toggleRequirementCategoryCollapsed = (categoryId: string) => {
    setCollapsedRequirementCategories(current => ({ ...current, [categoryId]: !current[categoryId] }));
  };

  const updateRequirementAnswer = (categoryId: string, projectId: string, value: string) => {
    setRequirementAnswers(current => ({ ...current, [getRequirementKey(categoryId, projectId)]: value }));
  };

  const appendRequirementAnswer = (categoryId: string, projectId: string, option: string) => {
    setRequirementAnswers(current => {
      const key = getRequirementKey(categoryId, projectId);
      const currentValue = current[key] || '';
      const separator = currentValue.trim() ? '、' : '';
      return { ...current, [key]: `${currentValue.trim()}${separator}${option}` };
    });
  };

  const handleVmSceneInference = () => {
    const raw = vmSceneDescription.trim();
    if (!raw) return;
    const { draftPatch, answersPatch } = applyVmSceneInference(raw, draft.environment);
    setDraft(current => ({ ...current, ...draftPatch }));
    setRequirementAnswers(current => ({ ...current, ...answersPatch }));
    const changedFields = Object.keys(draftPatch).filter(Boolean) as DraftField[];
    if (changedFields.length > 0) markFieldsUpdated(changedFields);
    // 自动展开已填充的大类，方便用户确认
    const changedCategories = new Set<string>();
    Object.keys(answersPatch).forEach(key => {
      const [categoryId] = key.split('/');
      if (categoryId) changedCategories.add(categoryId);
    });
    if (changedCategories.size > 0) {
      setCollapsedRequirementCategories(current => {
        const next = { ...current };
        changedCategories.forEach(id => { next[id] = false; });
        return next;
      });
    }
  };

  const wizardSteps = [
    { title: '背景', categoryId: 'background' },
    { title: '用户相关', categoryId: 'users' },
    { title: '运维相关', categoryId: 'ops' },
    { title: '安全要件', categoryId: 'security' },
    { title: '云服务提供', categoryId: 'cloud' },
    { title: '中间件 & 数据库', categoryId: 'middleware' },
    { title: '服务器基础侧', categoryId: 'server' },
    { title: '网络需求', categoryId: 'network' },
    { title: '申请信息', categoryId: null },
  ];

  const renderRequirementProjects = (category: RequirementCategory) => (
    <div className="mt-3 space-y-3">
      {category.projects.map(project => (
        <div key={project.id} className="rounded-2xl bg-slate-50 px-3 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-800">{project.title}</div>
              <div className="mt-0.5 text-xs text-slate-500">{project.description}</div>
              <div className="mt-1.5 flex items-start gap-1 text-xs text-slate-400">
                <CircleHelp className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{project.hint}</span>
              </div>
              {project.quickOptions.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-400">示例，可点击填入：</span>
                  {[...project.quickOptions, ...(project.allowExplicitNone === false ? [] : ['无'])].map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => appendRequirementAnswer(category.id, project.id, option)}
                      className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600 hover:border-primary hover:text-primary"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Textarea
              value={requirementAnswers[getRequirementKey(category.id, project.id)] || ''}
              onChange={event => updateRequirementAnswer(category.id, project.id, event.target.value)}
              placeholder={`示例：${project.placeholder}`}
              className="min-h-[72px] bg-white md:w-[45%] md:min-w-[260px]"
            />
          </div>
          {isRequirementAnswerInvalid(project, requirementAnswers[getRequirementKey(category.id, project.id)] || '') && (
            <div className="mt-2 text-xs font-medium text-rose-600">
              该项必须填写具体内容，不可填写“无”。
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const environmentSelectClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

  const renderVmApplicationInfo = () => (
    <>
      <section className="rounded-[20px] border border-slate-200 bg-white px-4 py-3">
        <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_240px] lg:items-center">
          <label className="space-y-1.5">
            <FieldLabel required>申请环境</FieldLabel>
            <select value={draft.environment} onChange={event => updateDraft('environment', event.target.value)} className={environmentSelectClass}>
              {vmEnvironmentOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <div className="space-y-1.5">
            <FieldLabel required>申请模式</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {vmResourceModeOptions.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => updateDraft('vmResourceMode', option)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    draft.vmResourceMode === option
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-500">
            {draft.environment === 'SIT' ? 'SIT 仅支持裸机资源申请。' : 'UAT / 压测 / PROD 支持组合部署或综合一体部署。'}
          </div>
        </div>
      </section>

      <section className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-slate-900">虚拟机底座配置</div>
            {!vmBaseConfigCollapsed && (
              <div className="mt-1 text-sm text-slate-500">选择虚拟机规格、数量与磁盘配置。</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setVmBaseConfigCollapsed(current => !current)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:border-slate-300 hover:bg-slate-50"
          >
            {vmBaseConfigCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            {vmBaseConfigCollapsed ? '展开' : '收起'}
          </button>
        </div>
        {vmBaseConfigCollapsed ? (
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            当前规格：{draft.vmSpecProfile || '未选择'}，数量：{draft.vmQuantity || '未填写'}，磁盘：{draft.vmDiskType || '-'}/{draft.vmSystemDisk ? `${draft.vmSystemDisk}GB` : '-'}/{draft.vmDataDisk ? `${draft.vmDataDisk}GB` : '-'}
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <label className="space-y-2">
                <FieldLabel required>规格档位</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {vmProfiles.map(option => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => selectVmProfile(option.key)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        draft.vmSpecProfile === option.key
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {option.key}
                    </button>
                  ))}
                </div>
              </label>
              <label className="space-y-2">
                <FieldLabel required>虚拟机数量</FieldLabel>
                <NumericInput value={draft.vmQuantity} onChange={value => updateDraft('vmQuantity', value)} unit="台" min={1} placeholder="例如：1" />
              </label>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <FieldLabel required>磁盘类型</FieldLabel>
                <Input value={draft.vmDiskType} onChange={event => updateDraft('vmDiskType', event.target.value)} placeholder="由规格档位自动带出，可手动调整" />
              </label>
              <label className="space-y-2">
                <FieldLabel required>系统盘</FieldLabel>
                <NumericInput value={draft.vmSystemDisk} onChange={value => updateDraft('vmSystemDisk', value)} unit="GB" min={1} placeholder="由规格档位自动带出，可手动调整（GB）" />
              </label>
              <label className="space-y-2">
                <FieldLabel required>数据盘</FieldLabel>
                <NumericInput value={draft.vmDataDisk} onChange={value => updateDraft('vmDataDisk', value)} unit="GB" min={1} placeholder="由规格档位自动带出，可手动调整（GB）" />
              </label>
            </div>
            {currentVmProfile && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">配置详情参考（只读）</div>
                  <div className="text-xs text-slate-400">具体磁盘配置可在上方编辑</div>
                </div>
                <div className="mt-2 grid gap-x-4 gap-y-1 md:grid-cols-2">
                  {buildVmProfileDetails(currentVmProfile)
                    .split('\n')
                    .filter(Boolean)
                    .map((line, index) => (
                      <div key={index} className="truncate">{line}</div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {draft.environment !== 'SIT' && (
        <section className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
          <div className="flex flex-wrap items-center gap-2 text-base font-semibold text-slate-900">
            <span>组件能力</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">可多选</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {vmComponentOptions.map(option => {
              const selected = draft.vmComponentSelection.split('、').includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleVmComponent(option)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    selected
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {shouldShowVmComponents(draft.vmResourceMode) && draft.vmComponentSelection.split('、').filter(Boolean).map(component => {
        const config = vmComponentConfigs[component] || {
          deploymentMode: '',
          specProfile: '',
          configLabel: '',
          cpu: '',
          memory: '',
          nodeCount: '',
          diskType: '',
          systemDisk: '',
          dataDisk: '',
          configReference: '',
        };
        const deployments = getVmComponentDeployments(draft.environment, component);
        const profiles = getVmComponentProfiles(draft.environment, component, config.deploymentMode);
        const selectedProfile = profiles.find(item => item.key === config.specProfile) || null;
        const isCollapsed = collapsedVmComponents[component] ?? false;

        return (
          <section key={component} className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-slate-900">{component} 配置</div>
                <div className="mt-1 text-sm text-slate-500">{config.configReference || `先选择 ${component} 的部署方式和规格档位。`}</div>
              </div>
              <button
                type="button"
                onClick={() => toggleVmComponentCollapsed(component)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              >
                {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                {isCollapsed ? '展开' : '收起'}
              </button>
            </div>
            {!isCollapsed && (
              <>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <FieldLabel required>组件部署方式</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {deployments.map(option => (
                        <button
                          key={`${component}-${option.deploymentMode}`}
                          type="button"
                          onClick={() => updateVmComponentConfig(component, { deploymentMode: option.deploymentMode })}
                          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                            config.deploymentMode === option.deploymentMode
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {option.deploymentMode}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label className="space-y-2">
                    <FieldLabel required>规格档位</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {profiles.map(option => (
                        <button
                          key={`${component}-${config.deploymentMode}-${option.key}`}
                          type="button"
                          onClick={() => updateVmComponentConfig(component, { specProfile: option.key })}
                          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                            config.specProfile === option.key
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {option.key}
                        </button>
                      ))}
                    </div>
                  </label>
                </div>
                {selectedProfile && (
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <label className="space-y-2">
                      <FieldLabel required>磁盘类型</FieldLabel>
                      <Input value={config.diskType} onChange={event => updateVmComponentConfig(component, { diskType: event.target.value })} placeholder="由规格档位自动带出，可手动调整" />
                    </label>
                    <label className="space-y-2">
                      <FieldLabel required>系统盘</FieldLabel>
                      <NumericInput value={config.systemDisk} onChange={value => updateVmComponentConfig(component, { systemDisk: value })} unit="GB" min={1} placeholder="由规格档位自动带出，可手动调整（GB）" />
                    </label>
                    <label className="space-y-2">
                      <FieldLabel required>数据盘</FieldLabel>
                      <NumericInput value={config.dataDisk} onChange={value => updateVmComponentConfig(component, { dataDisk: value })} unit="GB" min={1} placeholder="由规格档位自动带出，可手动调整（GB）" />
                    </label>
                  </div>
                )}
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">配置详情参考（只读）</div>
                    <div className="text-xs text-slate-400">具体磁盘配置可在上方编辑</div>
                  </div>
                  {selectedProfile ? (
                    <div className="mt-2 grid gap-x-4 gap-y-1 md:grid-cols-2">
                      <div className="truncate">配置名称：{selectedProfile.configLabel}</div>
                      <div className="truncate">节点数：{selectedProfile.nodeCount}</div>
                      {buildVmProfileDetails(selectedProfile)
                        .split('\n')
                        .filter(Boolean)
                        .map((line, index) => (
                          <div key={index} className="truncate">{line}</div>
                        ))}
                    </div>
                  ) : (
                    <div className="mt-2">选择部署方式和规格后，这里自动带出配置详情。</div>
                  )}
                </div>
              </>
            )}
          </section>
        );
      })}
    </>
  );

  const renderProductApplicationInfo = () => (
    <>
      {product !== 'permission' && (
        <section className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-900 px-2 text-xs font-semibold text-white">2</span>
                申请信息
              </div>
              <div className="mt-1 text-sm text-slate-500">按产品类型补充申请信息。</div>
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {product === 'vm' && (
              <label className="space-y-2">
                <FieldLabel required>系统编号</FieldLabel>
                <Input value={draft.systemCode} onChange={event => updateDraft('systemCode', event.target.value)} placeholder="例如：DLP-UAT-001" />
              </label>
            )}
            {product === 'vm' && (
              <label className="space-y-2">
                <FieldLabel required>模块名称</FieldLabel>
                <Input value={draft.moduleName} onChange={event => updateDraft('moduleName', event.target.value)} placeholder="例如：门户前台" />
              </label>
            )}
            {(product === 'vm' || product === 'obs' || product === 'sfs' || product === 'network') && (
              <label className="space-y-2">
                <FieldLabel required>系统名称</FieldLabel>
                <Input value={draft.systemName} onChange={event => updateDraft('systemName', event.target.value)} placeholder="例如：经销商门户" />
              </label>
            )}
            {(product === 'vm' || product === 'obs' || product === 'sfs') && (
              <label className="space-y-2">
                <FieldLabel required>担当</FieldLabel>
                <Input value={draft.owner} onChange={event => updateDraft('owner', event.target.value)} placeholder="例如：张三" />
              </label>
            )}
            {(product === 'container' || product === 'obs' || product === 'sfs' || product === 'network') && (
              <label className="space-y-2">
                <FieldLabel required>申请环境</FieldLabel>
                <select value={draft.environment} onChange={event => updateDraft('environment', event.target.value)} className={environmentSelectClass}>
                  {vmEnvironmentOptions.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            )}
          </div>
        </section>
      )}

      {product === 'vm' && renderVmApplicationInfo()}

      {product === 'container' && (
        <section className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
          <div className="text-base font-semibold text-slate-900">容器实例配置</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="space-y-2">
              <FieldLabel required>供应商</FieldLabel>
              <Input value={draft.containerSupplier} onChange={event => updateDraft('containerSupplier', event.target.value)} placeholder="例如：华为云 / 阿里云" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>系统代码</FieldLabel>
              <Input value={draft.containerSystemCode} onChange={event => updateDraft('containerSystemCode', event.target.value)} placeholder="例如：DLP" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>资源分区</FieldLabel>
              <Input value={draft.containerResourceZone} onChange={event => updateDraft('containerResourceZone', event.target.value)} placeholder="例如：default / production" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>应用英文名称</FieldLabel>
              <Input value={draft.containerAppName} onChange={event => updateDraft('containerAppName', event.target.value)} placeholder="例如：dealer-portal" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>实例个数</FieldLabel>
              <NumericInput value={draft.containerInstanceCount} onChange={value => updateDraft('containerInstanceCount', value)} unit="个" min={1} placeholder="例如：3" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>CPU（单实例）</FieldLabel>
              <NumericInput value={draft.containerCpuPerInstance} onChange={value => updateDraft('containerCpuPerInstance', value)} unit="C" min={1} placeholder="例如：2" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>内存（单实例）</FieldLabel>
              <NumericInput value={draft.containerMemoryPerInstance} onChange={value => updateDraft('containerMemoryPerInstance', value)} unit="G" min={1} placeholder="例如：4" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>总 CPU</FieldLabel>
              <NumericInput value={draft.containerCpu} onChange={value => updateDraft('containerCpu', value)} unit="C" min={1} placeholder="根据实例个数自动生成" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>总内存</FieldLabel>
              <NumericInput value={draft.containerMemory} onChange={value => updateDraft('containerMemory', value)} unit="G" min={1} placeholder="根据实例个数自动生成" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <FieldLabel>备注</FieldLabel>
              <Textarea value={draft.containerRemark} onChange={event => updateDraft('containerRemark', event.target.value)} placeholder="例如：需要挂载配置中心" />
            </label>
          </div>
        </section>
      )}

      {product === 'obs' && (
        <section className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
          <div className="text-base font-semibold text-slate-900">对象存储配置</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="space-y-2">
              <FieldLabel required>应用供应商名称</FieldLabel>
              <Input value={draft.obsSupplier} onChange={event => updateDraft('obsSupplier', event.target.value)} placeholder="例如：华为云" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>应用所属业务</FieldLabel>
              <select value={draft.obsBusinessDomain} onChange={event => updateDraft('obsBusinessDomain', event.target.value)} className={environmentSelectClass}>
                <option value="">请选择业务域</option>
                {businessDomainOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <FieldLabel required>桶名称</FieldLabel>
              <Input value={draft.obsBucketName} onChange={event => updateDraft('obsBucketName', event.target.value)} placeholder="例如：my-project-backup" />
            </label>
            <label className="space-y-2">
              <FieldLabel>桶内目录名称</FieldLabel>
              <Input value={draft.obsDirectory} onChange={event => updateDraft('obsDirectory', event.target.value)} placeholder="例如：/data/backup" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>容量</FieldLabel>
              <NumericInput value={draft.obsCapacity} onChange={value => updateDraft('obsCapacity', value)} unit="GB" min={1} placeholder="例如：100" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>使用周期</FieldLabel>
              <Input value={draft.obsLifecycle} onChange={event => updateDraft('obsLifecycle', event.target.value)} placeholder="例如：6 个月" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>AK/SK 数量</FieldLabel>
              <NumericInput value={draft.obsAkSkCount} onChange={value => updateDraft('obsAkSkCount', value)} unit="个" min={1} placeholder="例如：2" />
            </label>
            <label className="space-y-2">
              <FieldLabel>域账号</FieldLabel>
              <Input value={draft.obsDomainAccount} onChange={event => updateDraft('obsDomainAccount', event.target.value)} placeholder="例如：zhangsan" />
            </label>
          </div>
        </section>
      )}

      {product === 'sfs' && (
        <section className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
          <div className="text-base font-semibold text-slate-900">文件存储配置</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="space-y-2">
              <FieldLabel required>应用所属业务</FieldLabel>
              <select value={draft.sfsBusinessDomain} onChange={event => updateDraft('sfsBusinessDomain', event.target.value)} className={environmentSelectClass}>
                <option value="">请选择业务域</option>
                {businessDomainOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <FieldLabel required>应用供应商名称</FieldLabel>
              <Input value={draft.sfsSupplier} onChange={event => updateDraft('sfsSupplier', event.target.value)} placeholder="例如：华为云" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>SFS 名称</FieldLabel>
              <Input value={draft.sfsName} onChange={event => updateDraft('sfsName', event.target.value)} placeholder="例如：shared-data" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>容量</FieldLabel>
              <NumericInput value={draft.sfsCapacity} onChange={value => updateDraft('sfsCapacity', value)} unit="GB" min={1} placeholder="例如：100" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>使用周期</FieldLabel>
              <Input value={draft.sfsLifecycle} onChange={event => updateDraft('sfsLifecycle', event.target.value)} placeholder="例如：6 个月" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>协议类型</FieldLabel>
              <Input value={draft.sfsProtocol} onChange={event => updateDraft('sfsProtocol', event.target.value)} placeholder="例如：NFS / CIFS" />
            </label>
            <label className="space-y-2">
              <FieldLabel>域账号</FieldLabel>
              <Input value={draft.sfsDomainAccount} onChange={event => updateDraft('sfsDomainAccount', event.target.value)} placeholder="例如：zhangsan" />
            </label>
          </div>
        </section>
      )}

      {product === 'permission' && (
        <section className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
          <div className="text-base font-semibold text-slate-900">权限申请信息</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <FieldLabel required>申请权限类型</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {permissionTypeOptions.map(option => {
                  const selected = draft.permissionType.split('、').includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => togglePermissionType(option)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        selected
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              {draft.permissionType.split('、').includes('其他') && (
                <Input
                  value={draft.permissionTypeOther}
                  onChange={event => updateDraft('permissionTypeOther', event.target.value)}
                  placeholder="请输入其他权限类型"
                  className="mt-2"
                />
              )}
            </label>
            <label className="space-y-2">
              <FieldLabel required>域账号</FieldLabel>
              <Input value={draft.permissionAccount} onChange={event => updateDraft('permissionAccount', event.target.value)} placeholder="例如：zhangsan" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>姓名</FieldLabel>
              <Input value={draft.permissionName} onChange={event => updateDraft('permissionName', event.target.value)} placeholder="例如：张三" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>手机号</FieldLabel>
              <Input value={draft.permissionPhone} onChange={event => updateDraft('permissionPhone', event.target.value)} placeholder="例如：13800138000" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>邮箱</FieldLabel>
              <Input value={draft.permissionEmail} onChange={event => updateDraft('permissionEmail', event.target.value)} placeholder="例如：zhangsan@company.com" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <FieldLabel required>申请原因</FieldLabel>
              <Textarea value={draft.permissionReason} onChange={event => updateDraft('permissionReason', event.target.value)} placeholder="例如：项目运维需要访问 OBS 桶" />
            </label>
          </div>
        </section>
      )}

      {product === 'network' && (
        <section className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
          <div className="text-base font-semibold text-slate-900">网络策略信息</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="space-y-2">
              <FieldLabel required>源资产编号</FieldLabel>
              <Input value={draft.networkSourceAsset} onChange={event => updateDraft('networkSourceAsset', event.target.value)} placeholder="例如：ASSET-001" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>目标资产（资产名称）</FieldLabel>
              <Input value={draft.networkTargetAsset} onChange={event => updateDraft('networkTargetAsset', event.target.value)} placeholder="例如：数据库服务器" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>源端地址</FieldLabel>
              <Input value={draft.networkSource} onChange={event => updateDraft('networkSource', event.target.value)} placeholder="例如：10.0.0.0/24" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>目标端地址</FieldLabel>
              <Input value={draft.networkTarget} onChange={event => updateDraft('networkTarget', event.target.value)} placeholder="例如：10.1.0.0/24" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>端口类型</FieldLabel>
              <Input value={draft.networkPortType} onChange={event => updateDraft('networkPortType', event.target.value)} placeholder="例如：TCP / UDP" />
            </label>
            <label className="space-y-2">
              <FieldLabel required>端口范围</FieldLabel>
              <Input value={draft.networkPortRange} onChange={event => updateDraft('networkPortRange', event.target.value)} placeholder="例如：80,443,3306" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <FieldLabel>开通原因（补充）</FieldLabel>
              <Textarea value={draft.networkReason} onChange={event => updateDraft('networkReason', event.target.value)} placeholder="例如：应用访问数据库需要开放 3306 端口" />
            </label>
          </div>
        </section>
      )}
    </>
  );

  const renderProductSkeleton = () => (
    <div className="space-y-4">
      {mode === 'assistant' && (
        <div className="rounded-[20px] border border-emerald-200 bg-emerald-50/70 px-4 py-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700">
              当前阶段：{wizardStep < 8 ? '1. 需求说明' : '2. 申请信息'}
            </span>
            <span className="text-slate-500">
              {wizardStep < 8
                ? `步骤 ${wizardStep + 1} / 8 · ${wizardSteps[wizardStep]?.title}`
                : '最终确认 · 申请信息'}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${((wizardStep + 1) / wizardSteps.length) * 100}%` }}
            />
          </div>
        </div>
      )}
      {mode === 'direct' && (
        <section className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-900 px-2 text-xs font-semibold text-white">1</span>
              需求说明
            </div>
            <div className="mt-1 text-sm text-slate-500">按用户需求表逐项填写，默认仅展开“背景”，其他大类可点击展开。</div>
          </div>
          <button
            type="button"
            onClick={() => setRequirementCollapsed(current => !current)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:border-slate-300 hover:bg-slate-50"
          >
            {requirementCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            {requirementCollapsed ? '展开' : '收起'}
          </button>
        </div>
        {!requirementCollapsed && (
          <div className="mt-4 space-y-3">
            <div className="rounded-[18px] border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm text-slate-700">
              <div>说明1：用户背景 和 网络需求-用户访问方式 需要如实填写，不可填写“无”，其他如有需要请项目组侧进行填写，不需要部分请填写“无”； 如有需要网络侧/服务器侧等团队协助请联络窗口。</div>
              <div className="mt-2">说明2：【重要总原则】需说明每个进入的数据量，经过某个服务的运算，需要什么资源，落到数据库需要什么资源，此思考内容需明确。即什么数据规模与什么基础资源的关系需明确清楚，推算逻辑是什么。</div>
            </div>
            {(() => {
              return requirementCategories.map(category => {
              const isCollapsed = !!collapsedRequirementCategories[category.id];
              const filledCount = category.projects.filter(project =>
                (requirementAnswers[getRequirementKey(category.id, project.id)] || '').trim()
              ).length;
              return (
                <div key={category.id} className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleRequirementCategoryCollapsed(category.id)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{category.title}</span>
                      <span className="text-xs text-slate-500">{category.description}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {filledCount > 0 && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          已填 {filledCount}/{category.projects.length}
                        </span>
                      )}
                      {isCollapsed ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronUp className="h-4 w-4 text-slate-500" />}
                    </div>
                  </button>
                  {!isCollapsed && renderRequirementProjects(category)}
                </div>
              );
            });
            })()}
          </div>
        )}
      </section>
      )}

      {mode === 'assistant' && (
        <>
          {wizardStep === 0 && (
            <section className="rounded-[22px] border border-emerald-200 bg-emerald-50/70 px-4 py-4">
              <div className="flex items-start gap-2">
                <WandSparkles className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-semibold text-slate-900">先描述一下场景（可选）</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">用一句话描述申请用途，系统会自动识别环境、规格、资源和网络诉求，并填充到下方对应项中。你也可以直接按步骤手动填写，或描述一部分再补充一部分。</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 md:flex-row">
                <Input
                  value={vmSceneDescription}
                  onChange={event => setVmSceneDescription(event.target.value)}
                  placeholder="例如：为经销商门户 UAT 环境申请 2 台 4C8G 云主机，需要 MySQL 和 Redis，供内部员工 + 经销商访问"
                  className="flex-1 bg-white"
                />
                <Button type="button" variant="outline" onClick={handleVmSceneInference}>
                  <WandSparkles className="mr-1.5 h-4 w-4" />
                  识别并填充
                </Button>
              </div>
            </section>
          )}
          {(() => {
            const stageOneFilled = requirementCategories.reduce((sum, category) => {
              return sum + category.projects.filter(project =>
                (requirementAnswers[getRequirementKey(category.id, project.id)] || '').trim()
              ).length;
            }, 0);
            const stageOneTotal = requirementCategories.reduce((sum, category) => sum + category.projects.length, 0);
            return (
              <section className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
                <button
                  type="button"
                  onClick={() => setStageOneCollapsed(current => !current)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-900 px-2 text-xs font-semibold text-white">
                      1
                    </span>
                    需求说明
                  </div>
                  <div className="flex items-center gap-2">
                    {stageOneFilled > 0 && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        已填 {stageOneFilled}/{stageOneTotal}
                      </span>
                    )}
                    {stageOneCollapsed ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronUp className="h-4 w-4 text-slate-500" />}
                  </div>
                </button>
                {!stageOneCollapsed && (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-[18px] border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm text-slate-700">
                      <div>说明1：用户背景 和 网络需求-用户访问方式 需要如实填写，不可填写“无”，其他如有需要请项目组侧进行填写，不需要部分请填写“无”； 如有需要网络侧/服务器侧等团队协助请联络窗口。</div>
                      <div className="mt-2">说明2：【重要总原则】需说明每个进入的数据量，经过某个服务的运算，需要什么资源，落到数据库需要什么资源，此思考内容需明确。即什么数据规模与什么基础资源的关系需明确清楚，推算逻辑是什么。</div>
                    </div>
                    {requirementCategories.map((category, index) => {
                      if (index > wizardStep) return null;
                      const isCollapsed = !!collapsedRequirementCategories[category.id];
                      const filledCount = category.projects.filter(project =>
                        (requirementAnswers[getRequirementKey(category.id, project.id)] || '').trim()
                      ).length;
                      return (
                        <div key={category.id} className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleRequirementCategoryCollapsed(category.id)}
                            className="flex w-full items-center justify-between gap-3 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">{category.title}</span>
                              <span className="text-xs text-slate-500">{category.description}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {filledCount > 0 && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                  已填 {filledCount}/{category.projects.length}
                                </span>
                              )}
                              {wizardStep === index && wizardStep < 8 && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">当前步骤</span>
                              )}
                              {isCollapsed ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronUp className="h-4 w-4 text-slate-500" />}
                            </div>
                          </button>
                          {!isCollapsed && renderRequirementProjects(category)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })()}
        </>
      )}

      {(mode === 'direct' || wizardStep === 8) && renderProductApplicationInfo()}
      {mode === 'assistant' && (
        <div className="flex items-center justify-between gap-3 rounded-[20px] border border-emerald-200 bg-emerald-50/70 px-4 py-3">
          <button
            type="button"
            disabled={wizardStep === 0}
            onClick={() => setWizardStep(s => Math.max(0, s - 1))}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            上一步
          </button>
          <div className="text-sm text-slate-600">
            步骤 {wizardStep + 1} / {wizardSteps.length}
          </div>
          <button
            type="button"
            disabled={wizardStep === wizardSteps.length - 1}
            onClick={() => setWizardStep(s => Math.min(wizardSteps.length - 1, s + 1))}
            className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {wizardStep === wizardSteps.length - 1 ? '完成' : '下一步'}
          </button>
        </div>
      )}
    </div>
  );

  const renderRightSidebar = () => (
    <div className={`w-full rounded-[22px] border p-4 shadow-sm md:sticky md:top-6 md:w-[400px] md:shrink-0 md:self-start xl:w-[420px] ${modeTheme.contentBorder} ${modeTheme.contentBg}`}>
      <div className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${modeTheme.accentBorder} ${modeTheme.accentSoft}`}>
        <Sparkles className="h-3.5 w-3.5" />
        资源申请工作区
      </div>
      <div className={`rounded-[20px] border bg-white px-4 py-3 shadow-sm ${modeTheme.contentBorder}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-900">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">结构化结果</h2>
          </div>
        </div>
      </div>
      <div className={`mt-4 rounded-2xl border bg-white px-4 py-3 ${modeTheme.accentBorder}`}>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">材料完成度</span>
          <span className="font-semibold text-slate-900">{progress}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className={`h-full rounded-full transition-all ${modeTheme.progress}`} style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="mt-4 max-h-[860px] space-y-3 overflow-y-auto">
        <section className={`rounded-[22px] border bg-white px-4 py-4 shadow-sm ${modeTheme.accentBorder}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">结构化结果</div>
            <div className="text-[11px] font-medium text-slate-400">右侧主结果区</div>
          </div>
          <div className="mt-3 space-y-2">
            {structuredResults.map(item => {
              const hasValue = item.value.trim().length > 0;
              const isHighlighted = highlightedFields.includes(item.field);
              return (
                <div
                  key={item.label}
                  className={`rounded-2xl border px-4 py-3 ${
                    isHighlighted
                      ? `${mode === 'assistant' ? 'border-emerald-300 bg-emerald-50 shadow-[0_0_0_3px_rgba(16,185,129,0.10)]' : 'border-amber-300 bg-amber-50 shadow-[0_0_0_3px_rgba(245,158,11,0.10)]'}`
                      : hasValue
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      {item.label}
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        isHighlighted
                          ? `${mode === 'assistant' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`
                          : hasValue
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isHighlighted ? '刚更新' : hasValue ? '已识别' : '待补充'}
                    </span>
                  </div>
                  <div className={`mt-1 text-sm leading-6 ${hasValue ? 'text-slate-700' : 'text-slate-400'}`}>
                    {hasValue ? item.value : item.placeholder}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section className={`rounded-[22px] border px-4 py-4 shadow-sm ${mode === 'assistant' ? 'border-emerald-100 bg-emerald-50/50' : 'border-amber-100 bg-amber-50/50'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">待补充项</div>
            <div className="text-[11px] font-medium text-slate-400">直接提示缺口</div>
          </div>
          <div className="mt-3 space-y-2">
            {missingItems.length > 0 ? (
              missingItems.map(item => (
                <div key={item} className={`rounded-2xl border bg-white px-3 py-3 text-sm leading-6 ${mode === 'assistant' ? 'border-emerald-100 text-emerald-800' : 'border-amber-100 text-amber-800'}`}>
                  {item} 尚未补充
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-emerald-100 bg-white px-3 py-3 text-sm leading-6 text-emerald-700">
                当前核心材料已经补齐，可以继续做预览导出。
              </div>
            )}
          </div>
        </section>
        <section className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">AI 推荐补全</div>
            <div className="text-[11px] font-medium text-slate-400">辅助判断</div>
          </div>
          <div className="mt-3 space-y-2">
            {suggestions.length > 0 ? (
              suggestions.map(item => (
                <div key={item} className="rounded-2xl bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-600">
                  {item}
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-500">
                先在左侧做几项选择或输入关键字，系统会把场景判断和推荐补全到这里。
              </div>
            )}
          </div>
        </section>
        <section className="rounded-[22px] border border-dashed border-slate-200 bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">评审摘要预览</div>
            <div className="text-[11px] font-medium text-slate-400">下沉辅助区</div>
          </div>
          <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
            {draft.systemName ? (
              <>
                {isVmProduct ? (
                  buildWorkbenchReviewSummaryOverview(draft, product, vmComponentConfigs).split('\n').filter(Boolean).map(line => (
                    <div key={line} className={/^[一二三四五六七八九十]+、/.test(line) ? 'font-semibold text-slate-900' : ''}>{line}</div>
                  ))
                ) : (
                  <>
                    <div>
                      本次申请系统为 <strong>{draft.systemName || '待补充系统名称'}</strong>，模块为 <strong>{draft.moduleName || '待补充模块名称'}</strong>，担当为 <strong>{draft.owner || '待补充担当'}</strong>。
                    </div>
                    <div>当前申请环境为 <strong>{draft.environment}</strong>。</div>
                    {product === 'container' && (
                      <>
                        <div>容器实例：{draft.containerInstanceCount || '待补充'} 个 · CPU {draft.containerCpuPerInstance || '待补充'} C / 实例 · 内存 {draft.containerMemoryPerInstance || '待补充'} G / 实例。</div>
                        <div>总计 CPU {draft.containerCpu || '待补充'} C · 内存 {draft.containerMemory || '待补充'} G。</div>
                      </>
                    )}
                    {product === 'obs' && (
                      <>
                        <div>Bucket：{draft.obsBucketName || '待补充'}，目录：{draft.obsDirectory || '待补充'}。</div>
                        <div>AK/SK 数量：{draft.obsAkSkCount || '待补充'} 个。</div>
                      </>
                    )}
                    {product === 'sfs' && (
                      <>
                        <div>SFS 名称：{draft.sfsName || '待补充'}。</div>
                        <div>容量：{draft.sfsCapacity || '待补充'} GB，使用周期：{draft.sfsLifecycle || '待补充'}。</div>
                      </>
                    )}
                    {product === 'permission' && (
                      <>
                        <div>申请人：{draft.permissionName || '待补充'}（{draft.permissionAccount || '待补充域账号'}），手机：{draft.permissionPhone || '待补充'}，邮箱：{draft.permissionEmail || '待补充'}。</div>
                        <div>申请权限类型：{draft.permissionType || '待补充'}{draft.permissionTypeOther ? `（其他：${draft.permissionTypeOther}）` : ''}，申请原因：{draft.permissionReason || '待补充'}。</div>
                      </>
                    )}
                    {product === 'network' && (
                      <>
                        <div>源资产：{draft.networkSourceAsset || '待补充'} → 目标资产：{draft.networkTargetAsset || '待补充'}。</div>
                        <div>源端：{draft.networkSource || '待补充'} → 目标端：{draft.networkTarget || '待补充'}。</div>
                        <div>端口类型：{draft.networkPortType || '待补充'}，端口范围：{draft.networkPortRange || '待补充'}。</div>
                        {draft.networkReason && <div>开通原因：{draft.networkReason}。</div>}
                      </>
                    )}
                    <div>背景：{draft.userRequirementBackground || '待补充背景说明。'}</div>
                    <div>用户相关：{draft.userRequirementUsers || '待补充用户相关说明。'}</div>
                    <div>运维与安全：{draft.userRequirementOps || '待补充运维与安全要求。'}</div>
                    <div>云服务与资源：{draft.userRequirementCloud || '待补充云服务与资源诉求。'}</div>
                    <div>网络需求：{draft.userRequirementNetwork || '待补充网络需求。'}</div>
                  </>
                )}
              </>
            ) : (
              <div>左侧开始补充信息后，这里会生成更接近线下评审材料的结构化摘要。</div>
            )}
          </div>
        </section>
        <section className="rounded-[22px] border border-dashed border-slate-200 bg-white px-4 py-4">
          <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setDraft(defaultDraft)}>清空表单</Button>
        </section>
      </div>
    </div>
  );

  return (
    <section className="rounded-[28px] border border-[#dbe4f0] bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_42%,#f5f8fc_100%)] p-6 shadow-[0_24px_54px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{currentProduct?.title || '资源申请工作区'}</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode('assistant')}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors ${
                  mode === 'assistant'
                    ? 'border-emerald-400 bg-emerald-100 text-emerald-800 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <ListChecks className="h-4 w-4" />
                引导填写
              </button>
              <button
                type="button"
                onClick={() => setMode('direct')}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors ${
                  mode === 'direct'
                    ? 'border-amber-400 bg-amber-100 text-amber-800 shadow-sm'
                    : 'border-amber-200 bg-amber-50/70 text-amber-700 hover:border-amber-300 hover:bg-amber-100'
                }`}
              >
                <LayoutTemplate className="h-4 w-4" />
                直接填写
              </button>
            </div>
          </div>
          <Link
            to="/common-requests"
            className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            返回常见资源申请
          </Link>
        </div>
        <div className="text-sm text-slate-600">
          {mode === 'assistant'
            ? '当前为引导填写：你已明确资源类型，下面按规格、容量、高可用和评审关注点逐项确认。'
            : '当前为直接填写：边界已明确，可快速录入全部字段。'}
        </div>

        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowQuickStartHint(current => !current)}
            className="group inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:border-amber-300 hover:bg-amber-100"
          >
            <Lightbulb className="h-4 w-4" />
            <span>快速发起提示</span>
            {showQuickStartHint ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showQuickStartHint && (
            <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5 text-sm leading-6 text-amber-800">
              也可以从申请单列表选择历史记录，点击"复制为新申请"快速发起。
            </div>
          )}
        </div>
      </div>

      {saveNotice && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {saveNotice}
        </div>
      )}

      {isCloneMode && sourceRecord && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          当前基于申请单 <span className="font-semibold">{sourceRecord.id}</span> 创建新申请，保存后将生成一条新记录。
        </div>
      )}

      {mode === 'assistant' ? (
        <div className="mt-6 flex flex-col gap-6 md:flex-row">
          <div className={`min-w-0 flex-1 rounded-[22px] border shadow-sm ${modeTheme.contentBorder} ${modeTheme.contentBg}`}>
            <div className={`border-b px-5 py-3 ${modeTheme.contentBorder}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">填写区</div>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">逐项确认</h2>
                  <div className="mt-1 text-xs text-slate-500">你已明确资源类型，请按规格、容量、高可用和评审关注点逐项确认或补充。</div>
                </div>
              </div>
            </div>
            <div className="flex min-h-[calc(100vh-360px)] flex-col px-5 py-4">
              <div className="flex-1 space-y-4">
              {renderProductSkeleton()}
              </div>
            </div>
          </div>

          {renderRightSidebar()}
        </div>
      ) : (
        <div className={`mt-6 rounded-[24px] border p-5 shadow-sm ${modeTheme.shell}`}>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            {renderProductSkeleton()}
            {renderRightSidebar()}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div>
          <div className="text-sm font-semibold text-slate-900">表单操作</div>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <button
              type="button"
              onClick={() => setShowWorkflowHint(current => !current)}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
            >
              <CircleHelp className="h-3.5 w-3.5" />
            </button>
            <span>填写完成后再保存申请单，预览导出将在这里衔接。</span>
          </div>
          {showWorkflowHint && (
            <div className="mt-2 text-xs leading-5 text-slate-400">
              正式申请、审批与交付流程仍保留在“我的工单”。
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" className="gap-2" onClick={handleSaveRequestRecord}><Save className="h-4 w-4" />{activeRecordId ? '更新申请单' : '保存申请单'}</Button>
          <Button type="button" size="sm" variant="outline" className="gap-2" onClick={handleOpenReviewExport}><FileText className="h-4 w-4" />HTML 评审预览</Button>
          <Button type="button" size="sm" variant="outline" className="gap-2" onClick={handleExportCurrentPdf}><Download className="h-4 w-4" />导出 PDF</Button>
          <Button type="button" size="sm" variant="outline" className="gap-2" onClick={handleExportCurrentExcel}><Download className="h-4 w-4" />导出 Excel</Button>
        </div>
      </div>
      <Dialog open={Boolean(exportValidationResult)} onOpenChange={open => { if (!open) setExportValidationResult(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>当前申请材料未完成，暂不可导出正式评审材料</DialogTitle>
            <DialogDescription>
              HTML 评审预览可以继续查看；请先补齐以下阻断项后，再执行 PDF 或 Excel 导出。
            </DialogDescription>
          </DialogHeader>
          {exportValidationResult && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                <div className="text-sm font-semibold text-rose-800">阻断项</div>
                <div className="mt-3 space-y-2">
                  {exportValidationResult.blockingIssues.map(issue => (
                    <div key={`${issue.level}-${issue.key}`} className="rounded-xl bg-white px-3 py-2 text-sm text-rose-700">
                      {issue.reason}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function GuidedWorkbench() {
  return <Workbench initialMode="assistant" />;
}

export function DirectWorkbench() {
  return <Workbench initialMode="direct" />;
}
