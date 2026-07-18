import type {
  DeliveryAcceptancePath,
  DeliveryImplementationPlan,
  OrderStatus,
} from '../types';
import {
  hasReachedItsmStage,
  hasReachedPlanStage,
  hasReachedDeliveryStage,
  isAcceptedOrArchived,
} from './order-stage-flags';

export type SharedStageNodeStatus = 'pending' | 'processing' | 'completed' | 'blocked';

export interface SharedStageNode {
  id: string;
  title: string;
  status: SharedStageNodeStatus;
  summary: string;
  owner: string;
  updatedAt?: string;
  tags?: string[];
  details: string[];
}

export interface SharedItsmInfo {
  ticketNo?: string;
  syncStatus?: string;
  lastSyncAt?: string;
  resultComment?: string;
}

export interface SharedDeliveryAcceptanceInfo {
  status?: 'not_started' | 'accepted' | 'plan_ready';
  acceptedAt?: string;
  acceptedBy?: string;
  deliveryPath?: DeliveryAcceptancePath;
  domains?: string[];
  nonStandardReason?: string;
  nonStandardDiffItems?: string[];
  nonStandardRisks?: string[];
  collaborationDomains?: string[];
  implementationPlan?: DeliveryImplementationPlan;
}

export function buildPortalResourceItsmNodes(args: {
  orderId?: string;
  orderCreatedAt?: string;
  orderReviewedAt?: string;
  orderStatus: OrderStatus;
  reviewStatus?: string;
  itsmInfo: SharedItsmInfo;
}): SharedStageNode[] {
  const { orderId, orderCreatedAt, orderReviewedAt, orderStatus, reviewStatus, itsmInfo } = args;

  return [
    {
      id: 'resource-request',
      title: '发起资源申请',
      status: reviewStatus === 'approved'
        ? (hasReachedItsmStage(orderStatus) ? 'completed' : 'processing')
        : 'blocked',
      summary: reviewStatus === 'approved' ? '可基于当前需求单发起正式申请。' : '评审通过前不可发起正式申请。',
      owner: '申请人',
      updatedAt: orderReviewedAt || orderCreatedAt,
      tags: ['正式申请'],
      details: [
        '资源申请内容直接继承需求细化单，不再额外生成草案。',
        `来源工单：${orderId || '-'}`,
      ],
    },
    {
      id: 'itsm-review',
      title: 'ITSM审批',
      status: orderStatus === 'processing' ? 'processing' : hasReachedPlanStage(orderStatus) ? 'completed' : 'pending',
      summary: orderStatus === 'processing' ? '当前正在 ITSM 中审批。' : hasReachedPlanStage(orderStatus) ? 'ITSM 审批已通过。' : '等待发起 ITSM 审批。',
      owner: 'ITSM',
      updatedAt: itsmInfo.lastSyncAt,
      tags: ['状态回传'],
      details: [
        `ITSM单号：${itsmInfo.ticketNo || '-'}`,
        `同步状态：${itsmInfo.syncStatus || '-'}`,
        `最近同步时间：${itsmInfo.lastSyncAt || '-'}`,
      ],
    },
  ];
}

export function buildPortalDeliveryPlanNodes(args: {
  orderStatus: OrderStatus;
  orderPlanFeedback?: string;
  orderPlanFeedbackAt?: string;
  itsmLastSyncAt?: string;
  estimatedTime?: string;
  deliveryAcceptance?: SharedDeliveryAcceptanceInfo;
}): SharedStageNode[] {
  const { orderStatus, orderPlanFeedback, orderPlanFeedbackAt, itsmLastSyncAt, estimatedTime, deliveryAcceptance } = args;
  const formalPlan = deliveryAcceptance?.implementationPlan;

  return [
    {
      id: 'plan-provide',
      title: '交付方提供交付方案',
      status: hasReachedPlanStage(orderStatus) ? 'completed' : orderStatus === 'processing' ? 'processing' : 'pending',
      summary: hasReachedPlanStage(orderStatus)
        ? `交付中心已形成正式实施方案：${formalPlan?.summary || '请查看方案明细。'}`
        : deliveryAcceptance?.status === 'accepted'
          ? '交付中心前台已受理，正在整理正式实施方案。'
          : '等待整理交付方案。',
      owner: deliveryAcceptance?.acceptedBy || '交付窗口',
      updatedAt: deliveryAcceptance?.acceptedAt || orderPlanFeedbackAt || itsmLastSyncAt,
      tags: [
        deliveryAcceptance?.deliveryPath === 'non_standard' ? '非标交付' : '标准交付',
        ...(deliveryAcceptance?.domains || ['交付范围', '时间计划']),
      ],
      details: [
        `交付路径：${deliveryAcceptance?.deliveryPath === 'non_standard' ? '非标交付' : '标准交付'}`,
        `能力域：${deliveryAcceptance?.domains?.join('、') || '-'}`,
        ...(deliveryAcceptance?.deliveryPath === 'non_standard'
          ? [
              `非标原因：${deliveryAcceptance?.nonStandardReason || '-'}`,
              `差异项：${deliveryAcceptance?.nonStandardDiffItems?.join('、') || '-'}`,
              `风险依赖：${deliveryAcceptance?.nonStandardRisks?.join('、') || '-'}`,
              `协同能力域：${deliveryAcceptance?.collaborationDomains?.join('、') || '-'}`,
            ]
          : []),
        `预计周期：${formalPlan?.estimatedSchedule || estimatedTime || '-'}`,
        orderPlanFeedback ? `最近反馈：${orderPlanFeedback}` : '最近反馈：暂无',
      ],
    },
    {
      id: 'plan-confirm',
      title: '用户确认交付方案',
      status: orderStatus === 'plan_confirming' ? 'processing' : hasReachedDeliveryStage(orderStatus) ? 'completed' : 'pending',
      summary: orderStatus === 'plan_confirming' ? '等待用户确认方案。' : hasReachedDeliveryStage(orderStatus) ? '用户已确认方案。' : '尚未进入确认阶段。',
      owner: '申请人',
      updatedAt: orderPlanFeedbackAt,
      tags: ['用户确认'],
      details: [
        '确认结果建议管理为：确认通过 / 退回调整。',
        orderStatus === 'plan_confirming' ? '当前可确认方案或反馈意见。' : '当前暂无待处理动作。',
      ],
    },
  ];
}

export function buildPortalAcceptanceAssetNodes(args: {
  orderStatus: OrderStatus;
  orderCreatedAt?: string;
  orderArchivedAt?: string;
  assetCount: number;
}): SharedStageNode[] {
  const { orderStatus, orderCreatedAt, orderArchivedAt, assetCount } = args;

  return [
    {
      id: 'asset-preview',
      title: '形成交付资产',
      status:
        isAcceptedOrArchived(orderStatus)
          ? 'completed'
          : assetCount > 0
            ? 'processing'
            : 'pending',
      summary: assetCount > 0 ? `当前已形成 ${assetCount} 项交付资产。` : '交付资产会逐步形成。',
      owner: '交付窗口',
      updatedAt: orderArchivedAt || orderCreatedAt,
      tags: [orderStatus === 'archived' ? '已归档' : orderStatus === 'confirmed' ? '已验收' : '待验收'],
      details: [
        '交付资产在执行阶段就生成，不需要等到归档后才出现。',
        `当前资产数量：${assetCount}`,
      ],
    },
    {
      id: 'acceptance',
      title: '用户验收与归档',
      status: orderStatus === 'completed' ? 'processing' : isAcceptedOrArchived(orderStatus) ? 'completed' : 'pending',
      summary: orderStatus === 'completed' ? '等待用户验收。' : orderStatus === 'confirmed' ? '验收通过，待归档。' : orderStatus === 'archived' ? '资产已归档。' : '尚未进入验收阶段。',
      owner: '申请人 / 资产管理员',
      updatedAt: orderArchivedAt,
      tags: ['验收', '归档'],
      details: [
        '验收建议支持：通过 / 退回整改。',
        orderArchivedAt ? `归档时间：${orderArchivedAt}` : '当前尚未归档。',
      ],
    },
  ];
}
