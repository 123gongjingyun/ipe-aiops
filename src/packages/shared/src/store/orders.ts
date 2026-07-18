import type {
  Order,
  OrderAttachment,
  OrderAiAnalysisSummary,
  InitiationFormSnapshot,
  InitiationStageDetail,
  ItsmStatus,
  DeliveryAcceptanceSnapshot,
  DeliveryImplementationPlan,
  OrderApprovalStageSnapshot,
  OrderApprovalTriggerSnapshot,
  OrderDeliveryStepSnapshot,
  OrderStatus,
  DeliveryDetail,
  IntegrationStatusMap,
  DeliveredAsset,
  AssetCategory,
  WorkflowTimelineNode,
} from '../types';
import { generateDeliveryDetail } from '../data/mock-delivery';
import { generateOrchestratedPlan } from '../data/mock-delivery';
import { generateInternetAppDetail } from '../data/mock-delivery';
import { getSpec } from './service-specs';
import { getAssetFieldSchema } from '../data/asset-fields';
import { getDeliveryStepSet } from './service-specs';
import { buildInitiationFormSnapshot, buildInitiationStageDetail } from '../lib/initiation-snapshot';

const STORAGE_KEY = 'ipe_orders';
const CHANNEL_NAME = 'ipe_sync';
const CUSTOM_EVENT = 'ipe_orders_updated';
const REMOTE_SYNC_PATH = '/api/dev/orders-sync';
const REMOTE_SYNC_POLL_MS = 2000;
const JUST_CREATED_ORDER_TTL_MS = 60 * 1000;
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待处理',
  reviewing: '评审中',
  processing: '处理中',
  plan_confirming: '待确认方案',
  delivering: '交付中',
  completed: '待验收',
  confirmed: '已验收',
  archived: '已归档',
};
const STATUS_SLA: Partial<Record<OrderStatus, string>> = {
  reviewing: '8h',
  processing: '24h',
  plan_confirming: '4h',
  delivering: '48h',
  completed: '8h',
};
const DEFAULT_ASSET_SCHEMA_VERSION = '1.0.0';

function buildItsmFormSnapshot(order: Order): Record<string, string> {
  const resourceSummary = (order.orchestratedPlan?.resources || [])
    .map(resource => `${resource.name}: ${Object.entries(resource.spec || {}).map(([key, value]) => `${key}=${value}`).join(', ')}`)
    .join(' | ');

  return {
    sourceOrderId: order.id,
    orderName: order.comboName,
    services: (order.services || []).join('、'),
    environment: order.answers?.environment || order.answers?.targetEnv || '',
    applicationName: order.answers?.applicationName || order.answers?.appName || '',
    businessDomain: order.answers?.businessDomain || '',
    resourceSummary,
    reviewComment: order.reviewComment || '',
  };
}

function ensureItsmInfo(order: Order): Order {
  if (order.itsm) return order;
  return {
    ...order,
    itsm: {
      status: order.status === 'processing' ? 'processing' : 'not_created',
      sourceOrderId: order.id,
      formSnapshot: buildItsmFormSnapshot(order),
      syncLogs: [],
    },
  };
}

function buildDefaultImplementationPlan(order: Order): DeliveryImplementationPlan {
  const services = order.services?.length ? order.services : [order.comboName];
  return {
    summary: `${order.comboName}实施方案：基于架构评审与 ITSM / 资源审批结果，按${services.length > 1 ? '组合服务' : '标准服务'}路径完成交付。`,
    steps: services.map((serviceName, index) => ({
      name: `${index + 1}. ${serviceName}`,
      owner: index === 0 ? 'IPE交付中心' : '能力域交付工程师',
      mode: 'hybrid',
      output: `${serviceName}交付结果与配置记录`,
    })),
    prerequisites: [
      '架构评审已通过',
      'ITSM / 资源审批已通过',
      '申请方确认实施窗口和必要配合人',
    ],
    risks: [
      '实施窗口或外部系统权限未确认时，可能影响交付排期',
      '非标配置需能力域二次确认后执行',
    ],
    estimatedSchedule: order.orchestratedPlan?.estimatedTime || '1-3 个工作日',
    deliverables: services.map(serviceName => `${serviceName}交付资产与配置明细`),
  };
}

function buildDefaultDeliveryAcceptance(order: Order): DeliveryAcceptanceSnapshot {
  const status: DeliveryAcceptanceSnapshot['status'] =
    ['plan_confirming', 'delivering', 'completed', 'confirmed', 'archived'].includes(order.status)
      ? 'plan_ready'
      : order.status === 'processing' && order.itsm?.status === 'approved'
        ? 'accepted'
        : 'not_started';

  const acceptedAt =
    status === 'not_started'
      ? undefined
      : order.deliveryAcceptance?.acceptedAt || order.itsm?.lastSyncedAt || order.reviewedAt || order.createdAt;

  return {
    status,
    acceptedBy: status === 'not_started' ? undefined : order.deliveryAcceptance?.acceptedBy || 'IPE交付中心',
    acceptedAt,
    deliveryPath: order.deliveryAcceptance?.deliveryPath || 'standard',
    domains: order.deliveryAcceptance?.domains?.length
      ? order.deliveryAcceptance.domains
      : Array.from(new Set((order.services || []).map(service => {
          if (/安全|WAF|防护|审计/.test(service)) return '安全';
          if (/网络|CDN|DNS|LB|负载/.test(service)) return '网络';
          if (/数据库|MySQL|PostgreSQL|Redis|MQ|Kafka/.test(service)) return '数据库与中间件';
          if (/日志|监控|备份/.test(service)) return '运维';
          if (/容器|PaaS|集群/.test(service)) return 'PaaS';
          return 'IT基础';
        }))),
    nonStandardReason: order.deliveryAcceptance?.nonStandardReason,
    nonStandardDiffItems: order.deliveryAcceptance?.nonStandardDiffItems || [],
    nonStandardRisks: order.deliveryAcceptance?.nonStandardRisks || [],
    collaborationDomains: order.deliveryAcceptance?.collaborationDomains || [],
    implementationPlan:
      status === 'plan_ready'
        ? order.deliveryAcceptance?.implementationPlan || buildDefaultImplementationPlan(order)
        : order.deliveryAcceptance?.implementationPlan,
  };
}

function normalizeDeliveryAcceptance(order: Order): Order {
  if (!order.deliveryAcceptance) {
    return {
      ...order,
      deliveryAcceptance: buildDefaultDeliveryAcceptance(order),
    };
  }

  const defaults = buildDefaultDeliveryAcceptance(order);
  return {
    ...order,
    deliveryAcceptance: {
      ...defaults,
      ...order.deliveryAcceptance,
      domains: order.deliveryAcceptance.domains?.length ? order.deliveryAcceptance.domains : defaults.domains,
      nonStandardDiffItems: order.deliveryAcceptance.nonStandardDiffItems?.length ? order.deliveryAcceptance.nonStandardDiffItems : defaults.nonStandardDiffItems,
      nonStandardRisks: order.deliveryAcceptance.nonStandardRisks?.length ? order.deliveryAcceptance.nonStandardRisks : defaults.nonStandardRisks,
      collaborationDomains: order.deliveryAcceptance.collaborationDomains?.length ? order.deliveryAcceptance.collaborationDomains : defaults.collaborationDomains,
      implementationPlan:
        order.deliveryAcceptance.implementationPlan || defaults.implementationPlan,
    },
  };
}

function buildSeedOrders(): Order[] {
  const createdAt = new Date().toLocaleString('zh-CN');
  const makeTimeline = (status: OrderStatus, time: string): WorkflowTimelineNode[] => {
    const stages: OrderStatus[] = ['pending', 'reviewing', 'processing', 'plan_confirming', 'delivering', 'completed', 'confirmed', 'archived'];
    const currentIndex = stages.indexOf(status);
    return stages
      .slice(0, currentIndex + 1)
      .map((stage, index) => ({
        status: stage,
        label: STATUS_LABELS[stage],
        enteredAt: time,
        completedAt: index < currentIndex ? time : undefined,
        slaTarget: STATUS_SLA[stage],
      }));
  };

  const makeProgress = (services: string[], status: OrderStatus, withDetails = false) => (
    services.map(name => ({
      name,
      status: withDetails ? 'completed' : status,
      deliveryDetail: withDetails ? (generateDeliveryDetail(name) || undefined) : undefined,
    }))
  );

  const makeInitiationData = (orderLike: {
    comboName: string;
    services: string[];
    answers: Record<string, string>;
    extras?: Record<string, boolean>;
    createdAt: string;
    formSchemaVersion?: string;
    attachments?: OrderAttachment[];
    aiAnalysisSummary?: OrderAiAnalysisSummary;
    internetAppDetail?: Order['internetAppDetail'];
  }) => {
    const workflowMode = orderLike.internetAppDetail
      ? 'internet_app'
      : orderLike.services.length > 1
        ? 'combo_general'
        : 'atomic_service';
    const values: Record<string, string | boolean | undefined> = {
      ...orderLike.answers,
      ...(orderLike.extras || {}),
    };
    return {
      initiationForm: buildInitiationFormSnapshot({
        workflowMode,
        submittedAt: orderLike.createdAt,
        values,
        schemaVersion: orderLike.formSchemaVersion,
      }),
      initiationStageDetail: buildInitiationStageDetail({
        workflowMode,
        submittedAt: orderLike.createdAt,
        values,
        attachments: orderLike.attachments,
        aiAnalysisSummary: orderLike.aiAnalysisSummary,
      }),
    };
  };

  const testComboServices = ['容器集群配置(DCE4)', 'Redis部署', 'MQ部署', '日志接入(EFK)'];
  const dataComboServices = ['PostgreSQL部署', '监控(Grafana)', 'DB数据备份恢复'];

  return [
    {
      id: 'ORD-SEED-ECS-PUBLIC',
      comboId: 'cloud-vm-public',
      comboName: '云服务器开通（公有云）',
      services: ['云服务器开通（公有云）'],
      aiConfig: '云服务器开通（公有云）交付方案 · 自动编排',
      orchestratedPlan: {
        summary: '公有云标准主机交付方案',
        estimatedTime: '1-2 工作日',
        resources: [
          { type: 'vm', name: '云服务器开通（公有云）', spec: { cpu: '4 vCPU', memory: '8 GB', os: 'CentOS 7.9' }, purpose: '承载业务应用' },
        ],
        integrations: [
          { type: 'monitor', enabled: true, config: { dashboard: 'Grafana 服务总览' } },
          { type: 'logging', enabled: true, config: { detail: '日志采集已接入' } },
          { type: 'backup', enabled: true, config: { schedule: '每日增量备份' } },
        ],
      },
      answers: {
        applicationName: 'gtmc-portal',
        environment: 'PROD',
        region: '华东1',
        vpc: 'vpc-prod-main',
        cpu: '4',
        memory: '8',
        publicAccess: 'true',
      },
      extras: {},
      serviceProgress: [
        {
          name: '云服务器开通（公有云）',
          status: 'completed',
          deliveryDetail: generateDeliveryDetail('云服务器开通（公有云）') || undefined,
        },
      ],
      status: 'completed',
      createdAt,
      reviewStatus: 'approved',
      reviewedAt: createdAt,
      workflowTimeline: [
        { status: 'pending', label: STATUS_LABELS.pending, enteredAt: createdAt, completedAt: createdAt },
        { status: 'reviewing', label: STATUS_LABELS.reviewing, enteredAt: createdAt, completedAt: createdAt, slaTarget: STATUS_SLA.reviewing },
        { status: 'processing', label: STATUS_LABELS.processing, enteredAt: createdAt, completedAt: createdAt, slaTarget: STATUS_SLA.processing },
        { status: 'delivering', label: STATUS_LABELS.delivering, enteredAt: createdAt, completedAt: createdAt, slaTarget: STATUS_SLA.delivering },
        { status: 'completed', label: STATUS_LABELS.completed, enteredAt: createdAt, slaTarget: STATUS_SLA.completed },
      ],
      sourceSpecId: 'cloud-vm-public',
      formSchemaVersion: '1.0.0',
      outputSchemaVersion: '1.0.0',
    },
    {
      id: 'ORD-SEED-MYSQL',
      comboId: 'db-mysql',
      comboName: 'MySQL部署',
      services: ['MySQL部署'],
      aiConfig: 'MySQL部署交付方案 · 自动编排',
      orchestratedPlan: {
        summary: 'MySQL 标准交付方案',
        estimatedTime: '1-2 工作日',
        resources: [
          { type: 'db', name: 'MySQL部署', spec: { version: '8.0', storage: '500 GB', ha: '主从' }, purpose: '提供核心业务数据库能力' },
        ],
        integrations: [
          { type: 'monitor', enabled: true, config: { dashboard: 'Grafana 数据库总览' } },
          { type: 'backup', enabled: true, config: { schedule: '每日全量备份' } },
          { type: 'security', enabled: true, config: { detail: '审计策略已启用' } },
        ],
      },
      answers: {
        applicationName: 'gtmc-order',
        environment: 'PROD',
        dbVersion: '8.0',
        deployMode: '主从',
        dataDiskSize: '500',
        backupPolicy: 'daily',
      },
      extras: {},
      serviceProgress: [
        {
          name: 'MySQL部署',
          status: 'completed',
          deliveryDetail: generateDeliveryDetail('MySQL部署') || undefined,
        },
      ],
      status: 'completed',
      createdAt,
      reviewStatus: 'approved',
      reviewedAt: createdAt,
      workflowTimeline: [
        { status: 'pending', label: STATUS_LABELS.pending, enteredAt: createdAt, completedAt: createdAt },
        { status: 'reviewing', label: STATUS_LABELS.reviewing, enteredAt: createdAt, completedAt: createdAt, slaTarget: STATUS_SLA.reviewing },
        { status: 'processing', label: STATUS_LABELS.processing, enteredAt: createdAt, completedAt: createdAt, slaTarget: STATUS_SLA.processing },
        { status: 'delivering', label: STATUS_LABELS.delivering, enteredAt: createdAt, completedAt: createdAt, slaTarget: STATUS_SLA.delivering },
        { status: 'completed', label: STATUS_LABELS.completed, enteredAt: createdAt, slaTarget: STATUS_SLA.completed },
      ],
      sourceSpecId: 'db-mysql',
      formSchemaVersion: '1.0.0',
      outputSchemaVersion: '1.0.0',
    },
    (() => {
      const orderCreatedAt = '2026/6/24 09:00:00';
      const answers = {
        applicationName: '订单回归测试环境',
        system: '订单中心',
        environment: 'UAT',
        priority: 'high',
        timeRequirement: 'standard',
        businessGoal: '为订单系统准备联调与验收环境，便于接口联调、回归测试和验收演练。',
      };
      const aiAnalysisSummary: OrderAiAnalysisSummary = {
        mode: 'business_only',
        summary: '1 PaaS 集群 + 1 中间件 + 日志',
        highlights: ['目标环境：UAT', '优先级：high', '时效要求：标准（1周内）'],
        missingItems: [],
        riskHints: ['建议重点核对资源名称、用途说明和预计交付时长是否与本次申请一致。'],
      };
      return {
        id: 'ORD-DEMO-PENDING',
        comboId: 'combo-test',
        comboName: '搭建测试环境',
        services: testComboServices,
        aiConfig: '测试环境组合交付方案 · 自动编排',
        orchestratedPlan: generateOrchestratedPlan('combo-test'),
        answers,
        extras: {},
        aiAnalysisSummary,
        serviceProgress: makeProgress(testComboServices, 'pending'),
        status: 'pending',
        createdAt: orderCreatedAt,
        reviewStatus: 'pending',
        workflowTimeline: makeTimeline('pending', orderCreatedAt),
        sourceSpecId: 'combo-test',
        formSchemaVersion: '1.0.0',
        outputSchemaVersion: '1.0.0',
        ...makeInitiationData({
          comboName: '搭建测试环境',
          services: testComboServices,
          answers,
          createdAt: orderCreatedAt,
          formSchemaVersion: '1.0.0',
          aiAnalysisSummary,
        }),
      } satisfies Order;
    })(),
    (() => {
      const orderCreatedAt = '2026/6/24 09:08:00';
      const answers = {
        applicationName: '支付中台预发布验证',
        system: '支付中台',
        environment: 'UAT',
        priority: 'high',
        timeRequirement: 'standard',
        businessGoal: '为支付中台准备预发布验证环境，需完成基础评审与资源方案校验。',
      };
      const aiAnalysisSummary: OrderAiAnalysisSummary = {
        mode: 'business_only',
        summary: '1 PaaS 集群 + 1 中间件 + 日志',
        highlights: ['目标环境：UAT', '优先级：high'],
        missingItems: ['公网访问路径'],
        riskHints: ['发布路径待补充确认。'],
      };
      return {
        id: 'ORD-DEMO-REVIEWING',
        comboId: 'combo-test',
        comboName: '搭建测试环境',
        services: testComboServices,
        aiConfig: '测试环境组合交付方案 · 自动编排',
        orchestratedPlan: generateOrchestratedPlan('combo-test'),
        answers,
        extras: {},
        aiAnalysisSummary,
        serviceProgress: makeProgress(testComboServices, 'reviewing'),
        status: 'reviewing',
        createdAt: orderCreatedAt,
        reviewStatus: 'pending',
        workflowTimeline: makeTimeline('reviewing', orderCreatedAt),
        sourceSpecId: 'combo-test',
        formSchemaVersion: '1.0.0',
        outputSchemaVersion: '1.0.0',
        ...makeInitiationData({
          comboName: '搭建测试环境',
          services: testComboServices,
          answers,
          createdAt: orderCreatedAt,
          formSchemaVersion: '1.0.0',
          aiAnalysisSummary,
        }),
      } satisfies Order;
    })(),
    (() => {
      const orderCreatedAt = '2026/6/24 09:16:00';
      const answers = {
        appName: '营销投放平台',
        system: '营销平台',
        targetEnv: 'PROD',
        businessDomain: '营销域',
        domain: 'campaign.gtmc.com',
        ports: '443',
        scale: 'medium',
        useDuration: '3-6个月',
        businessCriticality: 'standard',
      };
      const internetAppDetail = generateInternetAppDetail(
        answers.appName,
        answers.system,
        answers.targetEnv,
        'PC Web',
        answers.businessDomain,
        answers.domain,
        answers.ports,
        false,
      );
      const aiAnalysisSummary: OrderAiAnalysisSummary = {
        mode: 'architecture_first',
        summary: '2 VM + 1 DB + 1 网络接入 + 全套集成',
        highlights: ['目标环境：PROD', '公网域名：campaign.gtmc.com'],
        missingItems: [],
        riskHints: ['生产链路已进入 ITSM 审批环节，待外部系统回传结果。'],
      };
      return {
        id: 'ORD-DEMO-PROCESSING',
        comboId: 'combo-internet-app',
        comboName: '互联网应用部署',
        services: ['云基础设施', '容器计算', 'MySQL数据库', 'Redis缓存', '网络发布', 'CDN加速', 'WAF防护'],
        aiConfig: '互联网应用全栈自动化交付',
        orchestratedPlan: generateOrchestratedPlan('combo-internet-app'),
        answers,
        extras: {},
        attachments: [
          {
            id: 'arch-demo-processing',
            name: 'campaign-architecture.png',
            kind: 'architecture',
            fileType: 'image/png',
            sizeLabel: '2.1 MB',
            uploadedAt: orderCreatedAt,
            source: 'user-upload',
            parseStatus: 'parsed',
          },
        ],
        aiAnalysisSummary,
        internetAppDetail,
        serviceProgress: makeProgress(['云基础设施', '容器计算', 'MySQL数据库', 'Redis缓存', '网络发布', 'CDN加速', 'WAF防护'], 'processing'),
        status: 'processing',
        createdAt: orderCreatedAt,
        reviewStatus: 'approved',
        reviewedAt: orderCreatedAt,
        itsm: {
          status: 'processing',
          sourceOrderId: 'ORD-DEMO-PROCESSING',
          ticketNo: 'ITSM-20260624-018',
          ticketUrl: 'https://itsm.demo.local/ticket/ITSM-20260624-018',
          submittedAt: orderCreatedAt,
          lastSyncedAt: orderCreatedAt,
          formSnapshot: {
            sourceOrderId: 'ORD-DEMO-PROCESSING',
            orderName: '互联网应用部署',
            services: '云基础设施、容器计算、MySQL数据库、Redis缓存、网络发布、CDN加速、WAF防护',
            environment: 'PROD',
            applicationName: '营销投放平台',
            businessDomain: '营销域',
            resourceSummary: '2 VM + 1 DB + 1 网络接入',
            reviewComment: '架构评审通过，进入正式审批',
          },
          syncLogs: [],
        },
        workflowTimeline: makeTimeline('processing', orderCreatedAt),
        sourceSpecId: 'combo-internet-app',
        formSchemaVersion: '1.0.0',
        outputSchemaVersion: '1.0.0',
        ...makeInitiationData({
          comboName: '互联网应用部署',
          services: ['云基础设施', '容器计算', 'MySQL数据库', 'Redis缓存', '网络发布', 'CDN加速', 'WAF防护'],
          answers,
          createdAt: orderCreatedAt,
          formSchemaVersion: '1.0.0',
          attachments: [
            {
              id: 'arch-demo-processing',
              name: 'campaign-architecture.png',
              kind: 'architecture',
              fileType: 'image/png',
              sizeLabel: '2.1 MB',
              uploadedAt: orderCreatedAt,
              source: 'user-upload',
              parseStatus: 'parsed',
            },
          ],
          aiAnalysisSummary,
          internetAppDetail,
        }),
      } satisfies Order;
    })(),
    (() => {
      const orderCreatedAt = '2026/6/24 09:24:00';
      const answers = {
        applicationName: '风控规则中心',
        system: '风控平台',
        environment: 'PROD',
        priority: 'urgent',
        timeRequirement: 'high',
        businessGoal: '建设高可用生产环境，支持核心规则引擎发布与容灾切换。',
      };
      const aiAnalysisSummary: OrderAiAnalysisSummary = {
        mode: 'architecture_first',
        summary: '高可用生产环境方案待用户确认',
        highlights: ['目标环境：PROD', '高可用诉求已识别'],
        missingItems: [],
        riskHints: ['当前待申请方确认交付方案与实施窗口。'],
      };
      return {
        id: 'ORD-DEMO-PLAN',
        comboId: 'combo-ha',
        comboName: '高可用生产环境',
        services: ['云基础设施', '容器计算', 'MySQL数据库', 'Redis缓存', '网络发布', 'WAF防护'],
        aiConfig: '高可用生产环境交付方案 · 自动编排',
        orchestratedPlan: generateOrchestratedPlan('combo-ha'),
        answers,
        extras: {},
        attachments: [
          {
            id: 'arch-demo-plan',
            name: 'risk-platform-topology.png',
            kind: 'architecture',
            fileType: 'image/png',
            sizeLabel: '3.0 MB',
            uploadedAt: orderCreatedAt,
            source: 'user-upload',
            parseStatus: 'parsed',
          },
        ],
        aiAnalysisSummary,
        serviceProgress: makeProgress(['云基础设施', '容器计算', 'MySQL数据库', 'Redis缓存', '网络发布', 'WAF防护'], 'plan_confirming'),
        status: 'plan_confirming',
        createdAt: orderCreatedAt,
        reviewStatus: 'approved',
        reviewedAt: orderCreatedAt,
        planFeedback: '请确认切换窗口与双活容灾策略。',
        planFeedbackAt: orderCreatedAt,
        workflowTimeline: makeTimeline('plan_confirming', orderCreatedAt),
        sourceSpecId: 'combo-ha',
        formSchemaVersion: '1.0.0',
        outputSchemaVersion: '1.0.0',
        ...makeInitiationData({
          comboName: '高可用生产环境',
          services: ['云基础设施', '容器计算', 'MySQL数据库', 'Redis缓存', '网络发布', 'WAF防护'],
          answers,
          createdAt: orderCreatedAt,
          formSchemaVersion: '1.0.0',
          attachments: [
            {
              id: 'arch-demo-plan',
              name: 'risk-platform-topology.png',
              kind: 'architecture',
              fileType: 'image/png',
              sizeLabel: '3.0 MB',
              uploadedAt: orderCreatedAt,
              source: 'user-upload',
              parseStatus: 'parsed',
            },
          ],
          aiAnalysisSummary,
        }),
      } satisfies Order;
    })(),
    (() => {
      const orderCreatedAt = '2026/6/24 09:32:00';
      const answers = {
        applicationName: '数据治理平台',
        system: '数据平台',
        environment: 'UAT',
        priority: 'high',
        timeRequirement: 'standard',
        businessGoal: '交付一套用于数据开发与验收的数据平台底座。',
      };
      const aiAnalysisSummary: OrderAiAnalysisSummary = {
        mode: 'business_only',
        summary: '数据平台已交付，等待用户验收',
        highlights: ['目标环境：UAT', '交付资产已生成'],
        missingItems: [],
        riskHints: ['待业务方确认交付结果后可转已验收。'],
      };
      return {
        id: 'ORD-DEMO-COMPLETED',
        comboId: 'combo-data',
        comboName: '数据平台搭建',
        services: dataComboServices,
        aiConfig: '数据平台搭建交付方案 · 自动编排',
        orchestratedPlan: generateOrchestratedPlan('combo-data'),
        answers,
        extras: {},
        aiAnalysisSummary,
        serviceProgress: makeProgress(dataComboServices, 'completed', true),
        status: 'completed',
        createdAt: orderCreatedAt,
        reviewStatus: 'approved',
        reviewedAt: orderCreatedAt,
        workflowTimeline: makeTimeline('completed', orderCreatedAt),
        sourceSpecId: 'combo-data',
        formSchemaVersion: '1.0.0',
        outputSchemaVersion: '1.0.0',
        ...makeInitiationData({
          comboName: '数据平台搭建',
          services: dataComboServices,
          answers,
          createdAt: orderCreatedAt,
          formSchemaVersion: '1.0.0',
          aiAnalysisSummary,
        }),
      } satisfies Order;
    })(),
    (() => {
      const orderCreatedAt = '2026/6/24 09:40:00';
      const answers = {
        applicationName: '统一认证服务',
        system: '账号中心',
        environment: 'PROD',
        priority: 'high',
        timeRequirement: 'standard',
        businessGoal: '统一认证平台资源已交付，现已完成用户侧验收确认。',
      };
      const aiAnalysisSummary: OrderAiAnalysisSummary = {
        mode: 'business_only',
        summary: '统一认证服务已验收，待归档',
        highlights: ['目标环境：PROD', '用户已验收'],
        missingItems: [],
        riskHints: ['待归档后将进入正式交付资产池。'],
      };
      return {
        id: 'ORD-DEMO-CONFIRMED',
        comboId: 'combo-data',
        comboName: '数据平台搭建',
        services: dataComboServices,
        aiConfig: '统一认证环境交付方案 · 自动编排',
        orchestratedPlan: generateOrchestratedPlan('combo-data'),
        answers,
        extras: {},
        aiAnalysisSummary,
        serviceProgress: makeProgress(dataComboServices, 'completed', true),
        status: 'confirmed',
        createdAt: orderCreatedAt,
        reviewStatus: 'approved',
        reviewedAt: orderCreatedAt,
        workflowTimeline: makeTimeline('confirmed', orderCreatedAt),
        sourceSpecId: 'combo-data',
        formSchemaVersion: '1.0.0',
        outputSchemaVersion: '1.0.0',
        ...makeInitiationData({
          comboName: '数据平台搭建',
          services: dataComboServices,
          answers,
          createdAt: orderCreatedAt,
          formSchemaVersion: '1.0.0',
          aiAnalysisSummary,
        }),
      } satisfies Order;
    })(),
    (() => {
      const orderCreatedAt = '2026/6/24 09:48:00';
      const answers = {
        applicationName: '营销活动中台',
        system: '营销平台',
        environment: 'PROD',
        priority: 'high',
        timeRequirement: 'standard',
        businessGoal: '营销活动中台已完成交付与验收，资产已归档入库。',
      };
      const aiAnalysisSummary: OrderAiAnalysisSummary = {
        mode: 'business_only',
        summary: '营销活动中台资产已归档',
        highlights: ['目标环境：PROD', '资产池可直接检索'],
        missingItems: [],
        riskHints: ['当前工单已进入结束态。'],
      };
      return {
        id: 'ORD-DEMO-ARCHIVED',
        comboId: 'combo-test',
        comboName: '搭建测试环境',
        services: testComboServices,
        aiConfig: '营销活动中台交付方案 · 自动编排',
        orchestratedPlan: generateOrchestratedPlan('combo-test'),
        answers,
        extras: {},
        aiAnalysisSummary,
        serviceProgress: makeProgress(testComboServices, 'completed', true),
        status: 'archived',
        createdAt: orderCreatedAt,
        archivedAt: orderCreatedAt,
        reviewStatus: 'approved',
        reviewedAt: orderCreatedAt,
        workflowTimeline: makeTimeline('archived', orderCreatedAt),
        sourceSpecId: 'combo-test',
        formSchemaVersion: '1.0.0',
        outputSchemaVersion: '1.0.0',
        ...makeInitiationData({
          comboName: '搭建测试环境',
          services: testComboServices,
          answers,
          createdAt: orderCreatedAt,
          formSchemaVersion: '1.0.0',
          aiAnalysisSummary,
        }),
      } satisfies Order;
    })(),
  ];
}

// BroadcastChannel for cross-tab sync
let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
} catch {
  // BroadcastChannel not available (e.g., SSR)
}

let remoteSyncInitialized = false;
let remoteSyncTimer: number | null = null;
let remotePullInFlight: Promise<void> | null = null;
let remotePushInFlight: Promise<void> | null = null;
let pendingRemotePushPayload: string | null = null;

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function getRemoteSyncUrl() {
  return REMOTE_SYNC_PATH;
}

function readOrdersFromLocalStorage(): Order[] | null {
  if (!canUseBrowserStorage()) return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as Order[];
  } catch {
    return null;
  }
}

function writeOrdersToLocalStorage(orders: Order[]) {
  if (!canUseBrowserStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function markOrderAsJustCreated(order: Order) {
  if (!canUseBrowserStorage()) return;
  try {
    localStorage.setItem(`ipe_order_just_created:${order.id}`, JSON.stringify({
      order,
      expiresAt: Date.now() + JUST_CREATED_ORDER_TTL_MS,
    }));
  } catch {
    // Ignore cache failures for just-created orders.
  }
}

function readJustCreatedOrder(id: string): Order | undefined {
  if (!canUseBrowserStorage()) return undefined;
  try {
    const raw = localStorage.getItem(`ipe_order_just_created:${id}`);
    if (!raw) return undefined;
    const payload = JSON.parse(raw) as { order?: Order; expiresAt?: number };
    if (!payload.order || typeof payload.expiresAt !== 'number') return undefined;
    if (payload.expiresAt < Date.now()) {
      localStorage.removeItem(`ipe_order_just_created:${id}`);
      return undefined;
    }
    return payload.order;
  } catch {
    return undefined;
  }
}

function clearJustCreatedOrder(id: string) {
  if (!canUseBrowserStorage()) return;
  try {
    localStorage.removeItem(`ipe_order_just_created:${id}`);
  } catch {
    // Ignore cleanup failures.
  }
}

function replaceLocalOrdersIfChanged(nextOrders: Order[]) {
  const currentOrders = readOrdersFromLocalStorage();
  const nextSerialized = JSON.stringify(nextOrders);
  const currentSerialized = currentOrders ? JSON.stringify(currentOrders) : null;
  if (currentSerialized === nextSerialized) return false;
  writeOrdersToLocalStorage(nextOrders);
  return true;
}

function mergeOrdersPreservingLocalExtras(localOrders: Order[] | null, remoteOrders: Order[]) {
  if (!localOrders?.length) return remoteOrders;

  const remoteMap = new Map(remoteOrders.map(order => [order.id, order]));
  const merged = [...remoteOrders];

  for (const localOrder of localOrders) {
    const remoteOrder = remoteMap.get(localOrder.id);
    if (!remoteOrder) {
      merged.unshift(localOrder);
      continue;
    }

    const localRank = ORDER_TIMELINE_SEQUENCE.indexOf(localOrder.status);
    const remoteRank = ORDER_TIMELINE_SEQUENCE.indexOf(remoteOrder.status);
    const localTimelineSize = localOrder.workflowTimeline?.length || 0;
    const remoteTimelineSize = remoteOrder.workflowTimeline?.length || 0;

    if (
      localRank > remoteRank
      || (localRank === remoteRank && localTimelineSize >= remoteTimelineSize)
    ) {
      const targetIndex = merged.findIndex(order => order.id === localOrder.id);
      if (targetIndex >= 0) {
        merged[targetIndex] = localOrder;
      }
    }
  }

  return merged;
}

async function pushOrdersToRemote(orders: Order[]) {
  if (typeof window === 'undefined') return;
  pendingRemotePushPayload = JSON.stringify({
    orders,
    updatedAt: new Date().toISOString(),
  });
  if (remotePushInFlight) return remotePushInFlight;

  remotePushInFlight = (async () => {
    while (pendingRemotePushPayload) {
      const payload = pendingRemotePushPayload;
      pendingRemotePushPayload = null;
      try {
        await fetch(getRemoteSyncUrl(), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
      } catch {
        pendingRemotePushPayload = payload;
        break;
      }
    }
  })().finally(() => {
    remotePushInFlight = null;
  });

  return remotePushInFlight;
}

export async function pullOrdersFromRemote() {
  if (typeof window === 'undefined') return;
  if (remotePullInFlight) return remotePullInFlight;

  remotePullInFlight = (async () => {
    try {
      const response = await fetch(getRemoteSyncUrl(), { cache: 'no-store' });
      if (!response.ok) return;

      const payload = await response.json() as { orders?: Order[] | null };
      if (Array.isArray(payload.orders) && payload.orders.length > 0) {
        const localOrders = readOrdersFromLocalStorage();
        const mergedPayload = mergeOrdersPreservingLocalExtras(localOrders, payload.orders);
        const { orders, changed } = normalizeOrders(mergedPayload);
        const replaced = replaceLocalOrdersIfChanged(orders);
        if (changed && replaced) {
          void pushOrdersToRemote(orders);
        }
        if (localOrders?.some(localOrder => !payload.orders?.some(remoteOrder => remoteOrder.id === localOrder.id))) {
          void pushOrdersToRemote(orders);
        }
        if (replaced) notifySync();
        return;
      }

      const localOrders = readOrdersFromLocalStorage();
      if (localOrders?.length) {
        void pushOrdersToRemote(localOrders);
      }
    } catch {
      // Ignore dev sync failures and keep local mode available.
    }
  })().finally(() => {
    remotePullInFlight = null;
  });

  return remotePullInFlight;
}

function ensureRemoteSync() {
  if (!canUseBrowserStorage() || remoteSyncInitialized) return;
  remoteSyncInitialized = true;
  void pullOrdersFromRemote();
  remoteSyncTimer = window.setInterval(() => {
    void pullOrdersFromRemote();
  }, REMOTE_SYNC_POLL_MS);
  window.addEventListener('focus', () => {
    void pullOrdersFromRemote();
  });
}

function notifySync() {
  try {
    channel?.postMessage({ type: 'orders-updated', timestamp: Date.now() });
  } catch {}
  // Same-tab notification
  window.dispatchEvent(new CustomEvent(CUSTOM_EVENT));
}

function createTimelineNode(status: OrderStatus, enteredAt?: string): WorkflowTimelineNode {
  return {
    status,
    label: STATUS_LABELS[status],
    enteredAt,
    slaTarget: STATUS_SLA[status],
  };
}

const ORDER_TIMELINE_SEQUENCE: OrderStatus[] = [
  'pending',
  'reviewing',
  'processing',
  'plan_confirming',
  'delivering',
  'completed',
  'confirmed',
  'archived',
];

function normalizeWorkflowTimeline(order: Order, timeline: WorkflowTimelineNode[]): WorkflowTimelineNode[] {
  const currentIndex = ORDER_TIMELINE_SEQUENCE.indexOf(order.status);
  if (currentIndex === -1) return timeline;

  const currentNode = timeline.find(node => node.status === order.status);
  const activeEnteredAt =
    currentNode?.enteredAt ||
    order.archivedAt ||
    order.reviewedAt ||
    order.planFeedbackAt ||
    order.createdAt;

  let latestCompletedAt = order.createdAt;

  return ORDER_TIMELINE_SEQUENCE.slice(0, currentIndex + 1).map((status, index) => {
    const existing = timeline.find(node => node.status === status);
    const enteredAt =
      existing?.enteredAt ||
      (index === 0 ? order.createdAt : latestCompletedAt || activeEnteredAt || order.createdAt);

    if (index < currentIndex) {
      const completedAt = existing?.completedAt || activeEnteredAt || enteredAt;
      latestCompletedAt = completedAt || latestCompletedAt;
      return {
        ...createTimelineNode(status, enteredAt),
        completedAt,
      };
    }

    return {
      ...createTimelineNode(status, activeEnteredAt || enteredAt),
      completedAt: undefined,
    };
  });
}

function normalizeApprovalStageStatuses(order: Order): Order {
  if (!order.approvalStages?.length) return order;

  const now = order.reviewedAt || order.createdAt;
  const nextStages = order.approvalStages.map((stage, index) => {
    if (stage.status) return stage;

    if (order.reviewStatus === 'approved') {
      return { ...stage, status: 'approved' as const, updatedAt: order.reviewedAt || now };
    }

    if (order.reviewStatus === 'rejected') {
      return {
        ...stage,
        status: index === 0 ? ('rejected' as const) : ('pending' as const),
        updatedAt: order.reviewedAt || now,
      };
    }

    if (order.status === 'reviewing') {
      return {
        ...stage,
        status: index === 0 ? ('processing' as const) : ('pending' as const),
        updatedAt: now,
      };
    }

    return { ...stage, status: 'pending' as const, updatedAt: now };
  });

  return {
    ...order,
    approvalStages: nextStages,
  };
}

function markApprovalStagesOnSubmit(order: Order) {
  if (!order.approvalStages?.length) return;
  const now = new Date().toLocaleString('zh-CN');
  order.approvalStages = order.approvalStages.map((stage, index) => ({
    ...stage,
    status: index === 0 ? 'processing' : 'pending',
    updatedAt: now,
  }));
}

function markApprovalStagesOnApprove(order: Order) {
  if (!order.approvalStages?.length) return;
  const now = new Date().toLocaleString('zh-CN');
  order.approvalStages = order.approvalStages.map(stage => ({
    ...stage,
    status: 'approved',
    updatedAt: now,
  }));
}

function markApprovalStagesOnReject(order: Order) {
  if (!order.approvalStages?.length) return;
  const now = new Date().toLocaleString('zh-CN');
  order.approvalStages = order.approvalStages.map((stage, index) => ({
    ...stage,
    status: index === 0 ? 'rejected' : 'pending',
    updatedAt: now,
  }));
}

function buildDeliveryStepSnapshots(order: Order): OrderDeliveryStepSnapshot[] | undefined {
  const spec = getSpec(order.sourceSpecId || order.comboId);
  if (spec?.type !== 'atomic' || !spec.deliveryStepSetId) return undefined;
  const stepSet = getDeliveryStepSet(spec.deliveryStepSetId);
  if (!stepSet?.steps?.length) return undefined;

  return stepSet.steps.map((step, index) => ({
    stepCode: step.stepCode,
    stepName: step.stepName,
    order: step.order,
    mode: step.mode,
    outputKeys: step.outputKeys,
    status: index === 0 ? 'processing' : 'pending',
    updatedAt: order.createdAt,
  }));
}

function normalizeDeliverySteps(order: Order): Order {
  const baseSteps = order.deliverySteps?.length ? order.deliverySteps : buildDeliveryStepSnapshots(order);
  if (!baseSteps?.length) return order;

  const shouldPromoteAllCompleted =
    (order.status === 'completed' || order.status === 'confirmed' || order.status === 'archived') &&
    baseSteps.some(step => step.status !== 'completed');

  const normalizedSteps = shouldPromoteAllCompleted
    ? baseSteps.map(step => ({
        ...step,
        status: 'completed' as const,
        updatedAt: step.updatedAt || order.archivedAt || order.reviewedAt || order.createdAt,
      }))
    : baseSteps;

  if (order.deliverySteps?.length) {
    return normalizedSteps === order.deliverySteps
      ? order
      : {
          ...order,
          deliverySteps: normalizedSteps,
        };
  }

  return {
    ...order,
    deliverySteps: normalizedSteps,
  };
}

function ensureInitiationSnapshots(order: Order): Order {
  if (order.initiationForm && order.initiationStageDetail) return order;

  const values: Record<string, string | boolean | undefined> = {
    ...order.answers,
    ...order.extras,
  };

  return {
    ...order,
    initiationForm: order.initiationForm || buildInitiationFormSnapshot({
      workflowMode: order.internetAppDetail ? 'internet_app' : (order.services.length > 1 ? 'combo_general' : 'atomic_service'),
      submittedAt: order.createdAt,
      values,
      schemaVersion: order.formSchemaVersion,
    }),
    initiationStageDetail: order.initiationStageDetail || buildInitiationStageDetail({
      workflowMode: order.internetAppDetail ? 'internet_app' : (order.services.length > 1 ? 'combo_general' : 'atomic_service'),
      submittedAt: order.createdAt,
      values,
      attachments: order.attachments,
      aiAnalysisSummary: order.aiAnalysisSummary,
      reviewFocus: order.planFeedback ? [order.planFeedback] : [],
      schemaVersion: order.formSchemaVersion,
    }),
  };
}

function getCurrentDeliveryStepIndex(order: Order): number {
  if (!order.deliverySteps?.length) return -1;
  return order.deliverySteps.findIndex(step => step.status === 'processing');
}

function getCurrentApprovalStageIndex(order: Order): number {
  if (!order.approvalStages?.length) return -1;
  return order.approvalStages.findIndex(stage => stage.status === 'processing');
}

function ensureWorkflowTimeline(order: Order) {
  const baseTimeline = order.workflowTimeline?.length
    ? order.workflowTimeline
    : [createTimelineNode('pending', order.createdAt)];
  return normalizeWorkflowTimeline(order, baseTimeline);
}

function applyOrderStatusTransition(order: Order, nextStatus: OrderStatus) {
  const now = new Date().toLocaleString('zh-CN');
  const timeline = ensureWorkflowTimeline(order).map(item => ({ ...item }));
  const current = timeline.find(item => item.status === order.status);
  if (current && !current.completedAt && order.status !== nextStatus) {
    current.completedAt = now;
  }

  let nextNode = timeline.find(item => item.status === nextStatus);
  if (!nextNode) {
    nextNode = createTimelineNode(nextStatus, now);
    timeline.push(nextNode);
  } else if (!nextNode.enteredAt) {
    nextNode.enteredAt = now;
  }

  order.status = nextStatus;
  if (nextStatus === 'archived') {
    order.archivedAt = now;
  } else {
    order.archivedAt = undefined;
  }
  order.workflowTimeline = normalizeWorkflowTimeline(order, timeline);
}

export function onOrdersSync(callback: () => void): () => void {
  // Cross-tab
  const channelHandler = (event: MessageEvent) => {
    if (event.data?.type === 'orders-updated') callback();
  };
  channel?.addEventListener('message', channelHandler);
  // Same-tab
  window.addEventListener(CUSTOM_EVENT, callback);
  return () => {
    channel?.removeEventListener('message', channelHandler);
    window.removeEventListener(CUSTOM_EVENT, callback);
  };
}

// ===== CRUD =====

export function getOrders(): Order[] {
  ensureRemoteSync();
  try {
    const parsed = readOrdersFromLocalStorage();
    if (!parsed) {
      const seed = buildSeedOrders();
      writeOrdersToLocalStorage(seed);
      void pushOrdersToRemote(seed);
      return seed;
    }
    if (parsed.length === 0) {
      const seed = buildSeedOrders();
      writeOrdersToLocalStorage(seed);
      void pushOrdersToRemote(seed);
      return seed;
    }
    const { orders, changed } = normalizeOrders(parsed);
    const normalizedWithInitiation = orders.map(ensureInitiationSnapshots);
    if (changed) {
      writeOrdersToLocalStorage(normalizedWithInitiation);
      void pushOrdersToRemote(normalizedWithInitiation);
    }
    return normalizedWithInitiation;
  } catch {
    return [];
  }
}

export function getOrder(id: string): Order | undefined {
  const localOrder = getOrders().find(o => o.id === id);
  if (localOrder) {
    clearJustCreatedOrder(id);
    return localOrder;
  }
  return readJustCreatedOrder(id);
}

export function createOrder(draft: {
  comboId: string;
  comboName: string;
  services: string[];
  aiConfig: string;
  answers: Record<string, string>;
  extras: Record<string, boolean>;
  attachments?: OrderAttachment[];
  aiAnalysisSummary?: OrderAiAnalysisSummary;
  initiationForm?: InitiationFormSnapshot;
  initiationStageDetail?: InitiationStageDetail;
  orchestratedPlan?: import('../types').OrchestratedPlan;
  approvalStages?: OrderApprovalStageSnapshot[];
  approvalTriggers?: OrderApprovalTriggerSnapshot[];
  internetAppDetail?: import('../types').InternetAppDeployDetail;
  sourceSpecId?: string;
  formSchemaVersion?: string;
  outputSchemaVersion?: string;
}): Order {
  const orders = getOrders();
  const order: Order = {
    id: 'ORD-' + Date.now().toString(36).toUpperCase(),
    comboId: draft.comboId,
    comboName: draft.comboName,
    services: draft.services,
    aiConfig: draft.aiConfig,
    orchestratedPlan: draft.orchestratedPlan ?? generateOrchestratedPlan(draft.comboId),
    answers: draft.answers,
    extras: draft.extras,
    attachments: draft.attachments ?? [],
    aiAnalysisSummary: draft.aiAnalysisSummary,
    initiationForm: draft.initiationForm,
    initiationStageDetail: draft.initiationStageDetail,
    serviceProgress: draft.services.map(name => ({ name, status: 'pending' as OrderStatus })),
    status: 'pending',
    createdAt: new Date().toLocaleString('zh-CN'),
    reviewStatus: 'pending',
    workflowTimeline: [
      {
        status: 'pending',
        label: STATUS_LABELS.pending,
        enteredAt: new Date().toLocaleString('zh-CN'),
        slaTarget: STATUS_SLA.pending,
      },
    ],
    approvalStages: draft.approvalStages,
    approvalTriggers: draft.approvalTriggers,
    internetAppDetail: draft.internetAppDetail,
    sourceSpecId: draft.sourceSpecId,
    formSchemaVersion: draft.formSchemaVersion,
    outputSchemaVersion: draft.outputSchemaVersion,
    deliveryAcceptance: {
      status: 'not_started',
      deliveryPath: 'standard',
      domains: [],
    },
  };
  order.deliverySteps = buildDeliveryStepSnapshots(order);
  orders.unshift(order);
  writeOrdersToLocalStorage(orders);
  markOrderAsJustCreated(order);
  void pushOrdersToRemote(orders);
  notifySync();
  return order;
}

export function deleteOrder(id: string): void {
  const orders = getOrders();
  const nextOrders = orders.filter(order => order.id !== id);
  if (nextOrders.length === orders.length) {
    throw new Error(`Order ${id} not found`);
  }
  writeOrdersToLocalStorage(nextOrders);
  void pushOrdersToRemote(nextOrders);
  notifySync();
}

export function updateOrderStatus(id: string, status: OrderStatus): Order {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === id);
  if (index === -1) throw new Error(`Order ${id} not found`);
  applyOrderStatusTransition(orders[index], status);
  writeOrdersToLocalStorage(orders);
  void pushOrdersToRemote(orders);
  notifySync();
  return orders[index];
}

export function submitPlanForConfirmation(id: string): Order {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === id);
  if (index === -1) throw new Error(`Order ${id} not found`);
  if (orders[index].status !== 'processing') {
    throw new Error(`Only processing orders can be submitted for plan confirmation`);
  }
  const acceptance = normalizeDeliveryAcceptance(orders[index]).deliveryAcceptance;
  if (!acceptance || acceptance.status !== 'plan_ready' || !acceptance.implementationPlan) {
    throw new Error('Delivery implementation plan must be ready before plan confirmation');
  }
  orders[index].deliveryAcceptance = acceptance;
  applyOrderStatusTransition(orders[index], 'plan_confirming');
  writeOrdersToLocalStorage(orders);
  void pushOrdersToRemote(orders);
  notifySync();
  return orders[index];
}

export function submitOrderForReview(id: string): Order {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === id);
  if (index === -1) throw new Error(`Order ${id} not found`);
  if (orders[index].status !== 'pending') {
    throw new Error('Only pending orders can be submitted for review');
  }
  applyOrderStatusTransition(orders[index], 'reviewing');
  orders[index].reviewStatus = 'pending';
  orders[index].reviewComment = undefined;
  orders[index].reviewedAt = undefined;
  orders[index].itsm = {
    status: 'not_created',
    sourceOrderId: orders[index].id,
    formSnapshot: buildItsmFormSnapshot(orders[index]),
  };
  markApprovalStagesOnSubmit(orders[index]);
  writeOrdersToLocalStorage(orders);
  void pushOrdersToRemote(orders);
  notifySync();
  return orders[index];
}

export function approveReview(id: string, comment?: string): Order {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === id);
  if (index === -1) throw new Error(`Order ${id} not found`);
  if (orders[index].status !== 'reviewing') {
    throw new Error('Only reviewing orders can be approved');
  }
  applyOrderStatusTransition(orders[index], 'processing');
  orders[index].reviewStatus = 'approved';
  orders[index].reviewComment = comment?.trim() || undefined;
  orders[index].reviewedAt = new Date().toLocaleString('zh-CN');
  orders[index].itsm = {
    ...(orders[index].itsm || { sourceOrderId: orders[index].id }),
    status: 'not_created',
    sourceOrderId: orders[index].id,
      formSnapshot: buildItsmFormSnapshot(orders[index]),
  };
  markApprovalStagesOnApprove(orders[index]);
  writeOrdersToLocalStorage(orders);
  void pushOrdersToRemote(orders);
  notifySync();
  return orders[index];
}

export function rejectReview(id: string, comment: string): Order {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === id);
  if (index === -1) throw new Error(`Order ${id} not found`);
  if (orders[index].status !== 'reviewing') {
    throw new Error('Only reviewing orders can be rejected');
  }
  const trimmed = comment.trim();
  if (!trimmed) {
    throw new Error('Review comment is required');
  }
  applyOrderStatusTransition(orders[index], 'pending');
  orders[index].reviewStatus = 'rejected';
  orders[index].reviewComment = trimmed;
  orders[index].reviewedAt = new Date().toLocaleString('zh-CN');
  markApprovalStagesOnReject(orders[index]);
  writeOrdersToLocalStorage(orders);
  void pushOrdersToRemote(orders);
  notifySync();
  return orders[index];
}

export function approveCurrentApprovalStage(id: string, comment?: string): Order {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === id);
  if (index === -1) throw new Error(`Order ${id} not found`);
  if (orders[index].status !== 'reviewing') {
    throw new Error('Only reviewing orders can advance approval stages');
  }
  if (!orders[index].approvalStages?.length) {
    return approveReview(id, comment);
  }

  const currentIndex = getCurrentApprovalStageIndex(orders[index]);
  if (currentIndex === -1) {
    throw new Error('No active approval stage found');
  }

  const now = new Date().toLocaleString('zh-CN');
  orders[index].approvalStages = orders[index].approvalStages!.map((stage, stageIndex) => {
    if (stageIndex === currentIndex) {
      return { ...stage, status: 'approved', updatedAt: now };
    }
    if (stageIndex === currentIndex + 1 && stage.status === 'pending') {
      return { ...stage, status: 'processing', updatedAt: now };
    }
    return stage;
  });

  const allApproved = orders[index].approvalStages!.every(stage => stage.status === 'approved');
  if (allApproved) {
    applyOrderStatusTransition(orders[index], 'processing');
    orders[index].reviewStatus = 'approved';
    orders[index].reviewComment = comment?.trim() || undefined;
    orders[index].reviewedAt = now;
    orders[index].itsm = {
      ...(orders[index].itsm || { sourceOrderId: orders[index].id }),
      status: 'not_created',
      sourceOrderId: orders[index].id,
      formSnapshot: buildItsmFormSnapshot(orders[index]),
    };
  } else {
    orders[index].reviewStatus = 'pending';
    orders[index].reviewComment = comment?.trim() || orders[index].reviewComment;
  }

  writeOrdersToLocalStorage(orders);
  void pushOrdersToRemote(orders);
  notifySync();
  return orders[index];
}

export function rejectCurrentApprovalStage(id: string, comment: string): Order {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === id);
  if (index === -1) throw new Error(`Order ${id} not found`);
  if (orders[index].status !== 'reviewing') {
    throw new Error('Only reviewing orders can reject approval stages');
  }
  const trimmed = comment.trim();
  if (!trimmed) {
    throw new Error('Review comment is required');
  }
  if (!orders[index].approvalStages?.length) {
    return rejectReview(id, trimmed);
  }

  const currentIndex = getCurrentApprovalStageIndex(orders[index]);
  if (currentIndex === -1) {
    throw new Error('No active approval stage found');
  }

  const now = new Date().toLocaleString('zh-CN');
  orders[index].approvalStages = orders[index].approvalStages!.map((stage, stageIndex) => ({
    ...stage,
    status: stageIndex === currentIndex ? 'rejected' : stageIndex < currentIndex ? 'approved' : 'pending',
    updatedAt: now,
  }));

  applyOrderStatusTransition(orders[index], 'pending');
  orders[index].reviewStatus = 'rejected';
  orders[index].reviewComment = trimmed;
  orders[index].reviewedAt = now;

  writeOrdersToLocalStorage(orders);
  void pushOrdersToRemote(orders);
  notifySync();
  return orders[index];
}

export function confirmPlan(id: string): Order {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === id);
  if (index === -1) throw new Error(`Order ${id} not found`);
  if (orders[index].status !== 'plan_confirming') {
    throw new Error(`Only plan confirming orders can be approved`);
  }
  applyOrderStatusTransition(orders[index], 'delivering');
  orders[index].planFeedback = undefined;
  orders[index].planFeedbackAt = undefined;
  writeOrdersToLocalStorage(orders);
  void pushOrdersToRemote(orders);
  notifySync();
  return orders[index];
}

export function updateItsmTicketInfo(
  id: string,
  payload: {
    ticketNo?: string;
    ticketUrl?: string;
    status?: ItsmStatus;
    resultComment?: string;
    actor?: string;
  },
): Order {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === id);
  if (index === -1) throw new Error(`Order ${id} not found`);

  const now = new Date().toLocaleString('zh-CN');
  const current = ensureItsmInfo(orders[index]).itsm!;
  const nextStatus = payload.status ?? current.status;
  const nextTicketNo = payload.ticketNo ?? current.ticketNo;
  const nextTicketUrl = payload.ticketUrl ?? current.ticketUrl;
  const nextComment = payload.resultComment ?? current.resultComment;
  const actor = payload.actor?.trim() || '运营中心';
  const action =
    payload.status && payload.status !== current.status
      ? (current.status === 'not_created' && payload.status === 'submitted' ? 'submit' : 'status_change')
      : payload.ticketNo || payload.ticketUrl
        ? 'ticket_update'
        : 'comment_update';

  orders[index] = {
    ...orders[index],
    itsm: {
      ...current,
      ticketNo: nextTicketNo,
      ticketUrl: nextTicketUrl,
      status: nextStatus,
      resultComment: nextComment,
      sourceOrderId: orders[index].id,
      formSnapshot: current.formSnapshot || buildItsmFormSnapshot(orders[index]),
      syncLogs: [
        ...(current.syncLogs || []),
        {
          id: `${orders[index].id}-itsm-${Date.now()}`,
          action,
          actor,
          fromStatus: current.status,
          status: nextStatus,
          ticketNo: nextTicketNo,
          ticketUrl: nextTicketUrl,
          comment: nextComment,
          createdAt: now,
        },
      ],
      submittedAt:
        nextStatus === 'submitted' || nextStatus === 'processing' || nextStatus === 'approved' || nextStatus === 'rejected'
          ? current.submittedAt || now
          : current.submittedAt,
      lastSyncedAt: now,
    },
  };

  if (nextStatus === 'approved' && orders[index].status === 'processing') {
    const currentAcceptance = normalizeDeliveryAcceptance(orders[index]).deliveryAcceptance;
    orders[index].deliveryAcceptance = {
      ...currentAcceptance,
      status: currentAcceptance?.status === 'plan_ready' ? 'plan_ready' : 'accepted',
      acceptedBy: currentAcceptance?.acceptedBy || actor,
      acceptedAt: currentAcceptance?.acceptedAt || now,
    };
  }

  if (nextStatus === 'rejected' && orders[index].status === 'processing') {
    applyOrderStatusTransition(orders[index], 'pending');
  }

  writeOrdersToLocalStorage(orders);
  void pushOrdersToRemote(orders);
  notifySync();
  return orders[index];
}

export function updateDeliveryAcceptance(
  id: string,
  payload: {
    status?: DeliveryAcceptanceSnapshot['status'];
    acceptedBy?: string;
    deliveryPath?: DeliveryAcceptanceSnapshot['deliveryPath'];
    domains?: string[];
    nonStandardReason?: string;
    nonStandardDiffItems?: string[];
    nonStandardRisks?: string[];
    collaborationDomains?: string[];
    implementationPlan?: DeliveryImplementationPlan;
  },
): Order {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === id);
  if (index === -1) throw new Error(`Order ${id} not found`);
  if (orders[index].status !== 'processing' && orders[index].status !== 'plan_confirming') {
    throw new Error('Delivery acceptance can only be updated before delivery execution');
  }

  const now = new Date().toLocaleString('zh-CN');
  const current = normalizeDeliveryAcceptance(orders[index]).deliveryAcceptance!;
  const nextStatus =
    payload.status ||
    (payload.implementationPlan ? 'plan_ready' : current.status === 'not_started' ? 'accepted' : current.status);

  orders[index].deliveryAcceptance = {
    ...current,
    status: nextStatus,
    acceptedBy: payload.acceptedBy?.trim() || current.acceptedBy || 'IPE交付中心',
    acceptedAt: current.acceptedAt || now,
    deliveryPath: payload.deliveryPath || current.deliveryPath || 'standard',
    domains: payload.domains?.filter(Boolean).length ? payload.domains.filter(Boolean) : current.domains,
    nonStandardReason: payload.nonStandardReason?.trim() || current.nonStandardReason,
    nonStandardDiffItems: payload.nonStandardDiffItems?.filter(Boolean).length ? payload.nonStandardDiffItems.filter(Boolean) : current.nonStandardDiffItems,
    nonStandardRisks: payload.nonStandardRisks?.filter(Boolean).length ? payload.nonStandardRisks.filter(Boolean) : current.nonStandardRisks,
    collaborationDomains: payload.collaborationDomains?.filter(Boolean).length ? payload.collaborationDomains.filter(Boolean) : current.collaborationDomains,
    implementationPlan: payload.implementationPlan || current.implementationPlan,
  };

  writeOrdersToLocalStorage(orders);
  void pushOrdersToRemote(orders);
  notifySync();
  return orders[index];
}

export function rejectPlan(id: string, feedback: string): Order {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === id);
  if (index === -1) throw new Error(`Order ${id} not found`);
  if (orders[index].status !== 'plan_confirming') {
    throw new Error(`Only plan confirming orders can be rejected`);
  }
  const trimmed = feedback.trim();
  if (!trimmed) {
    throw new Error('Plan feedback is required');
  }
  applyOrderStatusTransition(orders[index], 'processing');
  orders[index].deliveryAcceptance = {
    ...normalizeDeliveryAcceptance(orders[index]).deliveryAcceptance,
    status: 'accepted',
  };
  orders[index].planFeedback = trimmed;
  orders[index].planFeedbackAt = new Date().toLocaleString('zh-CN');
  writeOrdersToLocalStorage(orders);
  void pushOrdersToRemote(orders);
  notifySync();
  return orders[index];
}

export function archiveOrder(id: string): Order {
  const order = getOrder(id);
  if (!order) throw new Error(`Order ${id} not found`);
  if (order.status !== 'confirmed') {
    throw new Error(`Only confirmed orders can be archived`);
  }
  return updateOrderStatus(id, 'archived');
}

export function getArchivedOrders(): Order[] {
  return getOrders().filter(o => o.status === 'archived');
}

const CATEGORY_MAP: Record<string, AssetCategory> = {
  '数据库': 'database', 'DB': 'database', 'MySQL': 'database', 'PostgreSQL': 'database', 'Redis': 'database',
  'Oracle': 'database', 'SQL Server': 'database', 'MongoDB': 'database',
  '虚拟化': 'vm', 'VM': 'vm', 'ECS': 'vm', '服务器': 'vm', '主机': 'vm', '计算': 'vm',
  '网络': 'network', 'LB': 'network', '负载': 'network', 'F5': 'network', '均衡': 'network',
  'CDN': 'network', 'DNS': 'network',
  'PaaS': 'paas', '容器': 'paas', 'K8S': 'paas', 'Kubernetes': 'paas', '集群': 'paas', 'Ingress': 'paas',
  '中间件': 'middleware', '队列': 'middleware', 'RabbitMQ': 'middleware', 'Kafka': 'middleware', 'RocketMQ': 'middleware',
  '监控': 'monitor', 'Grafana': 'monitor', 'Prometheus': 'monitor', 'Zabbix': 'monitor', '可观测': 'monitor',
  '安全': 'security', 'WAF': 'security', '扫描': 'security', '防火墙': 'security', 'SSL': 'security',
  'IDS': 'security', 'IPS': 'security',
  '备份': 'backup', '快照': 'backup', '归档': 'backup',
  '日志': 'logging', 'ELK': 'logging', 'Filebeat': 'logging', 'Logstash': 'logging',
};

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  paas: 'PaaS',
  database: '数据库',
  middleware: '中间件',
  vm: '计算资源',
  network: '网络',
  monitor: '监控',
  security: '安全',
  backup: '备份',
  logging: '日志',
};

function inferCategory(serviceName: string): AssetCategory {
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (serviceName.includes(keyword)) return cat;
  }
  return 'vm';
}

function inferCategoryFromDetailType(type: DeliveryDetail['type']): AssetCategory {
  switch (type) {
    case 'db':
      return 'database';
    case 'vm':
      return 'vm';
    case 'network':
      return 'network';
    case 'paas':
      return 'paas';
    case 'middleware':
      return 'middleware';
    case 'monitor':
      return 'monitor';
    case 'security':
      return 'security';
    case 'backup':
      return 'backup';
    case 'logging':
      return 'logging';
    default:
      return 'vm';
  }
}

function buildInternetAppServiceDetail(order: Order, serviceName: string): DeliveryDetail | undefined {
  const detail = order.internetAppDetail;
  if (!detail) return undefined;

  const envSuffix = String(detail.targetEnv || 'prod').toLowerCase();
  const appName = String(detail.appName || '').trim();
  const systemName = String(detail.system || '').trim();
  const portsText = String(detail.ports || '');
  const appSlug = appName.replace(/\s+/g, '-').toLowerCase() || 'app';
  const systemSlug = systemName.replace(/\s+/g, '-').toLowerCase() || 'system';
  const ports = portsText.split(',').map(item => item.trim()).filter(Boolean);
  const primaryPort = Number(ports[0] || '80');
  const defaultIntegrations: IntegrationStatusMap = {
    pam: { status: 'active' },
    monitor: { status: 'active' },
    logging: { status: 'active' },
    backup: { status: 'active' },
    security: { status: 'active' },
  };

  switch (serviceName) {
    case '云基础设施':
      return {
        type: 'vm',
        asset: {
          assetId: `VM-${envSuffix.toUpperCase()}-${appSlug}`,
          location: detail.targetEnv === 'PROD' ? '上海-主集群' : '上海-测试集群',
          rackUnit: 'RU-12',
        },
        network: {
          hostname: `${systemSlug}-${appSlug}-gateway`,
          ip: detail.targetEnv === 'PROD' ? '10.20.10.12' : '10.30.10.12',
          subnet: detail.cloudInfra.subnet,
          gateway: detail.targetEnv === 'PROD' ? '10.20.10.1' : '10.30.10.1',
          vlan: detail.targetEnv === 'PROD' ? 'VLAN-120' : 'VLAN-220',
        },
        spec: {
          cpu: `${detail.backendContainer.cpu}核`,
          memory: `${detail.backendContainer.memory}GB`,
          systemDisk: '100GB SSD',
          dataDisk: detail.targetEnv === 'PROD' ? '300GB SSD' : '150GB SSD',
          os: 'Alibaba Cloud Linux 3',
        },
        integrations: defaultIntegrations,
      };
    case '容器计算':
      return {
        type: 'paas',
        cluster: {
          name: `${detail.targetEnv === 'PROD' ? 'k8s-prod' : 'k8s-nonprod'}-${systemSlug}`,
          apiServer: `https://${systemSlug}.${envSuffix}.cluster.local`,
          version: '1.30',
        },
        namespace: {
          name: `${appSlug}-${envSuffix}`,
          nodeCount: detail.backendContainer.instances + (detail.frontendContainer?.instances || 0),
          resourceQuota: `${detail.backendContainer.cpu * detail.backendContainer.instances}C/${detail.backendContainer.memory * detail.backendContainer.instances}G`,
        },
        integrations: defaultIntegrations,
      };
    case 'MySQL数据库':
      return {
        type: 'db',
        asset: {
          assetId: `DB-MYSQL-${envSuffix.toUpperCase()}-${appSlug}`,
          instance: `${appSlug}-mysql-${envSuffix}`,
        },
        connection: {
          host: `${appSlug}-mysql.${envSuffix}.db.local`,
          port: 3306,
          schema: `${appSlug.replace(/-/g, '_')}_core`,
          charset: 'utf8mb4',
        },
        ha: {
          mode: detail.mysql.ha,
          primary: `${appSlug}-mysql-primary`,
          secondary: detail.mysql.ha.includes('主从') ? `${appSlug}-mysql-secondary` : '',
        },
        accounts: [
          { name: `${appSlug}_app`, privilege: 'readwrite' },
        ],
        integrations: defaultIntegrations,
      };
    case 'Redis缓存':
      return {
        type: 'db',
        asset: {
          assetId: `DB-REDIS-${envSuffix.toUpperCase()}-${appSlug}`,
          instance: `${appSlug}-redis-${envSuffix}`,
        },
        connection: {
          host: `${appSlug}-redis.${envSuffix}.cache.local`,
          port: 6379,
          schema: 'db0',
          charset: 'binary',
        },
        ha: {
          mode: detail.redis.ha,
          primary: `${appSlug}-redis-primary`,
          secondary: detail.redis.ha.includes('哨兵') ? `${appSlug}-redis-replica` : '',
        },
        accounts: [
          { name: `${appSlug}_cache`, privilege: 'readwrite' },
        ],
        integrations: defaultIntegrations,
      };
    case '网络发布':
    case 'CDN加速':
      return {
        type: 'network',
        connection: {
          vip: detail.targetEnv === 'PROD' ? '172.16.20.10' : '172.16.30.10',
          domain: detail.domain,
          protocol: ports.includes('443') ? 'HTTPS' : 'HTTP',
          port: primaryPort,
        },
        firewall: {
          rules: [
            { source: '0.0.0.0/0', target: detail.domain, action: 'allow' },
          ],
        },
        integrations: defaultIntegrations,
      };
    case 'WAF防护':
      return {
        type: 'security',
        waf: {
          status: '已开启',
          rules: detail.targetEnv === 'PROD' ? 24 : 12,
        },
        scan: {
          reportUrl: `https://security.example.com/reports/${appSlug}-${envSuffix}`,
          riskLevel: detail.targetEnv === 'PROD' ? '中' : '低',
          lastScan: new Date().toLocaleDateString('zh-CN'),
        },
        ssl: {
          domain: detail.domain,
          issuer: 'GlobalSign',
          expiry: '2027-06-30',
        },
      };
    default:
      return undefined;
  }
}

function syncInternetAppServiceProgress(order: Order) {
  if (!order.internetAppDetail) return;
  order.serviceProgress = order.serviceProgress.map(service => ({
    ...service,
    status: 'completed',
    deliveryDetail: service.deliveryDetail || buildInternetAppServiceDetail(order, service.name),
  }));
}

function looksLikeInternetAppOrder(order: Order) {
  const answers = order.answers || {};
  const hasAnswerFingerprint =
    Boolean(answers.appName) &&
    Boolean(answers.system) &&
    Boolean(answers.domain) &&
    Boolean(answers.ports);

  const serviceSet = new Set(order.services || []);
  const hasServiceFingerprint =
    serviceSet.has('MySQL数据库') &&
    serviceSet.has('Redis缓存') &&
    serviceSet.has('网络发布');

  return order.comboId === 'combo-internet-app' || hasAnswerFingerprint || hasServiceFingerprint;
}

function resolveServiceName(name: string): string {
  return getSpec(name)?.name || name;
}

function normalizeOrders(rawOrders: Order[]): { orders: Order[]; changed: boolean } {
  let changed = false;
  const orders = rawOrders.map(order => {
    let normalizedOrder = order;

    const normalizedServices = normalizedOrder.services.map(serviceName => resolveServiceName(serviceName));
    const servicesChanged = normalizedServices.some((serviceName, index) => serviceName !== normalizedOrder.services[index]);
    if (servicesChanged) {
      normalizedOrder = {
        ...normalizedOrder,
        services: normalizedServices,
      };
      changed = true;
    }

    const normalizedServiceProgress = normalizedOrder.serviceProgress.map(service => {
      const resolvedName = resolveServiceName(service.name);
      if (resolvedName === service.name) return service;
      changed = true;
      return {
        ...service,
        name: resolvedName,
      };
    });

    if (normalizedServiceProgress.some((service, index) => service !== normalizedOrder.serviceProgress[index])) {
      normalizedOrder = {
        ...normalizedOrder,
        serviceProgress: normalizedServiceProgress,
      };
      changed = true;
    }

    if (!normalizedOrder.attachments) {
      normalizedOrder = {
        ...normalizedOrder,
        attachments: [],
      };
      changed = true;
    }

    if (
      normalizedOrder.reviewStatus === undefined ||
      (normalizedOrder.status === 'reviewing' && normalizedOrder.reviewStatus !== 'pending')
    ) {
      normalizedOrder = {
        ...normalizedOrder,
        reviewStatus:
          normalizedOrder.status === 'reviewing'
            ? 'pending'
            : normalizedOrder.reviewStatus ?? 'pending',
      };
      changed = true;
    }

    const itsmBefore = normalizedOrder.itsm;
    normalizedOrder = ensureItsmInfo(normalizedOrder);
    if (itsmBefore !== normalizedOrder.itsm) {
      changed = true;
    }

    const approvalStagesBefore = normalizedOrder.approvalStages;
    normalizedOrder = normalizeApprovalStageStatuses(normalizedOrder);
    if (approvalStagesBefore !== normalizedOrder.approvalStages) {
      changed = true;
    }

    const deliveryStepsBefore = normalizedOrder.deliverySteps;
    normalizedOrder = normalizeDeliverySteps(normalizedOrder);
    if (deliveryStepsBefore !== normalizedOrder.deliverySteps) {
      changed = true;
    }

    const deliveryAcceptanceBefore = normalizedOrder.deliveryAcceptance;
    normalizedOrder = normalizeDeliveryAcceptance(normalizedOrder);
    if (deliveryAcceptanceBefore !== normalizedOrder.deliveryAcceptance) {
      changed = true;
    }

    const timelineBefore = normalizedOrder.workflowTimeline;
    const normalizedTimeline = ensureWorkflowTimeline(normalizedOrder);
    if (
      !timelineBefore?.length ||
      JSON.stringify(timelineBefore) !== JSON.stringify(normalizedTimeline)
    ) {
      normalizedOrder = {
        ...normalizedOrder,
        workflowTimeline: normalizedTimeline,
      };
      changed = true;
    }

    if (!normalizedOrder.internetAppDetail && looksLikeInternetAppOrder(normalizedOrder)) {
      const appName = normalizedOrder.answers?.appName;
      const system = normalizedOrder.answers?.system;
      const targetEnv = normalizedOrder.answers?.targetEnv || 'PROD';
      const appType = normalizedOrder.answers?.appType || 'PC Web';
      const businessDomain = normalizedOrder.answers?.businessDomain || normalizedOrder.comboName || '默认业务域';
      const domain = normalizedOrder.answers?.domain;
      const ports = normalizedOrder.answers?.ports;

      if (appName && system && domain && ports) {
        normalizedOrder = {
          ...normalizedOrder,
          internetAppDetail: generateInternetAppDetail(
            appName,
            system,
            targetEnv,
            appType,
            businessDomain,
            domain,
            ports,
            Boolean(normalizedOrder.extras?.cdnEnabled),
          ),
        };
        changed = true;
      }
    }

    if (!normalizedOrder.internetAppDetail) return normalizedOrder;

    const serviceProgress = normalizedOrder.serviceProgress.map(service => {
      const derivedDetail = service.deliveryDetail || buildInternetAppServiceDetail(normalizedOrder, service.name);
      const shouldBackfillDetail = !service.deliveryDetail && !!derivedDetail;
      const shouldPromoteStatus =
        (normalizedOrder.status === 'completed' || normalizedOrder.status === 'confirmed' || normalizedOrder.status === 'archived') &&
        service.status !== 'completed';

      if (!shouldBackfillDetail && !shouldPromoteStatus) {
        return service;
      }

      changed = true;
      return {
        ...service,
        status: shouldPromoteStatus ? 'completed' : service.status,
        deliveryDetail: derivedDetail,
      };
    });

    return {
      ...normalizedOrder,
      serviceProgress,
    };
  });

  return { orders, changed };
}

function flattenDetailEntries(input: unknown, prefix = ''): Array<[string, string]> {
  if (input == null) return [];
  if (Array.isArray(input)) {
    return input.flatMap((item, index) => flattenDetailEntries(item, prefix ? `${prefix}[${index}]` : `[${index}]`));
  }
  if (typeof input === 'object') {
    return Object.entries(input as Record<string, unknown>).flatMap(([key, value]) =>
      flattenDetailEntries(value, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [[prefix, String(input)]];
}

function buildAssetDetail(detail: DeliveryDetail, assetMeta: Record<string, string>) {
  const usedValues = new Set(
    Object.values(assetMeta)
      .map(value => String(value).trim())
      .filter(Boolean),
  );

  const extraEntries = flattenDetailEntries(detail)
    .filter(([, value]) => value.trim())
    .filter(([, value]) => !usedValues.has(value.trim()));

  if (extraEntries.length === 0) return '';

  return extraEntries
    .slice(0, 12)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ');
}

function getCurrentTemplateVersionId(order: Order) {
  const spec = getSpec(order.sourceSpecId || order.comboId);
  return spec?.outputTemplateVersionId;
}

function buildSchemaDrift(order: Order, category: AssetCategory) {
  const currentTemplateVersionId = getCurrentTemplateVersionId(order);
  const sourceTemplateVersionId = order.outputSchemaVersion;
  if (!sourceTemplateVersionId || !currentTemplateVersionId) {
    return {
      hasDrift: true,
      reason: 'template-missing' as const,
      currentTemplateVersionId,
    };
  }
  if (sourceTemplateVersionId !== currentTemplateVersionId) {
    return {
      hasDrift: true,
      reason: 'template-version-changed' as const,
      currentTemplateVersionId,
    };
  }

  const schema = getAssetFieldSchema(category);
  const hasSchemaMappingGap = schema.some(field => !field.sourceFieldKeys || field.sourceFieldKeys.length === 0);
  if (hasSchemaMappingGap) {
    return {
      hasDrift: true,
      reason: 'field-schema-changed' as const,
      currentTemplateVersionId,
    };
  }

  return {
    hasDrift: false,
    reason: 'field-schema-changed' as const,
    currentTemplateVersionId,
  };
}

function buildDeliveredAssetsFromOrders(orders: Order[]): DeliveredAsset[] {
  const assets: DeliveredAsset[] = [];
  for (const order of orders) {
    for (const sp of order.serviceProgress) {
      const resolvedDetail =
        sp.deliveryDetail ||
        buildInternetAppServiceDetail(order, sp.name) ||
        generateDeliveryDetail(sp.name) ||
        undefined;
      if (!resolvedDetail) continue;
      const detail = resolvedDetail as any;
      const cat = inferCategoryFromDetailType(resolvedDetail.type) || inferCategory(sp.name);
      const assetStatus =
        order.status === 'archived'
          ? 'archived'
          : order.status === 'confirmed'
            ? 'accepted'
            : 'pending_acceptance';
      const deliveredAt =
        order.workflowTimeline?.find(step => step.status === 'completed')?.enteredAt ||
        order.reviewedAt ||
        order.createdAt;
      const base: DeliveredAsset = {
        id: `${order.id}-${sp.name}`,
        orderId: order.id,
        orderName: order.comboName,
        serviceName: sp.name,
        category: cat,
        categoryLabel: CATEGORY_LABELS[cat],
        assetName: detail.asset?.assetId || detail.asset?.instance || detail.cluster?.name || detail.connection?.vip || sp.name,
        assetMeta: {},
        assetDetail: '',
        deliveredAt,
        status: assetStatus,
        acceptedAt: order.status === 'confirmed' || order.status === 'archived' ? (order.archivedAt || deliveredAt) : undefined,
        archivedAt: order.status === 'archived' ? order.archivedAt : undefined,
        assetSchemaVersion: DEFAULT_ASSET_SCHEMA_VERSION,
        formSchemaVersion: order.formSchemaVersion,
        sourceSpecId: order.sourceSpecId || order.comboId,
        sourceTemplateVersionId: order.outputSchemaVersion,
      };
      // Extract rich meta fields based on type
      if (detail.type === 'vm') {
        base.assetMeta = {
          资产编号: detail.asset?.assetId || '',
          位置: detail.asset?.location || '',
          机柜: detail.asset?.rackUnit || '',
          主机名: detail.network?.hostname || '',
          IP: detail.network?.ip || '',
          子网: detail.network?.subnet || '',
          网关: detail.network?.gateway || '',
          VLAN: detail.network?.vlan || '',
          CPU: detail.spec?.cpu || '',
          内存: detail.spec?.memory || '',
          系统盘: detail.spec?.systemDisk || '',
          数据盘: detail.spec?.dataDisk || '',
          操作系统: detail.spec?.os || '',
        };
      } else if (detail.type === 'db') {
        base.assetMeta = {
          资产编号: detail.asset?.assetId || '',
          实例名: detail.asset?.instance || '',
          主机: detail.connection?.host || '',
          端口: String(detail.connection?.port || ''),
          库名: detail.connection?.schema || '',
          字符集: detail.connection?.charset || '',
          HA模式: detail.ha?.mode || '',
          主节点: detail.ha?.primary || '',
          从节点: detail.ha?.secondary || '',
        };
      } else if (detail.type === 'paas') {
        base.assetMeta = {
          集群名: detail.cluster?.name || '',
          API地址: detail.cluster?.apiServer || '',
          版本: detail.cluster?.version || '',
          命名空间: detail.namespace?.name || '',
          节点数: String(detail.namespace?.nodeCount || ''),
          资源配额: detail.namespace?.resourceQuota || '',
        };
      } else if (detail.type === 'network') {
        base.assetMeta = {
          VIP: detail.connection?.vip || '',
          域名: detail.connection?.domain || '',
          协议: detail.connection?.protocol || '',
          端口: String(detail.connection?.port || ''),
          防火墙规则数: String(detail.firewall?.rules?.length || '0'),
        };
      } else if (detail.type === 'middleware') {
        base.assetMeta = {
          URL: detail.connection?.url || '',
          端口: String(detail.connection?.port || ''),
          协议: detail.connection?.protocol || '',
          控制台: detail.management?.console || '',
          用户名: detail.management?.username || '',
          交换机: detail.topology?.exchanges?.join(', ') || '',
          队列: detail.topology?.queues?.join(', ') || '',
        };
      } else if (detail.type === 'monitor') {
        base.assetMeta = {
          Grafana地址: detail.grafana?.url || '',
          仪表盘: detail.grafana?.dashboard || '',
          Prometheus地址: detail.prometheus?.url || '',
          目标数: String(detail.prometheus?.targets || ''),
          告警规则数: String(detail.alerts?.length || '0'),
        };
      } else if (detail.type === 'security') {
        base.assetMeta = {
          WAF状态: detail.waf?.status || '',
          规则数: String(detail.waf?.rules || ''),
          风险等级: detail.scan?.riskLevel || '',
          扫描报告: detail.scan?.reportUrl || '',
          最近扫描: detail.scan?.lastScan || '',
          SSL域名: detail.ssl?.domain || '',
          签发机构: detail.ssl?.issuer || '',
          到期时间: detail.ssl?.expiry || '',
        };
      } else if (detail.type === 'backup') {
        base.assetMeta = {
          备份策略: detail.policy?.schedule || '',
          保留期: detail.policy?.retention || '',
          存储位置: detail.policy?.storage || '',
          最近备份: detail.lastBackup?.time || '',
          备份大小: detail.lastBackup?.size || '',
          备份状态: detail.lastBackup?.status || '',
        };
      } else if (detail.type === 'logging') {
        base.assetMeta = {
          Agent名称: detail.agent?.name || '',
          Agent版本: detail.agent?.version || '',
          Agent状态: detail.agent?.status || '',
          ES节点数: String(detail.cluster?.esNodes || ''),
          Kibana地址: detail.cluster?.kibanaUrl || '',
          索引模式: detail.cluster?.indexPattern || '',
        };
      }
      // Remove empty values
      base.assetMeta = Object.fromEntries(Object.entries(base.assetMeta).filter(([, v]) => v && String(v).trim()));
      base.assetDetail = buildAssetDetail(resolvedDetail, base.assetMeta);
      base.schemaDrift = buildSchemaDrift(order, cat);
      assets.push(base);
    }
  }
  return assets;
}

export function getDeliveredAssets(): DeliveredAsset[] {
  const orders = getOrders().filter(o =>
    o.status === 'completed' || o.status === 'confirmed' || o.status === 'archived',
  );
  return buildDeliveredAssetsFromOrders(orders);
}

export function getDeliveredAssetsByOrderId(orderId: string): DeliveredAsset[] {
  const order = getOrder(orderId);
  if (!order) return [];
  if (!(order.status === 'completed' || order.status === 'confirmed' || order.status === 'archived')) return [];
  return buildDeliveredAssetsFromOrders([order]);
}

export function updateServiceStatus(orderId: string, serviceName: string, status: OrderStatus): Order {
  const orders = getOrders();
  const orderIndex = orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) throw new Error(`Order ${orderId} not found`);
  const sp = orders[orderIndex].serviceProgress.find(s => s.name === serviceName);
  if (!sp) throw new Error(`Service ${serviceName} not found in order ${orderId}`);
  sp.status = status;
  // Auto-update order status based on service progress
  const allCompleted = orders[orderIndex].serviceProgress.every(s => s.status === 'completed');
  const anyProcessing = orders[orderIndex].serviceProgress.some(s => s.status === 'processing' || s.status === 'delivering');
  if (allCompleted) {
    applyOrderStatusTransition(orders[orderIndex], 'completed');
  } else if (anyProcessing) {
    applyOrderStatusTransition(orders[orderIndex], 'delivering');
  }
  writeOrdersToLocalStorage(orders);
  void pushOrdersToRemote(orders);
  notifySync();
  return orders[orderIndex];
}

export function completeServiceDelivery(
  orderId: string,
  serviceName: string,
  detail?: DeliveryDetail,
): Order {
  const orders = getOrders();
  const orderIndex = orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) throw new Error(`Order ${orderId} not found`);
  const sp = orders[orderIndex].serviceProgress.find(s => s.name === serviceName);
  if (!sp) throw new Error(`Service ${serviceName} not found`);
  sp.status = 'completed';

  // Try to find resource type from orchestrated plan for better matching
  let resolvedDetail = detail;
  if (!resolvedDetail) {
    const resource = orders[orderIndex].orchestratedPlan.resources.find(r => r.name === serviceName);
    if (resource) {
      const typeKeyword = resource.type === 'vm' ? '虚拟化' :
                          resource.type === 'db' ? '数据库' :
                          resource.type === 'network' ? '网络' :
                          resource.type === 'paas' ? 'PaaS' :
                          resource.type === 'middleware' ? '中间件' : serviceName;
      resolvedDetail = generateDeliveryDetail(typeKeyword) || undefined;
    }
  }
  sp.deliveryDetail = resolvedDetail || generateDeliveryDetail(serviceName) || undefined;

  const allCompleted = orders[orderIndex].serviceProgress.every(service => service.status === 'completed');
  const anyProcessing = orders[orderIndex].serviceProgress.some(
    service => service.status === 'processing' || service.status === 'delivering',
  );

  if (allCompleted) {
    applyOrderStatusTransition(orders[orderIndex], 'completed');
  } else if (anyProcessing) {
    applyOrderStatusTransition(orders[orderIndex], 'delivering');
  }

  writeOrdersToLocalStorage(orders);
  void pushOrdersToRemote(orders);
  notifySync();
  return orders[orderIndex];
}

export function resetServiceDelivery(orderId: string, serviceName: string): Order {
  const orders = getOrders();
  const orderIndex = orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) throw new Error(`Order ${orderId} not found`);
  const sp = orders[orderIndex].serviceProgress.find(s => s.name === serviceName);
  if (!sp) throw new Error(`Service ${serviceName} not found`);
  sp.status = 'processing';
  if (orders[orderIndex].status === 'completed') {
    applyOrderStatusTransition(orders[orderIndex], 'delivering');
  }
  writeOrdersToLocalStorage(orders);
  void pushOrdersToRemote(orders);
  notifySync();
  return orders[orderIndex];
}

export function startCurrentDeliveryStep(orderId: string): Order {
  const orders = getOrders();
  const orderIndex = orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) throw new Error(`Order ${orderId} not found`);
  const order = orders[orderIndex];
  if (!order.deliverySteps?.length) return order;

  const currentIndex = getCurrentDeliveryStepIndex(order);
  if (currentIndex !== -1) return order;

  const firstPendingIndex = order.deliverySteps.findIndex(step => step.status === 'pending');
  if (firstPendingIndex === -1) return order;

  const now = new Date().toLocaleString('zh-CN');
  order.deliverySteps = order.deliverySteps.map((step, index) => (
    index === firstPendingIndex
      ? { ...step, status: 'processing', updatedAt: now }
      : step
  ));

  if (order.status === 'processing') {
    applyOrderStatusTransition(order, 'delivering');
  }

  writeOrdersToLocalStorage(orders);
  void pushOrdersToRemote(orders);
  notifySync();
  return order;
}

export function completeCurrentDeliveryStep(orderId: string): Order {
  const orders = getOrders();
  const orderIndex = orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) throw new Error(`Order ${orderId} not found`);
  const order = orders[orderIndex];
  if (!order.deliverySteps?.length) return order;

  const currentIndex = getCurrentDeliveryStepIndex(order);
  if (currentIndex === -1) throw new Error('No active delivery step found');

  const now = new Date().toLocaleString('zh-CN');
  order.deliverySteps = order.deliverySteps.map((step, index) => {
    if (index === currentIndex) {
      return { ...step, status: 'completed', updatedAt: now };
    }
    if (index === currentIndex + 1 && step.status === 'pending') {
      return { ...step, status: 'processing', updatedAt: now };
    }
    return step;
  });

  const allCompleted = order.deliverySteps.every(step => step.status === 'completed');
  if (allCompleted) {
    order.serviceProgress = order.serviceProgress.map(service => ({
      ...service,
      status: 'completed',
      deliveryDetail: service.deliveryDetail || generateDeliveryDetail(service.name) || undefined,
    }));
    applyOrderStatusTransition(order, 'completed');
  } else {
    applyOrderStatusTransition(order, 'delivering');
  }

  writeOrdersToLocalStorage(orders);
  void pushOrdersToRemote(orders);
  notifySync();
  return order;
}

export function confirmOrder(id: string): Order {
  return updateOrderStatus(id, 'confirmed');
}

export function updateChainNodeStatus(
  orderId: string,
  nodeId: string,
  status: 'pending' | 'processing' | 'completed',
): Order {
  const orders = getOrders();
  const orderIndex = orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) throw new Error(`Order ${orderId} not found`);
  const detail = orders[orderIndex].internetAppDetail;
  if (!detail) throw new Error(`Order ${orderId} has no internet app detail`);
  const node = detail.networkChain.find(n => n.id === nodeId);
  if (!node) throw new Error(`Node ${nodeId} not found in order ${orderId}`);
  node.status = status;
  if (status === 'completed') {
    node.deliveryDetail = { ...node.deliveryDetail, completedAt: new Date().toLocaleString('zh-CN') };
  }
  // Auto-update order status based on chain progress
  const allCompleted = detail.networkChain.every(n => n.status === 'completed');
  const anyProcessing = detail.networkChain.some(n => n.status === 'processing');
  if (allCompleted) {
    syncInternetAppServiceProgress(orders[orderIndex]);
    applyOrderStatusTransition(orders[orderIndex], 'completed');
  } else if (anyProcessing) {
    applyOrderStatusTransition(orders[orderIndex], 'delivering');
  }
  writeOrdersToLocalStorage(orders);
  void pushOrdersToRemote(orders);
  notifySync();
  return orders[orderIndex];
}

export function completeAllChainNodes(orderId: string): Order {
  const orders = getOrders();
  const orderIndex = orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) throw new Error(`Order ${orderId} not found`);
  const detail = orders[orderIndex].internetAppDetail;
  if (!detail) throw new Error(`Order ${orderId} has no internet app detail`);
  const now = new Date().toLocaleString('zh-CN');
  detail.networkChain.forEach(node => {
    node.status = 'completed';
    node.deliveryDetail = { ...node.deliveryDetail, completedAt: now };
  });
  syncInternetAppServiceProgress(orders[orderIndex]);
  applyOrderStatusTransition(orders[orderIndex], 'completed');
  writeOrdersToLocalStorage(orders);
  void pushOrdersToRemote(orders);
  notifySync();
  return orders[orderIndex];
}

export function getOrderIntegrations(orderId: string): IntegrationStatusMap {
  const order = getOrder(orderId);
  if (!order) {
    return { pam: { status: 'disabled' }, monitor: { status: 'disabled' }, logging: { status: 'disabled' }, backup: { status: 'disabled' }, security: { status: 'disabled' } };
  }

  const keys = ['pam', 'monitor', 'logging', 'backup', 'security'] as const;
  const result: IntegrationStatusMap = {} as IntegrationStatusMap;

  for (const key of keys) {
    let hasActive = false;
    let hasPending = false;
    for (const sp of order.serviceProgress) {
      const detail = sp.deliveryDetail as any;
      const status = detail?.integrations?.[key]?.status;
      if (status === 'active') hasActive = true;
      else if (status === 'pending') hasPending = true;
    }
    result[key] = {
      status: hasActive ? 'active' : hasPending ? 'pending' : 'disabled',
    };
  }

  return result;
}
