import { useParams, useNavigate } from 'react-router-dom';
import { buildWorkflowTimelineDetailSummary, getWorkflowTimelineNodeDuration, deriveOrderPackageRecommendation, deriveOrderSimulationAssessment, StatusBadge, AIConfigPanel, NetworkChainProgress, WorkflowShell, normalizeLinearWorkflowStageNodes, buildWorkflowShellStageStatuses, hasReachedItsmStage, hasReachedPlanStage, hasReachedDeliveryStage, hasReachedAcceptanceStage, isAcceptedOrArchived } from '@aiops/shared/workflow';
import type { WorkflowShellStageStatus } from '@aiops/shared/workflow';
import { downloadDeliveryConfigExcel, downloadInitiationFormExcel, downloadInitiationStageExcel, normalizeInitiationFieldLabel, buildPortalResourceItsmNodes, buildPortalDeliveryPlanNodes, buildPortalAcceptanceAssetNodes } from '@aiops/shared';
import { getDeliveryStepSet, getSpec, getDeliveredAssets } from '@aiops/shared/store';
import { useOrder } from '@aiops/shared/hooks';
import { Button, Card, CardContent, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, Textarea, Progress } from '@aiops/shared/ui';
import type { AtomicServiceSpec, ComboServiceSpec, DeliveredAsset, DeliveryDetail } from '@aiops/shared';
import { useEffect, useMemo, useState } from 'react';

type PortalStageKey = 'demand_review' | 'resource_itsm' | 'delivery_plan' | 'delivery_execute' | 'acceptance_asset';
type StageNodeStatus = 'pending' | 'processing' | 'completed' | 'blocked';

interface StageNodeDetail {
  id: string;
  title: string;
  status: StageNodeStatus;
  summary: string;
  owner: string;
  updatedAt?: string;
  tags?: string[];
  details: string[];
}

function resolvePortalStage(
  orderStatus: string,
  reviewStatus?: string,
  itsmStatus?: string,
  hasPlanFeedback?: boolean,
): PortalStageKey {
  if (orderStatus === 'archived' || orderStatus === 'confirmed' || orderStatus === 'completed') {
    return 'acceptance_asset';
  }
  if (orderStatus === 'delivering') {
    return 'delivery_execute';
  }
  if (orderStatus === 'plan_confirming') {
    return 'delivery_plan';
  }
  if (hasPlanFeedback && orderStatus === 'processing') {
    return 'delivery_plan';
  }
  if (itsmStatus === 'rejected') {
    return 'resource_itsm';
  }
  if (orderStatus === 'processing') {
    return 'resource_itsm';
  }
  if (orderStatus === 'reviewing' || reviewStatus === 'rejected' || orderStatus === 'pending') {
    return 'demand_review';
  }
  return 'demand_review';
}

const portalStages: Array<{ key: PortalStageKey; label: string }> = [
  { key: 'demand_review', label: '发起需求与架构评审' },
  { key: 'resource_itsm', label: 'ITSM审批' },
  { key: 'delivery_plan', label: '确认交付方案' },
  { key: 'delivery_execute', label: '交付实施' },
  { key: 'acceptance_asset', label: '验收与归档' },
];

function getPortalStageMeta(stage: PortalStageKey, orderStatus: string) {
  switch (stage) {
    case 'demand_review':
      return {
        focus: orderStatus === 'reviewing' ? '架构评审中' : '需求细化',
        detail: '补充需求并完成架构评审',
      };
    case 'resource_itsm':
      return {
        focus: orderStatus === 'processing' ? 'ITSM审批中' : '等待审批',
        detail: '正式审批与状态回传',
      };
    case 'delivery_plan':
      return {
        focus: orderStatus === 'plan_confirming' ? '待确认方案' : '方案确认',
        detail: '确认交付范围与计划',
      };
    case 'delivery_execute':
      return {
        focus: orderStatus === 'delivering' ? '交付实施中' : '交付实施',
        detail: '按计划交付并形成资产',
      };
    case 'acceptance_asset':
      return {
        focus: orderStatus === 'confirmed' || orderStatus === 'archived' ? '已验收' : '待验收',
        detail: '完成验收并归档入台账',
      };
  }
}

function getItsmStatusLabel(status?: string) {
  switch (status) {
    case 'submitted':
      return '已提交待处理';
    case 'processing':
      return '审批处理中';
    case 'approved':
      return '审批已通过';
    case 'rejected':
      return '审批已驳回';
    case 'closed':
      return '审批已关闭';
    case 'not_created':
    default:
      return '待发起审批';
  }
}

function getItsmActionLabel(action: string) {
  switch (action) {
    case 'submit':
      return '发起审批';
    case 'status_change':
      return '状态变更';
    case 'ticket_update':
      return '更新单号/链接';
    case 'comment_update':
    default:
      return '更新说明';
  }
}

function getAtomicOutputValue(spec: AtomicServiceSpec, order: ReturnType<typeof useOrder>['order'], outputKey: string): string {
  const detail = order?.serviceProgress[0]?.deliveryDetail;
  if (!detail) return order?.answers?.[outputKey] || '';

  switch (spec.serviceCode) {
    case 'ecs-public-create':
      if (detail.type !== 'vm') return order?.answers?.[outputKey] || '';
      if (outputKey === 'instanceId') return detail.asset.assetId;
      if (outputKey === 'instanceName') return detail.network.hostname;
      if (outputKey === 'privateIp') return detail.network.ip;
      if (outputKey === 'publicIp') return detail.integrations.pam.url || '按运维通道访问';
      return order?.answers?.[outputKey] || '';
    case 'ecs-private-create':
      if (detail.type !== 'vm') return order?.answers?.[outputKey] || '';
      if (outputKey === 'vmId') return detail.asset.assetId;
      if (outputKey === 'hostname') return detail.network.hostname;
      if (outputKey === 'ip') return detail.network.ip;
      if (outputKey === 'spec') return `${detail.spec.cpu} / ${detail.spec.memory}`;
      return order?.answers?.[outputKey] || '';
    case 'mysql-create':
      if (detail.type !== 'db') return order?.answers?.[outputKey] || '';
      if (outputKey === 'dbInstanceId') return detail.asset.assetId;
      if (outputKey === 'dbName') return detail.asset.instance;
      if (outputKey === 'endpoint') return detail.connection.host;
      if (outputKey === 'port') return String(detail.connection.port);
      return order?.answers?.[outputKey] || '';
    case 'lb-public-create':
      if (detail.type !== 'network') return order?.answers?.[outputKey] || '';
      if (outputKey === 'lbId') return `LB-${order?.id || ''}`;
      if (outputKey === 'vip') return detail.connection.vip;
      if (outputKey === 'protocol') return detail.connection.protocol;
      if (outputKey === 'port') return String(detail.connection.port);
      return order?.answers?.[outputKey] || '';
    case 'oss-create':
      if (detail.type !== 'backup') return order?.answers?.[outputKey] || '';
      if (outputKey === 'bucketName') return order?.answers?.bucketName || 'prod-shared-bucket';
      if (outputKey === 'endpoint') return detail.policy.storage;
      if (outputKey === 'acl') return order?.answers?.accessControl || 'private';
      if (outputKey === 'encryption') return '平台默认加密';
      return order?.answers?.[outputKey] || '';
    default:
      return order?.answers?.[outputKey] || '';
  }
}

function inferAssetCategory(detail: DeliveryDetail): DeliveredAsset['category'] {
  switch (detail.type) {
    case 'vm':
      return 'vm';
    case 'db':
      return 'database';
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
  }
}

function getAssetCategoryLabel(category: DeliveredAsset['category']): string {
  switch (category) {
    case 'vm':
      return '主机';
    case 'database':
      return '数据库';
    case 'network':
      return '网络';
    case 'paas':
      return 'PaaS';
    case 'middleware':
      return '中间件';
    case 'monitor':
      return '监控';
    case 'security':
      return '安全';
    case 'backup':
      return '备份';
    case 'logging':
      return '日志';
  }
}

function buildAssetMetaFromDetail(detail: DeliveryDetail): Record<string, string> {
  if (detail.type === 'vm') {
    return Object.fromEntries(
      Object.entries({
        资产编号: detail.asset?.assetId || '',
        主机名: detail.network?.hostname || '',
        IP: detail.network?.ip || '',
        CPU: detail.spec?.cpu || '',
        内存: detail.spec?.memory || '',
        操作系统: detail.spec?.os || '',
      }).filter(([, value]) => value && String(value).trim()),
    );
  }
  if (detail.type === 'db') {
    return Object.fromEntries(
      Object.entries({
        实例名: detail.asset?.instance || '',
        主机: detail.connection?.host || '',
        端口: String(detail.connection?.port || ''),
        库名: detail.connection?.schema || '',
        HA模式: detail.ha?.mode || '',
      }).filter(([, value]) => value && String(value).trim()),
    );
  }
  if (detail.type === 'network') {
    return Object.fromEntries(
      Object.entries({
        VIP: detail.connection?.vip || '',
        域名: detail.connection?.domain || '',
        协议: detail.connection?.protocol || '',
        端口: String(detail.connection?.port || ''),
      }).filter(([, value]) => value && String(value).trim()),
    );
  }
  if (detail.type === 'paas') {
    return Object.fromEntries(
      Object.entries({
        集群名: detail.cluster?.name || '',
        命名空间: detail.namespace?.name || '',
        版本: detail.cluster?.version || '',
        资源配额: detail.namespace?.resourceQuota || '',
      }).filter(([, value]) => value && String(value).trim()),
    );
  }
  if (detail.type === 'middleware') {
    return Object.fromEntries(
      Object.entries({
        URL: detail.connection?.url || '',
        协议: detail.connection?.protocol || '',
        端口: String(detail.connection?.port || ''),
        控制台: detail.management?.console || '',
      }).filter(([, value]) => value && String(value).trim()),
    );
  }
  if (detail.type === 'monitor') {
    return Object.fromEntries(
      Object.entries({
        Grafana地址: detail.grafana?.url || '',
        仪表盘: detail.grafana?.dashboard || '',
        告警规则数: String(detail.alerts?.length || ''),
      }).filter(([, value]) => value && String(value).trim()),
    );
  }
  if (detail.type === 'security') {
    return Object.fromEntries(
      Object.entries({
        WAF状态: detail.waf?.status || '',
        风险等级: detail.scan?.riskLevel || '',
        SSL域名: detail.ssl?.domain || '',
      }).filter(([, value]) => value && String(value).trim()),
    );
  }
  if (detail.type === 'backup') {
    return Object.fromEntries(
      Object.entries({
        备份策略: detail.policy?.schedule || '',
        保留期: detail.policy?.retention || '',
        最近备份: detail.lastBackup?.time || '',
        备份状态: detail.lastBackup?.status || '',
      }).filter(([, value]) => value && String(value).trim()),
    );
  }
  return Object.fromEntries(
    Object.entries({
      Agent名称: detail.agent?.name || '',
      Agent状态: detail.agent?.status || '',
      Kibana地址: detail.cluster?.kibanaUrl || '',
    }).filter(([, value]) => value && String(value).trim()),
  );
}

function buildDraftDeliveredAsset(orderId: string, orderName: string, serviceName: string, deliveredAt: string, detail: DeliveryDetail): DeliveredAsset {
  const category = inferAssetCategory(detail);
  const assetMeta = buildAssetMetaFromDetail(detail);
  const assetName =
    (detail.type === 'vm' && (detail.asset?.assetId || detail.network?.hostname)) ||
    (detail.type === 'db' && (detail.asset?.instance || detail.connection?.host)) ||
    (detail.type === 'network' && (detail.connection?.vip || detail.connection?.domain)) ||
    (detail.type === 'paas' && (detail.cluster?.name || detail.namespace?.name)) ||
    (detail.type === 'middleware' && detail.connection?.url) ||
    (detail.type === 'monitor' && detail.grafana?.dashboard) ||
    (detail.type === 'security' && detail.ssl?.domain) ||
    (detail.type === 'backup' && detail.policy?.storage) ||
    (detail.type === 'logging' && detail.agent?.name) ||
    serviceName;

  return {
    id: `${orderId}-${serviceName}`,
    orderId,
    orderName,
    serviceName,
    category,
    categoryLabel: getAssetCategoryLabel(category),
    assetName,
    assetMeta,
    deliveredAt,
    status: 'pending_acceptance',
    assetSchemaVersion: '1.0.0',
  };
}

function nodeStatusLabel(status: StageNodeStatus) {
  switch (status) {
    case 'completed':
      return '已完成';
    case 'processing':
      return '处理中';
    case 'blocked':
      return '已退回';
    default:
      return '待开始';
  }
}

function nodeStatusClass(status: StageNodeStatus) {
  switch (status) {
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'processing':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    case 'blocked':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
}

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { order, isLoaded, confirm, confirmPlan, rejectPlan } = useOrder(id || '');
  const [notFoundGraceExpired, setNotFoundGraceExpired] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<StageNodeDetail | null>(null);
  const [nodeStage, setNodeStage] = useState<PortalStageKey>('demand_review');
  const [expandedStageDetails, setExpandedStageDetails] = useState<Set<PortalStageKey>>(new Set());

  // Resolve spec for display name (must stay before any early return to keep hook order stable)
  const spec = getSpec((order?.sourceSpecId || order?.comboId) ?? '');
  const displayName = spec?.name || order?.comboName;
  const packageRecommendation = order ? deriveOrderPackageRecommendation(order) : { summary: '', reasons: [] };
  const simulationAssessment = order ? deriveOrderSimulationAssessment(order) : { environmentLabel: '', summary: '', gateStatus: 'ready' as const, items: [] };
  const portalPlan = useMemo(
    () => ({
      summary: (order?.orchestratedPlan?.summary || '暂无建议')
        .replace('全套集成', '配套能力建议')
        .replace('交付方案', '资源与交付建议'),
      estimatedTime: order?.orchestratedPlan?.estimatedTime || '-',
      resources: order?.orchestratedPlan?.resources || [],
      integrations: [],
    }),
    [order?.orchestratedPlan],
  );
  const atomicSpec = spec?.type === 'atomic' ? spec as AtomicServiceSpec : undefined;
  const deliveryStepSet = useMemo(
    () => (atomicSpec?.deliveryStepSetId ? getDeliveryStepSet(atomicSpec.deliveryStepSetId) : undefined),
    [atomicSpec],
  );

  const orderStatus = order?.status || 'pending';
  const reviewStatus = order?.reviewStatus;
  const deliveryAcceptance = order?.deliveryAcceptance;
  const formalPlan = deliveryAcceptance?.implementationPlan;
  const currentStageKey = resolvePortalStage(orderStatus, reviewStatus, order?.itsm?.status, Boolean(order?.planFeedbackAt));
  const currentStageIndex = portalStages.findIndex(stage => stage.key === currentStageKey);
  const progressValue = ((currentStageIndex + 1) / portalStages.length) * 100;
  const isInternetApp = !!order?.internetAppDetail;
  const chain = order?.internetAppDetail?.networkChain;
  const itsmInfo = useMemo(
    () => ({
      ticketNo: order?.itsm?.ticketNo || '-',
      syncStatus: getItsmStatusLabel(order?.itsm?.status),
      lastSyncAt: order?.itsm?.lastSyncedAt || order?.itsm?.submittedAt || order?.reviewedAt || order?.createdAt || '-',
      portalSourceNo: order?.id || '-',
      targetUrl: order?.itsm?.ticketUrl || '',
      resultComment: order?.itsm?.resultComment || '',
    }),
    [order?.createdAt, order?.id, order?.itsm?.lastSyncedAt, order?.itsm?.resultComment, order?.itsm?.status, order?.itsm?.submittedAt, order?.itsm?.ticketNo, order?.itsm?.ticketUrl, order?.reviewedAt],
  );
  const deliveredAssets = useMemo(
    () => getDeliveredAssets().filter(asset => asset.orderId === order?.id),
    [order?.id],
  );
  const draftAcceptanceAssets = useMemo(
    () =>
      (order?.serviceProgress ?? [])
        .filter(service => service.deliveryDetail)
        .map(service =>
          buildDraftDeliveredAsset(
            order?.id || 'ORD-UNKNOWN',
            order?.comboName || displayName || '未命名工单',
            service.name,
            order?.createdAt || '',
            service.deliveryDetail as DeliveryDetail,
          ),
        ),
    [displayName, order?.comboName, order?.createdAt, order?.id, order?.serviceProgress],
  );
  const acceptanceAssets = deliveredAssets.length > 0 ? deliveredAssets : draftAcceptanceAssets;
  const completedServiceCount = (order?.serviceProgress ?? []).filter(service => service.status === 'completed').length;
  const totalServiceCount = order?.serviceProgress?.length ?? 0;
  const stageDetailsExpanded = expandedStageDetails.has(nodeStage);
  const toggleStageDetails = (stage: PortalStageKey) => {
    setExpandedStageDetails(prev => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });
  };
  const acceptanceCopy = useMemo(() => {
    if (orderStatus === 'archived') {
      return {
        title: '已归档资产',
        description: '本单交付资产已完成验收并归档入台账，可回看资产规格、地址、交付范围及接入项。',
        badge: '已归档',
        assetCountLabel: '归档资产',
        archiveLabel: '已归档',
        listTitle: '资产归档清单',
        emptyText: '当前尚未形成归档资产。',
      };
    }
    if (orderStatus === 'confirmed') {
      return {
        title: '已验收资产',
        description: '本单已完成用户验收，资产处于待归档或已沉淀状态，可继续核对交付结果快照。',
        badge: '已验收待归档',
        assetCountLabel: '已验收资产',
        archiveLabel: '待归档',
        listTitle: '已验收资产清单',
        emptyText: '当前尚未形成已验收资产。',
      };
    }
    return {
      title: '待验收资产',
      description: '交付实施完成后已形成交付资产。请按资产清单核对规格、地址、交付范围及接入项，确认无误后完成验收归档。',
      badge: '待用户验收',
      assetCountLabel: '待核对资产',
      archiveLabel: '待验收',
      listTitle: '资产验收清单',
      emptyText: '当前尚未形成可验收资产，请等待交付实施完成后再核对。',
    };
  }, [orderStatus]);
  const demandReviewNodes = useMemo<StageNodeDetail[]>(() => [
    {
      id: 'demand-form',
      title: '需求细化单',
      status: orderStatus === 'pending' ? 'processing' : 'completed',
      summary: '当前需求单已作为后续正式申请来源。',
      owner: '申请人',
      updatedAt: order?.createdAt,
      tags: ['来源固化', '需求输入'],
      details: [
        `主单名称：${displayName || '-'}`,
        `工单编号：${order?.id || '-'}`,
        `创建时间：${order?.createdAt || '-'}`,
      ],
    },
    {
      id: 'arch-review',
      title: '架构评审',
      status: reviewStatus === 'approved' ? 'completed' : reviewStatus === 'rejected' ? 'blocked' : orderStatus === 'reviewing' ? 'processing' : 'pending',
      summary: reviewStatus === 'approved'
        ? '架构评审已通过。'
        : reviewStatus === 'rejected'
          ? `评审已退回：${order?.reviewComment || '请继续调整。'}`
          : orderStatus === 'reviewing'
            ? '等待架构评审结果。'
            : '待提交架构评审。',
      owner: '架构组',
      updatedAt: order?.reviewedAt,
      tags: order?.approvalStages?.map(stage => stage.stageName) || ['标准评审'],
      details: [
        `评审状态：${reviewStatus === 'approved' ? '通过' : reviewStatus === 'rejected' ? '退回修改' : orderStatus === 'reviewing' ? '评审中' : '待发起'}`,
        `审批路径：${order?.approvalStages?.map(stage => stage.stageName).join(' -> ') || '标准评审路径'}`,
        order?.reviewComment ? `最近意见：${order.reviewComment}` : '最近意见：暂无',
      ],
    },
  ], [displayName, order?.approvalStages, order?.createdAt, order?.id, order?.reviewComment, order?.reviewedAt, orderStatus, reviewStatus]);
  const resourceItsmNodes = useMemo<StageNodeDetail[]>(
    () =>
      buildPortalResourceItsmNodes({
        orderId: order?.id,
        orderCreatedAt: order?.createdAt,
        orderReviewedAt: order?.reviewedAt,
        orderStatus,
        reviewStatus,
        itsmInfo,
      }),
    [itsmInfo, order?.createdAt, order?.id, order?.reviewedAt, orderStatus, reviewStatus],
  );
  const deliveryPlanNodes = useMemo<StageNodeDetail[]>(
    () =>
      buildPortalDeliveryPlanNodes({
        orderStatus,
        orderPlanFeedback: order?.planFeedback,
        orderPlanFeedbackAt: order?.planFeedbackAt,
        itsmLastSyncAt: itsmInfo.lastSyncAt,
        estimatedTime: portalPlan.estimatedTime,
        deliveryAcceptance,
      }),
    [deliveryAcceptance, itsmInfo.lastSyncAt, order?.planFeedback, order?.planFeedbackAt, orderStatus, portalPlan.estimatedTime],
  );
  const deliveryExecuteNodes = useMemo<StageNodeDetail[]>(() => {
    if (order?.deliverySteps?.length) {
      return order.deliverySteps.map(step => ({
        id: `delivery-${step.stepCode}`,
        title: step.stepName,
        status: step.status === 'completed' ? 'completed' : step.status === 'processing' ? 'processing' : 'pending',
        summary: step.outputKeys?.length ? `输出：${step.outputKeys.join(' / ')}` : '完成后回填交付结果。',
        owner: step.mode === 'auto' ? '平台自动化' : '交付窗口',
        updatedAt: step.updatedAt,
        tags: [step.mode === 'auto' ? '自动' : '人工'],
        details: [
          `步骤顺序：${step.order}`,
          `执行模式：${step.mode === 'auto' ? '自动' : '人工'}`,
          `最近更新：${step.updatedAt || '未开始'}`,
        ],
      }));
    }
    return [
      {
        id: 'delivery-exec',
        title: '交付执行',
        status: orderStatus === 'delivering' ? 'processing' : hasReachedAcceptanceStage(orderStatus) ? 'completed' : 'pending',
        summary: '当前场景暂无更细步骤。',
        owner: '交付窗口',
        updatedAt: order?.createdAt,
        tags: ['交付执行'],
        details: ['当前订单尚未配置细粒度交付步骤。'],
      },
    ];
  }, [order?.createdAt, order?.deliverySteps, orderStatus]);
  const acceptanceAssetNodes = useMemo<StageNodeDetail[]>(
    () =>
      buildPortalAcceptanceAssetNodes({
        orderStatus,
        orderCreatedAt: order?.createdAt,
        orderArchivedAt: order?.archivedAt,
        assetCount: acceptanceAssets.length,
      }),
    [acceptanceAssets.length, order?.archivedAt, order?.createdAt, orderStatus],
  );
  const currentStageNodes = useMemo<Record<PortalStageKey, StageNodeDetail[]>>(
    () => ({
      demand_review: normalizeLinearWorkflowStageNodes(demandReviewNodes),
      resource_itsm: normalizeLinearWorkflowStageNodes(resourceItsmNodes),
      delivery_plan: normalizeLinearWorkflowStageNodes(deliveryPlanNodes),
      delivery_execute: normalizeLinearWorkflowStageNodes(deliveryExecuteNodes),
      acceptance_asset: normalizeLinearWorkflowStageNodes(acceptanceAssetNodes),
    }),
    [acceptanceAssetNodes, deliveryExecuteNodes, deliveryPlanNodes, demandReviewNodes, resourceItsmNodes],
  );
  const portalStageStatuses = useMemo(
    () => buildWorkflowShellStageStatuses(portalStages.map(stage => stage.key), currentStageKey, currentStageNodes),
    [currentStageKey, currentStageNodes],
  );

  const currentStageGuidance = useMemo(() => {
    switch (nodeStage) {
      case 'demand_review':
        return {
          title: '当前正在发起需求与架构评审',
          summary: reviewStatus === 'approved'
            ? '需求已确认，评审通过后进入 ITSM 审批。'
            : '补充需求并完成评审后进入 ITSM 审批。',
          action: reviewStatus === 'rejected'
            ? '按评审意见调整后重新提交。'
            : orderStatus === 'reviewing'
              ? '等待架构评审结果。'
              : '补充需求后提交评审。',
        };
      case 'resource_itsm':
        return {
          title: '当前正在进行 ITSM审批',
          summary: '当前以正式审批流转为主，结果会同步回门户。',
          action: '如被退回，回到需求单调整后重新发起。',
        };
      case 'delivery_plan':
        return {
          title: '当前待确认交付方案',
          summary: '核对交付范围、计划和清单后进入实施。',
          action: '不符合预期时可退回调整。',
        };
      case 'delivery_execute':
        return {
          title: '当前正在交付实施',
          summary: '交付团队正按已确认方案推进，资产会逐步形成。',
          action: '持续跟踪进度并提前核对交付资产。',
        };
      case 'acceptance_asset':
        return {
          title: orderStatus === 'archived' ? '当前已归档' : orderStatus === 'confirmed' ? '当前已验收，待归档' : '当前待验收与归档',
          summary: orderStatus === 'archived'
            ? '交付结果已完成验收并归档。'
            : orderStatus === 'confirmed'
              ? '验收已通过，等待归档。'
              : '核对交付结果与待验收资产后完成归档。',
          action: orderStatus === 'completed'
            ? '确认验收后进入归档阶段。'
            : orderStatus === 'archived'
              ? '当前以结果回看为主。'
              : '查看交付结果与验收记录。',
        };
      default:
        return {
          title: '',
          summary: '',
          action: '',
        };
    }
  }, [nodeStage, orderStatus, reviewStatus]);

  const currentStageActionMeta = useMemo(() => {
    switch (nodeStage) {
      case 'demand_review':
        return {
          statusLabel: reviewStatus === 'approved' ? '评审通过' : reviewStatus === 'rejected' ? '已退回待调整' : orderStatus === 'reviewing' ? '等待架构评审' : '待提交评审',
          statusClass: reviewStatus === 'approved'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : reviewStatus === 'rejected'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : orderStatus === 'reviewing'
                ? 'border-sky-200 bg-sky-50 text-sky-700'
                : 'border-amber-200 bg-amber-50 text-amber-700',
          helper: reviewStatus === 'rejected'
            ? '请根据评审意见调整需求后重新提交。'
            : orderStatus === 'reviewing'
              ? '当前无需操作，等待架构评审处理结果。'
              : '请先补充完整需求信息并提交评审。',
          primaryAction: null as null | { label: string; onClick: () => void },
          secondaryAction: null as null | { label: string; onClick: () => void },
        };
      case 'resource_itsm':
        return {
          statusLabel: itsmInfo.syncStatus,
          statusClass: order?.itsm?.status === 'approved'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : order?.itsm?.status === 'rejected'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : orderStatus === 'processing'
                ? 'border-sky-200 bg-sky-50 text-sky-700'
                : 'border-slate-200 bg-slate-50 text-slate-600',
          helper: order?.itsm?.ticketNo
            ? `ITSM 单号 ${order.itsm.ticketNo}，结果同步回门户。`
            : '当前以 ITSM 审批流转为主。',
          primaryAction: null as null | { label: string; onClick: () => void },
          secondaryAction: null as null | { label: string; onClick: () => void },
        };
      case 'delivery_plan':
        return {
          statusLabel: orderStatus === 'plan_confirming' ? '待用户确认' : '等待交付方案',
          statusClass: orderStatus === 'plan_confirming'
            ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
            : 'border-slate-200 bg-slate-50 text-slate-600',
          helper: orderStatus === 'plan_confirming'
            ? '请核对下方正式实施方案。'
            : '交付中心正在整理实施方案。',
          primaryAction: null as null | { label: string; onClick: () => void },
          secondaryAction: null as null | { label: string; onClick: () => void },
        };
      case 'delivery_execute':
        return {
          statusLabel: orderStatus === 'delivering' ? '交付实施中' : '等待开始实施',
          statusClass: orderStatus === 'delivering'
            ? 'border-violet-200 bg-violet-50 text-violet-700'
            : 'border-slate-200 bg-slate-50 text-slate-600',
          helper: '查看进度与交付结果。',
          primaryAction: null as null | { label: string; onClick: () => void },
          secondaryAction: null as null | { label: string; onClick: () => void },
        };
      case 'acceptance_asset':
        return {
          statusLabel: orderStatus === 'archived' ? '已归档' : orderStatus === 'confirmed' ? '已验收，待归档' : orderStatus === 'completed' ? '待用户验收' : '查看验收结果',
          statusClass: orderStatus === 'archived'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : orderStatus === 'confirmed'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : orderStatus === 'completed'
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-slate-200 bg-slate-50 text-slate-600',
          helper: orderStatus === 'completed'
            ? '核对结果后确认验收。'
            : orderStatus === 'archived'
              ? '查看归档结果。'
              : '查看验收与归档状态。',
          primaryAction: orderStatus === 'completed'
            ? { label: '确认验收', onClick: () => { confirm(); navigate('/orders'); } }
            : null,
          secondaryAction: null as null | { label: string; onClick: () => void },
        };
      default:
        return {
          statusLabel: '',
          statusClass: 'border-slate-200 bg-slate-50 text-slate-600',
          helper: '',
          primaryAction: null,
          secondaryAction: null,
        };
    }
  }, [confirm, confirmPlan, itsmInfo.syncStatus, navigate, nodeStage, order?.itsm?.status, order?.itsm?.ticketNo, orderStatus, reviewStatus]);

  useEffect(() => {
    setNodeStage(currentStageKey);
    setSelectedNode(null);
  }, [currentStageKey]);

  useEffect(() => {
    setNotFoundGraceExpired(false);
    if (!isLoaded || order) return;
    const timer = window.setTimeout(() => {
      setNotFoundGraceExpired(true);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [isLoaded, order, id]);

  if (!isLoaded) {
    return (
      <div className="mx-auto w-full max-w-[1500px] py-10">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="h-8 w-72 animate-pulse rounded-md bg-slate-100" />
              <div className="h-4 w-56 animate-pulse rounded-md bg-slate-100" />
            </div>
            <div className="h-10 w-32 animate-pulse rounded-full bg-slate-100" />
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
            <div className="space-y-4">
              <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
            </div>
            <div className="space-y-4">
              <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order && !notFoundGraceExpired) {
    return (
      <div className="mx-auto max-w-3xl py-16">
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
          <div className="text-sm font-medium text-slate-900">正在同步工单数据</div>
          <div className="mt-2 text-sm leading-6 text-slate-500">
            刚提交的工单会优先从本地读取，并等待同步结果回传。
          </div>
          <div className="mx-auto mt-6 h-2 max-w-md overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-slate-900" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">工单不存在</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/orders')}>返回列表</Button>
      </div>
    );
  }

  const handleRejectPlan = () => {
    rejectPlan(feedback);
    setFeedback('');
    setFeedbackOpen(false);
  };

  const copyItsmPayload = async () => {
    const payload = [
      `来源工单号: ${order.id}`,
      `需求名称: ${displayName || '-'}`,
      `服务清单: ${(order.services || []).join('、') || '-'}`,
      `环境: ${order.answers?.environment || order.answers?.targetEnv || '-'}`,
      `应用/系统: ${order.answers?.applicationName || order.answers?.appName || '-'} / ${order.answers?.system || '-'}`,
      `业务域: ${order.answers?.businessDomain || '-'}`,
      `资源摘要: ${(order.orchestratedPlan?.resources || []).map(resource => `${resource.name}(${Object.entries(resource.spec || {}).map(([key, value]) => `${key}=${value}`).join(', ')})`).join(' | ') || '-'}`,
      `评审意见: ${order.reviewComment || '-'}`,
      `ITSM链接: ${itsmInfo.targetUrl || '-'}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(payload);
      window.alert('已复制 ITSM 申请摘要');
    } catch {
      window.alert('复制失败，请检查浏览器权限');
    }
  };

  const currentNodeStage = nodeStage;
  const currentNodeStageIndex = portalStages.findIndex(stage => stage.key === currentNodeStage);
  const currentNodeStageLabel = portalStages.find(stage => stage.key === currentNodeStage)?.label || '-';
  const currentProcessStageLabel = portalStages.find(stage => stage.key === currentStageKey)?.label || '-';
  const viewingStageTone = currentStageIndex === currentNodeStageIndex
    ? '当前处理阶段'
    : currentNodeStageIndex > currentStageIndex
      ? '后续阶段，仅供预览'
      : '已流转阶段，可回看';
  const portalStageCards = portalStages.map((stage, i) => {
    const meta = getPortalStageMeta(stage.key, order.status);
    const stageNodes = currentStageNodes[stage.key];
    const isCurrentStage = stage.key === currentStageKey;
    const isViewedStage = stage.key === nodeStage;
    const isReachedStage = i <= currentStageIndex;
    const stageStatus = portalStageStatuses[stage.key];

    return {
      key: stage.key,
      index: i,
      label: stage.label,
      status: stageStatus,
      metaPrimary: meta.focus,
      metaSecondary: meta.detail,
      footerLeft: isViewedStage ? '当前查看中' : isCurrentStage ? '真实当前阶段' : isReachedStage ? '可回看' : '前序完成后开放',
      footerRight: `${stageNodes.length} 节点`,
      active: isViewedStage,
      reached: isReachedStage,
      onClick: () => {
        setNodeStage(stage.key);
        setSelectedNode(null);
      },
    };
  });
  const portalNodeCards = currentStageNodes[currentNodeStage].map(node => ({
    ...node,
    onClick: () => setSelectedNode(node),
  }));

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-semibold">{displayName}</h1>
            <StatusBadge status={order.status} />
          </div>
          <span className="text-sm text-muted-foreground font-mono">{order.id} · {order.createdAt}</span>
        </div>
        <div className="flex gap-2">
          {order.status === 'completed' && (
            <Button size="sm" onClick={() => { confirm(); navigate('/orders'); }}>
              确认验收
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate('/orders')}>← 返回</Button>
        </div>
      </div>

      <WorkflowShell
        progressValue={progressValue}
        onOpenTimeline={() => setTimelineOpen(true)}
        stageCards={portalStageCards}
        summaryTitle={currentNodeStageLabel}
        summaryText={viewingStageTone}
        summaryTag="当前查看阶段"
        contextBadges={currentNodeStage === currentStageKey ? [] : [
          { label: `真实当前阶段：${currentProcessStageLabel}` },
          { label: viewingStageTone, tone: 'primary' },
        ]}
        statusBadge={{
          label: currentStageActionMeta.statusLabel,
          className: currentStageActionMeta.statusClass,
        }}
        helperText={currentNodeStage === currentStageKey ? currentStageActionMeta.helper : undefined}
        actions={[
          ...(currentStageActionMeta.secondaryAction ? [{
            label: currentStageActionMeta.secondaryAction.label,
            onClick: currentStageActionMeta.secondaryAction.onClick,
            variant: 'outline' as const,
          }] : []),
          ...(currentStageActionMeta.primaryAction ? [{
            label: currentStageActionMeta.primaryAction.label,
            onClick: currentStageActionMeta.primaryAction.onClick,
          }] : []),
        ]}
        nodeSection={{
          title: '阶段处理记录',
          description: '以下为该阶段的处理记录和责任分工，主内容请以下方阶段详情为准。',
          badge: `${portalNodeCards.length} 条记录`,
          railTitle: currentNodeStageLabel,
          railDescription: '点击记录会在右侧打开详情，不会切换下方主体内容。',
          nodes: portalNodeCards,
        }}
      />

      {nodeStage === 'demand_review' && (
        <>
          <Card className="mb-6 border-slate-200 bg-white">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">发起表单与阶段详情</div>
                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    这里展示本次申请在发起阶段提交的结构化表单内容，以及 AI 分析、附件和评审关注点。
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => order && downloadInitiationFormExcel(order)}>
                    导出发起表单
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => order && downloadInitiationStageExcel(order)}>
                    导出发起阶段详情
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => order && downloadDeliveryConfigExcel(order)}>
                    导出交付配置
                  </Button>
                </div>
              </div>

              {order.initiationForm?.sections?.length ? (
                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  {order.initiationForm.sections.map(section => (
                    <div key={section.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                      <div className="text-sm font-medium text-slate-900">{section.title}</div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {section.fields.map(field => (
                          <div key={`${section.id}-${field.key}`} className="rounded-md border border-white bg-white px-3 py-2">
                            <div className="text-[11px] text-slate-500">{normalizeInitiationFieldLabel(field.label)}</div>
                            <div className="mt-1 text-sm text-slate-900 break-all">{field.displayValue}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 text-sm text-slate-500">当前工单暂无发起表单快照。</div>
              )}

              {order.initiationStageDetail ? (
                <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50/40 p-3">
                  <div className="text-sm font-medium text-sky-900">发起阶段详情</div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <div className="rounded-md border border-sky-100 bg-white px-3 py-2">
                      <div className="text-[11px] text-sky-700">输入模式</div>
                      <div className="mt-1 text-sm text-slate-900">{order.initiationStageDetail.inputMode}</div>
                    </div>
                    <div className="rounded-md border border-sky-100 bg-white px-3 py-2">
                      <div className="text-[11px] text-sky-700">附件数量</div>
                      <div className="mt-1 text-sm text-slate-900">{order.initiationStageDetail.attachments.length}</div>
                    </div>
                  </div>

                  {order.initiationStageDetail.aiAnalysisSummary && (
                    <div className="mt-3 rounded-md border border-sky-100 bg-white px-3 py-3">
                      <div className="text-[11px] text-sky-700">AI摘要</div>
                      <div className="mt-1 text-sm text-slate-900">{order.initiationStageDetail.aiAnalysisSummary.summary}</div>
                    </div>
                  )}

                  {order.initiationStageDetail.reviewFocus.length > 0 && (
                    <div className="mt-3 rounded-md border border-sky-100 bg-white px-3 py-3">
                      <div className="text-[11px] text-sky-700">评审关注点</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {order.initiationStageDetail.reviewFocus.map(item => (
                          <span key={item} className="rounded-full border border-sky-100 bg-sky-50 px-2 py-1 text-xs text-sky-800">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {order.initiationStageDetail.missingItems.length > 0 && (
                    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-3">
                      <div className="text-[11px] text-amber-700">缺失项</div>
                      <div className="mt-1 text-sm text-amber-900">{order.initiationStageDetail.missingItems.join('；')}</div>
                    </div>
                  )}

                  {order.initiationStageDetail.riskHints.length > 0 && (
                    <div className="mt-3 rounded-md border border-rose-200 bg-rose-50/50 px-3 py-3">
                      <div className="text-[11px] text-rose-700">风险提示</div>
                      <div className="mt-1 text-sm text-rose-900">{order.initiationStageDetail.riskHints.join('；')}</div>
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="mb-6">
            <AIConfigPanel plan={portalPlan} title="需求建议与评审参考" />
          </div>

          <Card className="mb-6 border-sky-200 bg-sky-50/60">
            <CardContent className="p-4">
              <div className="text-sm font-medium text-sky-900">发起需求与架构评审</div>
              <p className="mt-1 text-sm text-sky-800">
                当前工单处于需求补充与架构评审阶段，重点确认申请范围、业务必要性、资源边界和后续交付条件。评审通过后进入 ITSM 审批。
              </p>
              <div className="mt-3 rounded-md border border-sky-200 bg-white/80 p-3">
                <div className="text-xs font-medium text-sky-900">本单实际审批路径</div>
                <div className="mt-3 space-y-2">
                  {(order.approvalStages?.length ? order.approvalStages : []).map((stage, index) => (
                    <div key={stage.stageCode} className="flex items-start gap-3 rounded-md border border-sky-100 bg-sky-50/60 px-3 py-2.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-sky-700">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-sky-950">{stage.stageName}</span>
                          <span className="rounded-full border border-sky-200 bg-white px-2 py-0.5 text-[10px] text-sky-700">{stage.role}</span>
                          {stage.status && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                              stage.status === 'approved'
                                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                : stage.status === 'rejected'
                                  ? 'border border-rose-200 bg-rose-50 text-rose-700'
                                  : stage.status === 'processing'
                                    ? 'border border-amber-200 bg-amber-50 text-amber-700'
                                    : 'border border-slate-200 bg-slate-50 text-slate-600'
                            }`}>
                              {stage.status === 'approved'
                                ? '已完成'
                                : stage.status === 'rejected'
                                  ? '已驳回'
                                  : stage.status === 'processing'
                                    ? '处理中'
                                    : '待处理'}
                            </span>
                          )}
                          <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                            stage.source === 'trigger'
                              ? 'border border-violet-200 bg-violet-50 text-violet-700'
                              : 'border border-slate-200 bg-slate-50 text-slate-600'
                          }`}>
                            {stage.source === 'trigger' ? '规则追加' : '基础审批'}
                          </span>
                        </div>
                        {stage.sla && <div className="mt-1 text-xs text-sky-700">SLA：{stage.sla}</div>}
                        {stage.updatedAt && <div className="mt-1 text-xs text-sky-700">最近更新：{stage.updatedAt}</div>}
                      </div>
                    </div>
                  ))}
                  {!order.approvalStages?.length && (
                    <div className="text-xs text-sky-700">当前工单按标准架构评审路径处理。</div>
                  )}
                </div>
              </div>

              {order.approvalTriggers?.length ? (
                <div className="mt-3 rounded-md border border-violet-200 bg-violet-50/80 p-3">
                  <div className="text-xs font-medium text-violet-950">触发原因</div>
                  <div className="mt-2 space-y-2">
                    {order.approvalTriggers.map(trigger => (
                      <div key={`${trigger.fieldKey}-${trigger.operator}-${trigger.expectedValue}`} className="rounded-md border border-violet-100 bg-white/85 px-3 py-2">
                        <div className="text-sm text-violet-900">
                          {trigger.fieldLabel} 满足条件「{trigger.operator} {trigger.expectedValue}」
                        </div>
                        <div className="mt-1 text-xs text-violet-700">
                          追加节点：{trigger.appendedStageNames.join('、') || '无'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50/80 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium text-amber-950">评审判断参考</div>
                    <div className="mt-1 text-sm text-amber-900">{packageRecommendation.summary}</div>
                    <div className="mt-1 text-xs text-amber-700">{simulationAssessment.environmentLabel} · {simulationAssessment.summary}</div>
                  </div>
                  <span className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-700">
                    供评审判断参考
                  </span>
                </div>

                <div className="mt-3 space-y-3">
                  <div className="rounded-md border border-amber-100 bg-white/85 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-medium text-amber-950">套餐建议</div>
                      <span className="rounded-full border border-amber-100 bg-amber-50/80 px-2 py-0.5 text-[11px] text-amber-800">
                        {packageRecommendation.reasons.length} 项参考
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {packageRecommendation.reasons.map(reason => (
                        <span key={reason} className="rounded-full border border-amber-100 bg-amber-50/80 px-2 py-1 text-xs text-amber-800">
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-md border border-violet-100 bg-white/90 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-medium text-violet-950">仿真预检</div>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        simulationAssessment.gateStatus === 'ready'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                      }`}>
                        {simulationAssessment.gateStatus === 'ready' ? '基本齐备' : '建议确认'}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {simulationAssessment.items.map(item => (
                        <div key={item.key} className="rounded-md border border-violet-100 bg-violet-50/40 px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium text-foreground">{item.label}</div>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              item.status === 'pass' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {item.status === 'pass' ? '已具备' : '待确认'}
                            </span>
                          </div>
                          <div className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {order.reviewComment && (
                <div className="mt-3 rounded-md border border-sky-200 bg-white/80 p-3">
                  <div className="text-xs font-medium text-sky-900">评审意见</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-sky-800">{order.reviewComment}</div>
                  {order.reviewedAt && (
                    <div className="mt-2 text-xs text-sky-700">处理时间：{order.reviewedAt}</div>
                  )}
                </div>
              )}
              {order.reviewStatus === 'rejected' && (
                <p className="mt-3 text-xs text-sky-700">
                  当前工单已退回至“待补充需求”，可根据评审意见调整后重新提交。
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {nodeStage === 'resource_itsm' && (
        <Card className="mb-6 border-slate-200 bg-slate-50/40">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">ITSM审批</div>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  当前处于正式审批阶段，审批通过后进入方案确认。
                </p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                order?.itsm?.status === 'rejected'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : orderStatus === 'processing'
                  ? 'border-sky-200 bg-sky-50 text-sky-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}>
                {itsmInfo.syncStatus}
              </span>
            </div>

            <div className="mt-3 grid gap-2.5 md:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                <div className="text-xs text-slate-500">当前审批状态</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">{itsmInfo.syncStatus}</div>
                <div className="mt-1 text-xs text-slate-500">门户将按同步结果更新后续阶段状态</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                <div className="text-xs text-slate-500">ITSM单号</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">{itsmInfo.ticketNo}</div>
                <div className="mt-1 text-xs text-slate-500">当前正式审批所对应的外部主单</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                <div className="text-xs text-slate-500">最近同步时间</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">{itsmInfo.lastSyncAt}</div>
                <div className="mt-1 text-xs text-slate-500">用于确认审批状态回传是否最新</div>
              </div>
            </div>

            <div className="mt-3 grid gap-2.5 md:grid-cols-[1.08fr,0.92fr]">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="text-xs font-medium text-slate-500">单据映射</div>
                <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-md border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                    <div className="text-[11px] text-slate-500">门户主单号</div>
                    <div className="mt-1 text-sm font-medium text-slate-900">{itsmInfo.portalSourceNo}</div>
                  </div>
                  <div className="rounded-md border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                    <div className="text-[11px] text-slate-500">ITSM审批单号</div>
                    <div className="mt-1 text-sm font-medium text-slate-900">{itsmInfo.ticketNo}</div>
                  </div>
                  <div className="rounded-md border border-slate-100 bg-slate-50/70 px-3 py-2.5 sm:col-span-2">
                    <div className="text-[11px] text-slate-500">审批意见 / 回传说明</div>
                    <div className="mt-1 text-sm font-medium text-slate-900">{itsmInfo.resultComment || '暂无回传说明'}</div>
                  </div>
                </div>
                <div className="mt-2.5 text-xs leading-6 text-slate-600">
                  审批退回后回到需求单调整；审批通过后自动进入方案确认。
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="text-xs font-medium text-slate-500">入口与同步</div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(itsmInfo.portalSourceNo);
                      } catch {}
                    }}
                  >
                    复制主单号
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyItsmPayload}>
                    复制申请摘要
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => itsmInfo.targetUrl && window.open(itsmInfo.targetUrl, '_blank', 'noopener,noreferrer')}
                    disabled={!itsmInfo.targetUrl}
                  >
                    {itsmInfo.targetUrl ? '打开 ITSM' : '暂无 ITSM 链接'}
                  </Button>
                </div>
                <div className="mt-2.5 rounded-md border border-slate-100 bg-slate-50/70 p-2.5">
                  <div className="text-[11px] font-medium text-slate-500">当前处理方式</div>
                  <div className="mt-2 space-y-2 text-xs leading-6 text-slate-600">
                    <p>门户侧只查看审批入口、状态和回传结果，不直接驱动 ITSM 流转。</p>
                    <p>ITSM 单号、链接和回传说明由运营侧维护后同步回来。</p>
                  </div>
                </div>
                <div className="mt-3 rounded-md border border-slate-100 bg-slate-50/70 p-2.5">
                  <div className="text-[11px] font-medium text-slate-500">同步记录</div>
                  <div className="mt-2.5 space-y-2">
                    {(order.itsm?.syncLogs || []).length === 0 ? (
                      <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">
                        暂无同步记录
                      </div>
                    ) : (
                      [...(order.itsm?.syncLogs || [])].reverse().map(log => (
                        <div key={log.id} className="rounded-md border border-slate-100 bg-white px-3 py-2.5 text-xs text-slate-700">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-slate-900">{getItsmActionLabel(log.action)} · {getItsmStatusLabel(log.status)}</span>
                            <span className="text-slate-500">{log.createdAt}</span>
                          </div>
                          <div className="mt-1">操作人：{log.actor}</div>
                          <div className="mt-1">状态：{log.fromStatus ? `${getItsmStatusLabel(log.fromStatus)} -> ${getItsmStatusLabel(log.status)}` : getItsmStatusLabel(log.status)}</div>
                          <div className="mt-1">单号：{log.ticketNo || '-'}</div>
                          <div className="mt-1">说明：{log.comment || '无'}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {nodeStage === 'delivery_plan' && (
        <Card className="mb-6 border-cyan-200 bg-cyan-50/50">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-cyan-900">正式实施方案</div>
                <p className="mt-1 text-xs leading-6 text-cyan-800">
                  核对交付范围、实施安排和配合事项，确认后进入实施。
                </p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                orderStatus === 'plan_confirming'
                  ? 'border-cyan-200 bg-white text-cyan-700'
                  : orderStatus === 'delivering' || orderStatus === 'completed' || orderStatus === 'confirmed' || orderStatus === 'archived'
                    ? 'border-emerald-200 bg-white text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600'
              }`}>
                {orderStatus === 'plan_confirming' ? '待用户确认' : orderStatus === 'delivering' || orderStatus === 'completed' || orderStatus === 'confirmed' || orderStatus === 'archived' ? '已确认' : '待生成方案'}
              </span>
            </div>

            <div className="mt-3 grid gap-2.5 md:grid-cols-4">
              <div className="rounded-lg border border-cyan-200 bg-white px-3 py-2.5">
                <div className="text-xs text-cyan-700">当前状态</div>
                <div className="mt-1 text-lg font-semibold text-cyan-950">
                  {orderStatus === 'plan_confirming' ? '等待确认' : orderStatus === 'delivering' || orderStatus === 'completed' || orderStatus === 'confirmed' || orderStatus === 'archived' ? '已确认' : '待输出方案'}
                </div>
                <div className="mt-1 text-xs text-cyan-700">确认通过后进入交付实施阶段</div>
              </div>
              <div className="rounded-lg border border-cyan-200 bg-white px-3 py-2.5">
                <div className="text-xs text-cyan-700">交付路径</div>
                <div className="mt-1 text-lg font-semibold text-cyan-950">{deliveryAcceptance?.deliveryPath === 'non_standard' ? '非标交付' : '标准交付'}</div>
                <div className="mt-1 text-xs text-cyan-700">由交付中心前台正式受理后判定</div>
              </div>
              <div className="rounded-lg border border-cyan-200 bg-white px-3 py-2.5">
                <div className="text-xs text-cyan-700">交付范围</div>
                <div className="mt-1 text-lg font-semibold text-cyan-950">{order.services?.length || 0} 项服务</div>
                <div className="mt-1 text-xs text-cyan-700">按当前需求单范围输出交付方案</div>
              </div>
              <div className="rounded-lg border border-cyan-200 bg-white px-3 py-2.5">
                <div className="text-xs text-cyan-700">预计交付周期</div>
                <div className="mt-1 text-lg font-semibold text-cyan-950">{formalPlan?.estimatedSchedule || portalPlan.estimatedTime || '-'}</div>
                <div className="mt-1 text-xs text-cyan-700">用于确认整体实施安排</div>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-cyan-200 bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-cyan-700">交付中心正式实施方案</div>
                  <div className="mt-1 text-sm leading-6 text-slate-900">
                    {formalPlan?.summary || portalPlan.summary || '交付中心正在整理正式实施方案。'}
                  </div>
                </div>
                <span className="rounded-full border border-cyan-100 bg-cyan-50 px-2.5 py-1 text-xs text-cyan-700">
                  {deliveryAcceptance?.acceptedBy || 'IPE交付中心'}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(deliveryAcceptance?.domains || []).map(domain => (
                  <span key={domain} className="rounded-full border border-cyan-100 bg-cyan-50/70 px-2 py-1 text-xs text-cyan-800">
                    {domain}
                  </span>
                ))}
              </div>
              {deliveryAcceptance?.deliveryPath === 'non_standard' && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3 md:col-span-2">
                    <div className="text-xs font-medium text-amber-900">非标原因</div>
                    <div className="mt-2 text-sm leading-6 text-amber-900">{deliveryAcceptance?.nonStandardReason || '暂无'}</div>
                  </div>
                  <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3">
                    <div className="text-xs font-medium text-amber-900">差异项</div>
                    <div className="mt-2 space-y-1.5">
                      {(deliveryAcceptance?.nonStandardDiffItems?.length ? deliveryAcceptance.nonStandardDiffItems : ['暂无']).map(item => (
                        <div key={item} className="text-xs leading-5 text-amber-900">- {item}</div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3">
                    <div className="text-xs font-medium text-amber-900">风险依赖</div>
                    <div className="mt-2 space-y-1.5">
                      {(deliveryAcceptance?.nonStandardRisks?.length ? deliveryAcceptance.nonStandardRisks : ['暂无']).map(item => (
                        <div key={item} className="text-xs leading-5 text-amber-900">- {item}</div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-md border border-cyan-100 bg-cyan-50/40 p-3 md:col-span-2">
                    <div className="text-xs font-medium text-cyan-900">协同能力域</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(deliveryAcceptance?.collaborationDomains?.length ? deliveryAcceptance.collaborationDomains : ['暂无']).map(item => (
                        <span key={item} className="rounded-full border border-cyan-100 bg-white px-2 py-1 text-xs text-slate-700">{item}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-3 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => toggleStageDetails('delivery_plan')}>
                  {expandedStageDetails.has('delivery_plan') ? '收起实施详情' : '展开实施详情'}
                </Button>
              </div>
              {expandedStageDetails.has('delivery_plan') && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border border-cyan-100 bg-cyan-50/40 p-3">
                    <div className="text-xs font-medium text-cyan-900">实施步骤</div>
                    <div className="mt-2 space-y-2">
                      {(formalPlan?.steps?.length ? formalPlan.steps : order.services.map(service => ({ name: service, owner: '交付中心', mode: 'hybrid' as const, output: `${service}交付结果` }))).map((step, index) => (
                        <div key={`${step.name}-${index}`} className="rounded-md border border-white bg-white px-3 py-2">
                          <div className="text-sm font-medium text-slate-900">{index + 1}. {step.name}</div>
                          <div className="mt-1 text-xs text-slate-600">责任方：{step.owner} · 方式：{step.mode === 'ai' ? '自动化' : step.mode === 'manual' ? '人工' : '人机协同'}</div>
                          <div className="mt-1 text-xs text-slate-500">产出：{step.output}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3">
                    <div className="rounded-md border border-cyan-100 bg-cyan-50/40 p-3">
                      <div className="text-xs font-medium text-cyan-900">前置条件</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(formalPlan?.prerequisites?.length ? formalPlan.prerequisites : ['架构评审已通过', 'ITSM / 资源审批已通过']).map(item => (
                          <span key={item} className="rounded-full border border-cyan-100 bg-white px-2 py-1 text-xs text-slate-700">{item}</span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3">
                      <div className="text-xs font-medium text-amber-900">风险与关注点</div>
                      <div className="mt-2 space-y-1.5">
                        {(formalPlan?.risks?.length ? formalPlan.risks : ['实施窗口和外部权限需提前确认']).map(item => (
                          <div key={item} className="text-xs leading-5 text-amber-900">- {item}</div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3">
                      <div className="text-xs font-medium text-emerald-900">交付产出</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(formalPlan?.deliverables?.length ? formalPlan.deliverables : order.services.map(service => `${service}交付资产`)).map(item => (
                          <span key={item} className="rounded-full border border-emerald-100 bg-white px-2 py-1 text-xs text-emerald-800">{item}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 rounded-lg border border-cyan-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {orderStatus === 'plan_confirming' ? '请确认本次实施方案' : '方案确认状态'}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-600">
                    {orderStatus === 'plan_confirming'
                      ? '确认后交付中心将按上述实施方案进入交付实施；如方案不符合预期，可反馈意见退回调整。'
                      : orderStatus === 'delivering' || orderStatus === 'completed' || orderStatus === 'confirmed' || orderStatus === 'archived'
                        ? '方案已确认，当前可继续查看后续交付与验收状态。'
                        : '交付中心正在整理实施方案，暂不需要操作。'}
                  </div>
                </div>
                {orderStatus === 'plan_confirming' ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setFeedbackOpen(true)}>反馈意见</Button>
                    <Button size="sm" onClick={confirmPlan}>确认方案</Button>
                  </div>
                ) : null}
              </div>
              {order.planFeedback && (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2.5">
                  <div className="text-xs font-medium text-amber-800">最近反馈</div>
                  <div className="mt-1 text-xs leading-5 text-amber-900">{order.planFeedback}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chain visualization for internet app */}
      {nodeStage === 'delivery_execute' && isInternetApp && chain && (
        <div className="mb-6">
          <NetworkChainProgress
            nodes={chain}
            domain={order.internetAppDetail!.domain}
          />
        </div>
      )}

      {nodeStage === 'delivery_execute' && atomicSpec && (deliveryStepSet || atomicSpec.deliveryOutputs?.length) && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">生产交付视图</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  展示当前服务的标准交付步骤与预期交付结果。
                </div>
              </div>
              {atomicSpec.supportedEnvironments?.length && (
                <div className="flex flex-wrap justify-end gap-2">
                  {atomicSpec.supportedEnvironments.map(env => (
                    <span key={env} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700">
                      {env}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {deliveryStepSet && (
              <div className="mt-4">
                <div className="text-sm font-medium text-foreground">交付步骤</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {deliveryStepSet.steps.map(step => (
                    <div key={step.stepCode} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium text-slate-900">{step.order}. {step.stepName}</div>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          step.mode === 'auto'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {step.mode === 'auto' ? '自动' : '人工'}
                        </span>
                      </div>
                      {step.outputKeys?.length ? (
                        <div className="mt-2 text-xs text-slate-500">
                          输出：{step.outputKeys.join(' / ')}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-slate-500">输出按步骤结果回填</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {atomicSpec.deliveryOutputs?.length ? (
              <div className="mt-4">
                <div className="text-sm font-medium text-foreground">交付产出</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {atomicSpec.deliveryOutputs.map(output => (
                    <div key={output.key} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                      <div className="text-xs text-slate-500">{output.label}</div>
                      <div className="mt-1 text-sm text-slate-900">{getAtomicOutputValue(atomicSpec, order, output.key) || '交付完成后回填'}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {nodeStage === 'acceptance_asset' && (
        <div className="space-y-6 mb-6">
          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardContent className="p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-emerald-950">{acceptanceCopy.title}</div>
                  <p className="mt-1 text-xs leading-6 text-emerald-900">
                    {acceptanceCopy.description}
                  </p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                  order.status === 'archived'
                    ? 'border-emerald-200 bg-white text-emerald-700'
                    : order.status === 'confirmed'
                      ? 'border-cyan-200 bg-white text-cyan-700'
                      : 'border-amber-200 bg-white text-amber-700'
                }`}>
                  {acceptanceCopy.badge}
                </span>
              </div>

              <div className="mt-3 grid gap-2.5 md:grid-cols-3">
                <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2.5">
                  <div className="text-xs text-emerald-700">交付服务</div>
                  <div className="mt-1 text-lg font-semibold text-emerald-950">{completedServiceCount}/{totalServiceCount}</div>
                  <div className="mt-1 text-xs text-emerald-700">已形成交付结果的服务数量</div>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2.5">
                  <div className="text-xs text-emerald-700">{acceptanceCopy.assetCountLabel}</div>
                  <div className="mt-1 text-lg font-semibold text-emerald-950">{acceptanceAssets.length}</div>
                  <div className="mt-1 text-xs text-emerald-700">按服务生成的资产/实例清单</div>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2.5">
                  <div className="text-xs text-emerald-700">归档状态</div>
                  <div className="mt-1 text-lg font-semibold text-emerald-950">
                    {acceptanceCopy.archiveLabel}
                  </div>
                  <div className="mt-1 text-xs text-emerald-700">验收通过后进入资产台账</div>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-emerald-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-emerald-950">{acceptanceCopy.listTitle}</div>
                    <div className="mt-1 text-xs text-emerald-700">优先展示本单已形成的实际交付资产；若尚未归档，则展示当前交付结果快照。</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toggleStageDetails('acceptance_asset')}>
                    {expandedStageDetails.has('acceptance_asset') ? '收起资产明细' : '展开资产明细'}
                  </Button>
                </div>
                {!expandedStageDetails.has('acceptance_asset') ? (
                  <div className="px-4 py-4 text-sm text-emerald-900">
                    当前共有 {acceptanceAssets.length} 项资产记录。点击“展开资产明细”查看规格、地址和接入信息。
                  </div>
                ) : acceptanceAssets.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">{acceptanceCopy.emptyText}</div>
                ) : (
                  <div className="divide-y divide-emerald-100">
                    {acceptanceAssets.map((asset, index) => {
                      const metaEntries = Object.entries(asset.assetMeta).slice(0, 4);
                      return (
                        <div key={asset.id} className="px-4 py-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-100 px-2 text-[11px] font-semibold text-emerald-700">
                                  {index + 1}
                                </span>
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                                  {asset.categoryLabel}
                                </span>
                                <span className="text-sm font-medium text-slate-900">{asset.assetName}</span>
                              </div>
                              <div className="mt-1 text-xs text-slate-500">{asset.serviceName}</div>
                            </div>
                            <div className="text-xs text-slate-500">
                              形成时间：{asset.deliveredAt || order.createdAt}
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                            {metaEntries.map(([key, value]) => (
                              <div key={`${asset.id}-${key}`} className="rounded-md border border-slate-200 bg-slate-50/70 px-3 py-2">
                                <div className="text-[11px] text-slate-500">{key}</div>
                                <div className="mt-1 text-sm text-slate-900 break-all">{value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <AIConfigPanel plan={portalPlan} title="交付结果概览" />
        </div>
      )}

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>反馈方案意见</DialogTitle>
            <DialogDescription>
              请填写本次退回原因，便于交付侧调整后重新提交方案。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="请输入具体调整意见"
              rows={5}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setFeedbackOpen(false)}>取消</Button>
              <Button size="sm" onClick={handleRejectPlan} disabled={!feedback.trim()}>
                提交反馈
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={timelineOpen} onOpenChange={setTimelineOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>节点时间记录</DialogTitle>
            <DialogDescription>
              用于回看工单在各业务阶段的流转情况，包括进入时间、完成时间和当前状态。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 max-h-[70vh] overflow-y-auto">
            {(order.workflowTimeline ?? []).map(node => (
              <div key={node.status} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[150px,1fr,1fr,120px]">
                <div>
                  <div className="text-sm font-medium text-foreground">{node.label}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {node.completedAt ? '已完成' : node.enteredAt ? '已进入' : '待开始'}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  <div>进入时间</div>
                  <div className="mt-1 text-foreground">{node.enteredAt || '-'}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  <div>完成时间</div>
                  <div className="mt-1 text-foreground">{node.completedAt || '-'}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  <div>阶段说明</div>
                  <div className="mt-1 text-foreground">
                    {node.completedAt
                      ? `本阶段已完成，历时 ${getWorkflowTimelineNodeDuration(node)}`
                      : node.enteredAt
                        ? `当前停留在本阶段，已持续 ${getWorkflowTimelineNodeDuration(node)}`
                        : '尚未进入该阶段'}
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-6 text-muted-foreground whitespace-pre-wrap">
              {buildWorkflowTimelineDetailSummary(order.workflowTimeline ?? []) || '暂无节点记录'}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={!!selectedNode} onOpenChange={open => !open && setSelectedNode(null)}>
        <SheetContent className="w-full max-w-2xl sm:max-w-2xl overflow-y-auto">
          {selectedNode && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedNode.title}</SheetTitle>
                <SheetDescription>
                  当前节点详情，用于展开查看更多责任、处理状态与节点记录。
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${nodeStatusClass(selectedNode.status)}`}>
                    {nodeStatusLabel(selectedNode.status)}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                    责任方：{selectedNode.owner}
                  </span>
                  {selectedNode.updatedAt && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                      最近更新：{selectedNode.updatedAt}
                    </span>
                  )}
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs font-medium text-slate-500">节点摘要</div>
                  <div className="mt-2 text-sm leading-6 text-slate-900">{selectedNode.summary}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-medium text-slate-500">节点明细</div>
                  <div className="mt-3 space-y-2">
                    {selectedNode.details.map((detail, index) => (
                      <div key={index} className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-sm text-slate-800">
                        {detail}
                      </div>
                    ))}
                  </div>
                </div>
                {selectedNode.tags?.length ? (
                  <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4">
                    <div className="text-xs font-medium text-violet-700">节点标签</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedNode.tags.map(tag => (
                        <span key={tag} className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-xs text-violet-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
