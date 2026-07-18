import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buildWorkflowTimelineDetailSummary, getWorkflowTimelineNodeDuration, deriveOrderPackageRecommendation, deriveOrderSimulationAssessment, StatusBadge, AIConfigPanel, NetworkChainProgress, WorkflowShell, normalizeLinearWorkflowStageNodes, deriveWorkflowStageStatus, hasReachedPlanStage, hasReachedDeliveryStage, hasReachedAcceptanceStage, isAcceptedOrArchived } from '@aiops/shared/workflow';
import { downloadInitiationFormExcel, downloadInitiationStageExcel, normalizeInitiationFieldLabel, buildPortalDeliveryPlanNodes, buildPortalAcceptanceAssetNodes } from '@aiops/shared';
import { getDeliveryStepSet, getSpec, getDeliveredAssetsByOrderId } from '@aiops/shared/store';
import { useOrder } from '@aiops/shared/hooks';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, Button, Card, CardContent, Progress, Textarea } from '@aiops/shared/ui';
import type { AtomicServiceSpec, ComboServiceSpec, DeliveryDetail, DeliveryImplementationPlan, DeliveryAcceptancePath } from '@aiops/shared';
import { DeliveredAssetsTable } from '../components/delivered-assets-table';

const statusSteps: { status: string; label: string }[] = [
  { status: 'pending', label: '待处理' },
  { status: 'reviewing', label: '评审中' },
  { status: 'processing', label: '处理中' },
  { status: 'plan_confirming', label: '待确认方案' },
  { status: 'delivering', label: '交付中' },
  { status: 'completed', label: '待验收' },
  { status: 'confirmed', label: '已验收' },
  { status: 'archived', label: '已归档' },
];

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

type StageKey = 'demand_review' | 'resource_itsm' | 'delivery_plan' | 'delivery_execute' | 'acceptance_asset';

interface StageNodeDetail {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'blocked';
  summary: string;
  owner: string;
  updatedAt?: string;
  tags?: string[];
  details: string[];
}

type StageNodeStatus = StageNodeDetail['status'];
type WorkflowStepMeta = { status: string; label: string };
type StageTimelineMeta = {
  stepCount: number;
  stageStatus: 'pending' | 'processing' | 'completed' | 'blocked';
  latestLabel: string;
  latestTime?: string;
  durationSummary: string;
};

const stageMeta: Array<{ key: StageKey; label: string }> = [
  { key: 'demand_review', label: '发起需求与架构评审' },
  { key: 'resource_itsm', label: 'ITSM审批' },
  { key: 'delivery_plan', label: '确认交付方案' },
  { key: 'delivery_execute', label: '交付实施' },
  { key: 'acceptance_asset', label: '验收与归档' },
];

const stageStatusGroups: Record<StageKey, WorkflowStepMeta[]> = {
  demand_review: [
    { status: 'pending', label: '待处理' },
    { status: 'reviewing', label: '评审中' },
  ],
  resource_itsm: [
    { status: 'processing', label: '处理中' },
  ],
  delivery_plan: [
    { status: 'plan_confirming', label: '待确认方案' },
  ],
  delivery_execute: [
    { status: 'delivering', label: '交付中' },
  ],
  acceptance_asset: [
    { status: 'completed', label: '待验收' },
    { status: 'confirmed', label: '已验收' },
    { status: 'archived', label: '已归档' },
  ],
};

function resolveStageFocusLabel(stageKey: StageKey, stageStatus: StageTimelineMeta['stageStatus'], orderStatus: string): string {
  if (stageStatus === 'pending') return '待处理';

  switch (stageKey) {
    case 'demand_review':
      return stageStatus === 'completed' ? '架构评审完成' : orderStatus === 'reviewing' ? '架构评审中' : '需求细化';
    case 'resource_itsm':
      return stageStatus === 'completed' ? 'ITSM完成' : 'ITSM审批';
    case 'delivery_plan':
      return stageStatus === 'completed' ? '方案确认完成' : orderStatus === 'plan_confirming' ? '待用户确认' : '交付方案';
    case 'delivery_execute':
      return stageStatus === 'completed' ? '交付完成' : '交付执行';
    case 'acceptance_asset':
      if (orderStatus === 'archived') return '资产归档';
      if (orderStatus === 'confirmed') return '验收通过';
      if (orderStatus === 'completed') return '待用户验收';
      return stageStatus === 'completed' ? '资产完成' : '验收处理中';
    default:
      return '处理中';
  }
}

function resolveStageByStatus(status: string): StageKey {
  switch (status) {
    case 'pending':
    case 'reviewing':
      return 'demand_review';
    case 'processing':
      return 'resource_itsm';
    case 'plan_confirming':
      return 'delivery_plan';
    case 'delivering':
      return 'delivery_execute';
    case 'completed':
    case 'confirmed':
    case 'archived':
      return 'acceptance_asset';
    default:
      return 'demand_review';
  }
}

function resolveActiveStage(status: string, itsmStatus?: string): StageKey {
  if (status === 'processing' && itsmStatus === 'approved') {
    return 'delivery_plan';
  }
  return resolveStageByStatus(status);
}

function nodeStatusLabel(status: StageNodeDetail['status']) {
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

function nodeStatusClass(status: StageNodeDetail['status']) {
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

function asStageNodeStatus(status: StageNodeStatus): StageNodeStatus {
  return status;
}

function stageOrderIndex(key: StageKey): number {
  return stageMeta.findIndex(stage => stage.key === key);
}

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [itsmTicketDraft, setItsmTicketDraft] = useState('');
  const [itsmUrlDraft, setItsmUrlDraft] = useState('');
  const [itsmCommentDraft, setItsmCommentDraft] = useState('');
  const [reviewCommentDraft, setReviewCommentDraft] = useState('');
  const [deliveryAcceptedByDraft, setDeliveryAcceptedByDraft] = useState('IPE交付中心');
  const [deliveryPathDraft, setDeliveryPathDraft] = useState<DeliveryAcceptancePath>('standard');
  const [deliveryDomainsDraft, setDeliveryDomainsDraft] = useState('');
  const [nonStandardReasonDraft, setNonStandardReasonDraft] = useState('');
  const [nonStandardDiffItemsDraft, setNonStandardDiffItemsDraft] = useState('');
  const [nonStandardRisksDraft, setNonStandardRisksDraft] = useState('');
  const [collaborationDomainsDraft, setCollaborationDomainsDraft] = useState('');
  const [planSummaryDraft, setPlanSummaryDraft] = useState('');
  const [planStepsDraft, setPlanStepsDraft] = useState('');
  const [planPrerequisitesDraft, setPlanPrerequisitesDraft] = useState('');
  const [planRisksDraft, setPlanRisksDraft] = useState('');
  const [planScheduleDraft, setPlanScheduleDraft] = useState('');
  const [planDeliverablesDraft, setPlanDeliverablesDraft] = useState('');
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [activeStage, setActiveStage] = useState<StageKey>('demand_review');
  const [selectedNode, setSelectedNode] = useState<StageNodeDetail | null>(null);
  const [notFoundGraceExpired, setNotFoundGraceExpired] = useState(false);
  const { order, isLoaded, updateStatus, updateServiceStatus, completeService, resetService, archive, submitForReview, approveCurrentApprovalStage, rejectCurrentApprovalStage, submitPlanForConfirmation, updateItsmTicketInfo, updateDeliveryAcceptance, updateChainNode, completeAllChain, startCurrentDeliveryStep, completeCurrentDeliveryStep } = useOrder(id || '');

  const spec = getSpec(order?.sourceSpecId || order?.comboId || '');
  const atomicSpec = spec?.type === 'atomic' ? spec as AtomicServiceSpec : undefined;
  const deliveryStepSet = useMemo(
    () => (atomicSpec?.deliveryStepSetId ? getDeliveryStepSet(atomicSpec.deliveryStepSetId) : undefined),
    [atomicSpec],
  );

  const orderStatus = order?.status || 'pending';
  const reviewStatus = order?.reviewStatus;
  const itsmStatus = order?.itsm?.status || 'not_created';
  const displayName = spec?.name || order?.comboName || '-';
  const packageRecommendation = useMemo(
    () => (order
      ? deriveOrderPackageRecommendation(order)
      : { summary: '工单尚未加载，暂无法生成推荐。', reasons: [] as string[] }),
    [order],
  );
  const simulationAssessment = useMemo(
    () => (order
      ? deriveOrderSimulationAssessment(order)
      : {
          environmentLabel: '工单尚未加载',
          summary: '加载工单后可查看仿真预检结论。',
          gateStatus: 'attention' as const,
        }),
    [order],
  );
  const currentStepIndex = statusSteps.findIndex(step => step.status === orderStatus);
  const progressValue = currentStepIndex >= 0 ? ((currentStepIndex + 1) / statusSteps.length) * 100 : 0;
  const deliveredAssets = useMemo(
    () => (order ? getDeliveredAssetsByOrderId(order.id) : []),
    [order],
  );
  const currentApprovalStage = order?.approvalStages?.find(stage => stage.status === 'processing');
  const currentDeliveryStep = order?.deliverySteps?.find(step => step.status === 'processing');
  const pendingAcceptanceAssets = order?.serviceProgress.filter(sp => sp.deliveryDetail) || [];
  const deliveryAcceptance = order?.deliveryAcceptance;
  const implementationPlan = deliveryAcceptance?.implementationPlan;
  const isReviewPending = orderStatus === 'pending' && reviewStatus !== 'rejected';
  const isReviewRejected = reviewStatus === 'rejected';
  const isReviewApproved = reviewStatus === 'approved';
  const canAcceptDelivery = orderStatus === 'processing' && itsmStatus === 'approved' && isReviewApproved;
  const canEditDeliveryPlan = orderStatus === 'processing' && (canAcceptDelivery || deliveryAcceptance?.status === 'plan_ready');
  const canSubmitDeliveryPlan = orderStatus === 'processing' && itsmStatus === 'approved' && deliveryAcceptance?.status === 'plan_ready';
  const hasDeliveryPlanReady = deliveryAcceptance?.status === 'plan_ready' && !!implementationPlan;
  const shouldShowDeliveryPlanReadonly = orderStatus === 'processing' || orderStatus === 'plan_confirming';

  const allServicesCompleted = order?.serviceProgress.every(sp => sp.status === 'completed') ?? false;

  const handleSubmitReview = () => {
    submitForReview();
  };

  const handleServiceAction = (serviceName: string) => {
    updateServiceStatus(serviceName, 'processing');
    setTimeout(() => {
      completeService(serviceName);
    }, 500);
  };

  const handleCompleteAll = () => {
    const names = (order?.serviceProgress || [])
      .filter(sp => sp.status !== 'completed')
      .map(sp => sp.name);
    names.forEach(name => completeService(name));
  };

  const handleConfirmDelivery = () => {
    updateStatus('completed');
  };

  const handleModifyService = (serviceName: string) => {
    resetService(serviceName);
  };

  const showServiceActions = orderStatus === 'delivering' || orderStatus === 'completed';

  const isInternetApp = !!order?.internetAppDetail;
  const chain = order?.internetAppDetail?.networkChain;
  const allChainCompleted = chain ? chain.every(n => n.status === 'completed') : false;

  const handleCompleteAllChain = () => {
    completeAllChain();
  };

  const handleApproveReview = () => {
    approveCurrentApprovalStage(reviewCommentDraft);
    setReviewCommentDraft('');
  };

  const handleRejectReview = () => {
    const trimmed = reviewCommentDraft.trim();
    if (!trimmed) {
      window.alert('请输入驳回意见');
      return;
    }
    rejectCurrentApprovalStage(trimmed);
    setReviewCommentDraft('');
  };

  const copyItsmPayload = async () => {
    if (!order) return;
    const payload = [
      `来源工单号: ${order.id}`,
      `需求名称: ${displayName}`,
      `服务清单: ${(order.services || []).join('、')}`,
      `环境: ${order.answers?.environment || order.answers?.targetEnv || '-'}`,
      `应用/系统: ${order.answers?.applicationName || order.answers?.appName || '-'} / ${order.answers?.system || '-'}`,
      `业务域: ${order.answers?.businessDomain || '-'}`,
      `资源摘要: ${(order.orchestratedPlan?.resources || []).map(resource => `${resource.name}(${Object.entries(resource.spec || {}).map(([key, value]) => `${key}=${value}`).join(', ')})`).join(' | ') || '-'}`,
      `评审意见: ${order.reviewComment || '-'}`,
      `ITSM链接: ${itsmUrlDraft.trim() || order?.itsm?.ticketUrl || '-'}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(payload);
      window.alert('已复制 ITSM 申请摘要');
    } catch {
      window.alert('复制失败，请检查浏览器权限');
    }
  };

  const handleItsmSubmit = (status: 'submitted' | 'processing' | 'approved' | 'rejected') => {
    updateItsmTicketInfo({
      ticketNo: itsmTicketDraft.trim() || order?.itsm?.ticketNo,
      ticketUrl: itsmUrlDraft.trim() || order?.itsm?.ticketUrl,
      status,
      resultComment: itsmCommentDraft.trim() || order?.itsm?.resultComment,
      actor: '运营中心',
    });
  };

  const splitDraftLines = (value: string) => value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);

  const buildImplementationPlanFromDraft = (): DeliveryImplementationPlan => {
    const stepLines = splitDraftLines(planStepsDraft);
    return {
      summary: planSummaryDraft.trim() || `${displayName}正式实施方案`,
      steps: (stepLines.length ? stepLines : (order?.services || [])).map((line, index) => ({
        name: line.replace(/^\d+[.、]\s*/, ''),
        owner: index === 0 ? 'IPE交付中心' : '能力域交付工程师',
        mode: 'hybrid',
        output: `${line.replace(/^\d+[.、]\s*/, '')}交付结果`,
      })),
      prerequisites: splitDraftLines(planPrerequisitesDraft),
      risks: splitDraftLines(planRisksDraft),
      estimatedSchedule: planScheduleDraft.trim() || order?.orchestratedPlan?.estimatedTime || '1-3 个工作日',
      deliverables: splitDraftLines(planDeliverablesDraft),
    };
  };

  const handleSaveDeliveryAcceptance = (submitAfterSave = false) => {
    if (!order) return;
    if (!canAcceptDelivery && deliveryAcceptance?.status !== 'plan_ready') {
      window.alert('请先回填 ITSM / 资源审批通过，再由交付中心前台正式受理。');
      return;
    }

    const plan = buildImplementationPlanFromDraft();
    if (!plan.summary.trim() || plan.steps.length === 0) {
      window.alert('请至少填写实施方案摘要和实施步骤。');
      return;
    }

    updateDeliveryAcceptance({
      status: 'plan_ready',
      acceptedBy: deliveryAcceptedByDraft,
      deliveryPath: deliveryPathDraft,
      domains: deliveryDomainsDraft.split(/[、,\n]/).map(item => item.trim()).filter(Boolean),
      nonStandardReason: deliveryPathDraft === 'non_standard' ? nonStandardReasonDraft : undefined,
      nonStandardDiffItems: deliveryPathDraft === 'non_standard' ? nonStandardDiffItemsDraft.split(/[、,\n]/).map(item => item.trim()).filter(Boolean) : undefined,
      nonStandardRisks: deliveryPathDraft === 'non_standard' ? nonStandardRisksDraft.split(/[、,\n]/).map(item => item.trim()).filter(Boolean) : undefined,
      collaborationDomains: deliveryPathDraft === 'non_standard' ? collaborationDomainsDraft.split(/[、,\n]/).map(item => item.trim()).filter(Boolean) : undefined,
      implementationPlan: plan,
    });

    if (submitAfterSave) {
      setTimeout(() => submitPlanForConfirmation(), 0);
    }
  };

  useEffect(() => {
    setActiveStage(resolveActiveStage(orderStatus, itsmStatus));
  }, [itsmStatus, orderStatus]);

  useEffect(() => {
    setItsmTicketDraft(order?.itsm?.ticketNo || '');
    setItsmUrlDraft(order?.itsm?.ticketUrl || '');
    setItsmCommentDraft(order?.itsm?.resultComment || '');
  }, [order?.itsm?.resultComment, order?.itsm?.ticketNo, order?.itsm?.ticketUrl]);

  useEffect(() => {
    setDeliveryAcceptedByDraft(deliveryAcceptance?.acceptedBy || 'IPE交付中心');
    setDeliveryPathDraft(deliveryAcceptance?.deliveryPath || 'standard');
    setDeliveryDomainsDraft(deliveryAcceptance?.domains?.join('、') || '');
    setNonStandardReasonDraft(deliveryAcceptance?.nonStandardReason || '');
    setNonStandardDiffItemsDraft(deliveryAcceptance?.nonStandardDiffItems?.join('\n') || '');
    setNonStandardRisksDraft(deliveryAcceptance?.nonStandardRisks?.join('\n') || '');
    setCollaborationDomainsDraft(deliveryAcceptance?.collaborationDomains?.join('、') || '');
    setPlanSummaryDraft(implementationPlan?.summary || '');
    setPlanStepsDraft(implementationPlan?.steps?.map((step, index) => `${index + 1}. ${step.name}`).join('\n') || '');
    setPlanPrerequisitesDraft(implementationPlan?.prerequisites?.join('\n') || '');
    setPlanRisksDraft(implementationPlan?.risks?.join('\n') || '');
    setPlanScheduleDraft(implementationPlan?.estimatedSchedule || order?.orchestratedPlan?.estimatedTime || '');
    setPlanDeliverablesDraft(implementationPlan?.deliverables?.join('\n') || '');
  }, [deliveryAcceptance?.acceptedAt, deliveryAcceptance?.acceptedBy, deliveryAcceptance?.deliveryPath, deliveryAcceptance?.domains, deliveryAcceptance?.nonStandardReason, deliveryAcceptance?.nonStandardDiffItems, deliveryAcceptance?.nonStandardRisks, deliveryAcceptance?.collaborationDomains, implementationPlan, order?.orchestratedPlan?.estimatedTime]);

  useEffect(() => {
    setNotFoundGraceExpired(false);
    if (!isLoaded || order) return;
    const timer = window.setTimeout(() => {
      setNotFoundGraceExpired(true);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [id, isLoaded, order]);

  const demandReviewNodes = useMemo<StageNodeDetail[]>(() => {
    const nodes: StageNodeDetail[] = [
      {
        id: 'demand-form',
        title: '需求细化单',
        status: isReviewRejected ? 'blocked' : isReviewPending ? 'processing' : 'completed',
        summary: `当前需求内容已形成申请主单，后续资源申请必须来源于本单。`,
        owner: '申请人',
        updatedAt: order?.createdAt,
        tags: ['需求输入', '评审来源'],
        details: [
          `主单名称：${displayName}`,
          `创建时间：${order?.createdAt || '未记录'}`,
          `表单版本：${order?.formSchemaVersion || '未记录'}`,
          '当前原型阶段默认支持需求细化、评审材料导出以及后续资源申请来源固化。',
        ],
      },
      {
        id: 'arch-review',
        title: '架构评审',
        status: reviewStatus === 'approved' ? 'completed' : orderStatus === 'reviewing' ? 'processing' : reviewStatus === 'rejected' ? 'blocked' : 'pending',
        summary: reviewStatus === 'approved'
          ? '架构评审已通过，可进入后续资源申请阶段。'
          : reviewStatus === 'rejected'
            ? `评审已退回：${order?.reviewComment || '请根据意见调整后重提。'}`
            : currentApprovalStage
              ? `当前处理节点：${currentApprovalStage.stageName}`
              : '待提交架构评审。',
        owner: currentApprovalStage?.role || '架构组',
        updatedAt: order?.reviewedAt || currentApprovalStage?.updatedAt,
        tags: order?.approvalStages?.length ? order.approvalStages.map(stage => stage.stageName) : ['标准评审'],
        details: [
          `评审状态：${reviewStatus === 'approved' ? '通过' : reviewStatus === 'rejected' ? '退回修改' : orderStatus === 'reviewing' ? '评审中' : '待发起'}`,
          order?.reviewComment ? `最近意见：${order.reviewComment}` : '最近意见：暂无',
          `审批路径：${order?.approvalStages?.map(stage => stage.stageName).join(' -> ') || '标准评审路径'}`,
        ],
      },
    ];
    return nodes;
  }, [currentApprovalStage, displayName, isReviewPending, isReviewRejected, order, orderStatus, reviewStatus]);

  const resourceItsmNodes = useMemo<StageNodeDetail[]>(() => {
    return [
      {
        id: 'resource-request',
        title: '发起资源申请',
        status: isReviewApproved
          ? (itsmStatus === 'not_created' ? 'processing' : ['submitted', 'processing', 'approved', 'rejected', 'closed'].includes(itsmStatus) ? 'completed' : 'processing')
          : isReviewRejected
            ? 'blocked'
            : 'pending',
        summary: isReviewApproved
          ? itsmStatus === 'rejected'
            ? 'ITSM 审批已退回，需回到来源主单补充或调整后重新发起资源申请。'
            : '当前需求细化单已具备正式发起资源申请资格，申请内容不可脱离来源主单。'
          : isReviewRejected
            ? '架构评审已退回，待调整后重新发起资源申请。'
            : '架构评审通过后，才允许正式发起资源申请。',
        owner: '申请人',
        updatedAt: order?.itsm?.submittedAt || order?.reviewedAt || order?.createdAt,
        tags: ['来源锁定', '正式申请'],
        details: [
          '资源申请阶段不再生成额外草案，直接基于当前需求细化单发起。',
          '若 ITSM 审批退回，需回到原需求细化单继续修改后再次发起。',
          `主单来源：${order?.id || '-'}`,
        ],
      },
      {
        id: 'itsm-review',
        title: 'ITSM审批',
        status: itsmStatus === 'approved'
          ? 'completed'
          : itsmStatus === 'rejected'
            ? 'blocked'
            : (itsmStatus === 'submitted' || itsmStatus === 'processing')
              ? 'processing'
              : isReviewApproved
                ? 'processing'
                : 'pending',
        summary: itsmStatus === 'approved'
          ? 'ITSM 主单审批已通过，已具备进入交付中心前台正式受理的条件。'
          : itsmStatus === 'rejected'
            ? `ITSM 主单审批已驳回：${order?.itsm?.resultComment || '请补充或调整后重新提交。'}`
            : (itsmStatus === 'submitted' || itsmStatus === 'processing')
              ? '当前建议采用复制申请数据并跳转 ITSM 发单，审批状态定时回传到本系统。'
              : isReviewApproved
                ? '架构评审已通过，待发起 ITSM 审批。'
                : '等待架构评审通过后发起 ITSM。',
        owner: 'ITSM',
        updatedAt: order?.itsm?.lastSyncedAt || order?.reviewedAt || order?.createdAt,
        tags: ['主单审批', '子单内聚'],
        details: [
          '当前设计中，外部子单统一归并到 ITSM 审批阶段展示，不单独拆成主阶段。',
          '建议页面提供：复制数据、跳转 ITSM、录入/回填单号、定时回传状态。',
          '后续如接入真实 ITSM，可在该节点详情中扩展展示审批节点与子单状态。',
        ],
      },
    ];
  }, [isReviewApproved, isReviewRejected, itsmStatus, order]);

  const deliveryPlanNodes = useMemo<StageNodeDetail[]>(
    () =>
      buildPortalDeliveryPlanNodes({
        orderStatus,
        orderPlanFeedback: order?.planFeedback,
        orderPlanFeedbackAt: order?.planFeedbackAt,
        itsmLastSyncAt: order?.itsm?.lastSyncedAt,
        estimatedTime: order?.orchestratedPlan?.estimatedTime,
        deliveryAcceptance,
      }).map(node => (
        node.id === 'plan-provide'
          ? {
              ...node,
              status: hasDeliveryPlanReady || hasReachedPlanStage(orderStatus)
                ? 'completed'
                : canAcceptDelivery
                  ? 'processing'
                  : itsmStatus === 'rejected'
                    ? 'blocked'
                    : 'pending',
              summary: hasDeliveryPlanReady || hasReachedPlanStage(orderStatus)
                ? '交付方案已产出并进入用户确认或后续执行。'
                : canAcceptDelivery
                  ? 'ITSM 审批通过后，交付窗口整理交付范围、依赖与时间计划。'
                  : itsmStatus === 'rejected'
                    ? 'ITSM 审批未通过，暂不能整理正式交付方案。'
                    : '等待 ITSM 审批通过后进入交付方案整理。',
              details: [
                '交付方案应覆盖交付范围、步骤、外部依赖、风险与用户配合事项。',
                order?.planFeedback ? `最近反馈：${order.planFeedback}` : '最近反馈：暂无',
              ],
            }
          : {
              ...node,
              summary: orderStatus === 'plan_confirming'
                ? '等待用户确认交付方案，确认后才能进入交付执行。'
                : hasReachedDeliveryStage(orderStatus)
                  ? '用户已确认交付方案。'
                  : '交付方案尚未进入确认阶段。',
              details: [
                '该节点不是传统审批，而是关键确认点。',
                '确认结果建议管理为：确认通过 / 退回调整。',
              ],
            }
      )),
    [canAcceptDelivery, deliveryAcceptance, hasDeliveryPlanReady, itsmStatus, order?.itsm?.lastSyncedAt, order?.orchestratedPlan?.estimatedTime, order?.planFeedback, order?.planFeedbackAt, orderStatus],
  );

  const deliveryExecuteNodes = useMemo<StageNodeDetail[]>(() => {
    const stepNodes = (order?.deliverySteps || []).map(step => ({
      id: `delivery-${step.stepCode}`,
      title: step.stepName,
      status: asStageNodeStatus(step.status === 'completed' ? 'completed' : step.status === 'processing' ? 'processing' : 'pending'),
      summary: step.outputKeys?.length ? `输出字段：${step.outputKeys.join(' / ')}` : '完成后回填交付结果。',
      owner: step.mode === 'auto' ? '平台自动化' : '交付窗口',
      updatedAt: step.updatedAt,
      tags: [step.mode === 'auto' ? '自动' : '人工'],
      details: [
        `步骤顺序：${step.order}`,
        `执行模式：${step.mode === 'auto' ? '自动' : '人工'}`,
        `最近更新：${step.updatedAt || '未开始'}`,
      ],
    }));

    return stepNodes.length > 0 ? stepNodes : [
      {
        id: 'delivery-exec',
        title: '交付执行',
        status: orderStatus === 'delivering' ? 'processing' : hasReachedAcceptanceStage(orderStatus) ? 'completed' : 'pending',
        summary: '当前场景暂无细粒度交付步骤，后续可按场景模板扩展。',
        owner: '交付窗口',
        updatedAt: order?.createdAt,
        details: ['当前订单尚未配置细粒度交付步骤。'],
      },
    ];
  }, [order, orderStatus]);

  const acceptanceAssetNodes = useMemo<StageNodeDetail[]>(
    () =>
      buildPortalAcceptanceAssetNodes({
        orderStatus,
        orderCreatedAt: order?.createdAt,
        orderArchivedAt: order?.archivedAt,
        assetCount: pendingAcceptanceAssets.length,
      }).map(node => (
        node.id === 'asset-preview'
          ? {
              ...node,
              title: '交付资产',
              summary: pendingAcceptanceAssets.length > 0
                ? `当前已形成 ${pendingAcceptanceAssets.length} 项交付资产，状态${orderStatus === 'archived' ? '已归档' : orderStatus === 'confirmed' ? '已验收' : '待验收'}。`
                : '交付资产将在执行结果产生后逐步形成。',
              details: [
                '交付资产不等到归档才出现，执行阶段即可生成。',
                '验收前建议以“待验收”状态管理，验收通过后再归档锁定。',
              ],
            }
          : {
              ...node,
              summary: orderStatus === 'completed'
                ? '交付已完成，等待用户验收。'
                : orderStatus === 'confirmed'
                  ? '用户已验收通过，等待归档。'
                  : orderStatus === 'archived'
                    ? '资产已归档锁定。'
                    : '尚未进入验收阶段。',
              updatedAt: order?.archivedAt || order?.reviewedAt,
            }
      )),
    [order?.archivedAt, order?.createdAt, order?.reviewedAt, orderStatus, pendingAcceptanceAssets.length],
  );

  const stageNodes = useMemo<Record<StageKey, StageNodeDetail[]>>(() => ({
    demand_review: normalizeLinearWorkflowStageNodes(demandReviewNodes),
    resource_itsm: normalizeLinearWorkflowStageNodes(resourceItsmNodes),
    delivery_plan: normalizeLinearWorkflowStageNodes(deliveryPlanNodes),
    delivery_execute: normalizeLinearWorkflowStageNodes(deliveryExecuteNodes),
    acceptance_asset: normalizeLinearWorkflowStageNodes(acceptanceAssetNodes),
  }), [acceptanceAssetNodes, deliveryExecuteNodes, deliveryPlanNodes, demandReviewNodes, resourceItsmNodes]);

  const currentStageNodes = stageNodes[activeStage];

  const stageTimelineMeta = useMemo<Record<StageKey, StageTimelineMeta>>(() => {
    const timeline = order?.workflowTimeline ?? [];
    const result = {} as Record<StageKey, StageTimelineMeta>;
    const currentStageKey = resolveActiveStage(orderStatus, itsmStatus);
    const currentStageIndex = stageOrderIndex(currentStageKey);

    stageMeta.forEach((stage) => {
      const groupedSteps = stageStatusGroups[stage.key];
      const nodes = stageNodes[stage.key];
      const timelineNodes = groupedSteps
        .map(step => ({
          meta: step,
          node: timeline.find(item => item.status === step.status),
        }))
        .filter(item => item.node);
      const activeTimelineNode =
        timelineNodes.find(item => !item.node?.completedAt)?.node;
      const latestCompletedTimelineNode =
        [...timelineNodes].reverse().find(item => item.node?.completedAt)?.node;
      const latestTimelineNode = activeTimelineNode || latestCompletedTimelineNode;
      const ownStageStatus = deriveWorkflowStageStatus(nodes);
      const stageIndex = stageOrderIndex(stage.key);
      const stageStatus =
        stageIndex < currentStageIndex
          ? (ownStageStatus === 'blocked' ? 'blocked' : 'completed')
          : stageIndex > currentStageIndex
            ? 'pending'
            : ownStageStatus;

      result[stage.key] = {
        stepCount: nodes.length,
        stageStatus,
        latestLabel: resolveStageFocusLabel(stage.key, stageStatus, orderStatus),
        latestTime: latestTimelineNode?.completedAt || latestTimelineNode?.enteredAt,
        durationSummary: latestTimelineNode ? getWorkflowTimelineNodeDuration(latestTimelineNode) : '-',
      };
    });

    return result;
  }, [itsmStatus, order?.workflowTimeline, orderStatus, stageNodes]);

  const furthestReachedStageIndex = useMemo(() => {
    const reachedIndexes = stageMeta
      .map((stage, index) => ({ index, status: stageTimelineMeta[stage.key]?.stageStatus }))
      .filter(item => item.status && item.status !== 'pending')
      .map(item => item.index);
    return reachedIndexes.length ? Math.max(...reachedIndexes) : 0;
  }, [stageTimelineMeta]);

  const stageSummary = useMemo(() => {
    switch (activeStage) {
      case 'demand_review':
        return {
          title: '发起需求与架构评审',
          summary: reviewStatus === 'approved'
            ? '需求信息已补充完成并通过架构评审，可进入正式审批。'
            : orderStatus === 'reviewing'
              ? `当前正在补充需求并进行架构评审，${currentApprovalStage ? `处理节点：${currentApprovalStage.stageName}` : '等待评审反馈。'}`
              : '先补充需求信息并完成架构评审，通过后才能进入 ITSM 审批。',
        };
      case 'resource_itsm':
        return {
          title: 'ITSM审批',
          summary: itsmStatus === 'approved'
            ? 'ITSM 审批已完成，当前进入交付中心前台正式受理与方案编制。'
            : reviewStatus === 'approved'
              ? '基于已通过的需求单发起正式审批，并同步 ITSM 处理状态。'
              : '只有需求评审通过后，才能进入 ITSM 审批。',
        };
      case 'delivery_plan':
        return {
          title: '确认交付方案',
          summary: itsmStatus === 'approved'
            ? '交付中心前台正式受理后，明确标准/非标路径、能力域和实施方案，再提交用户确认。'
            : '交付方提交实施方案，申请人确认后才进入实际交付。',
        };
      case 'delivery_execute':
        return {
          title: '交付实施',
          summary: currentDeliveryStep
            ? `当前执行步骤：${currentDeliveryStep.stepName}`
            : '按确认后的方案执行交付，并逐步形成待验收资产。',
        };
      case 'acceptance_asset':
        return {
          title: '验收与归档',
          summary: pendingAcceptanceAssets.length > 0
            ? `当前已有 ${pendingAcceptanceAssets.length} 项待验收资产，验收通过后进入归档。`
            : '申请人完成验收后，交付资产归档进入台账。',
        };
      default:
        return { title: '', summary: '' };
    }
  }, [activeStage, currentApprovalStage, currentDeliveryStep, itsmStatus, orderStatus, pendingAcceptanceAssets.length, reviewStatus]);

  const currentStageIndex = stageOrderIndex(resolveActiveStage(orderStatus, itsmStatus));
  const activeStageIndex = stageOrderIndex(activeStage);
  const isFutureStage = activeStageIndex > furthestReachedStageIndex;
  const centerStageCards = stageMeta.map((stage, index) => {
    const meta = stageTimelineMeta[stage.key];
    return {
      key: stage.key,
      index,
      label: stage.label,
      status: meta.stageStatus,
      metaPrimary: meta.latestLabel,
      metaSecondary: meta.durationSummary,
      footerLeft: meta.latestTime ? meta.latestTime : '暂无记录',
      footerRight: `${meta.stepCount} 节点`,
      active: activeStage === stage.key,
      reached: activeStage === stage.key || index <= currentStageIndex || meta.stageStatus !== 'pending' || index <= furthestReachedStageIndex,
      onClick: () => setActiveStage(stage.key),
    };
  });
  const centerNodeCards = currentStageNodes.map(node => ({
    ...node,
    onClick: () => setSelectedNode(node),
  }));
  const activeCenterNode = selectedNode && currentStageNodes.some(node => node.id === selectedNode.id)
    ? selectedNode
    : currentStageNodes[0] || null;
  const centerNodeDetailContent = !isFutureStage && activeCenterNode ? (() => {
    if (activeStage === 'resource_itsm') {
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">{activeCenterNode.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{activeCenterNode.summary}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setSelectedNode(activeCenterNode)}>
              查看更多
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <div className="rounded-md border border-slate-100 bg-slate-50/70 px-3 py-2.5">
              <div className="text-[11px] text-slate-500">ITSM单号</div>
              <div className="mt-1 text-sm font-medium text-slate-900">{itsmTicketDraft || '-'}</div>
            </div>
            <div className="rounded-md border border-slate-100 bg-slate-50/70 px-3 py-2.5">
              <div className="text-[11px] text-slate-500">当前状态</div>
              <div className="mt-1 text-sm font-medium text-slate-900">{getItsmStatusLabel(itsmStatus)}</div>
            </div>
            <div className="rounded-md border border-slate-100 bg-slate-50/70 px-3 py-2.5">
              <div className="text-[11px] text-slate-500">回填说明</div>
              <div className="mt-1 text-sm font-medium text-slate-900">{itsmCommentDraft || '暂无'}</div>
            </div>
          </div>
        </div>
      );
    }

    if (activeStage === 'delivery_plan') {
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">{activeCenterNode.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{activeCenterNode.summary}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setSelectedNode(activeCenterNode)}>
              查看更多
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <div className="rounded-md border border-cyan-100 bg-cyan-50/70 px-3 py-2.5">
              <div className="text-[11px] text-cyan-700">方案状态</div>
              <div className="mt-1 text-sm font-medium text-cyan-950">{orderStatus === 'plan_confirming' ? '待用户确认' : '方案已生成'}</div>
            </div>
            <div className="rounded-md border border-cyan-100 bg-cyan-50/70 px-3 py-2.5">
              <div className="text-[11px] text-cyan-700">服务范围</div>
              <div className="mt-1 text-sm font-medium text-cyan-950">{order?.services?.length || 0} 项服务</div>
            </div>
            <div className="rounded-md border border-cyan-100 bg-cyan-50/70 px-3 py-2.5">
              <div className="text-[11px] text-cyan-700">最近反馈</div>
              <div className="mt-1 text-sm font-medium text-cyan-950">{order?.planFeedback || '暂无'}</div>
            </div>
          </div>
        </div>
      );
    }

    if (activeStage === 'acceptance_asset') {
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">{activeCenterNode.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{activeCenterNode.summary}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setSelectedNode(activeCenterNode)}>
              查看更多
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <div className="rounded-md border border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
              <div className="text-[11px] text-emerald-700">验收状态</div>
              <div className="mt-1 text-sm font-medium text-emerald-950">{order?.status === 'archived' ? '已归档' : order?.status === 'confirmed' ? '已验收' : '待验收'}</div>
            </div>
            <div className="rounded-md border border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
              <div className="text-[11px] text-emerald-700">资产数量</div>
              <div className="mt-1 text-sm font-medium text-emerald-950">{deliveredAssets.length || pendingAcceptanceAssets.length} 项</div>
            </div>
            <div className="rounded-md border border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
              <div className="text-[11px] text-emerald-700">归档时间</div>
              <div className="mt-1 text-sm font-medium text-emerald-950">{order?.archivedAt || '尚未归档'}</div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-foreground">{activeCenterNode.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{activeCenterNode.summary}</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setSelectedNode(activeCenterNode)}>
            查看更多
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${nodeStatusClass(activeCenterNode.status)}`}>
            {nodeStatusLabel(activeCenterNode.status)}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
            责任方：{activeCenterNode.owner}
          </span>
          {activeCenterNode.updatedAt ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
              最近更新：{activeCenterNode.updatedAt}
            </span>
          ) : null}
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {activeCenterNode.details.slice(0, 4).map((detail, index) => (
            <div key={index} className="rounded-md border border-slate-100 bg-slate-50/70 px-3 py-2 text-sm text-slate-800">
              {detail}
            </div>
          ))}
        </div>
        {activeCenterNode.tags?.length ? (
          <div className="flex flex-wrap gap-2">
            {activeCenterNode.tags.map(tag => (
              <span key={tag} className="rounded-full border border-violet-200 bg-violet-50/70 px-2.5 py-1 text-xs text-violet-700">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );
  })() : null;

  if (!isLoaded) {
    return (
      <div className="w-full py-6">
        <div className="animate-pulse space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-7 w-72 rounded-md bg-slate-100" />
              <div className="h-4 w-52 rounded-md bg-slate-100" />
            </div>
            <div className="h-9 w-24 rounded-lg bg-slate-100" />
          </div>
          <div className="h-28 rounded-2xl bg-slate-100" />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
            <div className="space-y-4">
              <div className="h-80 rounded-2xl bg-slate-100" />
              <div className="h-64 rounded-2xl bg-slate-100" />
            </div>
            <div className="space-y-4">
              <div className="h-48 rounded-2xl bg-slate-100" />
              <div className="h-48 rounded-2xl bg-slate-100" />
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
            刚提交或刚切换过环境的工单会优先从本地读取，并等待同步结果回传。
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
        <Button variant="outline" className="mt-4" onClick={() => navigate('/orders')}>返回</Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-semibold">{displayName}</h1>
            <StatusBadge status={order.status} />
          </div>
          <span className="text-xs text-muted-foreground font-mono">{order.id}</span>
        </div>
        <div className="flex gap-2">
          {order.status === 'confirmed' && (
            <Button size="sm" variant="outline" onClick={archive}>归档</Button>
          )}
          {isInternetApp && order.status === 'delivering' && !allChainCompleted && (
            <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700" onClick={handleCompleteAllChain}>
              ⚡ 一键自动化编排&amp;交付
            </Button>
          )}
          {isInternetApp && order.status === 'delivering' && allChainCompleted && (
            <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleConfirmDelivery}>
              ✅ 确认交付完成
            </Button>
          )}
          {order.status === 'pending' && (
            <Button size="sm" onClick={handleSubmitReview}>提交评审</Button>
          )}
          {order.status === 'reviewing' && (
            <span className="text-xs text-sky-700 font-medium px-3 py-1.5 bg-sky-50 rounded-md">
              评审中{currentApprovalStage ? `，当前节点：${currentApprovalStage.stageName}` : '，需确认资源边界、风险和业务必要性'}
            </span>
          )}
          {order.status === 'processing' && (
            <span className="text-xs text-sky-700 font-medium px-3 py-1.5 bg-sky-50 rounded-md">
              {canSubmitDeliveryPlan ? '实施方案已形成，可提交用户确认' : itsmStatus === 'approved' ? '审批已通过，当前进入交付中心前台正式受理与方案编制' : 'ITSM / 资源审批中'}
            </span>
          )}
          {order.status === 'plan_confirming' && (
            <span className="text-xs text-cyan-700 font-medium px-3 py-1.5 bg-cyan-50 rounded-md">方案已提交，等待用户确认或反馈</span>
          )}
          {order.status === 'delivering' && !allServicesCompleted && (
            <Button size="sm" onClick={handleCompleteAll}>一键自动编排&交付</Button>
          )}
          {order.status === 'delivering' && allServicesCompleted && (
            <Button size="sm" onClick={handleConfirmDelivery}>确认交付完成</Button>
          )}
          {order.status === 'completed' && (
            <span className="text-xs text-success font-medium px-3 py-1.5 bg-success-light rounded-md">交付完成，等待门户确认验收</span>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate('/orders')}>&#8592; 返回</Button>
        </div>
      </div>

      <WorkflowShell
        progressValue={progressValue}
        onOpenTimeline={() => setTimelineOpen(true)}
        stageCards={centerStageCards}
        summaryTitle={stageSummary.title}
        summaryText={stageSummary.summary}
        summaryTag="当前阶段"
        futureNotice={isFutureStage ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-4">
            <div className="text-sm font-medium text-slate-700">该阶段尚未开始</div>
            <div className="mt-1 text-xs leading-6 text-slate-500">
              当前仍处于“{stageMeta[currentStageIndex]?.label || '当前阶段'}”。前序阶段完成后，再进入本阶段处理与确认。
            </div>
          </div>
        ) : null}
        nodeSection={!isFutureStage ? {
          title: '阶段节点',
          description: '先看当前阶段的处理记录，再看该阶段的处理内容，顺序会更接近真实流转。',
          badge: `${centerNodeCards.length} 节点`,
          railTitle: stageMeta.find(stage => stage.key === activeStage)?.label || '当前阶段',
          railDescription: `当前展示该阶段的节点明细，可直接点开查看详情。`,
          nodes: centerNodeCards,
        } : undefined}
        nodeDetail={centerNodeDetailContent}
      />

      {!isFutureStage && activeStage === 'demand_review' && (
        <Card className="mt-4 border-slate-200 bg-white">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">发起表单与阶段详情</div>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  运营侧可直接查看申请人提交的发起表单、AI 分析摘要和发起阶段材料，无需切回门户侧。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => order && downloadInitiationFormExcel(order)}>
                  导出发起表单
                </Button>
                <Button variant="outline" size="sm" onClick={() => order && downloadInitiationStageExcel(order)}>
                  导出发起阶段详情
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
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

          {!isFutureStage && activeStage === 'demand_review' && (
            <div className="mt-4 space-y-3">
              <div>
                <AIConfigPanel plan={order.orchestratedPlan} title="AI辅助分析建议" />
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium text-amber-950">评审参考</div>
                    <div className="mt-1 text-sm text-amber-900">{packageRecommendation.summary}</div>
                  </div>
                  <span className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-700">
                    AI辅助分析
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {packageRecommendation.reasons.map(reason => (
                    <span key={reason} className="rounded-full border border-amber-100 bg-white/90 px-2 py-1 text-xs text-amber-800">
                      {reason}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium text-violet-950">仿真预检</div>
                    <div className="mt-1 text-sm text-violet-900">{simulationAssessment.environmentLabel}</div>
                    <div className="mt-1 text-xs text-violet-700">{simulationAssessment.summary}</div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                    simulationAssessment.gateStatus === 'ready'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                  }`}>
                    {simulationAssessment.gateStatus === 'ready' ? '可放行' : '需关注'}
                  </span>
                </div>
              </div>

              {order.status === 'reviewing' && (
                <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
                  <div className="text-sm font-semibold text-sky-950">当前评审操作</div>
                  <Textarea
                    value={reviewCommentDraft}
                    onChange={event => setReviewCommentDraft(event.target.value)}
                    placeholder={`填写${currentApprovalStage?.stageName || '当前审批节点'}处理意见。通过时可选填建议，驳回时必须填写原因。`}
                    className="mt-3 min-h-[96px] bg-white"
                  />
                  {currentApprovalStage && (
                    <div className="mt-3 rounded-md border border-sky-200 bg-white/80 px-3 py-2 text-xs text-sky-800">
                      当前处理节点：{currentApprovalStage.stageName} · 责任角色：{currentApprovalStage.role}{currentApprovalStage.sla ? ` · SLA：${currentApprovalStage.sla}` : ''}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={handleApproveReview}>
                      通过当前评审节点
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleRejectReview}>驳回并退回修改</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isFutureStage && activeStage === 'resource_itsm' && (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">ITSM入口与同步</div>
                    <div className="mt-1 text-xs leading-6 text-muted-foreground">主流程只展示申请入口、单号、链接和同步结果；审批通过后，当前阶段将切换到“确认交付方案”，由交付中心前台正式受理并编制方案。</div>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                    当前状态：{getItsmStatusLabel(itsmStatus)}
                  </span>
                </div>
                <div className="mt-3 grid gap-2.5 md:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="text-xs text-slate-500">ITSM单号</span>
                    <input
                      className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                      value={itsmTicketDraft}
                      onChange={event => setItsmTicketDraft(event.target.value)}
                      placeholder="如 ITSM-20260618-001"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs text-slate-500">ITSM链接</span>
                    <input
                      className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                      value={itsmUrlDraft}
                      onChange={event => setItsmUrlDraft(event.target.value)}
                      placeholder="https://itsm.example.com/ticket/123"
                    />
                  </label>
                </div>
                <div className="mt-3">
                  <label className="grid gap-1.5">
                    <span className="text-xs text-slate-500">审批意见 / 回传说明</span>
                    <Textarea
                      value={itsmCommentDraft}
                      onChange={event => setItsmCommentDraft(event.target.value)}
                      placeholder="记录审批意见、驳回原因或同步说明"
                      className="min-h-[88px] bg-white"
                    />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={copyItsmPayload}>复制申请摘要</Button>
                  <Button
                    size="sm"
                    onClick={() => itsmUrlDraft.trim() && window.open(itsmUrlDraft.trim(), '_blank', 'noopener,noreferrer')}
                    disabled={!itsmUrlDraft.trim()}
                  >
                    {itsmUrlDraft.trim() ? '打开 ITSM' : '暂无 ITSM 链接'}
                  </Button>
                </div>
                <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white/80 p-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium text-slate-700">联调维护</div>
                      <div className="mt-1 text-xs text-slate-500">以下按钮仅用于模拟同步或人工回填，不代表真实审批在本页发生。</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleItsmSubmit('submitted')}>回填“已提交”</Button>
                    <Button size="sm" variant="outline" onClick={() => handleItsmSubmit('processing')}>回填“处理中”</Button>
                    <Button size="sm" variant="outline" onClick={() => handleItsmSubmit('approved')}>回填“审批通过”</Button>
                    <Button size="sm" variant="outline" onClick={() => handleItsmSubmit('rejected')}>回填“审批驳回”</Button>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-2.5">
                  <div className="text-xs font-medium text-slate-500">同步记录</div>
                  <div className="mt-2.5 space-y-2">
                    {(order?.itsm?.syncLogs || []).length === 0 ? (
                      <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                        暂无同步记录
                      </div>
                    ) : (
                      [...(order?.itsm?.syncLogs || [])].reverse().map(log => (
                        <div key={log.id} className="rounded-md border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-xs text-slate-700">
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

              {itsmStatus === 'approved' && (
                <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-cyan-950">下一阶段</div>
                      <div className="mt-1 text-xs leading-6 text-cyan-800">
                        ITSM 审批已通过。请切换到“确认交付方案”阶段，由交付中心前台正式受理并整理实施方案。
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setActiveStage('delivery_plan')}>
                      进入确认交付方案
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isFutureStage && activeStage === 'delivery_plan' && (
            <div className="mt-4 space-y-4">
              {order.planFeedback && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                  <div className="text-sm font-semibold text-amber-900">最新方案反馈</div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-amber-800">{order.planFeedback}</p>
                  {order.planFeedbackAt && (
                    <div className="mt-2 text-xs text-amber-700">反馈时间：{order.planFeedbackAt}</div>
                  )}
                </div>
              )}

              <div className={`rounded-xl border p-4 ${canAcceptDelivery || deliveryAcceptance?.status !== 'not_started' ? 'border-cyan-200 bg-cyan-50/50' : 'border-slate-200 bg-slate-50/60'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-cyan-950">交付中心前台正式受理与实施方案</div>
                    <div className="mt-1 text-xs leading-6 text-cyan-800">
                      ITSM / 资源审批通过后，由 IPE 交付中心前台正式受理，明确标准/非标路径、能力域和实施方案，再提交用户确认。
                    </div>
                  </div>
                  <span className="rounded-full border border-cyan-200 bg-white px-2.5 py-1 text-xs font-medium text-cyan-700">
                    {orderStatus === 'plan_confirming'
                      ? '等待用户确认'
                      : deliveryAcceptance?.status === 'plan_ready'
                        ? '方案已形成'
                        : deliveryAcceptance?.status === 'accepted'
                          ? '已受理，待完善方案'
                          : canAcceptDelivery
                            ? '可正式受理'
                            : '等待审批通过'}
                  </span>
                </div>

                {orderStatus === 'plan_confirming' ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-lg border border-cyan-200 bg-white/90 px-4 py-4 text-sm text-cyan-900">
                      方案已提交成功，当前处于“用户确认交付方案”环节。交付方暂不需要继续编辑，如用户反馈退回，再回到本阶段调整。
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="text-xs font-medium text-slate-500">当前提交状态</div>
                      <div className="mt-2 grid gap-2 md:grid-cols-3">
                        <div className="rounded-md border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                          <div className="text-[11px] text-slate-500">交付路径</div>
                          <div className="mt-1 text-sm font-medium text-slate-900">{deliveryAcceptance?.deliveryPath === 'non_standard' ? '非标交付' : '标准交付'}</div>
                        </div>
                        <div className="rounded-md border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                          <div className="text-[11px] text-slate-500">涉及能力域</div>
                          <div className="mt-1 text-sm font-medium text-slate-900">{deliveryAcceptance?.domains?.join('、') || '-'}</div>
                        </div>
                        <div className="rounded-md border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                          <div className="text-[11px] text-slate-500">预计交付周期</div>
                          <div className="mt-1 text-sm font-medium text-slate-900">{implementationPlan?.estimatedSchedule || '-'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : !canAcceptDelivery && deliveryAcceptance?.status === 'not_started' ? (
                  <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white/80 px-4 py-4 text-sm text-slate-600">
                    当前仍未回填“审批通过”，交付中心前台正式受理暂不可操作。
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="grid gap-1.5">
                        <span className="text-xs text-cyan-700">受理人 / 受理组织</span>
                        <input
                          className="h-9 rounded-md border border-cyan-200 bg-white px-3 text-sm outline-none focus:border-cyan-400"
                          value={deliveryAcceptedByDraft}
                          onChange={event => setDeliveryAcceptedByDraft(event.target.value)}
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className="text-xs text-cyan-700">交付路径</span>
                        <select
                          className="h-9 rounded-md border border-cyan-200 bg-white px-3 text-sm outline-none focus:border-cyan-400"
                          value={deliveryPathDraft}
                          onChange={event => setDeliveryPathDraft(event.target.value as DeliveryAcceptancePath)}
                        >
                          <option value="standard">标准交付</option>
                          <option value="non_standard">非标交付</option>
                        </select>
                      </label>
                      <label className="grid gap-1.5">
                        <span className="text-xs text-cyan-700">涉及能力域</span>
                        <input
                          className="h-9 rounded-md border border-cyan-200 bg-white px-3 text-sm outline-none focus:border-cyan-400"
                          value={deliveryDomainsDraft}
                          onChange={event => setDeliveryDomainsDraft(event.target.value)}
                          placeholder="IT基础、网络、安全"
                        />
                      </label>
                    </div>

                    {deliveryPathDraft === 'non_standard' && (
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="grid gap-1.5 md:col-span-2">
                          <span className="text-xs text-cyan-700">非标原因</span>
                          <Textarea
                            value={nonStandardReasonDraft}
                            onChange={event => setNonStandardReasonDraft(event.target.value)}
                            placeholder="说明为什么本次申请不适用标准交付路径"
                            className="min-h-[88px] bg-white"
                          />
                        </label>
                        <label className="grid gap-1.5">
                          <span className="text-xs text-cyan-700">差异项（每行一项）</span>
                          <Textarea
                            value={nonStandardDiffItemsDraft}
                            onChange={event => setNonStandardDiffItemsDraft(event.target.value)}
                            placeholder="特殊规格&#10;特殊网络开通&#10;例外安全策略"
                            className="min-h-[120px] bg-white"
                          />
                        </label>
                        <label className="grid gap-1.5">
                          <span className="text-xs text-cyan-700">风险依赖（每行一项）</span>
                          <Textarea
                            value={nonStandardRisksDraft}
                            onChange={event => setNonStandardRisksDraft(event.target.value)}
                            placeholder="外部团队窗口待确认&#10;需要额外权限审批"
                            className="min-h-[120px] bg-white"
                          />
                        </label>
                        <label className="grid gap-1.5 md:col-span-2">
                          <span className="text-xs text-cyan-700">协同能力域</span>
                          <input
                            className="h-9 rounded-md border border-cyan-200 bg-white px-3 text-sm outline-none focus:border-cyan-400"
                            value={collaborationDomainsDraft}
                            onChange={event => setCollaborationDomainsDraft(event.target.value)}
                            placeholder="网络、安全、数据库与中间件"
                          />
                        </label>
                      </div>
                    )}

                    <label className="grid gap-1.5">
                      <span className="text-xs text-cyan-700">实施方案摘要</span>
                      <Textarea
                        value={planSummaryDraft}
                        onChange={event => setPlanSummaryDraft(event.target.value)}
                        placeholder="说明本次交付范围、实施方式和总体安排"
                        className="min-h-[80px] bg-white"
                      />
                    </label>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-1.5">
                        <span className="text-xs text-cyan-700">实施步骤（每行一步）</span>
                        <Textarea
                          value={planStepsDraft}
                          onChange={event => setPlanStepsDraft(event.target.value)}
                          placeholder="1. 准备资源与账号&#10;2. 部署基础组件&#10;3. 联调验证"
                          className="min-h-[132px] bg-white"
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className="text-xs text-cyan-700">前置条件（每行一项）</span>
                        <Textarea
                          value={planPrerequisitesDraft}
                          onChange={event => setPlanPrerequisitesDraft(event.target.value)}
                          placeholder="架构评审已通过&#10;ITSM / 资源审批已通过"
                          className="min-h-[132px] bg-white"
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className="text-xs text-cyan-700">风险说明（每行一项）</span>
                        <Textarea
                          value={planRisksDraft}
                          onChange={event => setPlanRisksDraft(event.target.value)}
                          placeholder="实施窗口变化可能影响排期&#10;非标配置需能力域二次确认"
                          className="min-h-[132px] bg-white"
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className="text-xs text-cyan-700">交付产出（每行一项）</span>
                        <Textarea
                          value={planDeliverablesDraft}
                          onChange={event => setPlanDeliverablesDraft(event.target.value)}
                          placeholder="资源清单&#10;配置明细&#10;交付资产记录"
                          className="min-h-[132px] bg-white"
                        />
                      </label>
                    </div>
                    <label className="grid gap-1.5 md:max-w-md">
                      <span className="text-xs text-cyan-700">预计交付周期</span>
                      <input
                        className="h-9 rounded-md border border-cyan-200 bg-white px-3 text-sm outline-none focus:border-cyan-400"
                        value={planScheduleDraft}
                        onChange={event => setPlanScheduleDraft(event.target.value)}
                        placeholder="如 1-3 个工作日"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleSaveDeliveryAcceptance(false)}>
                        保存实施方案
                      </Button>
                      <Button size="sm" onClick={() => handleSaveDeliveryAcceptance(true)}>
                        保存并提交用户确认
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!isFutureStage && activeStage === 'delivery_execute' && (order.status === 'processing' || order.status === 'delivering') && order.deliverySteps?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {!currentDeliveryStep && order.deliverySteps.some(step => step.status === 'pending') && (
                <Button size="sm" variant="outline" onClick={startCurrentDeliveryStep}>开始当前步骤</Button>
              )}
              {currentDeliveryStep && (
                <Button size="sm" onClick={completeCurrentDeliveryStep}>完成当前步骤</Button>
              )}
            </div>
          ) : null}

          {!isFutureStage && activeStage === 'delivery_execute' && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">待验收资产概览</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    交付执行过程中已形成的资产会先进入待验收状态，便于用户在验收前提前查看。
                  </div>
                </div>
                <span className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-700">
                  {pendingAcceptanceAssets.length} 项待验收
                </span>
              </div>
              {pendingAcceptanceAssets.length > 0 ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {pendingAcceptanceAssets.map((service, index) => (
                    <div key={`${service.name}-${index}`} className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium text-slate-900">{service.name}</div>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">待验收</span>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {service.deliveryDetail ? '交付结果已生成，可提前核对交付资产内容。' : '交付结果待补充。'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-md border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-muted-foreground">
                  当前尚未形成待验收资产，交付步骤完成后会逐步生成。
                </div>
              )}
            </div>
          )}

          {!isFutureStage && activeStage === 'acceptance_asset' && (
            <div className="mt-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-3">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">交付资产记录</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      执行阶段形成资产，验收前建议以待验收状态管理；归档后进入资产台账。
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {order.status === 'archived' && deliveredAssets.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/service-ledger?view=assets&category=${deliveredAssets[0].category}`)}
                      >
                        查看台账分类
                      </Button>
                    )}
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {order.status === 'archived'
                        ? `已归档 ${deliveredAssets.length} 项`
                        : order.status === 'confirmed'
                          ? `已验收 ${pendingAcceptanceAssets.length} 项`
                          : `待验收 ${pendingAcceptanceAssets.length} 项`}
                    </span>
                  </div>
                </div>

                {order.status === 'archived' ? (
                  deliveredAssets.length === 0 ? (
                    <div className="rounded-md border border-dashed border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-800">
                      当前工单已归档，但暂未生成资产记录，请检查服务项是否已映射到交付资产明细。
                    </div>
                  ) : (
                    <DeliveredAssetsTable assets={deliveredAssets} />
                  )
                ) : pendingAcceptanceAssets.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-muted-foreground">
                    交付资产将在执行步骤产生交付结果后逐步形成。
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {pendingAcceptanceAssets.map((service, index) => (
                      <div key={`${service.name}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium text-slate-900">{service.name}</div>
                          <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[11px] text-amber-700">待验收</span>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          {service.deliveryDetail ? '已形成交付结果，可进入用户验收。' : '交付结果待补充。'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

      <Dialog open={timelineOpen} onOpenChange={setTimelineOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>节点时间记录</DialogTitle>
            <DialogDescription>
              展示每个主流程节点的进入时间、完成时间、SLA 和实际耗时，供交付复盘和 SLA 报表使用。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 max-h-[70vh] overflow-y-auto">
            {(order.workflowTimeline ?? []).map(node => (
              <div key={node.status} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[140px,1fr,1fr,100px,120px]">
                <div>
                  <div className="text-sm font-medium text-foreground">{node.label}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{node.status}</div>
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
                  <div>SLA</div>
                  <div className="mt-1 text-foreground">{node.slaTarget || '-'}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  <div>耗时</div>
                  <div className="mt-1 text-foreground">{getWorkflowTimelineNodeDuration(node)}</div>
                </div>
              </div>
            ))}
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap">
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
                  当前节点详情。这里用于展开查看更多节点记录、标签和补充信息。
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
                    <div className="text-xs font-medium text-violet-700">AI辅助分析 / 标签</div>
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

      {/* Network chain for internet app */}
      {isInternetApp && chain && (
        <div className="mb-6">
          <NetworkChainProgress
            nodes={chain}
            domain={order.internetAppDetail!.domain}
            showActions={showServiceActions}
            onNodeClick={(nodeId) => {
              if (order.status === 'delivering') {
                const node = chain.find(n => n.id === nodeId);
                if (node && node.status === 'pending') {
                  updateChainNode(nodeId, 'processing');
                  setTimeout(() => updateChainNode(nodeId, 'completed'), 500);
                }
              }
            }}
            onNodeEdit={(nodeId) => {
              if (order.status === 'delivering') {
                updateChainNode(nodeId, 'processing');
              }
            }}
          />
        </div>
      )}

      {/* Service Execution List */}
    </div>
  );
}
